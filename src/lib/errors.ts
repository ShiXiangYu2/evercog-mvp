/**
 * 统一错误处理模块
 *
 * 定义标准化的错误响应格式和自定义错误类
 * 所有 API 路由必须使用这些错误类返回响应
 */
import { NextResponse } from 'next/server'
import logger from './logger'

// ==================== 错误响应类型 ====================

export interface ErrorResponse {
  error: string
  code: string
  details?: string[]
}

// ==================== 自定义错误类 ====================

/**
 * 基础应用错误
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: string[]

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    statusCode: number = 500,
    details?: string[]
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  /**
   * 转换为 NextResponse
   */
  toResponse(): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        details: this.details,
      },
      { status: this.statusCode }
    )
  }
}

/**
 * 输入验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: string[]) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', requiredRoles?: string[]) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      requiredRoles ? [`Required roles: ${requiredRoles.join(', ')}`] : undefined
    )
    this.name = 'AuthorizationError'
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * 资源冲突错误
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429)
    this.name = 'RateLimitError'
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends AppError {
  public readonly service: string

  constructor(service: string, message: string, details?: string[]) {
    super(`External service error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, details)
    this.name = 'ExternalServiceError'
    this.service = service
  }
}

// ==================== 错误处理工具函数 ====================

/**
 * 处理 API 路由中的错误
 * 统一捕获和格式化错误响应
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // 已知的应用错误
  if (error instanceof AppError) {
    logger.error(`[${error.code}] ${error.message}`, error)
    return error.toResponse()
  }

  // Zod 验证错误
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: string[]; message: string }> }
    const details = zodError.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    )
    return new ValidationError('Input validation failed', details).toResponse()
  }

  // Prisma 错误
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message?: string }

    if (prismaError.code === 'P2025') {
      return new NotFoundError('Record').toResponse()
    }

    if (prismaError.code === 'P2002') {
      return new ConflictError('Record already exists').toResponse()
    }

    logger.error('[PRISMA_ERROR]', error instanceof Error ? error : undefined, { code: prismaError.code })
    return new AppError('Database error', 'DATABASE_ERROR', 500).toResponse()
  }

  // 未知错误 - 发送到 Sentry
  logger.error('[UNKNOWN_ERROR]', error instanceof Error ? error : undefined)
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error)
    })
    .catch(() => {
      // Sentry is optional in local/dev environments.
    })

  return new AppError(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    500
  ).toResponse()
}

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * 创建创建成功响应
 */
export function createdResponse<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 })
}

/**
 * 创建无内容响应
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}
