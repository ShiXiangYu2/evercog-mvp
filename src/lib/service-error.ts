/**
 * Service 层统一错误处理
 *
 * 所有 Service 方法抛出 ServiceError，路由层统一转换为 HTTP 响应
 */
import { NextResponse } from 'next/server'

// ==================== 错误码 ====================

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  OPTIMISTIC_LOCK: 'OPTIMISTIC_LOCK',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ==================== ServiceError 类 ====================

export class ServiceError extends Error {
  public readonly code: ErrorCode
  public readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.details = details
  }

  /**
   * 转换为 NextResponse
   */
  toResponse(): NextResponse {
    const statusMap: Record<ErrorCode, number> = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      VALIDATION_ERROR: 400,
      CONFLICT: 409,
      OPTIMISTIC_LOCK: 409,
      INTERNAL_ERROR: 500,
    }

    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        ...(this.details && { details: this.details }),
      },
      { status: statusMap[this.code] || 500 }
    )
  }
}

// ==================== 快捷构造函数 ====================

export function notFound(message: string, details?: Record<string, unknown>): ServiceError {
  return new ServiceError(ErrorCodes.NOT_FOUND, message, details)
}

export function forbidden(message: string, details?: Record<string, unknown>): ServiceError {
  return new ServiceError(ErrorCodes.FORBIDDEN, message, details)
}

export function validationError(message: string, details?: Record<string, unknown>): ServiceError {
  return new ServiceError(ErrorCodes.VALIDATION_ERROR, message, details)
}

export function conflict(message: string, details?: Record<string, unknown>): ServiceError {
  return new ServiceError(ErrorCodes.CONFLICT, message, details)
}

export function optimisticLock(message: string = '资源已被其他用户修改，请刷新后重试'): ServiceError {
  return new ServiceError(ErrorCodes.OPTIMISTIC_LOCK, message)
}

// ==================== 错误处理工具 ====================

/**
 * 处理 Service 错误，返回 NextResponse
 * 用于路由层统一错误处理
 */
export function handleServiceError(error: unknown): NextResponse {
  if (error instanceof ServiceError) {
    return error.toResponse()
  }

  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: '服务器内部错误' },
    { status: 500 }
  )
}
