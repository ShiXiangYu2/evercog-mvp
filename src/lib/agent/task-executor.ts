/**
 * Agent 任务执行器
 *
 * 监听和执行 AgentTask 表中的任务
 * 支持知识卡预审、SOP 审核等任务类型
 */
import { prisma } from '../prisma'
import { reviewKnowledgeCard, type ReviewResult } from './review-service'
import { createAuditLog } from '../audit'
import logger from '../logger'

// ==================== 类型定义 ====================

export type TaskType = 'knowledge_review' | 'sop_review' | 'brief_generation' | 'gap_fill'

export interface TaskExecutionResult {
  taskId: string
  success: boolean
  result?: unknown
  error?: string
  duration: number
}

// ==================== 任务执行器 ====================

export class TaskExecutor {
  /**
   * 执行单个任务
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

    // 2. 更新任务状态为处理中
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'in_progress' },
    })

    try {
      // 3. 根据任务类型执行
      let result: unknown

      switch (task.type as TaskType) {
        case 'knowledge_review':
          result = await this.executeKnowledgeReview(task)
          break
        case 'sop_review':
          result = await this.executeSOPReview(task)
          break
        case 'brief_generation':
          result = await this.executeBriefGeneration(task)
          break
        case 'gap_fill':
          result = await this.executeGapFill(task)
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      // 4. 更新任务状态为完成
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: JSON.stringify(result),
        },
      })

      // 5. 记录审计日志
      await createAuditLog({
        userId: task.createdBy,
        action: 'submit',
        entityType: 'sop_task',
        entityId: taskId,
        details: {
          taskType: task.type,
          success: true,
        },
      })

      const duration = Date.now() - startTime
      logger.info('Agent task completed', { taskId, duration })

      return {
        taskId,
        success: true,
        result,
        duration,
      }
    } catch (error) {
      // 6. 更新任务状态为失败
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          result: JSON.stringify({ error: errorMessage }),
        },
      })

      logger.error('Agent task failed', error as Error, { taskId })

      return {
        taskId,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 执行知识卡审核任务
   */
  private async executeKnowledgeReview(task: {
    id: string
    title?: string
    description: string | null
  }): Promise<ReviewResult> {
    // 从任务描述中提取知识卡 ID
    const cardIdMatch = task.description?.match(/card[_-]?id[:\s]*([a-z0-9-]+)/i)
    if (!cardIdMatch) {
      // 尝试从任务标题中提取
      if (task.title) {
        const titleMatch = task.title.match(/[「【](.+?)[」】]/)
        if (titleMatch) {
          // 根据标题查找知识卡
          const card = await prisma.knowledgeCard.findFirst({
            where: { title: titleMatch[1] },
          })
          if (card) {
            return reviewKnowledgeCard(card.id)
          }
        }
      }
      throw new Error('Cannot extract card ID from task')
    }

    return reviewKnowledgeCard(cardIdMatch[1])
  }

  /**
   * 执行 SOP 审核任务
   */
  private async executeSOPReview(task: {
    id: string
    description: string | null
  }): Promise<{ passed: boolean; comment: string }> {
    // TODO: 实现 SOP 审核逻辑
    logger.info('SOP review not implemented yet', { taskId: task.id })
    return {
      passed: true,
      comment: 'SOP 审核功能待实现',
    }
  }

  /**
   * 执行简报生成任务
   */
  private async executeBriefGeneration(task: {
    id: string
    description: string | null
  }): Promise<{ generated: boolean; briefId?: string }> {
    // TODO: 实现简报自动生成逻辑
    logger.info('Brief generation not implemented yet', { taskId: task.id })
    return {
      generated: false,
    }
  }

  /**
   * 执行知识缺口填充任务
   */
  private async executeGapFill(task: {
    id: string
    description: string | null
  }): Promise<{ filled: boolean; cardId?: string }> {
    // TODO: 实现知识缺口自动填充逻辑
    logger.info('Gap fill not implemented yet', { taskId: task.id })
    return {
      filled: false,
    }
  }

  /**
   * 批量执行待处理任务
   */
  async executePendingTasks(limit: number = 10): Promise<TaskExecutionResult[]> {
    const pendingTasks = await prisma.agentTask.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    })

    logger.info('Executing pending tasks', { count: pendingTasks.length })

    const results: TaskExecutionResult[] = []

    for (const task of pendingTasks) {
      const result = await this.executeTask(task.id)
      results.push(result)
    }

    return results
  }

  /**
   * 获取任务执行统计
   */
  async getTaskStats(): Promise<{
    pending: number
    inProgress: number
    completed: number
    failed: number
  }> {
    const [pending, inProgress, completed, failed] = await Promise.all([
      prisma.agentTask.count({ where: { status: 'pending' } }),
      prisma.agentTask.count({ where: { status: 'in_progress' } }),
      prisma.agentTask.count({ where: { status: 'completed' } }),
      prisma.agentTask.count({ where: { status: 'failed' } }),
    ])

    return { pending, inProgress, completed, failed }
  }
}

// ==================== 单例导出 ====================

let _taskExecutor: TaskExecutor | null = null

export function getTaskExecutor(): TaskExecutor {
  if (!_taskExecutor) {
    _taskExecutor = new TaskExecutor()
  }
  return _taskExecutor
}

/**
 * 快速执行任务（用于 API 调用）
 */
export async function executeAgentTask(taskId: string): Promise<TaskExecutionResult> {
  const executor = getTaskExecutor()
  return executor.executeTask(taskId)
}
