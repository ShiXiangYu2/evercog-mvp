/**
 * POST /api/scheduler/trigger
 *
 * 手动触发 Loop
 */
import { NextRequest, NextResponse } from 'next/server'
import { getScheduler } from '@/lib/scheduler'
import { TriggerLoopSchema } from '@/lib/agent/validation'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()

    // 验证输入
    const validationResult = TriggerLoopSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error,
        },
        { status: 400 }
      )
    }

    const { loopName, reason } = validationResult.data
    const scheduler = getScheduler()
    const result = await scheduler.triggerLoop(loopName, reason || 'manual_trigger')

    return NextResponse.json({
      success: true,
      data: result,
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
