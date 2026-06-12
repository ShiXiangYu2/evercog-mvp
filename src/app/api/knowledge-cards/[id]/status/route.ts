/**
 * KnowledgeCard API 路由 - 状态流转
 *
 * 迁移到使用 Service 层
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { validateBody, knowledgeCardStatusSchema } from '@/lib/validation'
import { getKnowledgeCardService } from '@/lib/services/knowledge-card'
import { handleServiceError } from '@/lib/service-error'

// POST /api/knowledge-cards/[id]/status - 更新知识卡状态
export const POST = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 })
    }

    const { data, error } = await validateBody(request, knowledgeCardStatusSchema)
    if (error) return error

    const { action, comment } = data
    const service = getKnowledgeCardService()

    let card

    switch (action) {
      case 'submit':
        card = await service.submitForReview(id, user)
        break

      case 'approve':
        card = await service.approve(id, user, comment)
        break

      case 'reject':
        if (!comment) {
          return NextResponse.json(
            { error: '驳回时必须提供原因' },
            { status: 400 }
          )
        }
        card = await service.reject(id, user, comment)
        break

      case 'archive':
        card = await service.archive(id, user)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: submit, approve, reject, archive' },
          { status: 400 }
        )
    }

    return NextResponse.json(card)
  } catch (error) {
    return handleServiceError(error)
  }
})
