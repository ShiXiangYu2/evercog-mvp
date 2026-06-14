/**
 * PolicyBriefService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AuthUser } from '../../permission-guard'

// ==================== Mock 函数 ====================

const { mockFindMany, mockFindUnique, mockCreate, mockUpdate, mockDelete, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('../../prisma', () => ({
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

vi.mock('../../audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { PolicyBriefService } from '../policy-brief'

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

const salesUser: AuthUser = {
  id: 'sales-1',
  name: 'Sales',
  role: 'sales',
  departmentId: 'dept-1',
  email: 'sales@example.com',
}

const financeUser: AuthUser = {
  id: 'finance-1',
  name: 'Finance',
  role: 'finance',
  departmentId: 'dept-2',
  email: 'finance@example.com',
}

const mockBrief = {
  id: 'brief-1',
  policyLinkId: 'link-1',
  title: '测试政策简报',
  summary: '测试摘要',
  applicableTo: null,
  keyClauses: null,
  actionSuggestions: null,
  riskReminders: null,
  sourceUrl: 'https://example.com',
  generatorId: 'sales-1',
  reviewStatus: 'draft',
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  generator: { id: 'sales-1', name: 'Sales', role: 'sales' },
  policyLink: { id: 'link-1', url: 'https://example.com', title: '测试链接', customerType: 'restaurant', departmentId: 'dept-1' },
}

// ==================== 测试 ====================

describe('PolicyBriefService', () => {
  let service: PolicyBriefService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PolicyBriefService()
  })

  // ==================== create 测试 ====================

  describe('create', () => {
    it('should create a new policy brief', async () => {
      mockCreate.mockResolvedValue(mockBrief)

      const brief = await service.create(
        {
          policyLinkId: 'link-1',
          title: '测试政策简报',
          summary: '测试摘要',
        },
        salesUser
      )

      expect(brief.title).toBe('测试政策简报')
      expect(mockCreate).toHaveBeenCalled()
    })

    it('should throw NOT_FOUND for non-existent policy link', async () => {
      const { prisma } = await import('../../prisma')
      ;(prisma.policyLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await expect(
        service.create(
          {
            policyLinkId: 'non-existent',
            title: '测试',
            summary: '测试',
          },
          salesUser
        )
      ).rejects.toThrow('政策链接不存在')
    })
  })

  // ==================== getById 测试 ====================

  describe('getById', () => {
    it('should return brief by id', async () => {
      mockFindUnique.mockResolvedValue(mockBrief)

      const brief = await service.getById('brief-1', adminUser)

      expect(brief.id).toBe('brief-1')
    })

    it('should throw NOT_FOUND for non-existent brief', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(service.getById('non-existent', adminUser)).rejects.toThrow('政策简报不存在')
    })
  })

  // ==================== update 测试 ====================

  describe('update', () => {
    it('should update brief as generator', async () => {
      mockFindUnique.mockResolvedValue(mockBrief)
      mockUpdate.mockResolvedValue({
        ...mockBrief,
        title: '更新后的标题',
      })

      const updated = await service.update(
        'brief-1',
        { title: '更新后的标题' },
        salesUser
      )

      expect(updated.title).toBe('更新后的标题')
    })

    it('should update brief as admin', async () => {
      mockFindUnique.mockResolvedValue(mockBrief)
      mockUpdate.mockResolvedValue({
        ...mockBrief,
        title: '管理员更新',
      })

      const updated = await service.update(
        'brief-1',
        { title: '管理员更新' },
        adminUser
      )

      expect(updated.title).toBe('管理员更新')
    })

    it('should throw FORBIDDEN for non-generator', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        generatorId: 'other-user',
      })

      await expect(
        service.update('brief-1', { title: '未授权更新' }, salesUser)
      ).rejects.toThrow('无权编辑此政策简报')
    })

    it('should throw NOT_FOUND for non-existent brief', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(
        service.update('non-existent', { title: '更新' }, adminUser)
      ).rejects.toThrow('政策简报不存在')
    })
  })

  // ==================== submitForReview 测试 ====================

  describe('submitForReview', () => {
    it('should submit draft brief for review', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'draft',
      })
      mockUpdate.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'pending_review',
      })

      const submitted = await service.submitForReview('brief-1', salesUser)

      expect(submitted.reviewStatus).toBe('pending_review')
    })

    it('should throw FORBIDDEN for non-generator', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'draft',
        generatorId: 'other-user',
      })

      await expect(service.submitForReview('brief-1', salesUser)).rejects.toThrow('无权操作此政策简报')
    })

    it('should throw for invalid status transition', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'reviewed',
      })

      await expect(service.submitForReview('brief-1', adminUser)).rejects.toThrow('当前状态不允许从已审核流转到待审核')
    })
  })

  // ==================== approve 测试 ====================

  describe('approve', () => {
    it('should approve pending brief as mentor', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'pending_review',
      })
      mockUpdate.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'reviewed',
        reviewedAt: new Date(),
      })

      const approved = await service.approve('brief-1', mentorUser)

      expect(approved.reviewStatus).toBe('reviewed')
    })

    it('should approve pending brief as admin', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'pending_review',
      })
      mockUpdate.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'reviewed',
        reviewedAt: new Date(),
      })

      const approved = await service.approve('brief-1', adminUser)

      expect(approved.reviewStatus).toBe('reviewed')
    })

    it('should throw FORBIDDEN for sales user', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'pending_review',
      })

      await expect(service.approve('brief-1', salesUser)).rejects.toThrow('无权审核此政策简报')
    })

    it('should throw for invalid status transition', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'draft',
      })

      await expect(service.approve('brief-1', adminUser)).rejects.toThrow('当前状态不允许从草稿流转到已审核')
    })
  })

  // ==================== reject 测试 ====================

  describe('reject', () => {
    it('should reject pending brief', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'pending_review',
      })
      mockUpdate.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'rejected',
        reviewedAt: new Date(),
      })

      const rejected = await service.reject('brief-1', mentorUser, '内容不完整')

      expect(rejected.reviewStatus).toBe('rejected')
    })

    it('should throw FORBIDDEN for sales user', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockBrief,
        reviewStatus: 'pending_review',
      })

      await expect(
        service.reject('brief-1', salesUser, '原因')
      ).rejects.toThrow('无权审核此政策简报')
    })
  })

  // ==================== list 测试 ====================

  describe('list', () => {
    it('should list briefs with pagination', async () => {
      const briefs = Array.from({ length: 5 }, (_, i) => ({
        ...mockBrief,
        id: `brief-${i}`,
        title: `简报 ${i}`,
      }))

      mockFindMany.mockResolvedValue(briefs.slice(0, 2))
      mockCount.mockResolvedValue(5)

      const result = await service.list({ page: 1, pageSize: 2 }, salesUser)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(5)
      expect(result.totalPages).toBe(3)
      expect(mockFindMany.mock.calls[0][0].where.policyLink).toEqual({
        is: { departmentId: 'dept-1' },
      })
      expect(mockCount.mock.calls[0][0].where.policyLink).toEqual({
        is: { departmentId: 'dept-1' },
      })
    })

    it('should filter by reviewStatus', async () => {
      mockFindMany.mockResolvedValue([
        { ...mockBrief, reviewStatus: 'reviewed' },
      ])
      mockCount.mockResolvedValue(1)

      const result = await service.list({ reviewStatus: 'reviewed' }, salesUser)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].reviewStatus).toBe('reviewed')
    })

    it('should not constrain expanded visibility roles by policy link department', async () => {
      mockFindMany.mockResolvedValue([mockBrief])
      mockCount.mockResolvedValue(1)

      await service.list({ page: 1, pageSize: 20 }, financeUser)

      expect(mockFindMany.mock.calls[0][0].where.policyLink).toBeUndefined()
      expect(mockCount.mock.calls[0][0].where.policyLink).toBeUndefined()
    })
  })
})
