/**
 * PolicyBrief 服务
 *
 * 处理政策简报的 CRUD 操作和状态流转
 */
import { prisma } from '../prisma'
import { createAuditLog } from '../audit'
import { canAccess, canReview, type AuthUser } from '../permission-guard'
import { notFound, forbidden, type ServiceError } from '../service-error'
import logger from '../logger'

// ==================== 类型定义 ====================

export type BriefReviewStatus = 'draft' | 'pending_review' | 'reviewed' | 'rejected'

export interface ListFilters {
  search?: string
  reviewStatus?: string
  generatorId?: string
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

export interface CreatePolicyBriefInput {
  policyLinkId: string
  title: string
  summary: string
  applicableTo?: string
  keyClauses?: string
  actionSuggestions?: string
  riskReminders?: string
  sourceUrl?: string
}

export interface UpdatePolicyBriefInput {
  title?: string
  summary?: string
  applicableTo?: string
  keyClauses?: string
  actionSuggestions?: string
  riskReminders?: string
}

export interface PolicyBriefWithRelations {
  id: string
  policyLinkId: string
  title: string
  summary: string
  applicableTo: string | null
  keyClauses: string | null
  actionSuggestions: string | null
  riskReminders: string | null
  sourceUrl: string | null
  generatorId: string
  reviewStatus: string
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
  generator?: { id: string; name: string; role: string } | null
  policyLink?: { id: string; url: string; title: string | null; customerType: string | null } | null
}

// ==================== PolicyBriefService ====================

export class PolicyBriefService {
  /**
   * 列表查询
   */
  async list(filters: ListFilters, user: AuthUser): Promise<PaginatedResult<PolicyBriefWithRelations>> {
    const { search, reviewStatus, generatorId, page = 1, pageSize = 20 } = filters

    const where: Record<string, unknown> = {}

    // 搜索条件
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ]
    }

    if (reviewStatus) where.reviewStatus = reviewStatus
    if (generatorId) where.generatorId = generatorId

    const [items, total] = await Promise.all([
      prisma.policyBrief.findMany({
        where,
        include: {
          generator: { select: { id: true, name: true, role: true } },
          policyLink: { select: { id: true, url: true, title: true, customerType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.policyBrief.count({ where }),
    ])

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * 获取单个政策简报
   */
  async getById(id: string, user: AuthUser): Promise<PolicyBriefWithRelations> {
    const brief = await prisma.policyBrief.findUnique({
      where: { id },
      include: {
        generator: { select: { id: true, name: true, role: true } },
        policyLink: { select: { id: true, url: true, title: true, customerType: true } },
      },
    })

    if (!brief) {
      throw notFound('政策简报不存在', { briefId: id })
    }

    return brief
  }

  /**
   * 创建政策简报
   */
  async create(data: CreatePolicyBriefInput, user: AuthUser): Promise<PolicyBriefWithRelations> {
    // 检查政策链接是否存在
    const policyLink = await prisma.policyLink.findUnique({
      where: { id: data.policyLinkId },
    })

    if (!policyLink) {
      throw notFound('政策链接不存在', { policyLinkId: data.policyLinkId })
    }

    const brief = await prisma.policyBrief.create({
      data: {
        policyLinkId: data.policyLinkId,
        title: data.title,
        summary: data.summary,
        applicableTo: data.applicableTo || null,
        keyClauses: data.keyClauses || null,
        actionSuggestions: data.actionSuggestions || null,
        riskReminders: data.riskReminders || null,
        sourceUrl: data.sourceUrl || policyLink.url,
        generatorId: user.id,
        reviewStatus: 'draft',
      },
      include: {
        generator: { select: { id: true, name: true, role: true } },
        policyLink: { select: { id: true, url: true, title: true, customerType: true } },
      },
    })

    // 更新政策链接状态
    await prisma.policyLink.update({
      where: { id: data.policyLinkId },
      data: { status: 'brief_generated' },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'policy_brief',
      entityId: brief.id,
      details: { title: brief.title, policyLinkId: data.policyLinkId },
    })

    logger.info('Policy brief created', { briefId: brief.id, userId: user.id })

    return brief
  }

  /**
   * 更新政策简报
   */
  async update(id: string, data: UpdatePolicyBriefInput, user: AuthUser): Promise<PolicyBriefWithRelations> {
    const existing = await prisma.policyBrief.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策简报不存在', { briefId: id })
    }

    // 检查编辑权限：只有生成者或管理员可编辑
    if (!canAccess(user, 'policy_brief', 'write', { ownerId: existing.generatorId })) {
      throw forbidden('无权编辑此政策简报', { briefId: id })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.summary !== undefined) updateData.summary = data.summary
    if (data.applicableTo !== undefined) updateData.applicableTo = data.applicableTo
    if (data.keyClauses !== undefined) updateData.keyClauses = data.keyClauses
    if (data.actionSuggestions !== undefined) updateData.actionSuggestions = data.actionSuggestions
    if (data.riskReminders !== undefined) updateData.riskReminders = data.riskReminders

    const brief = await prisma.policyBrief.update({
      where: { id },
      data: updateData,
      include: {
        generator: { select: { id: true, name: true, role: true } },
        policyLink: { select: { id: true, url: true, title: true, customerType: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'policy_brief',
      entityId: id,
      details: { title: brief.title },
    })

    logger.info('Policy brief updated', { briefId: id, userId: user.id })

    return brief
  }

  /**
   * 提交审核
   */
  async submitForReview(id: string, user: AuthUser): Promise<PolicyBriefWithRelations> {
    const existing = await prisma.policyBrief.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策简报不存在', { briefId: id })
    }

    // 检查编辑权限
    if (!canAccess(user, 'policy_brief', 'write', { ownerId: existing.generatorId })) {
      throw forbidden('无权提交此政策简报', { briefId: id })
    }

    // 检查状态：只有 draft 可以提交
    if (existing.reviewStatus !== 'draft') {
      throw notFound('当前状态不允许提交审核', { briefId: id, status: existing.reviewStatus })
    }

    const brief = await prisma.policyBrief.update({
      where: { id },
      data: { reviewStatus: 'pending_review' },
      include: {
        generator: { select: { id: true, name: true, role: true } },
        policyLink: { select: { id: true, url: true, title: true, customerType: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'submit',
      entityType: 'policy_brief',
      entityId: id,
      details: { title: brief.title },
    })

    logger.info('Policy brief submitted for review', { briefId: id, userId: user.id })

    return brief
  }

  /**
   * 审核通过
   */
  async approve(id: string, user: AuthUser): Promise<PolicyBriefWithRelations> {
    const existing = await prisma.policyBrief.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策简报不存在', { briefId: id })
    }

    // 检查审核权限
    if (!canReview(user, 'policy_brief')) {
      throw forbidden('无权审核此政策简报', { briefId: id })
    }

    // 检查状态：只有 pending_review 可以审核
    if (existing.reviewStatus !== 'pending_review') {
      throw notFound('当前状态不允许审核通过', { briefId: id, status: existing.reviewStatus })
    }

    const brief = await prisma.policyBrief.update({
      where: { id },
      data: {
        reviewStatus: 'reviewed',
        reviewedAt: new Date(),
      },
      include: {
        generator: { select: { id: true, name: true, role: true } },
        policyLink: { select: { id: true, url: true, title: true, customerType: true } },
      },
    })

    // 更新政策链接状态
    await prisma.policyLink.update({
      where: { id: existing.policyLinkId },
      data: { status: 'reviewed' },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'approve',
      entityType: 'policy_brief',
      entityId: id,
      details: { title: brief.title },
    })

    logger.info('Policy brief approved', { briefId: id, userId: user.id })

    return brief
  }

  /**
   * 审核驳回
   */
  async reject(id: string, user: AuthUser, comment: string): Promise<PolicyBriefWithRelations> {
    const existing = await prisma.policyBrief.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策简报不存在', { briefId: id })
    }

    // 检查审核权限
    if (!canReview(user, 'policy_brief')) {
      throw forbidden('无权审核此政策简报', { briefId: id })
    }

    // 检查状态：只有 pending_review 可以驳回
    if (existing.reviewStatus !== 'pending_review') {
      throw notFound('当前状态不允许驳回', { briefId: id, status: existing.reviewStatus })
    }

    const brief = await prisma.policyBrief.update({
      where: { id },
      data: {
        reviewStatus: 'rejected',
        reviewedAt: new Date(),
      },
      include: {
        generator: { select: { id: true, name: true, role: true } },
        policyLink: { select: { id: true, url: true, title: true, customerType: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'reject',
      entityType: 'policy_brief',
      entityId: id,
      details: { title: brief.title, comment },
    })

    logger.info('Policy brief rejected', { briefId: id, userId: user.id, comment })

    return brief
  }
}

// ==================== 单例导出 ====================

let _policyBriefService: PolicyBriefService | null = null

export function getPolicyBriefService(): PolicyBriefService {
  if (!_policyBriefService) {
    _policyBriefService = new PolicyBriefService()
  }
  return _policyBriefService
}
