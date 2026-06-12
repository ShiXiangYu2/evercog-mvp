/**
 * Experience Query API 测试
 * 测试经验调用功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/experience/query/route'
import {
  TEST_USERS,
  createAuthenticatedRequest,
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
    },
    experienceQuery: {
      create: vi.fn(),
    },
  },
}))

// Mock Audit Log
vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

// Mock LLM Provider
vi.mock('@/lib/llm-provider', () => ({
  getLLMProvider: vi.fn(() => ({
    name: 'mock',
    generateExperienceReply: vi.fn().mockResolvedValue({
      policyExplanation: '测试政策解释',
      serviceOpportunity: '测试服务机会',
      salesScript: '测试销售话术',
      riskReminder: '测试风险提醒',
      citedSources: [],
    }),
  })),
}))

describe('Experience Query API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/experience/query', () => {
    it('should return 401 when not authenticated', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/experience/query',
        TEST_USERS.sales.id,
        {
          method: 'POST',
          body: {
            question: '餐饮客户代账需要什么材料？',
          },
        }
      )

      // 模拟未认证
      const unauthRequest = new Request(request.url, {
        method: 'POST',
        headers: noAuthHeaders(),
        body: JSON.stringify({
          question: '餐饮客户代账需要什么材料？',
        }),
      })

      const response = await POST(unauthRequest as any)
      expect(response.status).toBe(401)
    })

    it('should return 400 when question is empty', async () => {
      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/experience/query',
        TEST_USERS.sales.id,
        {
          method: 'POST',
          body: {
            question: '',
          },
        }
      )

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should process valid question', async () => {
      const { prisma } = await import('@/lib/prisma')

      // Mock 知识卡搜索结果
      vi.mocked(prisma.knowledgeCard.findMany).mockResolvedValue([
        {
          id: 'card-1',
          title: '餐饮代账资料清单',
          content: '基础资料内容',
          category: 'data_checklist',
          tags: '["餐饮"]',
          source: '财务部',
          riskNotes: '注意',
          status: 'published',
          visibilityScope: 'public',
          departmentId: 'dept-finance',
          creatorId: 'user-1',
        },
      ] as any)

      // Mock 创建查询记录
      vi.mocked(prisma.experienceQuery.create).mockResolvedValue({
        id: 'query-1',
        question: '餐饮客户代账需要什么材料？',
        callerId: TEST_USERS.sales.id,
        status: 'generated',
      } as any)

      // Mock audit log
      const { createAuditLog } = await import('@/lib/audit')
      vi.mocked(createAuditLog).mockResolvedValue(undefined)

      const request = await createAuthenticatedRequest(
        'http://localhost:3000/api/experience/query',
        TEST_USERS.sales.id,
        {
          method: 'POST',
          body: {
            question: '餐饮客户代账需要什么材料？',
            callerId: TEST_USERS.sales.id,
          },
        }
      )

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
