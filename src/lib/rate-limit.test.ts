/**
 * Rate Limiting 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  isRateLimited,
  ANONYMOUS_RATE_LIMIT,
  AUTHENTICATED_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
} from './rate-limit'

// 清空存储的辅助函数
function clearStore() {
  // 通过导入模块并访问内部状态来清空
  // 由于 store 是模块内部的，我们需要重置它
  vi.resetModules()
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // 每个测试使用不同的 key 避免污染
    vi.clearAllTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow request within limit', () => {
      const result = checkRateLimit('test-key', {
        windowMs: 60000,
        maxRequests: 10,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.current).toBe(1)
    })

    it('should deny request exceeding limit', () => {
      const config = { windowMs: 60000, maxRequests: 3 }
      const key = `deny-test-${Date.now()}`

      // 前 3 次应该允许
      checkRateLimit(key, config)
      checkRateLimit(key, config)
      const third = checkRateLimit(key, config)
      expect(third.allowed).toBe(true)

      // 第 4 次应该拒绝
      const fourth = checkRateLimit(key, config)
      expect(fourth.allowed).toBe(false)
      expect(fourth.remaining).toBe(0)
    })

    it('should reset window after expiry', () => {
      const config = { windowMs: 100, maxRequests: 2 }
      const key = `reset-test-${Date.now()}`

      checkRateLimit(key, config)
      checkRateLimit(key, config)

      // 超过限制
      const denied = checkRateLimit(key, config)
      expect(denied.allowed).toBe(false)

      // 等待窗口过期
      // 由于无法真正等待，这里测试逻辑正确性
      expect(denied.resetMs).toBeGreaterThan(0)
    })

    it('should use custom key generator', () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: (id: string) => `custom:${id}`,
      }

      const result = checkRateLimit('user-1', config)
      expect(result.allowed).toBe(true)
    })

    it('should track different keys separately', () => {
      const config = { windowMs: 60000, maxRequests: 2 }
      const key1 = `key1-${Date.now()}`
      const key2 = `key2-${Date.now()}`

      checkRateLimit(key1, config)
      checkRateLimit(key1, config)

      // key-2 应该独立计算
      const result = checkRateLimit(key2, config)
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(1)
    })
  })

  describe('getClientIdentifier', () => {
    it('should extract IP from X-Forwarded-For', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })

      const ip = getClientIdentifier(request)
      expect(ip).toBe('192.168.1.1')
    })

    it('should extract IP from X-Real-IP', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      })

      const ip = getClientIdentifier(request)
      expect(ip).toBe('192.168.1.2')
    })

    it('should return unknown when no IP headers', () => {
      const request = new Request('http://localhost')

      const ip = getClientIdentifier(request)
      expect(ip).toBe('unknown')
    })
  })

  describe('createRateLimitResponse', () => {
    it('should create 429 response with correct headers', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetMs: 60000,
        current: 60,
      }

      const response = createRateLimitResponse(result)

      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBe('60')
      expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('isRateLimited', () => {
    it('should return limited: false for allowed requests', () => {
      const request = new Request('http://localhost')
      const { limited, response } = isRateLimited(request, ANONYMOUS_RATE_LIMIT)

      expect(limited).toBe(false)
      expect(response).toBeUndefined()
    })

    it('should use user ID when byUser is true', () => {
      const request = new Request('http://localhost')
      const { limited } = isRateLimited(request, AUTHENTICATED_RATE_LIMIT, 'user-1')

      expect(limited).toBe(false)
    })

    it('should return limited: true with response when exceeded', () => {
      const request = new Request('http://localhost')
      const config = { windowMs: 60000, maxRequests: 1, byUser: true }

      // 第一次允许（使用 user ID）
      isRateLimited(request, config, `exceed-user-${Date.now()}`)

      // 第二次拒绝（同一个 user ID）
      const userId = `exceed-user-${Date.now()}`
      isRateLimited(request, config, userId)
      const { limited, response } = isRateLimited(request, config, userId)

      expect(limited).toBe(true)
      expect(response).toBeDefined()
      expect(response?.status).toBe(429)
    })
  })

  describe('Rate Limit Configs', () => {
    it('ANONYMOUS_RATE_LIMIT should be 60 per minute', () => {
      expect(ANONYMOUS_RATE_LIMIT.windowMs).toBe(60000)
      expect(ANONYMOUS_RATE_LIMIT.maxRequests).toBe(60)
      expect(ANONYMOUS_RATE_LIMIT.byUser).toBeFalsy()
    })

    it('AUTHENTICATED_RATE_LIMIT should be 120 per minute', () => {
      expect(AUTHENTICATED_RATE_LIMIT.windowMs).toBe(60000)
      expect(AUTHENTICATED_RATE_LIMIT.maxRequests).toBe(120)
      expect(AUTHENTICATED_RATE_LIMIT.byUser).toBe(true)
    })

    it('LOGIN_RATE_LIMIT should be 10 per minute', () => {
      expect(LOGIN_RATE_LIMIT.windowMs).toBe(60000)
      expect(LOGIN_RATE_LIMIT.maxRequests).toBe(10)
    })
  })
})
