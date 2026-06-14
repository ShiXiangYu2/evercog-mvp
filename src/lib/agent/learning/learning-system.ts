/**
 * Learning System 学习系统
 *
 * 编排各个分析器，实现持续学习
 */
import { getFeedbackAnalyzer } from './feedback-analyzer'
import { getPatternStore } from './pattern-store'
import { getQualityTracker } from './quality-tracker'
import { getEventBus } from '../../scheduler/event-bus'
import type { FeedbackAnalysisResult, QualityMetricsSnapshot, LearningPattern } from './types'
import { FEEDBACK_ANALYSIS_DAYS, FEEDBACK_MIN_FREQUENCY } from '../config'
import logger from '../../logger'

export interface LearningResult {
  analyzedAt: Date
  feedbackAnalysis: FeedbackAnalysisResult
  patternsStored: number
  qualityMetrics: QualityMetricsSnapshot
  anomalies: Array<{
    type: string
    metric: string
    currentValue: number
    severity: string
  }>
}

export class LearningSystem {
  private feedbackAnalyzer = getFeedbackAnalyzer()
  private patternStore = getPatternStore()
  private qualityTracker = getQualityTracker()

  /**
   * 执行完整的学习循环
   */
  async runLearningCycle(options?: {
    skipFeedback?: boolean
    skipQuality?: boolean
  }): Promise<LearningResult> {
    logger.info('Starting learning cycle')

    const now = new Date()

    // 1. 分析反馈
    let feedbackAnalysis: FeedbackAnalysisResult = {
      analyzedAt: now,
      totalFeedbacks: 0,
      patterns: [],
      stats: { helpfulRate: 0, notHelpfulRate: 0, averageRating: 0 },
    }

    if (!options?.skipFeedback) {
      feedbackAnalysis = await this.feedbackAnalyzer.analyze({
        days: FEEDBACK_ANALYSIS_DAYS,
        minFrequency: FEEDBACK_MIN_FREQUENCY,
      })
    }

    // 2. 存储模式
    const patternsStored = await this.storePatterns(feedbackAnalysis.patterns)

    // 3. 计算质量指标
    let qualityMetrics: QualityMetricsSnapshot = {
      timestamp: now,
      knowledgeCoverageRate: 0,
      averageCardQuality: 0,
      averageReplySatisfaction: 0,
      cardCitationRate: 0,
      gapResolutionRate: 0,
      taskCompletionRate: 0,
      failureRate: 0,
    }

    if (!options?.skipQuality) {
      qualityMetrics = await this.qualityTracker.calculateAndStoreMetrics()
    }

    // 4. 检测异常
    const anomalies = await this.qualityTracker.detectAnomalies()

    // 5. 发射事件
    getEventBus().emit('agent:decision_made', {
      type: 'learning_cycle_completed',
      patternsStored,
      anomaliesCount: anomalies.length,
    })

    const result: LearningResult = {
      analyzedAt: now,
      feedbackAnalysis,
      patternsStored,
      qualityMetrics,
      anomalies,
    }

    logger.info('Learning cycle completed', {
      patternsStored,
      anomaliesCount: anomalies.length,
    })

    return result
  }

  /**
   * 获取学习模式
   */
  async getPatterns(options?: {
    type?: string
    category?: string
    minConfidence?: number
    limit?: number
  }): Promise<LearningPattern[]> {
    return this.patternStore.getActivePatterns(options as Parameters<typeof this.patternStore.getActivePatterns>[0])
  }

  /**
   * 获取模式统计
   */
  async getPatternStats(): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    averageConfidence: number
  }> {
    return this.patternStore.getStats()
  }

  /**
   * 获取质量趋势
   */
  async getQualityTrend(metricType: string, days?: number) {
    return this.qualityTracker.getQualityTrend(metricType, days)
  }

  /**
   * 获取质量异常
   */
  async getQualityAnomalies() {
    return this.qualityTracker.detectAnomalies()
  }

  /**
   * 老化处理
   */
  async agePatterns(maxAgeDays: number = 30): Promise<number> {
    return this.patternStore.age(maxAgeDays)
  }

  // ==================== 私有方法 ====================

  /**
   * 存储模式
   */
  private async storePatterns(patterns: LearningPattern[]): Promise<number> {
    let storedCount = 0

    for (const pattern of patterns) {
      try {
        await this.patternStore.store(pattern)
        storedCount++
      } catch (error) {
        logger.error('Failed to store pattern', error as Error, {
          patternType: pattern.patternType,
        })
      }
    }

    return storedCount
  }
}

// 单例导出
let _learningSystem: LearningSystem | null = null

export function getLearningSystem(): LearningSystem {
  if (!_learningSystem) {
    _learningSystem = new LearningSystem()
  }
  return _learningSystem
}
