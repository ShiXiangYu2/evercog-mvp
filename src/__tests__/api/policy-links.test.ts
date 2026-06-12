/**
 * Policy Links API 测试
 * 测试政策链接的 CRUD 操作
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/policy-links/route'
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
    policyLink: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('Policy Links API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/policy-links', () => {
    it('should return 401 when not authenticated', async () => {
      const request = createTestRequest('http://localhost:3000/api/policy-links', {
        headers: noAuthHeaders(),
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should return policy links for authenticated user', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          url: 'https://example.com/policy',
          title: '测试政策',
          source: '国务院',
          status: 'submitted',
          submitterId: TEST_USERS.operations.id,
        },
      ]

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.policyLink.findMany).mockResolvedValue(mockLinks as any)
      vi.mocked(prisma.policyLink.count).mockResolvedValue(1)

      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/policy-links',
        TEST_USERS.operations.id
      )

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/policy-links', () => {
    it('should return 401 when not authenticated', async () => {
      const request = createTestRequest('http://localhost:3000/api/policy-links', {
        method: 'POST',
        headers: noAuthHeaders(),
        body: {
          url: 'https://example.com/policy',
          submitterId: TEST_USERS.operations.id,
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid URL', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/policy-links',
        TEST_USERS.operations.id,
        {
          method: 'POST',
          body: {
            url: 'not-a-url',
            submitterId: TEST_USERS.operations.id,
          },
        }
      )

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should create policy link with valid data', async () => {
      const mockLink = {
        id: 'link-new',
        url: 'https://example.com/policy',
        title: '新政策',
        source: '测试来源',
        status: 'submitted',
        submitterId: TEST_USERS.operations.id,
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.policyLink.create).mockResolvedValue(mockLink as any)

      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/policy-links',
        TEST_USERS.operations.id,
        {
          method: 'POST',
          body: {
            url: 'https://example.com/policy',
            title: '新政策',
            submitterId: TEST_USERS.operations.id,
          },
        }
      )

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })
})
