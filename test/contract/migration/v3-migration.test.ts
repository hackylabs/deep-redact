import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { posix, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deepRedact } from '../../../src/index.js'
import {
  buildGeneratedV3MigrationGuide,
  generatedFilePaths,
} from '../../../scripts/generated-files.ts'
import {
  loadV3MigrationMatrix,
  KNOWN_V4_OPTIONS,
  renderV3MigrationGuide,
  validateV3MigrationMatrix,
  verifyV3MigrationMatrix,
  type V3MigrationMatrix,
} from '../../../scripts/v3-migration.ts'
import type { DeepRedactOptions } from '../../../src/index.js'

type _KnownV4Option = typeof KNOWN_V4_OPTIONS extends Set<infer K> ? K : never
// Compile-time guard: fails if any DeepRedactOptions key is absent from KNOWN_V4_OPTIONS
const _knownV4OptionsCoverage: [Exclude<keyof DeepRedactOptions, _KnownV4Option>] extends [never]
  ? true
  : 'KNOWN_V4_OPTIONS in v3-migration.ts is missing one or more DeepRedactOptions keys — update the set' = true
void _knownV4OptionsCoverage

const repoRoot = process.cwd()
const matrixPath = 'test/migration/v3/matrix.json'
const fixtureRoot = 'test/migration/v3/fixtures'
const guidePath = 'docs/migration/from-v3.md'

const rowKeys = [
  'id',
  'fixtureDir',
  'v3Usage',
  'v4Usage',
  'migrationSteps',
  'assertionMode',
  'expectedResult',
]

const expectedRowIds = [
  'class-instantiation-to-factory',
  'invocation-pattern-change',
  'blacklisted-keys-rename',
  'regex-key-rule-overrides',
  'replacement-string-rename',
  'replacement-function-rename',
  'unchanged-options',
  'value-type-allowlist-carryover',
  'serialise-option-carryover',
  'remove-option-carryover',
  'combined-migration',
  'v3-unsupported-option',
]

const readRepositoryFile = (filePath: string): string => readFileSync(resolve(repoRoot, filePath), 'utf8')

const expectRepositoryPath = (candidatePath: string, expectedPrefix: string): void => {
  expect(posix.isAbsolute(candidatePath)).toBe(false)
  expect(candidatePath).not.toContain('\\')
  expect(candidatePath).not.toMatch(/(^|\/)\.\.(\/|$)/)
  expect(posix.normalize(candidatePath)).toBe(candidatePath)
  expect(candidatePath === expectedPrefix || candidatePath.startsWith(`${expectedPrefix}/`)).toBe(true)

  const resolvedPath = resolve(repoRoot, candidatePath)
  expect(relative(repoRoot, resolvedPath)).not.toMatch(/^\.\.(?:\/|\\|$)/)
}

const byId = (matrix: V3MigrationMatrix): Map<string, V3MigrationMatrix['rows'][number]> => {
  return new Map(matrix.rows.map((row) => [row.id, row]))
}

describe('v3 migration matrix contract', () => {
  it('defines the single canonical migration manifest with the admitted rows in order', () => {
    expect(existsSync(resolve(repoRoot, matrixPath))).toBe(true)
    expectRepositoryPath(matrixPath, 'test/migration/v3')
    expect(readdirSync(resolve(repoRoot, 'test/migration/v3')).filter((entry) => entry.endsWith('.json'))).toStrictEqual([
      'matrix.json',
    ])

    const matrix = loadV3MigrationMatrix(repoRoot)

    expect(matrix.schemaVersion).toBe(1)
    expect(matrix.rows.map((row) => row.id)).toStrictEqual(expectedRowIds)
  })

  it('validates a strict row shape, assertion modes, and fixture confinement', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)

    expect(() => validateV3MigrationMatrix(matrix, repoRoot)).not.toThrow()

    for (const row of matrix.rows) {
      expect(Object.keys(row)).toStrictEqual(rowKeys)
      expect(['v4-structured-output', 'v4-serialised-output', 'v4-initialisation-error']).toContain(row.assertionMode)
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
        expect(row.expectedResult.kind).toBe('initialisation-error')
        expect(row.expectedResult.file).toBe('initialisation-error.json')
      }

      expect(statSync(resolve(repoRoot, row.fixtureDir, row.expectedResult.file)).isFile()).toBe(true)
    }
  })

  it('rejects undeclared assertion modes and fixture paths that escape the migration fixture root', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)

    const invalidModeMatrix = structuredClone(matrix) as V3MigrationMatrix
    invalidModeMatrix.rows[0].assertionMode = 'same-structured-output' as never

    expect(() => validateV3MigrationMatrix(invalidModeMatrix, repoRoot)).toThrow(
      /class-instantiation-to-factory.*assertionMode/,
    )

    const invalidFixtureMatrix = structuredClone(matrix) as V3MigrationMatrix
    invalidFixtureMatrix.rows[0].fixtureDir = 'test/migration/v3/fixtures/class-instantiation-to-factory/../escape'

    expect(() => validateV3MigrationMatrix(invalidFixtureMatrix, repoRoot)).toThrow(
      /class-instantiation-to-factory.*fixtureDir/,
    )
  })

  it('rejects rows missing required v3Usage, v4Usage, and migrationSteps fields', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)

    const missingV3UsageMatrix = structuredClone(matrix) as V3MigrationMatrix
    missingV3UsageMatrix.rows[0].v3Usage.import = ''

    expect(() => validateV3MigrationMatrix(missingV3UsageMatrix, repoRoot)).toThrow(
      /class-instantiation-to-factory.*v3Usage\.import/,
    )

    const missingConfigMatrix = structuredClone(matrix) as V3MigrationMatrix
    missingConfigMatrix.rows[0].v4Usage.config = null as never

    expect(() => validateV3MigrationMatrix(missingConfigMatrix, repoRoot)).toThrow(
      /class-instantiation-to-factory.*v4Usage\.config/,
    )

    const emptyStepsMatrix = structuredClone(matrix) as V3MigrationMatrix
    emptyStepsMatrix.rows[0].migrationSteps = []

    expect(() => validateV3MigrationMatrix(emptyStepsMatrix, repoRoot)).toThrow(
      /class-instantiation-to-factory.*migrationSteps/,
    )
  })

  it('uses the supplied repository root and POSIX manifest metadata for path validation', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)

    expect(matrix.metadata.generatedGuide).toBe('docs/migration/from-v3.md')
    expect(() => validateV3MigrationMatrix(matrix, repoRoot)).not.toThrow()
    expect(() => validateV3MigrationMatrix(matrix, resolve(repoRoot, '..'))).toThrow(
      /fixtureDir must point to a committed fixture directory/,
    )
  })

  it('covers the required v3 migration row categories', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)
    const rows = byId(matrix)

    const classInstantiationRow = rows.get('class-instantiation-to-factory')
    expect(classInstantiationRow?.v3Usage.instantiation).toContain('new DeepRedact')
    expect(classInstantiationRow?.v4Usage.factory).toContain('deepRedact')
    expect(classInstantiationRow?.v4Usage.config).toMatchObject({ keys: expect.any(Array) })

    const invocationRow = rows.get('invocation-pattern-change')
    expect(invocationRow?.v3Usage.invocation).toContain('.redact(')
    expect(invocationRow?.v4Usage.invocation).not.toContain('.redact(')

    const blacklistedKeysRow = rows.get('blacklisted-keys-rename')
    expect(blacklistedKeysRow?.v3Usage.instantiation).toContain('blacklistedKeys')
    expect(blacklistedKeysRow?.v4Usage.config).toHaveProperty('keys')
    expect(blacklistedKeysRow?.v4Usage.config).not.toHaveProperty('blacklistedKeys')

    const replacementStringRow = rows.get('replacement-string-rename')
    expect(replacementStringRow?.v3Usage.instantiation).toContain('replacement')
    expect(replacementStringRow?.v4Usage.config).toHaveProperty('censor')
    expect(replacementStringRow?.v4Usage.config).not.toHaveProperty('replacement')

    const replacementFunctionRow = rows.get('replacement-function-rename')
    expect(replacementFunctionRow?.v4Usage.config).toMatchObject({
      censor: { helperId: 'maskValueType' },
    })

    const unchangedOptionsRow = rows.get('unchanged-options')
    expect(unchangedOptionsRow?.v4Usage.config).toMatchObject({
      retainStructure: true,
      fuzzyKeyMatch: true,
    })

    const serialiseRow = rows.get('serialise-option-carryover')
    expect(serialiseRow?.v4Usage.config).toHaveProperty('serialise')
    expect(serialiseRow?.assertionMode).toBe('v4-serialised-output')

    const removeRow = rows.get('remove-option-carryover')
    expect(removeRow?.v4Usage.config).toMatchObject({ remove: true })

    const combinedRow = rows.get('combined-migration')
    expect(combinedRow?.v4Usage.config).toHaveProperty('keys')
    expect(combinedRow?.v4Usage.config).toHaveProperty('censor')
    expect(combinedRow?.v4Usage.config).not.toHaveProperty('blacklistedKeys')
    expect(combinedRow?.v4Usage.config).not.toHaveProperty('replacement')
  })

  it('executes every admitted row against committed fixtures', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)

    expect(
      verifyV3MigrationMatrix({ matrix, repositoryRoot: repoRoot, redactorFactory: deepRedact }).map(
        (row) => row.id,
      ),
    ).toStrictEqual(expectedRowIds)
  })

  it('reports failures with row id, fixture path, and assertion mode without dumping payload values', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)
    const brokenMatrix = structuredClone(matrix) as V3MigrationMatrix
    brokenMatrix.rows[0].v4Usage.config = { keys: ['password', 'token'], censor: '[MISMATCH]' }

    expect(() =>
      verifyV3MigrationMatrix({
        matrix: brokenMatrix,
        repositoryRoot: repoRoot,
        redactorFactory: deepRedact,
      }),
    ).toThrow(/class-instantiation-to-factory.*v4-structured-output.*v4.*structured output did not match/)
  })

  it('keeps the generated migration guide locked to the canonical manifest and fixtures', () => {
    const matrix = loadV3MigrationMatrix(repoRoot)
    const renderedGuide = renderV3MigrationGuide(matrix, repoRoot)

    expect(generatedFilePaths.v3MigrationGuidePath).toBe(resolve(repoRoot, guidePath))
    expect(buildGeneratedV3MigrationGuide()).toBe(renderedGuide)
    expect(readRepositoryFile(guidePath)).toBe(renderedGuide)
    const structuredCount = matrix.rows.filter((r) => r.assertionMode === 'v4-structured-output').length
    const serialisedCount = matrix.rows.filter((r) => r.assertionMode === 'v4-serialised-output').length
    const initialisationErrorCount = matrix.rows.filter((r) => r.assertionMode === 'v4-initialisation-error').length

    expect(renderedGuide).toContain('This file is generated. Do not edit it by hand.')
    expect(renderedGuide).toContain(`- Structured output rows: ${structuredCount}`)
    expect(renderedGuide).toContain(`- Serialised output rows: ${serialisedCount}`)
    expect(renderedGuide).toContain(`- Initialisation error rows: ${initialisationErrorCount}`)
    expect(renderedGuide).toContain('`blacklistedKeys` to `keys`')
    expect(renderedGuide).toContain('`replacement` to `censor`')
    expect(renderedGuide).toContain('`serialize` (alias)')
    expect(renderedGuide).toContain('[Function fixture helper: maskValueType]')
    expect(renderedGuide).not.toContain('"helperId": "maskValueType"')
  })

  it('exposes the v3 migration verifier through package scripts without widening the runtime API', () => {
    const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
      scripts: Record<string, string>;
      dependencies?: Record<string, string>;
    }

    expect(packageJson.scripts.generate).toContain('generate-v3-migration-doc')
    expect(packageJson.scripts['verify:migration:v3']).toBe(
      'pnpm run build && node --experimental-strip-types ./scripts/verify-v3-migration.ts',
    )
    expect(packageJson.dependencies).toBeUndefined()
  })

  it('KNOWN_V4_OPTIONS contains no keys that v4 treats as unsupported', () => {
    for (const key of KNOWN_V4_OPTIONS) {
      try {
        deepRedact({ [key]: null as never })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        expect(message).not.toMatch(/Unsupported option/)
      }
    }
  })

  it('proves v4 does not silently accept v3-only option names', () => {
    expect(() => deepRedact({ keys: ['password'], blacklistedKeys: ['token'] } as never)).toThrow(/blacklistedKeys/)
    expect(() => deepRedact({ keys: ['password'], replacement: '[REDACTED]' } as never)).toThrow(/replacement/)
    expect(() => deepRedact({ keys: ['password'], serialize: true } as never)).toThrow(/serialize/)
  })
})
