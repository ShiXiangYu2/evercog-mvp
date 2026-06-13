/**
 * 用户反馈服务
 *
 * 处理用户对知识卡和问答结果的反馈
 */
import { prisma } from './prisma'
import logger from './logger'

// ==================== 类型定义 ====================

export type FeedbackTargetType = 'knowledge_card' | 'experience_query'

export interface CreateFeedbackInput {
  userId: string
  targetType: FeedbackTargetType
  targetId: string
  rating?: number
  helpful?: boolean
  comment?: string
}

export interface FeedbackStats {
  targetType: FeedbackTargetType
  targetId: string
  totalFeedbacks: number
  averageRating: number | null
  helpfulCount: number
  notHelpfulCount: number
  helpfulRate: number | null
}

// ==================== 反馈服务 ====================

export class FeedbackService {
  /**
   * 创建反馈
   */
  async createFeedback(input: CreateFeedbackInput) {
    const { userId, targetType, targetId, rating, helpful, comment } = input

    // 验证输入
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5')
    }

    // 创建反馈
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        targetType,
        targetId,
        rating,
        helpful,
        comment,
      },
    })

    // 更新统计信息
    await this.updateStats(targetType, targetId)

    // 如果是"无帮助"反馈，创建优化任务
    if (helpful === false && targetType === 'experience_query') {
      await this.createOptimizationTask(targetId, comment)
    }

    logger.info('Feedback created', {
      feedbackId: feedback.id,
      targetType,
      targetId,
      userId,
    })

    return feedback
  }

  /**
   * 创建优化任务
   */
  private async createOptimizationTask(queryId: string, comment?: string) {
    try {
      // 获取原始查询
      const query = await prisma.experienceQuery.findUnique({
        where: { id: queryId },
      })

      if (!query) return

      // 创建优化任务
      await prisma.optimizationTask.create({
        data: {
          sourceType: 'feedback',
          sourceId: queryId,
          question: query.question,
          status: 'pending',
          priority: 'medium',
          reason: comment || '用户反馈"无帮助"',
        },
      })

      logger.info('Optimization task created', {
        queryId,
        question: query.question.substring(0, 50),
      })
    } catch (error) {
      // 优化任务创建失败不应影响反馈流程
      logger.error('Failed to create optimization task', error as Error)
    }
  }

  /**
   * 获取目标的反馈列表
   */
  async getFeedbacks(targetType: FeedbackTargetType, targetId: string) {
    return prisma.feedback.findMany({
      where: {
        targetType,
        targetId,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats(targetType: FeedbackTargetType, targetId: string): Promise<FeedbackStats> {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        targetType,
        targetId,
      },
    })

    const totalFeedbacks = feedbacks.length

    // 计算平均评分
    const ratings = feedbacks.filter((f) => f.rating !== null).map((f) => f.rating as number)
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null

    // 计算有帮助/无帮助数量
    const helpfulCount = feedbacks.filter((f) => f.helpful === true).length
    const notHelpfulCount = feedbacks.filter((f) => f.helpful === false).length

    // 计算有帮助率
    const helpfulRate = (helpfulCount + notHelpfulCount) > 0
      ? helpfulCount / (helpfulCount + notHelpfulCount)
      : null

    return {
      targetType,
      targetId,
      totalFeedbacks,
      averageRating,
      helpfulCount,
      notHelpfulCount,
      helpfulRate,
    }
  }

  /**
   * 更新统计信息
   */
  private async updateStats(targetType: FeedbackTargetType, targetId: string) {
    if (targetType === 'knowledge_card') {
      await this.updateKnowledgeCardStats(targetId)
    }
  }

  /**
   * 更新知识卡统计
   */
  private async updateKnowledgeCardStats(cardId: string) {
    const stats = await this.getFeedbackStats('knowledge_card', cardId)

    // 查找或创建统计记录
    const existing = await prisma.knowledgeCardStats.findUnique({
      where: { cardId },
    })

    if (existing) {
      await prisma.knowledgeCardStats.update({
        where: { cardId },
        data: {
          avgRating: stats.averageRating || 0,
          ratingCount: stats.totalFeedbacks,
          helpfulCount: stats.helpfulCount,
          notHelpfulCount: stats.notHelpfulCount,
        },
      })
    } else {
      await prisma.knowledgeCardStats.create({
        data: {
          cardId,
          avgRating: stats.averageRating || 0,
          ratingCount: stats.totalFeedbacks,
          helpfulCount: stats.helpfulCount,
          notHelpfulCount: stats.notHelpfulCount,
        },
      })
    }
  }

  /**
   * 获取所有反馈统计
   */
  async getAllFeedbackStats() {
    const [totalFeedbacks, averageRating, helpfulCount] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.aggregate({
        _avg: { rating: true },
        where: { rating: { not: null } },
      }),
      prisma.feedback.count({
        where: { helpful: true },
      }),
    ])

    return {
      totalFeedbacks,
      averageRating: averageRating._avg.rating,
      helpfulCount,
    }
  }
}

// ==================== 单例导出 ====================

let _feedbackService: FeedbackService | null = null

export function getFeedbackService(): FeedbackService {
  if (!_feedbackService) {
    _feedbackService = new FeedbackService()
  }
  return _feedbackService
}
