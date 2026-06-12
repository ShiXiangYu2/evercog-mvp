/**
 * 热度分析服务
 *
 * 统计知识卡访问量、引用量、评分等热度指标
 */
import { prisma } from '../prisma'
import logger from '../logger'

// ==================== 类型定义 ====================

export interface PopularityItem {
  cardId: string
  title: string
  category: string
  department: string | null
  viewCount: number
  citeCount: number
  avgRating: number
  ratingCount: number
  popularityScore: number
}

export interface DepartmentComparison {
  department: string
  totalCards: number
  publishedCards: number
  totalViews: number
  totalCites: number
  averageRating: number
}

export interface PopularityResult {
  topByViews: PopularityItem[]
  topByCites: PopularityItem[]
  topByRating: PopularityItem[]
  departmentComparison: DepartmentComparison[]
  summary: {
    totalViews: number
    totalCites: number
    averageRating: number | null
    activeDepartments: number
  }
}

// ==================== 热度分析服务 ====================

export class PopularityService {
  /**
   * 获取热度排名
   */
  async getPopularity(): Promise<PopularityResult> {
    logger.info('Calculating popularity')

    // 获取所有知识卡统计
    const stats = await prisma.knowledgeCardStats.findMany({
      include: {
        card: {
          select: {
            id: true,
            title: true,
            category: true,
            departmentId: true,
          },
        },
      },
    })

    // 获取部门信息
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    })
    const deptMap = new Map(departments.map((d) => [d.id, d.name]))

    // 计算热度分数
    const items: PopularityItem[] = stats.map((stat) => {
      const popularityScore = this.calculatePopularityScore(
        stat.viewCount,
        stat.citeCount,
        stat.avgRating,
        stat.ratingCount
      )

      return {
        cardId: stat.cardId,
        title: stat.card.title,
        category: stat.card.category,
        department: deptMap.get(stat.card.departmentId || '') || null,
        viewCount: stat.viewCount,
        citeCount: stat.citeCount,
        avgRating: stat.avgRating,
        ratingCount: stat.ratingCount,
        popularityScore,
      }
    })

    // 按不同维度排序
    const topByViews = [...items].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10)
    const topByCites = [...items].sort((a, b) => b.citeCount - a.citeCount).slice(0, 10)
    const topByRating = [...items]
      .filter((item) => item.ratingCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10)

    // 获取部门对比
    const departmentComparison = await this.getDepartmentComparison()

    // 计算汇总信息
    const summary = {
      totalViews: items.reduce((sum, item) => sum + item.viewCount, 0),
      totalCites: items.reduce((sum, item) => sum + item.citeCount, 0),
      averageRating: this.calculateOverallAverageRating(items),
      activeDepartments: departmentComparison.length,
    }

    return {
      topByViews,
      topByCites,
      topByRating,
      departmentComparison,
      summary,
    }
  }

  /**
   * 计算热度分数
   *
   * 公式: views * 1 + cites * 3 + rating * 10
   */
  private calculatePopularityScore(
    views: number,
    cites: number,
    rating: number,
    ratingCount: number
  ): number {
    const ratingScore = ratingCount > 0 ? rating * 10 : 0
    return views * 1 + cites * 3 + ratingScore
  }

  /**
   * 计算整体平均评分
   */
  private calculateOverallAverageRating(items: PopularityItem[]): number | null {
    const itemsWithRating = items.filter((item) => item.ratingCount > 0)
    if (itemsWithRating.length === 0) return null

    const totalRating = itemsWithRating.reduce(
      (sum, item) => sum + item.avgRating * item.ratingCount,
      0
    )
    const totalRatings = itemsWithRating.reduce(
      (sum, item) => sum + item.ratingCount,
      0
    )

    return totalRatings > 0 ? totalRating / totalRatings : null
  }

  /**
   * 获取部门对比
   */
  private async getDepartmentComparison(): Promise<DepartmentComparison[]> {
    // 获取所有部门
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    })

    const comparisons: DepartmentComparison[] = []

    for (const dept of departments) {
      // 统计该部门的知识卡
      const [totalCards, publishedCards] = await Promise.all([
        prisma.knowledgeCard.count({
          where: { departmentId: dept.id },
        }),
        prisma.knowledgeCard.count({
          where: { departmentId: dept.id, status: 'published' },
        }),
      ])

      // 统计该部门知识卡的访问量和引用量
      const cards = await prisma.knowledgeCard.findMany({
        where: { departmentId: dept.id },
        select: { id: true },
      })

      const cardIds = cards.map((c) => c.id)
      const stats = await prisma.knowledgeCardStats.findMany({
        where: { cardId: { in: cardIds } },
      })

      const totalViews = stats.reduce((sum, s) => sum + s.viewCount, 0)
      const totalCites = stats.reduce((sum, s) => sum + s.citeCount, 0)

      const ratingsWithValues = stats.filter((s) => s.ratingCount > 0)
      const averageRating =
        ratingsWithValues.length > 0
          ? ratingsWithValues.reduce((sum, s) => sum + s.avgRating, 0) /
            ratingsWithValues.length
          : 0

      comparisons.push({
        department: dept.name,
        totalCards,
        publishedCards,
        totalViews,
        totalCites,
        averageRating,
      })
    }

    return comparisons.sort((a, b) => b.totalViews - a.totalViews)
  }

  /**
   * 记录知识卡访问
   */
  async recordView(cardId: string): Promise<void> {
    const existing = await prisma.knowledgeCardStats.findUnique({
      where: { cardId },
    })

    if (existing) {
      await prisma.knowledgeCardStats.update({
        where: { cardId },
        data: {
          viewCount: existing.viewCount + 1,
          lastViewedAt: new Date(),
        },
      })
    } else {
      await prisma.knowledgeCardStats.create({
        data: {
          cardId,
          viewCount: 1,
          lastViewedAt: new Date(),
        },
      })
    }
  }

  /**
   * 记录知识卡引用
   */
  async recordCite(cardId: string): Promise<void> {
    const existing = await prisma.knowledgeCardStats.findUnique({
      where: { cardId },
    })

    if (existing) {
      await prisma.knowledgeCardStats.update({
        where: { cardId },
        data: {
          citeCount: existing.citeCount + 1,
        },
      })
    } else {
      await prisma.knowledgeCardStats.create({
        data: {
          cardId,
          citeCount: 1,
        },
      })
    }
  }
}

// ==================== 单例导出 ====================

let _popularityService: PopularityService | null = null

export function getPopularityService(): PopularityService {
  if (!_popularityService) {
    _popularityService = new PopularityService()
  }
  return _popularityService
}

/**
 * 快速获取热度排名
 */
export async function getPopularity(): Promise<PopularityResult> {
  const service = getPopularityService()
  return service.getPopularity()
}
