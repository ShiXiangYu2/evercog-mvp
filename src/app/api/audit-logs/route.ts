import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/audit-logs - 审计日志列表（支持筛选、分页）
export const GET = withAuth(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''
    const entityType = searchParams.get('entityType') || ''
    const userId = searchParams.get('userId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: Record<string, unknown> = {}

    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (userId) where.userId = userId

    // 时间范围筛选
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {}
      if (startDate) createdAtFilter.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        createdAtFilter.lte = end
      }
      where.createdAt = createdAtFilter
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  },
  { requiredRoles: ['admin', 'finance', 'mentor', 'ai_info'] }
)
