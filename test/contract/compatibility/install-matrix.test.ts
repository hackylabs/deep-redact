import { existsSync, readFileSync, statSync } from 'node:fs'
import { posix, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface InstallMatrixRow {
  id: string;
  packageManager: string;
  runtime: string;
  fixtureDir: string;
  runtimeVersion: string;
  installCommand: string[];
  runCommand: string[];
  expectedStdoutFile: string;
  expectedExitStatus: number;
}

interface InstallMatrix {
  schemaVersion: 1;
  metadata: {
    commandTokens: Record<string, string>;
    deferredPhases: Record<string, string>;
  };
  rows: InstallMatrixRow[];
}

const repoRoot = process.cwd()
const matrixPath = 'test/compatibility/install/matrix.json'
const nodeFixtureDir = 'test/fixtures/compatibility/install/node-baseline'
const denoFixtureDir = 'test/fixtures/compatibility/install/deno-baseline'
const expectedStdoutFile = 'test/artefacts/install-matrix/expected/baseline-structured.stdout'
const canonicalStdout = '{"user":{"password":"[REDACTED]"},"token":"[REDACTED]","ok":true}\n'

const expectedRowIds = [
  'npm-node22',
  'npm-node24',
  'pnpm-node22',
  'pnpm-node24',
  'yarn-node22',
  'yarn-node24',
  'bun-node22',
  'bun-node24',
  'deno-2',
]

const expectedPackageManagers = new Map([
  ['npm-node22', 'npm'],
  ['npm-node24', 'npm'],
  ['pnpm-node22', 'pnpm'],
  ['pnpm-node24', 'pnpm'],
  ['yarn-node22', 'yarn'],
  ['yarn-node24', 'yarn'],
  ['bun-node22', 'bun'],
  ['bun-node24', 'bun'],
  ['deno-2', 'deno'],
])

const expectedRuntimeVersions = new Map([
  ['npm-node22', 'node@22.18.0'],
  ['npm-node24', 'node@24.14.1'],
  ['pnpm-node22', 'node@22.18.0'],
  ['pnpm-node24', 'node@24.14.1'],
  ['yarn-node22', 'node@22.18.0'],
  ['yarn-node24', 'node@24.14.1'],
  ['bun-node22', 'node@22.18.0'],
  ['bun-node24', 'node@24.14.1'],
  ['deno-2', 'deno@2'],
])

const expectedInstallCommands = new Map([
  ['npm-node22', ['npm', 'install', '{packageTarball}']],
  ['npm-node24', ['npm', 'install', '{packageTarball}']],
  ['pnpm-node22', ['pnpm', 'add', '{packageTarball}']],
  ['pnpm-node24', ['pnpm', 'add', '{packageTarball}']],
  ['yarn-node22', ['yarn', 'add', '@hackylabs/deep-redact@file:{packageTarball}']],
  ['yarn-node24', ['yarn', 'add', '@hackylabs/deep-redact@file:{packageTarball}']],
  ['bun-node22', ['bun', 'add', '@hackylabs/deep-redact@{packageTarballUrl}']],
  ['bun-node24', ['bun', 'add', '@hackylabs/deep-redact@{packageTarballUrl}']],
  ['deno-2', ['deno', 'install', '--entrypoint', 'smoke.ts']],
])

const expectedRunCommands = new Map([
  ['npm-node22', ['node', 'smoke.mjs']],
  ['npm-node24', ['node', 'smoke.mjs']],
  ['pnpm-node22', ['node', 'smoke.mjs']],
  ['pnpm-node24', ['node', 'smoke.mjs']],
  ['yarn-node22', ['node', 'smoke.mjs']],
  ['yarn-node24', ['node', 'smoke.mjs']],
  ['bun-node22', ['node', 'smoke.mjs']],
  ['bun-node24', ['node', 'smoke.mjs']],
  ['deno-2', ['deno', 'run', 'smoke.ts']],
])

const readRepositoryFile = (path: string): string => readFileSync(resolve(repoRoot, path), 'utf8')

const readJson = <T>(path: string): T => JSON.parse(readRepositoryFile(path)) as T

const readMatrix = (): InstallMatrix => readJson<InstallMatrix>(matrixPath)

const expectRepositoryPath = (path: string, expectedPrefix: string): void => {
  expect(posix.isAbsolute(path)).toBe(false)
  expect(path).not.toContain('\\')
  expect(path).not.toMatch(/(^|\/)\.\.(\/|$)/)
  expect(posix.normalize(path)).toBe(path)
  expect(path === expectedPrefix || path.startsWith(`${expectedPrefix}/`)).toBe(true)

  const resolvedPath = resolve(repoRoot, path)
  expect(relative(repoRoot, resolvedPath)).not.toMatch(/^\.\.(?:\/|\\|$)/)
}

const expectStringCommand = (command: string[]): void => {
  expect(command.length).toBeGreaterThan(0)
  expect(command.every((token) => typeof token === 'string' && token.length > 0)).toBe(true)
}

describe('installation verification matrix contract', () => {
  it('defines the single canonical matrix manifest with the supported rows in order', () => {
    expect(existsSync(resolve(repoRoot, matrixPath))).toBe(true)
    expectRepositoryPath(matrixPath, 'test/compatibility/install')

    const matrix = readMatrix()

    expect(matrix.schemaVersion).toBe(1)
    expect(matrix.rows.map((row) => row.id)).toStrictEqual(expectedRowIds)
  })

  it('documents verifier-provided command tokens and deferred release phases as manifest metadata', () => {
    const matrix = readMatrix()

    expect(new Set(Object.keys(matrix.metadata.commandTokens))).toStrictEqual(new Set([
      '{denoPackageSpecifier}',
      '{packageTarball}',
      '{packageTarballUrl}',
    ]))
    expect(matrix.metadata.commandTokens['{packageTarball}']).toContain('packed .tgz')
    expect(matrix.metadata.commandTokens['{packageTarballUrl}']).toContain('URL')
    expect(matrix.metadata.commandTokens['{denoPackageSpecifier}']).toContain('Deno-compatible')
    expect(matrix.metadata.commandTokens['{denoPackageSpecifier}']).toContain('npm:@hackylabs/deep-redact@{packageVersion}')
    expect(matrix.metadata.deferredPhases).toEqual({
      nodePackageManagerExecution: 'later-node-package-manager-verification',
      migrationExamplesBenchmarksAndPlatformGuidance: 'later-release-guidance',
    })
  })

  it('defines typed, shell-free commands and repository-relative paths for every row', () => {
    const matrix = readMatrix()

    for (const row of matrix.rows) {
      expect(typeof row.id).toBe('string')
      expect(row.id.length).toBeGreaterThan(0)
      expect(row.packageManager).toBe(expectedPackageManagers.get(row.id))
      expect(['node', 'deno']).toContain(row.runtime)
      expect(row.runtimeVersion).toBe(expectedRuntimeVersions.get(row.id))
      expect(row.installCommand).toStrictEqual(expectedInstallCommands.get(row.id))
      expect(row.runCommand).toStrictEqual(expectedRunCommands.get(row.id))
      expectStringCommand(row.installCommand)
      expectStringCommand(row.runCommand)
      expect(row.expectedExitStatus).toBe(0)

      expectRepositoryPath(row.fixtureDir, 'test/fixtures/compatibility/install')
      expectRepositoryPath(row.expectedStdoutFile, 'test/artefacts/install-matrix')
      expect(statSync(resolve(repoRoot, row.fixtureDir)).isDirectory()).toBe(true)
      expect(statSync(resolve(repoRoot, row.expectedStdoutFile)).isFile()).toBe(true)
    }
  })

  it('maps Node rows to the shared Node fixture and the Deno row to the Deno fixture', () => {
    const matrix = readMatrix()

    for (const row of matrix.rows) {
      if (row.id === 'deno-2') {
        expect(row.fixtureDir).toBe(denoFixtureDir)
      } else {
        expect(row.fixtureDir).toBe(nodeFixtureDir)
      }

      expect(row.expectedStdoutFile).toBe(expectedStdoutFile)
    }
  })

  it('defines the Node baseline fixture as a consumer-style public package smoke test', () => {
    const packageJson = readJson<{ type: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(
      `${nodeFixtureDir}/package.json`,
    )
    const smokeSource = readRepositoryFile(`${nodeFixtureDir}/smoke.mjs`)

    expect(packageJson.type).toBe('module')
    expect(packageJson.dependencies).toBeUndefined()
    expect(packageJson.devDependencies).toBeUndefined()
    expect(smokeSource).toContain("import { deepRedact } from '@hackylabs/deep-redact'")
    expect(smokeSource).toContain("paths: ['user.password', 'token']")
    expect(smokeSource).toContain("password: 'secret'")
    expect(smokeSource).toContain("token: 'abc123'")
    expect(smokeSource).toContain('ok: true')
    expect(smokeSource).toContain('console.log(JSON.stringify(redactedPayload))')
    expect(smokeSource).not.toContain('/src/')
    expect(smokeSource).not.toContain('/dist/')
  })

  it('defines the Deno baseline fixture with a bare public package import mapped by deno.json', () => {
    const denoJson = readJson<{ imports: Record<string, string> }>(`${denoFixtureDir}/deno.json`)
    const smokeSource = readRepositoryFile(`${denoFixtureDir}/smoke.ts`)

    expect(denoJson.imports['@hackylabs/deep-redact']).toBe('{denoPackageSpecifier}')
    expect(smokeSource).toContain("import { deepRedact } from '@hackylabs/deep-redact'")
    expect(smokeSource).toContain("paths: ['user.password', 'token']")
    expect(smokeSource).toContain("password: 'secret'")
    expect(smokeSource).toContain("token: 'abc123'")
    expect(smokeSource).toContain('ok: true')
    expect(smokeSource).toContain('console.log(JSON.stringify(redactedPayload))')
    expect(smokeSource).not.toContain('/src/')
    expect(smokeSource).not.toContain('/dist/')
  })

  it('commits the canonical expected stdout baseline with a single trailing newline', () => {
    expect(readRepositoryFile(expectedStdoutFile)).toBe(canonicalStdout)
  })
})
