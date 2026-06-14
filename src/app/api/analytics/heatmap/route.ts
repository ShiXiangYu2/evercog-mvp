/**
 * GET /api/analytics/heatmap - 获取问答热力图数据
 * POST /api/analytics/heatmap - 重新计算热力图
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getHeatmapData, calculateHeatmap, type TimeRange } from '@/lib/analytics/heatmap'
import logger from '@/lib/logger'

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = (searchParams.get('timeRange') as TimeRange) || 'this_week'

    // 验证 timeRange 参数
    if (!['today', 'this_week', 'this_month'].includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid timeRange. Must be: today, this_week, this_month' },
        { status: 400 }
      )
    }

    const result = await getHeatmapData(timeRange)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Failed to get heatmap data', error as Error)
    return NextResponse.json(
      { error: 'Failed to get heatmap data' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(
  async (request, { user }) => {
    try {
      // 检查权限
      if (!['admin', 'ai_info', 'operations'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to recalculate heatmap' },
          { status: 403 }
        )
      }

      const body = await request.json().catch(() => ({}))
      const { timeRange = 'this_week' } = body

      logger.info('Recalculating heatmap', { userId: user.id, timeRange })

      const result = await calculateHeatmap(timeRange)

      return NextResponse.json({
        success: true,
        result,
      })
    } catch (error) {
      logger.error('Failed to calculate heatmap', error as Error)
      return NextResponse.json(
        { error: 'Failed to calculate heatmap' },
        { status: 500 }
      )
    }
  },
  { requiredRoles: ['admin', 'ai_info', 'operations'] }
)
