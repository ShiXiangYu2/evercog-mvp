import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  try {
    const [
      // 用户列表
      users,
      // 部门列表
      departments,
      // 审计日志
      auditLogs,
    ] = await Promise.all([
      // 用户列表
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { name: true } },
        },
      }),
      // 部门列表
      prisma.department.findMany({
        include: {
          _count: { select: { users: true } },
        },
      }),
      // 审计日志
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, department: { select: { name: true } } } },
        },
      }),
    ])

    // 构建用户列表
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email || `${user.name.toLowerCase()}@example.com`,
      department: user.department.name,
      role: user.role,
      status: user.status,
    }))

    // 构建部门列表
    const formattedDepartments = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      members: dept._count.users,
      permissions: dept.name === '销售部' ? '全量' : dept.name === '客服部' ? '客服相关' : dept.name === '财务部' ? '财务相关' : '基础',
    }))

    // 构建权限矩阵
    const permissionMatrix = [
      { role: '管理员', knowledge: '✓', review: '✓', settings: '✓', audit: '✓' },
      { role: '导师', knowledge: '✓', review: '✓', settings: '✗', audit: '✓' },
      { role: '销售', knowledge: '✓', review: '✗', settings: '✗', audit: '✗' },
      { role: '客服', knowledge: '✓', review: '✗', settings: '✗', audit: '✗' },
      { role: '运营', knowledge: '✓', review: '✓', settings: '✗', audit: '✗' },
      { role: '财务', knowledge: '✓', review: '✓', settings: '✗', audit: '✗' },
    ]

    // 构建审计日志
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

    const formattedAuditLogs = auditLogs.map((log) => {
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
        user: `${log.user.department?.name || ''}-${log.user.name}`,
        action: actionLabels[log.action] || log.action,
        target: entityLabels[log.entityType] || log.entityType,
        details: detail,
        status: 'success',
      }
    })

    return NextResponse.json({
      users: formattedUsers,
      departments: formattedDepartments,
      permissionMatrix,
      auditLogs: formattedAuditLogs,
      stats: {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.status === 'active').length,
        totalDepartments: departments.length,
        totalAuditLogs: auditLogs.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch settings data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings data' },
      { status: 500 }
    )
  }
})
