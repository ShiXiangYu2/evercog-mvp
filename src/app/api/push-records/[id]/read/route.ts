import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth'

// POST /api/push-records/[id]/read - Mark push record as read
export const POST = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing push record ID' }, { status: 400 })
    }

    const existing = await prisma.pushRecord.findUnique({
      where: { id },
      include: {
        policyBrief: { select: { id: true, title: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Push record not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const record = await prisma.pushRecord.update({
      where: { id },
      data: {
        readStatus: 'read',
        readAt: now,
      },
      include: {
        policyBrief: {
          select: { id: true, title: true },
        },
        pusher: {
          select: { id: true, name: true },
        },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'policy_brief',
      entityId: existing.policyBriefId,
      details: {
        action: 'mark_as_read',
        pushRecordId: id,
        targetName: existing.targetName,
        readAt: now.toISOString(),
      },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('Failed to mark push record as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark push record as read' },
      { status: 500 }
    )
  }
})
