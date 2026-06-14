/**
 * PolicyBrief 服务
 *
 * 基于 BaseEntityService 的政策简报 CRUD 和状态流转
 */
import { BaseEntityService } from './base-service'
import { prisma } from '../prisma'
import { hasExtendedVisibility } from '../permission-guard'
import { notFound } from './base-types'
import type { AuthUser, EntityConfig, ListFilters } from './base-types'

// ==================== 类型定义 ====================

export type BriefReviewStatus = 'draft' | 'pending_review' | 'reviewed' | 'rejected'

export interface PolicyBriefListFilters extends ListFilters {
  reviewStatus?: string
  generatorId?: string
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
  policyLink?: { id: string; url: string; title: string | null; customerType: string | null; departmentId?: string | null } | null
}

// ==================== 实体配置 ====================

const POLICY_BRIEF_CONFIG: EntityConfig = {
  entityType: 'policy_brief',
  entityLabel: '政策简报',
  statusField: 'reviewStatus',
  ownerField: 'generatorId',
  searchFields: ['title', 'summary'],
  transitions: {
    draft: ['pending_review'],
    pending_review: ['reviewed', 'rejected'],
    reviewed: [],
    rejected: [],
  },
  statusLabels: {
    draft: '草稿',
    pending_review: '待审核',
    reviewed: '已审核',
    rejected: '已驳回',
  },
}

// ==================== PolicyBriefService ====================

export class PolicyBriefService extends BaseEntityService<
  PolicyBriefWithRelations,
  CreatePolicyBriefInput,
  UpdatePolicyBriefInput,
  PolicyBriefWithRelations
> {
  constructor() {
    super(POLICY_BRIEF_CONFIG)
  }

  protected get model() {
    return prisma.policyBrief
  }

  protected get include() {
    return {
      generator: { select: { id: true, name: true, role: true } },
      policyLink: { select: { id: true, url: true, title: true, customerType: true, departmentId: true } },
    }
  }

  protected toResponse(record: PolicyBriefWithRelations): PolicyBriefWithRelations {
    return record
  }

  protected buildCreateData(data: CreatePolicyBriefInput, user: AuthUser): Record<string, unknown> {
    return {
      policyLinkId: data.policyLinkId,
      title: data.title,
      summary: data.summary,
      applicableTo: data.applicableTo || null,
      keyClauses: data.keyClauses || null,
      actionSuggestions: data.actionSuggestions || null,
      riskReminders: data.riskReminders || null,
      sourceUrl: data.sourceUrl || null,
      generatorId: user.id,
      reviewStatus: 'draft',
    }
  }

  protected buildUpdateData(data: UpdatePolicyBriefInput): Record<string, unknown> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.summary !== undefined) updateData.summary = data.summary
    if (data.applicableTo !== undefined) updateData.applicableTo = data.applicableTo
    if (data.keyClauses !== undefined) updateData.keyClauses = data.keyClauses
    if (data.actionSuggestions !== undefined) updateData.actionSuggestions = data.actionSuggestions
    if (data.riskReminders !== undefined) updateData.riskReminders = data.riskReminders
    return updateData
  }

  // ==================== 过滤条件 ====================

  protected applyFilters(where: Record<string, unknown>, filters: Record<string, unknown>): void {
    if (filters.reviewStatus) where.reviewStatus = filters.reviewStatus
    if (filters.generatorId) where.generatorId = filters.generatorId
  }

  protected applyAccessFilter(where: Record<string, unknown>, user: AuthUser): void {
    if (hasExtendedVisibility(user)) return
    where.policyLink = { is: { departmentId: user.departmentId } }
  }

  protected canReadRecord(record: PolicyBriefWithRelations, user: AuthUser): boolean {
    if (hasExtendedVisibility(user)) return true
    return record.policyLink?.departmentId === user.departmentId
  }

  // ==================== Hook: 创建前验证政策链接 ====================

  protected async beforeCreate(data: CreatePolicyBriefInput, _user: AuthUser): Promise<void> {
    const policyLink = await prisma.policyLink.findUnique({
      where: { id: data.policyLinkId },
    })

    if (!policyLink) {
      throw notFound('政策链接不存在', { policyLinkId: data.policyLinkId })
    }
  }

  // ==================== Hook: 创建后更新政策链接状态 ====================

  protected async afterCreate(record: PolicyBriefWithRelations, _user: AuthUser): Promise<void> {
    await prisma.policyLink.update({
      where: { id: record.policyLinkId },
      data: { status: 'brief_generated' },
    })
  }

  // ==================== Hook: 审核通过后更新政策链接状态 ====================

  protected async afterTransition(id: string, from: string, to: string, _user: AuthUser): Promise<void> {
    if (to === 'reviewed') {
      const brief = await prisma.policyBrief.findUnique({ where: { id } })
      if (brief) {
        await prisma.policyLink.update({
          where: { id: brief.policyLinkId },
          data: { status: 'reviewed' },
        })
      }
    }
  }

  // ==================== 便捷方法 ====================

  async submitForReview(id: string, user: AuthUser): Promise<PolicyBriefWithRelations> {
    return this.transition(id, 'pending_review', user)
  }

  async approve(id: string, user: AuthUser): Promise<PolicyBriefWithRelations> {
    return this.transition(id, 'reviewed', user)
  }

  async reject(id: string, user: AuthUser, comment: string): Promise<PolicyBriefWithRelations> {
    return this.transition(id, 'rejected', user, { comment })
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
