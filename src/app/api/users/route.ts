import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/users - List all users with department info
// allowAnonymous: 登录页面需要此接口获取用户列表
export const GET = withAuth(
  async () => {
    try {
      const users = await prisma.user.findMany({
        where: { status: 'active' },
        include: {
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      return NextResponse.json({ users })
    } catch (error) {
      console.error('Failed to fetch users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
  },
  { allowAnonymous: true }
)
