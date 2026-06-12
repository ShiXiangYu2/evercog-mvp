/**
 * ServiceError 单元测试
 */
import { describe, it, expect } from 'vitest'
import {
  ServiceError,
  ErrorCodes,
  notFound,
  forbidden,
  validationError,
  conflict,
  optimisticLock,
  handleServiceError,
} from '../service-error'

describe('ServiceError', () => {
  it('should create error with code and message', () => {
    const error = new ServiceError(ErrorCodes.NOT_FOUND, 'User not found')

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('User not found')
    expect(error.name).toBe('ServiceError')
  })

  it('should create error with details', () => {
    const error = new ServiceError(ErrorCodes.VALIDATION_ERROR, 'Invalid input', {
      field: 'email',
      reason: 'invalid format',
    })

    expect(error.details).toEqual({ field: 'email', reason: 'invalid format' })
  })

  it('should convert to Response with correct status', () => {
    const testCases = [
      { code: ErrorCodes.NOT_FOUND, expectedStatus: 404 },
      { code: ErrorCodes.FORBIDDEN, expectedStatus: 403 },
      { code: ErrorCodes.VALIDATION_ERROR, expectedStatus: 400 },
      { code: ErrorCodes.CONFLICT, expectedStatus: 409 },
      { code: ErrorCodes.OPTIMISTIC_LOCK, expectedStatus: 409 },
      { code: ErrorCodes.INTERNAL_ERROR, expectedStatus: 500 },
    ]

    for (const { code, expectedStatus } of testCases) {
      const error = new ServiceError(code, 'Test error')
      const response = error.toResponse()

      expect(response.status).toBe(expectedStatus)
    }
  })

  it('should include details in Response body', async () => {
    const error = new ServiceError(ErrorCodes.VALIDATION_ERROR, 'Invalid input', {
      field: 'email',
    })
    const response = error.toResponse()
    const body = await response.json()

    expect(body.error).toBe('Invalid input')
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details).toEqual({ field: 'email' })
  })
})

describe('快捷构造函数', () => {
  it('notFound should create NOT_FOUND error', () => {
    const error = notFound('User not found')

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('User not found')
  })

  it('forbidden should create FORBIDDEN error', () => {
    const error = forbidden('Access denied')

    expect(error.code).toBe('FORBIDDEN')
    expect(error.message).toBe('Access denied')
  })

  it('validationError should create VALIDATION_ERROR error', () => {
    const error = validationError('Invalid input', { field: 'name' })

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Invalid input')
    expect(error.details).toEqual({ field: 'name' })
  })

  it('conflict should create CONFLICT error', () => {
    const error = conflict('Resource already exists')

    expect(error.code).toBe('CONFLICT')
    expect(error.message).toBe('Resource already exists')
  })

  it('optimisticLock should create OPTIMISTIC_LOCK error with default message', () => {
    const error = optimisticLock()

    expect(error.code).toBe('OPTIMISTIC_LOCK')
    expect(error.message).toBe('资源已被其他用户修改，请刷新后重试')
  })

  it('optimisticLock should accept custom message', () => {
    const error = optimisticLock('自定义消息')

    expect(error.code).toBe('OPTIMISTIC_LOCK')
    expect(error.message).toBe('自定义消息')
  })
})

describe('handleServiceError', () => {
  it('should handle ServiceError', () => {
    const error = notFound('User not found')
    const response = handleServiceError(error)

    expect(response.status).toBe(404)
  })

  it('should handle unexpected errors', () => {
    const error = new Error('Unexpected error')
    const response = handleServiceError(error)

    expect(response.status).toBe(500)
  })

  it('should handle null/undefined errors', () => {
    const response = handleServiceError(null)

    expect(response.status).toBe(500)
  })
})
