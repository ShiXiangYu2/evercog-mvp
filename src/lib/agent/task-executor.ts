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
   *
   * Agent 根据缺口信息自动生成知识卡草稿，提交导师审核
   */
  private async executeGapFill(task: {
    id: string
    title?: string
    description: string | null
  }): Promise<{ filled: boolean; cardId?: string; gapId?: string }> {
    logger.info('Executing knowledge gap fill', { taskId: task.id })

    // 从任务描述中提取缺口信息
    // description 格式: "gap_id: xxx | question: xxx | topic: xxx | frequency: xxx"
    const gapIdMatch = task.description?.match(/gap_id:\s*([a-z0-9-]+)/i)
    const questionMatch = task.description?.match(/question:\s*(.+?)(?:\s*\||$)/i)
    const topicMatch = task.description?.match(/topic:\s*(.+?)(?:\s*\||$)/i)
    const frequencyMatch = task.description?.match(/frequency:\s*(\d+)/i)

    const gapId = gapIdMatch?.[1]
    const question = questionMatch?.[1]?.trim() || task.title || '未知问题'
    const topic = topicMatch?.[1]?.trim() || '未分类'
    const frequency = frequencyMatch ? parseInt(frequencyMatch[1]) : 1

    // 从标题中提取简洁的问题描述
    const gapTitleMatch = task.title?.match(/[「【](.+?)[」】]/)
    const gapTitle = gapTitleMatch?.[1] || question

    // 根据主题确定分类
    const categoryMap: Record<string, string> = {
      '代账服务': 'faq',
      '税务相关': 'tax_process',
      '资料清单': 'data_checklist',
      '风险合规': 'risk_reminder',
      '政策解读': 'faq',
      '销售技巧': 'experience',
      '客户服务': 'experience',
    }
    const category = categoryMap[topic] || 'faq'

    // 生成知识卡内容
    const content = this.generateGapFillContent(gapTitle, question, topic, frequency)

    // 创建知识卡，状态为 pending_review（等待导师审核）
    const card = await prisma.knowledgeCard.create({
      data: {
        title: gapTitle,
        category,
        content,
        source: `知识缺口自动补充 | gap_id: ${gapId || 'unknown'} | 被问 ${frequency} 次`,
        status: 'pending_review',
        visibilityScope: 'department',
        creatorId: 'system',
        tags: JSON.stringify([topic, '自动补充']),
      },
    })

    // 更新缺口状态为 in_progress（已由 Agent 处理，等待审核）
    if (gapId) {
      await prisma.knowledgeGap.update({
        where: { id: gapId },
        data: { status: 'in_progress' },
      }).catch((err) => {
        logger.warn('Failed to update gap status', { gapId, error: err.message })
      })
    }

    logger.info('Knowledge card created for gap', {
      cardId: card.id,
      gapId,
      gapTitle,
      category,
    })

    return {
      filled: true,
      cardId: card.id,
      gapId,
    }
  }

  /**
   * 生成缺口填充内容
   */
  private generateGapFillContent(
    gapTitle: string,
    question: string,
    topic: string,
    frequency: number
  ): string {
    return `# ${gapTitle}

## 问题背景

**问题来源**：员工问答中被问及 ${frequency} 次，属于高频问题。
**主题分类**：${topic}
**原始问题**：${question}

## 标准回答

> ⚠️ 以下为 Agent 自动生成的框架，请导师根据实际情况补充完善。

### 适用场景

（请描述此问题的典型适用场景）

### 标准操作流程

1. 第一步：确认客户类型和具体需求
2. 第二步：查询相关政策法规
3. 第三步：准备所需材料清单
4. 第四步：指导客户完成操作
5. 第五步：跟进反馈

### 所需材料

| 序号 | 材料名称 | 说明 | 备注 |
|------|----------|------|------|
| 1 | - | - | - |

### 注意事项

- 注意时效性，政策可能随时更新
- 确保信息准确性，建议与最新政策文件核对
- 如遇特殊情况，及时向上级或导师咨询

### 相关政策依据

（请补充相关政策文件名称和条款编号）

### 常见误区

（请补充常见错误做法和正确做法对比）

---

*此知识卡由 Agent 基于知识缺口自动生成，待导师审核完善后发布。*`
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
