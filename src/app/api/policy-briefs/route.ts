import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/policy-briefs - List all policy briefs
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const reviewStatus = searchParams.get('reviewStatus') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (reviewStatus) where.reviewStatus = reviewStatus
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.policyBrief.findMany({
        where,
        include: {
          generator: {
            select: { id: true, name: true, role: true },
          },
          policyLink: {
            select: { id: true, title: true, url: true, source: true, customerType: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.policyBrief.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Failed to fetch policy briefs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy briefs' },
      { status: 500 }
    )
  }
})
