/**
 * PermissionGuard 单元测试
 */
import { describe, it, expect } from 'vitest'
import {
  canAccess,
  canReview,
  isAdmin,
  isOwner,
  canAccessDepartment,
  canViewKnowledgeCard,
  getKnowledgeCardAccess,
  type AuthUser,
} from '../permission-guard'

// ==================== 测试数据 ====================

const adminUser: AuthUser = {
  id: 'admin-1',
  name: 'Admin',
  role: 'admin',
  departmentId: 'dept-1',
  email: 'admin@example.com',
}

const mentorUser: AuthUser = {
  id: 'mentor-1',
  name: 'Mentor',
  role: 'mentor',
  departmentId: 'dept-1',
  email: 'mentor@example.com',
}

const financeUser: AuthUser = {
  id: 'finance-1',
  name: 'Finance',
  role: 'finance',
  departmentId: 'dept-2',
  email: 'finance@example.com',
}

const salesUser: AuthUser = {
  id: 'sales-1',
  name: 'Sales',
  role: 'sales',
  departmentId: 'dept-1',
  email: 'sales@example.com',
}

// ==================== isAdmin 测试 ====================

describe('isAdmin', () => {
  it('should return true for admin user', () => {
    expect(isAdmin(adminUser)).toBe(true)
  })

  it('should return false for non-admin users', () => {
    expect(isAdmin(mentorUser)).toBe(false)
    expect(isAdmin(financeUser)).toBe(false)
    expect(isAdmin(salesUser)).toBe(false)
  })
})

// ==================== isOwner 测试 ====================

describe('isOwner', () => {
  it('should return true when user is owner', () => {
    expect(isOwner(salesUser, 'sales-1')).toBe(true)
  })

  it('should return false when user is not owner', () => {
    expect(isOwner(salesUser, 'other-user')).toBe(false)
  })
})

// ==================== canAccessDepartment 测试 ====================

describe('canAccessDepartment', () => {
  it('should allow admin to access any department', () => {
    expect(canAccessDepartment(adminUser, 'any-dept')).toBe(true)
  })

  it('should allow user to access own department', () => {
    expect(canAccessDepartment(salesUser, 'dept-1')).toBe(true)
  })

  it('should deny user access to other department', () => {
    expect(canAccessDepartment(salesUser, 'dept-2')).toBe(false)
  })
})

// ==================== canReview 测试 ====================

describe('canReview', () => {
  it('should allow admin to review knowledge_card', () => {
    expect(canReview(adminUser, 'knowledge_card')).toBe(true)
  })

  it('should allow mentor to review knowledge_card', () => {
    expect(canReview(mentorUser, 'knowledge_card')).toBe(true)
  })

  it('should allow finance to review knowledge_card', () => {
    expect(canReview(financeUser, 'knowledge_card')).toBe(true)
  })

  it('should deny sales from reviewing knowledge_card', () => {
    expect(canReview(salesUser, 'knowledge_card')).toBe(false)
  })

  it('should allow admin to review policy_brief', () => {
    expect(canReview(adminUser, 'policy_brief')).toBe(true)
  })

  it('should allow mentor to review sop_submission', () => {
    expect(canReview(mentorUser, 'sop_submission')).toBe(true)
  })

  it('should allow finance to review policy_brief', () => {
    expect(canReview(financeUser, 'policy_brief')).toBe(true)
  })
})

// ==================== canAccess 测试 ====================

describe('canAccess', () => {
  describe('read action', () => {
    it('should allow admin to read any entity', () => {
      expect(canAccess(adminUser, 'knowledge_card', 'read')).toBe(true)
    })

    it('should allow user to read public knowledge_card', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'read')).toBe(true)
    })

    it('should allow user to read own department knowledge_card', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'read', { departmentId: 'dept-1' })).toBe(true)
    })

    it('should deny user from reading other department knowledge_card', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'read', { departmentId: 'dept-2' })).toBe(false)
    })
  })

  describe('write action', () => {
    it('should allow admin to write any entity', () => {
      expect(canAccess(adminUser, 'knowledge_card', 'write')).toBe(true)
    })

    it('should allow user to create new entity', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'write')).toBe(true)
    })

    it('should allow owner to update own entity', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'write', { ownerId: 'sales-1' })).toBe(true)
    })

    it('should deny non-owner from updating entity', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'write', { ownerId: 'other-user' })).toBe(false)
    })

    it('should allow admin to update any entity', () => {
      expect(canAccess(adminUser, 'knowledge_card', 'write', { ownerId: 'other-user' })).toBe(true)
    })
  })

  describe('delete action', () => {
    it('should allow admin to delete entity', () => {
      expect(canAccess(adminUser, 'knowledge_card', 'delete')).toBe(true)
    })

    it('should deny non-admin from deleting entity', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'delete')).toBe(false)
      expect(canAccess(mentorUser, 'knowledge_card', 'delete')).toBe(false)
      expect(canAccess(financeUser, 'knowledge_card', 'delete')).toBe(false)
    })
  })

  describe('review action', () => {
    it('should allow admin to review', () => {
      expect(canAccess(adminUser, 'knowledge_card', 'review')).toBe(true)
    })

    it('should allow mentor to review knowledge_card', () => {
      expect(canAccess(mentorUser, 'knowledge_card', 'review')).toBe(true)
    })

    it('should deny sales from reviewing', () => {
      expect(canAccess(salesUser, 'knowledge_card', 'review')).toBe(false)
    })
  })
})

// ==================== canViewKnowledgeCard 测试 ====================

describe('canViewKnowledgeCard', () => {
  const baseCard = {
    status: 'published',
    creatorId: 'creator-1',
    reviewerId: null,
    visibilityScope: 'public',
    departmentId: 'dept-1',
  }

  it('should allow admin to view any card', () => {
    expect(canViewKnowledgeCard(adminUser, baseCard)).toBe(true)
  })

  it('should allow viewing public cards', () => {
    expect(canViewKnowledgeCard(salesUser, baseCard)).toBe(true)
  })

  it('should allow creator to view draft card', () => {
    const draftCard = { ...baseCard, status: 'draft', creatorId: 'sales-1' }
    expect(canViewKnowledgeCard(salesUser, draftCard)).toBe(true)
  })

  it('should allow reviewer to view pending_review card', () => {
    const pendingCard = { ...baseCard, status: 'pending_review', reviewerId: 'sales-1' }
    expect(canViewKnowledgeCard(salesUser, pendingCard)).toBe(true)
  })

  it('should deny non-creator/reviewer from viewing draft card', () => {
    const draftCard = { ...baseCard, status: 'draft', creatorId: 'other-user' }
    expect(canViewKnowledgeCard(salesUser, draftCard)).toBe(false)
  })

  it('should allow same department to view department card', () => {
    const deptCard = { ...baseCard, visibilityScope: 'department' }
    expect(canViewKnowledgeCard(salesUser, deptCard)).toBe(true)
  })

  it('should deny different department from viewing department card', () => {
    const deptCard = { ...baseCard, visibilityScope: 'department', departmentId: 'dept-2' }
    expect(canViewKnowledgeCard(salesUser, deptCard)).toBe(false)
  })

  it('should allow finance to view role-scoped card', () => {
    const roleCard = { ...baseCard, visibilityScope: 'role' }
    expect(canViewKnowledgeCard(financeUser, roleCard)).toBe(true)
  })

  it('should deny sales from viewing role-scoped card in other dept', () => {
    const roleCard = { ...baseCard, visibilityScope: 'role', departmentId: 'dept-2' }
    expect(canViewKnowledgeCard(salesUser, roleCard)).toBe(false)
  })
})

// ==================== getKnowledgeCardAccess 测试 ====================

describe('getKnowledgeCardAccess', () => {
  it('should return full access for admin', () => {
    const access = getKnowledgeCardAccess(adminUser)

    expect(access.canViewAll).toBe(true)
    expect(access.canViewFinance).toBe(true)
    expect(access.canViewDepartment).toBe(true)
    expect(access.canViewPublic).toBe(true)
  })

  it('should return finance access for finance user', () => {
    const access = getKnowledgeCardAccess(financeUser)

    expect(access.canViewAll).toBe(false)
    expect(access.canViewFinance).toBe(true)
    expect(access.canViewDepartment).toBe(true)
    expect(access.canViewPublic).toBe(true)
  })

  it('should return limited access for sales user', () => {
    const access = getKnowledgeCardAccess(salesUser)

    expect(access.canViewAll).toBe(false)
    expect(access.canViewFinance).toBe(false)
    expect(access.canViewDepartment).toBe(true)
    expect(access.canViewPublic).toBe(true)
  })
})
