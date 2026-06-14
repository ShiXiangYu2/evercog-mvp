import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    env: {
      JWT_SECRET: 'test-secret-key-for-testing-only',
      DATABASE_URL: 'file:./test.db',
      LLM_PROVIDER: 'mock',
      NODE_ENV: 'test',
    },
    testTimeout: 30000, // LLM 测试可能需要较长时间
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules',
        '.next',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/generated/**',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
