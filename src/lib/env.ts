/**
 * 环境变量验证模块
 *
 * 使用 Zod 验证所有必要的环境变量
 * 在应用启动时调用 validateEnv() 确保配置正确
 */
import { z } from 'zod'

// ==================== 环境变量 Schema ====================

const envSchema = z.object({
  // 数据库
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT 认证
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // LLM 配置
  LLM_PROVIDER: z.enum(['mock', 'deepseek', 'openai']).default('mock'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // 应用配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
})

// ==================== 类型定义 ====================

export type Env = z.infer<typeof envSchema>

// ==================== 验证函数 ====================

let _env: Env | null = null

/**
 * 验证并返回环境变量
 * 使用缓存避免重复验证
 */
export function validateEnv(): Env {
  if (_env) return _env

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`
    )

    console.error('❌ Environment validation failed:')
    console.error(errors.join('\n'))
    console.error('\n💡 Copy .env.example to .env and fill in the values')

    // 开发环境下提供更详细的错误信息（过滤敏感字段）
    if (process.env.NODE_ENV !== 'production') {
      const sensitiveKeys = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'DSN']
      const filtered = Object.fromEntries(
        Object.entries(process.env).map(([k, v]) => {
          if (sensitiveKeys.some(s => k.toUpperCase().includes(s))) {
            return [k, v ? '***' : '']
          }
          return [k, v]
        })
      )
      console.error('\n📋 Current environment variables (sensitive fields redacted):')
      console.error(JSON.stringify(filtered, null, 2))
    }

    throw new Error('Environment validation failed')
  }

  _env = result.data
  return _env
}

/**
 * 获取环境变量（带验证）
 */
export function getEnv(): Env {
  if (!_env) {
    return validateEnv()
  }
  return _env
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production'
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development'
}

/**
 * 检查是否为测试环境
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test'
}

/**
 * 获取 LLM Provider 配置
 */
export function getLLMConfig() {
  const env = getEnv()

  return {
    provider: env.LLM_PROVIDER,
    deepseek: {
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: env.DEEPSEEK_BASE_URL,
      model: env.DEEPSEEK_MODEL,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL,
    },
  }
}

/**
 * 重置环境变量缓存（用于测试）
 */
export function resetEnv(): void {
  _env = null
}
