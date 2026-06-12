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

    logger.info('Feedback created', {
      feedbackId: feedback.id,
      targetType,
      targetId,
      userId,
    })

    return feedback
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
