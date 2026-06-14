/**
 * KnowledgeCard 服务
 *
 * 基于 BaseEntityService 的知识卡 CRUD 和状态流转
 * 子类只定义实体特定逻辑：配置、搜索、创建/更新数据构建
 */
import { BaseEntityService } from './base-service'
import { canViewKnowledgeCard } from '../permission-guard'
import { prisma } from '../prisma'
import { forbidden } from './base-types'
import type { AuthUser, EntityConfig, ListFilters, PaginatedResult } from './base-types'

// ==================== 类型定义 ====================

export type KnowledgeCardStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
export type VisibilityScope = 'department' | 'role' | 'public'

export interface KnowledgeCardListFilters extends ListFilters {
  category?: string
  status?: string
  customerType?: string
  tags?: string
}

export interface CreateKnowledgeCardInput {
  title: string
  category: string
  tags?: string
  content: string
  departmentId?: string
  customerType?: string
  source?: string
  riskNotes?: string
  visibilityScope?: VisibilityScope
}

export interface UpdateKnowledgeCardInput {
  title?: string
  category?: string
  tags?: string
  content?: string
  departmentId?: string
  customerType?: string
  source?: string
  riskNotes?: string
  visibilityScope?: VisibilityScope
}

export interface KnowledgeCardWithRelations {
  id: string
  title: string
  category: string
  tags: string | null
  content: string
  departmentId: string | null
  customerType: string | null
  source: string | null
  riskNotes: string | null
  visibilityScope: string
  status: string
  version: number
  creatorId: string
  reviewerId: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
  creator?: { id: string; name: string; role: string; departmentId?: string } | null
  reviewer?: { id: string; name: string } | null
}

// ==================== 实体配置 ====================

const KNOWLEDGE_CARD_CONFIG: EntityConfig = {
  entityType: 'knowledge_card',
  entityLabel: '知识卡',
  statusField: 'status',
  ownerField: 'creatorId',
  searchFields: ['title', 'content'],
  transitions: {
    draft: ['pending_review'],
    pending_review: ['published', 'rejected'],
    published: ['archived'],
    rejected: ['draft'],
    archived: [],
  },
  statusLabels: {
    draft: '草稿',
    pending_review: '待审核',
    published: '已发布',
    rejected: '已驳回',
    archived: '已归档',
  },
}

// ==================== KnowledgeCardService ====================

export class KnowledgeCardService extends BaseEntityService<
  KnowledgeCardWithRelations,
  CreateKnowledgeCardInput,
  UpdateKnowledgeCardInput
> {
  constructor() {
    super(KNOWLEDGE_CARD_CONFIG)
  }

  // ==================== 实现抽象方法 ====================

  protected get model() {
    return prisma.knowledgeCard
  }

  protected get include() {
    return {
      creator: { select: { id: true, name: true, role: true, departmentId: true } },
      reviewer: { select: { id: true, name: true } },
    }
  }

  protected toResponse(record: any): KnowledgeCardWithRelations {
    return record
  }

  protected buildCreateData(data: CreateKnowledgeCardInput, user: AuthUser): Record<string, unknown> {
    return {
      title: data.title,
      category: data.category,
      tags: data.tags || null,
      content: data.content,
      departmentId: data.departmentId || user.departmentId,
      customerType: data.customerType || null,
      source: data.source || null,
      riskNotes: data.riskNotes || null,
      visibilityScope: data.visibilityScope || 'department',
      status: 'draft',
      version: 1,
      creatorId: user.id,
    }
  }

  protected buildUpdateData(data: UpdateKnowledgeCardInput): Record<string, unknown> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.category !== undefined) updateData.category = data.category
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.content !== undefined) updateData.content = data.content
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null
    if (data.customerType !== undefined) updateData.customerType = data.customerType || null
    if (data.source !== undefined) updateData.source = data.source || null
    if (data.riskNotes !== undefined) updateData.riskNotes = data.riskNotes || null
    if (data.visibilityScope !== undefined) updateData.visibilityScope = data.visibilityScope
    return updateData
  }

  // ==================== 覆盖列表查询（权限过滤） ====================

  async list(filters: KnowledgeCardListFilters, user: AuthUser): Promise<PaginatedResult<KnowledgeCardWithRelations>> {
    const { search, page = 1, pageSize = 20, ...rest } = filters

    // 构建查询条件
    const where: Record<string, unknown> = {}
    if (search) {
      Object.assign(where, this.buildSearchCondition(search))
    }
    this.applyFilters(where, rest)

    // 先查询匹配的卡片（带上限，用于权限过滤后再分页）
    const MAX_RECORDS = 1000
    const allCards = await prisma.knowledgeCard.findMany({
      where,
      include: this.include,
      orderBy: { createdAt: 'desc' },
      take: MAX_RECORDS,
    })

    // 按权限过滤
    const filteredCards = allCards.filter((card: any) =>
      canViewKnowledgeCard(user, {
        status: card.status,
        creatorId: card.creatorId,
        reviewerId: card.reviewerId,
        visibilityScope: card.visibilityScope,
        departmentId: card.departmentId,
      })
    )

    // 再分页
    const total = filteredCards.length
    const items = filteredCards.slice((page - 1) * pageSize, page * pageSize)

    return {
      items: items.map((item: any) => this.toResponse(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // ==================== 覆盖 getById（权限检查） ====================

  async getById(id: string, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    const card = await super.getById(id, user)

    // 知识卡特有：非 published 状态需要额外权限检查
    const canView = canViewKnowledgeCard(user, {
      status: card.status,
      creatorId: card.creatorId,
      reviewerId: card.reviewerId,
      visibilityScope: card.visibilityScope,
      departmentId: card.departmentId,
    })

    if (!canView) {
      throw forbidden('无权查看此知识卡', { cardId: id })
    }

    return card
  }

  // ==================== 便捷方法（保持向后兼容） ====================

  async submitForReview(id: string, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    return this.transition(id, 'pending_review', user)
  }

  async approve(id: string, user: AuthUser, comment?: string): Promise<KnowledgeCardWithRelations> {
    return this.transition(id, 'published', user, { comment, incrementVersion: true })
  }

  async reject(id: string, user: AuthUser, comment: string): Promise<KnowledgeCardWithRelations> {
    return this.transition(id, 'rejected', user, { comment })
  }

  async archive(id: string, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    return this.transition(id, 'archived', user)
  }
}

// ==================== 单例导出 ====================

let _knowledgeCardService: KnowledgeCardService | null = null

export function getKnowledgeCardService(): KnowledgeCardService {
  if (!_knowledgeCardService) {
    _knowledgeCardService = new KnowledgeCardService()
  }
  return _knowledgeCardService
}
