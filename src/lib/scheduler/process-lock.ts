/**
 * Process Lock 进程级锁
 *
 * 防止多实例部署时重复执行 Loop
 * 使用内存锁 + 数据库锁双重保障
 */
import { prisma } from '../prisma'
import logger from '../logger'

// ==================== 类型定义 ====================

export interface LockOptions {
  /** 锁的名称 */
  lockName: string
  /** 锁的超时时间（毫秒） */
  timeoutMs?: number
  /** 重试次数 */
  retryCount?: number
  /** 重试间隔（毫秒） */
  retryIntervalMs?: number
}

export interface LockResult {
  /** 是否成功获取锁 */
  acquired: boolean
  /** 锁 ID（用于释放锁） */
  lockId?: string
  /** 错误信息 */
  error?: string
}

// ==================== 内存锁 ====================

const memoryLocks = new Map<string, { lockId: string; expiresAt: number }>()

/**
 * 获取内存锁
 */
function acquireMemoryLock(lockName: string, timeoutMs: number): LockResult {
  const now = Date.now()
  const existing = memoryLocks.get(lockName)

  // 检查锁是否存在且未过期
  if (existing && existing.expiresAt > now) {
    return {
      acquired: false,
      error: `Lock "${lockName}" is already held by ${existing.lockId}`,
    }
  }

  // 获取锁
  const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  memoryLocks.set(lockName, {
    lockId,
    expiresAt: now + timeoutMs,
  })

  return { acquired: true, lockId }
}

/**
 * 释放内存锁
 */
function releaseMemoryLock(lockName: string, lockId: string): boolean {
  const existing = memoryLocks.get(lockName)
  if (existing && existing.lockId === lockId) {
    memoryLocks.delete(lockName)
    return true
  }
  return false
}

// ==================== 数据库锁 ====================

/**
 * 获取数据库锁（使用 SchedulerState 表）
 */
async function acquireDatabaseLock(
  lockName: string,
  timeoutMs: number
): Promise<LockResult> {
  const lockId = `db_lock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const expiresAt = new Date(Date.now() + timeoutMs)

  try {
    // 使用 upsert 原子操作
    const result = await prisma.schedulerState.upsert({
      where: { loopName: `__lock__${lockName}` },
      update: {
        status: lockId,
        lastError: expiresAt.toISOString(),
      },
      create: {
        loopName: `__lock__${lockName}`,
        status: lockId,
        lastError: expiresAt.toISOString(),
      },
    })

    // 检查锁是否被其他人持有
    if (result.status !== lockId) {
      // 检查锁是否已过期
      const lockExpiresAt = new Date(result.lastError || '')
      if (lockExpiresAt > new Date()) {
        return {
          acquired: false,
          error: `Database lock "${lockName}" is held by ${result.status}`,
        }
      }
    }

    return { acquired: true, lockId }
  } catch (error) {
    return {
      acquired: false,
      error: `Failed to acquire database lock: ${(error as Error).message}`,
    }
  }
}

/**
 * 释放数据库锁
 */
async function releaseDatabaseLock(lockName: string, lockId: string): Promise<boolean> {
  try {
    const result = await prisma.schedulerState.updateMany({
      where: {
        loopName: `__lock__${lockName}`,
        status: lockId,
      },
      data: {
        status: 'idle',
        lastError: null,
      },
    })
    return result.count > 0
  } catch (error) {
    logger.error('Failed to release database lock', error as Error, { lockName })
    return false
  }
}

// ==================== 统一锁接口 ====================

/**
 * 获取分布式锁
 *
 * 同时使用内存锁和数据库锁，双重保障
 */
export async function acquireLock(options: LockOptions): Promise<LockResult> {
  const {
    lockName,
    timeoutMs = 60 * 1000,
    retryCount = 3,
    retryIntervalMs = 1000,
  } = options

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    // 1. 尝试获取内存锁
    const memoryResult = acquireMemoryLock(lockName, timeoutMs)
    if (!memoryResult.acquired) {
      if (attempt < retryCount) {
        await sleep(retryIntervalMs)
        continue
      }
      return memoryResult
    }

    // 2. 尝试获取数据库锁
    const dbResult = await acquireDatabaseLock(lockName, timeoutMs)
    if (!dbResult.acquired) {
      // 释放内存锁
      releaseMemoryLock(lockName, memoryResult.lockId!)
      if (attempt < retryCount) {
        await sleep(retryIntervalMs)
        continue
      }
      return dbResult
    }

    return { acquired: true, lockId: memoryResult.lockId }
  }

  return { acquired: false, error: 'Max retry attempts exceeded' }
}

/**
 * 释放分布式锁
 */
export async function releaseLock(lockName: string, lockId: string): Promise<boolean> {
  const memoryReleased = releaseMemoryLock(lockName, lockId)
  const dbReleased = await releaseDatabaseLock(lockName, lockId)

  return memoryReleased || dbReleased
}

/**
 * 在锁保护下执行函数
 */
export async function withLock<T>(
  options: LockOptions,
  fn: () => Promise<T>
): Promise<T> {
  const lockResult = await acquireLock(options)

  if (!lockResult.acquired) {
    throw new Error(`Failed to acquire lock: ${lockResult.error}`)
  }

  try {
    return await fn()
  } finally {
    await releaseLock(options.lockName, lockResult.lockId!)
  }
}

// ==================== 辅助函数 ====================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 清理过期的内存锁
 */
export function cleanupExpiredLocks(): number {
  const now = Date.now()
  let cleanedCount = 0

  for (const [lockName, lock] of memoryLocks) {
    if (lock.expiresAt <= now) {
      memoryLocks.delete(lockName)
      cleanedCount++
    }
  }

  return cleanedCount
}

// 定期清理过期锁
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredLocks, 60 * 1000)
}
