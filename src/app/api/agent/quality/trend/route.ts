/**
 * GET /api/agent/quality/trend
 *
 * 获取质量趋势
 */
import { NextRequest, NextResponse } from 'next/server'
import { getLearningSystem } from '@/lib/agent/learning'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const metricType = searchParams.get('metricType') || 'coverage'
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 7

    const learningSystem = getLearningSystem()
    const trend = await learningSystem.getQualityTrend(metricType, days)

    return NextResponse.json({
      success: true,
      data: trend,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}, { requiredRoles: ['admin', 'ai_info'] })
