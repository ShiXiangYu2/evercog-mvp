/**
 * GET /api/analytics/quality-metrics - 获取质量指标
 * POST /api/analytics/quality-metrics - 重新计算质量指标
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getQualityMetrics, calculateQualityMetrics } from '@/lib/analytics/quality-metrics'
import logger from '@/lib/logger'

export const GET = withAuth(async () => {
  try {
    const result = await getQualityMetrics()

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Failed to get quality metrics', error as Error)
    return NextResponse.json(
      { error: 'Failed to get quality metrics' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(
  async (request, { user }) => {
    try {
      // 检查权限
      if (!['admin', 'ai_info'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to recalculate metrics' },
          { status: 403 }
        )
      }

      logger.info('Recalculating quality metrics', { userId: user.id })

      const result = await calculateQualityMetrics()

      return NextResponse.json({
        success: true,
        result,
      })
    } catch (error) {
      logger.error('Failed to calculate quality metrics', error as Error)
      return NextResponse.json(
        { error: 'Failed to calculate quality metrics' },
        { status: 500 }
      )
    }
  },
  { requiredRoles: ['admin', 'ai_info'] }
)
