/**
 * 结构化日志模块
 *
 * 提供统一的日志记录功能
 * 支持不同日志级别和结构化输出
 */

// ==================== 日志级别 ====================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
}

// ==================== 日志上下文 ====================

export interface LogContext {
  /** 模块名称 */
  module?: string
  /** 用户 ID */
  userId?: string
  /** 请求 ID */
  requestId?: string
  /** 额外元数据 */
  [key: string]: unknown
}

// ==================== 日志条目 ====================

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// ==================== Logger 类 ====================

class Logger {
  private minLevel: LogLevel
  private defaultContext: LogContext

  constructor(minLevel: LogLevel = LogLevel.INFO, defaultContext: LogContext = {}) {
    this.minLevel = minLevel
    this.defaultContext = defaultContext
  }

  /**
   * 创建子 logger，携带默认上下文
   */
  child(context: LogContext): Logger {
    return new Logger(this.minLevel, { ...this.defaultContext, ...context })
  }

  /**
   * 设置最小日志级别
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    // 开发环境使用可读格式，生产环境使用 JSON
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry))
    } else {
      this.prettyPrint(entry)
    }
  }

  /**
   * 美化打印日志（开发环境）
   */
  private prettyPrint(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // cyan
      [LogLevel.INFO]: '\x1b[32m',  // green
      [LogLevel.WARN]: '\x1b[33m',  // yellow
      [LogLevel.ERROR]: '\x1b[31m', // red
    }
    const reset = '\x1b[0m'
    const color = colors[entry.level]

    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : ''

    const base = `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}]${reset} ${entry.message}${contextStr}`

    if (entry.error) {
      console.error(base)
      console.error(`  ${entry.error.name}: ${entry.error.message}`)
      if (entry.error.stack) {
        console.error(`  Stack: ${entry.error.stack.split('\n').slice(1).join('\n  ')}`)
      }
    } else if (entry.level === LogLevel.ERROR) {
      console.error(base)
    } else if (entry.level === LogLevel.WARN) {
      console.warn(base)
    } else {
      console.log(base)
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * INFO 级别日志
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * 记录 API 请求
   */
  request(
    method: string,
    path: string,
    context?: LogContext
  ): void {
    this.info(`${method} ${path}`, context)
  }

  /**
   * 记录 API 响应
   */
  response(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
    this.log(level, `${method} ${path} ${statusCode} ${duration}ms`, context)
  }

  /**
   * 记录数据库操作
   */
  database(
    operation: string,
    table: string,
    duration: number,
    context?: LogContext
  ): void {
    this.debug(`DB ${operation} ${table} ${duration}ms`, context)
  }

  /**
   * 记录 LLM 调用
   */
  llm(
    provider: string,
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    this.info(`LLM ${provider} ${operation} ${duration}ms`, context)
  }
}

// ==================== 默认 Logger 实例 ====================

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase()
  switch (level) {
    case 'debug':
      return LogLevel.DEBUG
    case 'warn':
      return LogLevel.WARN
    case 'error':
      return LogLevel.ERROR
    default:
      return LogLevel.INFO
  }
}

export const logger = new Logger(getLogLevel())

// ==================== 请求日志中间件 ====================

/**
 * 创建请求上下文
 */
export function createRequestContext(requestId?: string): LogContext {
  return {
    requestId: requestId || generateRequestId(),
  }
}

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ==================== 导出 ====================

export { Logger }
export default logger
