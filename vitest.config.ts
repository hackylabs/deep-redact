import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      include: ['src/**/*.ts'],
    },
    include: ['test/**/*.test.ts'],
    benchmark: {
      outputJson: 'benchmark.json',
    },
  },
})
