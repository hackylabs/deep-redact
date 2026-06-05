import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    reporters: ['default', 'verbose'],
    testTimeout: 15_000,
  },
})
