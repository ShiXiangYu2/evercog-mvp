/**
 * 密码工具模块
 *
 * 使用 bcryptjs 实现密码哈希和验证
 */

// ==================== 配置 ====================

const BCRYPT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 分钟

// ==================== 密码哈希 ====================

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

// ==================== 密码验证 ====================

export interface PasswordValidation {
  valid: boolean
  errors: string[]
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('密码长度至少 8 位')
  }

  if (password.length > 128) {
    errors.push('密码长度不能超过 128 位')
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('密码必须包含字母')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含数字')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ==================== 登录锁定 ====================

export interface LoginLockStatus {
  locked: boolean
  remainingMs: number
  attempts: number
}

/**
 * 检查账户是否被锁定
 */
export function checkLoginLock(
  loginAttempts: number,
  lockedUntil: Date | null
): LoginLockStatus {
  // 检查是否在锁定期内
  if (lockedUntil && lockedUntil > new Date()) {
    return {
      locked: true,
      remainingMs: lockedUntil.getTime() - Date.now(),
      attempts: loginAttempts,
    }
  }

  return {
    locked: false,
    remainingMs: 0,
    attempts: loginAttempts,
  }
}

/**
 * 记录登录失败
 */
export function recordLoginFailure(currentAttempts: number): {
  attempts: number
  lockedUntil: Date | null
} {
  const newAttempts = currentAttempts + 1

  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    return {
      attempts: newAttempts,
      lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
    }
  }

  return {
    attempts: newAttempts,
    lockedUntil: null,
  }
}

/**
 * 重置登录失败次数
 */
export function resetLoginAttempts(): {
  attempts: number
  lockedUntil: null
} {
  return {
    attempts: 0,
    lockedUntil: null,
  }
}

// ==================== 常量导出 ====================

export const PASSWORD_CONSTANTS = {
  BCRYPT_ROUNDS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
}
