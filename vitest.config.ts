import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'src/**/*.test.tsx'],
    env: {
      JWT_SECRET: 'test-secret-key-for-testing-only',
      DATABASE_URL: 'file:./test.db',
      LLM_PROVIDER: 'mock',
      NODE_ENV: 'test',
    },
    testTimeout: 30000, // LLM 测试可能需要较长时间
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
