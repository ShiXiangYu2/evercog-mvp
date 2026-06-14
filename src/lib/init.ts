/**
 * 应用初始化
 *
 * 在 Next.js 启动时初始化各个模块
 */
import { initializeAgentSystem } from './agent'
import { getScheduler } from './scheduler'
import { validateJWTConfig } from './jwt'
import logger from './logger'

let initialized = false

/**
 * 初始化应用
 *
 * 在 Next.js server 启动时调用一次
 */
export function initializeApp(): void {
  if (initialized) {
    logger.warn('App already initialized')
    return
  }

  logger.info('Initializing app...')

  try {
    // 1. 验证 JWT 配置
    const jwtValidation = validateJWTConfig()
    if (!jwtValidation.valid) {
      logger.error('JWT configuration validation failed', undefined, {
        errors: jwtValidation.errors,
      })
      // 在生产环境抛出错误，开发环境只警告
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`JWT configuration errors: ${jwtValidation.errors.join(', ')}`)
      }
    } else {
      logger.info('JWT configuration validated')
    }

    // 2. 初始化 Agent 系统
    initializeAgentSystem()
    logger.info('Agent system initialized')

    // 3. 启动 Scheduler
    const scheduler = getScheduler()
    scheduler.start()
    logger.info('Scheduler started')

    initialized = true
    logger.info('App initialization completed')
  } catch (error) {
    logger.error('App initialization failed', error as Error)
    // 生产环境抛出错误，阻止应用启动
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
    // 开发环境允许继续运行
  }
}

/**
 * 获取初始化状态
 */
export function isInitialized(): boolean {
  return initialized
}
