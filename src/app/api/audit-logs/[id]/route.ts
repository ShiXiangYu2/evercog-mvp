import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/audit-logs/[id] - 审计日志详情
export const GET = withAuth(
  async (
    request: NextRequest,
    { params }
  ) => {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing log ID' }, { status: 400 })
    }

    const log = await prisma.auditLog.findUnique({
      where: { id },
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
    })

    if (!log) {
      return NextResponse.json(
        { error: 'Audit log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(log)
  },
  { requiredRoles: ['admin', 'finance', 'mentor', 'ai_info'] }
)
