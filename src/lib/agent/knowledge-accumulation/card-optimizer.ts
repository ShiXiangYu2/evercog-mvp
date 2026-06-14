/**
 * Card Optimizer 知识卡优化器
 *
 * 基于反馈模式优化已有知识卡
 */
import { prisma } from '../../prisma'
import { callLLMWithFallback } from '../../llm'
import { getEventBus } from '../../scheduler/event-bus'
import type { OptimizationResult, OutdatedCardAction } from './types'
import logger from '../../logger'

export class CardOptimizer {
  /**
   * 优化低质量知识卡
   */
  async optimizeLowQualityCards(options?: {
    qualityThreshold?: number
    maxCards?: number
  }): Promise<OptimizationResult[]> {
    const { qualityThreshold = 3, maxCards = 10 } = options || {}

    logger.info('Optimizing low quality cards', { qualityThreshold, maxCards })

    // 获取低质量卡片
    const lowQualityCards = await prisma.knowledgeCard.findMany({
      where: {
        status: 'published',
      },
      include: {
        knowledgeCardStats: true,
      },
      take: maxCards * 2,
    })

    // 筛选低质量卡片
    const cardsToOptimize = lowQualityCards
      .filter((card) => {
        const stats = card.knowledgeCardStats
        if (!stats || stats.ratingCount === 0) return false
        return stats.avgRating < qualityThreshold
      })
      .slice(0, maxCards)

    const results: OptimizationResult[] = []

    for (const card of cardsToOptimize) {
      try {
        const result = await this.optimizeCard(card.id)
        results.push(result)
      } catch (error) {
        logger.error('Failed to optimize card', error as Error, { cardId: card.id })
      }
    }

    return results
  }

  /**
   * 优化单张知识卡
   */
  async optimizeCard(cardId: string): Promise<OptimizationResult> {
    logger.info('Optimizing card', { cardId })

    // 1. 获取卡片信息
    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId },
      include: {
        knowledgeCardStats: true,
      },
    })

    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    // 2. 获取相关反馈
    const feedbacks = await prisma.feedback.findMany({
      where: {
        targetType: 'knowledge_card',
        targetId: cardId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // 3. 分析反馈，确定优化方向
    const changes = await this.analyzeAndGenerateChanges(card, feedbacks)

    // 4. 应用更改
    if (changes.length > 0) {
      await this.applyChanges(cardId, changes)
    }

    // 5. 发射事件
    getEventBus().emit('knowledge_card:reviewed', {
      cardId,
      changesCount: changes.length,
    })

    return {
      cardId,
      changes,
      confidence: 0.7,
      needsReview: true,
    }
  }

  /**
   * 检测过期卡片
   */
  async handleOutdatedCards(options?: {
    maxAgeDays?: number
    maxCards?: number
  }): Promise<OutdatedCardAction[]> {
    const { maxAgeDays = 90, maxCards = 20 } = options || {}

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

    // 获取过期卡片
    const outdatedCards = await prisma.knowledgeCard.findMany({
      where: {
        status: 'published',
        updatedAt: { lt: cutoffDate },
      },
      include: {
        knowledgeCardStats: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: maxCards,
    })

    const actions: OutdatedCardAction[] = []

    for (const card of outdatedCards) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - card.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 根据使用情况决定行动
      const stats = card.knowledgeCardStats
      if (stats && stats.viewCount > 10) {
        // 高使用率，建议更新
        actions.push({
          cardId: card.id,
          action: 'suggest_update',
          reason: `${daysSinceUpdate} 天未更新，但使用频率较高`,
          lastUpdated: card.updatedAt,
          daysSinceUpdate,
        })
      } else if (daysSinceUpdate > 180) {
        // 超过半年未更新且使用率低，建议归档
        actions.push({
          cardId: card.id,
          action: 'auto_archive',
          reason: `${daysSinceUpdate} 天未更新，使用频率低`,
          lastUpdated: card.updatedAt,
          daysSinceUpdate,
        })
      } else {
        // 其他情况，标记审核
        actions.push({
          cardId: card.id,
          action: 'flag_for_review',
          reason: `${daysSinceUpdate} 天未更新`,
          lastUpdated: card.updatedAt,
          daysSinceUpdate,
        })
      }
    }

    return actions
  }

  // ==================== 私有方法 ====================

  /**
   * 分析并生成优化建议
   */
  private async analyzeAndGenerateChanges(
    card: {
      id: string
      title: string
      content: string
      category: string
      riskNotes: string | null
    },
    feedbacks: Array<{
      helpful: boolean | null
      rating: number | null
      comment: string | null
    }>
  ): Promise<OptimizationResult['changes']> {
    const changes: OptimizationResult['changes'] = []

    // 分析负面反馈
    const negativeFeedbacks = feedbacks.filter((f) => f.helpful === false)
    const lowRatings = feedbacks.filter((f) => f.rating !== null && f.rating < 3)

    // 如果有足够多的负面反馈，尝试使用 LLM 优化
    if (negativeFeedbacks.length >= 3 || lowRatings.length >= 3) {
      try {
        const optimizedContent = await this.generateOptimizedContent(card, feedbacks)
        if (optimizedContent && optimizedContent !== card.content) {
          changes.push({
            field: 'content',
            oldValue: card.content.substring(0, 100) + '...',
            newValue: optimizedContent.substring(0, 100) + '...',
            reason: `基于 ${negativeFeedbacks.length} 条负面反馈优化`,
          })
        }
      } catch (error) {
        logger.warn('Failed to generate optimized content', { error: (error as Error).message })
      }
    }

    // 检查风险提示
    if (!card.riskNotes && card.category === 'risk_reminder') {
      changes.push({
        field: 'riskNotes',
        oldValue: '',
        newValue: '请补充风险提示',
        reason: '风险提醒类知识卡缺少风险提示',
      })
    }

    return changes
  }

  /**
   * 使用 LLM 生成优化内容
   */
  private async generateOptimizedContent(
    card: { title: string; content: string; category: string },
    feedbacks: Array<{ comment: string | null }>
  ): Promise<string | null> {
    const feedbackComments = feedbacks
      .filter((f) => f.comment)
      .map((f) => f.comment)
      .join('\n')

    const prompt = `请优化以下知识卡内容：

标题：${card.title}
分类：${card.category}
当前内容：
${card.content}

用户反馈：
${feedbackComments || '暂无具体反馈'}

请输出优化后的内容，保持 Markdown 格式。`

    try {
      const result = await callLLMWithFallback(
        async (provider) => {
          const reply = await provider.generateExperienceReply({
            question: prompt,
            retrievedCards: [],
          })
          return reply.policyExplanation
        },
        {
          userId: 'system',
          operationType: 'card_optimization',
        }
      )

      return result
    } catch {
      return null
    }
  }

  /**
   * 应用更改
   */
  private async applyChanges(
    cardId: string,
    changes: Array<{ field: string; newValue: string }>
  ): Promise<void> {
    for (const change of changes) {
      if (change.field === 'content') {
        await prisma.knowledgeCard.update({
          where: { id: cardId },
          data: {
            content: change.newValue,
            version: { increment: 1 },
          },
        })
      } else if (change.field === 'riskNotes') {
        await prisma.knowledgeCard.update({
          where: { id: cardId },
          data: { riskNotes: change.newValue },
        })
      }
    }
  }
}

// 单例导出
let _optimizer: CardOptimizer | null = null

export function getCardOptimizer(): CardOptimizer {
  if (!_optimizer) {
    _optimizer = new CardOptimizer()
  }
  return _optimizer
}
