/**
 * System State Analyzer 绯荤粺鐘舵€佹劅鐭ュ櫒
 *
 * 浠庢暟鎹簱鑱氬悎绯荤粺鎸囨爣锛屼负鍐崇瓥寮曟搸鎻愪緵涓婁笅鏂? */
import { prisma } from '../../../prisma'
import { getEventBus } from '../../../scheduler/event-bus'
import type { SystemHealthMetrics, DecisionContext } from '../types'

export class SystemStateAnalyzer {
  /**
   * 鑾峰彇绯荤粺鍋ュ悍搴︽寚鏍?   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 骞惰鏌ヨ鍚勯」鎸囨爣
    const [
      pendingTaskCount,
      failedTaskCount24h,
      knowledgeGapCount,
      unresolvedFeedbackCount,
      avgQualityResult,
      coverageResult,
      lastLoopExecution,
    ] = await Promise.all([
      // 寰呭鐞嗕换鍔℃暟
      prisma.agentTask.count({
        where: { status: 'pending' },
      }),
      prisma.agentTask.count({
        where: {
          status: 'failed',
          updatedAt: { gte: oneDayAgo },
        },
      }),
      prisma.knowledgeGap.count({
        where: { status: 'pending' },
      }),
      prisma.feedback.count({
        where: {
          helpful: false,
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.knowledgeCardStats.aggregate({
        _avg: { avgRating: true },
        where: { ratingCount: { gt: 0 } },
      }),
      this.calculateCoverageRate(),
      // 鏈€杩戠殑 Loop 鎵ц鏃堕棿
      prisma.loopExecution.findFirst({
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
      }),
    ])

    return {
      pendingTaskCount,
      failedTaskCount24h,
      knowledgeGapCount,
      unresolvedFeedbackCount,
      averageCardQualityScore: avgQualityResult._avg.avgRating || 0,
      knowledgeCoverageRate: coverageResult,
      lastLoopExecutionTime: lastLoopExecution?.startedAt || null,
    }
  }

  /**
   * 鑾峰彇瀹屾暣鍐崇瓥涓婁笅鏂?   */
  async getDecisionContext(): Promise<DecisionContext> {
    const now = new Date()

    const systemHealth = await this.getSystemHealth()

    const pendingTasks = await prisma.agentTask.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        type: true,
        priority: true,
        createdAt: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    })

    const eventBus = getEventBus()
    const recentEvents = eventBus.getRecentEvents({ limit: 10 }).map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
    }))

    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    const isWorkHour = hour >= 9 && hour <= 18 && dayOfWeek >= 1 && dayOfWeek <= 5

    return {
      systemHealth,
      pendingTasks,
      recentEvents,
      timeContext: { hour, dayOfWeek, isWorkHour },
    }
  }

  /**
   * 璁＄畻鐭ヨ瘑瑕嗙洊鐜?   */
  private async calculateCoverageRate(): Promise<number> {
    // 鑾峰彇鏈€杩?澶╃殑闂鎬绘暟
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const totalQueries = await prisma.experienceQuery.count({
      where: { createdAt: { gte: oneWeekAgo } },
    })

    if (totalQueries === 0) return 100


    // 绠€鍖栬绠楋細妫€鏌?retrievedCards 鏄惁涓虹┖鏁扮粍
    const allQueries = await prisma.experienceQuery.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      select: { retrievedCards: true },
    })

    let coveredCount = 0
    for (const query of allQueries) {
      try {
        const cards = JSON.parse(query.retrievedCards || '[]')
        if (Array.isArray(cards) && cards.length > 0) {
          coveredCount++
        }
      } catch {
        // 瑙ｆ瀽澶辫触瑙嗕负鏈鐩?      }
      }
    }

    return (coveredCount / totalQueries) * 100
  }
}

// 鍗曚緥瀵煎嚭
let _analyzer: SystemStateAnalyzer | null = null

export function getSystemStateAnalyzer(): SystemStateAnalyzer {
  if (!_analyzer) {
    _analyzer = new SystemStateAnalyzer()
  }
  return _analyzer
}
