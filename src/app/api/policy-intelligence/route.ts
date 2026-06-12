import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      // 政策链接统计
      totalPolicyLinks,
      pendingCollectionCount,
      // 简报统计
      totalBriefs,
      pendingBriefsCount,
      publishedBriefsCount,
      // 知识卡统计
      totalKnowledgeCards,
      pendingKnowledgeCardsCount,
      // Agent 任务统计
      failedAgentTasks,
      pendingAgentTasks,
      // 最新政策链接
      latestPolicyLinks,
      // 知识缺口（用于知识库提醒）
      knowledgeGaps,
    ] = await Promise.all([
      prisma.policyLink.count(),
      prisma.policyLink.count({ where: { status: 'submitted' } }),
      prisma.policyBrief.count(),
      prisma.policyBrief.count({ where: { reviewStatus: 'pending_review' } }),
      prisma.policyBrief.count({ where: { reviewStatus: 'reviewed' } }),
      prisma.knowledgeCard.count(),
      prisma.knowledgeCard.count({ where: { status: 'pending_review' } }),
      // 失败的 Agent 任务
      prisma.agentTask.count({ where: { status: 'failed' } }),
      prisma.agentTask.count({ where: { status: 'pending' } }),
      // 最新政策链接
      prisma.policyLink.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: { select: { name: true } },
          brief: true,
        },
      }),
      // 知识缺口
      prisma.knowledgeGap.findMany({
        take: 5,
        orderBy: { frequency: 'desc' },
        where: { status: { not: 'resolved' } },
      }),
    ])

    // 计算待更新简报（已发布但超过 30 天未更新）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const outdatedBriefsCount = await prisma.policyBrief.count({
      where: {
        reviewStatus: 'reviewed',
        updatedAt: { lt: thirtyDaysAgo },
      },
    })

    // 构建数据概览
    const dataOverview = [
      { label: '待采集链接', value: pendingCollectionCount, type: 'link' },
      { label: '新增知识卡', value: totalKnowledgeCards, type: 'knowledge' },
      { label: '新增简报', value: totalBriefs, type: 'brief' },
      { label: '待发布简报', value: pendingBriefsCount, type: 'pending' },
      { label: '待更新简报', value: outdatedBriefsCount, type: 'outdated' },
    ]

    // 构建 Agent 处理队列
    const agentQueue = [
      { id: '1', type: 'error', title: '采集失败', count: failedAgentTasks, action: '查看详情' },
      { id: '2', type: 'warning', title: '简报生成失败', count: 0, action: '重新生成' },
      { id: '3', type: 'pending', title: '待审核', count: pendingAgentTasks, action: '去审核' },
    ]

    // 构建最新政策动态
    const latestPolicies = latestPolicyLinks.map((link) => {
      // 解析标签
      let tags: string[] = []
      try {
        // 从 URL 或标题中提取关键词作为标签
        if (link.customerType) {
          const customerTypeMap: Record<string, string> = {
            restaurant: '餐饮',
            store: '门店',
            individual: '个体工商户',
            advertising: '广告公司',
            startup: '初创公司',
            retail: '零售',
          }
          tags.push(customerTypeMap[link.customerType] || link.customerType)
        }
        if (link.status === 'brief_generated' || link.status === 'reviewed') {
          tags.push('已生成简报')
        }
      } catch {
        tags = []
      }

      return {
        id: link.id,
        title: link.title || link.url,
        tags,
        summary: `来源：${link.source || '未知'} | 状态：${link.status}`,
        time: link.createdAt.toLocaleDateString('zh-CN'),
        status: link.status === 'submitted' ? 'new' : 'normal',
      }
    })

    // 构建知识库提醒
    const knowledgeReminders = knowledgeGaps.map((gap) => ({
      id: gap.id,
      title: gap.question,
      priority: gap.priority,
      frequency: gap.frequency,
      action: '去处理',
    }))

    return NextResponse.json({
      stats: {
        totalPolicyLinks,
        pendingCollectionCount,
        totalBriefs,
        pendingBriefsCount,
        publishedBriefsCount,
        totalKnowledgeCards,
        pendingKnowledgeCardsCount,
        failedAgentTasks,
        pendingAgentTasks,
        outdatedBriefsCount,
      },
      dataOverview,
      agentQueue,
      latestPolicies,
      knowledgeReminders,
    })
  } catch (error) {
    console.error('Failed to fetch policy intelligence data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy intelligence data' },
      { status: 500 }
    )
  }
})
