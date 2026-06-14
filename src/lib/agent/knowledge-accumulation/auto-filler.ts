/**
 * Auto Filler 缺口自动填充器
 *
 * 根据缺口信息使用 LLM 生成高质量知识卡草稿
 */
import { prisma } from '../../prisma'
import { callLLMWithFallback } from '../../llm'
import { reviewKnowledgeCard } from '../review-service'
import { getEventBus } from '../../scheduler/event-bus'
import type { FillingResult } from './types'
import { KNOWLEDGE_HIGH_QUALITY_THRESHOLD } from '../config'
import logger from '../../logger'

// 系统用户 ID 常量
const SYSTEM_USER_ID = 'system'

export class AutoFiller {
  /**
   * 根据缺口 ID 自动填充
   *
   * 使用事务保护确保数据一致性
   */
  async fillGap(gapId: string): Promise<FillingResult> {
    logger.info('Filling knowledge gap', { gapId })

    // 1. 获取缺口信息
    const gap = await prisma.knowledgeGap.findUnique({
      where: { id: gapId },
    })

    if (!gap) {
      throw new Error(`Gap not found: ${gapId}`)
    }

    // 2. 生成知识卡内容
    const { content, method, confidence } = await this.generateContent(gap)

    // 3. 确定分类
    const category = this.determineCategory(gap.topic)

    // 4. 使用事务创建知识卡和更新缺口状态
    const card = await prisma.$transaction(async (tx) => {
      // 创建知识卡
      const newCard = await tx.knowledgeCard.create({
        data: {
          title: gap.question.substring(0, 100),
          category,
          content,
          source: `知识缺口自动补充 | gap_id: ${gapId} | 被问 ${gap.frequency} 次`,
          status: 'pending_review',
          visibilityScope: 'department',
          creatorId: SYSTEM_USER_ID,
          tags: JSON.stringify([gap.topic || '未分类', '自动补充']),
        },
      })

      // 更新缺口状态
      await tx.knowledgeGap.update({
        where: { id: gapId },
        data: { status: 'in_progress' },
      })

      return newCard
    })

    // 5. 自动审核（事务外，因为审核服务可能有自己的事务）
    const reviewResult = await reviewKnowledgeCard(card.id)
    const contentQuality = reviewResult.score

    // 6. 根据质量分决定下一步
    let needsReview = true
    if (contentQuality >= KNOWLEDGE_HIGH_QUALITY_THRESHOLD) {
      // 高质量，可以直接发布
      await prisma.knowledgeCard.update({
        where: { id: card.id },
        data: { status: 'published' },
      })
      needsReview = false
    }

    // 7. 发射事件
    getEventBus().emit('knowledge_card:created', {
      cardId: card.id,
      gapId,
      method,
      contentQuality,
    })

    logger.info('Gap filled', {
      gapId,
      cardId: card.id,
      method,
      contentQuality,
      needsReview,
    })

    return {
      gapId,
      cardId: card.id,
      method,
      confidence,
      contentQuality,
      needsReview,
    }
  }

  /**
   * 批量填充缺口
   */
  async fillGaps(gapIds: string[]): Promise<FillingResult[]> {
    const results: FillingResult[] = []

    for (const gapId of gapIds) {
      try {
        const result = await this.fillGap(gapId)
        results.push(result)
      } catch (error) {
        logger.error('Failed to fill gap', error as Error, { gapId })
      }
    }

    return results
  }

  /**
   * 填充所有待处理的高优先级缺口
   */
  async fillAllPendingGaps(): Promise<FillingResult[]> {
    const gaps = await prisma.knowledgeGap.findMany({
      where: {
        status: 'pending',
        priority: 'high',
      },
      orderBy: { frequency: 'desc' },
      take: 10,
    })

    const gapIds = gaps.map((g) => g.id)
    return this.fillGaps(gapIds)
  }

  // ==================== 私有方法 ====================

  /**
   * 生成知识卡内容
   */
  private async generateContent(gap: {
    question: string
    topic: string | null
    frequency: number
  }): Promise<{ content: string; method: 'llm_generated' | 'template_based'; confidence: number }> {
    try {
      // 尝试使用 LLM 生成
      const content = await callLLMWithFallback(
        async (provider) => {
          // 使用 Mock Provider 的回复生成器
          const result = await provider.generateExperienceReply({
            question: gap.question,
            retrievedCards: [],
          })
          return this.formatLLMContent(gap, result.policyExplanation)
        },
        {
          userId: 'system',
          operationType: 'gap_fill_generation',
        }
      )

      return {
        content,
        method: 'llm_generated',
        confidence: 0.8,
      }
    } catch (error) {
      // LLM 失败，使用模板
      logger.warn('LLM generation failed, using template', { error: (error as Error).message })
      return {
        content: this.generateTemplateContent(gap),
        method: 'template_based',
        confidence: 0.5,
      }
    }
  }

  /**
   * 格式化 LLM 生成的内容
   */
  private formatLLMContent(
    gap: { question: string; topic: string | null; frequency: number },
    llmContent: string
  ): string {
    return `# ${gap.question}

## 问题背景

**问题来源**：员工问答中被问及 ${gap.frequency} 次，属于高频问题。
**主题分类**：${gap.topic || '未分类'}
**原始问题**：${gap.question}

## 标准回答

${llmContent}

## 注意事项

- 注意时效性，政策可能随时更新
- 确保信息准确性，建议与最新政策文件核对
- 如遇特殊情况，及时向上级或导师咨询

---

*此知识卡由 Agent 基于 LLM 自动生成，待导师审核完善后发布。*`
  }

  /**
   * 生成模板内容
   */
  private generateTemplateContent(gap: {
    question: string
    topic: string | null
    frequency: number
  }): string {
    return `# ${gap.question}

## 问题背景

**问题来源**：员工问答中被问及 ${gap.frequency} 次，属于高频问题。
**主题分类**：${gap.topic || '未分类'}
**原始问题**：${gap.question}

## 标准回答

> ⚠️ 以下为 Agent 自动生成的框架，请导师根据实际情况补充完善。

### 适用场景

（请描述此问题的典型适用场景）

### 标准操作流程

1. 第一步：确认客户类型和具体需求
2. 第二步：查询相关政策法规
3. 第三步：准备所需材料清单
4. 第四步：指导客户完成操作
5. 第五步：跟进反馈

### 所需材料

| 序号 | 材料名称 | 说明 | 备注 |
|------|----------|------|------|
| 1 | - | - | - |

### 注意事项

- 注意时效性，政策可能随时更新
- 确保信息准确性，建议与最新政策文件核对
- 如遇特殊情况，及时向上级或导师咨询

### 相关政策依据

（请补充相关政策文件名称和条款编号）

---

*此知识卡由 Agent 基于模板自动生成，待导师审核完善后发布。*`
  }

  /**
   * 确定分类
   */
  private determineCategory(topic: string | null): string {
    const categoryMap: Record<string, string> = {
      '代账服务': 'faq',
      '税务相关': 'tax_process',
      '资料清单': 'data_checklist',
      '风险合规': 'risk_reminder',
      '政策解读': 'faq',
      '销售技巧': 'experience',
      '客户服务': 'experience',
    }
    return categoryMap[topic || ''] || 'faq'
  }
}

// 单例导出
let _filler: AutoFiller | null = null

export function getAutoFiller(): AutoFiller {
  if (!_filler) {
    _filler = new AutoFiller()
  }
  return _filler
}
