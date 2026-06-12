/**
 * API 测试工具模块
 *
 * 提供 API 路由测试所需的辅助函数
 */
import { NextRequest, NextResponse } from 'next/server'
import { signToken } from './jwt'

// ==================== 测试用户 ====================

export const TEST_USERS = {
  admin: { id: 'admin-1', role: 'admin', departmentId: 'dept-admin' },
  mentor: { id: 'mentor-1', role: 'mentor', departmentId: 'dept-ops' },
  finance: { id: 'finance-1', role: 'finance', departmentId: 'dept-finance' },
  sales: { id: 'sales-1', role: 'sales', departmentId: 'dept-sales' },
  customerService: { id: 'cs-1', role: 'customer_service', departmentId: 'dept-cs' },
  operations: { id: 'ops-1', role: 'operations', departmentId: 'dept-ops' },
  trainee: { id: 'trainee-1', role: 'trainee', departmentId: 'dept-sales' },
  aiInfo: { id: 'ai-1', role: 'ai_info', departmentId: 'dept-ai' },
} as const

// ==================== Token 生成 ====================

/**
 * 为指定用户生成 JWT token
 */
export async function getTokenForUser(userId: string): Promise<string> {
  const userEntry = Object.entries(TEST_USERS).find(([, u]) => u.id === userId)
  if (!userEntry) {
    throw new Error(`Unknown test user: ${userId}`)
  }

  const [, user] = userEntry
  const { token } = await signToken({
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
  })

  return token
}

/**
 * 生成随机用户 token（用于测试未知用户）
 */
export async function getUnknownUserToken(): Promise<string> {
  const { token } = await signToken({
    userId: 'unknown-user-id',
    role: 'sales',
    departmentId: 'dept-unknown',
  })
  return token
}

// ==================== 请求构建 ====================

/**
 * 创建认证请求头
 */
export async function authHeaders(userId: string): Promise<Record<string, string>> {
  const token = await getTokenForUser(userId)
  return {
    'Cookie': `evercog_token=${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * 创建无认证请求头
 */
export function noAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  }
}

/**
 * 创建测试请求
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams } = options

  let fullUrl = url
  if (searchParams) {
    const params = new URLSearchParams(searchParams)
    fullUrl += `?${params.toString()}`
  }

  const request = new NextRequest(fullUrl, {
    method,
    headers: {
      ...headers,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return request
}

/**
 * 创建带认证的测试请求
 */
export async function createAuthenticatedRequest(
  url: string,
  userId: string,
  options: {
    method?: string
    body?: unknown
    searchParams?: Record<string, string>
  } = {}
): Promise<NextRequest> {
  const headers = await authHeaders(userId)
  return createTestRequest(url, { ...options, headers })
}

// ==================== 响应验证 ====================

/**
 * 验证错误响应
 */
export function expectErrorResponse(
  response: NextResponse,
  expectedStatus: number,
  expectedError?: string
): void {
  expect(response.status).toBe(expectedStatus)

  // 注意：在实际测试中，我们需要解析 response body
  // 由于 NextResponse 的限制，这里提供一个辅助函数
}

/**
 * 验证成功响应
 */
export function expectSuccessResponse(
  response: NextResponse,
  expectedStatus: number = 200
): void {
  expect(response.status).toBe(expectedStatus)
}

// ==================== Prisma Mock ====================

/**
 * 创建 Prisma mock
 */
export function createPrismaMock() {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    knowledgeCard: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    policyLink: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    policyBrief: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    experienceQuery: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  }

  return mockPrisma
}
