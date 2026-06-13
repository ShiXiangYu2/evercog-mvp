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
    title?: string
    description: string | null
  }): Promise<{ passed: boolean; comment: string }> {
    logger.info('Executing SOP review', { taskId: task.id })

    // 从任务描述中提取提交 ID
    const submissionIdMatch = task.description?.match(/submission[_-]?id[:\s]*([a-z0-9-]+)/i)

    if (!submissionIdMatch) {
      // 尝试从任务标题中提取
      if (task.title) {
        const titleMatch = task.title.match(/[「【](.+?)[」】]/)
        if (titleMatch) {
          // 根据标题查找 SOP 提交
          const submission = await prisma.sOPSubmission.findFirst({
            where: { status: 'submitted' },
            include: { task: true },
          })
          if (submission) {
            // 执行审核逻辑
            const content = submission.content || ''
            const hasSteps = content.includes('步骤') || content.includes('Step')
            const hasDetails = content.length > 100
            const passed = hasSteps && hasDetails

            return {
              passed,
              comment: passed
                ? 'SOP 内容完整，包含清晰的步骤说明'
                : 'SOP 内容需要补充更详细的步骤说明',
            }
          }
        }
      }
      throw new Error('Cannot extract submission ID from task')
    }

    // 查找提交
    const submission = await prisma.sOPSubmission.findUnique({
      where: { id: submissionIdMatch[1] },
    })

    if (!submission) {
      throw new Error('SOP submission not found')
    }

    // 执行审核逻辑
    const content = submission.content || ''
    const hasSteps = content.includes('步骤') || content.includes('Step')
    const hasDetails = content.length > 100
    const passed = hasSteps && hasDetails

    return {
      passed,
      comment: passed
        ? 'SOP 内容完整，包含清晰的步骤说明'
        : 'SOP 内容需要补充更详细的步骤说明',
    }
  }

  /**
   * 执行简报生成任务
   */
  private async executeBriefGeneration(task: {
    id: string
    title?: string
    description: string | null
  }): Promise<{ generated: boolean; briefId?: string }> {
    logger.info('Executing brief generation', { taskId: task.id })

    // 从任务描述中提取政策链接 ID
    const linkIdMatch = task.description?.match(/link[_-]?id[:\s]*([a-z0-9-]+)/i)

    if (!linkIdMatch) {
      // 尝试从任务标题中提取
      if (task.title) {
        const titleMatch = task.title.match(/[「【](.+?)[」】]/)
        if (titleMatch) {
          // 根据标题查找政策链接
          const link = await prisma.policyLink.findFirst({
            where: { status: 'submitted' },
          })
          if (link) {
            // 生成简报
            const brief = await prisma.policyBrief.create({
              data: {
                policyLinkId: link.id,
                title: `${link.title || '政策简报'} - 自动生成`,
                summary: `本简报针对"${link.title}"进行解读。该政策由${link.source || '相关部门'}发布，主要面向中小微企业群体。`,
                applicableTo: JSON.stringify(['中小微企业', '代账客户']),
                keyClauses: '1. 政策背景\n2. 适用范围\n3. 优惠期限\n4. 申请条件\n5. 办理流程',
                actionSuggestions: '1. 筛选客户\n2. 政策通知\n3. 材料准备\n4. 申报指导\n5. 跟踪反馈',
                riskReminders: '1. 注意政策适用期限\n2. 确保材料真实完整\n3. 关注政策后续调整',
                sourceUrl: link.url,
                generatorId: 'system',
                reviewStatus: 'pending_review',
              },
            })

            // 更新政策链接状态
            await prisma.policyLink.update({
              where: { id: link.id },
              data: { status: 'brief_generated' },
            })

            return {
              generated: true,
              briefId: brief.id,
            }
          }
        }
      }
      throw new Error('Cannot extract link ID from task')
    }

    // 查找政策链接
    const link = await prisma.policyLink.findUnique({
      where: { id: linkIdMatch[1] },
    })

    if (!link) {
      throw new Error('Policy link not found')
    }

    // 生成简报
    const brief = await prisma.policyBrief.create({
      data: {
        policyLinkId: link.id,
        title: `${link.title || '政策简报'} - 自动生成`,
        summary: `本简报针对"${link.title}"进行解读。该政策由${link.source || '相关部门'}发布，主要面向中小微企业群体。`,
        applicableTo: JSON.stringify(['中小微企业', '代账客户']),
        keyClauses: '1. 政策背景\n2. 适用范围\n3. 优惠期限\n4. 申请条件\n5. 办理流程',
        actionSuggestions: '1. 筛选客户\n2. 政策通知\n3. 材料准备\n4. 申报指导\n5. 跟踪反馈',
        riskReminders: '1. 注意政策适用期限\n2. 确保材料真实完整\n3. 关注政策后续调整',
        sourceUrl: link.url,
        generatorId: 'system',
        reviewStatus: 'pending_review',
      },
    })

    // 更新政策链接状态
    await prisma.policyLink.update({
      where: { id: link.id },
      data: { status: 'brief_generated' },
    })

    return {
      generated: true,
      briefId: brief.id,
    }
  }

  /**
   * 执行知识缺口填充任务
   */
  private async executeGapFill(task: {
    id: string
    title?: string
    description: string | null
  }): Promise<{ filled: boolean; cardId?: string }> {
    logger.info('Executing knowledge gap fill', { taskId: task.id })

    // 从任务描述中提取缺口信息
    const gapTitleMatch = task.title?.match(/[「【](.+?)[」】]/)
    const gapTitle = gapTitleMatch ? gapTitleMatch[1] : task.title || '未知缺口'

    // 创建知识卡草稿
    const card = await prisma.knowledgeCard.create({
      data: {
        title: `${gapTitle} - 知识缺口补充`,
        category: 'faq',
        content: `# ${gapTitle}\n\n## 问题描述\n${task.description || '暂无描述'}\n\n## 解决方案\n待补充\n\n## 相关案例\n待补充`,
        status: 'draft',
        visibilityScope: 'department',
        creatorId: 'system',
      },
    })

    logger.info('Knowledge card created for gap', { cardId: card.id, gapTitle })

    return {
      filled: true,
      cardId: card.id,
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
