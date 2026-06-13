/**
 * GET /api/knowledge-gaps - 知识缺口列表
 *
 * 支持按状态、优先级筛选，返回缺口列表及统计
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority

    const [items, total, stats] = await Promise.all([
      prisma.knowledgeGap.findMany({
        where,
        orderBy: [
          { priority: 'asc' },
          { frequency: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.knowledgeGap.count({ where }),
      prisma.knowledgeGap.groupBy({
        by: ['status'],
        _count: true,
      }),
    ])

    const statusCounts = stats.reduce((acc, s) => {
      acc[s.status] = s._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        pending: statusCounts['pending'] || 0,
        in_progress: statusCounts['in_progress'] || 0,
        resolved: statusCounts['resolved'] || 0,
        ignored: statusCounts['ignored'] || 0,
        total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch knowledge gaps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge gaps' },
      { status: 500 }
    )
  }
})
