/**
 * LLM Provider 抽象层（兼容层）
 *
 * 重新导出自新的 llm 模块，保持向后兼容
 */

// 重新导出所有内容
export * from './llm/index'

// 兼容旧的类型导出
export type {
  BriefGenerationInput,
  BriefGenerationOutput,
  ExperienceReplyInput,
  ExperienceReplyOutput,
  SOPInspectionInput,
  SOPInspectionOutput,
  LLMProvider,
} from './llm/types'
