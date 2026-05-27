import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 15_000,
    reporters: ['default', 'verbose'],
    include: ['test/build.test.ts', 'test/contract/**/*.test.ts', 'test/security/**/*.test.ts', 'test/security/*.test.ts'],
    benchmark: {
      outputJson: 'benchmark.json',
    },
  },
})
