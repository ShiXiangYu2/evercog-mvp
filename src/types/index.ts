// 用户角色
export type UserRole = 'sales' | 'customer_service' | 'operations' | 'finance' | 'ai_info' | 'admin' | 'mentor' | 'trainee'

// 用户角色显示名称
export const UserRoleLabels: Record<UserRole, string> = {
  sales: '销售',
  customer_service: '客服',
  operations: '运营',
  finance: '财务',
  ai_info: 'AI 信息部',
  admin: '管理员',
  mentor: '导师',
  trainee: '新人',
}

// 具有审核权限的角色
export const REVIEWABLE_ROLES: UserRole[] = ['admin', 'mentor', 'finance']

// 具有管理权限的角色
export const ADMIN_ROLES: UserRole[] = ['admin']

// 政策链接状态
export type PolicyLinkStatus = 'submitted' | 'collected' | 'brief_generated' | 'reviewed' | 'pushed' | 'archived'

export const PolicyLinkStatusLabels: Record<PolicyLinkStatus, string> = {
  submitted: '已提交',
  collected: '已采集',
  brief_generated: '已生成简报',
  reviewed: '已审核',
  pushed: '已推送',
  archived: '已归档',
}

// 政策简报审核状态
export type BriefReviewStatus = 'draft' | 'pending_review' | 'reviewed' | 'rejected'

export const BriefReviewStatusLabels: Record<BriefReviewStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  reviewed: '已审核',
  rejected: '已驳回',
}

// 知识卡分类
export type KnowledgeCardCategory = 'data_checklist' | 'tax_process' | 'risk_reminder' | 'service_boundary' | 'faq' | 'experience'

export const KnowledgeCardCategoryLabels: Record<KnowledgeCardCategory, string> = {
  data_checklist: '资料清单',
  tax_process: '报税流程',
  risk_reminder: '风险提醒',
  service_boundary: '服务边界',
  faq: '常见问题',
  experience: '经验分享',
}

// 知识卡状态
export type KnowledgeCardStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'

export const KnowledgeCardStatusLabels: Record<KnowledgeCardStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  published: '已发布',
  rejected: '已驳回',
  archived: '已归档',
}

// 客户类型
export type CustomerType = 'restaurant' | 'retail' | 'store' | 'advertising' | 'startup' | 'individual'

export const CustomerTypeLabels: Record<CustomerType, string> = {
  restaurant: '餐饮',
  retail: '零售',
  store: '门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
}

// SOP 任务状态
export type SOPTaskStatus = 'assigned' | 'in_progress' | 'submitted' | 'reviewed' | 'completed'

export const SOPTaskStatusLabels: Record<SOPTaskStatus, string> = {
  assigned: '已分配',
  in_progress: '进行中',
  submitted: '已提交',
  reviewed: '已审核',
  completed: '已完成',
}

// SOP 提交状态
export type SOPSubmissionStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'revision_required'

export const SOPSubmissionStatusLabels: Record<SOPSubmissionStatus, string> = {
  submitted: '已提交',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  revision_required: '需修改',
}

// 推送状态
export type PushStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export const PushStatusLabels: Record<PushStatus, string> = {
  pending: '待发送',
  sent: '已发送',
  delivered: '已送达',
  failed: '发送失败',
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  pageSize?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
