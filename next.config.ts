import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  // Standalone 模式（Docker 部署需要）
  output: "standalone",

  // 禁用严格模式避免双重渲染
  reactStrictMode: true,
}

export default withSentryConfig(nextConfig, {
  // 自动上传 sourcemap
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // 仅在生产环境上传
  silent: process.env.NODE_ENV !== "production",

  // 不自动注入 Sentry（我们手动配置）
  disableLogger: true,
})
