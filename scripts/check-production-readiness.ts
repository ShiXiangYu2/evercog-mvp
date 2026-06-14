const DEFAULT_JWT_SECRET = 'change-this-to-a-strong-random-string-in-production'

type Check = {
  name: string
  passed: boolean
  message: string
  severity: 'error' | 'warning'
}

function env(name: string): string {
  return process.env[name] || ''
}

function check(): Check[] {
  const checks: Check[] = []

  checks.push({
    name: 'DATABASE_PROVIDER',
    passed: env('DATABASE_PROVIDER') === 'postgresql',
    severity: 'error',
    message: 'Production must set DATABASE_PROVIDER=postgresql. SQLite is only for local development/demo.',
  })

  checks.push({
    name: 'DATABASE_URL',
    passed: env('DATABASE_URL').startsWith('postgresql://') || env('DATABASE_URL').startsWith('postgres://'),
    severity: 'error',
    message: 'Production DATABASE_URL must point to PostgreSQL.',
  })

  checks.push({
    name: 'JWT_SECRET',
    passed: Boolean(env('JWT_SECRET')) && env('JWT_SECRET') !== DEFAULT_JWT_SECRET && env('JWT_SECRET').length >= 32,
    severity: 'error',
    message: 'JWT_SECRET must be rotated and at least 32 characters.',
  })

  checks.push({
    name: 'DEMO_LOGIN_ENABLED',
    passed: env('DEMO_LOGIN_ENABLED') !== 'true',
    severity: 'error',
    message: 'Passwordless demo login must be disabled in production.',
  })

  checks.push({
    name: 'LLM_PROVIDER',
    passed: env('LLM_PROVIDER') === 'deepseek',
    severity: 'error',
    message: 'Production LLM_PROVIDER must be deepseek.',
  })

  checks.push({
    name: 'DEEPSEEK_API_KEY',
    passed: Boolean(env('DEEPSEEK_API_KEY')),
    severity: 'error',
    message: 'DEEPSEEK_API_KEY is required in production.',
  })

  checks.push({
    name: 'LLM_FALLBACK_TO_MOCK',
    passed: env('LLM_FALLBACK_TO_MOCK') !== 'true',
    severity: 'error',
    message: 'Production must not fallback to mock LLM responses.',
  })

  checks.push({
    name: 'SENTRY_AUTH_TOKEN',
    passed: Boolean(env('SENTRY_AUTH_TOKEN')),
    severity: 'warning',
    message: 'SENTRY_AUTH_TOKEN is recommended for release creation and source map upload.',
  })

  return checks
}

const checks = check()
let errors = 0
let warnings = 0

for (const item of checks) {
  const icon = item.passed ? 'PASS' : item.severity.toUpperCase()
  console.log(`[${icon}] ${item.name}: ${item.message}`)
  if (!item.passed && item.severity === 'error') errors++
  if (!item.passed && item.severity === 'warning') warnings++
}

console.log(`\nProduction readiness: ${errors} error(s), ${warnings} warning(s)`)

if (errors > 0) {
  process.exit(1)
}
