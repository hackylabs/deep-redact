import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  entry: {
    index: 'src/index.ts',
    'adapters/console/index': 'src/adapters/console/index.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'neutral',
})
