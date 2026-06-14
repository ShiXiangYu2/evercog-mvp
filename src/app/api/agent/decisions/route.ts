/**
 * GET /api/agent/decisions
 *
 * 获取决策历史
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDecisionEngine } from '@/lib/agent/decision-engine'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20

    const decisionEngine = getDecisionEngine()
    const history = await decisionEngine.getDecisionHistory({ limit })

    return NextResponse.json({
      success: true,
      data: {
        decisions: history,
        totalCount: history.length,
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
