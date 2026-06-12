import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { REVIEWABLE_ROLES } from '@/lib/permissions'
import { withAuth } from '@/lib/auth'
import { validateBody, reviewSOPSchema } from '@/lib/validation'

// POST /api/sop/tasks/[id]/review - Mentor reviews submission
export const POST = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })
    }
    const { data, error } = await validateBody(request, reviewSOPSchema)
    if (error) return error

    const { submissionId, action, comment } = data

    // 使用认证用户信息，而非请求体中的 reviewerId
    const reviewerId = user.id

    // Verify reviewer has review permissions
    if (!REVIEWABLE_ROLES.includes(user.role as typeof REVIEWABLE_ROLES[number])) {
      return NextResponse.json(
        { error: 'Only admin, mentor, or finance can review submissions' },
        { status: 403 }
      )
    }

    // Verify task exists and reviewer is the mentor
    const task = await prisma.sOPTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (task.mentorId !== reviewerId) {
      return NextResponse.json({ error: 'Only the assigned mentor can review this submission' }, { status: 403 })
    }

    // Map action to submission status
    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      revision_required: 'revision_required',
    }

    // Update submission
    const submission = await prisma.sOPSubmission.update({
      where: { id: submissionId },
      data: {
        reviewerId,
        reviewComment: comment || null,
        status: statusMap[action],
        approvedAt: action === 'approve' ? new Date() : null,
      },
      include: {
        submitter: { select: { id: true, name: true, role: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    // Update task status based on review action
    let taskStatus = task.status
    if (action === 'approve') {
      taskStatus = 'completed'
    } else if (action === 'revision_required') {
      taskStatus = 'in_progress'
    }

    await prisma.sOPTask.update({
      where: { id },
      data: { status: taskStatus },
    })

    await createAuditLog({
      userId: reviewerId,
      action: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'review',
      entityType: 'sop_submission',
      entityId: submissionId,
      details: {
        taskId: id,
        action,
        comment: comment || null,
      },
    })

    return NextResponse.json({
      submission,
      taskStatus,
    })
  } catch (error) {
    console.error('Failed to review submission:', error)
    return NextResponse.json(
      { error: 'Failed to review submission' },
      { status: 500 }
    )
  }
})
