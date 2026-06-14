/**
 * PolicyBrief 完整审核流程集成测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AuthUser } from '@/lib/permission-guard'

// ==================== Mock 函数 ====================

const { mockFindMany, mockFindUnique, mockCreate, mockUpdate, mockDelete, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    policyBrief: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      count: mockCount,
    },
    policyLink: {
      findUnique: vi.fn().mockResolvedValue({ id: 'link-1', url: 'https://example.com' }),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { PolicyBriefService } from '@/lib/services/policy-brief'

// ==================== 测试用户 ====================

const generatorUser: AuthUser = {
  id: 'generator-1',
  name: 'Generator',
  role: 'ai_info',
  departmentId: 'dept-1',
  email: 'generator@example.com',
}

const reviewerUser: AuthUser = {
  id: 'reviewer-1',
  name: 'Reviewer',
  role: 'mentor',
  departmentId: 'dept-1',
  email: 'reviewer@example.com',
}

const adminUser: AuthUser = {
  id: 'admin-1',
  name: 'Admin',
  role: 'admin',
  departmentId: 'dept-1',
  email: 'admin@example.com',
}

// ==================== 测试 ====================

describe('PolicyBrief 完整审核流程', () => {
  let service: PolicyBriefService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PolicyBriefService()
  })

  it('should complete full review flow: draft -> pending_review -> reviewed', async () => {
    // Step 1: 创建政策简报（draft 状态）
    const draftBrief = {
      id: 'brief-1',
      policyLinkId: 'link-1',
      title: '测试政策简报',
      summary: '测试摘要',
      applicableTo: null,
      keyClauses: null,
      actionSuggestions: null,
      riskReminders: null,
      sourceUrl: 'https://example.com',
      generatorId: 'generator-1',
      reviewStatus: 'draft',
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      generator: { id: 'generator-1', name: 'Generator', role: 'ai_info' },
      policyLink: { id: 'link-1', url: 'https://example.com', title: '测试链接', customerType: 'restaurant' },
    }

    mockCreate.mockResolvedValue(draftBrief)

    const created = await service.create(
      {
        policyLinkId: 'link-1',
        title: '测试政策简报',
        summary: '测试摘要',
      },
      generatorUser
    )

    expect(created.reviewStatus).toBe('draft')

    // Step 2: 提交审核（draft -> pending_review）
    const pendingBrief = { ...draftBrief, reviewStatus: 'pending_review' }
    mockFindUnique.mockResolvedValue(draftBrief)
    mockUpdate.mockResolvedValue(pendingBrief)

    const submitted = await service.submitForReview('brief-1', generatorUser)

    expect(submitted.reviewStatus).toBe('pending_review')

    // Step 3: 审核通过（pending_review -> reviewed）
    const reviewedBrief = { ...pendingBrief, reviewStatus: 'reviewed', reviewedAt: new Date() }
    mockFindUnique.mockResolvedValue(pendingBrief)
    mockUpdate.mockResolvedValue(reviewedBrief)

    const approved = await service.approve('brief-1', reviewerUser)

    expect(approved.reviewStatus).toBe('reviewed')
    expect(approved.reviewedAt).toBeTruthy()
  })

  it('should handle rejection flow: draft -> pending_review -> rejected', async () => {
    // Step 1: 创建并提交审核
    const draftBrief = {
      id: 'brief-1',
      policyLinkId: 'link-1',
      title: '测试政策简报',
      summary: '测试摘要',
      applicableTo: null,
      keyClauses: null,
      actionSuggestions: null,
      riskReminders: null,
      sourceUrl: 'https://example.com',
      generatorId: 'generator-1',
      reviewStatus: 'draft',
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      generator: { id: 'generator-1', name: 'Generator', role: 'ai_info' },
      policyLink: { id: 'link-1', url: 'https://example.com', title: '测试链接', customerType: 'restaurant' },
    }

    const pendingBrief = { ...draftBrief, reviewStatus: 'pending_review' }
    mockFindUnique.mockResolvedValue(draftBrief)
    mockUpdate.mockResolvedValue(pendingBrief)

    await service.submitForReview('brief-1', generatorUser)

    // Step 2: 审核驳回（pending_review -> rejected）
    const rejectedBrief = { ...pendingBrief, reviewStatus: 'rejected', reviewedAt: new Date() }
    mockFindUnique.mockResolvedValue(pendingBrief)
    mockUpdate.mockResolvedValue(rejectedBrief)

    const rejected = await service.reject('brief-1', reviewerUser, '内容不完整')

    expect(rejected.reviewStatus).toBe('rejected')
  })

  it('should enforce permission checks throughout lifecycle', async () => {
    const brief = {
      id: 'brief-1',
      policyLinkId: 'link-1',
      title: '测试政策简报',
      summary: '测试摘要',
      applicableTo: null,
      keyClauses: null,
      actionSuggestions: null,
      riskReminders: null,
      sourceUrl: 'https://example.com',
      generatorId: 'generator-1',
      reviewStatus: 'draft',
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      generator: { id: 'generator-1', name: 'Generator', role: 'ai_info' },
      policyLink: { id: 'link-1', url: 'https://example.com', title: '测试链接', customerType: 'restaurant' },
    }

    // 非生成者不能编辑
    mockFindUnique.mockResolvedValue(brief)

    const otherUser: AuthUser = {
      id: 'other-1',
      name: 'Other',
      role: 'sales',
      departmentId: 'dept-2',
      email: 'other@example.com',
    }

    await expect(
      service.update('brief-1', { title: '未授权更新' }, otherUser)
    ).rejects.toThrow('无权编辑此政策简报')

    // 非审核者不能审核
    const pendingBrief = { ...brief, reviewStatus: 'pending_review' }
    mockFindUnique.mockResolvedValue(pendingBrief)

    await expect(service.approve('brief-1', otherUser)).rejects.toThrow('无权审核此政策简报')

    // 管理员可以审核
    mockFindUnique.mockResolvedValue(pendingBrief)
    mockUpdate.mockResolvedValue({ ...pendingBrief, reviewStatus: 'reviewed' })

    await expect(service.approve('brief-1', adminUser)).resolves.toBeDefined()
  })

  it('should enforce status transition rules', async () => {
    // draft 状态不能直接审核通过
    const draftBrief = {
      id: 'brief-1',
      policyLinkId: 'link-1',
      title: '测试政策简报',
      summary: '测试摘要',
      applicableTo: null,
      keyClauses: null,
      actionSuggestions: null,
      riskReminders: null,
      sourceUrl: 'https://example.com',
      generatorId: 'generator-1',
      reviewStatus: 'draft',
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      generator: { id: 'generator-1', name: 'Generator', role: 'ai_info' },
      policyLink: { id: 'link-1', url: 'https://example.com', title: '测试链接', customerType: 'restaurant' },
    }

    mockFindUnique.mockResolvedValue(draftBrief)

    await expect(service.approve('brief-1', reviewerUser)).rejects.toThrow('当前状态不允许从草稿流转到已审核')

    // reviewed 状态不能再次提交审核
    const reviewedBrief = { ...draftBrief, reviewStatus: 'reviewed' }
    mockFindUnique.mockResolvedValue(reviewedBrief)

    await expect(service.submitForReview('brief-1', generatorUser)).rejects.toThrow('当前状态不允许从已审核流转到待审核')
  })

  it('should support pagination and filtering', async () => {
    const briefs = Array.from({ length: 10 }, (_, i) => ({
      id: `brief-${i}`,
      policyLinkId: 'link-1',
      title: `政策简报 ${i}`,
      summary: `摘要 ${i}`,
      applicableTo: null,
      keyClauses: null,
      actionSuggestions: null,
      riskReminders: null,
      sourceUrl: 'https://example.com',
      generatorId: 'generator-1',
      reviewStatus: i < 5 ? 'draft' : 'reviewed',
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      generator: { id: 'generator-1', name: 'Generator', role: 'ai_info' },
      policyLink: { id: 'link-1', url: 'https://example.com', title: '测试链接', customerType: 'restaurant' },
    }))

    // 测试分页
    mockFindMany.mockResolvedValue(briefs.slice(0, 3))
    mockCount.mockResolvedValue(10)

    const result = await service.list({ page: 1, pageSize: 3 }, generatorUser)

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(10)
    expect(result.totalPages).toBe(4)

    // 测试状态过滤
    mockFindMany.mockResolvedValue(briefs.filter(b => b.reviewStatus === 'draft').slice(0, 3))
    mockCount.mockResolvedValue(5)

    const filteredResult = await service.list({ reviewStatus: 'draft' }, generatorUser)

    expect(filteredResult.items).toHaveLength(3)
    expect(filteredResult.total).toBe(5)
  })
})
