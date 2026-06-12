import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth, canReview } from '@/lib/auth'

// GET /api/policy-briefs/[id] - Get policy brief detail
export const GET = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing brief ID' }, { status: 400 })
    }

    const brief = await prisma.policyBrief.findUnique({
      where: { id },
      include: {
        generator: {
          select: { id: true, name: true, role: true },
        },
        policyLink: {
          include: {
            submitter: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    })

    if (!brief) {
      return NextResponse.json(
        { error: 'Policy brief not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(brief)
  } catch (error) {
    console.error('Failed to fetch policy brief:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy brief' },
      { status: 500 }
    )
  }
})

// PATCH /api/policy-briefs/[id] - Update policy brief (edit content or review status)
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

    const existing = await prisma.policyBrief.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Policy brief not found' },
        { status: 404 }
      )
    }

    // 权限检查：修改审核状态需要审核权限
    if (body.reviewStatus && body.reviewStatus !== existing.reviewStatus) {
      if (!canReview(user, 'policy_brief')) {
        return NextResponse.json(
          { error: 'You do not have permission to review policy briefs' },
          { status: 403 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    const editableFields = [
      'title', 'summary', 'applicableTo', 'keyClauses',
      'actionSuggestions', 'riskReminders', 'reviewStatus',
    ]

    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.reviewStatus === 'reviewed') {
      updateData.reviewedAt = new Date()
    }

    const brief = await prisma.policyBrief.update({
      where: { id },
      data: updateData,
      include: {
        generator: {
          select: { id: true, name: true, role: true },
        },
        policyLink: {
          select: { id: true, title: true, url: true, source: true },
        },
      },
    })

    // If brief is reviewed, update the policy link status
    if (body.reviewStatus === 'reviewed') {
      await prisma.policyLink.update({
        where: { id: existing.policyLinkId },
        data: { status: 'reviewed' },
      })
    }

    await createAuditLog({
      userId: user.id,
      action: body.reviewStatus ? 'review' : 'edit',
      entityType: 'policy_brief',
      entityId: id,
      details: {
        updatedFields: Object.keys(updateData),
        reviewStatus: body.reviewStatus,
      },
    })

    return NextResponse.json(brief)
  } catch (error) {
    console.error('Failed to update policy brief:', error)
    return NextResponse.json(
      { error: 'Failed to update policy brief' },
      { status: 500 }
    )
  }
})
