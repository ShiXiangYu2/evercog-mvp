/**
 * Services 统一导出
 */

// 基类和类型
export { BaseEntityService } from './base-service'
export type { AuthUser, EntityConfig, ListFilters, PaginatedResult } from './base-types'

// KnowledgeCard
export { KnowledgeCardService, getKnowledgeCardService } from './knowledge-card'
export type {
  KnowledgeCardStatus,
  VisibilityScope,
  KnowledgeCardListFilters,
  CreateKnowledgeCardInput,
  UpdateKnowledgeCardInput,
  KnowledgeCardWithRelations,
} from './knowledge-card'

// PolicyLink
export { PolicyLinkService, getPolicyLinkService } from './policy-link'
export type {
  PolicyLinkStatus,
  PolicyLinkListFilters,
  CreatePolicyLinkInput,
  UpdatePolicyLinkInput,
  PolicyLinkWithRelations,
} from './policy-link'

// PolicyBrief
export { PolicyBriefService, getPolicyBriefService } from './policy-brief'
export type {
  BriefReviewStatus,
  PolicyBriefListFilters,
  CreatePolicyBriefInput,
  UpdatePolicyBriefInput,
  PolicyBriefWithRelations,
} from './policy-brief'
