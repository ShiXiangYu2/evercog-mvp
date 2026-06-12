import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      agentTasks,
      pendingKnowledgeCards,
      pendingSOPSubmissions,
      pendingPolicyBriefs,
      auditLogs,
    ] = await Promise.all([
      prisma.agentTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.knowledgeCard.count({ where: { status: 'pending_review' } }),
      prisma.sOPSubmission.count({ where: { status: 'submitted' } }),
      prisma.policyBrief.count({ where: { reviewStatus: 'pending_review' } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    const todayTasks = agentTasks
      .filter((task) => task.status === 'pending')
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        type: task.type,
        title: task.title,
        priority: task.priority,
        status: task.status,
      }))

    const notifications = [
      { id: '1', type: 'review', title: '新资料待审核', count: pendingKnowledgeCards + pendingSOPSubmissions + pendingPolicyBriefs, icon: 'clipboard', color: 'text-amber-600', bgColor: 'bg-amber-100' },
      { id: '2', type: 'policy', title: '政策更新', count: auditLogs.filter((log) => log.entityType === 'policy_link').length, icon: 'file', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      { id: '3', type: 'permission', title: '部门权限变更', count: 1, icon: 'bell', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    ]

    const growthPlan = [
      { id: '1', title: '本周完成 10 张知识卡审核', progress: 70, status: 'in_progress' },
      { id: '2', title: '优化 5 条高频问题回复', progress: 40, status: 'in_progress' },
      { id: '3', title: '学习新的财税政策解读', progress: 100, status: 'completed' },
    ]

    const growthLogs = [
      { time: '10:32', event: '学习《南京市中小企业数字化转型补贴政策》，能力提升', score: '+2' },
      { time: '09:45', event: '已完成 12 条客户问答，准确率 92%', score: '+5' },
      { time: '09:10', event: '审核通过 3 张知识卡，审核能力提升', score: '+3' },
    ]

    const pendingTasksCount = todayTasks.length
    const completedTasksCount = agentTasks.filter((task) => task.status === 'completed').length

    return NextResponse.json({
      todayTasks,
      notifications,
      growthPlan,
      growthLogs,
      stats: {
        pendingTasks: pendingTasksCount,
        completedTasks: completedTasksCount,
        totalTasks: agentTasks.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch agent workspace data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent workspace data' },
      { status: 500 }
    )
  }
})
