/**
 * Sentry 服务端配置
 *
 * 在 Node.js 服务端捕获 API 路由错误。
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 环境
  environment: process.env.NODE_ENV || 'development',

  // 采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 0,

  // 忽略的错误
  ignoreErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ECONNRESET',
  ],
})
