import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth'
import { validateBody, createPushRecordSchema } from '@/lib/validation'

// GET /api/push-records - List all push records
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status') || undefined
    const readStatus = searchParams.get('readStatus') || undefined
    const channel = searchParams.get('channel') || undefined
    const briefId = searchParams.get('briefId') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (readStatus) where.readStatus = readStatus
    if (channel) where.channel = channel
    if (briefId) where.policyBriefId = briefId
    if (search) {
      where.OR = [
        { targetName: { contains: search } },
        { policyBrief: { title: { contains: search } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.pushRecord.findMany({
        where,
        include: {
          policyBrief: {
            select: { id: true, title: true, summary: true },
          },
          pusher: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pushRecord.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Failed to fetch push records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch push records' },
      { status: 500 }
    )
  }
})

// POST /api/push-records - Create push records
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { data, error } = await validateBody(request, createPushRecordSchema)
    if (error) return error

    const {
      policyBriefId,
      channel,
      targetType,
      targets,
    } = data

    // Verify the brief exists
    const brief = await prisma.policyBrief.findUnique({
      where: { id: policyBriefId },
      include: {
        policyLink: {
          select: { id: true },
        },
      },
    })

    if (!brief) {
      return NextResponse.json(
        { error: 'Policy brief not found' },
        { status: 404 }
      )
    }

    // Build payload snapshot from brief content
    const payloadSnapshot = JSON.stringify({
      title: brief.title,
      summary: brief.summary,
      keyClauses: brief.keyClauses,
      actionSuggestions: brief.actionSuggestions,
      riskReminders: brief.riskReminders,
      sourceUrl: brief.sourceUrl,
      channel,
      pushedAt: new Date().toISOString(),
    })

    // Create push records for each target
    const now = new Date()
    const records = await prisma.pushRecord.createManyAndReturn({
      data: targets.map((target: { id?: string; name?: string }) => ({
        policyBriefId,
        policyLinkId: brief.policyLink?.id || null,
        channel,
        targetType,
        targetId: target.id || null,
        targetName: target.name || null,
        status: 'sent', // Simulate immediate delivery
        readStatus: 'unread',
        payloadSnapshot,
        pusherId: user.id,
        sentAt: now,
      })),
      include: {
        policyBrief: {
          select: { id: true, title: true },
        },
        pusher: {
          select: { id: true, name: true },
        },
      },
    })

    // Update policy link status to 'pushed' if it exists
    if (brief.policyLink?.id) {
      await prisma.policyLink.update({
        where: { id: brief.policyLink.id },
        data: { status: 'pushed' },
      })
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'push',
      entityType: 'policy_brief',
      entityId: policyBriefId,
      details: {
        channel,
        targetType,
        targetCount: targets.length,
        targetNames: targets.map((t: { name?: string }) => t.name).filter(Boolean),
      },
    })

    return NextResponse.json({
      records,
      count: records.length,
    }, { status: 201 })
  } catch (err) {
    console.error('Failed to create push records:', err)
    return NextResponse.json(
      { error: 'Failed to create push records' },
      { status: 500 }
    )
  }
})
