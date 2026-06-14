/**
 * PolicyLink 完整生命周期集成测试
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
    policyLink: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      count: mockCount,
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

import { PolicyLinkService } from '@/lib/services/policy-link'

// ==================== 测试用户 ====================

const submitterUser: AuthUser = {
  id: 'submitter-1',
  name: 'Submitter',
  role: 'sales',
  departmentId: 'dept-1',
  email: 'submitter@example.com',
}

const adminUser: AuthUser = {
  id: 'admin-1',
  name: 'Admin',
  role: 'admin',
  departmentId: 'dept-1',
  email: 'admin@example.com',
}

// ==================== 测试 ====================

describe('PolicyLink 完整生命周期', () => {
  let service: PolicyLinkService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PolicyLinkService()
  })

  it('should complete full lifecycle: submitted -> collected -> brief_generated -> reviewed -> pushed', async () => {
    // Step 1: 创建政策链接（submitted 状态）
    const submittedLink = {
      id: 'link-1',
      url: 'https://example.com/policy',
      title: '测试政策链接',
      source: '测试来源',
      submitterId: 'submitter-1',
      departmentId: 'dept-1',
      customerType: 'restaurant',
      status: 'submitted',
      collectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      submitter: { id: 'submitter-1', name: 'Submitter', role: 'sales' },
      brief: null,
    }

    mockCreate.mockResolvedValue(submittedLink)

    const created = await service.create(
      {
        url: 'https://example.com/policy',
        title: '测试政策链接',
        source: '测试来源',
        customerType: 'restaurant',
      },
      submitterUser
    )

    expect(created.status).toBe('submitted')

    // Step 2: 标记为已采集（submitted -> collected）
    const collectedLink = { ...submittedLink, status: 'collected', collectedAt: new Date() }
    mockFindUnique.mockResolvedValue(submittedLink)
    mockUpdate.mockResolvedValue(collectedLink)

    const collected = await service.markAsCollected('link-1', submitterUser)

    expect(collected.status).toBe('collected')
    expect(collected.collectedAt).toBeTruthy()

    // Step 3: 更新状态为已生成简报（collected -> brief_generated）
    const briefGeneratedLink = { ...collectedLink, status: 'brief_generated' }
    mockFindUnique.mockResolvedValue(collectedLink)
    mockUpdate.mockResolvedValue(briefGeneratedLink)

    const briefGenerated = await service.update(
      'link-1',
      { status: 'brief_generated' },
      adminUser
    )

    expect(briefGenerated.status).toBe('brief_generated')

    // Step 4: 更新状态为已审核（brief_generated -> reviewed）
    const reviewedLink = { ...briefGeneratedLink, status: 'reviewed' }
    mockFindUnique.mockResolvedValue(briefGeneratedLink)
    mockUpdate.mockResolvedValue(reviewedLink)

    const reviewed = await service.update(
      'link-1',
      { status: 'reviewed' },
      adminUser
    )

    expect(reviewed.status).toBe('reviewed')

    // Step 5: 更新状态为已推送（reviewed -> pushed）
    const pushedLink = { ...reviewedLink, status: 'pushed' }
    mockFindUnique.mockResolvedValue(reviewedLink)
    mockUpdate.mockResolvedValue(pushedLink)

    const pushed = await service.update(
      'link-1',
      { status: 'pushed' },
      adminUser
    )

    expect(pushed.status).toBe('pushed')
  })

  it('should enforce permission checks', async () => {
    const link = {
      id: 'link-1',
      url: 'https://example.com/policy',
      title: '测试政策链接',
      source: '测试来源',
      submitterId: 'submitter-1',
      departmentId: 'dept-1',
      customerType: 'restaurant',
      status: 'submitted',
      collectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      submitter: { id: 'submitter-1', name: 'Submitter', role: 'sales' },
      brief: null,
    }

    // 非提交者不能编辑
    mockFindUnique.mockResolvedValue(link)

    const otherUser: AuthUser = {
      id: 'other-1',
      name: 'Other',
      role: 'sales',
      departmentId: 'dept-2',
      email: 'other@example.com',
    }

    await expect(
      service.update('link-1', { title: '未授权更新' }, otherUser)
    ).rejects.toThrow('无权编辑此政策链接')

    // 非管理员不能删除
    mockFindUnique.mockResolvedValue(link)

    await expect(service.delete('link-1', otherUser)).rejects.toThrow('无权删除此政策链接')

    // 管理员可以删除
    mockFindUnique.mockResolvedValue(link)
    mockDelete.mockResolvedValue(link)

    await expect(service.delete('link-1', adminUser)).resolves.toBeUndefined()
  })

  it('should enforce status transition rules', async () => {
    const link = {
      id: 'link-1',
      url: 'https://example.com/policy',
      title: '测试政策链接',
      source: '测试来源',
      submitterId: 'submitter-1',
      departmentId: 'dept-1',
      customerType: 'restaurant',
      status: 'collected',
      collectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      submitter: { id: 'submitter-1', name: 'Submitter', role: 'sales' },
      brief: null,
    }

    // collected 状态不能再次标记为 collected
    mockFindUnique.mockResolvedValue(link)

    await expect(service.markAsCollected('link-1', submitterUser)).rejects.toThrow('当前状态不允许从已采集流转到已采集')
  })

  it('should support pagination and filtering', async () => {
    const links = Array.from({ length: 10 }, (_, i) => ({
      id: `link-${i}`,
      url: `https://example.com/policy-${i}`,
      title: `政策链接 ${i}`,
      source: '测试来源',
      submitterId: 'submitter-1',
      departmentId: 'dept-1',
      customerType: 'restaurant',
      status: i < 5 ? 'submitted' : 'collected',
      collectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      submitter: { id: 'submitter-1', name: 'Submitter', role: 'sales' },
      brief: null,
    }))

    // 测试分页
    mockFindMany.mockResolvedValue(links.slice(0, 3))
    mockCount.mockResolvedValue(10)

    const result = await service.list({ page: 1, pageSize: 3 }, submitterUser)

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(10)
    expect(result.totalPages).toBe(4)

    // 测试状态过滤
    mockFindMany.mockResolvedValue(links.filter(l => l.status === 'submitted').slice(0, 3))
    mockCount.mockResolvedValue(5)

    const filteredResult = await service.list({ status: 'submitted' }, submitterUser)

    expect(filteredResult.items).toHaveLength(3)
    expect(filteredResult.total).toBe(5)
  })
})
