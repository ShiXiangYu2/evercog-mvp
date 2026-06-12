/**
 * 测试工具模块
 *
 * 提供测试所需的辅助函数：
 * - 创建测试用户并获取 JWT token
 * - 模拟认证请求
 */
import { signToken } from './jwt'

// 测试用户 ID（从 seed 数据中获取）
export const TEST_USERS = {
  admin: 'admin-1',
  mentor: 'mentor-1',
  finance: 'finance-1',
  sales: 'sales-1',
  customerService: 'cs-1',
  operations: 'ops-1',
  trainee: 'trainee-1',
  aiInfo: 'ai-1',
} as const

// 测试用户角色映射
const USER_ROLES: Record<string, { role: string; departmentId: string }> = {
  'admin-1': { role: 'admin', departmentId: 'dept-admin' },
  'mentor-1': { role: 'mentor', departmentId: 'dept-ops' },
  'finance-1': { role: 'finance', departmentId: 'dept-finance' },
  'sales-1': { role: 'sales', departmentId: 'dept-sales' },
  'cs-1': { role: 'customer_service', departmentId: 'dept-cs' },
  'ops-1': { role: 'operations', departmentId: 'dept-ops' },
  'trainee-1': { role: 'trainee', departmentId: 'dept-sales' },
  'ai-1': { role: 'ai_info', departmentId: 'dept-ai' },
}

/**
 * 为指定用户生成 JWT token
 */
export async function getTokenForUser(userId: string): Promise<string> {
  const userInfo = USER_ROLES[userId]
  if (!userInfo) {
    throw new Error(`Unknown test user: ${userId}`)
  }

  const { token } = await signToken({
    userId,
    role: userInfo.role,
    departmentId: userInfo.departmentId,
  })

  return token
}

/**
 * 创建带头认证的请求头
 */
export async function authHeaders(userId: string): Promise<Record<string, string>> {
  const token = await getTokenForUser(userId)
  return {
    'Cookie': `evercog_token=${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * 创建不带认证的请求头
 */
export function noAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  }
}
