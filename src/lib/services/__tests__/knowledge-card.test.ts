/**
 * KnowledgeCardService 单元测试
 *
 * 使用 Mock 方式测试 Service 层逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AuthUser } from '../../permission-guard'

// ==================== Mock 函数（使用 vi.hoisted） ====================

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
    knowledgeCard: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      count: mockCount,
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

// 导入被测试的模块（在 mock 之后）
import { KnowledgeCardService } from '../knowledge-card'

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

const salesUser2: AuthUser = {
  id: 'sales-2',
  name: 'Sales2',
  role: 'sales',
  departmentId: 'dept-2',
  email: 'sales2@example.com',
}

const mockCard = {
  id: 'card-1',
  title: '测试知识卡',
  category: 'faq',
  tags: null,
  content: '测试内容',
  departmentId: 'dept-1',
  customerType: null,
  source: null,
  riskNotes: null,
  visibilityScope: 'department',
  status: 'draft',
  version: 1,
  creatorId: 'sales-1',
  reviewerId: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  creator: { id: 'sales-1', name: 'Sales', role: 'sales', departmentId: 'dept-1' },
  reviewer: null,
}

// ==================== 测试 ====================

describe('KnowledgeCardService', () => {
  let service: KnowledgeCardService

  beforeEach(() => {
    vi.clearAllMocks()
    mockCount.mockResolvedValue(0)
    service = new KnowledgeCardService()
  })

  // ==================== create 测试 ====================

  describe('create', () => {
    it('should create a new knowledge card', async () => {
      mockCreate.mockResolvedValue({
        ...mockCard,
        title: '新知识卡',
      })

      const card = await service.create(
        {
          title: '新知识卡',
          category: 'faq',
          content: '新内容',
        },
        salesUser
      )

      expect(card.title).toBe('新知识卡')
      expect(mockCreate).toHaveBeenCalled()
    })

    it('should set default department from user', async () => {
      mockCreate.mockResolvedValue(mockCard)

      await service.create(
        {
          title: '新知识卡',
          category: 'faq',
          content: '新内容',
        },
        salesUser
      )

      const createCall = mockCreate.mock.calls[0][0]
      expect(createCall.data.departmentId).toBe('dept-1')
    })

    it('should allow custom department', async () => {
      mockCreate.mockResolvedValue({
        ...mockCard,
        departmentId: 'dept-2',
      })

      await service.create(
        {
          title: '新知识卡',
          category: 'faq',
          content: '新内容',
          departmentId: 'dept-2',
        },
        salesUser
      )

      const createCall = mockCreate.mock.calls[0][0]
      expect(createCall.data.departmentId).toBe('dept-2')
    })
  })

  // ==================== getById 测试 ====================

  describe('getById', () => {
    it('should return card for admin', async () => {
      mockFindUnique.mockResolvedValue(mockCard)

      const card = await service.getById('card-1', adminUser)

      expect(card.id).toBe('card-1')
    })

    it('should return published card for any user', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'published',
        visibilityScope: 'public',
      })

      const card = await service.getById('card-1', salesUser2)

      expect(card.id).toBe('card-1')
    })

    it('should throw NOT_FOUND for non-existent card', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(service.getById('non-existent', adminUser)).rejects.toThrow('知识卡不存在')
    })

    it('should throw FORBIDDEN for draft card of other user', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        creatorId: 'other-user',
        status: 'draft',
      })

      await expect(service.getById('card-1', salesUser)).rejects.toThrow('无权查看此知识卡')
    })
  })

  // ==================== update 测试 ====================

  describe('update', () => {
    it('should update card as creator', async () => {
      mockFindUnique.mockResolvedValue(mockCard)
      mockUpdate.mockResolvedValue({
        ...mockCard,
        title: '更新后的标题',
      })

      const updated = await service.update(
        'card-1',
        { title: '更新后的标题' },
        salesUser
      )

      expect(updated.title).toBe('更新后的标题')
    })

    it('should update card as admin', async () => {
      mockFindUnique.mockResolvedValue(mockCard)
      mockUpdate.mockResolvedValue({
        ...mockCard,
        title: '管理员更新',
      })

      const updated = await service.update(
        'card-1',
        { title: '管理员更新' },
        adminUser
      )

      expect(updated.title).toBe('管理员更新')
    })

    it('should throw FORBIDDEN for non-creator', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        creatorId: 'other-user',
      })

      await expect(
        service.update('card-1', { title: '未授权更新' }, salesUser2)
      ).rejects.toThrow('无权编辑此知识卡')
    })

    it('should throw NOT_FOUND for non-existent card', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(
        service.update('non-existent', { title: '更新' }, adminUser)
      ).rejects.toThrow('知识卡不存在')
    })

    it('should check optimistic lock', async () => {
      mockFindUnique.mockResolvedValue(mockCard)

      await expect(
        service.update('card-1', { title: '更新' }, salesUser, 999)
      ).rejects.toThrow('资源已被其他用户修改')
    })
  })

  // ==================== delete 测试 ====================

  describe('delete', () => {
    it('should delete card as admin', async () => {
      mockFindUnique.mockResolvedValue(mockCard)
      mockDelete.mockResolvedValue(mockCard)

      await service.delete('card-1', adminUser)

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: 'card-1' },
      })
    })

    it('should throw FORBIDDEN for non-admin', async () => {
      mockFindUnique.mockResolvedValue(mockCard)

      await expect(service.delete('card-1', salesUser)).rejects.toThrow('无权删除此知识卡')
    })
  })

  // ==================== submitForReview 测试 ====================

  describe('submitForReview', () => {
    it('should submit draft card for review', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'draft',
      })
      mockUpdate.mockResolvedValue({
        ...mockCard,
        status: 'pending_review',
      })

      const submitted = await service.submitForReview('card-1', salesUser)

      expect(submitted.status).toBe('pending_review')
    })

    it('should throw FORBIDDEN for non-creator', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'draft',
        creatorId: 'other-user',
      })

      await expect(service.submitForReview('card-1', salesUser2)).rejects.toThrow('无权操作此知识卡')
    })

    it('should throw for invalid status transition', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'published',
      })

      await expect(service.submitForReview('card-1', adminUser)).rejects.toThrow('当前状态不允许从已发布流转到待审核')
    })
  })

  // ==================== approve 测试 ====================

  describe('approve', () => {
    it('should approve pending card as mentor', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'pending_review',
      })
      mockUpdate.mockResolvedValue({
        ...mockCard,
        status: 'published',
        reviewerId: 'mentor-1',
        version: 2,
      })

      const approved = await service.approve('card-1', mentorUser)

      expect(approved.status).toBe('published')
      expect(approved.reviewerId).toBe('mentor-1')
      expect(approved.version).toBe(2)
    })

    it('should approve pending card as admin', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'pending_review',
      })
      mockUpdate.mockResolvedValue({
        ...mockCard,
        status: 'published',
        reviewerId: 'admin-1',
        version: 2,
      })

      const approved = await service.approve('card-1', adminUser)

      expect(approved.status).toBe('published')
    })

    it('should throw FORBIDDEN for sales user', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'pending_review',
      })

      await expect(service.approve('card-1', salesUser)).rejects.toThrow('无权审核此知识卡')
    })

    it('should throw for invalid status transition', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'draft',
      })

      await expect(service.approve('card-1', adminUser)).rejects.toThrow('当前状态不允许从草稿流转到已发布')
    })
  })

  // ==================== reject 测试 ====================

  describe('reject', () => {
    it('should reject pending card', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'pending_review',
      })
      mockUpdate.mockResolvedValue({
        ...mockCard,
        status: 'rejected',
        reviewerId: 'mentor-1',
      })

      const rejected = await service.reject('card-1', mentorUser, '内容不完整')

      expect(rejected.status).toBe('rejected')
      expect(rejected.reviewerId).toBe('mentor-1')
    })

    it('should throw FORBIDDEN for sales user', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'pending_review',
      })

      await expect(
        service.reject('card-1', salesUser, '原因')
      ).rejects.toThrow('无权审核此知识卡')
    })
  })

  // ==================== archive 测试 ====================

  describe('archive', () => {
    it('should archive published card as creator', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'published',
        creatorId: 'sales-1',
      })
      mockUpdate.mockResolvedValue({
        ...mockCard,
        status: 'archived',
      })

      const archived = await service.archive('card-1', salesUser)

      expect(archived.status).toBe('archived')
    })

    it('should archive published card as admin', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'published',
      })
      mockUpdate.mockResolvedValue({
        ...mockCard,
        status: 'archived',
      })

      const archived = await service.archive('card-1', adminUser)

      expect(archived.status).toBe('archived')
    })

    it('should throw for invalid status transition', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockCard,
        status: 'draft',
      })

      await expect(service.archive('card-1', adminUser)).rejects.toThrow('当前状态不允许从草稿流转到已归档')
    })
  })

  // ==================== list 测试 ====================

  describe('list', () => {
    it('should list cards with pagination', async () => {
      const allCards = Array.from({ length: 5 }, (_, i) => ({
        ...mockCard,
        id: `card-${i}`,
        title: `卡片 ${i}`,
      }))

      // 返回所有卡片（新实现在内存中分页）
      mockFindMany.mockResolvedValue(allCards)

      const result = await service.list({ page: 1, pageSize: 2 }, salesUser)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(5)
      expect(result.totalPages).toBe(3)
    })

    it('should filter by status', async () => {
      mockFindMany.mockResolvedValue([
        { ...mockCard, status: 'published' },
      ])
      mockCount.mockResolvedValue(1)

      const result = await service.list({ status: 'published' }, salesUser)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('published')
    })

    it('should filter by category', async () => {
      mockFindMany.mockResolvedValue([
        { ...mockCard, category: 'faq' },
      ])
      mockCount.mockResolvedValue(1)

      const result = await service.list({ category: 'faq' }, salesUser)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].category).toBe('faq')
    })

    it('should not show draft cards of other users', async () => {
      mockFindMany.mockResolvedValue([
        { ...mockCard, creatorId: 'sales-1', status: 'draft' },
        { ...mockCard, id: 'card-2', creatorId: 'sales-2', status: 'draft' },
      ])
      mockCount.mockResolvedValue(2)

      const result = await service.list({}, salesUser)

      // 只能看到自己的 draft 卡片
      expect(result.items).toHaveLength(1)
      expect(result.items[0].creatorId).toBe('sales-1')
    })
  })
})
