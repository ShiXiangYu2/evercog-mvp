import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth, isAdmin } from '@/lib/auth'
import { validateBody, createSOPTaskSchema } from '@/lib/validation'

// GET /api/sop/tasks - List SOP tasks
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const where: Record<string, unknown> = {}

  // 根据角色过滤：导师看创建的任务，新人看分配的任务
  if (user.role === 'mentor') {
    where.mentorId = user.id
  } else if (user.role === 'trainee') {
    where.traineeId = user.id
  }
  // admin 看所有

  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.sOPTask.findMany({
      where,
      include: {
        mentor: { select: { id: true, name: true, role: true } },
        trainee: { select: { id: true, name: true, role: true } },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, completeness: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sOPTask.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
})

// POST /api/sop/tasks - Create a new SOP task
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // 权限检查：仅导师和管理员可创建
    if (user.role !== 'mentor' && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Only mentor or admin can create SOP tasks' },
        { status: 403 }
      )
    }

    const { data, error } = await validateBody(request, createSOPTaskSchema)
    if (error) return error

    const { title, description, template, requirements, mentorId, traineeId, dueDate } = data

    // 验证用户存在
    const [mentor, trainee] = await Promise.all([
      prisma.user.findUnique({ where: { id: mentorId } }),
      prisma.user.findUnique({ where: { id: traineeId } }),
    ])

    if (!mentor || !trainee) {
      return NextResponse.json({ error: 'Mentor or trainee not found' }, { status: 400 })
    }

    const task = await prisma.sOPTask.create({
      data: {
        title,
        description: description || null,
        template: template || null,
        requirements: requirements || null,
        mentorId,
        traineeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'assigned',
      },
      include: {
        mentor: { select: { id: true, name: true, role: true } },
        trainee: { select: { id: true, name: true, role: true } },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'sop_task',
      entityId: task.id,
      details: { title: task.title, traineeId },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Failed to create SOP task:', error)
    return NextResponse.json(
      { error: 'Failed to create SOP task' },
      { status: 500 }
    )
  }
})
