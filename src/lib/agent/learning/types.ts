/**
 * Learning System 类型定义
 */

// ==================== 模式 ====================

export type PatternType =
  | 'feedback_quality'   // 反馈质量模式
  | 'review_issue'       // 审核问题模式
  | 'qa_miss'            // 问答匹配失败模式
  | 'coverage_gap'       // 覆盖缺口模式
  | 'rule_adjustment'    // 规则调整建议

export type PatternStatus = 'active' | 'deprecated' | 'superseded'

export interface LearningPattern {
  id: string
  patternType: PatternType
  category?: string
  description: string
  frequency: number
  confidence: number
  evidence?: unknown
  suggestedAction?: string
  status: PatternStatus
  learnedAt: Date
  lastReinforcedAt: Date
}

// ==================== 质量指标 ====================

export interface QualityMetricsSnapshot {
  timestamp: Date
  knowledgeCoverageRate: number
  averageCardQuality: number
  averageReplySatisfaction: number
  cardCitationRate: number
  gapResolutionRate: number
  taskCompletionRate: number
  failureRate: number
}

export interface QualityTrend {
  metricType: string
  dataPoints: Array<{
    date: Date
    value: number
  }>
  trend: 'improving' | 'stable' | 'declining'
  changeRate: number
}

// ==================== 规则调整 ====================

export interface RuleAdjustmentRequest {
  id: string
  ruleId: string
  currentConfig: unknown
  suggestedConfig: unknown
  reason: string
  basedOnPatterns: string[]
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
}

// ==================== 分析结果 ====================

export interface FeedbackAnalysisResult {
  analyzedAt: Date
  totalFeedbacks: number
  patterns: LearningPattern[]
  stats: {
    helpfulRate: number
    notHelpfulRate: number
    averageRating: number
  }
}

export interface ReviewAnalysisResult {
  analyzedAt: Date
  totalReviews: number
  patterns: LearningPattern[]
  stats: {
    averageScore: number
    passRate: number
    commonIssues: Array<{
      type: string
      count: number
    }>
  }
}
