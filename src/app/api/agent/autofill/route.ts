/**
 * POST /api/agent/autofill
 *
 * 自动填充缺口
 *
 * POST /api/agent/autofill/all
 * 填充所有待处理的高优先级缺口
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAutoFiller } from '@/lib/agent/knowledge-accumulation'
import { AutoFillSchema } from '@/lib/agent/validation'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()

    // 验证输入
    const validationResult = AutoFillSchema.safeParse(body)
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

    const { gapId, fillAll } = validationResult.data
    const autoFiller = getAutoFiller()

    let result
    if (fillAll) {
      result = await autoFiller.fillAllPendingGaps()
    } else if (gapId) {
      result = await autoFiller.fillGap(gapId)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'gapId or fillAll is required',
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
