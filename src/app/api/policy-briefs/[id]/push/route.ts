/**
 * POST /api/policy-briefs/[id]/push - 推送政策简报
 *
 * 将审核通过的政策简报推送给相关部门
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { pushBrief } from '@/lib/agent/push-service'
import logger from '@/lib/logger'

export const POST = withAuth(async (request, { user, params }) => {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing policy brief ID' }, { status: 400 })
    }

    // 获取简报
    const brief = await prisma.policyBrief.findUnique({
      where: { id },
    })

    if (!brief) {
      return NextResponse.json({ error: 'Policy brief not found' }, { status: 404 })
    }

    // 检查简报状态：只有已审核的简报可以推送
    if (brief.reviewStatus !== 'reviewed') {
      return NextResponse.json(
        { error: 'Only reviewed briefs can be pushed' },
        { status: 400 }
      )
    }

    // 检查权限
    if (!['admin', 'operations', 'finance'].includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to push briefs' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { channel = 'internal', targetType, targetIds } = body

    logger.info('Triggering brief push', {
      briefId: id,
      userId: user.id,
      channel,
    })

    // 执行推送
    const results = await pushBrief({
      briefId: id,
      channel,
      targetType,
      targetIds,
    })

    // 更新简报状态为已推送
    await prisma.policyBrief.update({
      where: { id },
      data: {
        // 注意：这里不更新 reviewStatus，因为推送后简报仍然是"已审核"状态
      },
    })

    // 更新关联的政策链接状态
    await prisma.policyLink.update({
      where: { id: brief.policyLinkId },
      data: { status: 'pushed' },
    })

    return NextResponse.json({
      success: true,
      results,
      pushedCount: results.filter((r) => r.success).length,
    })
  } catch (error) {
    logger.error('Failed to push policy brief', error as Error)
    return NextResponse.json(
      { error: 'Failed to push policy brief' },
      { status: 500 }
    )
  }
})
