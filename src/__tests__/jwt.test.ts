/**
 * JWT 工具模块测试
 * 验证 token 签发、验证、Cookie 操作
 */
import { describe, it, expect } from 'vitest'
import {
  signToken,
  verifyToken,
  createCookieHeader,
  createClearCookieHeader,
  extractTokenFromCookies,
} from '@/lib/jwt'

describe('JWT Module', () => {
  const testPayload = {
    userId: 'user-1',
    role: 'sales',
    departmentId: 'dept-1',
  }

  describe('signToken', () => {
    it('should generate a valid JWT token', async () => {
      const result = await signToken(testPayload)

      expect(result.token).toBeTruthy()
      expect(typeof result.token).toBe('string')
      expect(result.token.split('.')).toHaveLength(3) // header.payload.signature
      expect(result.expiresAt).toBeInstanceOf(Date)
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should generate different tokens for different users', async () => {
      const token1 = await signToken({ ...testPayload, userId: 'user-1' })
      const token2 = await signToken({ ...testPayload, userId: 'user-2' })

      expect(token1.token).not.toBe(token2.token)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const { token } = await signToken(testPayload)
      const payload = await verifyToken(token)

      expect(payload).toBeTruthy()
      expect(payload?.userId).toBe('user-1')
      expect(payload?.role).toBe('sales')
      expect(payload?.departmentId).toBe('dept-1')
    })

    it('should reject an invalid token', async () => {
      const payload = await verifyToken('invalid.token.here')
      expect(payload).toBeNull()
    })

    it('should reject a token with wrong issuer', async () => {
      const { SignJWT } = await import('jose')
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test')

      const token = await new SignJWT({
        userId: 'user-1',
        role: 'sales',
        departmentId: 'dept-1',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('wrong-issuer')
        .sign(secret)

      const payload = await verifyToken(token)
      expect(payload).toBeNull()
    })

    it('should reject an expired token', async () => {
      const { SignJWT } = await import('jose')
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test')

      const token = await new SignJWT({
        userId: 'user-1',
        role: 'sales',
        departmentId: 'dept-1',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('evercog')
        .setExpirationTime('0s') // 立即过期
        .sign(secret)

      // 等待一小段时间确保过期
      await new Promise((resolve) => setTimeout(resolve, 100))

      const payload = await verifyToken(token)
      expect(payload).toBeNull()
    })
  })

  describe('Cookie operations', () => {
    it('should create a valid Set-Cookie header', () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const header = createCookieHeader('test-token', expiresAt)

      expect(header).toContain('evercog_token=test-token')
      expect(header).toContain('Path=/')
      expect(header).toContain('HttpOnly')
      expect(header).toContain('SameSite=Lax')
    })

    it('should create a clear cookie header', () => {
      const header = createClearCookieHeader()

      expect(header).toContain('evercog_token=')
      expect(header).toContain('Max-Age=0')
    })

    it('should extract token from cookie header', () => {
      const cookieHeader = 'evercog_token=abc123; other_cookie=xyz'
      const token = extractTokenFromCookies(cookieHeader)

      expect(token).toBe('abc123')
    })

    it('should return null for missing cookie', () => {
      const token = extractTokenFromCookies(null)
      expect(token).toBeNull()
    })

    it('should return null for empty cookie header', () => {
      const token = extractTokenFromCookies('')
      expect(token).toBeNull()
    })
  })
})
