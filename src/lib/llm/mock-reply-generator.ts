/**
 * Mock Reply Generator
 *
 * 生成经验回复的 Mock 实现
 */
import type { ReplyGenerator, ExperienceReplyInput, ExperienceReplyOutput, PolicyContext, ApplicabilityResult } from './types'

type RetrievedCardWithMeta = ExperienceReplyInput['retrievedCards'][number] & {
  reviewerName?: string
  updatedAt?: string
  status?: string
}

export class MockReplyGenerator implements ReplyGenerator {
  name = 'mock-reply'

  async generateExperienceReply(input: ExperienceReplyInput): Promise<ExperienceReplyOutput> {
    const { retrievedCards } = input

    const citedSources = retrievedCards.map((c) => {
      const card = c as RetrievedCardWithMeta
      return {
        cardId: card.id,
        title: card.title,
        category: card.category,
        source: card.source || '内部知识库',
        reviewerName: card.reviewerName || '未知',
        updatedAt: card.updatedAt || new Date().toISOString(),
        status: card.status || 'published',
      }
    })

    const policyCards = retrievedCards.filter(
      (c) => c.category === 'experience' || c.category === 'faq'
    )
    const riskCards = retrievedCards.filter((c) => c.category === 'risk_reminder')
    const serviceCards = retrievedCards.filter(
      (c) => c.category === 'service_boundary' || c.category === 'data_checklist'
    )

    let policyExplanation = ''
    if (policyCards.length > 0) {
      policyExplanation = policyCards
        .map((c) => `**${c.title}**：${c.content.replace(/[#*\n]+/g, ' ').substring(0, 200)}`)
        .join('\n\n')
    } else if (retrievedCards.length > 0) {
      policyExplanation = `根据知识库中的「${retrievedCards[0].title}」，以下是相关政策说明：\n\n${retrievedCards[0].content.replace(/[#*\n]+/g, ' ').substring(0, 300)}`
    }

    let serviceOpportunity = ''
    if (serviceCards.length > 0) {
      serviceOpportunity = serviceCards
        .map((c) => `**${c.title}**：${c.content.replace(/[#*\n]+/g, ' ').substring(0, 200)}`)
        .join('\n\n')
    } else {
      const titles = retrievedCards.map((c) => c.title).join('、')
      serviceOpportunity = `基于对「${titles}」的知识检索，建议向客户推荐以下服务：\n\n1. 代账服务（每月账务处理+纳税申报）\n2. 税务咨询服务（政策解读+合规指导）\n3. 工商年检协助服务`
    }

    const salesScript = `您好！关于您咨询的问题，我来为您详细说明。\n\n` +
      retrievedCards
        .slice(0, 2)
        .map((c, i) => `${i + 1}. ${c.title.replace(/[#*\n]+/g, ' ').substring(0, 80)}`)
        .join('\n') +
      `\n\n我们公司在这方面的服务优势是：专业团队、快速响应、合规保障。\n` +
      `如果您需要更详细的服务方案，我可以为您安排一次免费的咨询。`

    let riskReminder = ''
    if (riskCards.length > 0) {
      riskReminder = riskCards
        .map((c) => `**${c.title}**：${c.riskNotes || c.content.replace(/[#*\n]+/g, ' ').substring(0, 150)}`)
        .join('\n\n')
    } else {
      riskReminder = `**注意事项**：\n\n1. 请确保客户提供的资料真实、完整\n2. 注意相关服务的适用范围和条件\n3. 如遇复杂情况，建议咨询专业人士`
    }

    // 生成政策上下文
    const policyContext = this.generatePolicyContext(retrievedCards)
    const applicability = this.generateApplicability(retrievedCards)

    return {
      policyExplanation,
      serviceOpportunity,
      salesScript,
      riskReminder,
      citedSources,
      policyContext,
      applicability,
    }
  }

  /**
   * 生成政策上下文
   */
  private generatePolicyContext(cards: ExperienceReplyInput['retrievedCards']): PolicyContext | undefined {
    if (cards.length === 0) return undefined

    // 从第一张卡片提取政策上下文
    const card = cards[0]

    // 解析 JSON 字段
    const parseJsonArray = (value: string | undefined): string[] => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }

    // 判断政策状态
    const now = new Date()
    const validTo = card.validTo ? new Date(card.validTo) : null
    let status: PolicyContext['status'] = 'active'

    if (validTo) {
      if (validTo < now) {
        status = 'expired'
      } else if (validTo.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
        status = 'expiring'
      }
    }

    return {
      validFrom: card.validFrom || '2024-01-01',
      validTo: card.validTo || '2025-12-31',
      status,
      applicableRegions: parseJsonArray(card.applicableRegions) || ['全国'],
      applicableEntities: parseJsonArray(card.applicableEntities) || ['小微企业', '个体工商户'],
      clauseNumbers: parseJsonArray(card.clauseNumbers) || ['第一条', '第二款'],
    }
  }

  /**
   * 生成适用性判断
   */
  private generateApplicability(cards: ExperienceReplyInput['retrievedCards']): ApplicabilityResult | undefined {
    if (cards.length === 0) return undefined

    // 简单的适用性判断逻辑
    const card = cards[0]
    const riskNotes = card.riskNotes || ''

    // 如果有风险提示，可能是部分适用
    if (riskNotes.includes('需') || riskNotes.includes('条件')) {
      return {
        status: 'partial',
        reason: '该政策需满足特定条件，请确认客户是否符合',
        missingConditions: ['需确认企业规模', '需确认经营年限'],
      }
    }

    // 默认适用
    return {
      status: 'applicable',
      reason: '客户符合政策适用条件',
    }
  }
}
