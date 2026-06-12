/**
 * Experience Query API 路由
 *
 * 迁移到使用 KnowledgeSearch 模块
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth'
import { validateBody, experienceQuerySchema } from '@/lib/validation'
import { getLLMProvider } from '@/lib/llm-provider'
import { searchKnowledgeCards } from '@/lib/knowledge-search'
import logger from '@/lib/logger'

// POST /api/experience/query - 提交问题并生成回复
export const POST = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await validateBody(request, experienceQuerySchema)
    if (error) return error

    const { question } = data

    // Step 1: 使用 KnowledgeSearch 模块搜索知识卡
    const searchResults = await searchKnowledgeCards(question, user)
    const retrievedCards = searchResults.map((r) => r.card)

    if (retrievedCards.length === 0) {
      // 未找到相关知识卡
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

    // Step 2: 使用 LLM 生成结构化回复
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

    // Step 3: 保存查询和生成的回复
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

    // 记录审计日志
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

    logger.info('Experience query processed', {
      queryId: query.id,
      userId: user.id,
      cardCount: retrievedCards.length,
    })

    return NextResponse.json({ query, reply })
  } catch (error) {
    logger.error('Failed to process experience query', error as Error)
    return NextResponse.json(
      { error: 'Failed to process experience query' },
      { status: 500 }
    )
  }
})
