/**
 * Sentry 客户端配置
 *
 * 在浏览器端捕获前端错误。
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境
  environment: process.env.NODE_ENV || 'development',

  // 采样率：生产环境 100%，开发环境 0%
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

  // 隔离会话（推荐）
  tunnel: '/api/sentry', // 可选：使用 tunnel 代理避免 ad blocker

  // 忽略的错误
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
  ],

  // 面包屑过滤
  beforeBreadcrumb(breadcrumb) {
    // 过滤敏感信息
    if (breadcrumb.data?.url?.includes('password')) {
      return null
    }
    return breadcrumb
  },
})
