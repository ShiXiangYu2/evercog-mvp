import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth'
import { validateBody, createPolicyLinkSchema } from '@/lib/validation'

// GET /api/policy-links - List all policy links
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status') || undefined
    const customerType = searchParams.get('customerType') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (customerType) where.customerType = customerType
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { url: { contains: search } },
        { source: { contains: search } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.policyLink.findMany({
        where,
        include: {
          submitter: {
            select: { id: true, name: true, role: true },
          },
          brief: {
            select: { id: true, title: true, reviewStatus: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.policyLink.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Failed to fetch policy links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy links' },
      { status: 500 }
    )
  }
})

// POST /api/policy-links - Create a new policy link
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { data, error } = await validateBody(request, createPolicyLinkSchema)
    if (error) return error

    const { url, title, source, departmentId, customerType } = data

    const policyLink = await prisma.policyLink.create({
      data: {
        url,
        title: title || null,
        source: source || null,
        submitterId: user.id,
        departmentId: departmentId || null,
        customerType: customerType || null,
        status: 'submitted',
      },
      include: {
        submitter: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'policy_link',
      entityId: policyLink.id,
      details: { title: policyLink.title, url: policyLink.url },
    })

    return NextResponse.json(policyLink, { status: 201 })
  } catch (error) {
    console.error('Failed to create policy link:', error)
    return NextResponse.json(
      { error: 'Failed to create policy link' },
      { status: 500 }
    )
  }
})
