import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createConsumerFixture, runTypesFixture } from '../support/package-fixture.js'
import { assertNoDeniedDeclarationSurface } from '../../fixtures/one-way-deny-list/index.js'

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

  it.each([
    'dist/index.d.ts',
    'dist/index.d.cts',
    'dist/adapters/console/index.d.ts',
    'dist/adapters/console/index.d.cts',
  ])('exposes no restore-like declaration surface in %s', (declarationPath) => {
    const declarationText = readFileSync(resolve(declarationPath), 'utf8')

    assertNoDeniedDeclarationSurface(declarationText, declarationPath)
  })

  it.each([
    'dist/adapters/console/index.d.ts',
    'dist/adapters/console/index.d.cts',
  ])('exposes the expected console adapter declaration surface in %s', (declarationPath) => {
    const declarationText = readFileSync(resolve(declarationPath), 'utf8')

    expect(declarationText).toContain('createRedactedConsole')
    expect(declarationText).toContain('ConsoleLike')
    expect(declarationText).toContain('ConsoleMethodName')
    expect(declarationText).toContain('ConsoleRedactionOptions')
    expect(declarationText).toContain('RedactedConsole')
  })
})
