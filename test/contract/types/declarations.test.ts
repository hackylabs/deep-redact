import { afterEach, describe, expect, it } from 'vitest'
import { createConsumerFixture, runTypesFixture } from '../support/package-fixture.js'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.()
  }
})

describe('Type declaration contract', () => {
  it.each([
    'types',
    'types-cjs',
  ])('resolves consumer-facing declarations for %s fixtures', async (fixtureName) => {
    const fixture = createConsumerFixture(fixtureName)
    cleanups.push(fixture.cleanup)

    const result = await runTypesFixture(fixture.temporaryDirectory)

    expect(result.stderr).toBe('')
  })
})
