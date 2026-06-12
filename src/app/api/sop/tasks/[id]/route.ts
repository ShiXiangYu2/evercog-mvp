import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/sop/tasks/[id] - Get SOP task detail
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })
    }

    const task = await prisma.sOPTask.findUnique({
      where: { id },
      include: {
        mentor: { select: { id: true, name: true, role: true, department: { select: { name: true } } } },
        trainee: { select: { id: true, name: true, role: true, department: { select: { name: true } } } },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            submitter: { select: { id: true, name: true, role: true } },
            reviewer: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 权限检查：仅导师、新人本人或管理员可查看
    if (task.mentorId !== user.id && task.traineeId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to fetch SOP task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SOP task' },
      { status: 500 }
    )
  }
})
