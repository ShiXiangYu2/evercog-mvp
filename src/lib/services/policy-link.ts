/**
 * PolicyLink 服务
 *
 * 基于 BaseEntityService 的政策链接 CRUD 和状态流转
 */
import { BaseEntityService } from './base-service'
import { prisma } from '../prisma'
import type { AuthUser, EntityConfig, ListFilters, PaginatedResult } from './base-types'

// ==================== 类型定义 ====================

export type PolicyLinkStatus = 'submitted' | 'collected' | 'brief_generated' | 'reviewed' | 'pushed' | 'archived'

export interface PolicyLinkListFilters extends ListFilters {
  status?: string
  source?: string
  customerType?: string
  submitterId?: string
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

// ==================== 实体配置 ====================

const POLICY_LINK_CONFIG: EntityConfig = {
  entityType: 'policy_link',
  entityLabel: '政策链接',
  statusField: 'status',
  ownerField: 'submitterId',
  searchFields: ['title', 'url'],
  transitions: {
    submitted: ['collected'],
    collected: ['brief_generated'],
    brief_generated: ['reviewed'],
    reviewed: ['pushed'],
    pushed: ['archived'],
    archived: [],
  },
  statusLabels: {
    submitted: '已提交',
    collected: '已采集',
    brief_generated: '已生成简报',
    reviewed: '已审核',
    pushed: '已推送',
    archived: '已归档',
  },
}

// ==================== PolicyLinkService ====================

export class PolicyLinkService extends BaseEntityService<
  PolicyLinkWithRelations,
  CreatePolicyLinkInput,
  UpdatePolicyLinkInput
> {
  constructor() {
    super(POLICY_LINK_CONFIG)
  }

  protected get model() {
    return prisma.policyLink
  }

  protected get include() {
    return {
      submitter: { select: { id: true, name: true, role: true } },
      brief: { select: { id: true, title: true, reviewStatus: true } },
    }
  }

  protected toResponse(record: any): PolicyLinkWithRelations {
    return record
  }

  protected buildCreateData(data: CreatePolicyLinkInput, user: AuthUser): Record<string, unknown> {
    return {
      url: data.url,
      title: data.title || null,
      source: data.source || null,
      submitterId: user.id,
      departmentId: data.departmentId || user.departmentId,
      customerType: data.customerType || null,
      status: 'submitted',
    }
  }

  protected buildUpdateData(data: UpdatePolicyLinkInput): Record<string, unknown> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.source !== undefined) updateData.source = data.source
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
    if (data.customerType !== undefined) updateData.customerType = data.customerType
    if (data.status !== undefined) updateData.status = data.status
    return updateData
  }

  // ==================== 过滤条件 ====================

  protected applyFilters(where: Record<string, unknown>, filters: Record<string, unknown>): void {
    if (filters.status) where.status = filters.status
    if (filters.source) where.source = filters.source
    if (filters.customerType) where.customerType = filters.customerType
    if (filters.submitterId) where.submitterId = filters.submitterId
  }

  // ==================== 便捷方法 ====================

  async markAsCollected(id: string, user: AuthUser): Promise<PolicyLinkWithRelations> {
    return this.transition(id, 'collected', user)
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
