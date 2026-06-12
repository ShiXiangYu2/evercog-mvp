/**
 * LLM Provider 抽象层
 *
 * 统一封装 AI 生成能力，支持 mock 和真实 LLM 切换。
 * 所有 API 路由通过此模块调用 AI，不直接实现 mock 逻辑。
 *
 * 切换方式：设置环境变量 LLM_PROVIDER=openai 或 LLM_PROVIDER=mock（默认）
 */

// ==================== 类型定义 ====================

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
  }>
}

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

/** LLM Provider 接口 */
export interface LLMProvider {
  name: string
  generateBrief(input: BriefGenerationInput): Promise<BriefGenerationOutput>
  generateExperienceReply(input: ExperienceReplyInput): Promise<ExperienceReplyOutput>
  generateSOPInspection(input: SOPInspectionInput): Promise<SOPInspectionOutput>
}

// ==================== Mock Provider ====================

const CUSTOMER_TYPE_MAP: Record<string, string> = {
  restaurant: '餐饮门店',
  retail: '零售企业',
  store: '线下门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
  general: '中小微企业',
}

class MockLLMProvider implements LLMProvider {
  name = 'mock'

  async generateBrief(input: BriefGenerationInput): Promise<BriefGenerationOutput> {
    const targetCustomer = CUSTOMER_TYPE_MAP[input.customerType] || '中小微企业'

    return {
      title: `${input.title} - 政策简报`,
      summary: `本简报针对"${input.title}"进行解读。该政策由${input.source}发布，主要面向${targetCustomer}群体，涉及税收优惠、营商环境优化、融资支持等多个方面。政策的实施将对${targetCustomer}的经营发展产生积极影响。`,
      applicableTo: JSON.stringify([targetCustomer, '中小微企业', '代账客户']),
      keyClauses: [
        `1. 政策背景：${input.source}为支持${targetCustomer}发展出台的扶持政策`,
        `2. 适用范围：注册地在本辖区内的${targetCustomer}`,
        `3. 优惠期限：政策发布之日起至规定截止日期`,
        `4. 申请条件：符合相关资质要求的经营主体`,
        `5. 办理流程：向当地主管部门提交申请材料`,
      ].join('\n'),
      actionSuggestions: [
        `1. 筛选客户：从客户名单中筛选出符合${targetCustomer}条件的客户`,
        `2. 政策通知：通过企微群或电话通知相关客户政策信息`,
        `3. 材料准备：协助客户准备申请所需的证明材料`,
        `4. 申报指导：指导客户完成优惠政策的申报流程`,
        `5. 跟踪反馈：定期跟进客户申报进度，及时反馈结果`,
      ].join('\n'),
      riskReminders: [
        `1. 注意政策适用期限，避免错过申报窗口`,
        `2. 确保客户提供的材料真实完整，避免虚假申报`,
        `3. 关注政策后续调整，及时更新服务方案`,
        `4. 对不符合条件的客户做好解释工作，避免误导`,
        `5. 留存所有沟通记录和服务凭证`,
      ].join('\n'),
      sourceUrl: input.url,
    }
  }

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

  async generateSOPInspection(input: SOPInspectionInput): Promise<SOPInspectionOutput> {
    const { content } = input
    const lines = content.split('\n').filter((l) => l.trim())
    const hasSteps = /^\d+[\.\)、]/m.test(content) || /^[-*]\s/m.test(content)
    const hasSections = /^#{1,3}\s/m.test(content)
    const contentLength = content.length

    let completeness = 30
    if (contentLength > 100) completeness += 15
    if (contentLength > 300) completeness += 10
    if (contentLength > 600) completeness += 10
    if (hasSteps) completeness += 15
    if (hasSections) completeness += 10
    if (lines.length > 5) completeness += 10
    completeness = Math.min(completeness, 95)

    const missingSteps: string[] = []
    if (!content.includes('注意事项') && !content.includes('风险')) {
      missingSteps.push('缺少注意事项或风险提示章节')
    }
    if (!content.includes('确认') && !content.includes('检查') && !content.includes('验证')) {
      missingSteps.push('缺少确认/检查步骤')
    }
    if (!content.includes('时间') && !content.includes('期限') && !content.includes('截止')) {
      missingSteps.push('未明确时间节点要求')
    }
    if (lines.length < 3) {
      missingSteps.push('步骤描述过于简略，建议补充详细操作说明')
    }
    if (!hasSteps) {
      missingSteps.push('缺少编号步骤或列表格式的操作流程')
    }

    const riskPoints: string[] = []
    if (contentLength < 200) {
      riskPoints.push('内容过短，可能导致执行时理解偏差')
    }
    if (!hasSections) {
      riskPoints.push('缺少结构化分区，不利于快速定位关键信息')
    }
    if (!content.includes('异常') && !content.includes('错误') && !content.includes('失败')) {
      riskPoints.push('未考虑异常情况处理方案')
    }
    if (!content.includes('负责人') && !content.includes('角色') && !content.includes('谁')) {
      riskPoints.push('未明确责任人或角色分工')
    }

    let executability = 25
    if (hasSteps) executability += 20
    if (hasSections) executability += 15
    if (contentLength > 200) executability += 10
    if (contentLength > 500) executability += 10
    if (missingSteps.length <= 2) executability += 10
    executability = Math.min(executability, 92)

    return {
      completeness,
      missingSteps,
      riskPoints,
      executability,
      inspectionReport: JSON.stringify({
        summary: `AI 检查完成：内容完整性 ${completeness}%，可执行性 ${executability}%`,
        analyzedAt: new Date().toISOString(),
        contentStats: {
          totalChars: contentLength,
          totalLines: lines.length,
          hasStepFormat: hasSteps,
          hasSectionStructure: hasSections,
        },
      }),
    }
  }
}

// ==================== Provider 工厂 ====================

let _provider: LLMProvider | null = null

/**
 * 获取 LLM Provider 实例（单例）
 *
 * 通过环境变量 LLM_PROVIDER 切换：
 * - mock（默认）：使用 MockLLMProvider
 * - deepseek：使用 DeepSeek API（推荐，成本低、中文能力强）
 * - openai：使用 OpenAI API（需配置 OPENAI_API_KEY）
 */
export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider

  const providerType = process.env.LLM_PROVIDER || 'mock'

  switch (providerType) {
    case 'deepseek': {
      try {
        const { DeepSeekLLMProvider } = require('./providers/deepseek-provider')
        _provider = new DeepSeekLLMProvider()
      } catch (error) {
        console.warn('Failed to load DeepSeek provider, falling back to mock:', error)
        _provider = new MockLLMProvider()
      }
      break
    }
    case 'openai':
      console.warn('OpenAI provider not implemented yet, falling back to mock')
      _provider = new MockLLMProvider()
      break
    default:
      _provider = new MockLLMProvider()
  }

  console.log(`[LLM] Using provider: ${_provider.name}`)
  return _provider
}

/**
 * 重置 Provider（用于测试）
 */
export function resetLLMProvider(): void {
  _provider = null
}
