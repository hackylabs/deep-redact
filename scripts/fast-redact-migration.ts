import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path, { posix, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

export type FastRedactMigrationClassification =
  | 'direct-equivalent'
  | 'mechanical-rewrite'
  | 'intentional-divergence'

export type FastRedactMigrationAssertionMode =
  | 'same-structured-output'
  | 'same-serialised-output'
  | 'v4-structured-output'
  | 'v4-serialised-output'
  | 'documented-divergence'
  | 'v4-initialisation-error'

export interface FastRedactMigrationExpectedResult {
  kind: 'structured' | 'serialised' | 'divergence';
  file: string;
}

export interface FastRedactMigrationAction {
  kind: 'deep-redact-config' | 'documented-divergence' | 'unsupported-v4-config';
  config?: Record<string, unknown>;
  unsupportedOption?: string;
  migrationSteps: string[];
  fastRedactBehaviour: string;
  v4Behaviour: string;
  reason: string;
}

export interface FastRedactMigrationRow {
  id: string;
  classification: FastRedactMigrationClassification;
  fixtureDir: string;
  fastRedactConfig: Record<string, unknown>;
  v4Action: FastRedactMigrationAction;
  assertionMode: FastRedactMigrationAssertionMode;
  expectedResult: FastRedactMigrationExpectedResult;
}

export interface FastRedactMigrationMatrix {
  schemaVersion: 1;
  metadata: {
    title: string;
    sourcePackage: string;
    generatedGuide: string;
    fixtureRoot: string;
    helperIds: Record<string, string>;
  };
  rows: FastRedactMigrationRow[];
}

export interface VerifiedFastRedactMigrationRow {
  id: string;
  classification: FastRedactMigrationClassification;
  assertionMode: FastRedactMigrationAssertionMode;
  fixtureDir: string;
}

export interface VerifyFastRedactMigrationMatrixOptions {
  matrix?: FastRedactMigrationMatrix;
  repositoryRoot?: string;
  redactorFactory?: RedactorFactory;
}

type Redactor = ((value: unknown) => unknown) & {
  readonly restore?: unknown;
  readonly unredact?: unknown;
  readonly unredactValue?: unknown;
}
type RedactorFactory = (options?: Record<string, unknown>) => Redactor
type FastRedactFactory = (options: Record<string, unknown>) => Redactor
type VerificationPhase = 'fixture' | 'fast-redact' | 'v4' | 'comparison' | 'documentation'

interface HelperReference {
  helperId: string;
}

interface DivergenceArtefact {
  fastRedactBehaviour: string;
  v4Behaviour: string;
  migrationAction: string;
  reason: string;
  expectedV4?: unknown;
}

export class FastRedactMigrationVerificationError extends Error {
  rowId: string
  classification: FastRedactMigrationClassification
  assertionMode: FastRedactMigrationAssertionMode
  phase: VerificationPhase
  fixtureDir: string

  constructor({
    row,
    phase,
    message,
  }: {
    row: FastRedactMigrationRow;
    phase: VerificationPhase;
    message: string;
  }) {
    super(
      `fast-redact migration row ${row.id} (${row.classification}, ${row.assertionMode}) failed during ${phase} for fixture ${row.fixtureDir}: ${message}`,
    )
    this.name = 'FastRedactMigrationVerificationError'
    this.rowId = row.id
    this.classification = row.classification
    this.assertionMode = row.assertionMode
    this.phase = phase
    this.fixtureDir = row.fixtureDir
  }
}

const require = createRequire(import.meta.url)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..')
const matrixPath = posix.join('test', 'migration', 'fast-redact', 'matrix.json')
const fixtureRoot = 'test/migration/fast-redact/fixtures'
const generatedGuidePath = posix.join('docs', 'migration', 'from-fast-redact.md')
const rowKeys = [
  'id',
  'classification',
  'fixtureDir',
  'fastRedactConfig',
  'v4Action',
  'assertionMode',
  'expectedResult',
]

const classificationValues = new Set<FastRedactMigrationClassification>([
  'direct-equivalent',
  'mechanical-rewrite',
  'intentional-divergence',
])

const actionKindValues = new Set<FastRedactMigrationAction['kind']>([
  'deep-redact-config',
  'documented-divergence',
  'unsupported-v4-config',
])

const expectedResultKindValues = new Set<FastRedactMigrationExpectedResult['kind']>([
  'structured',
  'serialised',
  'divergence',
])

export const assertionModesByClassification = {
  'direct-equivalent': ['same-structured-output', 'same-serialised-output'],
  'mechanical-rewrite': [
    'same-structured-output',
    'same-serialised-output',
    'v4-structured-output',
    'v4-serialised-output',
  ],
  'intentional-divergence': ['documented-divergence', 'v4-initialisation-error'],
} as const satisfies Record<FastRedactMigrationClassification, readonly FastRedactMigrationAssertionMode[]>

const helperImplementations = {
  lastFourTokenCensor: (value: unknown): string => `last:${String(value).slice(-4)}`,
  stableEnvelopeSerialiser: (value: unknown): string => `stable:${JSON.stringify(value)}`,
} satisfies Record<string, (value: unknown) => string>

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const isHelperReference = (value: unknown): value is HelperReference => {
  return isRecord(value)
    && Object.keys(value).length === 1
    && typeof value.helperId === 'string'
}

const materialiseHelperConfig = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => materialiseHelperConfig(entry))
  }

  if (isHelperReference(value)) {
    const helper = helperImplementations[value.helperId as keyof typeof helperImplementations]

    if (helper === undefined) {
      throw new Error(`Unknown fast-redact migration helper ID ${value.helperId}`)
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
  row: FastRedactMigrationRow,
  fileName: string,
): T => {
  return readJsonFile<T>(path.join(repositoryRoot, row.fixtureDir, fileName))
}

const readFixtureText = (
  repositoryRoot: string,
  row: FastRedactMigrationRow,
  fileName: string,
): string => {
  return readFileSync(path.join(repositoryRoot, row.fixtureDir, fileName), 'utf8').replace(/\r?\n$/, '')
}

const fail = (
  row: FastRedactMigrationRow,
  phase: VerificationPhase,
  message: string,
): never => {
  throw new FastRedactMigrationVerificationError({ row, phase, message })
}

const expectRepositoryPath = (
  repositoryRoot: string,
  candidatePath: string,
  expectedPrefix: string,
  row: FastRedactMigrationRow,
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

const assertFile = (repositoryRoot: string, row: FastRedactMigrationRow, fileName: string): void => {
  const filePath = path.join(repositoryRoot, row.fixtureDir, fileName)

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    fail(row, 'fixture', `expected fixture file ${fileName} is missing`)
  }
}

const assertStringArray = (
  value: unknown,
  row: FastRedactMigrationRow,
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

export const loadFastRedactMigrationMatrix = (
  repositoryRoot = defaultRepositoryRoot,
): FastRedactMigrationMatrix => {
  return readJsonFile<FastRedactMigrationMatrix>(path.join(repositoryRoot, matrixPath))
}

export const validateFastRedactMigrationMatrix = (
  matrix: FastRedactMigrationMatrix,
  repositoryRoot = defaultRepositoryRoot,
): void => {
  if (!isRecord(matrix) || matrix.schemaVersion !== 1 || !Array.isArray(matrix.rows) || !isRecord(matrix.metadata)) {
    throw new Error('fast-redact migration matrix must use schemaVersion 1 with metadata and rows')
  }

  if (matrix.metadata.fixtureRoot !== fixtureRoot) {
    throw new Error(`fast-redact migration matrix metadata.fixtureRoot must be ${fixtureRoot}`)
  }

  if (matrix.metadata.generatedGuide !== generatedGuidePath) {
    throw new Error(`fast-redact migration matrix metadata.generatedGuide must be ${generatedGuidePath}`)
  }

  const seenIds = new Set<string>()

  for (const row of matrix.rows) {
    if (!isRecord(row)) {
      throw new Error('fast-redact migration matrix rows must be objects')
    }

    const candidateRow = row as FastRedactMigrationRow

    if (Object.keys(candidateRow).join('\n') !== rowKeys.join('\n')) {
      fail(candidateRow, 'fixture', `row keys must be exactly ${rowKeys.join(', ')}`)
    }

    if (typeof candidateRow.id !== 'string' || candidateRow.id.length === 0) {
      fail(candidateRow, 'fixture', 'id must be a non-empty string')
    }

    if (seenIds.has(candidateRow.id)) {
      fail(candidateRow, 'fixture', 'id must be unique')
    }

    seenIds.add(candidateRow.id)

    if (!classificationValues.has(candidateRow.classification)) {
      fail(candidateRow, 'fixture', 'classification is not declared')
    }

    const validAssertionModes = assertionModesByClassification[candidateRow.classification] as readonly FastRedactMigrationAssertionMode[]

    if (!validAssertionModes.includes(candidateRow.assertionMode)) {
      fail(candidateRow, 'fixture', 'assertionMode is not valid for this classification')
    }

    if (!isRecord(candidateRow.fastRedactConfig)) {
      fail(candidateRow, 'fixture', 'fastRedactConfig must be an object')
    }

    if (!isRecord(candidateRow.v4Action) || !isRecord(candidateRow.v4Action.config ?? {})) {
      fail(candidateRow, 'fixture', 'v4Action.config must be an object when present')
    }

    if (!actionKindValues.has(candidateRow.v4Action.kind)) {
      fail(candidateRow, 'fixture', 'v4Action.kind is not declared')
    }

    if (
      Object.hasOwn(candidateRow.v4Action, 'config')
      && !isRecord(candidateRow.v4Action.config)
    ) {
      fail(candidateRow, 'fixture', 'v4Action.config must be an object when present')
    }

    assertStringArray(candidateRow.v4Action.migrationSteps, candidateRow, 'v4Action.migrationSteps')

    for (const fieldName of ['fastRedactBehaviour', 'v4Behaviour', 'reason'] as const) {
      if (typeof candidateRow.v4Action[fieldName] !== 'string' || candidateRow.v4Action[fieldName].length === 0) {
        fail(candidateRow, 'fixture', `v4Action.${fieldName} must be a non-empty string`)
      }
    }

    if (
      candidateRow.assertionMode === 'v4-initialisation-error'
      && (typeof candidateRow.v4Action.unsupportedOption !== 'string'
        || candidateRow.v4Action.unsupportedOption.trim().length === 0)
    ) {
      fail(candidateRow, 'fixture', 'v4Action.unsupportedOption must be a non-empty string for v4-initialisation-error rows')
    }

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

    if (candidateRow.expectedResult.kind === 'structured' && candidateRow.expectedResult.file !== 'expected-v4.json') {
      fail(candidateRow, 'fixture', 'structured rows must use expected-v4.json')
    }

    if (candidateRow.expectedResult.kind === 'serialised' && candidateRow.expectedResult.file !== 'expected-v4.txt') {
      fail(candidateRow, 'fixture', 'serialised rows must use expected-v4.txt')
    }

    if (candidateRow.expectedResult.kind === 'divergence' && candidateRow.expectedResult.file !== 'divergence.json') {
      fail(candidateRow, 'fixture', 'divergence rows must use divergence.json')
    }

    assertFile(repositoryRoot, candidateRow, candidateRow.expectedResult.file)
  }
}

const loadFastRedact = (): FastRedactFactory => {
  return require('fast-redact') as FastRedactFactory
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
  row: FastRedactMigrationRow,
  phase: VerificationPhase,
): void => {
  if (!isDeepStrictEqual(actual, expected)) {
    fail(row, phase, 'structured output did not match the committed expected result')
  }
}

const assertSerialisedEqual = (
  actual: unknown,
  expected: string,
  row: FastRedactMigrationRow,
  phase: VerificationPhase,
): void => {
  if (actual !== expected) {
    fail(row, phase, 'serialised output did not match the committed expected result')
  }
}

const assertNoRestoreSurface = (redactor: Redactor, row: FastRedactMigrationRow): void => {
  for (const propertyName of ['restore', 'unredact', 'unredactValue'] as const) {
    if (redactor[propertyName] !== undefined) {
      fail(row, 'v4', `Deep Redact v4 redactor unexpectedly exposed ${propertyName}`)
    }
  }
}

const verifyParityRow = ({
  row,
  repositoryRoot,
  fastRedact,
  redactorFactory,
}: {
  row: FastRedactMigrationRow;
  repositoryRoot: string;
  fastRedact: FastRedactFactory;
  redactorFactory: RedactorFactory;
}): void => {
  const input = readFixtureJson<unknown>(repositoryRoot, row, 'input.json')
  const v4Config = materialiseConfig(row.v4Action.config ?? {})
  const fastRedactConfig = materialiseConfig(row.fastRedactConfig)
  const fastRedactRedactor = fastRedact(fastRedactConfig)
  const v4Redactor = redactorFactory(v4Config)
  const fastRedactOutput = fastRedactRedactor(cloneFixturePayload(input))
  const v4Output = v4Redactor(cloneFixturePayload(input))

  if (row.assertionMode === 'same-structured-output' || row.assertionMode === 'v4-structured-output') {
    const expected = readFixtureJson<unknown>(repositoryRoot, row, row.expectedResult.file)

    if (row.assertionMode === 'same-structured-output') {
      assertStructuredEqual(fastRedactOutput, expected, row, 'fast-redact')
      assertStructuredEqual(fastRedactOutput, v4Output, row, 'comparison')
    }

    assertStructuredEqual(v4Output, expected, row, 'v4')
    return
  }

  if (row.assertionMode === 'same-serialised-output' || row.assertionMode === 'v4-serialised-output') {
    const expected = readFixtureText(repositoryRoot, row, row.expectedResult.file)

    if (row.assertionMode === 'same-serialised-output') {
      assertSerialisedEqual(fastRedactOutput, expected, row, 'fast-redact')

      if (fastRedactOutput !== v4Output) {
        fail(row, 'comparison', 'fast-redact and Deep Redact v4 serialised outputs differed')
      }
    }

    assertSerialisedEqual(v4Output, expected, row, 'v4')
  }
}

const assertDivergenceArtefact = (
  artefact: DivergenceArtefact,
  row: FastRedactMigrationRow,
): void => {
  for (const fieldName of ['fastRedactBehaviour', 'v4Behaviour', 'migrationAction', 'reason'] as const) {
    if (typeof artefact[fieldName] !== 'string' || artefact[fieldName].length === 0) {
      fail(row, 'documentation', `divergence artefact must declare ${fieldName}`)
    }
  }

  for (const fieldName of ['fastRedactBehaviour', 'v4Behaviour', 'reason'] as const) {
    if (artefact[fieldName] !== row.v4Action[fieldName]) {
      fail(row, 'documentation', `divergence artefact ${fieldName} must match v4Action.${fieldName}`)
    }
  }

  const expectedMigrationAction = row.v4Action.migrationSteps.join(' ')

  if (artefact.migrationAction !== expectedMigrationAction) {
    fail(row, 'documentation', 'divergence artefact migrationAction must match v4Action.migrationSteps')
  }
}

const verifyDocumentedDivergenceRow = ({
  row,
  repositoryRoot,
  fastRedact,
  redactorFactory,
}: {
  row: FastRedactMigrationRow;
  repositoryRoot: string;
  fastRedact: FastRedactFactory;
  redactorFactory: RedactorFactory;
}): void => {
  const artefact = readFixtureJson<DivergenceArtefact>(repositoryRoot, row, row.expectedResult.file)

  assertDivergenceArtefact(artefact, row)

  const input = readFixtureJson<unknown>(repositoryRoot, row, 'input.json')
  const fastRedactRedactor = fastRedact(materialiseConfig(row.fastRedactConfig))
  const v4Redactor = redactorFactory(materialiseConfig(row.v4Action.config ?? {}))

  if (row.id === 'no-restore-api') {
    if (typeof fastRedactRedactor.restore !== 'function') {
      fail(row, 'fast-redact', 'expected fast-redact to expose restore for the fixture configuration')
    }

    assertNoRestoreSurface(v4Redactor, row)
    return
  }

  if (row.id === 'omitted-serialise-structured-output') {
    if (artefact.expectedV4 === undefined) {
      fail(row, 'documentation', 'omitted serialise divergence artefact must declare expectedV4')
    }

    const fastRedactOutput = fastRedactRedactor(cloneFixturePayload(input))
    const v4Output = v4Redactor(cloneFixturePayload(input))

    if (typeof fastRedactOutput !== 'string') {
      fail(row, 'fast-redact', 'expected omitted serialize to return a JSON string')
    }

    if (typeof v4Output === 'string') {
      fail(row, 'v4', 'expected omitted serialise to return structured output')
    }

    assertStructuredEqual(v4Output, artefact.expectedV4, row, 'v4')
    return
  }

  fail(row, 'documentation', 'documented-divergence rows must have an executable verifier branch')
}

const verifyInitialisationErrorRow = ({
  row,
  repositoryRoot,
  fastRedact,
  redactorFactory,
}: {
  row: FastRedactMigrationRow;
  repositoryRoot: string;
  fastRedact: FastRedactFactory;
  redactorFactory: RedactorFactory;
}): void => {
  const artefact = readFixtureJson<DivergenceArtefact>(repositoryRoot, row, row.expectedResult.file)
  const input = readFixtureJson<unknown>(repositoryRoot, row, 'input.json')

  assertDivergenceArtefact(artefact, row)

  const fastRedactRedactor = fastRedact(materialiseConfig(row.fastRedactConfig))
  fastRedactRedactor(cloneFixturePayload(input))

  try {
    redactorFactory(materialiseConfig(row.v4Action.config ?? {}))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (row.v4Action.unsupportedOption !== undefined && !message.includes(row.v4Action.unsupportedOption)) {
      fail(row, 'v4', `initialisation error did not identify ${row.v4Action.unsupportedOption}`)
    }

    return
  }

  fail(row, 'v4', 'expected Deep Redact v4 initialisation to reject the unsupported configuration')
}

export const verifyFastRedactMigrationMatrix = ({
  matrix = loadFastRedactMigrationMatrix(defaultRepositoryRoot),
  repositoryRoot = defaultRepositoryRoot,
  redactorFactory = loadBuiltRedactorFactory(repositoryRoot),
}: VerifyFastRedactMigrationMatrixOptions = {}): VerifiedFastRedactMigrationRow[] => {
  validateFastRedactMigrationMatrix(matrix, repositoryRoot)

  const fastRedact = loadFastRedact()

  for (const row of matrix.rows) {
    try {
      if (row.assertionMode === 'documented-divergence') {
        verifyDocumentedDivergenceRow({ row, repositoryRoot, fastRedact, redactorFactory })
      } else if (row.assertionMode === 'v4-initialisation-error') {
        verifyInitialisationErrorRow({ row, repositoryRoot, fastRedact, redactorFactory })
      } else {
        verifyParityRow({ row, repositoryRoot, fastRedact, redactorFactory })
      }
    } catch (error) {
      if (error instanceof FastRedactMigrationVerificationError) {
        throw error
      }

      fail(row, 'comparison', error instanceof Error ? error.message : String(error))
    }
  }

  return matrix.rows.map((row) => ({
    id: row.id,
    classification: row.classification,
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
  row: FastRedactMigrationRow,
): string => {
  if (row.expectedResult.kind === 'structured' || row.expectedResult.kind === 'divergence') {
    return renderJsonBlock(readFixtureJson<unknown>(repositoryRoot, row, row.expectedResult.file))
  }

  return renderTextBlock(readFixtureText(repositoryRoot, row, row.expectedResult.file))
}

const renderRow = (
  repositoryRoot: string,
  row: FastRedactMigrationRow,
): string => {
  const notes = readFixtureText(repositoryRoot, row, 'notes.md')
  const migrationSteps = row.v4Action.migrationSteps.map((step) => `- ${step}`).join('\n')

  return [
    `### ${row.id}`,
    '',
    `Classification: \`${row.classification}\``,
    '',
    `Assertion mode: \`${row.assertionMode}\``,
    '',
    `Fixture directory: \`${row.fixtureDir}\``,
    '',
    'fast-redact configuration:',
    '',
    renderJsonBlock(renderFixtureHelperReferences(row.fastRedactConfig)),
    '',
    'Deep Redact v4 action:',
    '',
    renderJsonBlock(renderFixtureHelperReferences(row.v4Action)),
    '',
    'Expected result or divergence artefact:',
    '',
    renderExpectedResult(repositoryRoot, row),
    '',
    'Migration steps:',
    '',
    migrationSteps,
    '',
    `fast-redact behaviour: ${row.v4Action.fastRedactBehaviour}`,
    '',
    `Deep Redact v4 behaviour: ${row.v4Action.v4Behaviour}`,
    '',
    `Reason: ${row.v4Action.reason}`,
    '',
    `Notes: ${notes}`,
    '',
  ].join('\n')
}

export const renderFastRedactMigrationGuide = (
  matrix: FastRedactMigrationMatrix,
  repositoryRoot = defaultRepositoryRoot,
): string => {
  validateFastRedactMigrationMatrix(matrix, repositoryRoot)

  const tableRows = matrix.rows.map((row) =>
    `| \`${row.id}\` | \`${row.classification}\` | \`${row.assertionMode}\` |`)
  const parityCount = matrix.rows.filter((row) => row.classification === 'direct-equivalent').length
  const rewriteCount = matrix.rows.filter((row) => row.classification === 'mechanical-rewrite').length
  const divergenceCount = matrix.rows.filter((row) => row.classification === 'intentional-divergence').length

  return `${[
    '<!-- This file is generated by scripts/generate-fast-redact-migration-doc.ts. This file is generated. Do not edit it by hand. -->',
    '',
    '# Migrating From fast-redact',
    '',
    'This guide is generated from `test/migration/fast-redact/matrix.json` and the fixture directories under `test/migration/fast-redact/fixtures/`. The same manifest and fixtures drive verification, so documentation drift fails the generated-file checks.',
    '',
    'Deep Redact v4 migration rows are grouped as direct equivalents, mechanical rewrites, and intentional divergences. Direct equivalents are parity cases, mechanical rewrites require a small configuration change, and intentional divergences need a deliberate caller decision before migration.',
    '',
    'This guide covers documented `fast-redact` scenarios only. Deep Redact v3 migration, worked examples, benchmark evidence, and platform-adoption guidance are outside this guide.',
    '',
    '## Summary',
    '',
    `- Source package: \`${matrix.metadata.sourcePackage}\``,
    `- Canonical manifest: \`${matrixPath}\``,
    `- Fixture root: \`${matrix.metadata.fixtureRoot}\``,
    `- Direct equivalents: ${parityCount}`,
    `- Mechanical rewrites: ${rewriteCount}`,
    `- Intentional divergences: ${divergenceCount}`,
    '',
    '## Intentional Divergences',
    '',
    '- `restore` is unsupported.',
    '- `strict` is unsupported.',
    '- omitted `serialise` returns structured output.',
    '- Non-string literal `censor` values need an explicit migration action.',
    '',
    '## Matrix',
    '',
    '| Row | Classification | Assertion mode |',
    '| --- | --- | --- |',
    ...tableRows,
    '',
    '## Rows',
    '',
    ...matrix.rows.map((row) => renderRow(repositoryRoot, row)),
    '',
  ].join('\n')}\n`
}
