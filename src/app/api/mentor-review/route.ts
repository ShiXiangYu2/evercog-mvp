import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      // 待审核的知识卡
      pendingKnowledgeCards,
      // 待审核的 SOP 提交
      pendingSOPSubmissions,
      // 待审核的政策简报
      pendingPolicyBriefs,
      // 待补充的知识缺口
      pendingKnowledgeGaps,
      // Agent 任务（用于 Agent 预审）
      agentTasks,
      // 审计日志（用于统计）
      auditLogs,
    ] = await Promise.all([
      // 待审核的知识卡
      prisma.knowledgeCard.findMany({
        where: { status: 'pending_review' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { name: true, department: { select: { name: true } } } },
        },
      }),
      // 待审核的 SOP 提交
      prisma.sOPSubmission.findMany({
        where: { status: 'submitted' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: { select: { name: true, department: { select: { name: true } } } },
          task: { select: { title: true } },
        },
      }),
      // 待审核的政策简报
      prisma.policyBrief.findMany({
        where: { reviewStatus: 'pending_review' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          generator: { select: { name: true, department: { select: { name: true } } } },
          policyLink: { select: { title: true } },
        },
      }),
      // 待补充的知识缺口
      prisma.knowledgeGap.findMany({
        where: { status: { in: ['pending', 'in_progress'] } },
        take: 10,
        orderBy: [
          { priority: 'asc' },
          { frequency: 'desc' },
        ],
      }),
      // Agent 任务
      prisma.agentTask.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
        },
      }),
      // 审计日志（用于统计）
      prisma.auditLog.findMany({
        where: {
          action: { in: ['review', 'publish', 'reject'] },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // 构建待审核队列
    const pendingReviews = [
      ...pendingKnowledgeCards.map((card) => ({
        id: card.id,
        type: 'knowledge',
        typeLabel: '知识卡',
        title: card.title,
        submitter: `${card.creator.department?.name || ''}-${card.creator.name}`,
        createdAt: card.createdAt,
        priority: 'medium',
      })),
      ...pendingSOPSubmissions.map((submission) => ({
        id: submission.id,
        type: 'sop',
        typeLabel: 'SOP',
        title: submission.task.title,
        submitter: `${submission.submitter.department?.name || ''}-${submission.submitter.name}`,
        createdAt: submission.createdAt,
        priority: 'medium',
      })),
      ...pendingPolicyBriefs.map((brief) => ({
        id: brief.id,
        type: 'brief',
        typeLabel: '政策简报',
        title: brief.title,
        submitter: `${brief.generator.department?.name || ''}-${brief.generator.name}`,
        createdAt: brief.createdAt,
        priority: 'high',
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // 计算审核统计
    const totalReviews = auditLogs.filter((log) => log.action === 'review').length
    const approvedReviews = auditLogs.filter((log) => log.action === 'publish').length
    const rejectedReviews = auditLogs.filter((log) => log.action === 'reject').length
    const approvalRate = totalReviews > 0 ? Math.round((approvedReviews / totalReviews) * 100) : 0

    // 构建审核统计
    const reviewStats = {
      totalReviews: totalReviews + approvedReviews + rejectedReviews,
      approvalRate,
      pendingCount: pendingReviews.length,
      thisWeekProcessed: Math.min(approvedReviews + rejectedReviews, 18), // 模拟数据
      avgResponseTime: 2.1, // 模拟数据
      rejectedThenResubmitted: Math.min(rejectedReviews, 6), // 模拟数据
    }

    // 构建 Agent 预审结果
    const agentPreviews = agentTasks
      .filter((task) => task.type === 'knowledge_review' || task.type === 'sop_review')
      .map((task) => {
        let status = 'pass'
        let result = '格式规范，内容完整，建议通过'

        if (task.result) {
          try {
            const parsed = JSON.parse(task.result)
            status = parsed.preReview || 'pass'
            result = parsed.suggestion || result
          } catch {
            // 使用默认值
          }
        }

        return {
          id: task.id,
          title: task.title,
          status,
          result,
        }
      })

    // 构建知识缺口列表
    const knowledgeGaps = pendingKnowledgeGaps.map((gap) => ({
      id: gap.id,
      question: gap.question,
      topic: gap.topic,
      frequency: gap.frequency,
      priority: gap.priority,
      status: gap.status,
      suggestedAction: gap.suggestedAction,
      createdAt: gap.createdAt,
    }))

    // 构建导师工作台
    const mentorWorkspace = {
      myPendingTasks: pendingReviews.length,
      thisWeekProcessed: reviewStats.thisWeekProcessed,
      avgResponseTime: reviewStats.avgResponseTime,
      unassignedTasks: Math.max(0, pendingReviews.length - 3), // 模拟数据
      pendingGaps: knowledgeGaps.length,
    }

    return NextResponse.json({
      pendingReviews,
      reviewStats,
      agentPreviews,
      mentorWorkspace,
      knowledgeGaps,
    })
  } catch (error) {
    console.error('Failed to fetch mentor review data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mentor review data' },
      { status: 500 }
    )
  }
})
