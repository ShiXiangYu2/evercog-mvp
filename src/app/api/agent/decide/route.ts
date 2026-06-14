/**
 * POST /api/agent/decide
 *
 * 触发一次决策循环
 */
import { NextResponse } from 'next/server'
import { getDecisionEngine } from '@/lib/agent/decision-engine'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async () => {
  try {
    const decisionEngine = getDecisionEngine()
    const result = await decisionEngine.makeDecision()

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
