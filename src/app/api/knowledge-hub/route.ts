import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    // 简化查询，先确保基本功能正常
    const [
      totalKnowledgeCards,
      pendingKnowledgeCardsCount,
      publishedKnowledgeCardsCount,
      categoryStats,
      recentCards,
      qualityMetrics,
    ] = await Promise.all([
      prisma.knowledgeCard.count(),
      prisma.knowledgeCard.count({ where: { status: 'pending_review' } }),
      prisma.knowledgeCard.count({ where: { status: 'published' } }),
      prisma.knowledgeCard.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.knowledgeCard.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: { select: { name: true, department: { select: { name: true } } } },
        },
      }),
      prisma.qualityMetrics.findMany({
        orderBy: { calculatedAt: 'desc' },
        take: 4,
      }),
    ])

    // 计算本月新增
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthNewCards = await prisma.knowledgeCard.count({
      where: {
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
    })

    // 计算已过时知识卡（超过 90 天未更新）
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const outdatedCardsCount = await prisma.knowledgeCard.count({
      where: {
        status: 'published',
        updatedAt: {
          lt: ninetyDaysAgo,
        },
      },
    })

    // 构建分类列表
    const categoryMap: Record<string, { name: string; icon: string }> = {
      data_checklist: { name: '资料清单', icon: '📋' },
      tax_process: { name: '税种说明', icon: '💰' },
      risk_reminder: { name: '风险提醒', icon: '⚠️' },
      service_boundary: { name: '服务边界', icon: '🤝' },
      faq: { name: '常见问题', icon: '❓' },
      experience: { name: '经验分享', icon: '💡' },
    }

    const categories = categoryStats.map((stat) => ({
      name: categoryMap[stat.category]?.name || stat.category,
      count: stat._count.id,
      icon: categoryMap[stat.category]?.icon || '📄',
      lastUpdate: '最近',
    }))

    // 构建最近更新的知识卡
    const formattedRecentCards = recentCards.map((card) => ({
      id: card.id,
      title: card.title,
      category: categoryMap[card.category]?.name || card.category,
      updater: `${card.creator.department?.name || ''}-${card.creator.name}`,
      updateTime: card.updatedAt.toLocaleDateString('zh-CN'),
      status: card.status === 'published' ? '已发布' : card.status === 'pending_review' ? '待审核' : '草稿',
      quality: null,
      citations: 0,
    }))

    // 构建 Agent 优化建议
    const agentSuggestions = [
      {
        id: '1',
        type: 'merge',
        title: '建议合并「补贴申报流程」与「补贴政策解读」中 3 张重复知识卡',
        tag: '结构优化',
        tagColor: 'bg-blue-100 text-blue-700',
        action: '去处理',
      },
      {
        id: '2',
        type: 'move',
        title: '建议将「客户服务边界 SOP」从「内部 SOP」迁移至「客户服务」分类',
        tag: '分类优化',
        tagColor: 'bg-purple-100 text-purple-700',
        action: '去处理',
      },
      {
        id: '3',
        type: 'add',
        title: '建议为「专精特新认定」新增 2 张知识卡（当前覆盖不足）',
        tag: '内容补充',
        tagColor: 'bg-green-100 text-green-700',
        action: '去处理',
      },
      {
        id: '4',
        type: 'update',
        title: `发现 ${outdatedCardsCount} 张知识卡引用了已过时的政策编号，需更新`,
        tag: '质量问题',
        tagColor: 'bg-red-100 text-red-700',
        action: '去处理',
      },
    ]

    return NextResponse.json({
      stats: {
        totalKnowledgeCards,
        pendingKnowledgeCardsCount,
        publishedKnowledgeCardsCount,
        thisMonthNewCards,
        outdatedCardsCount,
        avgQualityScore: 4.2,
      },
      categories,
      recentCards: formattedRecentCards,
      qualityMetrics,
      agentSuggestions,
      pendingAgentTasks: 0,
    })
  } catch (error) {
    console.error('Failed to fetch knowledge hub data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge hub data' },
      { status: 500 }
    )
  }
})
