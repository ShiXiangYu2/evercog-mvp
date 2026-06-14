/**
 * LLM Provider 入口文件
 *
 * 统一导出所有类型和获取 Provider 的函数
 * 包含限流、用量追踪和降级逻辑
 */

// 导出类型
export type {
  BriefGenerator,
  BriefGenerationInput,
  BriefGenerationOutput,
  ReplyGenerator,
  ExperienceReplyInput,
  ExperienceReplyOutput,
  InspectionGenerator,
  SOPInspectionInput,
  SOPInspectionOutput,
  LLMProvider,
} from './types'

// 导出 Mock 实现
export { MockBriefGenerator } from './mock-brief-generator'
export { MockReplyGenerator } from './mock-reply-generator'
export { MockInspectionGenerator } from './mock-inspection-generator'
export { MockLLMProvider } from './mock-provider'

// 导出用量追踪
export { trackUsage, getUsageStats, isOverBudget } from './usage-tracker'

// ==================== Provider 工厂 ====================

import type { LLMProvider } from './types'
import { MockLLMProvider } from './mock-provider'
import { checkRateLimit } from '@/lib/rate-limit'
import { trackUsage, isOverBudget } from './usage-tracker'
import logger from '@/lib/logger'

let _provider: LLMProvider | null = null
let _initializing = false

// ==================== LLM 限流配置 ====================

/** LLM 调用限流：每用户每分钟 10 次 */
const LLM_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
}

/**
 * 检查 LLM 调用是否被限流
 */
export function checkLLMRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const result = checkRateLimit(`llm:${userId}`, LLM_RATE_LIMIT)

  if (!result.allowed) {
    return {
      allowed: false,
      retryAfter: Math.ceil(result.resetMs / 1000),
    }
  }

  return { allowed: true }
}

/**
 * 获取 LLM Provider 实例（单例）
 *
 * 通过环境变量 LLM_PROVIDER 切换：
 * - mock（默认）：使用 MockLLMProvider
 * - deepseek：使用 DeepSeek API
 * - openai：使用 OpenAI API
 *
 * 生产环境必须配置真实 API，否则启动失败。
 */
export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider
  if (_initializing) {
    // 等待初始化完成（简单自旋，实际场景可用 Promise）
    while (_initializing && !_provider) {
      // busy wait - 在 Node.js 中可接受
    }
    return _provider!
  }

  _initializing = true

  try {
    const providerType = process.env.LLM_PROVIDER || 'mock'
    const isProduction = process.env.NODE_ENV === 'production'

    switch (providerType) {
      case 'deepseek': {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { DeepSeekLLMProvider } = require('../providers/deepseek-provider')
          _provider = new DeepSeekLLMProvider()
        } catch (error) {
          if (isProduction) {
            throw new Error(
              `Failed to load DeepSeek provider in production: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
              'Please check DEEPSEEK_API_KEY environment variable.'
            )
          }
          logger.warn('Failed to load DeepSeek provider, falling back to mock', { error: error instanceof Error ? error.message : String(error) })
          _provider = new MockLLMProvider()
        }
        break
      }
      case 'openai':
        if (isProduction) {
          throw new Error('OpenAI provider not implemented yet. Please use deepseek provider.')
        }
        logger.warn('OpenAI provider not implemented yet, falling back to mock')
        _provider = new MockLLMProvider()
        break
      case 'mock':
        if (isProduction) {
          logger.warn('[LLM] WARNING: Using mock provider in production! AI features will return fake data.')
        }
        _provider = new MockLLMProvider()
        break
      default:
        throw new Error(`Unknown LLM provider: ${providerType}. Valid options: mock, deepseek, openai`)
    }

    logger.info(`[LLM] Using provider: ${_provider?.name}`)
    return _provider!
  } finally {
    _initializing = false
  }
}

/**
 * 重置 Provider（用于测试）
 */
export function resetLLMProvider(): void {
  _provider = null
}

/**
 * 带限流、用量追踪和降级的 LLM 调用
 *
 * 执行流程：
 * 1. 检查预算
 * 2. 检查限流
 * 3. 调用 Provider
 * 4. 记录用量
 * 5. 超时降级（可选）
 */
export async function callLLMWithFallback<T>(
  operation: (provider: LLMProvider) => Promise<T>,
  options?: {
    /** 用户 ID（用于限流） */
    userId?: string
    /** 操作类型（用于追踪） */
    operationType?: string
    /** 是否禁用限流 */
    skipRateLimit?: boolean
  }
): Promise<T> {
  const provider = getLLMProvider()
  const fallbackEnabled = process.env.LLM_FALLBACK_TO_MOCK === 'true'
  const startTime = Date.now()

  // 1. 检查预算
  const overBudget = await isOverBudget()
  if (overBudget) {
    logger.warn('[LLM] Over budget, but proceeding with call')
  }

  // 2. 检查限流（跳过 mock provider）
  if (options?.userId && provider.name !== 'mock' && !options.skipRateLimit) {
    const rateCheck = checkLLMRateLimit(options.userId)
    if (!rateCheck.allowed) {
      throw new Error(`LLM rate limit exceeded. Please retry after ${rateCheck.retryAfter} seconds.`)
    }
  }

  // 3. 调用 Provider
  try {
    const result = await operation(provider)

    // 4. 记录成功用量
    const durationMs = Date.now() - startTime
    await trackUsage({
      provider: provider.name,
      operation: options?.operationType || 'unknown',
      inputTokens: 0, // 需要 Provider 返回 token 用量
      outputTokens: 0,
      durationMs,
      success: true,
      userId: options?.userId,
    })

    return result
  } catch (error) {
    const durationMs = Date.now() - startTime

    // 记录失败用量
    await trackUsage({
      provider: provider.name,
      operation: options?.operationType || 'unknown',
      inputTokens: 0,
      outputTokens: 0,
      durationMs,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: options?.userId,
    })

    // 5. 超时降级（仅开发环境）
    if (
      fallbackEnabled &&
      error instanceof Error &&
      (error.name === 'LLMTimeoutError' || error.message.includes('timeout'))
    ) {
      logger.warn(`[LLM] ${provider.name} failed, falling back to mock`, { error: error.message })
      const mockProvider = new MockLLMProvider()
      return await operation(mockProvider)
    }

    throw error
  }
}
