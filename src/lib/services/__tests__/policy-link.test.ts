/**
 * PolicyLinkService 单元测试
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

import { PolicyLinkService } from '../policy-link'

// ==================== 测试数据 ====================

const adminUser: AuthUser = {
  id: 'admin-1',
  name: 'Admin',
  role: 'admin',
  departmentId: 'dept-1',
  email: 'admin@example.com',
}

const salesUser: AuthUser = {
  id: 'sales-1',
  name: 'Sales',
  role: 'sales',
  departmentId: 'dept-1',
  email: 'sales@example.com',
}

const mockLink = {
  id: 'link-1',
  url: 'https://example.com/policy',
  title: '测试政策链接',
  source: '测试来源',
  submitterId: 'sales-1',
  departmentId: 'dept-1',
  customerType: 'restaurant',
  status: 'submitted',
  collectedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  submitter: { id: 'sales-1', name: 'Sales', role: 'sales' },
  brief: null,
}

// ==================== 测试 ====================

describe('PolicyLinkService', () => {
  let service: PolicyLinkService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PolicyLinkService()
  })

  // ==================== create 测试 ====================

  describe('create', () => {
    it('should create a new policy link', async () => {
      mockCreate.mockResolvedValue(mockLink)

      const link = await service.create(
        {
          url: 'https://example.com/policy',
          title: '测试政策链接',
          source: '测试来源',
        },
        salesUser
      )

      expect(link.url).toBe('https://example.com/policy')
      expect(mockCreate).toHaveBeenCalled()
    })

    it('should set default submitter from user', async () => {
      mockCreate.mockResolvedValue(mockLink)

      await service.create(
        {
          url: 'https://example.com/policy',
        },
        salesUser
      )

      const createCall = mockCreate.mock.calls[0][0]
      expect(createCall.data.submitterId).toBe('sales-1')
    })
  })

  // ==================== getById 测试 ====================

  describe('getById', () => {
    it('should return link by id', async () => {
      mockFindUnique.mockResolvedValue(mockLink)

      const link = await service.getById('link-1', adminUser)

      expect(link.id).toBe('link-1')
    })

    it('should throw NOT_FOUND for non-existent link', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(service.getById('non-existent', adminUser)).rejects.toThrow('政策链接不存在')
    })
  })

  // ==================== update 测试 ====================

  describe('update', () => {
    it('should update link as submitter', async () => {
      mockFindUnique.mockResolvedValue(mockLink)
      mockUpdate.mockResolvedValue({
        ...mockLink,
        title: '更新后的标题',
      })

      const updated = await service.update(
        'link-1',
        { title: '更新后的标题' },
        salesUser
      )

      expect(updated.title).toBe('更新后的标题')
    })

    it('should update link as admin', async () => {
      mockFindUnique.mockResolvedValue(mockLink)
      mockUpdate.mockResolvedValue({
        ...mockLink,
        title: '管理员更新',
      })

      const updated = await service.update(
        'link-1',
        { title: '管理员更新' },
        adminUser
      )

      expect(updated.title).toBe('管理员更新')
    })

    it('should throw FORBIDDEN for non-submitter', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockLink,
        submitterId: 'other-user',
      })

      await expect(
        service.update('link-1', { title: '未授权更新' }, salesUser)
      ).rejects.toThrow('无权编辑此政策链接')
    })

    it('should throw NOT_FOUND for non-existent link', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(
        service.update('non-existent', { title: '更新' }, adminUser)
      ).rejects.toThrow('政策链接不存在')
    })
  })

  // ==================== delete 测试 ====================

  describe('delete', () => {
    it('should delete link as admin', async () => {
      mockFindUnique.mockResolvedValue(mockLink)
      mockDelete.mockResolvedValue(mockLink)

      await service.delete('link-1', adminUser)

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      })
    })

    it('should throw FORBIDDEN for non-admin', async () => {
      mockFindUnique.mockResolvedValue(mockLink)

      await expect(service.delete('link-1', salesUser)).rejects.toThrow('无权删除此政策链接')
    })
  })

  // ==================== markAsCollected 测试 ====================

  describe('markAsCollected', () => {
    it('should mark submitted link as collected', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockLink,
        status: 'submitted',
      })
      mockUpdate.mockResolvedValue({
        ...mockLink,
        status: 'collected',
        collectedAt: new Date(),
      })

      const link = await service.markAsCollected('link-1', salesUser)

      expect(link.status).toBe('collected')
    })

    it('should throw for invalid status transition', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockLink,
        status: 'collected',
      })

      await expect(service.markAsCollected('link-1', adminUser)).rejects.toThrow('当前状态不允许标记为已采集')
    })
  })

  // ==================== list 测试 ====================

  describe('list', () => {
    it('should list links with pagination', async () => {
      // Mock 返回分页后的数据（2条）
      const paginatedLinks = [
        { ...mockLink, id: 'link-0', title: '链接 0' },
        { ...mockLink, id: 'link-1', title: '链接 1' },
      ]

      mockFindMany.mockResolvedValue(paginatedLinks)
      mockCount.mockResolvedValue(5)

      const result = await service.list({ page: 1, pageSize: 2 }, salesUser)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(5)
      expect(result.totalPages).toBe(3)
    })

    it('should filter by status', async () => {
      mockFindMany.mockResolvedValue([
        { ...mockLink, status: 'collected' },
      ])
      mockCount.mockResolvedValue(1)

      const result = await service.list({ status: 'collected' }, salesUser)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('collected')
    })
  })
})
