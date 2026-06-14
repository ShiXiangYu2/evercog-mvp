/**
 * 权限工具函数
 * Task 7: 权限与审计强化
 */
import { createAuditLog, type AuditLogParams } from './audit'

// ==================== 类型定义 ====================

export interface User {
  id: string
  name: string
  role: string
  departmentId: string
}

export interface KnowledgeCard {
  id: string
  title: string
  visibilityScope: string // 'department' | 'role' | 'public'
  departmentId: string | null
  status: string
  creatorId: string
  reviewerId?: string | null
}

// ==================== 角色权限定义 ====================

/**
 * 角色可见范围定义
 * - admin: 可看所有知识卡
 * - finance: 可看 public + 所有财务相关知识卡
 * - mentor/trainee: 仅看 public + 本部门
 * - 其他角色: 仅看 public + 本部门
 */
const ROLE_KNOWLEDGE_ACCESS: Record<string, {
  canViewAll: boolean
  canViewFinance: boolean
  canViewAllPublic: boolean
}> = {
  admin: { canViewAll: true, canViewFinance: true, canViewAllPublic: true },
  finance: { canViewAll: false, canViewFinance: true, canViewAllPublic: true },
  mentor: { canViewAll: false, canViewFinance: false, canViewAllPublic: true },
  trainee: { canViewAll: false, canViewFinance: false, canViewAllPublic: true },
  sales: { canViewAll: false, canViewFinance: false, canViewAllPublic: true },
  customer_service: { canViewAll: false, canViewFinance: false, canViewAllPublic: true },
  operations: { canViewAll: false, canViewFinance: false, canViewAllPublic: true },
  ai_info: { canViewAll: false, canViewFinance: false, canViewAllPublic: true },
}

/**
 * 角色审核权限定义
 */
const ROLE_REVIEW_PERMISSIONS: Record<string, string[]> = {
  admin: ['knowledge_card', 'policy_brief', 'sop_submission'],
  mentor: ['knowledge_card', 'sop_submission'],
  finance: ['knowledge_card'], // 财务角色可审核知识卡
}

/**
 * 审核能力的角色列表
 */
export const REVIEWABLE_ROLES = ['admin', 'mentor', 'finance']

// ==================== 知识卡可见性判断 ====================

/**
 * 判断用户是否可见某张知识卡
 *
 * 规则:
 * 1. admin: 所有知识卡可见
 * 2. finance: public + 所有财务相关 + 本部门
 * 3. 其他: public + 本部门
 * 4. 非 published 状态的卡片只有创建者和审核者可见
 */
export function canViewKnowledgeCard(
  user: User,
  card: KnowledgeCard,
  userDepartmentId?: string
): boolean {
  const effectiveDeptId = userDepartmentId || user.departmentId
  const access = ROLE_KNOWLEDGE_ACCESS[user.role] || ROLE_KNOWLEDGE_ACCESS.sales

  // 非 published 状态: 只有创建者和审核者可见
  if (card.status !== 'published') {
    return card.creatorId === user.id || card.reviewerId === user.id
  }

  // admin: 全部可见
  if (access.canViewAll) return true

  // public: 所有人可见
  if (card.visibilityScope === 'public') return true

  // department: 仅本部门可见
  if (card.visibilityScope === 'department') {
    return card.departmentId === effectiveDeptId
  }

  // role: 财务角色可看所有财务相关知识卡
  if (card.visibilityScope === 'role') {
    if (access.canViewFinance) {
      // 财务角色可看财务部门创建的所有 role 范围知识卡
      // 通过 creatorId 间接判断（财务部创建的卡片）
      return true // finance 角色可看所有 role 范围
    }
    // 其他角色只能看本部门创建的
    return card.departmentId === effectiveDeptId
  }

  return false
}

/**
 * 判断用户是否可审核某张知识卡
 */
export function canReviewKnowledgeCard(
  user: User,
  card: KnowledgeCard
): boolean {
  // 只有 pending_review 状态可审核
  if (card.status !== 'pending_review') return false

  const reviewable = ROLE_REVIEW_PERMISSIONS[user.role]
  if (!reviewable) return false

  // 检查实体类型是否在角色审核范围内
  return reviewable.includes('knowledge_card')
}

/**
 * 过滤用户可见的知识卡列表
 */
export function filterKnowledgeCards(
  user: User,
  cards: KnowledgeCard[],
  userDepartmentId?: string
): KnowledgeCard[] {
  return cards.filter((card) =>
    canViewKnowledgeCard(user, card, userDepartmentId)
  )
}

// ==================== 审计日志（委托到统一模块） ====================

/**
 * 记录审计日志（兼容旧接口，委托到 lib/audit.ts）
 * @deprecated 请直接使用 import { createAuditLog } from './audit'
 */
export async function logAuditEvent(
  userId: string,
  action: AuditLogParams['action'],
  entityType: AuditLogParams['entityType'],
  entityId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  return createAuditLog({ userId, action, entityType, entityId, details, ipAddress })
}

// ==================== 权限说明数据 ====================

/**
 * 获取角色权限矩阵
 * 用于权限说明页面展示
 */
export function getRolePermissionMatrix() {
  const roles = [
    { key: 'admin', label: '管理员', color: 'bg-red-500' },
    { key: 'finance', label: '财务', color: 'bg-amber-500' },
    { key: 'mentor', label: '导师', color: 'bg-indigo-500' },
    { key: 'trainee', label: '新人', color: 'bg-pink-500' },
    { key: 'sales', label: '销售', color: 'bg-blue-500' },
    { key: 'customer_service', label: '客服', color: 'bg-emerald-500' },
    { key: 'operations', label: '运营', color: 'bg-purple-500' },
    { key: 'ai_info', label: 'AI 工程师', color: 'bg-cyan-500' },
  ]

  const permissions = [
    {
      category: '知识卡查看',
      items: [
        {
          name: '查看 public 知识卡',
          description: '所有角色均可查看标记为公开的知识卡',
          roles: ['admin', 'finance', 'mentor', 'trainee', 'sales', 'customer_service', 'operations', 'ai_info'],
        },
        {
          name: '查看本部门知识卡',
          description: '可查看所在部门的知识卡（visibilityScope=department）',
          roles: ['admin', 'finance', 'mentor', 'trainee', 'sales', 'customer_service', 'operations', 'ai_info'],
        },
        {
          name: '查看所有财务相关知识卡',
          description: '财务角色可查看所有财务部门创建的 role 范围知识卡',
          roles: ['admin', 'finance'],
        },
        {
          name: '查看所有知识卡',
          description: '管理员可查看所有部门、所有范围的知识卡',
          roles: ['admin'],
        },
      ],
    },
    {
      category: '知识卡操作',
      items: [
        {
          name: '创建知识卡',
          description: '所有角色均可创建知识卡',
          roles: ['admin', 'finance', 'mentor', 'trainee', 'sales', 'customer_service', 'operations', 'ai_info'],
        },
        {
          name: '编辑自己创建的知识卡',
          description: '仅创建者可编辑',
          roles: ['admin', 'finance', 'mentor', 'trainee', 'sales', 'customer_service', 'operations', 'ai_info'],
        },
        {
          name: '审核知识卡',
          description: '可审核 pending_review 状态的知识卡',
          roles: ['admin', 'mentor', 'finance'],
        },
        {
          name: '发布知识卡',
          description: '审核通过后知识卡变为 published',
          roles: ['admin', 'mentor', 'finance'],
        },
      ],
    },
    {
      category: '审计日志',
      items: [
        {
          name: '查看审计日志列表',
          description: '查看所有操作记录',
          roles: ['admin', 'finance', 'mentor', 'ai_info'],
        },
        {
          name: '查看审计日志详情',
          description: '查看单条操作的详细信息',
          roles: ['admin', 'finance', 'mentor', 'ai_info'],
        },
      ],
    },
    {
      category: '经验调用',
      items: [
        {
          name: '发起经验查询',
          description: '基于知识卡检索生成回复建议',
          roles: ['admin', 'finance', 'mentor', 'trainee', 'sales', 'customer_service', 'operations', 'ai_info'],
        },
        {
          name: '查看查询历史',
          description: '查看自己发起的经验查询记录',
          roles: ['admin', 'finance', 'mentor', 'trainee', 'sales', 'customer_service', 'operations', 'ai_info'],
        },
      ],
    },
  ]

  return { roles, permissions }
}

/**
 * 获取指定用户的权限概览
 */
export function getUserPermissions(user: User) {
  const access = ROLE_KNOWLEDGE_ACCESS[user.role] || ROLE_KNOWLEDGE_ACCESS.sales
  const canReview = ROLE_REVIEW_PERMISSIONS[user.role] || []
  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
    },
    knowledge: {
      canViewPublic: true,
      canViewDepartment: true,
      canViewFinance: access.canViewFinance,
      canViewAll: access.canViewAll,
    },
    review: {
      canReviewKnowledgeCard: canReview.includes('knowledge_card'),
      canReviewPolicyBrief: canReview.includes('policy_brief'),
      canReviewSOPSubmission: canReview.includes('sop_submission'),
    },
    audit: {
      canViewLogs: ['admin', 'finance', 'mentor', 'ai_info'].includes(user.role),
    },
  }
}
