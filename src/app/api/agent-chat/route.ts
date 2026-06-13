/**
 * POST /api/agent-chat - Agent 会话接口
 *
 * 支持：
 * - 自然语言提问（检索知识库 + LLM 生成回答）
 * - 快捷指令（/审核 /缺口 /统计 /帮助）
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { searchKnowledgeCards } from '@/lib/knowledge-search'
import { getLLMProvider } from '@/lib/llm-provider'
import { createAuditLog } from '@/lib/audit'
import logger from '@/lib/logger'

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  citations?: Array<{
    cardId: string
    title: string
    category: string
    reviewerName?: string
  }>
  timestamp: string
}

// 快捷指令处理
async function handleCommand(
  command: string,
  userId: string
): Promise<{ reply: string; data?: unknown }> {
  switch (command) {
    case '/审核': {
      const [pendingCards, pendingSubmissions, pendingBriefs] = await Promise.all([
        prisma.knowledgeCard.count({ where: { status: 'pending_review' } }),
        prisma.sOPSubmission.count({ where: { status: 'submitted' } }),
        prisma.policyBrief.count({ where: { reviewStatus: 'pending_review' } }),
      ])
      const total = pendingCards + pendingSubmissions + pendingBriefs
      return {
        reply: `📋 当前待审核事项：\n\n• 知识卡：${pendingCards} 张\n• SOP 提交：${pendingSubmissions} 条\n• 政策简报：${pendingBriefs} 份\n\n合计 **${total}** 条待处理。`,
        data: { pendingCards, pendingSubmissions, pendingBriefs, total },
      }
    }
    case '/缺口': {
      const gaps = await prisma.knowledgeGap.findMany({
        where: { status: { in: ['pending', 'in_progress'] } },
        orderBy: [{ priority: 'asc' }, { frequency: 'desc' }],
        take: 5,
      })
      if (gaps.length === 0) {
        return { reply: '✅ 当前没有待处理的知识缺口。' }
      }
      const list = gaps
        .map((g, i) => `${i + 1}. **${g.question.substring(0, 40)}**（被问 ${g.frequency} 次，${g.priority === 'high' ? '高' : g.priority === 'medium' ? '中' : '低'}优先级）`)
        .join('\n')
      return {
        reply: `🔍 当前知识缺口（前 5 条）：\n\n${list}\n\n更多请查看[知识缺口管理](/knowledge-gaps)。`,
        data: { gaps },
      }
    }
    case '/统计': {
      const [totalCards, publishedCards, totalQueries, totalGaps] = await Promise.all([
        prisma.knowledgeCard.count(),
        prisma.knowledgeCard.count({ where: { status: 'published' } }),
        prisma.experienceQuery.count(),
        prisma.knowledgeGap.count({ where: { status: { in: ['pending', 'in_progress'] } } }),
      ])
      return {
        reply: `📊 系统统计：\n\n• 知识卡总数：${totalCards} 张（已发布 ${publishedCards}）\n• 经验查询：${totalQueries} 次\n• 知识缺口：${totalGaps} 个`,
        data: { totalCards, publishedCards, totalQueries, totalGaps },
      }
    }
    case '/帮助':
    default:
      return {
        reply: `🤖 **GenericAgent 可用指令：**\n\n• \`/审核\` — 查看待审核事项\n• \`/缺口\` — 查看知识缺口\n• \`/统计\` — 查看系统统计\n• \`/帮助\` — 显示此帮助\n\n也可以直接输入问题，我会从知识库中检索并回答。`,
      }
  }
}

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: '请输入消息内容' }, { status: 400 })
    }

    const trimmed = message.trim()

    // 检查是否为快捷指令
    if (trimmed.startsWith('/')) {
      const command = trimmed.split(/\s+/)[0].toLowerCase()
      const result = await handleCommand(command, user.id)

      await createAuditLog({
        userId: user.id,
        action: 'query',
        entityType: 'experience_query',
        details: { type: 'agent_chat', command, responseLength: result.reply.length },
      })

      return NextResponse.json({
        message: {
          role: 'agent',
          content: result.reply,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // 自然语言提问 - 检索知识库
    const searchResults = await searchKnowledgeCards(trimmed, user)
    const retrievedCards = searchResults.map((r) => r.card)

    if (retrievedCards.length === 0) {
      // 未找到匹配 - 识别知识缺口
      const gap = await prisma.knowledgeGap.create({
        data: {
          question: trimmed,
          frequency: 1,
          priority: 'high',
          status: 'pending',
          suggestedAction: 'create_card',
        },
      })

      const reply = `❓ 当前没有找到与"${trimmed.substring(0, 30)}"相关的可信经验。\n\n已将此问题记录为知识缺口，系统将自动推动导师补充。\n\n您也可以：\n• 查看[知识缺口管理](/knowledge-gaps)了解详情\n• 联系导师手动补充相关知识卡`

      return NextResponse.json({
        message: {
          role: 'agent',
          content: reply,
          timestamp: new Date().toISOString(),
        },
        gap: { id: gap.id, question: gap.question },
      })
    }

    // 有匹配 - 生成引用型回答
    const llm = getLLMProvider()
    const reply = await llm.generateExperienceReply({
      question: trimmed,
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

    // 保存查询记录
    await prisma.experienceQuery.create({
      data: {
        question: trimmed,
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

    // 构建回复内容
    let content = ''
    if (reply.policyExplanation) content += `💡 **建议做法：**\n${reply.policyExplanation}\n\n`
    if (reply.riskReminder) content += `⚠️ **风险提醒：** ${reply.riskReminder}\n\n`
    if (reply.serviceOpportunity) content += `📌 **服务机会：** ${reply.serviceOpportunity}\n\n`
    if (reply.salesScript) content += `💬 **参考话术：** ${reply.salesScript}\n\n`

    // 引用来源
    if (reply.citedSources && reply.citedSources.length > 0) {
      content += '📎 **引用来源：**\n'
      for (const source of reply.citedSources) {
        content += `• 《${source.title}》`
        if (source.reviewerName) content += ` - 审核人：${source.reviewerName}`
        if (source.updatedAt) content += ` | ${source.updatedAt}`
        content += '\n'
      }
    }

    await createAuditLog({
      userId: user.id,
      action: 'generate',
      entityType: 'experience_query',
      details: { type: 'agent_chat', cardCount: retrievedCards.length },
    })

    return NextResponse.json({
      message: {
        role: 'agent',
        content: content || '已为您检索到相关经验，请查看引用来源。',
        citations: reply.citedSources,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('Agent chat error', error as Error)
    return NextResponse.json(
      { error: '处理消息时出错，请重试' },
      { status: 500 }
    )
  }
})
