import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { filterKnowledgeCards } from '@/lib/permissions'
import { withAuth } from '@/lib/auth'
import { validateBody, experienceQuerySchema } from '@/lib/validation'
import { getLLMProvider } from '@/lib/llm-provider'

// POST /api/experience/query - Submit a question and generate a reply
export const POST = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await validateBody(request, experienceQuerySchema)
    if (error) return error

    const { question } = data

    // Step 1: Retrieve published knowledge cards by keyword matching (with permission filtering)
    const keywords = extractKeywords(question)
    const retrievedCards = await searchKnowledgeCards(keywords, question, {
      id: user.id,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
    })

    if (retrievedCards.length === 0) {
      // No sources found - create query with no result
      const query = await prisma.experienceQuery.create({
        data: {
          question,
          callerId: user.id,
          retrievedCards: JSON.stringify([]),
          status: 'pending',
        },
      })

      return NextResponse.json({
        query,
        reply: null,
        message: '未找到相关知识卡，请联系运营部门补充知识库。',
      })
    }

    // Step 2: Generate structured reply using LLM provider
    const llm = getLLMProvider()
    const reply = await llm.generateExperienceReply({
      question,
      retrievedCards: retrievedCards.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        category: c.category,
        tags: c.tags,
        source: c.source,
        riskNotes: c.riskNotes,
      })),
    })

    // Step 3: Save the query with generated reply
    const query = await prisma.experienceQuery.create({
      data: {
        question,
        callerId: user.id,
        retrievedCards: JSON.stringify(retrievedCards.map((c) => c.id)),
        generatedReply: JSON.stringify(reply),
        policyExplanation: reply.policyExplanation,
        serviceOpportunity: reply.serviceOpportunity,
        salesScript: reply.salesScript,
        riskReminder: reply.riskReminder,
        citedSources: JSON.stringify(reply.citedSources),
        status: 'generated',
      },
    })

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'generate',
      entityType: 'experience_query',
      entityId: query.id,
      details: {
        question,
        cardCount: retrievedCards.length,
      },
    })

    return NextResponse.json({ query, reply })
  } catch (error) {
    console.error('Failed to process experience query:', error)
    return NextResponse.json(
      { error: 'Failed to process experience query' },
      { status: 500 }
    )
  }
})

/**
 * Extract keywords from a question for matching
 */
function extractKeywords(question: string): string[] {
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '什么', '怎么', '如何', '可以', '能', '吗', '呢', '吧', '啊', '么', '请问', '想', '问', '做', '还是', '需要', '应该', '因为', '所以', '如果', '但是', '然后', '请', '帮', '帮我', '帮忙']

  // Common domain keywords to boost
  const domainKeywords: Record<string, string[]> = {
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

  const words: string[] = []

  // Check domain keywords first
  for (const [, kws] of Object.entries(domainKeywords)) {
    for (const kw of kws) {
      if (question.includes(kw)) {
        words.push(kw)
      }
    }
  }

  // Also extract individual meaningful characters/words
  const segments = question.split(/[\s,，.。!！?？、；;：:（）()\[\]【】""''《》\-]+/)
  for (const seg of segments) {
    if (seg.length >= 2 && !stopWords.includes(seg) && !words.includes(seg)) {
      words.push(seg)
    }
  }

  return words.length > 0 ? words : [question]
}

/**
 * Search knowledge cards by keywords (with permission filtering)
 */
async function searchKnowledgeCards(
  keywords: string[],
  originalQuestion: string,
  caller?: { id: string; name: string; role: string; departmentId: string }
) {
  // Build Prisma OR conditions for keyword search
  const orConditions: Array<Record<string, unknown>> = []

  for (const keyword of keywords) {
    orConditions.push(
      { title: { contains: keyword } },
      { content: { contains: keyword } },
      { tags: { contains: keyword } }
    )
  }

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

  // 按权限过滤知识卡
  if (caller) {
    cards = filterKnowledgeCards(
      { id: caller.id, name: caller.name, role: caller.role, departmentId: caller.departmentId },
      cards
    ) as typeof cards
  }

  // Score and sort cards by relevance
  const scored = cards.map((card) => {
    let score = 0
    const textToSearch = `${card.title} ${card.content} ${card.tags || ''} ${card.category}`

    for (const keyword of keywords) {
      // Title match gets higher score
      if (card.title.includes(keyword)) score += 10
      // Tag match
      if ((card.tags || '').includes(keyword)) score += 8
      // Content match
      if (card.content.includes(keyword)) score += 5
      // Category match
      if (card.category.includes(keyword)) score += 3
    }

    // Boost for question words appearing in title
    const questionWords = originalQuestion.split(/[\s,，.。!！?？]+/)
    for (const qw of questionWords) {
      if (qw.length >= 2 && card.title.includes(qw)) score += 6
    }

    return { card, score }
  })

  // Sort by score descending and return top matches
  scored.sort((a, b) => b.score - a.score)

  // Return cards with score > 0, up to 5
  return scored
    .filter((s) => s.score > 0)
    .slice(0, 5)
    .map((s) => s.card)
}
