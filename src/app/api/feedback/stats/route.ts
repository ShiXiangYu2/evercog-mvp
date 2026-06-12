/**
 * GET /api/feedback/stats - 获取反馈统计
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getFeedbackService, type FeedbackTargetType } from '@/lib/feedback-service'
import logger from '@/lib/logger'

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get('targetType') as FeedbackTargetType | null
    const targetId = searchParams.get('targetId')

    // 获取全局统计
    if (!targetType && !targetId) {
      const service = getFeedbackService()
      const stats = await service.getAllFeedbackStats()
      return NextResponse.json(stats)
    }

    // 获取特定目标的统计
    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'Both targetType and targetId are required' },
        { status: 400 }
      )
    }

    if (!['knowledge_card', 'experience_query'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType' },
        { status: 400 }
      )
    }

    const service = getFeedbackService()
    const stats = await service.getFeedbackStats(targetType, targetId)

    return NextResponse.json(stats)
  } catch (error) {
    logger.error('Failed to get feedback stats', error as Error)
    return NextResponse.json(
      { error: 'Failed to get feedback stats' },
      { status: 500 }
    )
  }
})
