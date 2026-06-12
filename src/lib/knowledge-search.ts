/**
 * KnowledgeSearch 模块
 *
 * 知识卡搜索服务，支持关键词提取、搜索和相关性评分
 * 可被 API 路由、Agent 工作台和其他模块复用
 */
import { prisma } from './prisma'
import { canViewKnowledgeCard, type AuthUser } from './permission-guard'
import logger from './logger'

// ==================== 类型定义 ====================

export interface SearchOptions {
  /** 最大返回数量，默认 5 */
  maxResults?: number
  /** 是否启用领域关键词增强，默认 true */
  enableDomainBoost?: boolean
}

export interface SearchResult {
  /** 知识卡 */
  card: {
    id: string
    title: string
    category: string
    tags: string | null
    content: string
    departmentId: string | null
    customerType: string | null
    source: string | null
    riskNotes: string | null
    visibilityScope: string
    status: string
    version: number
    creatorId: string
    createdAt: Date
    updatedAt: Date
    creator?: { id: string; name: string; role: string; departmentId?: string } | null
  }
  /** 相关性评分 */
  score: number
}

// ==================== 停用词 ====================

const STOP_WORDS = [
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那',
  '什么', '怎么', '如何', '可以', '能', '吗', '呢', '吧', '啊', '么', '请问', '想', '问', '做', '还是', '需要', '应该', '因为', '所以', '如果', '但是', '然后', '请', '帮', '帮我', '帮忙',
]

// ==================== 领域关键词 ====================

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  '餐饮': ['餐饮', '餐厅', '饭店', '食堂', '外卖', '堂食', '食材', '菜'],
  '零售': ['零售', '商店', '店铺', '商品', '库存', '进销存'],
  '门店': ['门店', '店面', '连锁', '加盟'],
  '代账': ['代账', '记账', '做账', '报税', '账务', '会计'],
  '税务': ['税', '税务', '发票', '纳税', '税率', '增值税', '所得税', '个税', '税种'],
  '风险': ['风险', '罚款', '违规', '处罚', '合规', '滞纳金'],
  '资料': ['材料', '资料', '证件', '执照', '证明', '文件', '清单'],
  '服务': ['服务', '业务', '项目', '合作'],
  '政策': ['政策', '优惠', '减免', '补贴', '扶持'],
  '客户': ['客户', '顾客', '用户', '甲方'],
  '初创': ['初创', '新公司', '刚成立', '刚开业', '新店', '开业'],
  '个体': ['个体', '个体户', '个体工商户'],
  '小微企业': ['小微', '小规模', '小型'],
  '销售': ['销售', '卖', '推销', '报价', '价格', '成交', '签单'],
  '客服': ['客服', '售后', '投诉', '退换', '服务态度'],
}

// ==================== 关键词提取 ====================

/**
 * 从问题中提取关键词
 *
 * @param question 用户问题
 * @param options 搜索选项
 * @returns 关键词列表
 */
export function extractKeywords(question: string, options: SearchOptions = {}): string[] {
  const { enableDomainBoost = true } = options

  const words: string[] = []

  // 领域关键词增强
  if (enableDomainBoost) {
    for (const [, kws] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const kw of kws) {
        if (question.includes(kw) && !words.includes(kw)) {
          words.push(kw)
        }
      }
    }
  }

  // 提取有意义的词语
  const segments = question.split(/[\s,，.。!！?？、；;：:（）()\[\]【】""''《》\-]+/)
  for (const seg of segments) {
    if (seg.length >= 2 && !STOP_WORDS.includes(seg) && !words.includes(seg)) {
      words.push(seg)
    }
  }

  return words.length > 0 ? words : [question]
}

// ==================== 相关性评分 ====================

/**
 * 计算知识卡与关键词的相关性评分
 *
 * 评分规则：
 * - 标题匹配：+10 分
 * - 标签匹配：+8 分
 * - 内容匹配：+5 分
 * - 分类匹配：+3 分
 * - 问题词出现在标题：+6 分
 *
 * @param card 知识卡
 * @param keywords 关键词列表
 * @param originalQuestion 原始问题
 * @returns 评分
 */
function calculateScore(
  card: { title: string; content: string; tags: string | null; category: string },
  keywords: string[],
  originalQuestion: string
): number {
  let score = 0

  for (const keyword of keywords) {
    // 标题匹配
    if (card.title.includes(keyword)) score += 10
    // 标签匹配
    if ((card.tags || '').includes(keyword)) score += 8
    // 内容匹配
    if (card.content.includes(keyword)) score += 5
    // 分类匹配
    if (card.category.includes(keyword)) score += 3
  }

  // 问题词出现在标题
  const questionWords = originalQuestion.split(/[\s,，.。!！?？]+/)
  for (const qw of questionWords) {
    if (qw.length >= 2 && card.title.includes(qw)) score += 6
  }

  return score
}

// ==================== 搜索服务 ====================

/**
 * 搜索知识卡
 *
 * @param question 用户问题
 * @param user 当前用户
 * @param options 搜索选项
 * @returns 搜索结果（按相关性排序）
 */
export async function searchKnowledgeCards(
  question: string,
  user: AuthUser,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { maxResults = 5 } = options

  logger.info('Searching knowledge cards', { question: question.substring(0, 50), userId: user.id })

  // 1. 提取关键词
  const keywords = extractKeywords(question, options)

  // 2. 构建搜索条件
  const orConditions: Array<Record<string, unknown>> = []
  for (const keyword of keywords) {
    orConditions.push(
      { title: { contains: keyword } },
      { content: { contains: keyword } },
      { tags: { contains: keyword } }
    )
  }

  // 3. 查询数据库
  let cards = await prisma.knowledgeCard.findMany({
    where: {
      status: 'published',
      OR: orConditions.length > 0 ? orConditions : undefined,
    },
    include: {
      creator: { select: { id: true, name: true, role: true, departmentId: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // 4. 按权限过滤
  cards = cards.filter((card) =>
    canViewKnowledgeCard(user, {
      status: card.status,
      creatorId: card.creatorId,
      reviewerId: null,
      visibilityScope: card.visibilityScope,
      departmentId: card.departmentId,
    })
  )

  // 5. 计算评分并排序
  const results: SearchResult[] = cards
    .map((card) => ({
      card,
      score: calculateScore(card, keywords, question),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  logger.info('Knowledge search completed', {
    question: question.substring(0, 50),
    keywordsCount: keywords.length,
    resultsCount: results.length,
  })

  return results
}
