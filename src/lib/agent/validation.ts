/**
 * Agent API 输入验证
 *
 * 使用 Zod 验证 API 请求体
 */
import { z } from 'zod'

// ==================== Scheduler API 验证 ====================

/** 触发 Loop 请求验证 */
export const TriggerLoopSchema = z.object({
  loopName: z.string().min(1, 'loopName is required'),
  reason: z.string().optional(),
})

// ==================== Decision Engine API 验证 ====================

/** 审批决策请求验证 */
export const ApproveDecisionSchema = z.object({
  decisionId: z.string().min(1, 'decisionId is required'),
  approvedBy: z.string().min(1, 'approvedBy is required'),
})

// ==================== Knowledge Accumulation API 验证 ====================

/** 自动填充缺口请求验证 */
export const AutoFillSchema = z.object({
  gapId: z.string().optional(),
  fillAll: z.boolean().optional(),
}).refine((data) => data.gapId || data.fillAll, {
  message: 'Either gapId or fillAll is required',
})

/** 优化知识卡请求验证 */
export const OptimizeCardSchema = z.object({
  cardId: z.string().optional(),
  batch: z.boolean().optional(),
  qualityThreshold: z.number().min(1).max(5).optional(),
  maxCards: z.number().min(1).max(100).optional(),
}).refine((data) => data.cardId || data.batch, {
  message: 'Either cardId or batch is required',
})

// ==================== Learning System API 验证 ====================

/** 获取模式请求验证 */
export const GetPatternsSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

/** 获取质量趋势请求验证 */
export const GetQualityTrendSchema = z.object({
  metricType: z.enum(['coverage', 'citation_rate', 'satisfaction', 'task_completion']).optional(),
  days: z.number().min(1).max(90).optional(),
})

// ==================== 类型导出 ====================

export type TriggerLoopInput = z.infer<typeof TriggerLoopSchema>
export type ApproveDecisionInput = z.infer<typeof ApproveDecisionSchema>
export type AutoFillInput = z.infer<typeof AutoFillSchema>
export type OptimizeCardInput = z.infer<typeof OptimizeCardSchema>
export type GetPatternsInput = z.infer<typeof GetPatternsSchema>
export type GetQualityTrendInput = z.infer<typeof GetQualityTrendSchema>
