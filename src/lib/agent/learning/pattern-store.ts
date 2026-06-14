/**
 * Pattern Store 模式存储
 *
 * 管理学习模式的存储、去重、老化
 */
import { prisma } from '../../prisma'
import type { LearningPattern, PatternType, PatternStatus } from './types'
import logger from '../../logger'

export class PatternStore {
  /**
   * 存储新模式（自动去重）
   */
  async store(pattern: LearningPattern): Promise<string> {
    // 检查是否已存在相似模式
    const existing = await this.findSimilar(pattern)

    if (existing) {
      // 强化现有模式
      await this.reinforce(existing.id)
      logger.info('Pattern reinforced', { patternId: existing.id, frequency: existing.frequency + 1 })
      return existing.id
    }

    // 创建新模式
    const created = await prisma.agentLearningPattern.create({
      data: {
        patternType: pattern.patternType,
        category: pattern.category,
        description: pattern.description,
        frequency: pattern.frequency,
        confidence: pattern.confidence,
        evidence: pattern.evidence ? JSON.stringify(pattern.evidence) : null,
        suggestedAction: pattern.suggestedAction,
        status: pattern.status,
      },
    })

    logger.info('Pattern stored', { patternId: created.id, type: pattern.patternType })
    return created.id
  }

  /**
   * 批量存储模式
   */
  async storeMany(patterns: LearningPattern[]): Promise<string[]> {
    const ids: string[] = []
    for (const pattern of patterns) {
      const id = await this.store(pattern)
      ids.push(id)
    }
    return ids
  }

  /**
   * 强化模式（增加频率和置信度）
   */
  async reinforce(patternId: string): Promise<void> {
    await prisma.agentLearningPattern.update({
      where: { id: patternId },
      data: {
        frequency: { increment: 1 },
        confidence: { increment: 0.05 },
        lastReinforcedAt: new Date(),
      },
    })
  }

  /**
   * 获取活跃模式
   */
  async getActivePatterns(options?: {
    type?: PatternType
    category?: string
    minConfidence?: number
    limit?: number
  }): Promise<LearningPattern[]> {
    const where: {
      status: string
      patternType?: string
      category?: string
      confidence?: { gte: number }
    } = {
      status: 'active',
    }

    if (options?.type) {
      where.patternType = options.type
    }

    if (options?.category) {
      where.category = options.category
    }

    if (options?.minConfidence) {
      where.confidence = { gte: options.minConfidence }
    }

    const patterns = await prisma.agentLearningPattern.findMany({
      where,
      orderBy: [{ confidence: 'desc' }, { frequency: 'desc' }],
      take: options?.limit || 50,
    })

    return patterns.map(this.mapToPattern)
  }

  /**
   * 获取模式统计
   */
  async getStats(): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    averageConfidence: number
  }> {
    const [total, byType, byStatus, avgConfidence] = await Promise.all([
      prisma.agentLearningPattern.count(),
      prisma.agentLearningPattern.groupBy({
        by: ['patternType'],
        _count: true,
      }),
      prisma.agentLearningPattern.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.agentLearningPattern.aggregate({
        _avg: { confidence: true },
      }),
    ])

    return {
      total,
      byType: Object.fromEntries(byType.map((g) => [g.patternType, g._count])),
      byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count])),
      averageConfidence: avgConfidence._avg.confidence || 0,
    }
  }

  /**
   * 废弃模式
   */
  async deprecate(patternId: string, reason?: string): Promise<void> {
    await prisma.agentLearningPattern.update({
      where: { id: patternId },
      data: {
        status: 'deprecated',
        suggestedAction: reason || 'deprecated',
      },
    })
    logger.info('Pattern deprecated', { patternId, reason })
  }

  /**
   * 取代模式
   */
  async supersede(oldPatternId: string, newPatternId: string): Promise<void> {
    await prisma.agentLearningPattern.update({
      where: { id: oldPatternId },
      data: {
        status: 'superseded',
        supersededById: newPatternId,
      },
    })
    logger.info('Pattern superseded', { oldPatternId, newPatternId })
  }

  /**
   * 老化处理（降低长时间未强化的模式的置信度）
   */
  async age(maxAgeDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

    const result = await prisma.agentLearningPattern.updateMany({
      where: {
        status: 'active',
        lastReinforcedAt: { lt: cutoffDate },
        confidence: { gt: 0.1 },
      },
      data: {
        confidence: { decrement: 0.1 },
      },
    })

    logger.info('Patterns aged', { count: result.count, maxAgeDays })
    return result.count
  }

  // ==================== 私有方法 ====================

  /**
   * 查找相似模式
   */
  private async findSimilar(pattern: LearningPattern): Promise<{ id: string; frequency: number } | null> {
    const where: {
      patternType: string
      status: string
      category?: string | null
    } = {
      patternType: pattern.patternType,
      status: 'active',
    }

    if (pattern.category) {
      where.category = pattern.category
    }

    const existing = await prisma.agentLearningPattern.findFirst({
      where,
      orderBy: { confidence: 'desc' },
    })

    if (!existing) return null

    // 简单的相似度判断：描述的前20个字符相同
    const existingDesc = existing.description.substring(0, 20)
    const newDesc = pattern.description.substring(0, 20)

    if (existingDesc === newDesc) {
      return { id: existing.id, frequency: existing.frequency }
    }

    return null
  }

  /**
   * 映射数据库记录到 LearningPattern
   */
  private mapToPattern(record: {
    id: string
    patternType: string
    category: string | null
    description: string
    frequency: number
    confidence: number
    evidence: string | null
    suggestedAction: string | null
    status: string
    learnedAt: Date
    lastReinforcedAt: Date
  }): LearningPattern {
    return {
      id: record.id,
      patternType: record.patternType as PatternType,
      category: record.category || undefined,
      description: record.description,
      frequency: record.frequency,
      confidence: record.confidence,
      evidence: record.evidence ? JSON.parse(record.evidence) : undefined,
      suggestedAction: record.suggestedAction || undefined,
      status: record.status as PatternStatus,
      learnedAt: record.learnedAt,
      lastReinforcedAt: record.lastReinforcedAt,
    }
  }
}

// 单例导出
let _store: PatternStore | null = null

export function getPatternStore(): PatternStore {
  if (!_store) {
    _store = new PatternStore()
  }
  return _store
}
