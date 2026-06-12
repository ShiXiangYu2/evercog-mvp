import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth, isOwner, isAdmin } from '@/lib/auth'

// GET /api/knowledge-cards/[id] - Get a single knowledge card
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: 'Missing card ID' }, { status: 400 })
  }

  const card = await prisma.knowledgeCard.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, role: true, departmentId: true } },
      reviewer: { select: { id: true, name: true } },
    },
  })

  if (!card) {
    return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 })
  }

  // 非 published 状态只有创建者和审核者可见
  if (card.status !== 'published') {
    if (card.creatorId !== user.id && card.reviewerId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 })
    }
  }

  return NextResponse.json(card)
})

// PUT /api/knowledge-cards/[id] - Update a knowledge card
export const PUT = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing card ID' }, { status: 400 })
    }

    const existing = await prisma.knowledgeCard.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 })
    }

    // 权限检查：仅创建者或管理员可编辑
    if (!isOwner(user, existing.creatorId) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Only the creator or admin can edit this card' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      category,
      tags,
      content,
      departmentId,
      customerType,
      source,
      riskNotes,
      visibilityScope,
      status,
    } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = JSON.stringify(tags)
    if (content !== undefined) updateData.content = content
    if (departmentId !== undefined) updateData.departmentId = departmentId || null
    if (customerType !== undefined) updateData.customerType = customerType || null
    if (source !== undefined) updateData.source = source || null
    if (riskNotes !== undefined) updateData.riskNotes = riskNotes || null
    if (visibilityScope !== undefined) updateData.visibilityScope = visibilityScope

    // Handle status changes with version increment
    if (status !== undefined) {
      updateData.status = status
      if (status === 'published' || status === 'rejected') {
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
      userId: user.id,
      action: 'edit',
      entityType: 'knowledge_card',
      entityId: id,
      details: { title: card.title },
    })

    return NextResponse.json(card)
  } catch (error) {
    console.error('Failed to update knowledge card:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge card' },
      { status: 500 }
    )
  }
})

// DELETE /api/knowledge-cards/[id] - Delete a knowledge card
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

      const existing = await prisma.knowledgeCard.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 })
      }

      // 权限检查：仅管理员可删除
      if (!isAdmin(user)) {
        return NextResponse.json(
          { error: 'Only admin can delete knowledge cards' },
          { status: 403 }
        )
      }

      await prisma.knowledgeCard.delete({ where: { id } })

      await createAuditLog({
        userId: user.id,
        action: 'edit',
        entityType: 'knowledge_card',
        entityId: id,
        details: { title: existing.title, action: 'delete' },
      })

      return NextResponse.json({ message: 'Knowledge card deleted successfully' })
    } catch (error) {
      console.error('Failed to delete knowledge card:', error)
      return NextResponse.json(
        { error: 'Failed to delete knowledge card' },
        { status: 500 }
      )
    }
  },
  { requiredRoles: ['admin'] }
)
