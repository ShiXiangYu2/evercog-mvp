import { prisma } from './prisma'

// ==================== 类型定义 ====================

export type AuditAction = 'create' | 'edit' | 'review' | 'publish' | 'reject' | 'query' | 'generate' | 'push' | 'approve' | 'submit'

export type EntityType = 'policy_link' | 'policy_brief' | 'knowledge_card' | 'experience_query' | 'sop_task' | 'sop_submission'

export interface AuditLogParams {
  userId: string
  action: AuditAction
  entityType: EntityType
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

// ==================== 审计日志 ====================

/**
 * 记录审计日志（唯一入口）
 *
 * 规则：
 * 1. 审计日志记录失败不应影响业务流程
 * 2. 所有 API 路由必须通过此函数记录关键操作
 * 3. action 和 entityType 使用类型约束，防止拼写错误
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    })
  } catch (error) {
    // 审计日志记录失败不应影响业务流程
    console.error('Failed to create audit log:', error)
  }
}

/**
 * 批量记录审计日志
 */
export async function createAuditLogs(paramsList: AuditLogParams[]): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: paramsList.map((params) => ({
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      })),
    })
  } catch (error) {
    console.error('Failed to create audit logs:', error)
  }
}

/**
 * 获取审计日志列表
 */
export async function getAuditLogs(params: {
  page?: number
  pageSize?: number
  entityType?: string
  userId?: string
  action?: string
}) {
  const { page = 1, pageSize = 20, entityType, userId, action } = params

  const where: Record<string, unknown> = {}
  if (entityType) where.entityType = entityType
  if (userId) where.userId = userId
  if (action) where.action = action

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
