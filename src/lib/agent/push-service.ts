/**
 * 简报推送服务
 *
 * 政策简报审核通过后自动推送给相关部门
 * 支持多种推送渠道（站内通知、企微、邮件）
 */
import { prisma } from '../prisma'
import { createAuditLog } from '../audit'
import { getWeComClient } from '../wecom/client'
import logger from '../logger'

// ==================== 类型定义 ====================

export type PushChannel = 'wecom' | 'email' | 'sms' | 'internal'
export type PushTargetType = 'department' | 'role' | 'user'

export interface PushOptions {
  /** 政策简报 ID */
  briefId: string
  /** 推送渠道 */
  channel?: PushChannel
  /** 推送目标类型 */
  targetType?: PushTargetType
  /** 推送目标 ID（可选，为空则自动确定） */
  targetIds?: string[]
}

export interface PushResult {
  /** 推送记录 ID */
  pushRecordId: string
  /** 推送是否成功 */
  success: boolean
  /** 推送目标 */
  target: {
    type: PushTargetType
    id: string
    name: string
  }
  /** 错误信息 */
  error?: string
}

// ==================== 客户类型与部门映射 ====================

const CUSTOMER_TYPE_DEPARTMENT_MAP: Record<string, string[]> = {
  restaurant: ['finance', 'operations'],
  retail: ['operations', 'sales'],
  store: ['operations', 'sales'],
  advertising: ['sales', 'operations'],
  startup: ['finance', 'sales'],
  individual: ['finance', 'operations'],
  general: ['operations', 'finance', 'sales'],
}

// ==================== 推送服务 ====================

export class PushService {
  /**
   * 推送政策简报
   */
  async pushBrief(options: PushOptions): Promise<PushResult[]> {
    const { briefId, channel = 'internal', targetType, targetIds } = options

    logger.info('Starting brief push', { briefId, channel })

    // 1. 获取简报和关联的政策链接
    const brief = await prisma.policyBrief.findUnique({
      where: { id: briefId },
      include: {
        policyLink: true,
        generator: { select: { id: true, name: true } },
      },
    })

    if (!brief) {
      throw new Error(`Policy brief not found: ${briefId}`)
    }

    // 2. 确定推送目标
    const targets = await this.determinePushTargets(brief, targetType, targetIds)

    // 3. 执行推送
    const results: PushResult[] = []

    for (const target of targets) {
      try {
        const result = await this.executePush(brief, target, channel)
        results.push(result)
      } catch (error) {
        logger.error('Push failed', error as Error, {
          briefId,
          targetId: target.id,
        })

        results.push({
          pushRecordId: '',
          success: false,
          target,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    logger.info('Brief push completed', {
      briefId,
      successCount: results.filter((r) => r.success).length,
      totalCount: results.length,
    })

    return results
  }

  /**
   * 确定推送目标
   */
  private async determinePushTargets(
    brief: {
      policyLink: { customerType: string | null } | null
    },
    targetType?: PushTargetType,
    targetIds?: string[]
  ): Promise<Array<{ type: PushTargetType; id: string; name: string }>> {
    // 如果指定了目标，直接使用
    if (targetIds && targetIds.length > 0) {
      return targetIds.map((id) => ({
        type: targetType || 'department',
        id,
        name: id,
      }))
    }

    // 根据客户类型自动确定目标部门
    const customerType = brief.policyLink?.customerType || 'general'
    const departmentRoles = CUSTOMER_TYPE_DEPARTMENT_MAP[customerType] || ['operations']

    // 查询匹配的部门
    const targets: Array<{ type: PushTargetType; id: string; name: string }> = []

    for (const role of departmentRoles) {
      // 查找该角色的用户所在的部门
      const users = await prisma.user.findMany({
        where: { role },
        select: { departmentId: true },
        distinct: ['departmentId'],
      })

      for (const user of users) {
        const dept = await prisma.department.findUnique({
          where: { id: user.departmentId },
          select: { id: true, name: true },
        })

        if (dept && !targets.some((t) => t.id === dept.id)) {
          targets.push({
            type: 'department',
            id: dept.id,
            name: dept.name,
          })
        }
      }
    }

    // 如果没有找到目标，使用默认部门
    if (targets.length === 0) {
      targets.push({
        type: 'department',
        id: 'ops',
        name: '运营部',
      })
    }

    return targets
  }

  /**
   * 执行单次推送
   */
  private async executePush(
    brief: {
      id: string
      title: string
      summary: string
      generator: { id: string; name: string }
    },
    target: { type: PushTargetType; id: string; name: string },
    channel: PushChannel
  ): Promise<PushResult> {
    // 1. 创建推送记录
    const pushRecord = await prisma.pushRecord.create({
      data: {
        policyBriefId: brief.id,
        channel,
        targetType: target.type,
        targetId: target.id,
        targetName: target.name,
        status: 'pending',
        readStatus: 'unread',
        payloadSnapshot: JSON.stringify({
          title: brief.title,
          summary: brief.summary,
          generator: brief.generator.name,
        }),
        pusherId: brief.generator.id,
      },
    })

    // 2. 根据渠道执行推送
    let success = false
    let error: string | undefined

    try {
      switch (channel) {
        case 'internal':
          // 站内通知：直接标记为已发送（因为是系统内通知）
          success = true
          break
        case 'wecom': {
          // 企微推送：调用企微 API
          const wecomClient = getWeComClient()
          if (wecomClient.isConfigured()) {
            // 根据目标类型确定推送参数
            const pushOptions: { toparty?: string; touser?: string } = {}
            if (target.type === 'department') {
              // 企微部门 ID 需要映射，这里先用 touser
              pushOptions.touser = '@all'
            } else if (target.type === 'user') {
              pushOptions.touser = target.id
            }

            const result = await wecomClient.sendPolicyBriefMessage(
              {
                title: brief.title,
                summary: brief.summary,
                source: '恒识 Evercog',
              },
              pushOptions
            )

            success = result.errcode === 0
            if (!success) {
              error = result.errmsg
            }
          } else {
            // 企微未配置，降级到站内通知
            logger.warn('WeCom not configured, falling back to internal notification')
            success = true
          }
          break
        }
        case 'email':
          // 邮件推送：调用邮件服务（V1 仅记录）
          success = true
          break
        case 'sms':
          // 短信推送：调用短信服务（V1 仅记录）
          success = true
          break
      }
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Push failed'
    }

    // 3. 更新推送记录状态
    await prisma.pushRecord.update({
      where: { id: pushRecord.id },
      data: {
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : null,
      },
    })

    // 4. 记录审计日志
    if (success) {
      await createAuditLog({
        userId: brief.generator.id,
        action: 'push',
        entityType: 'policy_brief',
        entityId: brief.id,
        details: {
          channel,
          targetType: target.type,
          targetId: target.id,
          targetName: target.name,
        },
      })
    }

    return {
      pushRecordId: pushRecord.id,
      success,
      target,
      error,
    }
  }

  /**
   * 获取推送记录
   */
  async getPushRecords(options: {
    briefId?: string
    targetType?: PushTargetType
    status?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{
    items: Array<{
      id: string
      briefTitle: string
      channel: PushChannel
      targetType: PushTargetType
      targetName: string
      status: string
      readStatus: string
      sentAt: Date | null
      createdAt: Date
    }>
    total: number
    page: number
    pageSize: number
  }> {
    const { briefId, targetType, status, page = 1, pageSize = 20 } = options

    const where: Record<string, unknown> = {}
    if (briefId) where.policyBriefId = briefId
    if (targetType) where.targetType = targetType
    if (status) where.status = status

    const [items, total] = await Promise.all([
      prisma.pushRecord.findMany({
        where,
        include: {
          policyBrief: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pushRecord.count({ where }),
    ])

    return {
      items: items.map((item) => ({
        id: item.id,
        briefTitle: item.policyBrief.title,
        channel: item.channel as PushChannel,
        targetType: item.targetType as PushTargetType,
        targetName: item.targetName || '',
        status: item.status,
        readStatus: item.readStatus,
        sentAt: item.sentAt,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    }
  }
}

// ==================== 单例导出 ====================

let _pushService: PushService | null = null

export function getPushService(): PushService {
  if (!_pushService) {
    _pushService = new PushService()
  }
  return _pushService
}

/**
 * 快速推送简报（用于 API 调用）
 */
export async function pushBrief(options: PushOptions): Promise<PushResult[]> {
  const service = getPushService()
  return service.pushBrief(options)
}
