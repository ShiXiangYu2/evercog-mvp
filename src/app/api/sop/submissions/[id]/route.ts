import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/sop/submissions/[id] - Get submission detail
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 })
    }

    const submission = await prisma.sOPSubmission.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            mentor: { select: { id: true, name: true, role: true } },
            trainee: { select: { id: true, name: true, role: true } },
          },
        },
        submitter: { select: { id: true, name: true, role: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // 权限检查：仅导师、提交者本人或管理员可查看
    if (
      submission.task.mentorId !== user.id &&
      submission.submitterId !== user.id &&
      user.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Failed to fetch submission:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    )
  }
})
