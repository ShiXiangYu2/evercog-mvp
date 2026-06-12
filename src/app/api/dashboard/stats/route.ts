import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      policyLinksCount,
      policyBriefsCount,
      knowledgeCardsCount,
      pushRecordsCount,
      experienceQueriesCount,
      sopTasksCount,
      pendingReviewCount,
      auditLogsCount,
      publishedCardsCount,
      unreadPushCount,
      pendingBriefsCount,
      activeUsersCount,
      recentActivities,
      // 新增：Agent 任务和知识缺口统计
      pendingAgentTasksCount,
      pendingKnowledgeGapsCount,
      highPriorityGapsCount,
      todayActivitiesCount,
      // 新增：质量监控指标
      latestQualityMetrics,
    ] = await Promise.all([
      prisma.policyLink.count(),
      prisma.policyBrief.count(),
      prisma.knowledgeCard.count(),
      prisma.pushRecord.count(),
      prisma.experienceQuery.count(),
      prisma.sOPTask.count(),
      // 待审核数：待审核的知识卡 + 待审核的简报
      Promise.all([
        prisma.knowledgeCard.count({ where: { status: 'pending_review' } }),
        prisma.policyBrief.count({ where: { reviewStatus: 'pending_review' } }),
      ]).then(([cards, briefs]) => cards + briefs),
      prisma.auditLog.count(),
      prisma.knowledgeCard.count({ where: { status: 'published' } }),
      prisma.pushRecord.count({ where: { readStatus: 'unread' } }),
      prisma.policyBrief.count({ where: { reviewStatus: 'pending_review' } }),
      prisma.user.count({ where: { status: 'active' } }),
      // 最近活动
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, department: { select: { name: true } } },
          },
        },
      }),
      // 新增：待处理 Agent 任务数
      prisma.agentTask.count({ where: { status: 'pending' } }),
      // 新增：待处理知识缺口数
      prisma.knowledgeGap.count({ where: { status: 'pending' } }),
      // 新增：高优先级知识缺口数
      prisma.knowledgeGap.count({ where: { status: 'pending', priority: 'high' } }),
      // 新增：今日活动数
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // 新增：最新质量监控指标
      prisma.qualityMetrics.findMany({
        orderBy: { calculatedAt: 'desc' },
        take: 4,
      }),
    ])

    // 构建最近活动的可读描述
    const actionLabels: Record<string, string> = {
      create: '创建',
      edit: '编辑',
      review: '审核',
      publish: '发布',
      reject: '驳回',
      query: '经验调用',
      generate: '生成简报',
      push: '推送',
      approve: '审批',
      submit: '提交',
    }

    const entityLabels: Record<string, string> = {
      policy_link: '政策链接',
      policy_brief: '政策简报',
      knowledge_card: '知识卡',
      experience_query: '经验调用',
      sop_task: 'SOP 任务',
      sop_submission: 'SOP 提交',
      push_record: '推送记录',
    }

    const formattedActivities = recentActivities.map((log) => {
      let detail = ''
      try {
        const parsed = JSON.parse(log.details || '{}')
        detail = parsed.title || parsed.question || parsed.target || ''
      } catch {
        detail = ''
      }

      return {
        id: log.id,
        time: log.createdAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        user: log.user.name,
        action: `${log.user.name} ${actionLabels[log.action] || log.action}了${entityLabels[log.entityType] || log.entityType}`,
        target: detail,
        status: log.action === 'review' ? '已审核' : log.action === 'publish' ? '已发布' : log.action === 'create' ? '已创建' : '已处理',
        statusColor: log.action === 'review' || log.action === 'publish' ? 'bg-emerald-500' : 'bg-blue-500',
      }
    })

    return NextResponse.json({
      stats: {
        policyLinks: policyLinksCount,
        policyBriefs: policyBriefsCount,
        knowledgeCards: knowledgeCardsCount,
        pushRecords: pushRecordsCount,
        experienceQueries: experienceQueriesCount,
        sopTasks: sopTasksCount,
        pendingReview: pendingReviewCount,
        auditLogs: auditLogsCount,
        publishedCards: publishedCardsCount,
        unreadPush: unreadPushCount,
        pendingBriefs: pendingBriefsCount,
        activeUsers: activeUsersCount,
        // 新增统计
        pendingAgentTasks: pendingAgentTasksCount,
        pendingKnowledgeGaps: pendingKnowledgeGapsCount,
        highPriorityGaps: highPriorityGapsCount,
        todayActivities: todayActivitiesCount,
        // 质量监控指标
        qualityMetrics: latestQualityMetrics,
      },
      recentActivities: formattedActivities,
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
})
