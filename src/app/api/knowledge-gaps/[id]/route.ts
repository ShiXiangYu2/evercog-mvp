/**
 * PATCH /api/knowledge-gaps/[id] - 更新知识缺口状态
 *
 * 支持将缺口标记为 resolved（已解决）或 ignored（已忽略）
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export const PATCH = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing gap ID' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!['resolved', 'ignored', 'in_progress'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: resolved, ignored, or in_progress' },
        { status: 400 }
      )
    }

    const gap = await prisma.knowledgeGap.findUnique({ where: { id } })
    if (!gap) {
      return NextResponse.json({ error: 'Knowledge gap not found' }, { status: 404 })
    }

    const updated = await prisma.knowledgeGap.update({
      where: { id },
      data: {
        status,
        resolvedBy: status === 'resolved' ? user.id : undefined,
        resolvedAt: status === 'resolved' ? new Date() : undefined,
      },
    })

    await createAuditLog({
      userId: user.id,
      action: status === 'resolved' ? 'approve' : 'edit',
      entityType: 'knowledge_gap',
      entityId: id,
      details: { action: status, question: gap.question },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update knowledge gap:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge gap' },
      { status: 500 }
    )
  }
})
