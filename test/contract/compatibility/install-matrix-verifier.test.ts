import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  compareStdout,
  expandCommandTokens,
  planInstallMatrixVerification,
  runInstallMatrixVerification,
  runInstallMatrixRows,
  selectNodeRows,
  validateRepositoryPath,
  type CommandExecution,
  type CommandResult,
  type InstallMatrix,
  type InstallMatrixRow,
} from '../../../scripts/verify-install-matrix.ts'

const node22Rows = ['npm-node22', 'pnpm-node22', 'yarn-node22', 'bun-node22']
const node24Rows = ['npm-node24', 'pnpm-node24', 'yarn-node24', 'bun-node24']

const row = (overrides: Partial<InstallMatrixRow> = {}): InstallMatrixRow => ({
  id: 'npm-node24',
  packageManager: 'npm',
  runtime: 'node',
  fixtureDir: 'test/fixtures/compatibility/install/node-baseline',
  runtimeVersion: 'node@24.14.1',
  installCommand: ['npm', 'install', '{packageTarball}'],
  runCommand: ['node', 'smoke.mjs'],
  expectedStdoutFile: 'test/artefacts/install-matrix/expected/baseline-structured.stdout',
  expectedExitStatus: 0,
  ...overrides,
})

const matrix = (rows: InstallMatrixRow[]): InstallMatrix => ({
  schemaVersion: 1,
  metadata: {
    commandTokens: {
      '{denoPackageSpecifier}': 'deferred',
      '{packageTarball}': 'tarball path',
      '{packageTarballUrl}': 'tarball URL',
    },
    deferredPhases: {},
  },
  rows,
})

const noopAsync = async (): Promise<void> => undefined
const usePlannedTemporaryDirectory = async (temporaryDirectoryPrefix: string): Promise<string> => {
  return temporaryDirectoryPrefix
}
type ExecuteInstallCommand = (execution: CommandExecution) => Promise<CommandResult>
const packageTokens = {
  packageTarball: '/tmp/deep-redact.tgz',
  packageTarballUrl: 'http://127.0.0.1/deep-redact.tgz',
}

describe('install matrix verifier planning', () => {
  it('selects only Node package-manager rows for the active exact Node version', () => {
    const installMatrix = matrix([
      ...node22Rows.map((id) => row({ id, packageManager: id.split('-')[0], runtimeVersion: 'node@22.18.0' })),
      ...node24Rows.map((id) => row({ id, packageManager: id.split('-')[0] })),
      row({
        id: 'deno-2',
        packageManager: 'deno',
        runtime: 'deno',
        runtimeVersion: 'deno@2',
      }),
    ])

    expect(selectNodeRows(installMatrix, 'v22.18.0').map(({ id }) => id)).toStrictEqual(node22Rows)
    expect(selectNodeRows(installMatrix, 'v24.14.1').map(({ id }) => id)).toStrictEqual(node24Rows)
  })

  it('fails malformed Node runtime versions and active runtimes with no matching rows', () => {
    expect(() => selectNodeRows(matrix([row({ runtimeVersion: 'node@24' })]), 'v24.14.1'))
      .toThrow(/npm-node24.*runtimeVersion.*node@24/)

    expect(() => selectNodeRows(matrix([row({ runtimeVersion: 'node@24.14.1' })]), 'v22.18.0'))
      .toThrow(/No Node install-matrix rows match active runtime node@22\.18\.0/)
  })

  it('fails if an active Node runtime would prove fewer than one row per package manager', () => {
    expect(() => selectNodeRows(matrix([
      row({ id: 'npm-node24', packageManager: 'npm' }),
      row({ id: 'pnpm-node24', packageManager: 'pnpm' }),
      row({ id: 'yarn-node24', packageManager: 'yarn' }),
      row({ id: 'bun-node24', packageManager: 'bun', runtimeVersion: 'node@24.14.2' }),
    ]), 'v24.14.1')).toThrow(/node@24\.14\.1.*npm, pnpm, yarn, bun/)
  })

  it('expands only supported package tarball tokens inside shell-free command arrays', () => {
    expect(expandCommandTokens(
      ['yarn', 'add', '@hackylabs/deep-redact@file:{packageTarball}'],
      packageTokens,
      'yarn-node24',
    )).toStrictEqual(['yarn', 'add', '@hackylabs/deep-redact@file:/tmp/deep-redact.tgz'])

    expect(expandCommandTokens(
      ['bun', 'add', '@hackylabs/deep-redact@{packageTarballUrl}'],
      packageTokens,
      'bun-node24',
    )).toStrictEqual(['bun', 'add', '@hackylabs/deep-redact@http://127.0.0.1/deep-redact.tgz'])

    expect(() => expandCommandTokens(['npm install {packageTarball}'], packageTokens, 'npm-node24'))
      .toThrow(/shell string/)

    expect(() => expandCommandTokens(['sh', '-c', 'npm install {packageTarball}'], packageTokens, 'npm-node24'))
      .toThrow(/shell interpreter/)

    expect(() => expandCommandTokens(['npm', 'install', '{packageVersion}'], packageTokens, 'npm-node24'))
      .toThrow(/unsupported command token.*npm-node24/)
  })

  it('rejects repository paths outside the allowed verification roots', () => {
    const repositoryRoot = '/repo'

    expect(validateRepositoryPath({
      pathValue: 'test/fixtures/compatibility/install/node-baseline',
      repositoryRoot,
      expectedPrefix: 'test/fixtures/compatibility/install',
      rowId: 'npm-node24',
      fieldName: 'fixtureDir',
    })).toBe(path.resolve('/repo/test/fixtures/compatibility/install/node-baseline'))

    for (const pathValue of [
      '/repo/test/fixtures/compatibility/install/node-baseline',
      'test/fixtures/compatibility/install/../deno-baseline',
      'test/fixtures/consumers/import-esm',
    ]) {
      expect(() => validateRepositoryPath({
        pathValue,
        repositoryRoot,
        expectedPrefix: 'test/fixtures/compatibility/install',
        rowId: 'npm-node24',
        fieldName: 'fixtureDir',
      })).toThrow(/npm-node24.*fixtureDir/)
    }
  })

  it('plans copied temporary fixtures and refuses Deno execution during Node verification', () => {
    const planned = planInstallMatrixVerification({
      matrix: matrix([
        row({ id: 'npm-node24' }),
        row({ id: 'pnpm-node24', packageManager: 'pnpm', installCommand: ['pnpm', 'add', '{packageTarball}'] }),
        row({
          id: 'yarn-node24',
          packageManager: 'yarn',
          installCommand: ['yarn', 'add', '@hackylabs/deep-redact@file:{packageTarball}'],
        }),
        row({
          id: 'bun-node24',
          packageManager: 'bun',
          installCommand: ['bun', 'add', '@hackylabs/deep-redact@{packageTarballUrl}'],
        }),
        row({ id: 'deno-2', packageManager: 'deno', runtime: 'deno', runtimeVersion: 'deno@2' }),
      ]),
      activeNodeVersion: 'v24.14.1',
      packageTarball: '/tmp/deep-redact.tgz',
      packageTarballUrl: 'http://127.0.0.1/deep-redact.tgz',
      repositoryRoot: '/repo',
      temporaryRoot: '/tmp',
    })

    expect(planned).toHaveLength(4)
    expect(planned.map(({ id }) => id)).not.toContain('deno-2')
    expect(planned[0]).toMatchObject({
      id: 'npm-node24',
      fixtureSourceDirectory: path.resolve('/repo/test/fixtures/compatibility/install/node-baseline'),
      installCommand: ['npm', 'install', '/tmp/deep-redact.tgz'],
      runCommand: ['node', 'smoke.mjs'],
    })
    expect(planned[0].fixtureTemporaryDirectory).toContain(path.resolve('/tmp'))
  })
})

describe('install matrix verifier execution', () => {
  it('compares stdout as raw UTF-8 text including the trailing line feed', () => {
    expect(compareStdout({
      rowId: 'npm-node24',
      expected: 'ok\n',
      actual: 'ok\n',
    })).toBeUndefined()

    expect(() => compareStdout({
      rowId: 'npm-node24',
      expected: 'ok\n',
      actual: 'ok',
    })).toThrow(/npm-node24.*stdout/)
  })

  it('runs install and smoke commands through the injected executor without package-manager side effects', async () => {
    const executions: CommandExecution[] = []
    const executor = vi.fn<ExecuteInstallCommand>(
      async (execution) => {
        executions.push(execution)

        return {
          exitStatus: 0,
          stdout: execution.phase === 'run' ? 'ok\n' : '',
          stderr: '',
        }
      },
    )

    await runInstallMatrixRows([
      {
        id: 'npm-node24',
        packageManager: 'npm',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-npm-node24',
        installCommand: ['npm', 'install', '/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: 'ok\n',
        expectedExitStatus: 0,
      },
    ], {
      copyFixture: noopAsync,
      removeFixture: noopAsync,
      createTemporaryFixtureDirectory: usePlannedTemporaryDirectory,
      execute: executor,
      keepFixtures: false,
    })

    expect(executions.map(({ command, arguments_: argumentsValue, phase }) => ({
      command,
      argumentsValue,
      phase,
    }))).toStrictEqual([
      { command: 'npm', argumentsValue: ['install', '/tmp/deep-redact.tgz'], phase: 'install' },
      { command: 'node', argumentsValue: ['smoke.mjs'], phase: 'run' },
    ])
    expect(executor).toHaveBeenCalledTimes(2)
  })

  it('reports row id and phase for exit-status and stdout failures without dumping payload data', async () => {
    await expect(runInstallMatrixRows([
      {
        id: 'npm-node24',
        packageManager: 'npm',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-npm-node24',
        installCommand: ['npm', 'install', '/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: '{"secret":"[REDACTED]"}\n',
        expectedExitStatus: 0,
      },
    ], {
      copyFixture: noopAsync,
      removeFixture: noopAsync,
      createTemporaryFixtureDirectory: usePlannedTemporaryDirectory,
      execute: async (execution) => ({
        exitStatus: execution.phase === 'install' ? 1 : 0,
        stdout: '',
        stderr: 'installer failed with payload data that should be trimmed',
      }),
      keepFixtures: false,
    })).rejects.toThrow(/npm-node24.*install.*exit-status/)

    await expect(runInstallMatrixRows([
      {
        id: 'npm-node24',
        packageManager: 'npm',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-npm-node24',
        installCommand: ['npm', 'install', '/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: '{"secret":"[REDACTED]"}\n',
        expectedExitStatus: 0,
      },
    ], {
      copyFixture: noopAsync,
      removeFixture: noopAsync,
      createTemporaryFixtureDirectory: usePlannedTemporaryDirectory,
      execute: async (execution) => ({
        exitStatus: 0,
        stdout: execution.phase === 'run' ? '{"secret":"plain"}\n' : '',
        stderr: '',
      }),
      keepFixtures: false,
    })).rejects.toThrow(/npm-node24.*run.*stdout/)
  })

  it('fails run commands that write stderr even when the exit status and stdout match', async () => {
    await expect(runInstallMatrixRows([
      {
        id: 'npm-node24',
        packageManager: 'npm',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-npm-node24',
        installCommand: ['npm', 'install', '/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: 'ok\n',
        expectedExitStatus: 0,
      },
    ], {
      copyFixture: noopAsync,
      removeFixture: noopAsync,
      createTemporaryFixtureDirectory: usePlannedTemporaryDirectory,
      execute: async (execution) => ({
        exitStatus: 0,
        stdout: execution.phase === 'run' ? 'ok\n' : '',
        stderr: execution.phase === 'run' ? 'stderr-only failure' : '',
      }),
      keepFixtures: false,
    })).rejects.toThrow(/npm-node24.*run.*stderr/)
  })

  it('allocates and cleans temporary fixture directories one row at a time', async () => {
    const createdDirectories: string[] = []
    const copiedDirectories: string[] = []
    const removedDirectories: string[] = []

    await expect(runInstallMatrixRows([
      {
        id: 'npm-node24',
        packageManager: 'npm',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-npm-node24',
        installCommand: ['npm', 'install', '/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: 'ok\n',
        expectedExitStatus: 0,
      },
      {
        id: 'pnpm-node24',
        packageManager: 'pnpm',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-pnpm-node24',
        installCommand: ['pnpm', 'add', '/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: 'ok\n',
        expectedExitStatus: 0,
      },
    ], {
      copyFixture: async (_source, targetDirectory) => {
        copiedDirectories.push(targetDirectory)
      },
      removeFixture: async (targetDirectory) => {
        removedDirectories.push(targetDirectory)
      },
      createTemporaryFixtureDirectory: async (prefix) => {
        const directory = `${prefix}-created`
        createdDirectories.push(directory)

        return directory
      },
      execute: async () => ({
        exitStatus: 1,
        stdout: '',
        stderr: 'install failed',
      }),
      keepFixtures: false,
    })).rejects.toThrow(/npm-node24.*install.*exit-status/)

    expect(createdDirectories).toStrictEqual(['/tmp/deep-redact-npm-node24-created'])
    expect(copiedDirectories).toStrictEqual(['/tmp/deep-redact-npm-node24-created'])
    expect(removedDirectories).toStrictEqual(['/tmp/deep-redact-npm-node24-created'])
  })

  it('uses Yarn node_modules linking so the manifest node run command can resolve the package', async () => {
    const environmentByPhase = new Map<string, NodeJS.ProcessEnv>()

    await runInstallMatrixRows([
      {
        id: 'yarn-node24',
        packageManager: 'yarn',
        fixtureSourceDirectory: '/repo/test/fixtures/compatibility/install/node-baseline',
        fixtureTemporaryDirectory: '/tmp/deep-redact-yarn-node24',
        installCommand: ['yarn', 'add', '@hackylabs/deep-redact@file:/tmp/deep-redact.tgz'],
        runCommand: ['node', 'smoke.mjs'],
        expectedStdout: 'ok\n',
        expectedExitStatus: 0,
      },
    ], {
      copyFixture: noopAsync,
      removeFixture: noopAsync,
      createTemporaryFixtureDirectory: usePlannedTemporaryDirectory,
      execute: async (execution) => {
        environmentByPhase.set(execution.phase, execution.env)

        return {
          exitStatus: 0,
          stdout: execution.phase === 'run' ? 'ok\n' : '',
          stderr: '',
        }
      },
      keepFixtures: false,
      env: { PATH: '/bin' },
    })

    expect(environmentByPhase.get('install')?.YARN_NODE_LINKER).toBe('node-modules')
    expect(environmentByPhase.get('run')?.YARN_NODE_LINKER).toBe('node-modules')
  })
})

describe('install matrix verifier Bun package source handling', () => {
  it('tries Bun rows with a file URL before falling back to the loopback tarball URL', async () => {
    const installCommands: string[][] = []
    const closeTarballServer = vi.fn<() => Promise<void>>(async () => undefined)

    await runInstallMatrixVerification({
      matrix: matrix([
        row({ id: 'npm-node24', packageManager: 'npm' }),
        row({ id: 'pnpm-node24', packageManager: 'pnpm', installCommand: ['pnpm', 'add', '{packageTarball}'] }),
        row({
          id: 'yarn-node24',
          packageManager: 'yarn',
          installCommand: ['yarn', 'add', '@hackylabs/deep-redact@file:{packageTarball}'],
        }),
        row({
          id: 'bun-node24',
          packageManager: 'bun',
          installCommand: ['bun', 'add', '@hackylabs/deep-redact@{packageTarballUrl}'],
        }),
      ]),
      activeNodeVersion: 'v24.14.1',
      packageTarball: '/tmp/deep-redact.tgz',
      repositoryRoot: '/repo',
      temporaryRoot: '/tmp',
      copyFixture: noopAsync,
      removeFixture: noopAsync,
      createTemporaryFixtureDirectory: async (prefix) => `${prefix}-created`,
      readExpectedStdout: async () => 'ok\n',
      preparePackageManagers: noopAsync,
      createTarballServer: async () => ({
        url: 'http://127.0.0.1/deep-redact.tgz',
        close: closeTarballServer,
      }),
      execute: async (execution) => {
        if (execution.phase === 'install') {
          installCommands.push([execution.command, ...execution.arguments_])
        }

        if (
          execution.phase === 'install'
          && execution.command === 'bun'
          && execution.arguments_.some((argument) => argument.includes('file:///tmp/deep-redact.tgz'))
        ) {
          return {
            exitStatus: 1,
            stdout: '',
            stderr: 'bun cannot consume file URL tarballs',
          }
        }

        return {
          exitStatus: 0,
          stdout: execution.phase === 'run' ? 'ok\n' : '',
          stderr: '',
        }
      },
      keepFixtures: false,
    })

    expect(installCommands).toContainEqual([
      'bun',
      'add',
      '@hackylabs/deep-redact@file:///tmp/deep-redact.tgz',
    ])
    expect(installCommands).toContainEqual([
      'bun',
      'add',
      '@hackylabs/deep-redact@http://127.0.0.1/deep-redact.tgz',
    ])
    expect(closeTarballServer).toHaveBeenCalledTimes(1)
  })
})

describe('install matrix release gate wiring', () => {
  it('exposes the verifier as a build-backed package script without a TypeScript runner dependency', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    }

    expect(packageJson.scripts['verify:install-matrix'])
      .toBe('pnpm run build && node --experimental-strip-types ./scripts/verify-install-matrix.ts')
    expect(packageJson.scripts['verify:install-matrix']).not.toContain('tsx')
    expect(packageJson.scripts['verify:install-matrix']).not.toContain('ts-node')
    expect(packageJson.scripts['verify:install-matrix']).not.toContain('.agents/initialise-env.sh')
  })

  it('gates npm publish behind exact Node 22 and Node 24 install-matrix verification jobs', () => {
    const workflow = readFileSync('.github/workflows/npmPublish.yml', 'utf8')

    expect(workflow).toContain('verify-install-matrix:')
    expect(workflow).toContain("- '22.18.0'")
    expect(workflow).toContain("- '24.14.1'")
    expect(workflow).toContain('node-version: ${{ matrix.node-version }}')
    expect(workflow).toContain('oven-sh/setup-bun@v2')
    expect(workflow).toContain('corepack prepare pnpm@10.33.0 --activate')
    expect(workflow).toContain('corepack prepare yarn@stable --activate')
    expect(workflow).toContain('pnpm run verify:install-matrix')
    expect(workflow).toContain('publish:')
    expect(workflow).toContain('needs: verify-install-matrix')
    expect(workflow).toContain('pnpm publish --provenance --access public')
  })
})
