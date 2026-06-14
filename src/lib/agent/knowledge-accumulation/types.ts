/**
 * Knowledge Accumulation 类型定义
 */

// ==================== 自动填充 ====================

export interface FillingResult {
  gapId: string
  cardId: string
  method: 'llm_generated' | 'template_based' | 'hybrid'
  confidence: number
  contentQuality: number
  needsReview: boolean
}

// ==================== 卡片优化 ====================

export interface OptimizationResult {
  cardId: string
  changes: Array<{
    field: string
    oldValue: string
    newValue: string
    reason: string
  }>
  confidence: number
  needsReview: boolean
}

// ==================== 过期卡片处理 ====================

export interface OutdatedCardAction {
  cardId: string
  action: 'flag_for_review' | 'auto_archive' | 'suggest_update'
  reason: string
  lastUpdated: Date
  daysSinceUpdate: number
}
