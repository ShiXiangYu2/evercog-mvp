/**
 * Feedback Analyzer 反馈分析器
 *
 * 从用户反馈中提取学习模式
 */
import { prisma } from '../../prisma'
import type { LearningPattern, FeedbackAnalysisResult } from './types'
import { FEEDBACK_MIN_FREQUENCY, FEEDBACK_ANALYSIS_DAYS } from '../config'
import logger from '../../logger'

export class FeedbackAnalyzer {
  /**
   * 分析反馈数据，提取学习模式
   */
  async analyze(options?: {
    days?: number
    minFrequency?: number
  }): Promise<FeedbackAnalysisResult> {
    const { days = FEEDBACK_ANALYSIS_DAYS, minFrequency = FEEDBACK_MIN_FREQUENCY } = options || {}

    logger.info('Starting feedback analysis', { days, minFrequency })

    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // 获取时间范围内的反馈
    const feedbacks = await prisma.feedback.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        user: true,
      },
    })

    // 计算统计指标
    const stats = this.calculateStats(feedbacks)

    // 提取模式
    const patterns: LearningPattern[] = []

    // 1. 分析低质量知识卡
    const lowQualityCardPatterns = await this.analyzeLowQualityCards(feedbacks, minFrequency)
    patterns.push(...lowQualityCardPatterns)

    // 2. 分析问答匹配失败
    const qaMissPatterns = await this.analyzeQAMisses(feedbacks, minFrequency)
    patterns.push(...qaMissPatterns)

    // 3. 分析覆盖缺口
    const coveragePatterns = await this.analyzeCoverageGaps(feedbacks, minFrequency)
    patterns.push(...coveragePatterns)

    logger.info('Feedback analysis completed', {
      totalFeedbacks: feedbacks.length,
      patternsFound: patterns.length,
    })

    return {
      analyzedAt: now,
      totalFeedbacks: feedbacks.length,
      patterns,
      stats,
    }
  }

  /**
   * 计算反馈统计
   */
  private calculateStats(feedbacks: Array<{ helpful: boolean | null; rating: number | null }>) {
    const total = feedbacks.length
    if (total === 0) {
      return { helpfulRate: 0, notHelpfulRate: 0, averageRating: 0 }
    }

    const helpful = feedbacks.filter((f) => f.helpful === true).length
    const notHelpful = feedbacks.filter((f) => f.helpful === false).length
    const ratings = feedbacks.filter((f) => f.rating !== null).map((f) => f.rating as number)

    return {
      helpfulRate: helpful / total,
      notHelpfulRate: notHelpful / total,
      averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    }
  }

  /**
   * 分析低质量知识卡
   */
  private async analyzeLowQualityCards(
    feedbacks: Array<{ targetType: string; targetId: string; helpful: boolean | null }>,
    minFrequency: number
  ): Promise<LearningPattern[]> {
    // 统计每个知识卡的反馈
    const cardFeedbacks = new Map<string, { total: number; notHelpful: number }>()

    for (const feedback of feedbacks) {
      if (feedback.targetType !== 'knowledge_card') continue

      const cardId = feedback.targetId
      const stats = cardFeedbacks.get(cardId) || { total: 0, notHelpful: 0 }
      stats.total++
      if (feedback.helpful === false) {
        stats.notHelpful++
      }
      cardFeedbacks.set(cardId, stats)
    }

    // 找出低质量卡片
    const patterns: LearningPattern[] = []

    for (const [cardId, stats] of cardFeedbacks) {
      if (stats.notHelpful >= minFrequency) {
        // 获取卡片信息
        const card = await prisma.knowledgeCard.findUnique({
          where: { id: cardId },
          select: { title: true, category: true },
        })

        if (card) {
          patterns.push({
            id: `pattern_${Date.now()}_${cardId}`,
            patternType: 'feedback_quality',
            category: card.category,
            description: `知识卡「${card.title}」收到 ${stats.notHelpful} 条负面反馈`,
            frequency: stats.notHelpful,
            confidence: Math.min(stats.notHelpful / 10, 1),
            evidence: { cardId, totalFeedback: stats.total, notHelpful: stats.notHelpful },
            suggestedAction: 'review_and_update_card',
            status: 'active',
            learnedAt: new Date(),
            lastReinforcedAt: new Date(),
          })
        }
      }
    }

    return patterns
  }

  /**
   * 分析问答匹配失败
   */
  private async analyzeQAMisses(
    feedbacks: Array<{ targetType: string; targetId: string; helpful: boolean | null }>,
    minFrequency: number
  ): Promise<LearningPattern[]> {
    // 统计每个经验查询的反馈
    const queryFeedbacks = new Map<string, { total: number; notHelpful: number }>()

    for (const feedback of feedbacks) {
      if (feedback.targetType !== 'experience_query') continue

      const queryId = feedback.targetId
      const stats = queryFeedbacks.get(queryId) || { total: 0, notHelpful: 0 }
      stats.total++
      if (feedback.helpful === false) {
        stats.notHelpful++
      }
      queryFeedbacks.set(queryId, stats)
    }

    // 找出匹配失败的查询
    const patterns: LearningPattern[] = []

    for (const [queryId, stats] of queryFeedbacks) {
      if (stats.notHelpful >= minFrequency) {
        // 获取查询信息
        const query = await prisma.experienceQuery.findUnique({
          where: { id: queryId },
          select: { question: true },
        })

        if (query) {
          patterns.push({
            id: `pattern_${Date.now()}_${queryId}`,
            patternType: 'qa_miss',
            description: `问题「${query.question.substring(0, 50)}」的回复被标记为无帮助`,
            frequency: stats.notHelpful,
            confidence: Math.min(stats.notHelpful / 10, 1),
            evidence: { queryId, question: query.question, notHelpful: stats.notHelpful },
            suggestedAction: 'create_knowledge_card',
            status: 'active',
            learnedAt: new Date(),
            lastReinforcedAt: new Date(),
          })
        }
      }
    }

    return patterns
  }

  /**
   * 分析覆盖缺口
   */
  private async analyzeCoverageGaps(
    feedbacks: Array<{ targetType: string; targetId: string; helpful: boolean | null }>,
    minFrequency: number
  ): Promise<LearningPattern[]> {
    // 获取没有检索到知识卡的查询
    const uncoveredQueries = await prisma.experienceQuery.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    })

    const patterns: LearningPattern[] = []
    const questionFrequency = new Map<string, number>()

    for (const query of uncoveredQueries) {
      try {
        const cards = JSON.parse(query.retrievedCards || '[]')
        if (Array.isArray(cards) && cards.length === 0) {
          // 未覆盖的问题
          const freq = questionFrequency.get(query.question) || 0
          questionFrequency.set(query.question, freq + 1)
        }
      } catch {
        // 解析失败视为未覆盖
        const freq = questionFrequency.get(query.question) || 0
        questionFrequency.set(query.question, freq + 1)
      }
    }

    // 生成模式
    for (const [question, frequency] of questionFrequency) {
      if (frequency >= minFrequency) {
        patterns.push({
          id: `pattern_${Date.now()}_gap_${question.substring(0, 20)}`,
          patternType: 'coverage_gap',
          description: `问题「${question.substring(0, 50)}」被问 ${frequency} 次但未被知识库覆盖`,
          frequency,
          confidence: Math.min(frequency / 10, 1),
          evidence: { question, frequency },
          suggestedAction: 'create_knowledge_card',
          status: 'active',
          learnedAt: new Date(),
          lastReinforcedAt: new Date(),
        })
      }
    }

    return patterns
  }
}

// 单例导出
let _analyzer: FeedbackAnalyzer | null = null

export function getFeedbackAnalyzer(): FeedbackAnalyzer {
  if (!_analyzer) {
    _analyzer = new FeedbackAnalyzer()
  }
  return _analyzer
}
