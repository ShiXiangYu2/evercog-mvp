/**
 * LLM Provider 入口文件
 *
 * 统一导出所有类型和获取 Provider 的函数
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

// ==================== Provider 工厂 ====================

import type { LLMProvider } from './types'
import { MockLLMProvider } from './mock-provider'

let _provider: LLMProvider | null = null

/**
 * 获取 LLM Provider 实例（单例）
 *
 * 通过环境变量 LLM_PROVIDER 切换：
 * - mock（默认）：使用 MockLLMProvider
 * - deepseek：使用 DeepSeek API
 * - openai：使用 OpenAI API
 */
export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider

  const providerType = process.env.LLM_PROVIDER || 'mock'

  switch (providerType) {
    case 'deepseek': {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { DeepSeekLLMProvider } = require('../providers/deepseek-provider')
        _provider = new DeepSeekLLMProvider()
      } catch (error) {
        console.warn('Failed to load DeepSeek provider, falling back to mock:', error)
        _provider = new MockLLMProvider()
      }
      break
    }
    case 'openai':
      console.warn('OpenAI provider not implemented yet, falling back to mock')
      _provider = new MockLLMProvider()
      break
    default:
      _provider = new MockLLMProvider()
  }

  console.log(`[LLM] Using provider: ${_provider?.name}`)
  return _provider!
}

/**
 * 重置 Provider（用于测试）
 */
export function resetLLMProvider(): void {
  _provider = null
}

/**
 * 带降级的 LLM 调用
 */
export async function callLLMWithFallback<T>(
  operation: (provider: LLMProvider) => Promise<T>
): Promise<T> {
  const provider = getLLMProvider()
  const fallbackEnabled = process.env.LLM_FALLBACK_TO_MOCK === 'true'

  try {
    return await operation(provider)
  } catch (error) {
    if (
      fallbackEnabled &&
      error instanceof Error &&
      (error.name === 'LLMTimeoutError' || error.message.includes('timeout'))
    ) {
      console.warn(`[LLM] ${provider.name} failed, falling back to mock:`, error.message)
      const mockProvider = new MockLLMProvider()
      return await operation(mockProvider)
    }
    throw error
  }
}
