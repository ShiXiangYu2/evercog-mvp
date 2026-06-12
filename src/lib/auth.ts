/**
 * API 认证与授权中间件
 *
 * 使用 JWT Cookie 认证。
 * 所有 API 路由必须通过 withAuth 包装，确保请求经过身份验证。
 *
 * 认证方式：
 * 1. HttpOnly Cookie（推荐，浏览器自动携带）
 * 2. Authorization: Bearer <token> header（备用）
 *
 * 旧版 X-User-Id header 在迁移期间仍兼容，生产环境应禁用。
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromCookies, type TokenPayload } from './jwt'
import { prisma } from './prisma'
import { REVIEWABLE_ROLES } from './permissions'

// ==================== 类型定义 ====================

export interface AuthUser {
  id: string
  name: string
  role: string
  departmentId: string
  email: string | null
}

export interface AuthContext {
  user: AuthUser
  params?: Record<string, string>
}

export interface WithAuthOptions {
  /** 要求用户具有指定角色之一 */
  requiredRoles?: string[]
  /** 允许匿名访问（仅用于公开只读 API） */
  allowAnonymous?: boolean
}

// 使用泛型支持 Next.js 动态路由的 params 类型
export type AuthenticatedHandler = (
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: AuthContext & Record<string, any>
) => Promise<NextResponse>

// ==================== Token 提取 ====================

/**
 * 从请求中提取 JWT token
 *
 * 优先级：
 * 1. HttpOnly Cookie
 * 2. Authorization: Bearer header
 * 3. X-User-Id header（兼容旧版，生产环境应禁用）
 */
async function extractToken(request: NextRequest): Promise<{
  type: 'jwt' | 'legacy'
  token?: string
  userId?: string
}> {
  // 1. 从 Cookie 提取
  const cookieHeader = request.headers.get('cookie')
  const cookieToken = extractTokenFromCookies(cookieHeader)
  if (cookieToken) {
    return { type: 'jwt', token: cookieToken }
  }

  // 2. 从 Authorization header 提取
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return { type: 'jwt', token: authHeader.slice(7) }
  }

  // 3. 兼容旧版 X-User-Id header（仅开发环境）
  if (process.env.NODE_ENV !== 'production') {
    const legacyUserId = request.headers.get('x-user-id')
    if (legacyUserId) {
      return { type: 'legacy', userId: legacyUserId }
    }
  }

  return { type: 'jwt' }
}

/**
 * 验证 JWT token 并返回用户信息
 */
async function verifyJwtUser(token: string): Promise<AuthUser | null> {
  const payload: TokenPayload | null = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      role: true,
      departmentId: true,
      email: true,
      status: true,
    },
  })

  if (!user || user.status !== 'active') return null
  return user
}

/**
 * 通过旧版 userId 获取用户信息（兼容模式）
 */
async function getLegacyUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      departmentId: true,
      email: true,
      status: true,
    },
  })

  if (!user || user.status !== 'active') return null
  return user
}

// ==================== withAuth 中间件 ====================

/**
 * withAuth - API 路由认证包装器
 *
 * 用法：
 * ```ts
 * // 基础用法：所有用户可访问
 * export const POST = withAuth(async (request, { user }) => {
 *   return NextResponse.json({ userId: user.id })
 * })
 *
 * // 仅 admin 可访问
 * export const DELETE = withAuth(
 *   async (request, { user }) => { ... },
 *   { requiredRoles: ['admin'] }
 * )
 *
 * // 允许匿名只读
 * export const GET = withAuth(
 *   async (request, { user }) => { ... },
 *   { allowAnonymous: true }
 * )
 * ```
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (request: NextRequest, context?: Record<string, any>) => {
    // 解析 params（Next.js 传入 Promise<{ id: string }>）
    let resolvedParams: Record<string, string> | undefined
    if (context?.params) {
      resolvedParams = await context.params
    }

    // 提取 token
    const tokenInfo = await extractToken(request)

    let user: AuthUser | null = null

    if (tokenInfo.type === 'jwt' && tokenInfo.token) {
      user = await verifyJwtUser(tokenInfo.token)
    } else if (tokenInfo.type === 'legacy' && tokenInfo.userId) {
      user = await getLegacyUser(tokenInfo.userId)
    }

    // 未认证
    if (!user) {
      // 允许匿名访问（仅 GET 请求）
      if (options.allowAnonymous && request.method === 'GET') {
        return handler(request, {
          user: {
            id: '',
            name: 'anonymous',
            role: 'viewer',
            departmentId: '',
            email: null,
          },
          params: resolvedParams,
        })
      }

      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      )
    }

    // 角色检查
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      if (!options.requiredRoles.includes(user.role)) {
        return NextResponse.json(
          { error: `Access denied. Required roles: ${options.requiredRoles.join(', ')}` },
          { status: 403 }
        )
      }
    }

    return handler(request, {
      user,
      params: resolvedParams,
    })
  }
}

// ==================== 权限检查工具 ====================

/**
 * 检查用户是否有审核权限
 */
export function canReview(user: AuthUser, entityType: 'knowledge_card' | 'policy_brief' | 'sop_submission'): boolean {
  if (!REVIEWABLE_ROLES.includes(user.role as typeof REVIEWABLE_ROLES[number])) {
    return false
  }

  const rolePermissions: Record<string, string[]> = {
    admin: ['knowledge_card', 'policy_brief', 'sop_submission'],
    mentor: ['knowledge_card', 'sop_submission'],
    finance: ['knowledge_card'],
  }

  return rolePermissions[user.role]?.includes(entityType) ?? false
}

/**
 * 检查用户是否是资源的所有者
 */
export function isOwner(user: AuthUser, ownerId: string): boolean {
  return user.id === ownerId
}

/**
 * 检查用户是否是管理员
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'admin'
}

/**
 * 检查用户是否可以访问指定部门的数据
 */
export function canAccessDepartment(user: AuthUser, departmentId: string): boolean {
  if (user.role === 'admin') return true
  return user.departmentId === departmentId
}
