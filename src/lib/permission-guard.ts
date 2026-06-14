/**
 * 鏉冮檺妫€鏌ユā鍧? *
 * 缁熶竴澶勭悊鎵€鏈夊疄浣撶殑鏉冮檺妫€鏌ラ€昏緫
 * Service 灞傝皟鐢ㄦ妯″潡杩涜鏉冮檺楠岃瘉
 */

// ==================== 绫诲瀷瀹氫箟 ====================

export interface AuthUser {
  id: string
  name: string
  role: string
  departmentId: string
  email: string | null
}

export type ActionType = 'read' | 'write' | 'delete' | 'review' | 'publish'

// ==================== 瑙掕壊瀹氫箟 ====================

/**
 * 鍏锋湁瀹℃牳鏉冮檺鐨勮鑹? */
export const REVIEWABLE_ROLES = ['admin', 'mentor', 'finance']

/**
 * 鍏锋湁绠＄悊鏉冮檺鐨勮鑹? */
export const ADMIN_ROLES = ['admin']

/**
 * Roles allowed to view cross-department operational knowledge.
 */
export const EXTENDED_VISIBILITY_ROLES = ['admin', 'finance', 'ai_info']

/**
 * 瑙掕壊鍙鑼冨洿閰嶇疆
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
  ai_info: { canViewAll: true, canViewFinance: true },
}

/**
 * 瑙掕壊瀹℃牳鏉冮檺閰嶇疆
 */
const ROLE_REVIEW_PERMISSIONS: Record<string, string[]> = {
  admin: ['knowledge_card', 'policy_brief', 'sop_submission'],
  mentor: ['knowledge_card', 'policy_brief', 'sop_submission'],
  finance: ['knowledge_card', 'policy_brief'],
}

// ==================== 鏉冮檺妫€鏌ュ嚱鏁?====================

/**
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲浠ュ瀹炰綋鎵ц鎸囧畾鎿嶄綔
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
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲浠ヨ鍙栧疄浣? */
function canRead(
  user: AuthUser,
  entityType: string,
  context?: {
    departmentId?: string
    status?: string
  }
): boolean {
  // 闈?published 鐘舵€佸彧鏈夊垱寤鸿€呭拰瀹℃牳鑰呭彲瑙侊紙鐢?Service 灞傚鐞嗭級
  // 杩欓噷鍙鐞嗛儴闂ㄥ拰瑙掕壊绾у埆鐨勮鍙栨潈闄?
  if (entityType === 'knowledge_card') {
    const access = ROLE_KNOWLEDGE_ACCESS[user.role] || ROLE_KNOWLEDGE_ACCESS.sales

    if (access.canViewAll) return true

    if (context?.departmentId) {
      return user.departmentId === context.departmentId
    }

    // 榛樿鍙互鏌ョ湅 public 鑼冨洿锛堢敱 Service 灞傝繃婊わ級
    return true
  }

  if (hasExtendedVisibility(user)) return true
  if (context?.departmentId) {
    return user.departmentId === context.departmentId
  }

  return false
}

/**
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲浠ュ啓鍏ュ疄浣? */
function canWrite(
  user: AuthUser,
  entityType: string,
  context?: {
    ownerId?: string
  }
): boolean {
  // 鍒涘缓鎿嶄綔锛氭墍鏈夌敤鎴烽兘鍙互
  if (!context?.ownerId) {
    return true
  }

  return isOwner(user, context.ownerId)
}

/**
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲浠ュ垹闄ゅ疄浣? */
function canDelete(user: AuthUser, _entityType: string): boolean {
  return isAdmin(user)
}

/**
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲浠ュ鏍稿疄浣? */
export function canReview(user: AuthUser, entityType: string): boolean {
  const reviewable = ROLE_REVIEW_PERMISSIONS[user.role]
  if (!reviewable) return false
  return reviewable.includes(entityType)
}

// ==================== 杈呭姪鍑芥暟 ====================

/**
 * 妫€鏌ョ敤鎴锋槸鍚︽槸绠＄悊鍛? */
export function isAdmin(user: AuthUser): boolean {
  return ADMIN_ROLES.includes(user.role)
}

/**
 * 妫€鏌ョ敤鎴锋槸鍚︽槸璧勬簮鎵€鏈夎€? */
export function isOwner(user: AuthUser, ownerId: string): boolean {
  return user.id === ownerId
}

/**
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲浠ヨ闂寚瀹氶儴闂ㄧ殑鏁版嵁
 */
export function canAccessDepartment(user: AuthUser, departmentId: string): boolean {
  if (hasExtendedVisibility(user)) return true
  return user.departmentId === departmentId
}

export function hasExtendedVisibility(user: AuthUser): boolean {
  return EXTENDED_VISIBILITY_ROLES.includes(user.role)
}

/**
 * 鑾峰彇鐢ㄦ埛鐨勭煡璇嗗崱璁块棶鏉冮檺
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
 * 妫€鏌ョ敤鎴锋槸鍚﹀彲瑙佺煡璇嗗崱
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
  if (card.status !== 'published') {
    return card.creatorId === user.id || card.reviewerId === user.id || isAdmin(user)
  }

  const access = getKnowledgeCardAccess(user)

  if (access.canViewAll) return true

  // public 鑼冨洿锛氭墍鏈変汉鍙
  if (card.visibilityScope === 'public') return true

  // department 鑼冨洿锛氭湰閮ㄩ棬鍙
  if (card.visibilityScope === 'department') {
    return user.departmentId === card.departmentId
  }

  if (card.visibilityScope === 'role') {
    if (access.canViewFinance) return true
    return user.departmentId === card.departmentId
  }

  return false
}
