import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  exports: Record<string, unknown>
}

describe('Package build surface', () => {
  it('publishes only the root v4 package surface', () => {
    expect(packageJson.exports).toEqual({
      '.': {
        import: './dist/index.js',
        require: './dist/index.cjs',
        types: './dist/index.d.ts',
      },
      './package.json': './package.json',
    })
  })

  it('emits dual-format artefacts and declaration files', () => {
    expect(existsSync(resolve('dist/index.js'))).toBe(true)
    expect(existsSync(resolve('dist/index.cjs'))).toBe(true)
    expect(existsSync(resolve('dist/index.d.ts'))).toBe(true)
    expect(existsSync(resolve('dist/index.d.cts'))).toBe(true)
  })

  it('does not advertise the legacy class on the built root surface', async () => {
    const esmModule = await import(resolve('dist/index.js'))
    const cjsModule = require(resolve('dist/index.cjs'))

    expect(esmModule).not.toHaveProperty('DeepRedact')
    expect(cjsModule).not.toHaveProperty('DeepRedact')
    expect(esmModule).toHaveProperty('deepRedact')
    expect(cjsModule).toHaveProperty('createRedactor')
  })
})
