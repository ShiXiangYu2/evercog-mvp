/**
 * POST /api/feedback - 创建反馈
 * GET /api/feedback - 获取反馈列表
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getFeedbackService, type FeedbackTargetType } from '@/lib/feedback-service'
import logger from '@/lib/logger'

export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const { targetType, targetId, rating, helpful, comment } = body

    // 验证输入
    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'targetType and targetId are required' },
        { status: 400 }
      )
    }

    if (!['knowledge_card', 'experience_query'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType' },
        { status: 400 }
      )
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const service = getFeedbackService()
    const feedback = await service.createFeedback({
      userId: user.id,
      targetType: targetType as FeedbackTargetType,
      targetId,
      rating,
      helpful,
      comment,
    })

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    logger.error('Failed to create feedback', error as Error)
    return NextResponse.json(
      { error: 'Failed to create feedback' },
      { status: 500 }
    )
  }
})

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get('targetType') as FeedbackTargetType | null
    const targetId = searchParams.get('targetId')

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'targetType and targetId are required' },
        { status: 400 }
      )
    }

    const service = getFeedbackService()
    const feedbacks = await service.getFeedbacks(targetType, targetId)

    return NextResponse.json({ feedbacks })
  } catch (error) {
    logger.error('Failed to get feedbacks', error as Error)
    return NextResponse.json(
      { error: 'Failed to get feedbacks' },
      { status: 500 }
    )
  }
})
