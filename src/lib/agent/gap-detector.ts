/**
 * 知识缺口检测服务
 *
 * 基于问答记录自动识别高频未覆盖问题
 * 生成知识缺口报告和改进建议
 */
import { prisma } from '../prisma'
import logger from '../logger'

// ==================== 类型定义 ====================

export interface GapAnalysisResult {
  /** 检测时间 */
  detectedAt: Date
  /** 分析时间范围 */
  timeRange: {
    start: Date
    end: Date
  }
  /** 发现的缺口数量 */
  gapCount: number
  /** 生成的缺口记录 */
  gaps: GapItem[]
  /** 统计信息 */
  stats: {
    totalQueries: number
    coveredQueries: number
    uncoveredQueries: number
    coverageRate: number
  }
}

export interface GapItem {
  /** 问题关键词 */
  question: string
  /** 相关主题 */
  topic: string
  /** 被问次数 */
  frequency: number
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 建议操作 */
  suggestedAction: 'create_card' | 'update_card' | 'rewrite_card'
  /** 相关查询 ID */
  queryIds: string[]
}

// ==================== 缺口检测服务 ====================

export class GapDetector {
  /**
   * 检测知识缺口
   */
  async detectGaps(options: {
    days?: number
    minFrequency?: number
  } = {}): Promise<GapAnalysisResult> {
    const { days = 7, minFrequency = 3 } = options

    logger.info('Starting gap detection', { days, minFrequency })

    // 1. 计算时间范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 2. 获取时间范围内的经验查询
    const queries = await prisma.experienceQuery.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        question: true,
        retrievedCards: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    logger.info('Fetched queries for analysis', { count: queries.length })

    // 3. 分析问题覆盖率
    const uncoveredQueries = queries.filter((q) => {
      try {
        const cards = JSON.parse(q.retrievedCards || '[]')
        return cards.length === 0
      } catch {
        return true
      }
    })

    // 4. 聚类相似问题
    const questionClusters = this.clusterQuestions(uncoveredQueries)

    // 5. 筛选高频问题
    const highFrequencyGaps = questionClusters
      .filter((cluster) => cluster.frequency >= minFrequency)
      .map((cluster) => this.createGapItem(cluster))

    // 6. 排序并限制数量
    const sortedGaps = highFrequencyGaps
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)

    // 7. 保存缺口记录
    await this.saveGaps(sortedGaps)

    const result: GapAnalysisResult = {
      detectedAt: new Date(),
      timeRange: { start: startDate, end: endDate },
      gapCount: sortedGaps.length,
      gaps: sortedGaps,
      stats: {
        totalQueries: queries.length,
        coveredQueries: queries.length - uncoveredQueries.length,
        uncoveredQueries: uncoveredQueries.length,
        coverageRate:
          queries.length > 0
            ? ((queries.length - uncoveredQueries.length) / queries.length) * 100
            : 100,
      },
    }

    logger.info('Gap detection completed', {
      gapCount: result.gapCount,
      coverageRate: result.stats.coverageRate,
    })

    return result
  }

  /**
   * 问题聚类（基于关键词相似度）
   */
  private clusterQuestions(queries: Array<{ id: string; question: string }>): Array<{
    representative: string
    frequency: number
    queryIds: string[]
  }> {
    const clusters: Map<string, { representative: string; frequency: number; queryIds: string[] }> =
      new Map()

    for (const query of queries) {
      const keywords = this.extractKeywords(query.question)
      const key = this.getClusterKey(keywords)

      if (clusters.has(key)) {
        const cluster = clusters.get(key)!
        cluster.frequency++
        cluster.queryIds.push(query.id)
      } else {
        clusters.set(key, {
          representative: query.question,
          frequency: 1,
          queryIds: [query.id],
        })
      }
    }

    return Array.from(clusters.values())
  }

  /**
   * 提取关键词
   */
  private extractKeywords(question: string): string[] {
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
      '都', '一', '上', '也', '很', '到', '说', '要', '去', '你',
      '会', '着', '没有', '看', '好', '自己', '这', '他', '她',
      '什么', '怎么', '如何', '可以', '能', '吗', '呢', '吧',
      '啊', '么', '请问', '想', '问', '做', '还是', '需要',
    ])

    const domainKeywords: Record<string, string[]> = {
      '餐饮': ['餐饮', '餐厅', '饭店', '食堂', '外卖'],
      '零售': ['零售', '商店', '店铺', '商品'],
      '代账': ['代账', '记账', '做账', '报税'],
      '税务': ['税', '税务', '发票', '纳税'],
      '资料': ['材料', '资料', '证件', '执照'],
    }

    const keywords: string[] = []

    // 检查领域关键词
    for (const [, kws] of Object.entries(domainKeywords)) {
      for (const kw of kws) {
        if (question.includes(kw)) {
          keywords.push(kw)
        }
      }
    }

    // 提取有意义的词
    const segments = question.split(/[\s,，.。!！?？、；;：:（）()\[\]【】""''《》\-]+/)
    for (const seg of segments) {
      if (seg.length >= 2 && !stopWords.has(seg) && !keywords.includes(seg)) {
        keywords.push(seg)
      }
    }

    return keywords.length > 0 ? keywords : [question]
  }

  /**
   * 生成聚类键
   */
  private getClusterKey(keywords: string[]): string {
    return keywords.sort().join('|')
  }

  /**
   * 创建缺口条目
   */
  private createGapItem(cluster: {
    representative: string
    frequency: number
    queryIds: string[]
  }): GapItem {
    // 从代表性问题中提取主题
    const topic = this.extractTopic(cluster.representative)

    // 确定优先级
    const priority = this.determinePriority(cluster.frequency)

    // 确定建议操作
    const suggestedAction = this.determineAction(cluster.representative)

    return {
      question: cluster.representative,
      topic,
      frequency: cluster.frequency,
      priority,
      suggestedAction,
      queryIds: cluster.queryIds,
    }
  }

  /**
   * 提取主题
   */
  private extractTopic(question: string): string {
    const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
      { pattern: /代账|记账|做账|账务/, topic: '代账服务' },
      { pattern: /税务|税|发票|纳税|申报/, topic: '税务相关' },
      { pattern: /资料|材料|清单|证件/, topic: '资料清单' },
      { pattern: /风险|合规|罚款/, topic: '风险合规' },
      { pattern: /政策|优惠|减免/, topic: '政策解读' },
      { pattern: /销售|报价|成交/, topic: '销售技巧' },
      { pattern: /客户|服务|沟通/, topic: '客户服务' },
    ]

    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(question)) {
        return topic
      }
    }

    return '其他'
  }

  /**
   * 确定优先级
   */
  private determinePriority(frequency: number): 'high' | 'medium' | 'low' {
    if (frequency >= 10) return 'high'
    if (frequency >= 5) return 'medium'
    return 'low'
  }

  /**
   * 确定建议操作
   */
  private determineAction(question: string): 'create_card' | 'update_card' | 'rewrite_card' {
    // 简单的规则：如果问题包含"更新"或"修改"，建议更新
    if (/更新|修改|变更/.test(question)) {
      return 'update_card'
    }
    // 如果问题包含"重写"或"重新"，建议重写
    if (/重写|重新|新版本/.test(question)) {
      return 'rewrite_card'
    }
    // 默认创建新卡
    return 'create_card'
  }

  /**
   * 保存缺口记录，并为高优先级缺口自动创建 Agent 任务
   */
  private async saveGaps(gaps: GapItem[]): Promise<void> {
    for (const gap of gaps) {
      // 检查是否已存在相似的缺口
      const existing = await prisma.knowledgeGap.findFirst({
        where: {
          question: { contains: gap.question.substring(0, 20) },
          status: { in: ['pending', 'in_progress'] },
        },
      })

      let gapRecord
      if (existing) {
        // 更新现有缺口的频率
        gapRecord = await prisma.knowledgeGap.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + gap.frequency,
            priority: gap.priority,
          },
        })
      } else {
        // 创建新的缺口记录
        gapRecord = await prisma.knowledgeGap.create({
          data: {
            question: gap.question,
            topic: gap.topic,
            frequency: gap.frequency,
            priority: gap.priority,
            status: 'pending',
            suggestedAction: gap.suggestedAction,
          },
        })
      }

      // 高优先级缺口自动创建 Agent 任务（gap_fill）
      if (gap.priority === 'high' && gapRecord) {
        // 检查是否已有未完成的 gap_fill 任务关联此缺口
        const existingTask = await prisma.agentTask.findFirst({
          where: {
            type: 'gap_fill',
            status: { in: ['pending', 'in_progress'] },
            description: { contains: gapRecord.id },
          },
        })

        if (!existingTask) {
          await prisma.agentTask.create({
            data: {
              type: 'gap_fill',
              title: `知识缺口补充「${gap.question.substring(0, 30)}」`,
              description: `gap_id: ${gapRecord.id} | question: ${gap.question} | topic: ${gap.topic || '未分类'} | frequency: ${gap.frequency}`,
              priority: 'high',
              status: 'pending',
              createdBy: 'system',
            },
          })

          logger.info('Auto-created gap_fill task', {
            gapId: gapRecord.id,
            question: gap.question.substring(0, 50),
          })
        }
      }
    }
  }
}

// ==================== 单例导出 ====================

let _gapDetector: GapDetector | null = null

export function getGapDetector(): GapDetector {
  if (!_gapDetector) {
    _gapDetector = new GapDetector()
  }
  return _gapDetector
}

/**
 * 快速检测知识缺口（用于 API 调用）
 */
export async function detectKnowledgeGaps(options?: {
  days?: number
  minFrequency?: number
}): Promise<GapAnalysisResult> {
  const detector = getGapDetector()
  return detector.detectGaps(options)
}
