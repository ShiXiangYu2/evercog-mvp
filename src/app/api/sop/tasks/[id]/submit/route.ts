import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getLLMProvider } from '@/lib/llm-provider'
import { withAuth } from '@/lib/auth'
import { validateBody, submitSOPSchema } from '@/lib/validation'

// POST /api/sop/tasks/[id]/submit - Trainee submits SOP content
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })
    }

    const { data, error } = await validateBody(request, submitSOPSchema)
    if (error) return error

    const { content } = data

    // Verify task exists and belongs to this trainee
    const task = await prisma.sOPTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (task.traineeId !== user.id) {
      return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 })
    }

    // Generate inspection report using LLM provider
    const llm = getLLMProvider()
    const report = await llm.generateSOPInspection({ content, template: task.template || undefined })

    // Create submission
    const submission = await prisma.sOPSubmission.create({
      data: {
        taskId: id,
        content,
        submitterId: user.id,
        inspectionReport: report.inspectionReport,
        completeness: report.completeness,
        missingSteps: JSON.stringify(report.missingSteps),
        riskPoints: JSON.stringify(report.riskPoints),
        executability: report.executability,
        status: 'submitted',
      },
      include: {
        submitter: { select: { id: true, name: true, role: true } },
      },
    })

    // Update task status
    await prisma.sOPTask.update({
      where: { id },
      data: { status: 'submitted' },
    })

    await createAuditLog({
      userId: user.id,
      action: 'create',
      entityType: 'sop_submission',
      entityId: submission.id,
      details: {
        taskId: id,
        completeness: report.completeness,
        executability: report.executability,
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error('Failed to submit SOP:', error)
    return NextResponse.json(
      { error: 'Failed to submit SOP' },
      { status: 500 }
    )
  }
})
