/**
 * JWT 认证工具模块
 *
 * 使用 jose 库实现 JWT 签发和验证。
 * Token 存储在 HttpOnly Cookie 中，防止 XSS 攻击。
 *
 * 环境变量：
 * - JWT_SECRET: JWT 签名密钥（必须设置）
 * - JWT_EXPIRES_IN: Token 有效期（默认 24h）
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// ==================== 类型定义 ====================

export interface TokenPayload extends JWTPayload {
  userId: string
  role: string
  departmentId: string
}

export interface TokenResult {
  token: string
  expiresAt: Date
}

// ==================== 常量 ====================

const COOKIE_NAME = 'evercog_token'
const DEFAULT_EXPIRES_IN = '24h'

// ==================== 密钥管理 ====================

const DEFAULT_JWT_SECRET = 'change-this-to-a-strong-random-string-in-production'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  // 生产环境检测弱密钥
  if (process.env.NODE_ENV === 'production' && secret === DEFAULT_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is using the default value! ' +
      'Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }

  return new TextEncoder().encode(secret)
}

// ==================== Token 操作 ====================

/**
 * 签发 JWT Token
 */
export async function signToken(payload: {
  userId: string
  role: string
  departmentId: string
}): Promise<TokenResult> {
  const secret = getSecret()
  const expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN

  const expiresAt = new Date()
  // 解析有效期（简单支持小时和天）
  if (expiresIn.endsWith('h')) {
    expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn))
  } else if (expiresIn.endsWith('d')) {
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn))
  } else {
    expiresAt.setHours(expiresAt.getHours() + 24) // 默认 24h
  }

  const token = await new SignJWT({
    userId: payload.userId,
    role: payload.role,
    departmentId: payload.departmentId,
  } satisfies Omit<TokenPayload, 'iat' | 'exp' | 'iss'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('evercog')
    .setExpirationTime(expiresIn)
    .sign(secret)

  return { token, expiresAt }
}

/**
 * 验证并解码 JWT Token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'evercog',
    })
    return payload as TokenPayload
  } catch {
    return null
  }
}

// ==================== Cookie 操作 ====================

/**
 * 获取 Cookie 名称
 */
export function getCookieName(): string {
  return COOKIE_NAME
}

/**
 * 创建 Set-Cookie 头
 */
export function createCookieHeader(token: string, expiresAt: Date): string {
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
    // 生产环境启用 Secure
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ].join('; ')
}

/**
 * 创建清除 Cookie 的头
 */
export function createClearCookieHeader(): string {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ')
}

/**
 * 从 Cookie 头中提取 token
 */
export function extractTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=')
    if (name === COOKIE_NAME) {
      return valueParts.join('=')
    }
  }
  return null
}
