/**
 * Agent 编排器
 *
 * 统一管理任务创建、调度和执行
 * 整合现有的 ReviewService、TaskExecutor、GapDetector
 */
import { prisma } from '../prisma'
import { createAuditLog } from '../audit'
import logger from '../logger'
import type {
  AgentTask,
  AgentTaskType,
  AgentTaskPriority,
  AgentTaskStatus,
  AgentExecutor,
  AgentOrchestratorInterface,
  TaskExecutionResult,
} from './types'

// ==================== Agent 编排器 ====================

export class AgentOrchestrator implements AgentOrchestratorInterface {
  private executors: Map<AgentTaskType, AgentExecutor> = new Map()

  /**
   * 注册 Agent 执行器
   */
  registerExecutor(executor: AgentExecutor): void {
    for (const taskType of executor.supportedTaskTypes) {
      this.executors.set(taskType, executor)
    }
    logger.info('Agent executor registered', {
      name: executor.name,
      supportedTypes: executor.supportedTaskTypes,
    })
  }

  /**
   * 创建任务
   */
  async createTask(params: {
    type: AgentTaskType
    title: string
    description?: string
    input: Record<string, unknown>
    priority?: AgentTaskPriority
    createdBy: string
  }): Promise<AgentTask> {
    const { type, title, description, input, priority = 'medium', createdBy } = params

    // 检查是否有对应的 Executor
    if (!this.executors.has(type)) {
      throw new Error(`No executor registered for task type: ${type}`)
    }

    const task = await prisma.agentTask.create({
      data: {
        type,
        title,
        description: description || null,
        priority,
        status: 'pending',
        assignedTo: null,
        createdBy,
        result: JSON.stringify(input),
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: createdBy,
      action: 'create',
      entityType: 'agent_task',
      entityId: task.id,
      details: { type, title, priority },
    })

    logger.info('Agent task created', { taskId: task.id, type, title })

    return this.mapToAgentTask(task)
  }

  /**
   * 执行任务
   */
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const startTime = Date.now()

    logger.info('Executing agent task', { taskId })

    // 1. 获取任务
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return {
        taskId,
        success: false,
        error: 'Task not found',
        duration: Date.now() - startTime,
      }
    }

    if (task.status !== 'pending') {
      return {
        taskId,
        success: false,
        error: `Task status is ${task.status}, expected pending`,
        duration: Date.now() - startTime,
      }
    }

    // 2. 获取 Executor
    const executor = this.executors.get(task.type as AgentTaskType)
    if (!executor) {
      return {
        taskId,
        success: false,
        error: `No executor for task type: ${task.type}`,
        duration: Date.now() - startTime,
      }
    }

    // 3. 更新任务状态为处理中
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'in_progress' },
    })

    try {
      // 4. 执行任务
      const input = task.result ? JSON.parse(task.result as string) : {}
      const output = await executor.execute(input)

      // 5. 更新任务状态为完成
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          result: JSON.stringify(output),
          completedAt: new Date(),
        },
      })

      // 6. 记录审计日志
      await createAuditLog({
        userId: task.createdBy,
        action: 'review',
        entityType: 'agent_task',
        entityId: taskId,
        details: { type: task.type, success: true },
      })

      const duration = Date.now() - startTime
      logger.info('Agent task completed', { taskId, duration })

      return {
        taskId,
        success: true,
        output,
        duration,
      }
    } catch (error) {
      // 7. 更新任务状态为失败
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          result: JSON.stringify({ error: errorMessage }),
        },
      })

      // 8. 记录审计日志
      await createAuditLog({
        userId: task.createdBy,
        action: 'review',
        entityType: 'agent_task',
        entityId: taskId,
        details: { type: task.type, success: false, error: errorMessage },
      })

      const duration = Date.now() - startTime
      logger.error('Agent task failed', error as Error, { taskId, duration })

      return {
        taskId,
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  /**
   * 获取任务状态
   */
  async getTask(taskId: string): Promise<AgentTask | null> {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
    })

    return task ? this.mapToAgentTask(task) : null
  }

  /**
   * 获取待处理任务列表
   */
  async getPendingTasks(options: {
    type?: AgentTaskType
    limit?: number
  } = {}): Promise<AgentTask[]> {
    const { type, limit = 10 } = options

    const where: Record<string, unknown> = {
      status: 'pending',
    }

    if (type) {
      where.type = type
    }

    const tasks = await prisma.agentTask.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    })

    return tasks.map(this.mapToAgentTask)
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return false
    }

    if (task.status !== 'pending') {
      return false
    }

    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'failed' },
    })

    // 记录审计日志
    await createAuditLog({
      userId: task.createdBy,
      action: 'edit',
      entityType: 'agent_task',
      entityId: taskId,
      details: { action: 'cancel' },
    })

    logger.info('Agent task cancelled', { taskId })

    return true
  }

  /**
   * 映射数据库记录到 AgentTask
   */
  private mapToAgentTask(record: {
    id: string
    type: string
    status: string
    priority: string
    title: string
    description: string | null
    result: string | null
    assignedTo: string | null
    createdBy: string
    createdAt: Date
    updatedAt: Date
    completedAt: Date | null
  }): AgentTask {
    const input = record.result ? JSON.parse(record.result) : {}
    const output = record.status === 'completed' ? input : undefined
    const error = record.status === 'failed' ? input.error : undefined

    return {
      id: record.id,
      type: record.type as AgentTaskType,
      status: record.status as AgentTaskStatus,
      priority: record.priority as AgentTaskPriority,
      title: record.title,
      description: record.description || undefined,
      input: record.status === 'pending' ? input : {},
      output,
      error,
      assignedTo: record.assignedTo || undefined,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      completedAt: record.completedAt || undefined,
    }
  }
}

// ==================== 单例导出 ====================

let _orchestrator: AgentOrchestrator | null = null

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!_orchestrator) {
    _orchestrator = new AgentOrchestrator()
  }
  return _orchestrator
}
