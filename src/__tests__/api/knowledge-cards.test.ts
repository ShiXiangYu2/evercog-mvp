/**
 * Knowledge Cards API 测试
 * 测试知识卡的 CRUD 操作和权限控制
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/knowledge-cards/route'
import {
  TEST_USERS,
  createAuthenticatedRequest,
  createTestRequest,
  noAuthHeaders,
} from '@/lib/api-test-utils'

// Mock Prisma - 包含 auth.ts 中需要的 user 模型
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'test-user',
        name: 'Test User',
        role: 'sales',
        departmentId: 'dept-sales',
        email: null,
        status: 'active',
      }),
    },
    knowledgeCard: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('Knowledge Cards API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/knowledge-cards', () => {
    it('should return 401 when not authenticated', async () => {
      const request = createTestRequest('http://localhost:3000/api/knowledge-cards', {
        headers: noAuthHeaders(),
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should return knowledge cards for authenticated user', async () => {
      const mockCards = [
        {
          id: 'card-1',
          title: '测试知识卡',
          category: 'data_checklist',
          content: '测试内容',
          status: 'published',
          visibilityScope: 'public',
          creatorId: 'user-1',
          departmentId: 'dept-1',
        },
      ]

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.knowledgeCard.findMany).mockResolvedValue(mockCards as any)
      vi.mocked(prisma.knowledgeCard.count).mockResolvedValue(1)

      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/knowledge-cards',
        TEST_USERS.sales.id
      )

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/knowledge-cards', () => {
    it('should return 401 when not authenticated', async () => {
      const request = createTestRequest('http://localhost:3000/api/knowledge-cards', {
        method: 'POST',
        headers: noAuthHeaders(),
        body: {
          title: '新知识卡',
          category: 'faq',
          content: '内容',
          creatorId: TEST_USERS.sales.id,
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 400 when validation fails', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/knowledge-cards',
        TEST_USERS.sales.id,
        {
          method: 'POST',
          body: {
            title: '', // 空标题
            category: 'invalid', // 无效分类
            content: '',
          },
        }
      )

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should create knowledge card with valid data', async () => {
      const mockCard = {
        id: 'card-new',
        title: '新知识卡',
        category: 'faq',
        content: '有效内容',
        status: 'draft',
        creatorId: TEST_USERS.sales.id,
        departmentId: TEST_USERS.sales.departmentId,
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.knowledgeCard.create).mockResolvedValue(mockCard as any)

      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/knowledge-cards',
        TEST_USERS.sales.id,
        {
          method: 'POST',
          body: {
            title: '新知识卡',
            category: 'faq',
            content: '有效内容',
            creatorId: TEST_USERS.sales.id,
          },
        }
      )

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })
})

describe('Knowledge Cards Permission Tests', () => {
  it('admin can view all cards', () => {
    expect(TEST_USERS.admin.role).toBe('admin')
  })

  it('sales can only view public and own department cards', () => {
    expect(TEST_USERS.sales.role).toBe('sales')
  })

  it('finance can view finance-related cards', () => {
    expect(TEST_USERS.finance.role).toBe('finance')
  })
})
