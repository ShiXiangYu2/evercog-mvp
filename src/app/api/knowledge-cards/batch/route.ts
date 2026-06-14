/**
 * POST /api/knowledge-cards/batch
 *
 * Batch operations intentionally go through KnowledgeCardService so every item
 * follows the same permission checks, state transitions, versioning, and audit
 * logging as single-card operations.
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getKnowledgeCardService } from '@/lib/services/knowledge-card'
import { handleServiceError } from '@/lib/service-error'
import { z } from 'zod'

const BatchOperationSchema = z.object({
  operation: z.enum(['approve', 'reject', 'publish', 'archive']),
  cardIds: z.array(z.string()).min(1, 'At least one card ID is required'),
  reason: z.string().optional(),
})

export const POST = withAuth(
  async (request, { user }) => {
    try {
      if (!['admin', 'mentor', 'finance'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const validationResult = BatchOperationSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error,
          },
          { status: 400 }
        )
      }

      const { operation, cardIds, reason } = validationResult.data
      if (operation === 'reject' && !reason) {
        return NextResponse.json(
          { error: 'Reject operation requires a reason' },
          { status: 400 }
        )
      }

      const service = getKnowledgeCardService()
      const items = []

      for (const cardId of cardIds) {
        if (operation === 'approve' || operation === 'publish') {
          items.push(await service.approve(cardId, user, reason))
        } else if (operation === 'reject') {
          items.push(await service.reject(cardId, user, reason as string))
        } else {
          items.push(await service.archive(cardId, user))
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          operation,
          affectedCount: items.length,
          cardIds: items.map((item) => item.id),
          items,
        },
      })
    } catch (error) {
      return handleServiceError(error)
    }
  }
)
