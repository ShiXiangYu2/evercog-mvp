/**
 * POST /api/agent/quality/snapshot
 *
 * 触发质量指标计算
 */
import { NextResponse } from 'next/server'
import { getLearningSystem } from '@/lib/agent/learning'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async () => {
  try {
    const learningSystem = getLearningSystem()

    // 运行学习循环（只计算质量指标）
    const result = await learningSystem.runLearningCycle({ skipFeedback: true })

    return NextResponse.json({
      success: true,
      data: {
        metrics: result.qualityMetrics,
        anomalies: result.anomalies,
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
