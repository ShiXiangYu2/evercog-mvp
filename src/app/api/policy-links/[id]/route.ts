/**
 * PolicyLink API 路由 - 单个实体操作
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPolicyLinkService } from '@/lib/services/policy-link'
import { handleServiceError } from '@/lib/service-error'

// GET /api/policy-links/[id] - 获取单个政策链接
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing policy link ID' }, { status: 400 })
    }

    const service = getPolicyLinkService()
    const link = await service.getById(id, user)

    return NextResponse.json(link)
  } catch (error) {
    return handleServiceError(error)
  }
})

// PATCH /api/policy-links/[id] - 更新政策链接
export const PATCH = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing policy link ID' }, { status: 400 })
    }

    const body = await request.json()

    const service = getPolicyLinkService()
    const link = await service.update(id, body, user)

    return NextResponse.json(link)
  } catch (error) {
    return handleServiceError(error)
  }
})

// DELETE /api/policy-links/[id] - 删除政策链接
export const DELETE = withAuth(
  async (
    request: NextRequest,
    { user, params }
  ) => {
    try {
      const id = params?.id
      if (!id) {
        return NextResponse.json({ error: 'Missing policy link ID' }, { status: 400 })
      }

      const service = getPolicyLinkService()
      await service.delete(id, user)

      return NextResponse.json({ message: 'Policy link deleted successfully' })
    } catch (error) {
      return handleServiceError(error)
    }
  },
  { requiredRoles: ['admin'] }
)
