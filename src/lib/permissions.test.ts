/**
 * Permissions 单元测试
 * 验证知识卡可见性判断逻辑
 */
import { describe, it, expect } from 'vitest'
import {
  canViewKnowledgeCard,
  canReviewKnowledgeCard,
  filterKnowledgeCards,
  type KnowledgeCard,
} from './permissions'

describe('canViewKnowledgeCard', () => {
  const baseCard = {
    id: '1',
    title: '测试知识卡',
    visibilityScope: 'public',
    departmentId: 'dept-1',
    status: 'published',
    creatorId: 'user-1',
    reviewerId: null,
  }

  const adminUser = { id: 'admin-1', name: '管理员', role: 'admin', departmentId: 'dept-1' }
  const financeUser = { id: 'finance-1', name: '财务', role: 'finance', departmentId: 'dept-2' }
  const salesUser = { id: 'sales-1', name: '销售', role: 'sales', departmentId: 'dept-1' }
  const otherDeptSales = { id: 'sales-2', name: '其他销售', role: 'sales', departmentId: 'dept-99' }

  it('admin can view all published cards', () => {
    const card = { ...baseCard, visibilityScope: 'department', departmentId: 'dept-99' }
    expect(canViewKnowledgeCard(adminUser, card)).toBe(true)
  })

  it('sales can view public cards', () => {
    expect(canViewKnowledgeCard(salesUser, baseCard)).toBe(true)
  })

  it('sales cannot view department cards from other departments', () => {
    const card = { ...baseCard, visibilityScope: 'department', departmentId: 'dept-2' }
    expect(canViewKnowledgeCard(otherDeptSales, card)).toBe(false)
  })

  it('sales can view department cards from own department', () => {
    const card = { ...baseCard, visibilityScope: 'department', departmentId: 'dept-1' }
    expect(canViewKnowledgeCard(salesUser, card)).toBe(true)
  })

  it('non-published cards only visible to creator and reviewer', () => {
    const draftCard = { ...baseCard, status: 'draft', creatorId: 'user-1' }
    expect(canViewKnowledgeCard(adminUser, draftCard, 'dept-1')).toBe(false)
    expect(canViewKnowledgeCard(salesUser, draftCard, 'dept-1')).toBe(false)
  })

  it('creator can view their own draft card', () => {
    const creator = { id: 'user-1', name: '创建者', role: 'sales', departmentId: 'dept-1' }
    const draftCard = { ...baseCard, status: 'draft', creatorId: 'user-1' }
    expect(canViewKnowledgeCard(creator, draftCard)).toBe(true)
  })

  it('finance user can view role-scoped cards', () => {
    const card = { ...baseCard, visibilityScope: 'role' }
    expect(canViewKnowledgeCard(financeUser, card)).toBe(true)
  })

  it('sales cannot view role-scoped cards from other departments', () => {
    const card = { ...baseCard, visibilityScope: 'role', departmentId: 'dept-2' }
    expect(canViewKnowledgeCard(salesUser, card)).toBe(false)
  })
})

describe('canReviewKnowledgeCard', () => {
  const baseCard = {
    id: '1',
    title: '测试',
    visibilityScope: 'public',
    departmentId: 'dept-1',
    status: 'pending_review',
    creatorId: 'user-1',
    reviewerId: null,
  }

  it('admin can review pending cards', () => {
    const user = { id: 'a', name: 'A', role: 'admin', departmentId: 'd' }
    expect(canReviewKnowledgeCard(user, baseCard)).toBe(true)
  })

  it('mentor can review pending cards', () => {
    const user = { id: 'm', name: 'M', role: 'mentor', departmentId: 'd' }
    expect(canReviewKnowledgeCard(user, baseCard)).toBe(true)
  })

  it('finance can review pending cards', () => {
    const user = { id: 'f', name: 'F', role: 'finance', departmentId: 'd' }
    expect(canReviewKnowledgeCard(user, baseCard)).toBe(true)
  })

  it('sales cannot review cards', () => {
    const user = { id: 's', name: 'S', role: 'sales', departmentId: 'd' }
    expect(canReviewKnowledgeCard(user, baseCard)).toBe(false)
  })

  it('cannot review non-pending cards', () => {
    const user = { id: 'a', name: 'A', role: 'admin', departmentId: 'd' }
    const publishedCard = { ...baseCard, status: 'published' }
    expect(canReviewKnowledgeCard(user, publishedCard)).toBe(false)
  })
})

describe('filterKnowledgeCards', () => {
  const cards: KnowledgeCard[] = [
    { id: '1', title: '公开卡', visibilityScope: 'public', departmentId: 'd1', status: 'published', creatorId: 'u1' },
    { id: '2', title: '部门卡', visibilityScope: 'department', departmentId: 'd1', status: 'published', creatorId: 'u2' },
    { id: '3', title: '其他部门卡', visibilityScope: 'department', departmentId: 'd2', status: 'published', creatorId: 'u3' },
    { id: '4', title: '草稿卡', visibilityScope: 'public', departmentId: 'd1', status: 'draft', creatorId: 'u5' },
  ]

  it('admin sees all published cards', () => {
    const user = { id: 'a', name: 'A', role: 'admin', departmentId: 'd1' }
    const result = filterKnowledgeCards(user, cards)
    expect(result.length).toBe(3) // 3 published cards
  })

  it('sales sees public + own department cards', () => {
    const user = { id: 's', name: 'S', role: 'sales', departmentId: 'd1' }
    const result = filterKnowledgeCards(user, cards)
    expect(result.length).toBe(2) // public + dept-1
  })

  it('sales from other dept sees only public', () => {
    const user = { id: 's2', name: 'S2', role: 'sales', departmentId: 'd99' }
    const result = filterKnowledgeCards(user, cards)
    expect(result.length).toBe(1) // only public
  })
})
