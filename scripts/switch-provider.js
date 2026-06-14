#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Prisma Schema Provider 切换脚本
 *
 * 用于在构建时切换数据库 provider（sqlite ↔ postgresql）
 *
 * 用法：
 *   node scripts/switch-provider.js postgresql   # 切换到 PostgreSQL
 *   node scripts/switch-provider.js sqlite        # 切换到 SQLite（默认）
 */

const fs = require('fs')
const path = require('path')

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const PROVIDER = process.argv[2] || 'sqlite'

const VALID_PROVIDERS = ['sqlite', 'postgresql', 'mysql']
if (!VALID_PROVIDERS.includes(PROVIDER)) {
  console.error(`Invalid provider: ${PROVIDER}. Must be one of: ${VALID_PROVIDERS.join(', ')}`)
  process.exit(1)
}

let schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')

// 替换 provider 行
schema = schema.replace(
  /provider\s*=\s*"[^"]*"/,
  `provider = "${PROVIDER}"`
)

fs.writeFileSync(SCHEMA_PATH, schema, 'utf-8')

console.log(`✅ Prisma schema provider switched to: ${PROVIDER}`)
console.log(`   File: ${SCHEMA_PATH}`)
