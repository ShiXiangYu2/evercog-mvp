/**
 * LLM 限流测试
 *
 * 验证 LLM 调用频率限制功能
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

describe('LLM Rate Limiting', () => {
  const LLM_RATE_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 10,
  }

  beforeEach(() => {
    // 每个测试使用不同的 key 避免污染
  })

  it('should allow requests within limit', () => {
    const key = `llm:user-${Date.now()}-1`
    const result = checkRateLimit(key, LLM_RATE_LIMIT)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('should deny requests exceeding limit', () => {
    const key = `llm:user-${Date.now()}-2`

    // 消耗所有配额
    for (let i = 0; i < 10; i++) {
      checkRateLimit(key, LLM_RATE_LIMIT)
    }

    // 第 11 次应该被拒绝
    const result = checkRateLimit(key, LLM_RATE_LIMIT)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should track different users separately', () => {
    const key1 = `llm:user-${Date.now()}-a`
    const key2 = `llm:user-${Date.now()}-b`

    // user1 消耗配额
    for (let i = 0; i < 10; i++) {
      checkRateLimit(key1, LLM_RATE_LIMIT)
    }

    // user2 应该还有配额
    const result = checkRateLimit(key2, LLM_RATE_LIMIT)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('should reset window after expiry', async () => {
    const shortWindow = { windowMs: 100, maxRequests: 2 }
    const key = `llm:user-${Date.now()}-3`

    // 消耗配额
    checkRateLimit(key, shortWindow)
    checkRateLimit(key, shortWindow)

    // 第 3 次被拒绝
    const denied = checkRateLimit(key, shortWindow)
    expect(denied.allowed).toBe(false)

    // 等待窗口过期
    await new Promise(resolve => setTimeout(resolve, 150))

    // 应该恢复
    const allowed = checkRateLimit(key, shortWindow)
    expect(allowed.allowed).toBe(true)
  })
})
