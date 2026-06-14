/**
 * GET /api/agent/health
 *
 * 获取系统健康度
 */
import { NextResponse } from 'next/server'
import { getDecisionEngine } from '@/lib/agent/decision-engine'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const decisionEngine = getDecisionEngine()
    const health = await decisionEngine.getSystemHealth()

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
      },
      { status: 500 }
    )
  }
}, { requiredRoles: ['admin', 'ai_info'] })
