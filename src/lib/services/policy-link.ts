/**
 * PolicyLink 服务
 *
 * 处理政策链接的 CRUD 操作
 */
import { prisma } from '../prisma'
import { createAuditLog } from '../audit'
import { canAccess, type AuthUser } from '../permission-guard'
import { notFound, forbidden, type ServiceError } from '../service-error'
import logger from '../logger'

// ==================== 类型定义 ====================

export type PolicyLinkStatus = 'submitted' | 'collected' | 'brief_generated' | 'reviewed' | 'pushed' | 'archived'

export interface ListFilters {
  search?: string
  status?: string
  source?: string
  customerType?: string
  submitterId?: string
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

export interface CreatePolicyLinkInput {
  url: string
  title?: string
  source?: string
  departmentId?: string
  customerType?: string
}

export interface UpdatePolicyLinkInput {
  title?: string
  source?: string
  departmentId?: string
  customerType?: string
  status?: PolicyLinkStatus
}

export interface PolicyLinkWithRelations {
  id: string
  url: string
  title: string | null
  source: string | null
  submitterId: string
  departmentId: string | null
  customerType: string | null
  status: string
  collectedAt: Date | null
  createdAt: Date
  updatedAt: Date
  submitter?: { id: string; name: string; role: string } | null
  brief?: { id: string; title: string; reviewStatus: string } | null
}

// ==================== PolicyLinkService ====================

export class PolicyLinkService {
  /**
   * 列表查询
   */
  async list(filters: ListFilters, user: AuthUser): Promise<PaginatedResult<PolicyLinkWithRelations>> {
    const { search, status, source, customerType, submitterId, page = 1, pageSize = 20 } = filters

    const where: Record<string, unknown> = {}

    // 搜索条件
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { url: { contains: search } },
      ]
    }

    if (status) where.status = status
    if (source) where.source = source
    if (customerType) where.customerType = customerType
    if (submitterId) where.submitterId = submitterId

    const [items, total] = await Promise.all([
      prisma.policyLink.findMany({
        where,
        include: {
          submitter: { select: { id: true, name: true, role: true } },
          brief: { select: { id: true, title: true, reviewStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.policyLink.count({ where }),
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
   * 获取单个政策链接
   */
  async getById(id: string, user: AuthUser): Promise<PolicyLinkWithRelations> {
    const link = await prisma.policyLink.findUnique({
      where: { id },
      include: {
        submitter: { select: { id: true, name: true, role: true } },
        brief: { select: { id: true, title: true, reviewStatus: true } },
      },
    })

    if (!link) {
      throw notFound('政策链接不存在', { linkId: id })
    }

    return link
  }

  /**
   * 创建政策链接
   */
  async create(data: CreatePolicyLinkInput, user: AuthUser): Promise<PolicyLinkWithRelations> {
    const link = await prisma.policyLink.create({
      data: {
        url: data.url,
        title: data.title || null,
        source: data.source || null,
        submitterId: user.id,
        departmentId: data.departmentId || user.departmentId,
        customerType: data.customerType || null,
        status: 'submitted',
      },
      include: {
        submitter: { select: { id: true, name: true, role: true } },
        brief: { select: { id: true, title: true, reviewStatus: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'policy_link',
      entityId: link.id,
      details: { url: link.url, title: link.title },
    })

    logger.info('Policy link created', { linkId: link.id, userId: user.id })

    return link
  }

  /**
   * 更新政策链接
   */
  async update(id: string, data: UpdatePolicyLinkInput, user: AuthUser): Promise<PolicyLinkWithRelations> {
    const existing = await prisma.policyLink.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策链接不存在', { linkId: id })
    }

    // 检查编辑权限：只有提交者或管理员可编辑
    if (!canAccess(user, 'policy_link', 'write', { ownerId: existing.submitterId })) {
      throw forbidden('无权编辑此政策链接', { linkId: id })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.source !== undefined) updateData.source = data.source
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
    if (data.customerType !== undefined) updateData.customerType = data.customerType
    if (data.status !== undefined) updateData.status = data.status

    const link = await prisma.policyLink.update({
      where: { id },
      data: updateData,
      include: {
        submitter: { select: { id: true, name: true, role: true } },
        brief: { select: { id: true, title: true, reviewStatus: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'policy_link',
      entityId: id,
      details: { url: link.url, title: link.title },
    })

    logger.info('Policy link updated', { linkId: id, userId: user.id })

    return link
  }

  /**
   * 删除政策链接
   */
  async delete(id: string, user: AuthUser): Promise<void> {
    const existing = await prisma.policyLink.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策链接不存在', { linkId: id })
    }

    // 检查删除权限：仅管理员可删除
    if (!canAccess(user, 'policy_link', 'delete')) {
      throw forbidden('无权删除此政策链接', { linkId: id })
    }

    await prisma.policyLink.delete({ where: { id } })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'policy_link',
      entityId: id,
      details: { url: existing.url, title: existing.title, action: 'delete' },
    })

    logger.info('Policy link deleted', { linkId: id, userId: user.id })
  }

  /**
   * 标记为已采集
   */
  async markAsCollected(id: string, user: AuthUser): Promise<PolicyLinkWithRelations> {
    const existing = await prisma.policyLink.findUnique({ where: { id } })

    if (!existing) {
      throw notFound('政策链接不存在', { linkId: id })
    }

    if (existing.status !== 'submitted') {
      throw notFound('当前状态不允许标记为已采集', { linkId: id, status: existing.status })
    }

    const link = await prisma.policyLink.update({
      where: { id },
      data: {
        status: 'collected',
        collectedAt: new Date(),
      },
      include: {
        submitter: { select: { id: true, name: true, role: true } },
        brief: { select: { id: true, title: true, reviewStatus: true } },
      },
    })

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'policy_link',
      entityId: id,
      details: { url: link.url, action: 'mark_as_collected' },
    })

    logger.info('Policy link marked as collected', { linkId: id, userId: user.id })

    return link
  }
}

// ==================== 单例导出 ====================

let _policyLinkService: PolicyLinkService | null = null

export function getPolicyLinkService(): PolicyLinkService {
  if (!_policyLinkService) {
    _policyLinkService = new PolicyLinkService()
  }
  return _policyLinkService
}
