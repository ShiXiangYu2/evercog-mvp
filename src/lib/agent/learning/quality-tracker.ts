/**
 * Quality Tracker 质量追踪器
 *
 * 计算和存储质量指标快照，检测质量异常
 */
import { prisma } from '../../prisma'
import type { QualityMetricsSnapshot, QualityTrend } from './types'
import {
  QUALITY_COVERAGE_TARGET,
  QUALITY_CITATION_TARGET,
  QUALITY_SATISFACTION_TARGET,
  QUALITY_TASK_COMPLETION_TARGET,
} from '../config'
import logger from '../../logger'

export class QualityTracker {
  /**
   * 计算并存储当前质量指标
   */
  async calculateAndStoreMetrics(): Promise<QualityMetricsSnapshot> {
    logger.info('Calculating quality metrics')

    const now = new Date()

    // 并行计算各项指标
    const [
      knowledgeCoverageRate,
      averageCardQuality,
      averageReplySatisfaction,
      cardCitationRate,
      gapResolutionRate,
      taskCompletionRate,
      failureRate,
    ] = await Promise.all([
      this.calculateCoverageRate(),
      this.calculateAverageCardQuality(),
      this.calculateReplySatisfaction(),
      this.calculateCitationRate(),
      this.calculateGapResolutionRate(),
      this.calculateTaskCompletionRate(),
      this.calculateFailureRate(),
    ])

    const snapshot: QualityMetricsSnapshot = {
      timestamp: now,
      knowledgeCoverageRate,
      averageCardQuality,
      averageReplySatisfaction,
      cardCitationRate,
      gapResolutionRate,
      taskCompletionRate,
      failureRate,
    }

    // 存储到数据库
    await this.storeMetrics(snapshot)

    logger.info('Quality metrics calculated', {
      coverage: snapshot.knowledgeCoverageRate,
      quality: snapshot.averageCardQuality,
      satisfaction: snapshot.averageReplySatisfaction,
    })
    return snapshot
  }

  /**
   * 获取质量趋势
   */
  async getQualityTrend(
    metricType: string,
    days: number = 7
  ): Promise<QualityTrend> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await prisma.qualityMetrics.findMany({
      where: {
        metricType,
        calculatedAt: { gte: startDate },
      },
      orderBy: { calculatedAt: 'asc' },
    })

    const dataPoints = metrics.map((m) => ({
      date: m.calculatedAt,
      value: m.value,
    }))

    // 计算趋势
    const trend = this.calculateTrend(dataPoints)
    const changeRate = this.calculateChangeRate(dataPoints)

    return {
      metricType,
      dataPoints,
      trend,
      changeRate,
    }
  }

  /**
   * 检测质量异常
   */
  async detectAnomalies(): Promise<Array<{
    type: string
    metric: string
    currentValue: number
    expectedRange: { min: number; max: number }
    severity: 'low' | 'medium' | 'high'
  }>> {
    const anomalies: Array<{
      type: string
      metric: string
      currentValue: number
      expectedRange: { min: number; max: number }
      severity: 'low' | 'medium' | 'high'
    }> = []

    // 获取当前指标
    const currentMetrics = await prisma.qualityMetrics.findMany({
      where: {
        calculatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { calculatedAt: 'desc' },
    })

    // 检查各项指标是否异常
    const metricThresholds: Record<string, { min: number; max: number }> = {
      coverage: { min: 60, max: 100 },
      citation_rate: { min: 30, max: 100 },
      satisfaction: { min: 3, max: 5 },
      outdated_rate: { min: 0, max: 20 },
    }

    for (const metric of currentMetrics) {
      const threshold = metricThresholds[metric.metricType]
      if (!threshold) continue

      if (metric.value < threshold.min || metric.value > threshold.max) {
        const severity = this.calculateSeverity(metric.value, threshold)
        anomalies.push({
          type: 'metric_out_of_range',
          metric: metric.metricType,
          currentValue: metric.value,
          expectedRange: threshold,
          severity,
        })
      }
    }

    return anomalies
  }

  // ==================== 指标计算方法 ====================

  /**
   * 计算知识覆盖率
   */
  private async calculateCoverageRate(): Promise<number> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const totalQueries = await prisma.experienceQuery.count({
      where: { createdAt: { gte: oneWeekAgo } },
    })

    if (totalQueries === 0) return 100

    const queries = await prisma.experienceQuery.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      select: { retrievedCards: true },
    })

    let coveredCount = 0
    for (const query of queries) {
      try {
        const cards = JSON.parse(query.retrievedCards || '[]')
        if (Array.isArray(cards) && cards.length > 0) {
          coveredCount++
        }
      } catch {
        // 解析失败视为未覆盖
      }
    }

    return (coveredCount / totalQueries) * 100
  }

  /**
   * 计算平均知识卡质量
   */
  private async calculateAverageCardQuality(): Promise<number> {
    const result = await prisma.knowledgeCardStats.aggregate({
      _avg: { avgRating: true },
      where: { ratingCount: { gt: 0 } },
    })

    return result._avg.avgRating || 0
  }

  /**
   * 计算回复满意度
   */
  private async calculateReplySatisfaction(): Promise<number> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const feedbacks = await prisma.feedback.findMany({
      where: {
        createdAt: { gte: oneWeekAgo },
        rating: { not: null },
      },
      select: { rating: true },
    })

    if (feedbacks.length === 0) return 0

    const sum = feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0)
    return sum / feedbacks.length
  }

  /**
   * 计算卡片引用率
   */
  private async calculateCitationRate(): Promise<number> {
    const totalCards = await prisma.knowledgeCard.count({
      where: { status: 'published' },
    })

    if (totalCards === 0) return 0

    const citedCards = await prisma.knowledgeCardStats.count({
      where: { citeCount: { gt: 0 } },
    })

    return (citedCards / totalCards) * 100
  }

  /**
   * 计算缺口解决率
   */
  private async calculateGapResolutionRate(): Promise<number> {
    const totalGaps = await prisma.knowledgeGap.count()

    if (totalGaps === 0) return 100

    const resolvedGaps = await prisma.knowledgeGap.count({
      where: { status: 'resolved' },
    })

    return (resolvedGaps / totalGaps) * 100
  }

  /**
   * 计算任务完成率
   */
  private async calculateTaskCompletionRate(): Promise<number> {
    const totalTasks = await prisma.agentTask.count()

    if (totalTasks === 0) return 100

    const completedTasks = await prisma.agentTask.count({
      where: { status: 'completed' },
    })

    return (completedTasks / totalTasks) * 100
  }

  /**
   * 计算失败率
   */
  private async calculateFailureRate(): Promise<number> {
    const totalTasks = await prisma.agentTask.count()

    if (totalTasks === 0) return 0

    const failedTasks = await prisma.agentTask.count({
      where: { status: 'failed' },
    })

    return (failedTasks / totalTasks) * 100
  }

  // ==================== 辅助方法 ====================

  /**
   * 存储指标
   */
  private async storeMetrics(snapshot: QualityMetricsSnapshot): Promise<void> {
    const metrics = [
      { metricType: 'coverage', value: snapshot.knowledgeCoverageRate, target: QUALITY_COVERAGE_TARGET },
      { metricType: 'citation_rate', value: snapshot.cardCitationRate, target: QUALITY_CITATION_TARGET },
      { metricType: 'satisfaction', value: snapshot.averageReplySatisfaction, target: QUALITY_SATISFACTION_TARGET },
      { metricType: 'task_completion', value: snapshot.taskCompletionRate, target: QUALITY_TASK_COMPLETION_TARGET },
    ]

    for (const metric of metrics) {
      await prisma.qualityMetrics.create({
        data: {
          ...metric,
          calculatedAt: snapshot.timestamp,
        },
      })
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(
    dataPoints: Array<{ date: Date; value: number }>
  ): 'improving' | 'stable' | 'declining' {
    if (dataPoints.length < 2) return 'stable'

    const recent = dataPoints.slice(-3)
    const older = dataPoints.slice(0, 3)

    const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b.value, 0) / older.length

    const change = recentAvg - olderAvg

    if (change > 0.05) return 'improving'
    if (change < -0.05) return 'declining'
    return 'stable'
  }

  /**
   * 计算变化率
   */
  private calculateChangeRate(
    dataPoints: Array<{ date: Date; value: number }>
  ): number {
    if (dataPoints.length < 2) return 0

    const first = dataPoints[0].value
    const last = dataPoints[dataPoints.length - 1].value

    if (first === 0) return 0

    return ((last - first) / first) * 100
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(
    value: number,
    threshold: { min: number; max: number }
  ): 'low' | 'medium' | 'high' {
    if (value < threshold.min * 0.5 || value > threshold.max * 1.5) {
      return 'high'
    }
    if (value < threshold.min * 0.8 || value > threshold.max * 1.2) {
      return 'medium'
    }
    return 'low'
  }
}

// 单例导出
let _tracker: QualityTracker | null = null

export function getQualityTracker(): QualityTracker {
  if (!_tracker) {
    _tracker = new QualityTracker()
  }
  return _tracker
}
