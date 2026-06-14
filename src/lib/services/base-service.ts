/**
 * BaseEntityService — 泛型 Service 基类
 *
 * 封装所有实体共享的 CRUD + 状态流转 + 权限检查 + 审计日志模式。
 * 子类只需定义 config 和 hook 方法。
 *
 * 设计依据：auto-dev-framework improve-codebase-architecture Skill
 * "合并 Service 层重复模式" — Candidate 2
 */
import { prisma } from '../prisma'
import { createAuditLog, type AuditAction, type EntityType } from '../audit'
import { canAccess, canReview } from '../permission-guard'
import logger from '../logger'
import type {
  AuthUser,
  ListFilters,
  PaginatedResult,
  EntityConfig,
  StateTransitionMap,
} from './base-types'
import { notFound, forbidden, optimisticLock, ServiceError } from './base-types'

// ==================== Prisma 模型映射 ====================

/**
 * Prisma 模型名称映射
 * entityType → Prisma 模型名（首字母小写）
 */
const MODEL_MAP: Record<string, string> = {
  knowledge_card: 'knowledgeCard',
  policy_link: 'policyLink',
  policy_brief: 'policyBrief',
}

// ==================== BaseEntityService ====================

/**
 * 实体 Service 基类
 *
 * 提供完整的 CRUD + 状态流转 + 权限 + 审计能力。
 * 子类通过 override hook 方法注入实体特定逻辑。
 */
export abstract class BaseEntityService<T extends { id: string }, CreateInput, UpdateInput> {
  protected config: EntityConfig

  constructor(config: EntityConfig) {
    this.config = config
  }

  // ==================== 抽象方法（子类必须实现） ====================

  /** 获取 Prisma 模型代理（如 prisma.knowledgeCard） */
  protected abstract get model(): any

  /** 将数据库记录转换为返回类型 */
  protected abstract toResponse(record: any): T

  /** 包含关联的 Prisma include 配置 */
  protected abstract get include(): Record<string, unknown>

  // ==================== Hook 方法（子类可选 override） ====================

  /** 创建前的额外验证 */
  protected async beforeCreate(_data: CreateInput, _user: AuthUser): Promise<void> {}

  /** 创建后的额外操作 */
  protected async afterCreate(_record: any, _user: AuthUser): Promise<void> {}

  /** 更新前的额外验证 */
  protected async beforeUpdate(_id: string, _data: UpdateInput, _user: AuthUser): Promise<void> {}

  /** 状态流转前的额外验证 */
  protected async beforeTransition(_id: string, _from: string, _to: string, _user: AuthUser): Promise<void> {}

  /** 状态流转后的额外操作 */
  protected async afterTransition(_id: string, _from: string, _to: string, _user: AuthUser): Promise<void> {}

  /** 构建搜索条件 */
  protected buildSearchCondition(search: string): Record<string, unknown> {
    return {
      OR: this.config.searchFields.map((field) => ({
        [field]: { contains: search },
      })),
    }
  }

  // ==================== CRUD 操作 ====================

  /**
   * 列表查询（带分页、搜索、权限过滤）
   */
  async list(filters: ListFilters, user: AuthUser): Promise<PaginatedResult<T>> {
    const { search, page = 1, pageSize = 20, ...rest } = filters

    const where: Record<string, unknown> = {}

    if (search) {
      Object.assign(where, this.buildSearchCondition(search))
    }

    // 应用子类额外过滤条件
    this.applyFilters(where, rest)

    const [items, total] = await Promise.all([
      this.model.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.model.count({ where }),
    ])

    return {
      items: items.map((item: any) => this.toResponse(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /** 子类 override 以应用额外过滤条件 */
  protected applyFilters(_where: Record<string, unknown>, _filters: Record<string, unknown>): void {}

  /**
   * 获取单个实体
   */
  async getById(id: string, _user: AuthUser): Promise<T> {
    const record = await this.model.findUnique({
      where: { id },
      include: this.include,
    })

    if (!record) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    return this.toResponse(record)
  }

  /**
   * 创建实体
   */
  async create(data: CreateInput, user: AuthUser): Promise<T> {
    await this.beforeCreate(data, user)

    const record = await this.model.create({
      data: this.buildCreateData(data, user),
      include: this.include,
    })

    await this.afterCreate(record, user)

    // 审计日志
    await this.audit('create', record.id, { ...(data as object) }, user)

    logger.info(`${this.config.entityType} created`, { id: record.id, userId: user.id })

    return this.toResponse(record)
  }

  /** 子类实现：构建 Prisma create 数据 */
  protected abstract buildCreateData(data: CreateInput, user: AuthUser): Record<string, unknown>

  /**
   * 更新实体
   */
  async update(id: string, data: UpdateInput, user: AuthUser, expectedVersion?: number): Promise<T> {
    const existing = await this.model.findUnique({ where: { id } })

    if (!existing) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    // 权限检查
    const ownerId = existing[this.config.ownerField]
    if (!canAccess(user, this.config.entityType, 'write', { ownerId })) {
      throw forbidden(`无权编辑此${this.config.entityLabel}`, { id })
    }

    // 乐观锁
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw optimisticLock()
    }

    await this.beforeUpdate(id, data, user)

    const updateData = this.buildUpdateData(data)
    const record = await this.model.update({
      where: { id },
      data: updateData,
      include: this.include,
    })

    await this.audit('edit', id, { ...(data as object) }, user)

    logger.info(`${this.config.entityType} updated`, { id, userId: user.id })

    return this.toResponse(record)
  }

  /** 子类实现：构建 Prisma update 数据 */
  protected abstract buildUpdateData(data: UpdateInput): Record<string, unknown>

  /**
   * 删除实体
   */
  async delete(id: string, user: AuthUser): Promise<void> {
    const existing = await this.model.findUnique({ where: { id } })

    if (!existing) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    // 权限检查：仅管理员可删除
    if (!canAccess(user, this.config.entityType, 'delete')) {
      throw forbidden(`无权删除此${this.config.entityLabel}`, { id })
    }

    await this.model.delete({ where: { id } })

    await this.audit('edit', id, { action: 'delete' }, user)

    logger.info(`${this.config.entityType} deleted`, { id, userId: user.id })
  }

  // ==================== 状态流转 ====================

  /**
   * 执行状态流转
   */
  async transition(
    id: string,
    targetStatus: string,
    user: AuthUser,
    options?: { comment?: string; incrementVersion?: boolean }
  ): Promise<T> {
    const existing = await this.model.findUnique({ where: { id } })

    if (!existing) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    const currentStatus = existing[this.config.statusField]
    const allowedTargets = this.config.transitions[currentStatus] || []

    if (!allowedTargets.includes(targetStatus)) {
      const labels = this.config.statusLabels || {}
      const fromLabel = labels[currentStatus] || currentStatus
      const toLabel = labels[targetStatus] || targetStatus
      throw notFound(`当前状态不允许从${fromLabel}流转到${toLabel}`, { id, status: currentStatus })
    }

    // 权限检查（审核操作需要审核权限）
    if (targetStatus === 'published' || targetStatus === 'reviewed' || targetStatus === 'rejected') {
      if (!canReview(user, this.config.entityType)) {
        throw forbidden(`无权审核此${this.config.entityLabel}`, { id })
      }
    } else {
      const ownerId = existing[this.config.ownerField]
      if (!canAccess(user, this.config.entityType, 'write', { ownerId })) {
        throw forbidden(`无权操作此${this.config.entityLabel}`, { id })
      }
    }

    await this.beforeTransition(id, currentStatus, targetStatus, user)

    const transitionData: Record<string, unknown> = {
      [this.config.statusField]: targetStatus,
    }

    // 审核操作自动设置审核时间和审核人
    if (targetStatus === 'published' || targetStatus === 'reviewed' || targetStatus === 'rejected') {
      transitionData.reviewedAt = new Date()
      transitionData.reviewerId = user.id
    }

    // 版本递增
    if (options?.incrementVersion) {
      transitionData.version = existing.version + 1
    }

    const record = await this.model.update({
      where: { id },
      data: transitionData,
      include: this.include,
    })

    await this.afterTransition(id, currentStatus, targetStatus, user)

    // 审计日志
    const action: AuditAction = targetStatus === 'published' || targetStatus === 'reviewed'
      ? 'approve'
      : targetStatus === 'rejected'
        ? 'reject'
        : 'submit'

    await this.audit(action, id, {
      fromStatus: currentStatus,
      toStatus: targetStatus,
      comment: options?.comment,
    }, user)

    logger.info(`${this.config.entityType} transitioned`, {
      id,
      from: currentStatus,
      to: targetStatus,
      userId: user.id,
    })

    return this.toResponse(record)
  }

  // ==================== 审计日志 ====================

  /**
   * 统一审计日志入口
   */
  protected async audit(
    action: AuditAction,
    entityId: string,
    details: Record<string, unknown>,
    user: AuthUser
  ): Promise<void> {
    await createAuditLog({
      userId: user.id,
      action,
      entityType: this.config.entityType as EntityType,
      entityId,
      details,
    })
  }
}
