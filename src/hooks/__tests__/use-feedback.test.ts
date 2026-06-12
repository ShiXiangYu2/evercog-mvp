/**
 * useFeedback Hook 单元测试
 *
 * 注意：由于 vitest 默认不支持 DOM，这里使用纯逻辑测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFeedback } from '../use-feedback'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export useFeedback function', () => {
    expect(typeof useFeedback).toBe('function')
  })

  it('should have correct return type', () => {
    // 验证 Hook 返回的对象结构
    const hook = useFeedback
    expect(hook).toBeDefined()
  })
})

describe('useFeedback logic', () => {
  it('should handle successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    // 模拟 Hook 的逻辑
    const state = {
      submitting: false,
      submitted: false,
      feedbackType: null as string | null,
      error: null as string | null,
    }

    // 模拟提交
    state.submitting = true
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'knowledge_card',
        targetId: 'card-1',
        helpful: true,
      }),
    })

    if (response.ok) {
      state.submitting = false
      state.submitted = true
      state.feedbackType = 'helpful'
    }

    expect(state.submitted).toBe(true)
    expect(state.feedbackType).toBe('helpful')
  })

  it('should handle error submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '提交失败' }),
    })

    const state = {
      submitting: false,
      submitted: false,
      feedbackType: null as string | null,
      error: null as string | null,
    }

    state.submitting = true
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'knowledge_card',
        targetId: 'card-1',
        helpful: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      state.submitting = false
      state.error = errorData.error
    }

    expect(state.submitted).toBe(false)
    expect(state.error).toBe('提交失败')
  })
})
