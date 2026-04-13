import { afterEach, describe, expect, it } from 'vitest'
import { createConsumerFixture, runNodeFixture } from '../support/package-fixture.js'

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

    expect(result).toEqual({
      createRedactorType: 'function',
      deepRedactType: 'function',
      exposesLegacyClass: false,
      exportNames: ['createRedactor', 'deepRedact'],
      sharesFactory: true,
    })
  })
})
