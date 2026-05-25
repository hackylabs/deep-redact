import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path, { posix, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import type { DeepRedactOptions } from '../src/types/public.js'

export type V3MigrationAssertionMode =
  | 'v4-structured-output'
  | 'v4-serialised-output'
  | 'v4-initialisation-error'

export interface V3MigrationExpectedResult {
  kind: 'structured' | 'serialised' | 'initialisation-error';
  file: string;
}

export interface V3Usage {
  import: string;
  instantiation: string;
  invocation: string;
}

export interface V3MigrationV4Usage {
  import: string;
  factory: string;
  invocation: string;
  config: Record<string, unknown>;
  unsupportedOption?: string;
}

export interface V3MigrationRow {
  id: string;
  fixtureDir: string;
  v3Usage: V3Usage;
  v4Usage: V3MigrationV4Usage;
  migrationSteps: string[];
  assertionMode: V3MigrationAssertionMode;
  expectedResult: V3MigrationExpectedResult;
}

export interface V3MigrationMatrix {
  schemaVersion: 1;
  metadata: {
    title: string;
    sourcePackage: string;
    generatedGuide: string;
    fixtureRoot: string;
    helperIds: Record<string, string>;
  };
  rows: V3MigrationRow[];
}

export interface VerifiedV3MigrationRow {
  id: string;
  assertionMode: V3MigrationAssertionMode;
  fixtureDir: string;
}

export interface VerifyV3MigrationMatrixOptions {
  matrix?: V3MigrationMatrix;
  repositoryRoot?: string;
  redactorFactory?: RedactorFactory;
}

type Redactor = (value: unknown) => unknown
type RedactorFactory = (options?: Record<string, unknown>) => Redactor
type VerificationPhase = 'fixture' | 'v4' | 'comparison'

interface HelperReference {
  helperId: string;
}

const require = createRequire(import.meta.url)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..')
const matrixPath = posix.join('test', 'migration', 'v3', 'matrix.json')
const fixtureRoot = 'test/migration/v3/fixtures'
const generatedGuidePath = posix.join('docs', 'migration', 'from-v3.md')

const rowKeys = [
  'id',
  'fixtureDir',
  'v3Usage',
  'v4Usage',
  'migrationSteps',
  'assertionMode',
  'expectedResult',
]

const assertionModeValues = new Set<V3MigrationAssertionMode>([
  'v4-structured-output',
  'v4-serialised-output',
  'v4-initialisation-error',
])

const expectedResultKindValues = new Set<V3MigrationExpectedResult['kind']>([
  'structured',
  'serialised',
  'initialisation-error',
])

const KNOWN_V4_OPTIONS_ARRAY = [
  'caseSensitiveKeyMatch',
  'censor',
  'diagnostics',
  'fuzzyKeyMatch',
  'keys',
  'paths',
  'remove',
  'replaceStringByLength',
  'retainStructure',
  'ignoredValueTypes',
  'serialise',
  'stringTests',
  'transformers',
] as const satisfies ReadonlyArray<keyof DeepRedactOptions>

export const KNOWN_V4_OPTIONS = new Set<string>(KNOWN_V4_OPTIONS_ARRAY)

export const helperImplementations: Record<string, (value: unknown) => unknown> = {
  maskValueType: (value: unknown): string => `[masked-${typeof value}]`,
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const isHelperReference = (value: unknown): value is HelperReference => {
  return isRecord(value)
    && Object.keys(value).length === 1
    && typeof value.helperId === 'string'
    && value.helperId.length > 0
}

const materialiseHelperConfig = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => materialiseHelperConfig(entry))
  }

  if (isHelperReference(value)) {
    const helper = helperImplementations[value.helperId]

    if (helper === undefined) {
      throw new Error(`Unknown v3 migration helper ID: ${value.helperId}`)
    }

    return helper
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, materialiseHelperConfig(entry)]),
    )
  }

  return value
}

const materialiseConfig = (config: Record<string, unknown>): Record<string, unknown> => {
  return materialiseHelperConfig(config) as Record<string, unknown>
}

const readJsonFile = <T>(filePath: string): T => {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

const readFixtureJson = <T>(
  repositoryRoot: string,
  row: V3MigrationRow,
  fileName: string,
): T => {
  const fixturePath = path.join(repositoryRoot, row.fixtureDir, fileName)

  try {
    return readJsonFile<T>(fixturePath)
  } catch (error) {
    throw new Error(
      `Row "${row.id}": failed to parse ${fixturePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

const readFixtureText = (
  repositoryRoot: string,
  row: V3MigrationRow,
  fileName: string,
): string => {
  return readFileSync(path.join(repositoryRoot, row.fixtureDir, fileName), 'utf8')
    .replaceAll(/\r\n|\r/g, '\n')
    .replace(/\n$/, '')
}

export class V3MigrationVerificationError extends Error {
  rowId: string
  assertionMode: V3MigrationAssertionMode
  phase: VerificationPhase
  fixtureDir: string

  constructor({
    row,
    phase,
    message,
  }: {
    row: V3MigrationRow;
    phase: VerificationPhase;
    message: string;
  }) {
    super(
      `v3 migration row ${row.id} (${row.assertionMode}) failed during ${phase} for fixture ${row.fixtureDir}: ${message}`,
    )
    this.name = 'V3MigrationVerificationError'
    this.rowId = row.id
    this.assertionMode = row.assertionMode
    this.phase = phase
    this.fixtureDir = row.fixtureDir
  }
}

const fail = (
  row: V3MigrationRow,
  phase: VerificationPhase,
  message: string,
): never => {
  throw new V3MigrationVerificationError({ row, phase, message })
}

const expectRepositoryPath = (
  repositoryRoot: string,
  candidatePath: string,
  expectedPrefix: string,
  row: V3MigrationRow,
  fieldName: string,
): void => {
  if (
    posix.isAbsolute(candidatePath)
    || candidatePath.includes('\\')
    || /(^|\/)\.\.(\/|$)/.test(candidatePath)
    || posix.normalize(candidatePath) !== candidatePath
    || (candidatePath !== expectedPrefix && !candidatePath.startsWith(`${expectedPrefix}/`))
  ) {
    fail(row, 'fixture', `${fieldName} must be a normalised repository-relative path inside ${expectedPrefix}`)
  }

  const resolvedPath = path.resolve(repositoryRoot, candidatePath)

  if (/^\.\.(?:\/|\\|$)/.test(relative(repositoryRoot, resolvedPath))) {
    fail(row, 'fixture', `${fieldName} must stay inside the repository`)
  }
}

const assertFile = (repositoryRoot: string, row: V3MigrationRow, fileName: string): void => {
  const filePath = path.join(repositoryRoot, row.fixtureDir, fileName)

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    fail(row, 'fixture', `expected fixture file ${fileName} is missing`)
  }
}

const assertStringArray = (
  value: unknown,
  row: V3MigrationRow,
  fieldName: string,
): value is string[] => {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)
  ) {
    fail(row, 'fixture', `${fieldName} must be a non-empty array of non-empty strings`)
  }

  return true
}

export const loadV3MigrationMatrix = (
  repositoryRoot = defaultRepositoryRoot,
): V3MigrationMatrix => {
  return readJsonFile<V3MigrationMatrix>(path.join(repositoryRoot, matrixPath))
}

export const validateV3MigrationMatrix = (
  matrix: V3MigrationMatrix,
  repositoryRoot = defaultRepositoryRoot,
): void => {
  if (!isRecord(matrix) || matrix.schemaVersion !== 1 || !Array.isArray(matrix.rows) || !isRecord(matrix.metadata)) {
    throw new Error('v3 migration matrix must use schemaVersion 1 with metadata and rows')
  }

  if (matrix.metadata.fixtureRoot !== fixtureRoot) {
    throw new Error(`v3 migration matrix metadata.fixtureRoot must be ${fixtureRoot}`)
  }

  if (matrix.metadata.generatedGuide !== generatedGuidePath) {
    throw new Error(`v3 migration matrix metadata.generatedGuide must be ${generatedGuidePath}`)
  }

  const seenIds = new Set<string>()

  for (const row of matrix.rows) {
    if (!isRecord(row)) {
      throw new Error('v3 migration matrix rows must be objects')
    }

    const candidateRow = row as V3MigrationRow

    if (Object.keys(candidateRow).join('\n') !== rowKeys.join('\n')) {
      const actualKeys = Object.keys(candidateRow).join(', ')
      const expectedKeys = rowKeys.join(', ')
      fail(candidateRow, 'fixture', `row keys must be [${expectedKeys}] but got [${actualKeys}]`)
    }

    if (typeof candidateRow.id !== 'string' || candidateRow.id.length === 0) {
      fail(candidateRow, 'fixture', 'id must be a non-empty string')
    }

    if (seenIds.has(candidateRow.id)) {
      fail(candidateRow, 'fixture', 'id must be unique')
    }

    seenIds.add(candidateRow.id)

    if (!assertionModeValues.has(candidateRow.assertionMode)) {
      fail(candidateRow, 'fixture', 'assertionMode is not a declared enum value')
    }

    if (
      candidateRow.assertionMode === 'v4-initialisation-error'
      && (typeof candidateRow.v4Usage.unsupportedOption !== 'string'
        || candidateRow.v4Usage.unsupportedOption.trim().length === 0)
    ) {
      fail(candidateRow, 'fixture', 'v4Usage.unsupportedOption must be a non-empty string for v4-initialisation-error rows')
    }

    if (!isRecord(candidateRow.v3Usage)) {
      fail(candidateRow, 'fixture', 'v3Usage must be an object')
    }

    for (const fieldName of ['import', 'instantiation', 'invocation'] as const) {
      if (typeof candidateRow.v3Usage[fieldName] !== 'string' || candidateRow.v3Usage[fieldName].length === 0) {
        fail(candidateRow, 'fixture', `v3Usage.${fieldName} must be a non-empty string`)
      }
    }

if (!isRecord(candidateRow.v4Usage)) {
      fail(candidateRow, 'fixture', 'v4Usage must be an object')
    }

    for (const fieldName of ['import', 'factory', 'invocation'] as const) {
      if (typeof candidateRow.v4Usage[fieldName] !== 'string' || candidateRow.v4Usage[fieldName].length === 0) {
        fail(candidateRow, 'fixture', `v4Usage.${fieldName} must be a non-empty string`)
      }
    }

    if (!isRecord(candidateRow.v4Usage.config)) {
      fail(candidateRow, 'fixture', 'v4Usage.config must be an object')
    }

    if (candidateRow.assertionMode !== 'v4-initialisation-error') {
      for (const key of Object.keys(candidateRow.v4Usage.config)) {
        if (!KNOWN_V4_OPTIONS.has(key)) {
          fail(candidateRow, 'fixture', `v4Usage.config contains unknown v4 option key "${key}"`)
        }
      }
    }

    assertStringArray(candidateRow.migrationSteps, candidateRow, 'migrationSteps')

    if (!isRecord(candidateRow.expectedResult)) {
      fail(candidateRow, 'fixture', 'expectedResult must be an object')
    }

    if (!expectedResultKindValues.has(candidateRow.expectedResult.kind)) {
      fail(candidateRow, 'fixture', 'expectedResult.kind is not declared')
    }

    if (
      typeof candidateRow.expectedResult.file !== 'string'
      || candidateRow.expectedResult.file.length === 0
      || candidateRow.expectedResult.file.includes('/')
      || candidateRow.expectedResult.file.includes('\\')
      || candidateRow.expectedResult.file !== posix.basename(candidateRow.expectedResult.file)
    ) {
      fail(candidateRow, 'fixture', 'expectedResult.file must be a fixture filename')
    }

    if (candidateRow.expectedResult.kind === 'structured' && candidateRow.expectedResult.file !== 'expected-v4.json') {
      fail(candidateRow, 'fixture', 'structured rows must use expected-v4.json')
    }

    if (candidateRow.expectedResult.kind === 'serialised' && candidateRow.expectedResult.file !== 'expected-v4.txt') {
      fail(candidateRow, 'fixture', 'serialised rows must use expected-v4.txt')
    }

    if (candidateRow.expectedResult.kind === 'initialisation-error' && candidateRow.expectedResult.file !== 'initialisation-error.json') {
      fail(candidateRow, 'fixture', 'initialisation-error rows must use initialisation-error.json')
    }

    const expectedFixtureDir = `${fixtureRoot}/${candidateRow.id}`

    expectRepositoryPath(repositoryRoot, candidateRow.fixtureDir, expectedFixtureDir, candidateRow, 'fixtureDir')

    if (candidateRow.fixtureDir !== expectedFixtureDir) {
      fail(candidateRow, 'fixture', `fixtureDir must be ${expectedFixtureDir}`)
    }

    const fixtureDirectory = path.join(repositoryRoot, candidateRow.fixtureDir)

    if (!existsSync(fixtureDirectory) || !statSync(fixtureDirectory).isDirectory()) {
      fail(candidateRow, 'fixture', 'fixtureDir must point to a committed fixture directory')
    }

    assertFile(repositoryRoot, candidateRow, 'input.json')
    assertFile(repositoryRoot, candidateRow, 'notes.md')
    assertFile(repositoryRoot, candidateRow, candidateRow.expectedResult.file)
  }
}

const loadBuiltRedactorFactory = (repositoryRoot: string): RedactorFactory => {
  const builtModule = require(path.join(repositoryRoot, 'dist', 'index.cjs')) as {
    deepRedact?: RedactorFactory;
  }

  if (typeof builtModule.deepRedact !== 'function') {
    throw new TypeError('Built Deep Redact package must export deepRedact before migration verification can run')
  }

  return builtModule.deepRedact
}

const cloneFixturePayload = (value: unknown): unknown => structuredClone(value)

const assertStructuredEqual = (
  actual: unknown,
  expected: unknown,
  row: V3MigrationRow,
  phase: VerificationPhase,
): void => {
  if (!isDeepStrictEqual(actual, expected)) {
    fail(row, phase, 'structured output did not match the committed expected result')
  }
}

const assertSerialisedEqual = (
  actual: unknown,
  expected: string,
  row: V3MigrationRow,
  phase: VerificationPhase,
): void => {
  if (actual !== expected) {
    fail(row, phase, 'serialised output did not match the committed expected result')
  }
}

const verifyStructuredOutputRow = ({
  row,
  repositoryRoot,
  redactorFactory,
}: {
  row: V3MigrationRow;
  repositoryRoot: string;
  redactorFactory: RedactorFactory;
}): void => {
  const input = readFixtureJson<unknown>(repositoryRoot, row, 'input.json')
  const v4Config = materialiseConfig(row.v4Usage.config)
  const redactor = redactorFactory(v4Config)
  const output = redactor(cloneFixturePayload(input))
  const expected = readFixtureJson<unknown>(repositoryRoot, row, row.expectedResult.file)

  assertStructuredEqual(output, expected, row, 'v4')
}

const verifySerialisedOutputRow = ({
  row,
  repositoryRoot,
  redactorFactory,
}: {
  row: V3MigrationRow;
  repositoryRoot: string;
  redactorFactory: RedactorFactory;
}): void => {
  const input = readFixtureJson<unknown>(repositoryRoot, row, 'input.json')
  const v4Config = materialiseConfig(row.v4Usage.config)
  const redactor = redactorFactory(v4Config)
  const output = redactor(cloneFixturePayload(input))
  const expected = readFixtureText(repositoryRoot, row, row.expectedResult.file)

  assertSerialisedEqual(output, expected, row, 'v4')
}

const verifyInitialisationErrorRow = ({
  row,
  repositoryRoot,
  redactorFactory,
}: {
  row: V3MigrationRow;
  repositoryRoot: string;
  redactorFactory: RedactorFactory;
}): void => {
  const fixtureData = readFixtureJson<{ expectedErrorFragment?: string }>(
    repositoryRoot,
    row,
    row.expectedResult.file,
  )
  const v4Config = materialiseConfig(row.v4Usage.config)

  try {
    redactorFactory(v4Config)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (
      row.v4Usage.unsupportedOption !== undefined
      && !message.includes(row.v4Usage.unsupportedOption)
    ) {
      fail(row, 'v4', `initialisation error did not identify ${row.v4Usage.unsupportedOption}`)
    }

    if (
      fixtureData.expectedErrorFragment !== undefined
      && !message.includes(fixtureData.expectedErrorFragment)
    ) {
      fail(row, 'v4', `initialisation error message did not include expected fragment "${fixtureData.expectedErrorFragment}"`)
    }

    return
  }

  fail(row, 'v4', 'expected Deep Redact v4 initialisation to reject the unsupported configuration')
}

export const verifyV3MigrationMatrix = ({
  matrix = loadV3MigrationMatrix(defaultRepositoryRoot),
  repositoryRoot = defaultRepositoryRoot,
  redactorFactory = loadBuiltRedactorFactory(repositoryRoot),
}: VerifyV3MigrationMatrixOptions = {}): VerifiedV3MigrationRow[] => {
  validateV3MigrationMatrix(matrix, repositoryRoot)

  for (const row of matrix.rows) {
    try {
      switch (row.assertionMode) {
        case 'v4-structured-output': {
          verifyStructuredOutputRow({ row, repositoryRoot, redactorFactory })
          break
        }

        case 'v4-serialised-output': {
          verifySerialisedOutputRow({ row, repositoryRoot, redactorFactory })
          break
        }

        case 'v4-initialisation-error': {
          verifyInitialisationErrorRow({ row, repositoryRoot, redactorFactory })
          break
        }
      }
    } catch (error) {
      if (error instanceof V3MigrationVerificationError) {
        throw error
      }

      fail(row, 'comparison', error instanceof Error ? error.message : String(error))
    }
  }

  return matrix.rows.map((row) => ({
    id: row.id,
    assertionMode: row.assertionMode,
    fixtureDir: row.fixtureDir,
  }))
}

const renderJsonBlock = (value: unknown): string => {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
}

const renderFixtureHelperReferences = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => renderFixtureHelperReferences(entry))
  }

  if (isHelperReference(value)) {
    return `[Function fixture helper: ${value.helperId}]`
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, renderFixtureHelperReferences(entry)]),
    )
  }

  return value
}

const renderTextBlock = (value: string): string => {
  return `\`\`\`text\n${value}\n\`\`\``
}

const renderExpectedResult = (
  repositoryRoot: string,
  row: V3MigrationRow,
): string => {
  if (row.expectedResult.kind === 'structured' || row.expectedResult.kind === 'initialisation-error') {
    return renderJsonBlock(readFixtureJson<unknown>(repositoryRoot, row, row.expectedResult.file))
  }

  return renderTextBlock(readFixtureText(repositoryRoot, row, row.expectedResult.file))
}

const renderRow = (
  repositoryRoot: string,
  row: V3MigrationRow,
): string => {
  const notes = readFixtureText(repositoryRoot, row, 'notes.md')
  const migrationSteps = row.migrationSteps.map((step) => `- ${step}`).join('\n')

  return [
    `### ${row.id}`,
    '',
    `Assertion mode: \`${row.assertionMode}\``,
    '',
    `Fixture directory: \`${row.fixtureDir}\``,
    '',
    'v3 usage:',
    '',
    renderJsonBlock(row.v3Usage),
    '',
    'v4 usage:',
    '',
    renderJsonBlock(renderFixtureHelperReferences(row.v4Usage)),
    '',
    'Expected result:',
    '',
    renderExpectedResult(repositoryRoot, row),
    '',
    'Migration steps:',
    '',
    migrationSteps,
    '',
    `Notes: ${notes}`,
    '',
  ].join('\n')
}

export const renderV3MigrationGuide = (
  matrix: V3MigrationMatrix,
  repositoryRoot = defaultRepositoryRoot,
): string => {
  validateV3MigrationMatrix(matrix, repositoryRoot)

  const tableRows = matrix.rows.map((row) =>
    `| \`${row.id}\` | \`${row.assertionMode}\` |`)

  const structuredCount = matrix.rows.filter((row) => row.assertionMode === 'v4-structured-output').length
  const serialisedCount = matrix.rows.filter((row) => row.assertionMode === 'v4-serialised-output').length
  const initialisationErrorCount = matrix.rows.filter((row) => row.assertionMode === 'v4-initialisation-error').length

  return [
    '<!-- This file is generated by scripts/generate-v3-migration-doc.ts. This file is generated. Do not edit it by hand. -->',
    '',
    '# Migrating From Deep Redact v3',
    '',
    'This guide is generated from `test/migration/v3/matrix.json` and the fixture directories under `test/migration/v3/fixtures/`. The same manifest and fixtures drive verification, so documentation drift fails the generated-file checks.',
    '',
    'Deep Redact v4 replaces the class-based v3 API with a function-first design. The key changes are: replace `new DeepRedact(options)` with `deepRedact(options)`, replace `redactor.redact(payload)` with the directly callable `redactor(payload)`, rename `blacklistedKeys` to `keys`, and rename `replacement` to `censor`. All other options carry over with the same names and semantics.',
    '',
    'This guide covers the Deep Redact v3-to-v4 migration only. The `fast-redact` migration, worked examples, benchmark evidence, and platform-adoption guidance are documented separately.',
    '',
    '## Summary',
    '',
    `- Source package: \`${matrix.metadata.sourcePackage}\``,
    `- Canonical manifest: \`${matrixPath}\``,
    `- Fixture root: \`${matrix.metadata.fixtureRoot}\``,
    `- Structured output rows: ${structuredCount}`,
    `- Serialised output rows: ${serialisedCount}`,
    `- Initialisation error rows: ${initialisationErrorCount}`,
    '',
    '## Key Changes',
    '',
    '| v3 | v4 |',
    '| --- | --- |',
    '| `new DeepRedact(options)` | `deepRedact(options)` |',
    '| `redactor.redact(payload)` | `redactor(payload)` |',
    '| `blacklistedKeys` | `keys` |',
    '| `replacement` | `censor` |',
    '| `serialize` (alias) | `serialise` |',
    '',
    '## Options That Carry Over Unchanged',
    '',
    '`serialise`, `retainStructure`, `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, `replaceStringByLength`, `remove`',
    '',
    '## Matrix',
    '',
    '| Row | Assertion mode |',
    '| --- | --- |',
    ...tableRows,
    '',
    '## Rows',
    '',
    ...matrix.rows.map((row) => renderRow(repositoryRoot, row)),
  ].join('\n')
}
