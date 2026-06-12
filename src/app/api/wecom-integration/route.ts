import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      // 部门列表
      departments,
      // 用户统计
      totalUsers,
      activeUsers,
      // 推送记录统计
      totalPushRecords,
      unreadPushRecords,
      // Agent 任务统计
      agentTasks,
    ] = await Promise.all([
      prisma.department.findMany({
        include: {
          _count: { select: { users: true } },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.pushRecord.count(),
      prisma.pushRecord.count({ where: { readStatus: 'unread' } }),
      prisma.agentTask.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // 构建连接状态（模拟数据，MVP 阶段）
    const connectionStatus = {
      appStatus: '已连接',
      appName: 'GenericAgent 智能助手',
      authStatus: '正常',
      expireDate: '2027-01-15',
      messageChannel: '双向同步',
      todayMessages: totalPushRecords || 1247,
      avgResponseTime: 1.8,
    }

    // 构建部门接入情况
    const departmentStatus = departments.map((dept) => ({
      name: dept.name,
      status: dept.name === '人力资源部' || dept.name === '财务部' ? '未接入' : '已接入',
      members: dept._count.users,
      todayActive: Math.floor(dept._count.users * 0.8), // 模拟活跃用户
      statusColor: dept.name === '人力资源部' || dept.name === '财务部' ? 'text-amber-500' : 'text-[#10B981]',
    }))

    // 构建使用数据看板（模拟数据）
    const usageData = {
      todayActiveUsers: Math.floor(activeUsers * 0.89) || 89,
      weeklyQuestions: 3421,
      monthlyNewUsers: Math.floor(totalUsers * 0.127) || 127,
      retentionRate: 78,
    }

    // 构建配置管理（模拟数据）
    const configItems = [
      { label: '消息模板', value: '已配置 8 套', description: '政策简报、知识卡推送、审核通知等', icon: '📋' },
      { label: '权限策略', value: '按部门分级', description: '销售部：全量 / 客服部：客服相关 / 其他：基础', icon: '🔒' },
      { label: '自动回复规则', value: '32 条生效中', description: '智能匹配员工问题，自动回复', icon: '🤖' },
      { label: '知识卡推送频率', value: '每日 2 次', description: '09:00、14:00 定时推送', icon: '⏰' },
    ]

    return NextResponse.json({
      connectionStatus,
      departmentStatus,
      usageData,
      configItems,
      stats: {
        totalUsers,
        activeUsers,
        totalPushRecords,
        unreadPushRecords,
      },
    })
  } catch (error) {
    console.error('Failed to fetch WeCom integration data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch WeCom integration data' },
      { status: 500 }
    )
  }
})
