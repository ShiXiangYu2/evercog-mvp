/**
 * Experience Query API 路由
 *
 * 迁移到使用 KnowledgeSearch 模块
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth'
import { validateBody, experienceQuerySchema } from '@/lib/validation'
import { getLLMProvider } from '@/lib/llm-provider'
import { searchKnowledgeCards } from '@/lib/knowledge-search'
import { detectKnowledgeGaps } from '@/lib/agent/gap-detector'
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
      // 未找到相关知识卡 - 创建知识缺口记录
      const query = await prisma.experienceQuery.create({
        data: {
          question,
          callerId: user.id,
          retrievedCards: JSON.stringify([]),
          status: 'pending',
        },
      })

      // 创建知识缺口记录
      const gap = await prisma.knowledgeGap.create({
        data: {
          question,
          frequency: 1,
          priority: 'high',
          status: 'pending',
          suggestedAction: 'create_card',
        },
      })

      // 记录审计日志
      await createAuditLog({
        userId: user.id,
        action: 'create',
        entityType: 'knowledge_gap',
        entityId: gap.id,
        details: {
          question,
          gapId: gap.id,
        },
      })

      logger.info('Knowledge gap created', {
        gapId: gap.id,
        question: question.substring(0, 50),
        userId: user.id,
      })

      // 异步触发缺口检测 - 检查是否有高频相似问题，自动创建 AgentTask
      detectKnowledgeGaps({ days: 7, minFrequency: 3 }).then((result) => {
        if (result.gapCount > 0) {
          logger.info('Auto gap detection completed after query', {
            gapCount: result.gapCount,
            coverageRate: result.stats.coverageRate,
          })
        }
      }).catch((err) => {
        logger.error('Auto gap detection failed', err as Error)
      })

      return NextResponse.json({
        query,
        reply: null,
        message: '未找到相关知识卡，已记录知识缺口，建议导师补充。',
        gap: {
          id: gap.id,
          question: gap.question,
          priority: gap.priority,
          suggestedAction: gap.suggestedAction,
        },
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
        reviewerName: searchResults.find((r) => r.card.id === c.id)?.card.reviewer?.name || '未知',
        updatedAt: c.updatedAt?.toISOString() || new Date().toISOString(),
        status: c.status,
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
