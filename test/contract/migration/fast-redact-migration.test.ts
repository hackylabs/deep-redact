import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { posix, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deepRedact } from '../../../src/index.js'
import {
  buildGeneratedFastRedactMigrationGuide,
  generatedFilePaths,
} from '../../../scripts/generated-files.ts'
import {
  assertionModesByClassification,
  type FastRedactMigrationAction,
  loadFastRedactMigrationMatrix,
  renderFastRedactMigrationGuide,
  validateFastRedactMigrationMatrix,
  verifyFastRedactMigrationMatrix,
  type FastRedactMigrationMatrix,
  type FastRedactMigrationRow,
} from '../../../scripts/fast-redact-migration.ts'

const repoRoot = process.cwd()
const matrixPath = 'test/migration/fast-redact/matrix.json'
const fixtureRoot = 'test/migration/fast-redact/fixtures'
const guidePath = 'docs/migration/from-fast-redact.md'

const rowKeys = [
  'id',
  'classification',
  'fixtureDir',
  'fastRedactConfig',
  'v4Action',
  'assertionMode',
  'expectedResult',
]

const expectedRowIds = [
  'dot-path-structured-output',
  'bracket-quoted-property-path',
  'numeric-array-index-path',
  'final-wildcard-path',
  'intermediate-wildcard-path',
  'leading-bracket-property-path',
  'literal-string-censor',
  'function-censor-helper',
  'bracket-array-wildcard-rewrite',
  'serialize-false-spelling-rewrite',
  'default-json-output-serialise-true',
  'custom-serialize-function-rewrite',
  'remove-true-rewrite',
  'no-restore-api',
  'no-strict-option',
  'omitted-serialise-structured-output',
  'non-string-censor-value',
]

const readRepositoryFile = (path: string): string => readFileSync(resolve(repoRoot, path), 'utf8')

const expectRepositoryPath = (path: string, expectedPrefix: string): void => {
  expect(posix.isAbsolute(path)).toBe(false)
  expect(path).not.toContain('\\')
  expect(path).not.toMatch(/(^|\/)\.\.(\/|$)/)
  expect(posix.normalize(path)).toBe(path)
  expect(path === expectedPrefix || path.startsWith(`${expectedPrefix}/`)).toBe(true)

  const resolvedPath = resolve(repoRoot, path)
  expect(relative(repoRoot, resolvedPath)).not.toMatch(/^\.\.(?:\/|\\|$)/)
}

const byId = (matrix: FastRedactMigrationMatrix): Map<string, FastRedactMigrationRow> => {
  return new Map(matrix.rows.map((row) => [row.id, row]))
}

describe('fast-redact migration matrix contract', () => {
  it('defines the single canonical migration manifest with the admitted rows in order', () => {
    expect(existsSync(resolve(repoRoot, matrixPath))).toBe(true)
    expectRepositoryPath(matrixPath, 'test/migration/fast-redact')
    expect(readdirSync(resolve(repoRoot, 'test/migration/fast-redact')).filter((entry) => entry.endsWith('.json'))).toStrictEqual([
      'matrix.json',
    ])

    const matrix = loadFastRedactMigrationMatrix(repoRoot)

    expect(matrix.schemaVersion).toBe(1)
    expect(matrix.rows.map((row) => row.id)).toStrictEqual(expectedRowIds)
  })

  it('validates a strict row shape, classifications, assertion modes, and fixture confinement', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)

    expect(() => validateFastRedactMigrationMatrix(matrix, repoRoot)).not.toThrow()

    for (const row of matrix.rows) {
      expect(Object.keys(row)).toStrictEqual(rowKeys)
      expect(['direct-equivalent', 'mechanical-rewrite', 'intentional-divergence']).toContain(row.classification)
      expect(assertionModesByClassification[row.classification]).toContain(row.assertionMode)
      expectRepositoryPath(row.fixtureDir, `${fixtureRoot}/${row.id}`)
      expect(row.fixtureDir).toBe(`${fixtureRoot}/${row.id}`)
      expect(statSync(resolve(repoRoot, row.fixtureDir)).isDirectory()).toBe(true)
      expect(statSync(resolve(repoRoot, row.fixtureDir, 'input.json')).isFile()).toBe(true)
      expect(statSync(resolve(repoRoot, row.fixtureDir, 'notes.md')).isFile()).toBe(true)

      if (row.expectedResult.kind === 'structured') {
        expect(row.expectedResult.file).toBe('expected-v4.json')
      } else if (row.expectedResult.kind === 'serialised') {
        expect(row.expectedResult.file).toBe('expected-v4.txt')
      } else {
        expect(row.expectedResult.kind).toBe('divergence')
        expect(row.expectedResult.file).toBe('divergence.json')
      }

      expect(statSync(resolve(repoRoot, row.fixtureDir, row.expectedResult.file)).isFile()).toBe(true)
    }
  })

  it('rejects undeclared assertion modes and fixture paths that escape the migration fixture root', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)
    const invalidModeMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    invalidModeMatrix.rows[0].assertionMode = 'documented-divergence'

    expect(() => validateFastRedactMigrationMatrix(invalidModeMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*assertionMode/,
    )

    const invalidFixtureMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    invalidFixtureMatrix.rows[0].fixtureDir = 'test/migration/fast-redact/fixtures/dot-path-structured-output/../escape'

    expect(() => validateFastRedactMigrationMatrix(invalidFixtureMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*fixtureDir/,
    )
  })

  it('rejects malformed action and expected-result schema fields before filesystem access', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)

    const invalidActionKindMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    invalidActionKindMatrix.rows[0].v4Action.kind = 'invalid-action' as FastRedactMigrationAction['kind']

    expect(() => validateFastRedactMigrationMatrix(invalidActionKindMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*v4Action\.kind/,
    )

    const nullConfigMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    nullConfigMatrix.rows[0].v4Action.config = null as never

    expect(() => validateFastRedactMigrationMatrix(nullConfigMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*v4Action\.config/,
    )

    const emptyStepsMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    emptyStepsMatrix.rows[0].v4Action.migrationSteps = []

    expect(() => validateFastRedactMigrationMatrix(emptyStepsMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*migrationSteps/,
    )

    const invalidKindMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    invalidKindMatrix.rows[0].expectedResult.kind = 'html' as never
    invalidKindMatrix.rows[0].expectedResult.file = 'expected-v4.json'

    expect(() => validateFastRedactMigrationMatrix(invalidKindMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*expectedResult\.kind/,
    )

    const invalidFileMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    invalidFileMatrix.rows[0].expectedResult.file = '../expected-v4.json'

    expect(() => validateFastRedactMigrationMatrix(invalidFileMatrix, repoRoot)).toThrow(
      /dot-path-structured-output.*expectedResult\.file/,
    )

    const missingUnsupportedOptionMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    delete missingUnsupportedOptionMatrix.rows.find((row) => row.id === 'no-strict-option')?.v4Action.unsupportedOption

    expect(() => validateFastRedactMigrationMatrix(missingUnsupportedOptionMatrix, repoRoot)).toThrow(
      /no-strict-option.*unsupportedOption/,
    )
  })

  it('uses the supplied repository root and POSIX manifest metadata for path validation', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)

    expect(matrix.metadata.generatedGuide).toBe('docs/migration/from-fast-redact.md')
    expect(() => validateFastRedactMigrationMatrix(matrix, repoRoot)).not.toThrow()
    expect(() => validateFastRedactMigrationMatrix(matrix, resolve(repoRoot, '..'))).toThrow(
      /fixtureDir must point to a committed fixture directory/,
    )
  })

  it('covers the documented direct equivalents, mechanical rewrites, and intentional divergences', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)
    const rows = byId(matrix)

    expect(rows.get('dot-path-structured-output')?.classification).toBe('direct-equivalent')
    expect(rows.get('bracket-quoted-property-path')?.fastRedactConfig).toMatchObject({
      paths: ['headers["X-Forwarded-For"]'],
      serialize: false,
    })
    expect(rows.get('numeric-array-index-path')?.fastRedactConfig).toMatchObject({ paths: ['accounts[0].token'] })
    expect(rows.get('final-wildcard-path')?.fastRedactConfig).toMatchObject({ paths: ['tokens.*'] })
    expect(rows.get('intermediate-wildcard-path')?.fastRedactConfig).toMatchObject({ paths: ['users.*.password'] })
    expect(rows.get('leading-bracket-property-path')?.fastRedactConfig).toMatchObject({
      paths: ['["session"].token'],
      serialize: false,
    })
    expect(rows.get('literal-string-censor')?.fastRedactConfig).toMatchObject({ censor: '[MASKED]' })
    expect(rows.get('function-censor-helper')?.fastRedactConfig).toMatchObject({
      censor: { helperId: 'lastFourTokenCensor' },
    })

    expect(rows.get('bracket-array-wildcard-rewrite')?.classification).toBe('mechanical-rewrite')
    expect(rows.get('bracket-array-wildcard-rewrite')?.v4Action).toMatchObject({
      config: { paths: ['accounts.*.secret'] },
    })
    expect(rows.get('serialize-false-spelling-rewrite')?.v4Action).toMatchObject({
      config: { serialise: false },
    })
    expect(rows.get('default-json-output-serialise-true')?.v4Action).toMatchObject({
      config: { serialise: true },
    })
    expect(rows.get('custom-serialize-function-rewrite')?.v4Action).toMatchObject({
      config: { serialise: { helperId: 'stableEnvelopeSerialiser' } },
    })
    expect(rows.get('remove-true-rewrite')?.v4Action).toMatchObject({
      config: { remove: true, serialise: true },
    })

    expect(rows.get('no-restore-api')?.classification).toBe('intentional-divergence')
    expect(rows.get('no-strict-option')?.v4Action).toMatchObject({
      fastRedactBehaviour: expect.stringContaining('returns the primitive input unchanged'),
      unsupportedOption: 'strict',
    })
    expect(rows.get('omitted-serialise-structured-output')?.v4Action).toMatchObject({
      config: { paths: ['user.password'] },
    })
    expect(rows.get('non-string-censor-value')?.v4Action).toMatchObject({ unsupportedOption: 'censor' })
  })

  it('executes every admitted row against committed fixtures without dumping sensitive values on failure', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)

    expect(
      verifyFastRedactMigrationMatrix({ matrix, repositoryRoot: repoRoot, redactorFactory: deepRedact }).map(
        (row) => row.id,
      ),
    ).toStrictEqual(expectedRowIds)

    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'deep-redact-migration-'))

    try {
      cpSync(resolve(repoRoot, 'test'), resolve(temporaryRoot, 'test'), { recursive: true })
      writeFileSync(
        resolve(
          temporaryRoot,
          'test/migration/fast-redact/fixtures/omitted-serialise-structured-output/divergence.json',
        ),
        `${JSON.stringify({
          fastRedactBehaviour: 'fast-redact returns a JSON string when `serialize` is omitted.',
          v4Behaviour: 'Deep Redact v4 returns structured output when `serialise` is omitted.',
          migrationAction: 'Set `serialise: true` in Deep Redact v4 if the old call depended on the fast-redact default JSON string. Leave `serialise` omitted only when the migrated caller wants structured output.',
          reason: 'The default output type intentionally differs.',
        }, null, 2)}\n`,
      )

      expect(() =>
        verifyFastRedactMigrationMatrix({
          matrix,
          repositoryRoot: temporaryRoot,
          redactorFactory: deepRedact,
        })).toThrow(/omitted-serialise-structured-output.*expectedV4/)
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true })
    }

    const brokenMatrix = structuredClone(matrix) as FastRedactMigrationMatrix
    brokenMatrix.rows[0].expectedResult.file = 'missing.json'

    expect(() =>
      verifyFastRedactMigrationMatrix({
        matrix: brokenMatrix,
        repositoryRoot: repoRoot,
        redactorFactory: deepRedact,
      })).toThrow(/dot-path-structured-output.*direct-equivalent.*same-structured-output.*fixture/)
  })

  it('keeps the generated migration guide locked to the canonical manifest and fixtures', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)
    const renderedGuide = renderFastRedactMigrationGuide(matrix, repoRoot)

    expect(generatedFilePaths.fastRedactMigrationGuidePath).toBe(resolve(repoRoot, guidePath))
    expect(buildGeneratedFastRedactMigrationGuide()).toBe(renderedGuide)
    expect(readRepositoryFile(guidePath)).toBe(renderedGuide)
    expect(renderedGuide).toContain('This file is generated. Do not edit it by hand.')
    expect(renderedGuide).toContain('`serialize` to `serialise`')
    expect(renderedGuide).toContain('`restore` is unsupported')
    expect(renderedGuide).toContain('`strict` is unsupported')
    expect(renderedGuide).toContain('omitted `serialise` returns structured output')
    expect(renderedGuide).toContain('"censor": "[Function fixture helper: lastFourTokenCensor]"')
    expect(renderedGuide).not.toContain('"helperId": "lastFourTokenCensor"')
    expect(renderedGuide).toContain('Notes: Dot-path targeting migrates unchanged')
    expect(renderedGuide).toContain('\n\n### bracket-quoted-property-path')
  })

  it('keeps direct-equivalent migration steps focused on unchanged selectors or censors', () => {
    const matrix = loadFastRedactMigrationMatrix(repoRoot)

    for (const row of matrix.rows.filter((candidate) => candidate.classification === 'direct-equivalent')) {
      expect(row.v4Action.migrationSteps.join('\n')).not.toMatch(/seriali[sz]e/i)
    }
  })

  it('exposes the migration verifier through package scripts without widening the runtime API', () => {
    const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
      scripts: Record<string, string>;
      dependencies?: Record<string, string>;
    }

    expect(packageJson.scripts.generate).toContain('generate-fast-redact-migration-doc')
    expect(packageJson.scripts['verify:migration:fast-redact']).toBe(
      'pnpm run build && node --experimental-strip-types ./scripts/verify-fast-redact-migration.ts',
    )
    expect(packageJson.scripts['verify-generated-files']).toBe(
      'node --experimental-strip-types ./scripts/verify-generated-files.ts',
    )
    expect(packageJson.dependencies).toBeUndefined()
  })

  it('proves unsupported compatibility aliases and restore-like methods stay outside v4', () => {
    expect(() => deepRedact({ paths: ['user.password'], serialize: true } as never)).toThrow(/serialize/)
    expect(() => deepRedact({ paths: ['user.password'], strict: false } as never)).toThrow(/strict/)

    const redactor = deepRedact({ paths: ['user.password'] }) as unknown as {
      restore?: unknown;
      unredact?: unknown;
      unredactValue?: unknown;
    }

    expect(redactor.restore).toBeUndefined()
    expect(redactor.unredact).toBeUndefined()
    expect(redactor.unredactValue).toBeUndefined()
  })
})
