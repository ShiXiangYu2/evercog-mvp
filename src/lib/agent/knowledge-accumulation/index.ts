/**
 * Knowledge Accumulation 模块统一导出
 */

// 导出类型
export type {
  FillingResult,
  OptimizationResult,
  OutdatedCardAction,
} from './types'

export type { EnhancementResult } from './content-enhancer'

// 导出自动填充器
export { AutoFiller, getAutoFiller } from './auto-filler'

// 导出知识卡优化器
export { CardOptimizer, getCardOptimizer } from './card-optimizer'

// 导出内容增强器
export { ContentEnhancer, getContentEnhancer } from './content-enhancer'
