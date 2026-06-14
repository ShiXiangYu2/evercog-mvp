/**
 * POST /api/knowledge-gaps/detect - 触发知识缺口检测
 *
 * 分析最近的问答记录，识别高频未覆盖问题
 * 生成知识缺口报告
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { detectKnowledgeGaps } from '@/lib/agent/gap-detector'
import { createAuditLog } from '@/lib/audit'
import logger from '@/lib/logger'

export const POST = withAuth(
  async (request, { user }) => {
    try {
      // 检查权限
      if (!['admin', 'ai_info', 'operations'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to run gap detection' },
          { status: 403 }
        )
      }

      const body = await request.json().catch(() => ({}))
      const { days = 7, minFrequency = 3 } = body

      logger.info('Triggering gap detection', {
        userId: user.id,
        days,
        minFrequency,
      })

      // 执行缺口检测
      const result = await detectKnowledgeGaps({ days, minFrequency })

      // 记录审计日志
      await createAuditLog({
        userId: user.id,
        action: 'query',
        entityType: 'experience_query',
        details: {
          action: 'gap_detection',
          gapCount: result.gapCount,
          coverageRate: result.stats.coverageRate,
        },
      })

      return NextResponse.json({
        success: true,
        result,
      })
    } catch (error) {
      logger.error('Failed to detect knowledge gaps', error as Error)
      return NextResponse.json(
        { error: 'Failed to detect knowledge gaps' },
        { status: 500 }
      )
    }
  },
  { requiredRoles: ['admin', 'ai_info', 'operations'] }
)
