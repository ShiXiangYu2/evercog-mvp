/**
 * POST /api/knowledge-cards/[id]/review - 触发知识卡预审
 *
 * 使用 Agent 自动审核知识卡内容
 * 返回审核结果，不直接修改知识卡状态
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { reviewKnowledgeCard } from '@/lib/agent/review-service'
import { createAuditLog } from '@/lib/audit'
import logger from '@/lib/logger'

export const POST = withAuth(async (request, { user, params }) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing knowledge card ID' }, { status: 400 })
    }

    // 获取知识卡
    const card = await prisma.knowledgeCard.findUnique({
      where: { id },
    })

    if (!card) {
      return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 })
    }

    // 检查权限：只有创建者、审核者或管理员可以触发预审
    const canReview =
      user.role === 'admin' ||
      user.role === 'mentor' ||
      user.role === 'finance' ||
      card.creatorId === user.id

    if (!canReview) {
      return NextResponse.json(
        { error: 'You do not have permission to review this card' },
        { status: 403 }
      )
    }

    // 执行预审
    logger.info('Triggering knowledge card review', {
      cardId: id,
      userId: user.id,
    })

    const reviewResult = await reviewKnowledgeCard(id)

    // 记录审计日志
    await createAuditLog({
      userId: user.id,
      action: 'review',
      entityType: 'knowledge_card',
      entityId: id,
      details: {
        score: reviewResult.score,
        verdict: reviewResult.verdict,
        suggestedAction: reviewResult.suggestedAction,
      },
    })

    return NextResponse.json({
      cardId: id,
      review: reviewResult,
    })
  } catch (error) {
    logger.error('Failed to review knowledge card', error as Error)
    return NextResponse.json(
      { error: 'Failed to review knowledge card' },
      { status: 500 }
    )
  }
})
