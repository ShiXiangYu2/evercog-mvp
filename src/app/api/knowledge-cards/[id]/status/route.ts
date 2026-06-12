import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth'
import { validateBody, knowledgeCardStatusSchema } from '@/lib/validation'

// POST /api/knowledge-cards/[id]/status - Update card status (review workflow)
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

    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 })
    }

    // 使用认证用户信息，而非请求体中的 userId
    const userId = user.id

    let newStatus: string
    let auditAction: string

    switch (action) {
      case 'submit':
        // draft -> pending_review
        if (existing.status !== 'draft' && existing.status !== 'rejected') {
          return NextResponse.json(
            { error: 'Only draft or rejected cards can be submitted for review' },
            { status: 400 }
          )
        }
        newStatus = 'pending_review'
        auditAction = 'edit'
        break

      case 'approve':
        // pending_review -> published (admin/mentor/finance only)
        if (existing.status !== 'pending_review') {
          return NextResponse.json(
            { error: 'Only cards pending review can be approved' },
            { status: 400 }
          )
        }
        if (!['admin', 'mentor', 'finance'].includes(user.role)) {
          return NextResponse.json(
            { error: 'Only admin, mentor, or finance can approve cards' },
            { status: 403 }
          )
        }
        newStatus = 'published'
        auditAction = 'publish'
        break

      case 'reject':
        // pending_review -> rejected (admin/mentor/finance only)
        if (existing.status !== 'pending_review') {
          return NextResponse.json(
            { error: 'Only cards pending review can be rejected' },
            { status: 400 }
          )
        }
        if (!['admin', 'mentor', 'finance'].includes(user.role)) {
          return NextResponse.json(
            { error: 'Only admin, mentor, or finance can reject cards' },
            { status: 403 }
          )
        }
        newStatus = 'rejected'
        auditAction = 'reject'
        break

      case 'archive':
        // published -> archived
        if (existing.status !== 'published') {
          return NextResponse.json(
            { error: 'Only published cards can be archived' },
            { status: 400 }
          )
        }
        newStatus = 'archived'
        auditAction = 'edit'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: submit, approve, reject, archive' },
          { status: 400 }
        )
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    // Set reviewer when approving/rejecting
    if (action === 'approve' || action === 'reject') {
      updateData.reviewerId = userId
      updateData.reviewedAt = new Date()
      // Increment version on publish
      if (action === 'approve') {
        updateData.version = existing.version + 1
      }
    }

    const card = await prisma.knowledgeCard.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    await createAuditLog({
      userId,
      action: auditAction as 'create' | 'edit' | 'review' | 'publish' | 'reject' | 'query' | 'generate' | 'push' | 'approve',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title, status: newStatus, comment },
    })

    return NextResponse.json(card)
  } catch (error) {
    console.error('Failed to update knowledge card status:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge card status' },
      { status: 500 }
    )
  }
})
