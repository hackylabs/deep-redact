import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  format: ['esm', 'cjs'],
  platform: 'neutral',
})
