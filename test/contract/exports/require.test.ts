import { afterEach, describe, expect, it } from 'vitest'
import { createConsumerFixture, runNodeFixture } from '../support/package-fixture.js'
import {
  assertNoDeniedPublicNames,
  publicPackageOwnKeys,
  publicValueExportNames,
} from '../../fixtures/one-way-deny-list/index.js'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.()
  }
})

describe('CommonJS consumer contract', () => {
  it('resolves the root package through require', async () => {
    const fixture = createConsumerFixture('cjs')
    cleanups.push(fixture.cleanup)

    const { stdout } = await runNodeFixture(fixture.temporaryDirectory, 'index.cjs')
    const result = JSON.parse(stdout)

    expect(result).toMatchObject({
      createRedactorReturnsCallable: true,
      createRedactorSerialises: true,
      createRedactorType: 'function',
      deepRedactReturnsCallable: true,
      deepRedactReturnsPayload: true,
      deepRedactType: 'function',
      exposesLegacyClass: false,
      exportNames: publicValueExportNames,
      exportOwnKeys: publicPackageOwnKeys,
      sharesFactory: true,
    })
    expect(result.redactorOwnKeys).toEqual(expect.arrayContaining(['length', 'name', 'prototype']))
    expect(result.redactorPrototypeOwnKeys).toStrictEqual(['constructor'])
    assertNoDeniedPublicNames(result.exportOwnKeys, 'CommonJS consumer root exports')
    assertNoDeniedPublicNames(result.redactorOwnKeys, 'CommonJS consumer redactor own keys')
    assertNoDeniedPublicNames(result.redactorPrototypeOwnKeys, 'CommonJS consumer redactor prototype own keys')
  })
})
