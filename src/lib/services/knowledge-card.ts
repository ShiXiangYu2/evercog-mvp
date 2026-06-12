/**
 * KnowledgeCard 服务
 *
 * 处理知识卡的 CRUD 操作和状态流转
 */
import { prisma } from '../prisma'
import { createAuditLog } from '../audit'
import { canAccess, canViewKnowledgeCard, type AuthUser } from '../permission-guard'
import { notFound, forbidden, optimisticLock, type ServiceError } from '../service-error'
import logger from '../logger'

// ==================== 类型定义 ====================

export type KnowledgeCardStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
export type VisibilityScope = 'department' | 'role' | 'public'

export interface ListFilters {
  search?: string
  category?: string
  status?: string
  customerType?: string
  tags?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

// ==================== 状态流转规则 ====================

const VALID_TRANSITIONS: Record<KnowledgeCardStatus, KnowledgeCardStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['published', 'rejected'],
  published: ['archived'],
  rejected: ['draft'],
  archived: [],
}

// ==================== KnowledgeCardService ====================

export class KnowledgeCardService {
  /**
   * 列表查询
   */
  async list(filters: ListFilters, user: AuthUser): Promise<PaginatedResult<KnowledgeCardWithRelations>> {
    const { search, category, status, customerType, tags, page = 1, pageSize = 20 } = filters

    const where: Record<string, unknown> = {}

    // 搜索条件
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    if (category) where.category = category
    if (status) where.status = status
    if (customerType) where.customerType = customerType
    if (tags) where.tags = { contains: tags }

    // 查询所有符合条件的卡片
    let allCards = await prisma.knowledgeCard.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 按权限过滤
    allCards = allCards.filter((card) =>
      canViewKnowledgeCard(user, {
        status: card.status,
        creatorId: card.creatorId,
        reviewerId: card.reviewerId,
        visibilityScope: card.visibilityScope,
        departmentId: card.departmentId,
      })
    )

    const total = allCards.length
    const items = allCards.slice((page - 1) * pageSize, page * pageSize)

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * 获取单个知识卡
   */
  async getById(id: string, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    const card = await prisma.knowledgeCard.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    if (!card) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查查看权限
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

  /**
   * 创建知识卡
   */
  async create(data: CreateKnowledgeCardInput, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    const card = await prisma.knowledgeCard.create({
      data: {
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
      },
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'knowledge_card',
      entityId: card.id,
      details: { title: card.title },
    })

    logger.info('Knowledge card created', { cardId: card.id, userId: user.id })

    return card
  }

  /**
   * 更新知识卡
   */
  async update(
    id: string,
    data: UpdateKnowledgeCardInput,
    user: AuthUser,
    expectedVersion?: number
  ): Promise<KnowledgeCardWithRelations> {
    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查编辑权限
    if (!canAccess(user, 'knowledge_card', 'write', { ownerId: existing.creatorId })) {
      throw forbidden('无权编辑此知识卡', { cardId: id })
    }

    // 乐观锁检查
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw optimisticLock()
    }

    // 构建更新数据
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

    const card = await prisma.knowledgeCard.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title },
    })

    logger.info('Knowledge card updated', { cardId: id, userId: user.id })

    return card
  }

  /**
   * 删除知识卡
   */
  async delete(id: string, user: AuthUser): Promise<void> {
    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查删除权限
    if (!canAccess(user, 'knowledge_card', 'delete')) {
      throw forbidden('无权删除此知识卡', { cardId: id })
    }

    await prisma.knowledgeCard.delete({ where: { id } })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: existing.title, action: 'delete' },
    })

    logger.info('Knowledge card deleted', { cardId: id, userId: user.id })
  }

  /**
   * 提交审核
   */
  async submitForReview(id: string, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查编辑权限
    if (!canAccess(user, 'knowledge_card', 'write', { ownerId: existing.creatorId })) {
      throw forbidden('无权提交此知识卡', { cardId: id })
    }

    // 检查状态流转：只有 draft 状态可以提交审核
    if (existing.status !== 'draft') {
      throw notFound('当前状态不允许提交审核', { cardId: id, status: existing.status })
    }

    const card = await prisma.knowledgeCard.update({
      where: { id },
      data: { status: 'pending_review' },
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'submit',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title, fromStatus: existing.status, toStatus: 'pending_review' },
    })

    logger.info('Knowledge card submitted for review', { cardId: id, userId: user.id })

    return card
  }

  /**
   * 审核通过
   */
  async approve(id: string, user: AuthUser, comment?: string): Promise<KnowledgeCardWithRelations> {
    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查审核权限
    if (!canAccess(user, 'knowledge_card', 'review')) {
      throw forbidden('无权审核此知识卡', { cardId: id })
    }

    // 检查状态流转：只有 pending_review 状态可以审核通过
    if (existing.status !== 'pending_review') {
      throw notFound('当前状态不允许审核通过', { cardId: id, status: existing.status })
    }

    const card = await prisma.knowledgeCard.update({
      where: { id },
      data: {
        status: 'published',
        reviewerId: user.id,
        reviewedAt: new Date(),
        version: existing.version + 1,
      },
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'approve',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title, comment },
    })

    logger.info('Knowledge card approved', { cardId: id, userId: user.id })

    return card
  }

  /**
   * 审核驳回
   */
  async reject(id: string, user: AuthUser, comment: string): Promise<KnowledgeCardWithRelations> {
    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查审核权限
    if (!canAccess(user, 'knowledge_card', 'review')) {
      throw forbidden('无权审核此知识卡', { cardId: id })
    }

    // 检查状态流转：只有 pending_review 状态可以驳回
    if (existing.status !== 'pending_review') {
      throw notFound('当前状态不允许驳回', { cardId: id, status: existing.status })
    }

    const card = await prisma.knowledgeCard.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewerId: user.id,
        reviewedAt: new Date(),
      },
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'reject',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title, comment },
    })

    logger.info('Knowledge card rejected', { cardId: id, userId: user.id, comment })

    return card
  }

  /**
   * 归档
   */
  async archive(id: string, user: AuthUser): Promise<KnowledgeCardWithRelations> {
    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('知识卡不存在', { cardId: id })
    }

    // 检查编辑权限
    if (!canAccess(user, 'knowledge_card', 'write', { ownerId: existing.creatorId })) {
      throw forbidden('无权归档此知识卡', { cardId: id })
    }

    // 检查状态流转：只有 published 状态可以归档
    if (existing.status !== 'published') {
      throw notFound('当前状态不允许归档', { cardId: id, status: existing.status })
    }

    const card = await prisma.knowledgeCard.update({
      where: { id },
      data: { status: 'archived' },
      include: {
        creator: { select: { id: true, name: true, role: true, departmentId: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title, action: 'archive' },
    })

    logger.info('Knowledge card archived', { cardId: id, userId: user.id })

    return card
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
