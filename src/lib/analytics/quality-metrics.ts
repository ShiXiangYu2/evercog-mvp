/**
 * 质量指标计算服务
 *
 * 计算知识库的各项质量指标
 * - 覆盖率 (coverage)
 * - 引用率 (citation_rate)
 * - 满意度 (satisfaction)
 * - 过时率 (outdated_rate)
 */
import { prisma } from '../prisma'
import logger from '../logger'

// ==================== 类型定义 ====================

export type MetricType = 'coverage' | 'citation_rate' | 'satisfaction' | 'outdated_rate'

export interface MetricData {
  id: string
  metricType: MetricType
  value: number
  target: number
  department: string | null
  calculatedAt: Date
}

export interface QualityMetricsResult {
  metrics: MetricData[]
  summary: {
    overallScore: number
    metricsCount: number
    metricsAboveTarget: number
    metricsBelowTarget: number
  }
  calculatedAt: Date
}

// ==================== 质量指标服务 ====================

export class QualityMetricsService {
  /**
   * 计算所有质量指标
   */
  async calculateMetrics(): Promise<QualityMetricsResult> {
    logger.info('Calculating quality metrics')

    // 并行计算各项指标
    const [coverage, citationRate, satisfaction, outdatedRate] = await Promise.all([
      this.calculateCoverage(),
      this.calculateCitationRate(),
      this.calculateSatisfaction(),
      this.calculateOutdatedRate(),
    ])

    const metrics: MetricData[] = [
      {
        id: '',
        metricType: 'coverage',
        value: coverage.value,
        target: coverage.target,
        department: null,
        calculatedAt: new Date(),
      },
      {
        id: '',
        metricType: 'citation_rate',
        value: citationRate.value,
        target: citationRate.target,
        department: null,
        calculatedAt: new Date(),
      },
      {
        id: '',
        metricType: 'satisfaction',
        value: satisfaction.value,
        target: satisfaction.target,
        department: null,
        calculatedAt: new Date(),
      },
      {
        id: '',
        metricType: 'outdated_rate',
        value: outdatedRate.value,
        target: outdatedRate.target,
        department: null,
        calculatedAt: new Date(),
      },
    ]

    // 保存指标数据
    const savedMetrics = await this.saveMetrics(metrics)

    // 计算汇总信息
    const summary = this.calculateSummary(savedMetrics)

    const result: QualityMetricsResult = {
      metrics: savedMetrics,
      summary,
      calculatedAt: new Date(),
    }

    logger.info('Quality metrics calculation completed', {
      overallScore: summary.overallScore,
      metricsCount: summary.metricsCount,
    })

    return result
  }

  /**
   * 获取最新质量指标
   */
  async getLatestMetrics(): Promise<QualityMetricsResult> {
    const metrics = await prisma.qualityMetrics.findMany({
      orderBy: { calculatedAt: 'desc' },
      take: 4,
    })

    const summary = this.calculateSummary(
      metrics.map((m) => ({
        id: m.id,
        metricType: m.metricType as MetricType,
        value: m.value,
        target: m.target,
        department: m.department,
        calculatedAt: m.calculatedAt,
      }))
    )

    return {
      metrics: metrics.map((m) => ({
        id: m.id,
        metricType: m.metricType as MetricType,
        value: m.value,
        target: m.target,
        department: m.department,
        calculatedAt: m.calculatedAt,
      })),
      summary,
      calculatedAt: new Date(),
    }
  }

  /**
   * 计算知识卡覆盖率
   *
   * 覆盖率 = 有知识卡覆盖的主题数 / 总主题数
   */
  private async calculateCoverage(): Promise<{ value: number; target: number }> {
    // 获取所有已发布的知识卡
    const publishedCards = await prisma.knowledgeCard.findMany({
      where: { status: 'published' },
      select: { category: true, tags: true },
    })

    // 定义需要覆盖的主题
    const requiredTopics = [
      '代账服务',
      '税务相关',
      '工商服务',
      '餐饮行业',
      '零售行业',
      '门店服务',
      '资料清单',
      '风险合规',
      '政策解读',
      '价格咨询',
      '流程咨询',
      '客户服务',
    ]

    // 计算已覆盖的主题
    const coveredTopics = new Set<string>()

    for (const card of publishedCards) {
      // 根据分类映射主题
      const topicMap: Record<string, string[]> = {
        data_checklist: ['资料清单', '流程咨询'],
        tax_process: ['税务相关', '代账服务'],
        risk_reminder: ['风险合规'],
        service_boundary: ['客户服务', '流程咨询'],
        faq: ['流程咨询', '价格咨询'],
        experience: ['销售技巧', '客户服务'],
      }

      const topics = topicMap[card.category] || []
      topics.forEach((t) => coveredTopics.add(t))
    }

    // 计算覆盖率
    const coveredCount = requiredTopics.filter((t) => coveredTopics.has(t)).length
    const value = Math.round((coveredCount / requiredTopics.length) * 100)

    return { value, target: 90 }
  }

  /**
   * 计算员工引用率
   *
   * 引用率 = 有引用来源的查询数 / 总查询数
   */
  private async calculateCitationRate(): Promise<{ value: number; target: number }> {
    // 获取最近 30 天的查询
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const queries = await prisma.experienceQuery.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { citedSources: true },
    })

    if (queries.length === 0) {
      return { value: 0, target: 80 }
    }

    // 计算有引用的查询数
    let citedCount = 0
    for (const query of queries) {
      try {
        const sources = JSON.parse(query.citedSources || '[]')
        if (Array.isArray(sources) && sources.length > 0) {
          citedCount++
        }
      } catch {
        // 解析失败视为无引用
      }
    }

    const value = Math.round((citedCount / queries.length) * 100)

    return { value, target: 80 }
  }

  /**
   * 计算满意度评分
   *
   * 基于查询的生成状态和内容质量评估
   * 注意：这是一个简化版本，实际应基于用户反馈
   */
  private async calculateSatisfaction(): Promise<{ value: number; target: number }> {
    // 获取最近 30 天的查询
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const queries = await prisma.experienceQuery.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'generated',
      },
      select: {
        retrievedCards: true,
        generatedReply: true,
      },
    })

    if (queries.length === 0) {
      return { value: 0, target: 4.5 }
    }

    // 简化的满意度计算（基于是否有检索到知识卡和生成回复）
    let score = 3.0 // 基础分

    for (const query of queries) {
      try {
        const cards = JSON.parse(query.retrievedCards || '[]')
        const reply = JSON.parse(query.generatedReply || '{}')

        // 有检索到知识卡加分
        if (cards.length > 0) score += 0.1
        if (cards.length >= 2) score += 0.1

        // 有完整回复加分
        if (reply.policyExplanation) score += 0.05
        if (reply.salesScript) score += 0.05
        if (reply.riskReminder) score += 0.05
      } catch {
        // 解析失败不加分
      }
    }

    // 归一化到 5 分制
    const value = Math.min(5, Math.round((score / queries.length) * 10) / 10)

    return { value, target: 4.5 }
  }

  /**
   * 计算过时率
   *
   * 过时率 = 超过 90 天未更新的知识卡数 / 总知识卡数
   */
  private async calculateOutdatedRate(): Promise<{ value: number; target: number }> {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [totalCount, outdatedCount] = await Promise.all([
      prisma.knowledgeCard.count({
        where: { status: 'published' },
      }),
      prisma.knowledgeCard.count({
        where: {
          status: 'published',
          updatedAt: { lt: ninetyDaysAgo },
        },
      }),
    ])

    if (totalCount === 0) {
      return { value: 0, target: 1 }
    }

    // 过时率越低越好
    const value = Math.round((outdatedCount / totalCount) * 100 * 10) / 10

    return { value, target: 1 }
  }

  /**
   * 保存指标数据
   */
  private async saveMetrics(metrics: MetricData[]): Promise<MetricData[]> {
    const saved: MetricData[] = []

    for (const metric of metrics) {
      const record = await prisma.qualityMetrics.create({
        data: {
          metricType: metric.metricType,
          value: metric.value,
          target: metric.target,
          department: metric.department,
          calculatedAt: metric.calculatedAt,
        },
      })

      saved.push({
        id: record.id,
        metricType: record.metricType as MetricType,
        value: record.value,
        target: record.target,
        department: record.department,
        calculatedAt: record.calculatedAt,
      })
    }

    return saved
  }

  /**
   * 计算汇总信息
   */
  private calculateSummary(metrics: MetricData[]): QualityMetricsResult['summary'] {
    if (metrics.length === 0) {
      return {
        overallScore: 0,
        metricsCount: 0,
        metricsAboveTarget: 0,
        metricsBelowTarget: 0,
      }
    }

    // 计算各项指标的达标情况
    let aboveTarget = 0
    let belowTarget = 0
    let totalScore = 0

    for (const metric of metrics) {
      // 过时率是反向指标（越低越好）
      if (metric.metricType === 'outdated_rate') {
        if (metric.value <= metric.target) {
          aboveTarget++
        } else {
          belowTarget++
        }
        // 过时率的分数 = (目标/实际) * 100
        totalScore += Math.min(100, (metric.target / Math.max(metric.value, 0.1)) * 100)
      } else {
        if (metric.value >= metric.target) {
          aboveTarget++
        } else {
          belowTarget++
        }
        // 其他指标的分数 = (实际/目标) * 100
        totalScore += Math.min(100, (metric.value / metric.target) * 100)
      }
    }

    return {
      overallScore: Math.round(totalScore / metrics.length),
      metricsCount: metrics.length,
      metricsAboveTarget: aboveTarget,
      metricsBelowTarget: belowTarget,
    }
  }
}

// ==================== 单例导出 ====================

let _qualityMetricsService: QualityMetricsService | null = null

export function getQualityMetricsService(): QualityMetricsService {
  if (!_qualityMetricsService) {
    _qualityMetricsService = new QualityMetricsService()
  }
  return _qualityMetricsService
}

/**
 * 快速计算质量指标（用于 API 调用）
 */
export async function calculateQualityMetrics(): Promise<QualityMetricsResult> {
  const service = getQualityMetricsService()
  return service.calculateMetrics()
}

/**
 * 快速获取质量指标（用于 API 调用）
 */
export async function getQualityMetrics(): Promise<QualityMetricsResult> {
  const service = getQualityMetricsService()
  return service.getLatestMetrics()
}
