/**
 * DeepSeek LLM Provider
 *
 * 使用 DeepSeek API（OpenAI 兼容接口）生成内容
 * 成本低、中文能力强、国内访问稳定
 */
import OpenAI from 'openai'
import type {
  LLMProvider,
  BriefGenerationInput,
  BriefGenerationOutput,
  ExperienceReplyInput,
  ExperienceReplyOutput,
  SOPInspectionInput,
  SOPInspectionOutput,
} from '../llm-provider'

// ==================== 配置 ====================

interface DeepSeekConfig {
  apiKey: string
  baseUrl: string
  model: string
}

function getConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required')
  }

  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  }
}

// ==================== Prompt 模板 ====================

const BRIEF_GENERATION_PROMPT = `你是一个专业的政策简报生成助手。请根据以下政策信息生成一份结构化的政策简报。

## 输入信息
- 政策标题：{title}
- 来源：{source}
- 适用客户类型：{customerType}
- 政策链接：{url}

## 输出要求
请按照以下格式生成简报：

1. **title**: 简报标题（包含政策名称）
2. **summary**: 政策摘要（200字以内，说明政策背景和主要内容）
3. **applicableTo**: 适用对象（JSON数组格式，如 ["餐饮门店", "小微企业"]）
4. **keyClauses**: 关键条款（分条列出，每条一行）
5. **actionSuggestions**: 行动建议（分条列出，每条一行）
6. **riskReminders**: 风险提醒（分条列出，每条一行）
7. **sourceUrl**: 来源链接

请直接输出 JSON 格式，不要包含 markdown 代码块标记。`

const EXPERIENCE_REPLY_PROMPT = `你是一个企业知识运营助手，帮助员工解答客户问题。请根据知识库内容生成专业的回复建议。

## 客户问题
{question}

## 相关知识卡
{cards}

## 输出要求
请生成以下四个部分的回复：

1. **policyExplanation**: 政策解释（基于知识卡内容，解释相关政策）
2. **serviceOpportunity**: 服务机会（基于客户问题，推荐合适的服务）
3. **salesScript**: 销售话术（用于与客户沟通的参考话术）
4. **riskReminder**: 风险提醒（需要注意的风险点）

请直接输出 JSON 格式，不要包含 markdown 代码块标记。`

const SOP_INSPECTION_PROMPT = `你是一个 SOP 文档审核助手。请检查以下 SOP 文档的质量。

## SOP 内容
{sopContent}

## 检查维度
1. 内容完整性（是否包含必要章节）
2. 可执行性（步骤是否清晰可执行）
3. 风险控制（是否考虑异常情况）
4. 责任明确（是否明确责任人）

## 输出要求
请生成以下检查结果：

1. **completeness**: 完整性评分（0-100）
2. **executability**: 可执行性评分（0-100）
3. **missingSteps**: 缺失的步骤或章节（数组）
4. **riskPoints**: 风险点（数组）
5. **inspectionReport**: 审核报告（详细说明）

请直接输出 JSON 格式，不要包含 markdown 代码块标记。`

// ==================== Provider 实现 ====================

export class DeepSeekLLMProvider implements LLMProvider {
  name = 'deepseek'
  private client: OpenAI
  private model: string

  constructor() {
    const config = getConfig()
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
    this.model = config.model
  }

  /**
   * 通用补全方法
   */
  private async complete(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的助手，擅长生成结构化的 JSON 输出。请确保输出是有效的 JSON 格式。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from DeepSeek API')
    }

    return content.trim()
  }

  /**
   * 解析 JSON 响应
   */
  private parseJSON<T>(content: string): T {
    // 尝试直接解析
    try {
      return JSON.parse(content) as T
    } catch {
      // 尝试提取 JSON 部分（可能包含 markdown 代码块）
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim()) as T
      }
      // 尝试找到第一个 { 或 [ 开始的 JSON
      const startIndex = content.search(/[{[]/)
      const endIndex = content.lastIndexOf('}]') + 2
      if (startIndex !== -1 && endIndex > startIndex) {
        return JSON.parse(content.slice(startIndex, endIndex)) as T
      }
      throw new Error('Failed to parse JSON from response')
    }
  }

  async generateBrief(input: BriefGenerationInput): Promise<BriefGenerationOutput> {
    const prompt = BRIEF_GENERATION_PROMPT
      .replace('{title}', input.title)
      .replace('{source}', input.source)
      .replace('{customerType}', input.customerType)
      .replace('{url}', input.url)

    const content = await this.complete(prompt)
    const result = this.parseJSON<BriefGenerationOutput>(content)

    return {
      title: result.title || input.title,
      summary: result.summary || '',
      applicableTo: result.applicableTo || '[]',
      keyClauses: result.keyClauses || '',
      actionSuggestions: result.actionSuggestions || '',
      riskReminders: result.riskReminders || '',
      sourceUrl: input.url,
    }
  }

  async generateExperienceReply(input: ExperienceReplyInput): Promise<ExperienceReplyOutput> {
    const cardsStr = input.retrievedCards
      .map(
        (c, i) =>
          `${i + 1}. 《${c.title}》 (${c.category})\n${c.content.substring(0, 500)}`
      )
      .join('\n\n')

    const prompt = EXPERIENCE_REPLY_PROMPT
      .replace('{question}', input.question)
      .replace('{cards}', cardsStr || '（无相关知识卡）')

    const content = await this.complete(prompt)
    const result = this.parseJSON<ExperienceReplyOutput>(content)

    return {
      policyExplanation: result.policyExplanation || '',
      serviceOpportunity: result.serviceOpportunity || '',
      salesScript: result.salesScript || '',
      riskReminder: result.riskReminder || '',
      citedSources: input.retrievedCards.map((c) => ({
        cardId: c.id,
        title: c.title,
        category: c.category,
        source: c.source || '内部知识库',
      })),
    }
  }

  async generateSOPInspection(input: SOPInspectionInput): Promise<SOPInspectionOutput> {
    const prompt = SOP_INSPECTION_PROMPT.replace('{sopContent}', input.content)

    const content = await this.complete(prompt)
    const result = this.parseJSON<SOPInspectionOutput>(content)

    return {
      completeness: Math.min(Math.max(result.completeness || 0, 0), 100),
      executability: Math.min(Math.max(result.executability || 0, 0), 100),
      missingSteps: result.missingSteps || [],
      riskPoints: result.riskPoints || [],
      inspectionReport: result.inspectionReport || '',
    }
  }
}
