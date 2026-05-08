import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    benchmark: {
      outputJson: 'benchmark.json',
    },
    include: ['test/bench/**/*.bench.ts'],
    reporters: ['default'],
    testTimeout: 15_000,
  },
})
