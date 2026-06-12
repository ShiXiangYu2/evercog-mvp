/**
 * KnowledgeCard API 路由 - 单个实体操作
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getKnowledgeCardService } from '@/lib/services/knowledge-card'
import { handleServiceError } from '@/lib/service-error'

// GET /api/knowledge-cards/[id] - 获取单个知识卡
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 })
    }

    const service = getKnowledgeCardService()
    const card = await service.getById(id, user)

    return NextResponse.json(card)
  } catch (error) {
    return handleServiceError(error)
  }
})

// PUT /api/knowledge-cards/[id] - 更新知识卡
export const PUT = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 })
    }

    const body = await request.json()
    const { version, ...updateData } = body

    const service = getKnowledgeCardService()
    const card = await service.update(id, updateData, user, version)

    return NextResponse.json(card)
  } catch (error) {
    return handleServiceError(error)
  }
})

// DELETE /api/knowledge-cards/[id] - 删除知识卡
export const DELETE = withAuth(
  async (
    request: NextRequest,
    { user, params }
  ) => {
    try {
      const id = params?.id
      if (!id) {
        return NextResponse.json({ error: 'Missing card ID' }, { status: 400 })
      }

      const service = getKnowledgeCardService()
      await service.delete(id, user)

      return NextResponse.json({ message: 'Knowledge card deleted successfully' })
    } catch (error) {
      return handleServiceError(error)
    }
  },
  { requiredRoles: ['admin'] }
)
