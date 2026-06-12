import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/push-records/targets - Get available push targets (departments, roles, users)
export const GET = withAuth(async () => {
  try {
    const [departments, users] = await Promise.all([
      prisma.department.findMany({
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          name: true,
          role: true,
          department: {
            select: { name: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ])

    // Aggregate role counts
    const roleCountMap: Record<string, number> = {}
    for (const user of users) {
      roleCountMap[user.role] = (roleCountMap[user.role] || 0) + 1
    }

    const roleLabels: Record<string, string> = {
      sales: '销售',
      customer_service: '客服',
      operations: '运营',
      finance: '财务',
      mentor: '导师',
      trainee: '新人',
      admin: '管理员',
      ai_info: 'AI 工程师',
    }

    const roles = Object.entries(roleCountMap).map(([value, count]) => ({
      value,
      label: roleLabels[value] || value,
      count,
    }))

    return NextResponse.json({
      departments,
      roles,
      users,
    })
  } catch (error) {
    console.error('Failed to fetch targets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch targets' },
      { status: 500 }
    )
  }
})
