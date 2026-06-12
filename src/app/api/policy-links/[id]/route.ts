import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth, isAdmin } from '@/lib/auth'

// GET /api/policy-links/[id] - Get policy link detail
export const GET = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing policy link ID' }, { status: 400 })
    }

    const policyLink = await prisma.policyLink.findUnique({
      where: { id },
      include: {
        submitter: {
          select: { id: true, name: true, role: true },
        },
        brief: {
          include: {
            generator: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    })

    if (!policyLink) {
      return NextResponse.json(
        { error: 'Policy link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(policyLink)
  } catch (error) {
    console.error('Failed to fetch policy link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy link' },
      { status: 500 }
    )
  }
})

// PATCH /api/policy-links/[id] - Update policy link status
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
    const { status, title, source, customerType, departmentId } = body

    const existing = await prisma.policyLink.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Policy link not found' },
        { status: 404 }
      )
    }

    // 权限检查：仅管理员或提交者可修改
    if (!isAdmin(user) && existing.submitterId !== user.id) {
      return NextResponse.json(
        { error: 'Only the submitter or admin can update this policy link' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (title !== undefined) updateData.title = title
    if (source !== undefined) updateData.source = source
    if (customerType !== undefined) updateData.customerType = customerType
    if (departmentId !== undefined) updateData.departmentId = departmentId

    const policyLink = await prisma.policyLink.update({
      where: { id },
      data: updateData,
      include: {
        submitter: {
          select: { id: true, name: true, role: true },
        },
        brief: true,
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'edit',
      entityType: 'policy_link',
      entityId: id,
      details: { updatedFields: Object.keys(updateData) },
    })

    return NextResponse.json(policyLink)
  } catch (error) {
    console.error('Failed to update policy link:', error)
    return NextResponse.json(
      { error: 'Failed to update policy link' },
      { status: 500 }
    )
  }
})
