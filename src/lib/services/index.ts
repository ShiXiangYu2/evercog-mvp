/**
 * Services 统一导出
 */
export { KnowledgeCardService, getKnowledgeCardService } from './knowledge-card'
export type {
  KnowledgeCardStatus,
  VisibilityScope,
  ListFilters as KnowledgeCardListFilters,
  PaginatedResult as KnowledgeCardPaginatedResult,
  CreateKnowledgeCardInput,
  UpdateKnowledgeCardInput,
  KnowledgeCardWithRelations,
} from './knowledge-card'

export { PolicyLinkService, getPolicyLinkService } from './policy-link'
export type {
  PolicyLinkStatus,
  ListFilters as PolicyLinkListFilters,
  PaginatedResult as PolicyLinkPaginatedResult,
  CreatePolicyLinkInput,
  UpdatePolicyLinkInput,
  PolicyLinkWithRelations,
} from './policy-link'

export { PolicyBriefService, getPolicyBriefService } from './policy-brief'
export type {
  BriefReviewStatus,
  ListFilters as PolicyBriefListFilters,
  PaginatedResult as PolicyBriefPaginatedResult,
  CreatePolicyBriefInput,
  UpdatePolicyBriefInput,
  PolicyBriefWithRelations,
} from './policy-brief'
