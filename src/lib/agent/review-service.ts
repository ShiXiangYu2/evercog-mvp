/**
 * Agent 知识卡预审服务
 *
 * 使用 LLM 自动审核知识卡内容
 * 检查格式规范、内容完整性、风险点
 */
import { prisma } from '../prisma'
import { getLLMProvider } from '../llm-provider'
import logger from '../logger'

// ==================== 类型定义 ====================

export interface ReviewResult {
  /** 审核通过率 (0-100) */
  score: number
  /** 审核结论: pass | warning | reject */
  verdict: 'pass' | 'warning' | 'reject'
  /** 格式检查结果 */
  formatCheck: {
    passed: boolean
    issues: string[]
  }
  /** 完整性检查结果 */
  completenessCheck: {
    score: number
    missingElements: string[]
  }
  /** 风险点检查结果 */
  riskCheck: {
    hasDisclaimer: boolean
    hasSource: boolean
    risks: string[]
  }
  /** 重复检测结果 */
  duplicateCheck: {
    hasDuplicates: boolean
    similarCards: Array<{
      id: string
      title: string
      similarity: number
    }>
  }
  /** AI 生成的审核意见 */
  aiComment: string
  /** 建议操作 */
  suggestedAction: 'approve' | 'revise' | 'reject'
}

export interface ReviewTask {
  id: string
  cardId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: ReviewResult
  createdAt: Date
  completedAt?: Date
}

// ==================== 审核服务 ====================

/**
 * 知识卡预审服务
 */
export class ReviewService {
  /**
   * 审核知识卡
   */
  async reviewKnowledgeCard(cardId: string): Promise<ReviewResult> {
    logger.info('Starting knowledge card review', { cardId })

    // 1. 获取知识卡
    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId },
      include: {
        creator: { select: { id: true, name: true, role: true } },
      },
    })

    if (!card) {
      throw new Error(`Knowledge card not found: ${cardId}`)
    }

    // 2. 并行执行各项检查
    const [formatCheck, completenessCheck, riskCheck, duplicateCheck] = await Promise.all([
      this.checkFormat(card),
      this.checkCompleteness(card),
      this.checkRisks(card),
      this.checkDuplicates(card),
    ])

    // 3. 计算综合得分
    const score = this.calculateScore(formatCheck, completenessCheck, riskCheck, duplicateCheck)

    // 4. 确定审核结论
    const verdict = this.determineVerdict(score, formatCheck, duplicateCheck)

    // 5. 获取 AI 生成的审核意见
    const aiComment = await this.generateAIComment(card, {
      formatCheck,
      completenessCheck,
      riskCheck,
    })

    // 6. 确定建议操作
    const suggestedAction = this.determineAction(verdict, completenessCheck)

    const result: ReviewResult = {
      score,
      verdict,
      formatCheck,
      completenessCheck,
      riskCheck,
      duplicateCheck,
      aiComment,
      suggestedAction,
    }

    logger.info('Knowledge card review completed', {
      cardId,
      score,
      verdict,
      suggestedAction,
    })

    return result
  }

  /**
   * 格式检查
   */
  private async checkFormat(card: {
    title: string
    content: string
    category: string
    tags: string | null
  }): Promise<ReviewResult['formatCheck']> {
    const issues: string[] = []

    // 检查标题
    if (!card.title || card.title.length < 2) {
      issues.push('标题过短，建议至少 2 个字符')
    }
    if (card.title.length > 100) {
      issues.push('标题过长，建议不超过 100 个字符')
    }

    // 检查内容
    if (!card.content || card.content.length < 10) {
      issues.push('内容过短，建议至少 10 个字符')
    }

    // 检查 Markdown 结构
    const hasHeadings = /^#{1,3}\s/m.test(card.content)
    const hasLists = /^[-*]\s|^\d+[\.\)、]/m.test(card.content)

    if (!hasHeadings && card.content.length > 100) {
      issues.push('建议添加标题结构（使用 # 标记）')
    }
    if (!hasLists && card.content.length > 200) {
      issues.push('建议添加列表格式（使用 - 或 1. 标记）')
    }

    // 检查分类
    const validCategories = [
      'data_checklist',
      'tax_process',
      'risk_reminder',
      'service_boundary',
      'faq',
      'experience',
    ]
    if (!validCategories.includes(card.category)) {
      issues.push('分类无效')
    }

    // 检查标签
    if (card.tags) {
      try {
        const tags = JSON.parse(card.tags)
        if (!Array.isArray(tags)) {
          issues.push('标签格式错误，应为 JSON 数组')
        }
      } catch {
        issues.push('标签不是有效的 JSON 格式')
      }
    }

    return {
      passed: issues.length === 0,
      issues,
    }
  }

  /**
   * 完整性检查
   */
  private async checkCompleteness(card: {
    content: string
    category: string
  }): Promise<ReviewResult['completenessCheck']> {
    const missingElements: string[] = []
    let score = 100

    const content = card.content.toLowerCase()

    // 检查必要章节
    const requiredSections: Record<string, string[]> = {
      data_checklist: ['清单', '资料', '材料'],
      tax_process: ['流程', '步骤', '申报'],
      risk_reminder: ['风险', '注意', '提醒'],
      service_boundary: ['边界', '范围', '免责'],
      faq: ['问', '答', 'q', 'a'],
      experience: ['经验', '技巧', '建议'],
    }

    const requiredKeywords = requiredSections[card.category] || []
    const hasRequiredContent = requiredKeywords.some((kw) => content.includes(kw))

    if (!hasRequiredContent && requiredKeywords.length > 0) {
      missingElements.push(`缺少与分类"${card.category}"相关的关键词`)
      score -= 20
    }

    // 检查内容长度
    if (card.content.length < 100) {
      missingElements.push('内容过短，建议补充详细信息')
      score -= 20
    } else if (card.content.length < 300) {
      missingElements.push('内容较短，建议增加更多细节')
      score -= 10
    }

    // 检查结构化
    const hasSections = /^#{1,3}\s/m.test(card.content)
    const hasLists = /^[-*]\s|^\d+[\.\)、]/m.test(card.content)

    if (!hasSections) {
      missingElements.push('建议添加标题章节')
      score -= 10
    }
    if (!hasLists) {
      missingElements.push('建议添加列表格式')
      score -= 10
    }

    // 检查风险提示
    if (!content.includes('注意') && !content.includes('风险') && !content.includes('提醒')) {
      if (card.category === 'data_checklist' || card.category === 'tax_process') {
        missingElements.push('建议添加注意事项或风险提示')
        score -= 10
      }
    }

    return {
      score: Math.max(0, score),
      missingElements,
    }
  }

  /**
   * 风险点检查
   */
  private async checkRisks(card: {
    content: string
    riskNotes: string | null
    source: string | null
  }): Promise<ReviewResult['riskCheck']> {
    const risks: string[] = []
    const content = card.content.toLowerCase()

    // 检查免责声明
    const hasDisclaimer =
      content.includes('免责') ||
      content.includes('声明') ||
      content.includes('仅供参考') ||
      content.includes('不构成')

    // 检查来源
    const hasSource = !!card.source && card.source.length > 0

    if (!hasDisclaimer) {
      risks.push('缺少免责声明或风险提示')
    }
    if (!hasSource) {
      risks.push('缺少内容来源说明')
    }

    // 检查敏感内容
    const sensitiveKeywords = ['承诺', '保证', '一定', '绝对', '100%']
    const hasSensitiveContent = sensitiveKeywords.some((kw) => content.includes(kw))
    if (hasSensitiveContent) {
      risks.push('包含可能引起误解的绝对性表述')
    }

    // 检查时效性
    const hasTimeReference =
      /\d{4}年/.test(card.content) || /\d{4}-\d{2}/.test(card.content)
    if (hasTimeReference) {
      risks.push('包含时间信息，请确认是否仍然有效')
    }

    return {
      hasDisclaimer,
      hasSource,
      risks,
    }
  }

  /**
   * 重复检测
   */
  private async checkDuplicates(card: {
    id: string
    title: string
    content: string
    category: string
  }): Promise<ReviewResult['duplicateCheck']> {
    // 搜索相似知识卡
    const similarCards = await prisma.knowledgeCard.findMany({
      where: {
        id: { not: card.id },
        status: 'published',
        category: card.category,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
      take: 10,
    })

    // 计算相似度
    const duplicates: ReviewResult['duplicateCheck']['similarCards'] = []

    for (const other of similarCards) {
      const similarity = this.calculateSimilarity(card.title, other.title)
      if (similarity > 0.6) {
        duplicates.push({
          id: other.id,
          title: other.title,
          similarity,
        })
      }
    }

    return {
      hasDuplicates: duplicates.length > 0,
      similarCards: duplicates.sort((a, b) => b.similarity - a.similarity).slice(0, 3),
    }
  }

  /**
   * 计算文本相似度（简单的 Jaccard 相似度）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(''))
    const words2 = new Set(text2.split(''))
    const intersection = new Set([...words1].filter((x) => words2.has(x)))
    const union = new Set([...words1, ...words2])
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * 计算综合得分
   */
  private calculateScore(
    formatCheck: ReviewResult['formatCheck'],
    completenessCheck: ReviewResult['completenessCheck'],
    riskCheck: ReviewResult['riskCheck'],
    duplicateCheck: ReviewResult['duplicateCheck']
  ): number {
    let score = 100

    // 格式检查权重 20%
    if (!formatCheck.passed) {
      score -= formatCheck.issues.length * 5
    }

    // 完整性检查权重 40%
    score = score * 0.6 + completenessCheck.score * 0.4

    // 风险检查权重 20%
    if (!riskCheck.hasDisclaimer) score -= 5
    if (!riskCheck.hasSource) score -= 5
    score -= riskCheck.risks.length * 3

    // 重复检查权重 20%
    if (duplicateCheck.hasDuplicates) {
      const maxSimilarity = Math.max(...duplicateCheck.similarCards.map((c) => c.similarity))
      score -= maxSimilarity * 20
    }

    return Math.min(100, Math.max(0, Math.round(score)))
  }

  /**
   * 确定审核结论
   */
  private determineVerdict(
    score: number,
    formatCheck: ReviewResult['formatCheck'],
    duplicateCheck: ReviewResult['duplicateCheck']
  ): ReviewResult['verdict'] {
    // 有严重问题直接拒绝
    if (duplicateCheck.hasDuplicates && duplicateCheck.similarCards[0]?.similarity > 0.8) {
      return 'reject'
    }

    if (!formatCheck.passed && formatCheck.issues.length > 3) {
      return 'reject'
    }

    // 根据分数判断
    if (score >= 80) return 'pass'
    if (score >= 60) return 'warning'
    return 'reject'
  }

  /**
   * 生成 AI 审核意见
   */
  private async generateAIComment(
    card: { title: string; content: string; category: string },
    checks: {
      formatCheck: ReviewResult['formatCheck']
      completenessCheck: ReviewResult['completenessCheck']
      riskCheck: ReviewResult['riskCheck']
    }
  ): Promise<string> {
    try {
      const llm = getLLMProvider()

      // 使用 LLM 生成详细审核意见
      const prompt = `请审核以下知识卡，并给出简短的审核意见（100字以内）。

标题：${card.title}
分类：${card.category}
内容摘要：${card.content.substring(0, 500)}

检查结果：
- 格式检查：${checks.formatCheck.passed ? '通过' : '有问题'}
- 完整性评分：${checks.completenessCheck.score}分
- 风险点：${checks.riskCheck.risks.join('；') || '无'}

请给出审核意见：`

      // 这里可以调用 LLM 生成意见
      // 暂时返回基于规则的意见
      const comments: string[] = []

      logger.debug('AI review comment prompt prepared', {
        provider: llm.constructor.name,
        promptLength: prompt.length,
      })

      if (checks.formatCheck.issues.length > 0) {
        comments.push(`格式问题：${checks.formatCheck.issues[0]}`)
      }
      if (checks.completenessCheck.missingElements.length > 0) {
        comments.push(`完整性：${checks.completenessCheck.missingElements[0]}`)
      }
      if (checks.riskCheck.risks.length > 0) {
        comments.push(`风险：${checks.riskCheck.risks[0]}`)
      }

      return comments.length > 0 ? comments.join('。') : '内容质量良好，建议通过'
    } catch (error) {
      logger.error('Failed to generate AI comment', error as Error)
      return 'AI 审核意见生成失败，请人工审核'
    }
  }

  /**
   * 确定建议操作
   */
  private determineAction(
    verdict: ReviewResult['verdict'],
    completenessCheck: ReviewResult['completenessCheck']
  ): ReviewResult['suggestedAction'] {
    if (verdict === 'pass') return 'approve'
    if (verdict === 'reject') return 'reject'

    // warning 状态根据完整性决定
    if (completenessCheck.score < 60) return 'reject'
    return 'revise'
  }
}

// ==================== 单例导出 ====================

let _reviewService: ReviewService | null = null

export function getReviewService(): ReviewService {
  if (!_reviewService) {
    _reviewService = new ReviewService()
  }
  return _reviewService
}

/**
 * 快速审核知识卡（用于 API 调用）
 */
export async function reviewKnowledgeCard(cardId: string): Promise<ReviewResult> {
  const service = getReviewService()
  return service.reviewKnowledgeCard(cardId)
}
