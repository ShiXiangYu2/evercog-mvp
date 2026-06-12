/**
 * Mock Reply Generator
 *
 * 生成经验回复的 Mock 实现
 */
import type { ReplyGenerator, ExperienceReplyInput, ExperienceReplyOutput } from './types'

export class MockReplyGenerator implements ReplyGenerator {
  name = 'mock-reply'

  async generateExperienceReply(input: ExperienceReplyInput): Promise<ExperienceReplyOutput> {
    const { retrievedCards } = input

    const citedSources = retrievedCards.map((c) => ({
      cardId: c.id,
      title: c.title,
      category: c.category,
      source: c.source || '内部知识库',
    }))

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

    return { policyExplanation, serviceOpportunity, salesScript, riskReminder, citedSources }
  }
}
