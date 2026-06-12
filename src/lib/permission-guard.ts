/**
 * 权限检查模块
 *
 * 统一处理所有实体的权限检查逻辑
 * Service 层调用此模块进行权限验证
 */

// ==================== 类型定义 ====================

export interface AuthUser {
  id: string
  name: string
  role: string
  departmentId: string
  email: string | null
}

export type ActionType = 'read' | 'write' | 'delete' | 'review' | 'publish'

// ==================== 角色定义 ====================

/**
 * 具有审核权限的角色
 */
export const REVIEWABLE_ROLES = ['admin', 'mentor', 'finance']

/**
 * 具有管理权限的角色
 */
export const ADMIN_ROLES = ['admin']

/**
 * 角色可见范围配置
 */
const ROLE_KNOWLEDGE_ACCESS: Record<string, {
  canViewAll: boolean
  canViewFinance: boolean
}> = {
  admin: { canViewAll: true, canViewFinance: true },
  finance: { canViewAll: false, canViewFinance: true },
  mentor: { canViewAll: false, canViewFinance: false },
  trainee: { canViewAll: false, canViewFinance: false },
  sales: { canViewAll: false, canViewFinance: false },
  customer_service: { canViewAll: false, canViewFinance: false },
  operations: { canViewAll: false, canViewFinance: false },
  ai_info: { canViewAll: false, canViewFinance: false },
}

/**
 * 角色审核权限配置
 */
const ROLE_REVIEW_PERMISSIONS: Record<string, string[]> = {
  admin: ['knowledge_card', 'policy_brief', 'sop_submission'],
  mentor: ['knowledge_card', 'policy_brief', 'sop_submission'],
  finance: ['knowledge_card', 'policy_brief'],
}

// ==================== 权限检查函数 ====================

/**
 * 检查用户是否可以对实体执行指定操作
 */
export function canAccess(
  user: AuthUser,
  entityType: string,
  action: ActionType,
  context?: {
    ownerId?: string
    departmentId?: string
    status?: string
  }
): boolean {
  // 管理员拥有所有权限
  if (isAdmin(user)) {
    return true
  }

  switch (action) {
    case 'read':
      return canRead(user, entityType, context)
    case 'write':
      return canWrite(user, entityType, context)
    case 'delete':
      return canDelete(user, entityType)
    case 'review':
      return canReview(user, entityType)
    case 'publish':
      return canReview(user, entityType)
    default:
      return false
  }
}

/**
 * 检查用户是否可以读取实体
 */
function canRead(
  user: AuthUser,
  entityType: string,
  context?: {
    departmentId?: string
    status?: string
  }
): boolean {
  // 非 published 状态只有创建者和审核者可见（由 Service 层处理）
  // 这里只处理部门和角色级别的读取权限

  if (entityType === 'knowledge_card') {
    const access = ROLE_KNOWLEDGE_ACCESS[user.role] || ROLE_KNOWLEDGE_ACCESS.sales

    // 可以查看所有
    if (access.canViewAll) return true

    // 可以查看本部门
    if (context?.departmentId) {
      return user.departmentId === context.departmentId
    }

    // 默认可以查看 public 范围（由 Service 层过滤）
    return true
  }

  // 其他实体类型：默认可读（由 Service 层过滤）
  return true
}

/**
 * 检查用户是否可以写入实体
 */
function canWrite(
  user: AuthUser,
  entityType: string,
  context?: {
    ownerId?: string
  }
): boolean {
  // 创建操作：所有用户都可以
  if (!context?.ownerId) {
    return true
  }

  // 更新操作：只有所有者或管理员
  return isOwner(user, context.ownerId)
}

/**
 * 检查用户是否可以删除实体
 */
function canDelete(user: AuthUser, entityType: string): boolean {
  // 只有管理员可以删除
  return isAdmin(user)
}

/**
 * 检查用户是否可以审核实体
 */
export function canReview(user: AuthUser, entityType: string): boolean {
  const reviewable = ROLE_REVIEW_PERMISSIONS[user.role]
  if (!reviewable) return false
  return reviewable.includes(entityType)
}

// ==================== 辅助函数 ====================

/**
 * 检查用户是否是管理员
 */
export function isAdmin(user: AuthUser): boolean {
  return ADMIN_ROLES.includes(user.role)
}

/**
 * 检查用户是否是资源所有者
 */
export function isOwner(user: AuthUser, ownerId: string): boolean {
  return user.id === ownerId
}

/**
 * 检查用户是否可以访问指定部门的数据
 */
export function canAccessDepartment(user: AuthUser, departmentId: string): boolean {
  if (isAdmin(user)) return true
  return user.departmentId === departmentId
}

/**
 * 获取用户的知识卡访问权限
 */
export function getKnowledgeCardAccess(user: AuthUser) {
  const access = ROLE_KNOWLEDGE_ACCESS[user.role] || ROLE_KNOWLEDGE_ACCESS.sales
  return {
    canViewAll: access.canViewAll,
    canViewFinance: access.canViewFinance,
    canViewDepartment: true,
    canViewPublic: true,
  }
}

/**
 * 检查用户是否可见知识卡
 */
export function canViewKnowledgeCard(
  user: AuthUser,
  card: {
    status: string
    creatorId: string
    reviewerId?: string | null
    visibilityScope: string
    departmentId?: string | null
  }
): boolean {
  // 非 published 状态只有创建者和审核者可见
  if (card.status !== 'published') {
    return card.creatorId === user.id || card.reviewerId === user.id || isAdmin(user)
  }

  const access = getKnowledgeCardAccess(user)

  // 可以查看所有
  if (access.canViewAll) return true

  // public 范围：所有人可见
  if (card.visibilityScope === 'public') return true

  // department 范围：本部门可见
  if (card.visibilityScope === 'department') {
    return user.departmentId === card.departmentId
  }

  // role 范围：财务角色可看财务相关
  if (card.visibilityScope === 'role') {
    if (access.canViewFinance) return true
    return user.departmentId === card.departmentId
  }

  return false
}
