/**
 * Rate Limiting 模块
 *
 * 实现 API 请求速率限制
 * 使用滑动窗口算法，支持按 IP 和用户 ID 限制
 */

// ==================== 类型定义 ====================

export interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number
  /** 最大请求数 */
  maxRequests: number
  /** 是否按用户 ID 限制（否则按 IP） */
  byUser?: boolean
  /** 自定义 key 生成函数 */
  keyGenerator?: (identifier: string) => string
}

export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean
  /** 剩余请求数 */
  remaining: number
  /** 重置时间（毫秒） */
  resetMs: number
  /** 当前请求数 */
  current: number
}

interface WindowRecord {
  count: number
  resetAt: number
}

// ==================== 内存存储 ====================

const store = new Map<string, WindowRecord>()

// 定期清理过期记录
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) {
      store.delete(key)
    }
  }
}, 60000) // 每分钟清理一次

// ==================== 核心函数 ====================

/**
 * 检查速率限制
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, keyGenerator } = config

  // 生成存储 key
  const key = keyGenerator
    ? keyGenerator(identifier)
    : `${identifier}`

  const now = Date.now()
  const record = store.get(key)

  // 检查是否需要重置窗口
  if (!record || now > record.resetAt) {
    // 新窗口
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetMs: windowMs,
      current: 1,
    }
  }

  // 检查是否超过限制
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: record.resetAt - now,
      current: record.count,
    }
  }

  // 增加计数
  record.count++

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetMs: record.resetAt - now,
    current: record.count,
  }
}

/**
 * 获取客户端标识
 */
export function getClientIdentifier(request: Request): string {
  // 优先使用 X-Forwarded-For（代理环境）
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // 使用 X-Real-IP
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // 使用 Connection 中的 IP
  // 注意：Next.js Edge Runtime 不支持 request.socket
  // 返回默认标识
  return 'unknown'
}

// ==================== 预设配置 ====================

/** 匿名用户限制: 60 次/分钟 */
export const ANONYMOUS_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  byUser: false,
}

/** 认证用户限制: 120 次/分钟 */
export const AUTHENTICATED_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 120,
  byUser: true,
}

/** 登录接口限制: 10 次/分钟 */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  byUser: false,
}

// ==================== 中间件辅助 ====================

/**
 * 创建速率限制响应
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil(result.resetMs / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      remaining: result.remaining,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.current + result.remaining),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + retryAfter),
      },
    }
  )
}

/**
 * 检查请求是否被速率限制
 */
export function isRateLimited(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): { limited: boolean; response?: Response } {
  let identifier: string

  if (config.byUser && userId) {
    identifier = `user:${userId}`
  } else {
    identifier = `ip:${getClientIdentifier(request)}`
  }

  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    return {
      limited: true,
      response: createRateLimitResponse(result),
    }
  }

  return { limited: false }
}

// ==================== 导出 ====================

export default {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  isRateLimited,
  ANONYMOUS_RATE_LIMIT,
  AUTHENTICATED_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
}
