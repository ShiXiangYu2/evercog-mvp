/**
 * GET /api/scheduler/status
 *
 * 获取所有 Loop 的运行状态
 */
import { NextResponse } from 'next/server'
import { getScheduler } from '@/lib/scheduler'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const scheduler = getScheduler()
    const statuses = await scheduler.getLoopStatuses()

    return NextResponse.json({
      success: true,
      data: {
        loops: statuses,
        totalCount: statuses.length,
      },
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
