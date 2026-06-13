/**
 * LLM Provider 类型定义
 *
 * 拆分为聚焦接口，每个接口负责单一能力
 */

// ==================== PolicyContext ====================

/** 政策上下文信息 */
export interface PolicyContext {
  validFrom?: string        // 生效日期
  validTo?: string          // 截止日期
  status: 'active' | 'expiring' | 'expired'  // 状态
  applicableRegions: string[]  // 适用地区
  applicableEntities: string[] // 适用主体
  clauseNumbers: string[]      // 条款编号
}

/** 适用性判断结果 */
export interface ApplicabilityResult {
  status: 'applicable' | 'partial' | 'not_applicable'
  reason: string
  missingConditions?: string[]
}

// ==================== BriefGenerator ====================

/** 政策简报生成输入 */
export interface BriefGenerationInput {
  title: string
  source: string
  customerType: string
  url: string
}

/** 政策简报生成输出 */
export interface BriefGenerationOutput {
  title: string
  summary: string
  applicableTo: string
  keyClauses: string
  actionSuggestions: string
  riskReminders: string
  sourceUrl: string
}

/** 政策简报生成器接口 */
export interface BriefGenerator {
  generateBrief(input: BriefGenerationInput): Promise<BriefGenerationOutput>
}

// ==================== ReplyGenerator ====================

/** 经验调用回复生成输入 */
export interface ExperienceReplyInput {
  question: string
  retrievedCards: Array<{
    id: string
    title: string
    content: string
    category: string
    tags: string | null
    source: string | null
    riskNotes: string | null
    reviewerName?: string
    updatedAt?: string
    status?: string
    // 政策上下文字段
    validFrom?: string
    validTo?: string
    applicableRegions?: string
    applicableEntities?: string
    clauseNumbers?: string
  }>
}

/** 经验调用回复生成输出 */
export interface ExperienceReplyOutput {
  policyExplanation: string
  serviceOpportunity: string
  salesScript: string
  riskReminder: string
  citedSources: Array<{
    cardId: string
    title: string
    category: string
    source: string
    reviewerName?: string
    updatedAt?: string
    status?: string
  }>
  // 政策上下文
  policyContext?: PolicyContext
  applicability?: ApplicabilityResult
}

/** 经验回复生成器接口 */
export interface ReplyGenerator {
  generateExperienceReply(input: ExperienceReplyInput): Promise<ExperienceReplyOutput>
}

// ==================== InspectionGenerator ====================

/** SOP 检查报告生成输入 */
export interface SOPInspectionInput {
  content: string
  template?: string
}

/** SOP 检查报告生成输出 */
export interface SOPInspectionOutput {
  completeness: number
  missingSteps: string[]
  riskPoints: string[]
  executability: number
  inspectionReport: string
}

/** SOP 检查生成器接口 */
export interface InspectionGenerator {
  generateSOPInspection(input: SOPInspectionInput): Promise<SOPInspectionOutput>
}

// ==================== 组合接口 ====================

/** LLM Provider 完整接口（组合所有能力） */
export interface LLMProvider extends BriefGenerator, ReplyGenerator, InspectionGenerator {
  name: string
}
