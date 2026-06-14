/**
 * GET /api/scheduler/health
 *
 * 调度器健康检查
 */
import { NextResponse } from 'next/server'
import { getScheduler } from '@/lib/scheduler'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const scheduler = getScheduler()
    const health = await scheduler.getHealth()

    return NextResponse.json({
      success: true,
      data: health,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: {
          status: 'error',
        },
      },
      { status: 500 }
    )
  }
}, { requiredRoles: ['admin', 'ai_info'] })
