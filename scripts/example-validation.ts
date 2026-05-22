import { readFileSync } from 'node:fs'
import path, { posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

export type ExampleCategory =
  | 'setup'
  | 'targeting'
  | 'replacement'
  | 'output'
  | 'runtime'
  | 'console'
  | 'migration-fast-redact'
  | 'migration-v3'

export type ExampleAssertionMode =
  | 'structured-output'
  | 'serialised-output'

export interface ExampleRow {
  id: string;
  category: ExampleCategory;
  docTarget: string;
  sourceFile: string;
  fixtureDir: string;
  assertionMode: ExampleAssertionMode;
  expectedResultFile: string;
}

export interface ExampleManifest {
  schemaVersion: 1;
  metadata: {
    title: string;
    fixtureRoot: string;
    assertionModes: ExampleAssertionMode[];
  };
  rows: ExampleRow[];
}

export interface VerifiedExampleRow {
  id: string;
  assertionMode: ExampleAssertionMode;
  fixtureDir: string;
}

export interface VerifyExampleManifestOptions {
  manifest?: ExampleManifest;
  repositoryRoot?: string;
}

type VerificationPhase = 'fixture' | 'execution' | 'comparison'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..')
const manifestPath = posix.join('docs', 'examples', 'manifest.json')
const fixtureRoot = 'docs/examples/fixtures'

const rowKeys = [
  'id',
  'category',
  'docTarget',
  'sourceFile',
  'fixtureDir',
  'assertionMode',
  'expectedResultFile',
]

const categoryValues = new Set<ExampleCategory>([
  'setup',
  'targeting',
  'replacement',
  'output',
  'runtime',
  'console',
  'migration-fast-redact',
  'migration-v3',
])

const assertionModeValues = new Set<ExampleAssertionMode>([
  'structured-output',
  'serialised-output',
])

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const readJsonFile = <T>(filePath: string): T => {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

const readTextFile = (filePath: string): string => {
  return readFileSync(filePath, 'utf8').replaceAll('\r\n', '\n').replace(/\n$/, '')
}

export class ExampleVerificationError extends Error {
  rowId: string
  assertionMode: ExampleAssertionMode
  phase: VerificationPhase
  fixtureDir: string

  constructor({
    row,
    phase,
    message,
  }: {
    row: ExampleRow;
    phase: VerificationPhase;
    message: string;
  }) {
    super(
      `example row ${row.id} (${row.assertionMode}) failed during ${phase} for fixture ${row.fixtureDir}: ${message}`,
    )
    this.name = 'ExampleVerificationError'
    this.rowId = row.id
    this.assertionMode = row.assertionMode
    this.phase = phase
    this.fixtureDir = row.fixtureDir
  }
}

const fail = (
  row: ExampleRow,
  phase: VerificationPhase,
  message: string,
): never => {
  throw new ExampleVerificationError({ row, phase, message })
}

export const loadExampleManifest = (
  repositoryRoot = defaultRepositoryRoot,
): ExampleManifest => {
  return readJsonFile<ExampleManifest>(path.join(repositoryRoot, manifestPath))
}

const isRelativePathSafe = (value: string): boolean => {
  return !posix.isAbsolute(value) && !/(^|\/)\.\.(\/|$)/.test(value)
}

export const validateExampleManifest = (
  manifest: ExampleManifest,
): void => {
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.rows) || !isRecord(manifest.metadata)) {
    throw new Error('example manifest must use schemaVersion 1 with metadata and rows')
  }

  if (manifest.metadata.fixtureRoot !== fixtureRoot) {
    throw new Error(`example manifest metadata.fixtureRoot must be ${fixtureRoot}`)
  }

  const seenIds = new Set<string>()

  for (const row of manifest.rows) {
    if (!isRecord(row)) {
      throw new Error('example manifest rows must be objects')
    }

    const candidateRow = row as ExampleRow

    const candidateKeys = new Set(Object.keys(candidateRow))
    if (candidateKeys.size !== rowKeys.length || !rowKeys.every(k => candidateKeys.has(k))) {
      throw new Error(
        `example row ${String(candidateRow.id ?? '(unknown)')} must have exactly these keys: ${rowKeys.join(', ')}`,
      )
    }

    if (typeof candidateRow.id !== 'string' || candidateRow.id.length === 0) {
      throw new Error('example row id must be a non-empty string')
    }

    if (seenIds.has(candidateRow.id)) {
      throw new Error(`example row id must be unique: ${candidateRow.id}`)
    }

    seenIds.add(candidateRow.id)

    if (!categoryValues.has(candidateRow.category)) {
      throw new Error(
        `example row ${candidateRow.id}: category must be one of ${[...categoryValues].join(', ')}`,
      )
    }

    if (!assertionModeValues.has(candidateRow.assertionMode)) {
      throw new Error(
        `example row ${candidateRow.id}: assertionMode must be one of ${[...assertionModeValues].join(', ')}`,
      )
    }

    if (typeof candidateRow.docTarget !== 'string' || candidateRow.docTarget.length === 0) {
      throw new Error(`example row ${candidateRow.id}: docTarget must be a non-empty string`)
    }

    if (typeof candidateRow.sourceFile !== 'string' || candidateRow.sourceFile.length === 0) {
      throw new Error(`example row ${candidateRow.id}: sourceFile must be a non-empty string`)
    }

    if (!isRelativePathSafe(candidateRow.sourceFile)) {
      throw new Error(`example row ${candidateRow.id}: sourceFile must be a relative path with no traversal`)
    }

    if (typeof candidateRow.expectedResultFile !== 'string' || candidateRow.expectedResultFile.length === 0) {
      throw new Error(`example row ${candidateRow.id}: expectedResultFile must be a non-empty string`)
    }

    if (!isRelativePathSafe(candidateRow.expectedResultFile)) {
      throw new Error(`example row ${candidateRow.id}: expectedResultFile must be a relative path with no traversal`)
    }

    validateFixturePath(candidateRow)
  }
}

const validateFixturePath = (row: ExampleRow): void => {
  const { fixtureDir } = row

  if (
    posix.isAbsolute(fixtureDir)
    || fixtureDir.includes('\\')
    || /(^|\/)\.\.(\/|$)/.test(fixtureDir)
    || posix.normalize(fixtureDir) !== fixtureDir
    || !fixtureDir.startsWith(`${fixtureRoot}/`)
  ) {
    throw new Error(
      `example row ${row.id}: fixtureDir must be a normalised repository-relative path inside ${fixtureRoot}`,
    )
  }

  if (fixtureDir !== `${fixtureRoot}/${row.id}`) {
    throw new Error(
      `example row ${row.id}: fixtureDir must be ${fixtureRoot}/${row.id}`,
    )
  }
}

interface ExampleModule {
  default?: (input: unknown) => unknown;
  runExample?: (input: unknown) => unknown;
}

const importExampleModule = async (
  row: ExampleRow,
  sourceFilePath: string,
): Promise<ExampleModule> => {
  try {
    return await import(sourceFilePath) as ExampleModule
  } catch (error) {
    return fail(row, 'execution', error instanceof Error ? error.message : String(error))
  }
}

const resolveRunFn = (
  row: ExampleRow,
  exampleModule: ExampleModule,
): (input: unknown) => unknown => {
  const runFn = exampleModule.runExample ?? exampleModule.default

  if (typeof runFn !== 'function') {
    return fail(row, 'execution', 'sourceFile must export a default function or a named runExample export')
  }

  return runFn
}

const verifyStructuredOutputRow = async (
  row: ExampleRow,
  repositoryRoot: string,
): Promise<void> => {
  const inputPath = path.join(repositoryRoot, row.fixtureDir, 'input.json')
  const expectedPath = path.join(repositoryRoot, row.fixtureDir, row.expectedResultFile)
  const sourceFilePath = path.resolve(repositoryRoot, row.sourceFile)

  let input: unknown
  let expected: unknown
  try {
    input = readJsonFile<unknown>(inputPath)
    expected = readJsonFile<unknown>(expectedPath)
  } catch (error) {
    return fail(row, 'fixture', error instanceof Error ? error.message : String(error))
  }

  const exampleModule = await importExampleModule(row, sourceFilePath)
  const runFn = resolveRunFn(row, exampleModule)
  const actual = await Promise.resolve(runFn(input))

  if (!isDeepStrictEqual(actual, expected)) {
    fail(row, 'comparison', 'structured output did not match the committed expected result')
  }
}

const verifySerialisedOutputRow = async (
  row: ExampleRow,
  repositoryRoot: string,
): Promise<void> => {
  const inputPath = path.join(repositoryRoot, row.fixtureDir, 'input.json')
  const expectedPath = path.join(repositoryRoot, row.fixtureDir, row.expectedResultFile)
  const sourceFilePath = path.resolve(repositoryRoot, row.sourceFile)

  let input: unknown
  let expected: string
  try {
    input = readJsonFile<unknown>(inputPath)
    expected = readTextFile(expectedPath)
  } catch (error) {
    return fail(row, 'fixture', error instanceof Error ? error.message : String(error))
  }

  const exampleModule = await importExampleModule(row, sourceFilePath)
  const runFn = resolveRunFn(row, exampleModule)
  const actual = await Promise.resolve(runFn(input))

  if (typeof actual !== 'string') {
    fail(row, 'comparison', `serialised output must be a string but got ${typeof actual}`)
  }

  if (actual !== expected) {
    fail(row, 'comparison', 'serialised output did not match the committed expected result')
  }
}

export const verifyExampleManifest = async (
  options: VerifyExampleManifestOptions = {},
): Promise<VerifiedExampleRow[]> => {
  const repositoryRoot = options.repositoryRoot ?? defaultRepositoryRoot
  const manifest = options.manifest ?? loadExampleManifest(repositoryRoot)

  validateExampleManifest(manifest)

  for (const row of manifest.rows) {
    try {
      switch (row.assertionMode) {
        case 'structured-output': {
          await verifyStructuredOutputRow(row, repositoryRoot)
          break
        }

        case 'serialised-output': {
          await verifySerialisedOutputRow(row, repositoryRoot)
          break
        }
      }
    } catch (error) {
      if (error instanceof ExampleVerificationError) {
        throw error
      }

      fail(row, 'comparison', error instanceof Error ? error.message : String(error))
    }
  }

  return manifest.rows.map((row) => ({
    id: row.id,
    assertionMode: row.assertionMode,
    fixtureDir: row.fixtureDir,
  }))
}
