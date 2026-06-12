/**
 * PolicyBrief API 路由 - 单个实体操作
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPolicyBriefService } from '@/lib/services/policy-brief'
import { handleServiceError } from '@/lib/service-error'

// GET /api/policy-briefs/[id] - 获取单个政策简报
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing brief ID' }, { status: 400 })
    }

    const service = getPolicyBriefService()
    const brief = await service.getById(id, user)

    return NextResponse.json(brief)
  } catch (error) {
    return handleServiceError(error)
  }
})

// PATCH /api/policy-briefs/[id] - 更新政策简报
export const PATCH = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing brief ID' }, { status: 400 })
    }

    const body = await request.json()
    const service = getPolicyBriefService()

    // 根据请求体中的 action 决定操作
    if (body.action === 'submit') {
      const brief = await service.submitForReview(id, user)
      return NextResponse.json(brief)
    }

    if (body.action === 'approve') {
      const brief = await service.approve(id, user)
      return NextResponse.json(brief)
    }

    if (body.action === 'reject') {
      if (!body.comment) {
        return NextResponse.json(
          { error: '驳回时必须提供原因' },
          { status: 400 }
        )
      }
      const brief = await service.reject(id, user, body.comment)
      return NextResponse.json(brief)
    }

    // 默认：更新内容
    const brief = await service.update(id, body, user)
    return NextResponse.json(brief)
  } catch (error) {
    return handleServiceError(error)
  }
})
