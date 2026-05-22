import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertNoDeniedPublicNames,
  publicConsoleAdapterOwnKeys,
  publicConsoleAdapterValueExportNames,
  publicPackageOwnKeys,
  publicValueExportNames,
} from './fixtures/one-way-deny-list/index.js'

const require = createRequire(import.meta.url)
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  exports: Record<string, unknown>;
}

describe('Package build surface', () => {
  it('publishes only the root v4 package surface', () => {
    expect(packageJson.exports).toEqual({
      '.': {
        import: './dist/index.js',
        require: './dist/index.cjs',
        types: './dist/index.d.ts',
      },
      './adapters/console': {
        import: './dist/adapters/console/index.js',
        require: './dist/adapters/console/index.cjs',
        types: './dist/adapters/console/index.d.ts',
      },
      './package.json': './package.json',
    })
    assertNoDeniedPublicNames(Object.keys(packageJson.exports), 'package export map')
  })

  it('emits dual-format artefacts and declaration files', () => {
    expect(existsSync(resolve('dist/index.js'))).toBe(true)
    expect(existsSync(resolve('dist/index.cjs'))).toBe(true)
    expect(existsSync(resolve('dist/index.d.ts'))).toBe(true)
    expect(existsSync(resolve('dist/index.d.cts'))).toBe(true)
    expect(existsSync(resolve('dist/adapters/console/index.js'))).toBe(true)
    expect(existsSync(resolve('dist/adapters/console/index.cjs'))).toBe(true)
    expect(existsSync(resolve('dist/adapters/console/index.d.ts'))).toBe(true)
    expect(existsSync(resolve('dist/adapters/console/index.d.cts'))).toBe(true)
  })

  it('does not advertise the legacy class on the built root surface', async () => {
    const esmModule = await import(resolve('dist/index.js'))
    const cjsModule = require(resolve('dist/index.cjs'))
    const esmOwnKeys = Reflect.ownKeys(esmModule)
    const cjsOwnKeys = Reflect.ownKeys(cjsModule)

    expect(esmModule).not.toHaveProperty('DeepRedact')
    expect(cjsModule).not.toHaveProperty('DeepRedact')
    expect(Object.keys(esmModule).sort()).toStrictEqual(publicValueExportNames)
    expect(Object.keys(cjsModule).sort()).toStrictEqual(publicValueExportNames)
    expect(esmOwnKeys.map(String).sort()).toStrictEqual(publicPackageOwnKeys)
    expect(cjsOwnKeys.map(String).sort()).toStrictEqual(publicPackageOwnKeys)
    assertNoDeniedPublicNames(esmOwnKeys, 'built ESM root exports')
    assertNoDeniedPublicNames(cjsOwnKeys, 'built CommonJS root exports')
  })

  it('advertises the console adapter only through its dedicated built subpath', async () => {
    const rootEsmModule = await import(resolve('dist/index.js'))
    const rootCjsModule = require(resolve('dist/index.cjs'))
    const adapterEsmModule = await import(resolve('dist/adapters/console/index.js'))
    const adapterCjsModule = require(resolve('dist/adapters/console/index.cjs'))
    const adapterEsmOwnKeys = Reflect.ownKeys(adapterEsmModule)
    const adapterCjsOwnKeys = Reflect.ownKeys(adapterCjsModule)

    expect(rootEsmModule).not.toHaveProperty('createRedactedConsole')
    expect(rootCjsModule).not.toHaveProperty('createRedactedConsole')
    expect(Object.keys(adapterEsmModule).sort()).toStrictEqual(publicConsoleAdapterValueExportNames)
    expect(Object.keys(adapterCjsModule).sort()).toStrictEqual(publicConsoleAdapterValueExportNames)
    expect(adapterEsmOwnKeys.map(String).sort()).toStrictEqual(publicConsoleAdapterOwnKeys)
    expect(adapterCjsOwnKeys.map(String).sort()).toStrictEqual(publicConsoleAdapterOwnKeys)
    assertNoDeniedPublicNames(adapterEsmOwnKeys, 'built ESM console adapter exports')
    assertNoDeniedPublicNames(adapterCjsOwnKeys, 'built CommonJS console adapter exports')
    assertNoDeniedPublicNames(
      Reflect.ownKeys(adapterEsmModule.createRedactedConsole),
      'built ESM console adapter factory own keys',
    )
    assertNoDeniedPublicNames(
      Reflect.ownKeys(adapterCjsModule.createRedactedConsole),
      'built CommonJS console adapter factory own keys',
    )
  })
})
