/**
 * Content Enhancer 内容增强器
 *
 * 使用 LLM 增强知识卡内容
 */
import { prisma } from '../../prisma'
import { callLLMWithFallback } from '../../llm'
import logger from '../../logger'

export interface EnhancementResult {
  cardId: string
  enhanced: boolean
  changes: Array<{
    field: string
    description: string
  }>
}

export class ContentEnhancer {
  /**
   * 增强知识卡内容
   */
  async enhanceCard(cardId: string): Promise<EnhancementResult> {
    logger.info('Enhancing card content', { cardId })

    // 1. 获取卡片信息
    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId },
    })

    if (!card) {
      throw new Error(`Card not found: ${cardId}`)
    }

    const changes: EnhancementResult['changes'] = []

    // 2. 增强风险提示
    if (!card.riskNotes) {
      const riskNotes = await this.generateRiskNotes(card)
      if (riskNotes) {
        await prisma.knowledgeCard.update({
          where: { id: cardId },
          data: { riskNotes },
        })
        changes.push({
          field: 'riskNotes',
          description: '自动生成风险提示',
        })
      }
    }

    // 3. 增强内容（添加结构化信息）
    const enhancedContent = await this.enhanceContent(card)
    if (enhancedContent && enhancedContent !== card.content) {
      await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: {
          content: enhancedContent,
          version: { increment: 1 },
        },
      })
      changes.push({
        field: 'content',
        description: '增强内容结构化',
      })
    }

    return {
      cardId,
      enhanced: changes.length > 0,
      changes,
    }
  }

  /**
   * 批量增强知识卡
   */
  async enhanceCards(cardIds: string[]): Promise<EnhancementResult[]> {
    const results: EnhancementResult[] = []

    for (const cardId of cardIds) {
      try {
        const result = await this.enhanceCard(cardId)
        results.push(result)
      } catch (error) {
        logger.error('Failed to enhance card', error as Error, { cardId })
      }
    }

    return results
  }

  /**
   * 增强待审核的知识卡
   */
  async enhancePendingReviewCards(): Promise<EnhancementResult[]> {
    const cards = await prisma.knowledgeCard.findMany({
      where: { status: 'pending_review' },
      take: 20,
    })

    return this.enhanceCards(cards.map((c) => c.id))
  }

  // ==================== 私有方法 ====================

  /**
   * 生成风险提示
   */
  private async generateRiskNotes(card: {
    title: string
    content: string
    category: string
  }): Promise<string | null> {
    try {
      const result = await callLLMWithFallback(
        async (provider) => {
          const reply = await provider.generateExperienceReply({
            question: `请为以下知识卡生成风险提示：\n标题：${card.title}\n分类：${card.category}\n内容：${card.content.substring(0, 500)}`,
            retrievedCards: [],
          })
          return reply.riskReminder
        },
        {
          userId: 'system',
          operationType: 'risk_notes_generation',
        }
      )

      return result || null
    } catch (error) {
      logger.warn('Failed to generate risk notes', { error: (error as Error).message })
      return null
    }
  }

  /**
   * 增强内容结构
   */
  private async enhanceContent(card: {
    title: string
    content: string
    category: string
  }): Promise<string | null> {
    // 检查是否已经有完整的结构
    if (
      card.content.includes('## 适用场景') &&
      card.content.includes('## 标准操作流程') &&
      card.content.includes('## 注意事项')
    ) {
      return null // 已经有完整结构，无需增强
    }

    try {
      const result = await callLLMWithFallback(
        async (provider) => {
          const reply = await provider.generateExperienceReply({
            question: `请为以下知识卡补充完整的结构（包括：适用场景、标准操作流程、所需材料、注意事项）：\n标题：${card.title}\n分类：${card.category}\n当前内容：${card.content.substring(0, 1000)}`,
            retrievedCards: [],
          })
          return reply.policyExplanation
        },
        {
          userId: 'system',
          operationType: 'content_enhancement',
        }
      )

      return result || null
    } catch (error) {
      logger.warn('Failed to enhance content', { error: (error as Error).message })
      return null
    }
  }
}

// 单例导出
let _enhancer: ContentEnhancer | null = null

export function getContentEnhancer(): ContentEnhancer {
  if (!_enhancer) {
    _enhancer = new ContentEnhancer()
  }
  return _enhancer
}
