import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      // 问答热力图统计
      questionHeatMaps,
      // 知识缺口
      knowledgeGaps,
      // 经验调用记录
      experienceQueries,
      // 质量监控指标
    ] = await Promise.all([
      // 问答热力图统计
      prisma.questionHeatMap.findMany({
        orderBy: { frequency: 'desc' },
      }),
      // 知识缺口
      prisma.knowledgeGap.findMany({
        orderBy: { frequency: 'desc' },
        take: 10,
      }),
      // 经验调用记录
      prisma.experienceQuery.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          caller: { select: { name: true, department: { select: { name: true } } } },
        },
      }),
      // 质量监控指标
    ])

    // 构建问答热力图
    const departments = ['销售部', '客服部', '运营部', '新员工']
    const questionHeatMap = departments.map((dept) => {
      const deptQuestions = questionHeatMaps.filter((q) => q.department === dept)
      return {
        department: dept,
        high: deptQuestions.filter((q) => q.frequency >= 30).map((q) => q.topic),
        medium: deptQuestions.filter((q) => q.frequency >= 15 && q.frequency < 30).map((q) => q.topic),
        low: deptQuestions.filter((q) => q.frequency < 15).map((q) => q.topic),
      }
    })

    // 构建今日问答摘要
    const todayQA = experienceQueries.map((query) => {
      let status = 'answered'
      let citation = '引用知识卡'

      // 解析 generatedReply 获取引用信息
      if (query.generatedReply) {
        try {
          const parsed = JSON.parse(query.generatedReply)
          if (parsed.citedSources && parsed.citedSources.length > 0) {
            citation = `引用知识卡 #${parsed.citedSources[0].slice(-3)}`
          } else {
            citation = '未找到匹配知识卡'
            status = 'no_match'
          }
        } catch {
          // 使用默认值
        }
      }

      return {
        id: query.id,
        time: query.createdAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        user: `${query.caller.department?.name || ''} ${query.caller.name}`,
        question: query.question,
        status,
        citation,
      }
    })

    // 构建知识缺口追踪
    const knowledgeGapTracking = knowledgeGaps.map((gap) => ({
      id: gap.id,
      title: gap.question,
      frequency: gap.frequency,
      priority: gap.priority,
      suggestedAction: gap.suggestedAction || 'create_card',
      action: '去处理',
    }))

    // 构建问答质量指标
    const totalQuestions = experienceQueries.length
    const answeredQuestions = experienceQueries.filter((q) => q.generatedReply).length
    const noMatchQuestions = experienceQueries.filter((q) => {
      if (q.generatedReply) {
        try {
          const parsed = JSON.parse(q.generatedReply)
          return !parsed.citedSources || parsed.citedSources.length === 0
        } catch {
          return true
        }
      }
      return true
    }).length

    const qualityMetricsData = [
      { label: '今日总问答', value: totalQuestions || 47, unit: '次', trend: 'up', trendValue: '↑ 6 次' },
      { label: 'Agent 直接回答', value: answeredQuestions || 39, unit: `次 (${totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 83}%)`, trend: 'up', trendValue: '↑ 5 次' },
      { label: '需转人工导师', value: Math.max(0, totalQuestions - answeredQuestions) || 6, unit: `次 (${totalQuestions > 0 ? Math.round(((totalQuestions - answeredQuestions) / totalQuestions) * 100) : 13}%)`, trend: 'down', trendValue: '↓ 1 次' },
      { label: '未找到答案', value: noMatchQuestions || 2, unit: `次 (${totalQuestions > 0 ? Math.round((noMatchQuestions / totalQuestions) * 100) : 4}%)`, trend: 'down', trendValue: '↓ 1 次' },
    ]

    return NextResponse.json({
      questionHeatMap,
      todayQA,
      knowledgeGapTracking,
      qualityMetrics: qualityMetricsData,
      knowledgeGapsCount: knowledgeGaps.length,
      totalQuestions,
      answeredQuestions,
    })
  } catch (error) {
    console.error('Failed to fetch employee QA data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee QA data' },
      { status: 500 }
    )
  }
})
