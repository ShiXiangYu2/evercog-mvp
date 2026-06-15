/**
 * BaseEntityService 鈥?娉涘瀷 Service 鍩虹被
 *
 * 灏佽鎵€鏈夊疄浣撳叡浜殑 CRUD + 鐘舵€佹祦杞?+ 鏉冮檺妫€鏌?+ 瀹¤鏃ュ織妯″紡銆? * 瀛愮被鍙渶瀹氫箟 config 鍜?hook 鏂规硶銆? *
 * 璁捐渚濇嵁锛歛uto-dev-framework improve-codebase-architecture Skill
 * "鍚堝苟 Service 灞傞噸澶嶆ā寮? 鈥?Candidate 2
 */
import { createAuditLog, type AuditAction, type EntityType } from '../audit'
import { canAccess, canReview, hasExtendedVisibility } from '../permission-guard'
import logger from '../logger'
import type {
  AuthUser,
  ListFilters,
  PaginatedResult,
  EntityConfig,
} from './base-types'
import { notFound, forbidden, optimisticLock } from '../service-error'

// ==================== Prisma 妯″瀷鏄犲皠 ====================

type EntityRecord = {
  id: string
  version?: number
}

interface EntityModel<TRecord extends EntityRecord> {
  findMany(args: unknown): Promise<TRecord[]>
  count(args: unknown): Promise<number>
  findUnique(args: unknown): Promise<TRecord | null>
  create(args: unknown): Promise<TRecord>
  update(args: unknown): Promise<TRecord>
  delete(args: unknown): Promise<TRecord>
}

function getStringField(record: object, field: string): string | undefined {
  const value = (record as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : undefined
}

function getNumberField(record: object, field: string): number | undefined {
  const value = (record as Record<string, unknown>)[field]
  return typeof value === 'number' ? value : undefined
}

/**
 * Prisma 妯″瀷鍚嶇О鏄犲皠
 * entityType 鈫?Prisma 妯″瀷鍚嶏紙棣栧瓧姣嶅皬鍐欙級
 */
// ==================== BaseEntityService ====================

/**
 * 瀹炰綋 Service 鍩虹被
 *
 * 鎻愪緵瀹屾暣鐨?CRUD + 鐘舵€佹祦杞?+ 鏉冮檺 + 瀹¤鑳藉姏銆? * 瀛愮被閫氳繃 override hook 鏂规硶娉ㄥ叆瀹炰綋鐗瑰畾閫昏緫銆? */
export abstract class BaseEntityService<
  T extends { id: string },
  CreateInput,
  UpdateInput,
  TRecord extends EntityRecord = T & EntityRecord
> {
  protected config: EntityConfig

  constructor(config: EntityConfig) {
    this.config = config
  }

  // ==================== 鎶借薄鏂规硶锛堝瓙绫诲繀椤诲疄鐜帮級 ====================

  /** 鑾峰彇 Prisma 妯″瀷浠ｇ悊锛堝 prisma.knowledgeCard锛?*/
  protected abstract get model(): EntityModel<TRecord>

  /** 灏嗘暟鎹簱璁板綍杞崲涓鸿繑鍥炵被鍨?*/
  protected abstract toResponse(record: TRecord): T

  /** 鍖呭惈鍏宠仈鐨?Prisma include 閰嶇疆 */
  protected abstract get include(): Record<string, unknown>

  // ==================== Hook 鏂规硶锛堝瓙绫诲彲閫?override锛?====================

  /** 鍒涘缓鍓嶇殑棰濆楠岃瘉 */
  protected async beforeCreate(_data: CreateInput, _user: AuthUser): Promise<void> {}

  /** 鍒涘缓鍚庣殑棰濆鎿嶄綔 */
  protected async afterCreate(_record: TRecord, _user: AuthUser): Promise<void> {}

  /** 鏇存柊鍓嶇殑棰濆楠岃瘉 */
  protected async beforeUpdate(_id: string, _data: UpdateInput, _user: AuthUser): Promise<void> {}

  /** 鐘舵€佹祦杞墠鐨勯澶栭獙璇?*/
  protected async beforeTransition(_id: string, _from: string, _to: string, _user: AuthUser): Promise<void> {}

  /** 鐘舵€佹祦杞悗鐨勯澶栨搷浣?*/
  protected async afterTransition(_id: string, _from: string, _to: string, _user: AuthUser): Promise<void> {}

  /** 鏋勫缓鎼滅储鏉′欢 */
  protected buildSearchCondition(search: string): Record<string, unknown> {
    return {
      OR: this.config.searchFields.map((field) => ({
        [field]: { contains: search },
      })),
    }
  }

  // ==================== CRUD 鎿嶄綔 ====================

  /**
   * 鍒楄〃鏌ヨ锛堝甫鍒嗛〉銆佹悳绱€佹潈闄愯繃婊わ級
   */
  async list(filters: ListFilters, user: AuthUser): Promise<PaginatedResult<T>> {
    const { search, page = 1, pageSize = 20, ...rest } = filters

    const where: Record<string, unknown> = {}

    if (search) {
      Object.assign(where, this.buildSearchCondition(search))
    }

    // 搴旂敤瀛愮被棰濆杩囨护鏉′欢
    this.applyFilters(where, rest)
    this.applyAccessFilter(where, user)

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
      items: items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /** 瀛愮被 override 浠ュ簲鐢ㄩ澶栬繃婊ゆ潯浠?*/
  protected applyFilters(_where: Record<string, unknown>, _filters: Record<string, unknown>): void {}

  protected applyAccessFilter(where: Record<string, unknown>, user: AuthUser): void {
    if (hasExtendedVisibility(user)) return
    if (this.config.accessDepartmentField) {
      where[this.config.accessDepartmentField] = user.departmentId
    }
  }

  /**
   * 鑾峰彇鍗曚釜瀹炰綋
   */
  async getById(id: string, user: AuthUser): Promise<T> {
    const record = await this.model.findUnique({
      where: { id },
      include: this.include,
    })

    if (!record) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    if (!this.canReadRecord(record, user)) {
      throw forbidden(`无权查看此${this.config.entityLabel}`, { id })
    }

    return this.toResponse(record)
  }

  protected canReadRecord(record: TRecord, user: AuthUser): boolean {
    if (hasExtendedVisibility(user)) return true
    // Record owner can always read their own records
    const ownerId = getStringField(record, this.config.ownerField)
    if (ownerId && ownerId === user.id) return true
    if (!this.config.accessDepartmentField) return true
    const departmentId = getStringField(record, this.config.accessDepartmentField)
    return departmentId === user.departmentId
  }

  /**
   * 鍒涘缓瀹炰綋
   */
  async create(data: CreateInput, user: AuthUser): Promise<T> {
    await this.beforeCreate(data, user)

    const record = await this.model.create({
      data: this.buildCreateData(data, user),
      include: this.include,
    })

    await this.afterCreate(record, user)

    // 瀹¤鏃ュ織
    await this.audit('create', record.id, { ...(data as object) }, user)

    logger.info(`${this.config.entityType} created`, { id: record.id, userId: user.id })

    return this.toResponse(record)
  }

  /** 瀛愮被瀹炵幇锛氭瀯寤?Prisma create 鏁版嵁 */
  protected abstract buildCreateData(data: CreateInput, user: AuthUser): Record<string, unknown>

  /**
   * 鏇存柊瀹炰綋
   */
  async update(id: string, data: UpdateInput, user: AuthUser, expectedVersion?: number): Promise<T> {
    const existing = await this.model.findUnique({ where: { id } })

    if (!existing) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    const ownerId = getStringField(existing, this.config.ownerField)
    if (!canAccess(user, this.config.entityType, 'write', { ownerId })) {
      throw forbidden(`无权编辑此${this.config.entityLabel}`, { id })
    }

    const currentVersion = getNumberField(existing, 'version')
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
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

  /** 瀛愮被瀹炵幇锛氭瀯寤?Prisma update 鏁版嵁 */
  protected abstract buildUpdateData(data: UpdateInput): Record<string, unknown>

  /**
   * 鍒犻櫎瀹炰綋
   */
  async delete(id: string, user: AuthUser): Promise<void> {
    const existing = await this.model.findUnique({ where: { id } })

    if (!existing) {
      throw notFound(`${this.config.entityLabel}不存在`, { id })
    }

    if (!canAccess(user, this.config.entityType, 'delete')) {
      throw forbidden(`无权删除此${this.config.entityLabel}`, { id })
    }

    await this.model.delete({ where: { id } })

    await this.audit('edit', id, { action: 'delete' }, user)

    logger.info(`${this.config.entityType} deleted`, { id, userId: user.id })
  }

  // ==================== 鐘舵€佹祦杞?====================

  /**
   * 鎵ц鐘舵€佹祦杞?   */
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

    const currentStatus = getStringField(existing, this.config.statusField)
    if (!currentStatus) {
      throw notFound(`当前${this.config.entityLabel}状态不存在`, { id })
    }
    const allowedTargets = this.config.transitions[currentStatus] || []

    if (!allowedTargets.includes(targetStatus)) {
      const labels = this.config.statusLabels || {}
      const fromLabel = labels[currentStatus] || currentStatus
      const toLabel = labels[targetStatus] || targetStatus
      throw notFound(`当前状态不允许从${fromLabel}流转到${toLabel}`, { id, status: currentStatus })
    }

    // 鏉冮檺妫€鏌ワ紙瀹℃牳鎿嶄綔闇€瑕佸鏍告潈闄愶級
    if (targetStatus === 'published' || targetStatus === 'reviewed' || targetStatus === 'rejected') {
      if (!canReview(user, this.config.entityType)) {
        throw forbidden(`无权审核此${this.config.entityLabel}`, { id })
      }
    } else {
      const ownerId = getStringField(existing, this.config.ownerField)
      if (!canAccess(user, this.config.entityType, 'write', { ownerId })) {
        throw forbidden(`无权操作此${this.config.entityLabel}`, { id })
      }
    }

    await this.beforeTransition(id, currentStatus, targetStatus, user)

    const transitionData: Record<string, unknown> = {
      [this.config.statusField]: targetStatus,
    }

    // 瀹℃牳鎿嶄綔鑷姩璁剧疆瀹℃牳鏃堕棿鍜屽鏍镐汉
    if (targetStatus === 'published' || targetStatus === 'reviewed' || targetStatus === 'rejected') {
      transitionData.reviewedAt = new Date()
      transitionData.reviewerId = user.id
    }

    // 鐗堟湰閫掑
    if (options?.incrementVersion) {
      const currentVersion = getNumberField(existing, 'version')
      transitionData.version = (currentVersion ?? 0) + 1
    }

    const record = await this.model.update({
      where: { id },
      data: transitionData,
      include: this.include,
    })

    await this.afterTransition(id, currentStatus, targetStatus, user)

    // 瀹¤鏃ュ織
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

  // ==================== 瀹¤鏃ュ織 ====================

  /**
   * 缁熶竴瀹¤鏃ュ織鍏ュ彛
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
