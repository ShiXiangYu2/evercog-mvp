/**
 * 知识卡审核 Agent 执行器
 *
 * 实现 AgentExecutor 接口，用于审核知识卡
 */
import type { AgentExecutor, AgentTaskType, KnowledgeReviewResult } from '../types'
import { ReviewService } from '../review-service'

// ==================== 知识卡审核执行器 ====================

export class KnowledgeReviewExecutor implements AgentExecutor {
  readonly name = 'KnowledgeReviewExecutor'
  readonly supportedTaskTypes: AgentTaskType[] = ['knowledge_review']

  private reviewService: ReviewService

  constructor() {
    this.reviewService = new ReviewService()
  }

  /**
   * 执行知识卡审核
   *
   * @param input 输入参数 { cardId: string }
   * @returns 审核结果
   */
  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { cardId } = input

    if (!cardId || typeof cardId !== 'string') {
      throw new Error('cardId is required and must be a string')
    }

    const result = await this.reviewService.reviewKnowledgeCard(cardId)

    return result as unknown as Record<string, unknown>
  }
}
