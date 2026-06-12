/**
 * Auth 中间件测试
 * 验证 withAuth 的认证和授权逻辑
 */
import { describe, it, expect } from 'vitest'
import { canReview, isOwner, isAdmin, canAccessDepartment } from '@/lib/auth'

describe('Auth utilities', () => {
  const adminUser = { id: 'admin-1', name: '管理员', role: 'admin', departmentId: 'dept-1', email: null }
  const mentorUser = { id: 'mentor-1', name: '导师', role: 'mentor', departmentId: 'dept-1', email: null }
  const financeUser = { id: 'finance-1', name: '财务', role: 'finance', departmentId: 'dept-2', email: null }
  const salesUser = { id: 'sales-1', name: '销售', role: 'sales', departmentId: 'dept-1', email: null }

  describe('canReview', () => {
    it('admin can review knowledge cards', () => {
      expect(canReview(adminUser, 'knowledge_card')).toBe(true)
    })

    it('admin can review policy briefs', () => {
      expect(canReview(adminUser, 'policy_brief')).toBe(true)
    })

    it('admin can review SOP submissions', () => {
      expect(canReview(adminUser, 'sop_submission')).toBe(true)
    })

    it('mentor can review knowledge cards', () => {
      expect(canReview(mentorUser, 'knowledge_card')).toBe(true)
    })

    it('mentor can review SOP submissions', () => {
      expect(canReview(mentorUser, 'sop_submission')).toBe(true)
    })

    it('mentor cannot review policy briefs', () => {
      expect(canReview(mentorUser, 'policy_brief')).toBe(false)
    })

    it('finance can review knowledge cards', () => {
      expect(canReview(financeUser, 'knowledge_card')).toBe(true)
    })

    it('finance cannot review policy briefs', () => {
      expect(canReview(financeUser, 'policy_brief')).toBe(false)
    })

    it('sales cannot review anything', () => {
      expect(canReview(salesUser, 'knowledge_card')).toBe(false)
      expect(canReview(salesUser, 'policy_brief')).toBe(false)
      expect(canReview(salesUser, 'sop_submission')).toBe(false)
    })
  })

  describe('isOwner', () => {
    it('should return true when user is the owner', () => {
      expect(isOwner(salesUser, 'sales-1')).toBe(true)
    })

    it('should return false when user is not the owner', () => {
      expect(isOwner(salesUser, 'other-user')).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin', () => {
      expect(isAdmin(adminUser)).toBe(true)
    })

    it('should return false for non-admin', () => {
      expect(isAdmin(salesUser)).toBe(false)
      expect(isAdmin(mentorUser)).toBe(false)
      expect(isAdmin(financeUser)).toBe(false)
    })
  })

  describe('canAccessDepartment', () => {
    it('admin can access any department', () => {
      expect(canAccessDepartment(adminUser, 'dept-any')).toBe(true)
    })

    it('user can access own department', () => {
      expect(canAccessDepartment(salesUser, 'dept-1')).toBe(true)
    })

    it('user cannot access other department', () => {
      expect(canAccessDepartment(salesUser, 'dept-2')).toBe(false)
    })
  })
})
