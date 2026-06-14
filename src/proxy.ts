/**
 * Next.js 中间件
 *
 * 集成 CORS 和 Rate Limiting
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isRateLimited, ANONYMOUS_RATE_LIMIT, LOGIN_RATE_LIMIT } from '@/lib/rate-limit'

// ==================== CORS 配置 ====================

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'
const CORS_METHODS = process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS'
const CORS_CREDENTIALS = process.env.CORS_CREDENTIALS === 'true'

/**
 * 处理 CORS 预检请求
 */
function handleCors(request: NextRequest): NextResponse | null {
  // 只处理 OPTIONS 请求
  if (request.method !== 'OPTIONS') {
    return null
  }

  const response = new NextResponse(null, { status: 204 })

  // 设置 CORS 头
  response.headers.set('Access-Control-Allow-Origin', CORS_ORIGIN)
  response.headers.set('Access-Control-Allow-Methods', CORS_METHODS)
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 小时

  if (CORS_CREDENTIALS) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

/**
 * 为响应添加 CORS 头
 */
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', CORS_ORIGIN)

  if (CORS_CREDENTIALS) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

// ==================== Rate Limiting ====================

/**
 * 检查请求是否被速率限制
 */
function checkRateLimit(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname

  // 登录接口使用更严格的限制
  if (pathname === '/api/auth/login') {
    const { limited, response } = isRateLimited(request, LOGIN_RATE_LIMIT)
    if (limited && response) {
      return NextResponse.json(
        { error: response.statusText },
        { status: 429, headers: Object.fromEntries(response.headers.entries()) }
      )
    }
    return null
  }

  // API 接口使用通用限制
  if (pathname.startsWith('/api/')) {
    const { limited, response } = isRateLimited(request, ANONYMOUS_RATE_LIMIT)
    if (limited && response) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: Object.fromEntries(response.headers.entries()) }
      )
    }
  }

  return null
}

// ==================== 中间件主函数 ====================

export function proxy(request: NextRequest) {
  // 1. 处理 CORS 预检
  const corsResponse = handleCors(request)
  if (corsResponse) {
    return corsResponse
  }

  // 2. 检查 Rate Limiting
  const rateLimitResponse = checkRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 3. 正常处理请求
  const response = NextResponse.next()

  // 4. 添加 CORS 头
  return addCorsHeaders(response)
}

// ==================== 配置 ====================

export const config = {
  matcher: [
    /*
     * 匹配所有 API 路由
     */
    '/api/:path*',
  ],
}
