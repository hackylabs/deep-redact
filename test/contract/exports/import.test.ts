import { afterEach, describe, expect, it } from 'vitest'
import { createConsumerFixture, runNodeFixture } from '../support/package-fixture.js'
import {
  assertNoDeniedPublicNames,
  publicConsoleAdapterOwnKeys,
  publicConsoleAdapterValueExportNames,
  publicPackageOwnKeys,
  publicValueExportNames,
} from '../../fixtures/one-way-deny-list/index.js'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.()
  }
})

describe('ESM consumer contract', () => {
  it('resolves the root package through import', async () => {
    const fixture = createConsumerFixture('esm')
    cleanups.push(fixture.cleanup)

    const { stdout } = await runNodeFixture(fixture.temporaryDirectory, 'index.mjs')
    const result = JSON.parse(stdout)

    expect(result).toMatchObject({
      adapterExportNames: publicConsoleAdapterValueExportNames,
      adapterExportOwnKeys: publicConsoleAdapterOwnKeys,
      adapterRedactsConsoleArguments: true,
      createRedactorReturnsCallable: true,
      createRedactorSerialises: true,
      createRedactorType: 'function',
      deepRedactReturnsCallable: true,
      deepRedactReturnsPayload: true,
      deepRedactType: 'function',
      exposesConsoleAdapterFromRoot: false,
      exposesLegacyClass: false,
      exportNames: publicValueExportNames,
      exportOwnKeys: publicPackageOwnKeys,
      privateAdapterSubpathErrors: [
        'ERR_PACKAGE_PATH_NOT_EXPORTED',
        'ERR_PACKAGE_PATH_NOT_EXPORTED',
      ],
      sharesFactory: true,
    })
    expect(result.redactorOwnKeys).toStrictEqual(['length', 'name', 'prototype'])
    expect(result.redactorPrototypeOwnKeys).toStrictEqual(['constructor'])
    assertNoDeniedPublicNames(result.adapterExportOwnKeys, 'ESM consumer console adapter exports')
    assertNoDeniedPublicNames(result.exportOwnKeys, 'ESM consumer root exports')
    assertNoDeniedPublicNames(result.redactorOwnKeys, 'ESM consumer redactor own keys')
    assertNoDeniedPublicNames(result.redactorPrototypeOwnKeys, 'ESM consumer redactor prototype own keys')
  })
})
