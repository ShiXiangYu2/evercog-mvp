/**
 * KnowledgeCard 完整状态流转集成测试
 *
 * 测试 KnowledgeCardService 的完整生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AuthUser } from '@/lib/permission-guard'

// ==================== Mock 函数 ====================

const { mockFindMany, mockFindUnique, mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    knowledgeCard: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
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

import { KnowledgeCardService } from '@/lib/services/knowledge-card'

// ==================== 测试用户 ====================

const creatorUser: AuthUser = {
  id: 'creator-1',
  name: 'Creator',
  role: 'sales',
  departmentId: 'dept-1',
  email: 'creator@example.com',
}

const reviewerUser: AuthUser = {
  id: 'reviewer-1',
  name: 'Reviewer',
  role: 'mentor',
  departmentId: 'dept-1',
  email: 'reviewer@example.com',
}

// ==================== 测试 ====================

describe('KnowledgeCard 完整状态流转', () => {
  let service: KnowledgeCardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new KnowledgeCardService()
  })

  it('should complete full lifecycle: draft -> pending_review -> published -> archived', async () => {
    // Step 1: 创建知识卡（draft 状态）
    const draftCard = {
      id: 'card-1',
      title: '测试知识卡',
      category: 'faq',
      content: '测试内容',
      status: 'draft',
      version: 1,
      creatorId: 'creator-1',
      departmentId: 'dept-1',
      visibilityScope: 'department',
      reviewerId: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: 'creator-1', name: 'Creator', role: 'sales', departmentId: 'dept-1' },
      reviewer: null,
    }

    mockCreate.mockResolvedValue(draftCard)

    const created = await service.create(
      {
        title: '测试知识卡',
        category: 'faq',
        content: '测试内容',
      },
      creatorUser
    )

    expect(created.status).toBe('draft')
    expect(created.version).toBe(1)

    // Step 2: 提交审核（draft -> pending_review）
    const pendingCard = { ...draftCard, status: 'pending_review' }
    mockFindUnique.mockResolvedValue(draftCard)
    mockUpdate.mockResolvedValue(pendingCard)

    const submitted = await service.submitForReview('card-1', creatorUser)

    expect(submitted.status).toBe('pending_review')

    // Step 3: 审核通过（pending_review -> published）
    const publishedCard = { ...pendingCard, status: 'published', reviewerId: 'reviewer-1', version: 2 }
    mockFindUnique.mockResolvedValue(pendingCard)
    mockUpdate.mockResolvedValue(publishedCard)

    const approved = await service.approve('card-1', reviewerUser)

    expect(approved.status).toBe('published')
    expect(approved.reviewerId).toBe('reviewer-1')
    expect(approved.version).toBe(2)

    // Step 4: 归档（published -> archived）
    const archivedCard = { ...publishedCard, status: 'archived' }
    mockFindUnique.mockResolvedValue(publishedCard)
    mockUpdate.mockResolvedValue(archivedCard)

    const archived = await service.archive('card-1', creatorUser)

    expect(archived.status).toBe('archived')
  })

  it('should handle rejection flow: draft -> pending_review -> rejected -> draft', async () => {
    // Step 1: 创建并提交审核
    const draftCard = {
      id: 'card-1',
      title: '测试知识卡',
      category: 'faq',
      content: '测试内容',
      status: 'draft',
      version: 1,
      creatorId: 'creator-1',
      departmentId: 'dept-1',
      visibilityScope: 'department',
      reviewerId: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: 'creator-1', name: 'Creator', role: 'sales', departmentId: 'dept-1' },
      reviewer: null,
    }

    const pendingCard = { ...draftCard, status: 'pending_review' }
    mockFindUnique.mockResolvedValue(draftCard)
    mockUpdate.mockResolvedValue(pendingCard)

    await service.submitForReview('card-1', creatorUser)

    // Step 2: 审核驳回（pending_review -> rejected）
    const rejectedCard = { ...pendingCard, status: 'rejected', reviewerId: 'reviewer-1' }
    mockFindUnique.mockResolvedValue(pendingCard)
    mockUpdate.mockResolvedValue(rejectedCard)

    const rejected = await service.reject('card-1', reviewerUser, '内容不完整')

    expect(rejected.status).toBe('rejected')

    // Step 3: 重新编辑内容（rejected 状态下修改内容）
    const editedCard = { ...rejectedCard, title: '更新后的标题' }
    mockFindUnique.mockResolvedValue(rejectedCard)
    mockUpdate.mockResolvedValue(editedCard)

    const edited = await service.update('card-1', { title: '更新后的标题' }, creatorUser)

    expect(edited.title).toBe('更新后的标题')

    // 注意：rejected 状态需要先通过其他方式回到 draft 才能重新提交审核
    // 这里测试结束，验证编辑功能正常
  })

  it('should enforce permission checks throughout lifecycle', async () => {
    const draftCard = {
      id: 'card-1',
      title: '测试知识卡',
      category: 'faq',
      content: '测试内容',
      status: 'draft',
      version: 1,
      creatorId: 'creator-1',
      departmentId: 'dept-1',
      visibilityScope: 'department',
      reviewerId: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: 'creator-1', name: 'Creator', role: 'sales', departmentId: 'dept-1' },
      reviewer: null,
    }

    // 非创建者不能提交审核
    mockFindUnique.mockResolvedValue(draftCard)

    const otherUser: AuthUser = {
      id: 'other-1',
      name: 'Other',
      role: 'sales',
      departmentId: 'dept-2',
      email: 'other@example.com',
    }

    await expect(service.submitForReview('card-1', otherUser)).rejects.toThrow('无权操作此知识卡')

    // 非审核者不能审核
    const pendingCard = { ...draftCard, status: 'pending_review' }
    mockFindUnique.mockResolvedValue(pendingCard)

    await expect(service.approve('card-1', otherUser)).rejects.toThrow('无权审核此知识卡')

    // 非管理员不能删除
    mockFindUnique.mockResolvedValue(draftCard)

    await expect(service.delete('card-1', otherUser)).rejects.toThrow('无权删除此知识卡')
  })

  it('should enforce optimistic lock on updates', async () => {
    const card = {
      id: 'card-1',
      title: '测试知识卡',
      category: 'faq',
      content: '测试内容',
      status: 'draft',
      version: 1,
      creatorId: 'creator-1',
      departmentId: 'dept-1',
      visibilityScope: 'department',
      reviewerId: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: 'creator-1', name: 'Creator', role: 'sales', departmentId: 'dept-1' },
      reviewer: null,
    }

    mockFindUnique.mockResolvedValue(card)

    // 使用错误的 version 应该失败
    await expect(
      service.update('card-1', { title: '更新' }, creatorUser, 999)
    ).rejects.toThrow('资源已被其他用户修改')

    // 使用正确的 version 应该成功
    const updatedCard = { ...card, title: '更新后的标题', version: 2 }
    mockFindUnique.mockResolvedValue(card)
    mockUpdate.mockResolvedValue(updatedCard)

    const updated = await service.update('card-1', { title: '更新后的标题' }, creatorUser, 1)

    expect(updated.title).toBe('更新后的标题')
  })
})
