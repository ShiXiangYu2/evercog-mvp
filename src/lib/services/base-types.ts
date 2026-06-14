/**
 * Service 层统一类型定义
 *
 * 所有 Service 共享的类型，消除跨模块类型重复
 */

// ==================== AuthUser ====================

/**
 * 认证用户类型（唯一来源）
 *
 * auth.ts 和 permission-guard.ts 不再各自定义此类型
 */
export interface AuthUser {
  id: string
  name: string
  role: string
  departmentId: string
  email: string | null
}

// ==================== 分页 ====================

export interface ListFilters {
  search?: string
  page?: number
  pageSize?: number
  [key: string]: unknown
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== 实体状态 ====================

export type EntityState = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'

/**
 * 状态流转规则
 * key: 当前状态, value: 允许的目标状态列表
 */
export type StateTransitionMap = Record<string, string[]>

// ==================== Service 配置 ====================

/**
 * BaseEntityService 的配置
 *
 * 每个实体 Service 通过此配置定义自己的行为
 */
export interface EntityConfig {
  /** 实体类型名（用于审计日志） */
  entityType: string
  /** 实体中文名（用于错误消息） */
  entityLabel: string
  /** 状态字段名（如 'status' 或 'reviewStatus'） */
  statusField: string
  /** 状态流转规则 */
  transitions: StateTransitionMap
  /** 创建者字段名（如 'creatorId' 或 'generatorId'） */
  ownerField: string
  /** 搜索字段（用于关键词搜索） */
  searchFields: string[]
  /** 状态中文标签（用于错误消息） */
  statusLabels?: Record<string, string>
}

// ==================== Service Error ====================

export type ErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'CONFLICT' | 'OPTIMISTIC_LOCK' | 'INTERNAL_ERROR'

export class ServiceError extends Error {
  public readonly code: ErrorCode
  public readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.details = details
  }
}

export function notFound(message: string, details?: Record<string, unknown>): ServiceError {
  return new ServiceError('NOT_FOUND', message, details)
}

export function forbidden(message: string, details?: Record<string, unknown>): ServiceError {
  return new ServiceError('FORBIDDEN', message, details)
}

export function optimisticLock(message: string = '资源已被其他用户修改，请刷新后重试'): ServiceError {
  return new ServiceError('OPTIMISTIC_LOCK', message)
}
