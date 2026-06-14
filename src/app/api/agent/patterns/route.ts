/**
 * GET /api/agent/patterns
 *
 * 获取学习到的模式
 *
 * POST /api/agent/patterns
 *
 * 触发学习分析
 */
import { NextRequest, NextResponse } from 'next/server'
import { getLearningSystem } from '@/lib/agent/learning'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const category = searchParams.get('category') || undefined
    const minConfidence = searchParams.get('minConfidence')
      ? parseFloat(searchParams.get('minConfidence')!)
      : undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    const learningSystem = getLearningSystem()
    const patterns = await learningSystem.getPatterns({
      type,
      category,
      minConfidence,
      limit,
    })

    const stats = await learningSystem.getPatternStats()

    return NextResponse.json({
      success: true,
      data: {
        patterns,
        stats,
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

export const POST = withAuth(async (_request: NextRequest) => {
  try {
    const learningSystem = getLearningSystem()
    const result = await learningSystem.runLearningCycle()

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
