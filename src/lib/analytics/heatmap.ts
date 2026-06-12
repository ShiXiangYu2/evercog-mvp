/**
 * 问答热力图统计服务
 *
 * 按部门、主题维度统计问答频率
 * 支持时间范围查询和实时计算
 */
import { prisma } from '../prisma'
import logger from '../logger'

// ==================== 类型定义 ====================

export type TimeRange = 'today' | 'this_week' | 'this_month'

export interface HeatmapDataPoint {
  /** 部门 */
  department: string
  /** 主题 */
  topic: string
  /** 问答次数 */
  frequency: number
  /** 时间范围 */
  timeRange: TimeRange
  /** 计算时间 */
  calculatedAt: Date
}

export interface HeatmapResult {
  /** 热力图数据 */
  data: HeatmapDataPoint[]
  /** 统计信息 */
  stats: {
    totalQuestions: number
    departmentCount: number
    topicCount: number
    topDepartment: { name: string; count: number } | null
    topTopic: { name: string; count: number } | null
  }
  /** 计算时间 */
  calculatedAt: Date
}

// ==================== 主题提取规则 ====================

const TOPIC_PATTERNS: Array<{ pattern: RegExp; topic: string }> = [
  // 业务类型
  { pattern: /代账|记账|做账|账务|会计/, topic: '代账服务' },
  { pattern: /税务|税|发票|纳税|申报|增值税|所得税/, topic: '税务相关' },
  { pattern: /工商|注册|变更|注销|年检/, topic: '工商服务' },

  // 行业类型
  { pattern: /餐饮|餐厅|饭店|食堂|外卖/, topic: '餐饮行业' },
  { pattern: /零售|商店|店铺|商品|库存/, topic: '零售行业' },
  { pattern: /门店|连锁|加盟/, topic: '门店服务' },

  // 问题类型
  { pattern: /资料|材料|清单|证件|执照/, topic: '资料清单' },
  { pattern: /风险|合规|罚款|违规/, topic: '风险合规' },
  { pattern: /政策|优惠|减免|补贴/, topic: '政策解读' },
  { pattern: /价格|报价|费用|收费/, topic: '价格咨询' },
  { pattern: /流程|步骤|如何|怎么/, topic: '流程咨询' },
  { pattern: /客户|服务|沟通|投诉/, topic: '客户服务' },
  { pattern: /销售|成交|签单|推销/, topic: '销售技巧' },

  // 其他
  { pattern: /新人|入职|培训|学习/, topic: '新人培训' },
  { pattern: /系统|工具|软件|操作/, topic: '系统使用' },
]

// ==================== 热力图服务 ====================

export class HeatmapService {
  /**
   * 计算热力图数据
   */
  async calculateHeatmap(timeRange: TimeRange = 'this_week'): Promise<HeatmapResult> {
    logger.info('Calculating heatmap', { timeRange })

    // 1. 计算时间范围
    const { start, end } = this.getTimeRange(timeRange)

    // 2. 查询时间范围内的经验查询
    const queries = await prisma.experienceQuery.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        question: true,
        callerId: true,
        createdAt: true,
      },
    })

    logger.info('Fetched queries for heatmap', { count: queries.length })

    // 3. 获取调用者部门信息
    const callerIds = [...new Set(queries.map((q) => q.callerId))]
    const callers = await prisma.user.findMany({
      where: { id: { in: callerIds } },
      select: {
        id: true,
        department: { select: { name: true } },
      },
    })

    const callerDepartmentMap = new Map(
      callers.map((c) => [c.id, c.department.name])
    )

    // 4. 分析每个查询
    const heatmapData: Map<string, HeatmapDataPoint> = new Map()

    for (const query of queries) {
      const department = callerDepartmentMap.get(query.callerId) || '未知部门'
      const topic = this.extractTopic(query.question)

      const key = `${department}|${topic}|${timeRange}`

      if (heatmapData.has(key)) {
        const point = heatmapData.get(key)!
        point.frequency++
      } else {
        heatmapData.set(key, {
          department,
          topic,
          frequency: 1,
          timeRange,
          calculatedAt: new Date(),
        })
      }
    }

    const data = Array.from(heatmapData.values())

    // 5. 计算统计信息
    const stats = this.calculateStats(data, queries.length)

    // 6. 保存热力图数据
    await this.saveHeatmapData(data)

    const result: HeatmapResult = {
      data,
      stats,
      calculatedAt: new Date(),
    }

    logger.info('Heatmap calculation completed', {
      dataPoints: data.length,
      totalQuestions: stats.totalQuestions,
    })

    return result
  }

  /**
   * 获取热力图数据（从数据库）
   */
  async getHeatmapData(timeRange: TimeRange = 'this_week'): Promise<HeatmapResult> {
    const data = await prisma.questionHeatMap.findMany({
      where: { timeRange },
      orderBy: { frequency: 'desc' },
    })

    const stats = this.calculateStats(
      data.map((d) => ({
        department: d.department,
        topic: d.topic,
        frequency: d.frequency,
      })),
      data.reduce((sum, d) => sum + d.frequency, 0)
    )

    return {
      data: data.map((d) => ({
        department: d.department,
        topic: d.topic,
        frequency: d.frequency,
        timeRange: d.timeRange as TimeRange,
        calculatedAt: d.calculatedAt,
      })),
      stats,
      calculatedAt: new Date(),
    }
  }

  /**
   * 计算时间范围
   */
  private getTimeRange(timeRange: TimeRange): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'this_week':
        start.setDate(start.getDate() - 7)
        break
      case 'this_month':
        start.setMonth(start.getMonth() - 1)
        break
    }

    return { start, end }
  }

  /**
   * 提取主题
   */
  private extractTopic(question: string): string {
    for (const { pattern, topic } of TOPIC_PATTERNS) {
      if (pattern.test(question)) {
        return topic
      }
    }
    return '其他'
  }

  /**
   * 计算统计信息
   */
  private calculateStats(
    data: Array<{ department: string; topic: string; frequency: number }>,
    totalQuestions: number
  ): HeatmapResult['stats'] {
    // 按部门统计
    const departmentCounts: Map<string, number> = new Map()
    for (const item of data) {
      const count = departmentCounts.get(item.department) || 0
      departmentCounts.set(item.department, count + item.frequency)
    }

    // 按主题统计
    const topicCounts: Map<string, number> = new Map()
    for (const item of data) {
      const count = topicCounts.get(item.topic) || 0
      topicCounts.set(item.topic, count + item.frequency)
    }

    // 找出最高频的部门和主题
    let topDepartment: { name: string; count: number } | null = null
    let topTopic: { name: string; count: number } | null = null

    for (const [name, count] of departmentCounts) {
      if (!topDepartment || count > topDepartment.count) {
        topDepartment = { name, count }
      }
    }

    for (const [name, count] of topicCounts) {
      if (!topTopic || count > topTopic.count) {
        topTopic = { name, count }
      }
    }

    return {
      totalQuestions,
      departmentCount: departmentCounts.size,
      topicCount: topicCounts.size,
      topDepartment,
      topTopic,
    }
  }

  /**
   * 保存热力图数据
   */
  private async saveHeatmapData(data: HeatmapDataPoint[]): Promise<void> {
    for (const point of data) {
      // 查找现有记录
      const existing = await prisma.questionHeatMap.findFirst({
        where: {
          department: point.department,
          topic: point.topic,
          timeRange: point.timeRange,
        },
      })

      if (existing) {
        // 更新现有记录
        await prisma.questionHeatMap.update({
          where: { id: existing.id },
          data: {
            frequency: point.frequency,
            calculatedAt: point.calculatedAt,
          },
        })
      } else {
        // 创建新记录
        await prisma.questionHeatMap.create({
          data: {
            department: point.department,
            topic: point.topic,
            frequency: point.frequency,
            timeRange: point.timeRange,
            calculatedAt: point.calculatedAt,
          },
        })
      }
    }
  }
}

// ==================== 单例导出 ====================

let _heatmapService: HeatmapService | null = null

export function getHeatmapService(): HeatmapService {
  if (!_heatmapService) {
    _heatmapService = new HeatmapService()
  }
  return _heatmapService
}

/**
 * 快速计算热力图（用于 API 调用）
 */
export async function calculateHeatmap(
  timeRange: TimeRange = 'this_week'
): Promise<HeatmapResult> {
  const service = getHeatmapService()
  return service.calculateHeatmap(timeRange)
}

/**
 * 快速获取热力图数据（用于 API 调用）
 */
export async function getHeatmapData(
  timeRange: TimeRange = 'this_week'
): Promise<HeatmapResult> {
  const service = getHeatmapService()
  return service.getHeatmapData(timeRange)
}
