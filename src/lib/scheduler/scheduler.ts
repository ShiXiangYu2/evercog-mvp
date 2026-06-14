/**
 * Built-in Scheduler 内置调度器
 *
 * 将 Loop 从外部脚本迁移到 Next.js 内置调度器
 * 使用 node-cron 管理定时任务，支持事件触发和条件触发
 */
import * as cron from 'node-cron'
import { prisma } from '../prisma'
import { getEventBus } from './event-bus'
import { executeLoopPipeline, type LoopConfig } from './loop-executor'
import { acquireLock, releaseLock } from './process-lock'
import logger from '../logger'

// ==================== 类型定义 ====================

export interface LoopStatus {
  name: string
  status: 'idle' | 'running' | 'paused' | 'error'
  lastRunAt: Date | null
  totalRuns: number
  consecutiveFailures: number
  lastError: string | null
}

export interface SchedulerHealth {
  status: 'healthy' | 'degraded' | 'error'
  uptime: number
  activeLoops: number
  totalExecutions: number
}

export interface LoopExecutionResult {
  executionId: string
  loopName: string
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
}

// ==================== Loop 配置 ====================

// 从 .loop-config.yaml 解析的配置结构
const LOOP_CONFIGS: LoopConfig[] = [
  {
    name: 'knowledge-card-patrol',
    description: '每日检查知识卡质量，确保内容可信',
    trigger: {
      type: 'schedule',
      schedule: '0 8 * * *',
    },
    pipeline: [
      { skill: 'scan-knowledge-cards', params: { status: ['pending_review'], max_items: 50 } },
      { skill: 'knowledge-review', params: { quality_threshold: 0.8 } },
    ],
    termination: {
      max_items_per_loop: 50,
      timeout_minutes: 60,
      confidence_threshold: 0.8,
    },
  },
  {
    name: 'experience-feedback-loop',
    description: '收集经验问答使用反馈，持续优化知识库',
    trigger: {
      type: 'schedule',
      schedule: '0 9 * * 1',
    },
    pipeline: [
      { skill: 'scan-experience-records', params: { time_range: 'last_7_days', max_items: 100 } },
      { skill: 'analyze-question-patterns', params: { identify_gaps: true } },
    ],
    termination: {
      max_items_per_loop: 100,
      timeout_minutes: 120,
      confidence_threshold: 0.7,
    },
  },
  {
    name: 'sop-completion-monitor',
    description: '监控 SOP 训练完成情况，确保知识传递有效',
    trigger: {
      type: 'schedule',
      schedule: '0 18 * * *',
    },
    pipeline: [
      { skill: 'scan-sop-tasks', params: { status: ['in_progress', 'submitted'], max_items: 30 } },
      { skill: 'check-sop-quality', params: { check_completeness: true } },
    ],
    termination: {
      max_items_per_loop: 30,
      timeout_minutes: 60,
      confidence_threshold: 0.8,
    },
  },
]

// ==================== BuiltInScheduler 类 ====================

class BuiltInScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map()
  private eventCleanups: Array<() => void> = []
  private startTime: Date
  private isRunning = false

  constructor() {
    this.startTime = new Date()
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running')
      return
    }

    this.isRunning = true
    logger.info('Starting built-in scheduler')

    // 初始化 Loop 状态
    this.initializeLoopStates()

    // 注册定时任务
    for (const config of LOOP_CONFIGS) {
      if (config.trigger.type === 'schedule' && config.trigger.schedule) {
        this.registerCronJob(config)
      }
    }

    // 注册事件触发器
    this.registerEventTriggers()

    logger.info('Scheduler started', { loopCount: LOOP_CONFIGS.length })
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.isRunning = false

    // 停止所有 cron 任务
    for (const [name, task] of this.tasks) {
      task.stop()
      logger.info('Cron job stopped', { name })
    }
    this.tasks.clear()

    // 清理事件监听
    for (const cleanup of this.eventCleanups) {
      cleanup()
    }
    this.eventCleanups = []

    logger.info('Scheduler stopped')
  }

  /**
   * 手动触发 Loop
   *
   * 使用原子操作确保并发安全
   */
  async triggerLoop(
    loopName: string,
    reason: string = 'manual_trigger'
  ): Promise<LoopExecutionResult> {
    const config = LOOP_CONFIGS.find((c) => c.name === loopName)
    if (!config) {
      throw new Error(`Loop not found: ${loopName}`)
    }

    // 使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 检查是否正在运行（使用 FOR UPDATE 语义）
      const state = await tx.schedulerState.findUnique({
        where: { loopName },
      })

      if (state?.status === 'running') {
        throw new Error(`Loop ${loopName} is already running`)
      }

      // 2. 原子更新状态为 running（只有状态不是 running 时才能更新）
      const updateResult = await tx.schedulerState.updateMany({
        where: {
          loopName,
          status: { not: 'running' },
        },
        data: { status: 'running' },
      })

      // 如果更新失败（状态已经是 running），抛出错误
      if (updateResult.count === 0) {
        // 检查是否是因为记录不存在
        const exists = await tx.schedulerState.findUnique({
          where: { loopName },
        })
        if (!exists) {
          // 创建新记录
          await tx.schedulerState.create({
            data: { loopName, status: 'running' },
          })
        } else {
          throw new Error(`Loop ${loopName} is already running`)
        }
      }

      // 3. 创建执行记录
      const execution = await tx.loopExecution.create({
        data: {
          loopName,
          triggerType: 'manual',
          triggerReason: reason,
          status: 'running',
          pipelineSnapshot: JSON.stringify(config),
        },
      })

      return execution
    })

    // 发射事件
    getEventBus().emit('loop:started', { loopName, executionId: result.id })

    // 异步执行 Loop
    this.executeLoop(config, result.id).catch((error) => {
      logger.error('Loop execution failed', error as Error, { loopName })
    })

    return {
      executionId: result.id,
      loopName,
      status: 'running',
      startedAt: result.startedAt,
    }
  }

  /**
   * 获取所有 Loop 状态
   */
  async getLoopStatuses(): Promise<LoopStatus[]> {
    const states = await prisma.schedulerState.findMany()

    return LOOP_CONFIGS.map((config) => {
      const state = states.find((s) => s.loopName === config.name)
      return {
        name: config.name,
        status: (state?.status as LoopStatus['status']) || 'idle',
        lastRunAt: state?.lastRunAt || null,
        totalRuns: state?.totalRuns || 0,
        consecutiveFailures: state?.consecutiveFailures || 0,
        lastError: state?.lastError || null,
      }
    })
  }

  /**
   * 获取调度器健康状态
   */
  async getHealth(): Promise<SchedulerHealth> {
    const totalExecutions = await prisma.loopExecution.count()
    const activeLoops = this.tasks.size

    return {
      status: this.isRunning ? 'healthy' : 'error',
      uptime: Date.now() - this.startTime.getTime(),
      activeLoops,
      totalExecutions,
    }
  }

  /**
   * 获取 Loop 执行历史
   */
  async getExecutionHistory(options?: {
    loopName?: string
    limit?: number
  }): Promise<Array<{
    id: string
    loopName: string
    status: string
    triggerType: string
    startedAt: Date
    completedAt: Date | null
    duration: number | null
    itemsProcessed: number
    itemsSucceeded: number
    itemsFailed: number
  }>> {
    const where = options?.loopName ? { loopName: options.loopName } : {}
    const limit = options?.limit || 20

    const executions = await prisma.loopExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    return executions.map((e) => ({
      id: e.id,
      loopName: e.loopName,
      status: e.status,
      triggerType: e.triggerType,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      duration: e.duration,
      itemsProcessed: e.itemsProcessed,
      itemsSucceeded: e.itemsSucceeded,
      itemsFailed: e.itemsFailed,
    }))
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化 Loop 状态
   */
  private async initializeLoopStates(): Promise<void> {
    for (const config of LOOP_CONFIGS) {
      await prisma.schedulerState.upsert({
        where: { loopName: config.name },
        update: {},
        create: {
          loopName: config.name,
          status: 'idle',
        },
      })
    }
  }

  /**
   * 注册 cron 任务
   */
  private registerCronJob(config: LoopConfig): void {
    if (!config.trigger.schedule) return

    const task = cron.schedule(config.trigger.schedule, async () => {
      logger.info('Cron triggered', { loopName: config.name })

      try {
        await this.triggerLoop(config.name, 'cron_schedule')
      } catch (error) {
        logger.error('Failed to trigger loop from cron', error as Error, {
          loopName: config.name,
        })
      }
    })

    this.tasks.set(config.name, task)
    logger.info('Cron job registered', { name: config.name, schedule: config.trigger.schedule })
  }

  /**
   * 注册事件触发器
   */
  private registerEventTriggers(): void {
    const eventBus = getEventBus()

    // 当检测到知识缺口时，触发缺口填充（如果配置了）
    const handleGapDetected = () => {
      logger.info('Gap detected event received')
      // 可以在这里触发缺口填充 Loop
    }

    eventBus.on('gap:detected', handleGapDetected)
    this.eventCleanups.push(() => eventBus.off('gap:detected', handleGapDetected))
  }

  /**
   * 执行 Loop
   *
   * 使用进程锁防止重复执行
   */
  private async executeLoop(config: LoopConfig, executionId: string): Promise<void> {
    const startTime = Date.now()
    const lockName = `loop:${config.name}`
    const lockTimeoutMs = (config.termination.timeout_minutes || 60) * 60 * 1000

    // 获取进程锁
    const lockResult = await acquireLock({
      lockName,
      timeoutMs: lockTimeoutMs,
      retryCount: 1,
    })

    if (!lockResult.acquired) {
      logger.warn('Failed to acquire lock for loop', {
        loopName: config.name,
        error: lockResult.error,
      })
      // 更新执行记录为失败
      await prisma.loopExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: `Lock acquisition failed: ${lockResult.error}`,
        },
      })
      return
    }

    try {
      // 执行 pipeline
      const result = await executeLoopPipeline(config)

      const duration = Date.now() - startTime

      // 更新执行记录
      await prisma.loopExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          duration,
          itemsProcessed: result.itemsProcessed,
          itemsSucceeded: result.itemsSucceeded,
          itemsFailed: result.itemsFailed,
          result: JSON.stringify(result),
        },
      })

      // 更新调度器状态
      await prisma.schedulerState.update({
        where: { loopName: config.name },
        data: {
          status: 'idle',
          lastRunAt: new Date(),
          totalRuns: { increment: 1 },
          consecutiveFailures: 0,
        },
      })

      // 发射事件
      getEventBus().emit('loop:completed', {
        loopName: config.name,
        executionId,
        duration,
        ...result,
      })

      logger.info('Loop completed', {
        loopName: config.name,
        executionId,
        duration,
        ...result,
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // 更新执行记录
      await prisma.loopExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          duration,
          error: errorMessage,
        },
      })

      // 更新调度器状态
      await prisma.schedulerState.update({
        where: { loopName: config.name },
        data: {
          status: 'error',
          lastError: errorMessage,
          consecutiveFailures: { increment: 1 },
        },
      })

      // 发射事件
      getEventBus().emit('loop:failed', {
        loopName: config.name,
        executionId,
        error: errorMessage,
      })

      logger.error('Loop failed', error as Error, { loopName: config.name, executionId })
    } finally {
      // 释放进程锁
      await releaseLock(lockName, lockResult.lockId!)
    }
  }
}

// ==================== 单例导出 ====================

let _scheduler: BuiltInScheduler | null = null

/**
 * 获取 Scheduler 单例
 *
 * 首次调用时自动启动调度器
 */
export function getScheduler(): BuiltInScheduler {
  if (!_scheduler) {
    _scheduler = new BuiltInScheduler()
  }
  return _scheduler
}

export default getScheduler()
