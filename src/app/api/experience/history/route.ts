import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/experience/history - List experience query history
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { question: { contains: search } },
    ]
  }

  if (status) where.status = status
  // 普通用户只能看自己的记录，admin 可看所有
  if (user.role !== 'admin') {
    where.callerId = user.id
  }

  const [items, total] = await Promise.all([
    prisma.experienceQuery.findMany({
      where,
      include: {
        caller: {
          select: {
            id: true,
            name: true,
            role: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.experienceQuery.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
})
