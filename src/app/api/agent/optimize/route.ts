/**
 * POST /api/agent/optimize
 *
 * 优化知识卡
 *
 * POST /api/agent/optimize/batch
 * 批量优化低质量卡片
 *
 * GET /api/agent/optimize/outdated
 * 获取过期卡片
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCardOptimizer } from '@/lib/agent/knowledge-accumulation'
import { OptimizeCardSchema } from '@/lib/agent/validation'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'outdated'

    const cardOptimizer = getCardOptimizer()

    if (type === 'outdated') {
      const actions = await cardOptimizer.handleOutdatedCards()
      return NextResponse.json({
        success: true,
        data: { actions },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unknown type',
      },
      { status: 400 }
    )
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

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()

    // 验证输入
    const validationResult = OptimizeCardSchema.safeParse(body)
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

    const { cardId, batch, qualityThreshold, maxCards } = validationResult.data
    const cardOptimizer = getCardOptimizer()

    let result
    if (batch) {
      result = await cardOptimizer.optimizeLowQualityCards({
        qualityThreshold,
        maxCards,
      })
    } else if (cardId) {
      result = await cardOptimizer.optimizeCard(cardId)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'cardId or batch is required',
        },
        { status: 400 }
      )
    }

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
