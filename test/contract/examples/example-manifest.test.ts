import { existsSync, readFileSync } from 'node:fs'
import { dirname, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ExampleVerificationError,
  loadExampleManifest,
  validateExampleManifest,
  verifyExampleManifest,
  type ExampleManifest,
} from '../../../scripts/example-validation.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const manifestPath = 'docs/examples/manifest.json'
const fixtureRoot = 'docs/examples/fixtures'

const validCategories = [
  'setup',
  'targeting',
  'replacement',
  'output',
  'runtime',
  'console',
  'migration-fast-redact',
  'migration-v3',
]

const validAssertionModes = ['structured-output', 'serialised-output']

const requiredRowKeys = [
  'id',
  'category',
  'docTarget',
  'sourceFile',
  'fixtureDir',
  'assertionMode',
  'expectedResultFile',
]

const expectRepositoryPath = (candidatePath: string, expectedPrefix: string): void => {
  expect(posix.isAbsolute(candidatePath)).toBe(false)
  expect(candidatePath).not.toContain('\\')
  expect(candidatePath).not.toMatch(/(^|\/)\.\.(\/|$)/)
  expect(posix.normalize(candidatePath)).toBe(candidatePath)
  const normalizedPrefix = expectedPrefix.endsWith('/') ? expectedPrefix : `${expectedPrefix}/`
  expect(candidatePath === expectedPrefix || candidatePath.startsWith(normalizedPrefix)).toBe(true)

  const resolvedPath = resolve(repoRoot, candidatePath)
  expect(relative(repoRoot, resolvedPath)).not.toMatch(/^\.\.(?:\/|\\|$)/)
}

describe('example manifest contract', () => {
  it('defines the single canonical example manifest as valid JSON', () => {
    expect(existsSync(resolve(repoRoot, manifestPath))).toBe(true)

    expect(() => JSON.parse(readFileSync(resolve(repoRoot, manifestPath), 'utf8'))).not.toThrow()
  })

  it('uses schemaVersion 1 and declares fixtureRoot as docs/examples/fixtures', () => {
    const manifest = loadExampleManifest(repoRoot)

    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.metadata.fixtureRoot).toBe(fixtureRoot)
  })

  it('requires all seven fields on every row when rows exist', () => {
    const manifest = loadExampleManifest(repoRoot)

    for (const row of manifest.rows) {
      expect(Object.keys(row)).toStrictEqual(requiredRowKeys)
    }
  })

  it('restricts category to the declared enum values for every row', () => {
    const manifest = loadExampleManifest(repoRoot)

    for (const row of manifest.rows) {
      expect(validCategories).toContain(row.category)
    }
  })

  it('restricts assertionMode to the declared enum values for every row', () => {
    const manifest = loadExampleManifest(repoRoot)

    for (const row of manifest.rows) {
      expect(validAssertionModes).toContain(row.assertionMode)
    }
  })

  it('keeps fixtureDir within expected fixture directories for every row', () => {
    const manifest = loadExampleManifest(repoRoot)

    for (const row of manifest.rows) {
      if (row.category === 'migration-fast-redact') {
        expectRepositoryPath(row.fixtureDir, 'test/migration/fast-redact/fixtures/')
      } else if (row.category === 'migration-v3') {
        expectRepositoryPath(row.fixtureDir, 'test/migration/v3/fixtures/')
      } else {
        expect(row.category).not.toMatch(/^migration-/)
        expectRepositoryPath(row.fixtureDir, `${fixtureRoot}/${row.id}`)
      }
    }
  })

  it('rejects a row whose category is not in the declared enum', () => {
    const manifest = loadExampleManifest(repoRoot)

    const invalidManifest: ExampleManifest = {
      ...manifest,
      rows: [
        {
          id: 'test-row',
          category: 'unknown-category' as never,
          docTarget: 'docs/examples/test-row.md',
          sourceFile: 'docs/examples/examples/test-row.ts',
          fixtureDir: `${fixtureRoot}/test-row`,
          assertionMode: 'structured-output',
          expectedResultFile: 'expected.json',
        },
      ],
    }

    expect(() => validateExampleManifest(invalidManifest)).toThrow(/unknown-category|category/)
  })

  it('rejects a row whose assertionMode is not in the declared enum', () => {
    const manifest = loadExampleManifest(repoRoot)

    const invalidManifest: ExampleManifest = {
      ...manifest,
      rows: [
        {
          id: 'test-row',
          category: 'setup',
          docTarget: 'docs/examples/test-row.md',
          sourceFile: 'docs/examples/examples/test-row.ts',
          fixtureDir: `${fixtureRoot}/test-row`,
          assertionMode: 'unknown-mode' as never,
          expectedResultFile: 'expected.json',
        },
      ],
    }

    expect(() => validateExampleManifest(invalidManifest)).toThrow(/unknown-mode|assertionMode/)
  })

  it('rejects a row whose fixtureDir contains .. traversal', () => {
    const manifest = loadExampleManifest(repoRoot)

    const invalidManifest: ExampleManifest = {
      ...manifest,
      rows: [
        {
          id: 'test-row',
          category: 'setup',
          docTarget: 'docs/examples/test-row.md',
          sourceFile: 'docs/examples/examples/test-row.ts',
          fixtureDir: `${fixtureRoot}/test-row/../escape`,
          assertionMode: 'structured-output',
          expectedResultFile: 'expected.json',
        },
      ],
    }

    expect(() => validateExampleManifest(invalidManifest)).toThrow(/fixtureDir/)
  })

  it('rejects a migration-fast-redact row whose fixtureDir contains .. traversal', () => {
    const manifest = loadExampleManifest(repoRoot)

    const invalidManifest: ExampleManifest = {
      ...manifest,
      rows: [
        {
          id: 'migration-test-row',
          category: 'migration-fast-redact',
          docTarget: 'docs/examples/migration-test-row.md',
          sourceFile: 'docs/examples/examples/migration-test-row.ts',
          fixtureDir: 'test/migration/fast-redact/fixtures/dot-path-structured-output/../../../escape',
          assertionMode: 'structured-output',
          expectedResultFile: 'expected-v4.json',
        },
      ],
    }

    expect(() => validateExampleManifest(invalidManifest)).toThrow(/fixtureDir/)
  })

  it('rejects a migration-v3 row whose fixtureDir contains .. traversal', () => {
    const manifest = loadExampleManifest(repoRoot)

    const invalidManifest: ExampleManifest = {
      ...manifest,
      rows: [
        {
          id: 'migration-test-row',
          category: 'migration-v3',
          docTarget: 'docs/examples/migration-test-row.md',
          sourceFile: 'docs/examples/examples/migration-test-row.ts',
          fixtureDir: 'test/migration/v3/fixtures/class-instantiation-to-factory/../../../escape',
          assertionMode: 'structured-output',
          expectedResultFile: 'expected-v4.json',
        },
      ],
    }

    expect(() => validateExampleManifest(invalidManifest)).toThrow(/fixtureDir/)
  })

  it('throws ExampleVerificationError with rowId, fixtureDir, assertionMode, and phase when a migration row has an invalid fixtureDir', () => {
    expect.assertions(5)
    const manifest = loadExampleManifest(repoRoot)

    const badRow = {
      id: 'migration-test-row',
      category: 'migration-fast-redact' as const,
      docTarget: 'docs/examples/migration-test-row.md',
      sourceFile: 'docs/examples/examples/migration-test-row.ts',
      fixtureDir: 'test/migration/fast-redact/fixtures/dot-path-structured-output/../../../escape',
      assertionMode: 'structured-output' as const,
      expectedResultFile: 'expected-v4.json',
    }

    const invalidManifest: ExampleManifest = { ...manifest, rows: [badRow] }

    let caughtError: unknown
    try {
      validateExampleManifest(invalidManifest)
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(ExampleVerificationError)
    const verificationError = caughtError as ExampleVerificationError
    expect(verificationError.rowId).toBe('migration-test-row')
    expect(verificationError.fixtureDir).toBe('test/migration/fast-redact/fixtures/dot-path-structured-output/../../../escape')
    expect(verificationError.assertionMode).toBe('structured-output')
    const expectedPhase: typeof verificationError.phase = 'fixture'
    expect(verificationError.phase).toBe(expectedPhase)
  })

  it('runs verifyExampleManifest against the real manifest and returns verified rows without error', async () => {
    const result = await verifyExampleManifest({ repositoryRoot: repoRoot })

    expect(result).toHaveLength(17)
    expect(result.map(r => r.id)).toStrictEqual([
      'singleton-setup',
      'key-targeting',
      'regex-property-matching',
      'path-targeting',
      'regex-path-segment-matching',
      'substring-targeting',
      'root-primitive-redaction',
      'replacement-and-removal',
      'retain-structure',
      'same-length-replacement',
      'serialised-output',
      'ignored-value-types',
      'custom-transformer',
      'graceful-error-replacement',
      'console-redaction',
      'migration-fast-redact-dot-path-structured-output',
      'migration-v3-class-instantiation-to-factory',
    ])
  })

  it('contains exactly 15 non-migration example rows', () => {
    const manifest = loadExampleManifest(repoRoot)
    const nonMigrationRows = manifest.rows.filter(r => !r.category.startsWith('migration-'))

    expect(nonMigrationRows).toHaveLength(15)
  })

  it('contains at least one migration-fast-redact row and at least one migration-v3 row', () => {
    const manifest = loadExampleManifest(repoRoot)
    const hasFastRedact = manifest.rows.some(r => r.category === 'migration-fast-redact')
    const hasV3 = manifest.rows.some(r => r.category === 'migration-v3')

    expect(hasFastRedact).toBe(true)
    expect(hasV3).toBe(true)
  })

  it('exposes the example verifier through package scripts without widening the runtime API', () => {
    const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
      dependencies?: Record<string, string>;
    }

    expect(packageJson.scripts['verify:examples']).toBe(
      'pnpm run build && node --experimental-strip-types ./scripts/verify-examples.ts',
    )
    expect(packageJson.scripts['generate-example-docs']).toBe(
      'node --experimental-strip-types ./scripts/generate-example-docs.ts',
    )
    expect(packageJson.dependencies).toBeUndefined()
  })
})
