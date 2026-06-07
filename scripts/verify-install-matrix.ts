import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path, { posix } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

export interface InstallMatrixRow {
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

export interface InstallMatrix {
  schemaVersion: 1;
  metadata: {
    commandTokens: Record<string, string>;
    deferredPhases: Record<string, string>;
  };
  rows: InstallMatrixRow[];
}

export interface PackageSourceTokens {
  packageTarball: string;
  packageTarballUrl: string;
  denoPackageSpecifier?: string;
}

export interface PlannedInstallMatrixRow {
  id: string;
  packageManager: string;
  runtime: string;
  fixtureSourceDirectory: string;
  fixtureTemporaryDirectory: string;
  installCommand: string[];
  runCommand: string[];
  expectedStdoutFile: string;
  expectedExitStatus: number;
  denoPackageSpecifier?: string;
  npmRegistryUrl?: string;
}

export interface ExecutableInstallMatrixRow {
  id: string;
  packageManager: string;
  runtime?: string;
  fixtureSourceDirectory: string;
  fixtureTemporaryDirectory: string;
  installCommand: string[];
  runCommand: string[];
  expectedStdout: string;
  expectedExitStatus: number;
  denoPackageSpecifier?: string;
  npmRegistryUrl?: string;
}

export interface CommandExecution {
  rowId: string;
  phase: 'install' | 'run';
  command: string;
  arguments_: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface CommandResult {
  exitStatus: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

interface PlanInstallMatrixVerificationOptions {
  matrix: InstallMatrix;
  activeNodeVersion: string;
  activeDenoVersionOutput?: string;
  packageJson?: PackageJsonMetadata;
  packageTarball: string;
  packageTarballUrl: string;
  repositoryRoot: string;
  temporaryRoot: string;
}

interface RunInstallMatrixRowsOptions {
  createTemporaryFixtureDirectory?: (
    temporaryDirectoryPrefix: string,
    row: ExecutableInstallMatrixRow,
  ) => Promise<string>;
  copyFixture?: (
    sourceDirectory: string,
    targetDirectory: string,
    row: ExecutableInstallMatrixRow,
  ) => Promise<void>;
  removeFixture?: (targetDirectory: string, row: ExecutableInstallMatrixRow) => Promise<void>;
  prepareFixture?: (row: ExecutableInstallMatrixRow) => Promise<void>;
  afterInstall?: (row: ExecutableInstallMatrixRow) => Promise<void>;
  execute?: (execution: CommandExecution) => Promise<CommandResult>;
  keepFixtures?: boolean;
  env?: NodeJS.ProcessEnv;
}

interface RunInstallMatrixVerificationOptions extends RunInstallMatrixRowsOptions {
  matrix: InstallMatrix;
  activeNodeVersion: string;
  packageTarball: string;
  repositoryRoot: string;
  temporaryRoot: string;
  packageJson?: PackageJsonMetadata;
  preparePackageManagers?: (rows: PlannedInstallMatrixRow[], repositoryRoot: string) => Promise<void>;
  readExpectedStdout?: (expectedStdoutFile: string, row: PlannedInstallMatrixRow) => Promise<string>;
  createTarballServer?: (tarballPath: string) => Promise<TarballServer>;
  createNpmRegistryServer?: (options: CreateNpmRegistryServerOptions) => Promise<NpmRegistryServer>;
  readDenoVersionOutput?: () => Promise<string>;
}

interface PackCurrentPackageOptions {
  repositoryRoot: string;
  temporaryRoot: string;
}

interface TarballServer {
  url: string;
  close: () => Promise<void>;
}

export interface NpmRegistryServer {
  registryUrl: string;
  tarballUrl: string;
  close: () => Promise<void>;
  packageMetadataRequestCount: () => number;
  packageTarballRequestCount: () => number;
  assertCurrentPackageRequested: () => void;
}

export interface PackageJsonMetadata {
  name?: unknown;
  version?: unknown;
}

export interface CreateNpmRegistryServerOptions {
  packageJson: PackageJsonMetadata;
  packageTarball: string;
}

type CommandFailureReason = 'spawn' | 'exit-status' | 'stderr' | 'stdout'

export class InstallMatrixVerificationError extends Error {
  rowId: string
  phase: 'install' | 'run'
  reason: CommandFailureReason

  constructor({
    rowId,
    phase,
    reason,
    message,
  }: {
    rowId: string;
    phase: 'install' | 'run';
    reason: CommandFailureReason;
    message: string;
  }) {
    super(message)
    this.name = 'InstallMatrixVerificationError'
    this.rowId = rowId
    this.phase = phase
    this.reason = reason
  }
}

const execFileAsync = promisify(execFile)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..')
const expectedNodePackageManagers = ['npm', 'pnpm', 'yarn', 'bun']
const nodePackageManagers = new Set(expectedNodePackageManagers)
const nodeCommandTokens = new Set(['{packageTarball}', '{packageTarballUrl}'])
const denoCommandTokens = new Set(['{denoPackageSpecifier}'])
const shellInterpreters = new Set(['sh', 'bash', 'zsh', 'ksh', 'fish', 'csh', 'tcsh', 'cmd', 'powershell', 'pwsh'])
const commandTokenPattern = /\{[^}]+\}/g
const shellControlPattern = /(?:^|\s)(?:&&|\|\||[;|<>])(?:\s|$)/
const outputLimitBytes = 1024 * 1024
const denoPackageSpecifierToken = '{denoPackageSpecifier}'

export const loadInstallMatrix = async (
  repositoryRoot = defaultRepositoryRoot,
): Promise<InstallMatrix> => {
  const matrixPath = path.join(repositoryRoot, 'test', 'compatibility', 'install', 'matrix.json')
  const rawMatrix = await readFile(matrixPath, 'utf8')

  return JSON.parse(rawMatrix) as InstallMatrix
}

const normaliseActiveNodeVersion = (activeNodeVersion: string): string => {
  const match = /^v?(\d+\.\d+\.\d+)$/.exec(activeNodeVersion)

  if (!match) {
    throw new Error(`Active Node runtime must be an exact version, received ${activeNodeVersion}`)
  }

  return match[1]
}

const parseNodeRuntimeVersion = (row: InstallMatrixRow): string => {
  const match = /^node@(\d+\.\d+\.\d+)$/.exec(row.runtimeVersion)

  if (!match) {
    throw new Error(
      `Install-matrix row ${row.id} has malformed runtimeVersion ${row.runtimeVersion}; expected node@<version>`,
    )
  }

  return match[1]
}

const parseDenoRuntimeVersion = (row: InstallMatrixRow): number => {
  const match = /^deno@(\d+)$/.exec(row.runtimeVersion)

  if (!match) {
    throw new Error(
      `Install-matrix row ${row.id} has malformed runtimeVersion ${row.runtimeVersion}; expected deno@2`,
    )
  }

  return Number.parseInt(match[1], 10)
}

const parseDenoVersionOutput = (denoVersionOutput: string): number => {
  const match = /^deno\s+(\d+)(?:\.\d+){0,2}\b/m.exec(denoVersionOutput.trim())

  if (!match) {
    throw new Error(`Unable to determine Deno version from deno --version output: ${denoVersionOutput.trim()}`)
  }

  return Number.parseInt(match[1], 10)
}

export const selectNodeRows = (
  matrix: InstallMatrix,
  activeNodeVersion: string,
): InstallMatrixRow[] => {
  const activeVersion = normaliseActiveNodeVersion(activeNodeVersion)
  const nodeRows = matrix.rows.filter((row) => row.runtime === 'node')

  for (const row of nodeRows) {
    if (!nodePackageManagers.has(row.packageManager)) {
      throw new Error(`Install-matrix row ${row.id} uses unsupported Node package manager ${row.packageManager}`)
    }

    parseNodeRuntimeVersion(row)
  }

  const selectedRows = nodeRows.filter((row) => parseNodeRuntimeVersion(row) === activeVersion)

  if (selectedRows.length === 0) {
    throw new Error(`No Node install-matrix rows match active runtime node@${activeVersion}`)
  }

  const selectedPackageManagers = new Set(selectedRows.map((row) => row.packageManager))
  const selectedPackageManagerList = selectedRows.map((row) => row.packageManager).join(', ')
  const hasCompletePackageManagerSet = selectedRows.length === expectedNodePackageManagers.length
    && expectedNodePackageManagers.every((packageManager) => selectedPackageManagers.has(packageManager))

  if (!hasCompletePackageManagerSet) {
    throw new Error(
      `Active runtime node@${activeVersion} must select one row for each Node package manager: ${expectedNodePackageManagers.join(', ')}; selected ${selectedPackageManagerList}`,
    )
  }

  return selectedRows
}

export const selectDenoRows = (
  matrix: InstallMatrix,
  denoVersionOutput: string,
): InstallMatrixRow[] => {
  const denoRows = matrix.rows.filter((row) => row.runtime === 'deno')

  if (denoRows.length === 0) {
    throw new Error('Install matrix must include the deno-2 row before Deno support can be release-proven')
  }

  for (const row of denoRows) {
    if (row.packageManager !== 'deno') {
      throw new Error(`Install-matrix row ${row.id} uses unsupported Deno package manager ${row.packageManager}`)
    }

    parseDenoRuntimeVersion(row)
  }

  const activeDenoMajor = parseDenoVersionOutput(denoVersionOutput)

  if (activeDenoMajor !== 2) {
    throw new Error(`Install-matrix row deno-2 requires Deno 2, received Deno ${activeDenoMajor}`)
  }

  const selectedRows = denoRows.filter((row) => row.id === 'deno-2' && parseDenoRuntimeVersion(row) === activeDenoMajor)

  if (selectedRows.length !== 1) {
    throw new Error('Deno 2 verification must select exactly the deno-2 install-matrix row')
  }

  return selectedRows
}

export const resolveDenoPackageSpecifier = (packageJson: PackageJsonMetadata): string => {
  const { name, version } = packageJson

  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Cannot resolve Deno package specifier without a package name')
  }

  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error('Cannot resolve Deno package specifier without a pinned package version')
  }

  return `npm:${name}@${version}`
}

export const validateRepositoryPath = ({
  pathValue,
  repositoryRoot,
  expectedPrefix,
  rowId,
  fieldName,
}: {
  pathValue: string;
  repositoryRoot: string;
  expectedPrefix: string;
  rowId: string;
  fieldName: string;
}): string => {
  if (
    path.isAbsolute(pathValue)
    || posix.isAbsolute(pathValue)
    || pathValue.includes('\\')
    || pathValue.split('/').includes('..')
    || posix.normalize(pathValue) !== pathValue
    || !(pathValue === expectedPrefix || pathValue.startsWith(`${expectedPrefix}/`))
  ) {
    throw new Error(`Install-matrix row ${rowId} has unsafe ${fieldName}: ${pathValue}`)
  }

  const resolvedPath = path.resolve(repositoryRoot, pathValue)
  const relativePath = path.relative(repositoryRoot, resolvedPath)

  if (relativePath.startsWith(`..${path.sep}`) || relativePath === '..' || path.isAbsolute(relativePath)) {
    throw new Error(`Install-matrix row ${rowId} has ${fieldName} outside repository: ${pathValue}`)
  }

  return resolvedPath
}

const validateCommandArray = (command: string[], rowId: string): void => {
  if (!Array.isArray(command) || command.length === 0) {
    throw new Error(`Install-matrix row ${rowId} has an empty command array`)
  }

  for (const commandPart of command) {
    if (typeof commandPart !== 'string' || commandPart.length === 0) {
      throw new Error(`Install-matrix row ${rowId} has a non-string command argument`)
    }

    if (shellControlPattern.test(commandPart) || (command.length === 1 && /\s/.test(commandPart.trim()))) {
      throw new Error(`Install-matrix row ${rowId} contains a shell string; commands must be argument arrays`)
    }
  }

  const executableName = command[0].split(/[\\/]/).pop()?.toLowerCase() ?? command[0].toLowerCase()
  const executableBaseName = executableName.endsWith('.exe')
    ? executableName.slice(0, -'.exe'.length)
    : executableName

  if (shellInterpreters.has(executableBaseName)) {
    throw new Error(`Install-matrix row ${rowId} uses shell interpreter ${command[0]}; commands must execute directly`)
  }
}

export const expandCommandTokens = (
  command: string[],
  tokenValues: PackageSourceTokens,
  rowId: string,
  runtime = 'node',
): string[] => {
  validateCommandArray(command, rowId)
  const supportedCommandTokens = runtime === 'deno' ? denoCommandTokens : nodeCommandTokens

  return command.map((commandPart) => {
    const tokens = commandPart.match(commandTokenPattern) ?? []

    for (const token of tokens) {
      if (!supportedCommandTokens.has(token)) {
        throw new Error(`Install-matrix unsupported command token ${token} in row ${rowId}`)
      }

      if (token === denoPackageSpecifierToken && !tokenValues.denoPackageSpecifier) {
        throw new Error(`Install-matrix row ${rowId} cannot expand ${denoPackageSpecifierToken} without a Deno package specifier`)
      }
    }

    return commandPart
      .replaceAll('{packageTarball}', tokenValues.packageTarball)
      .replaceAll('{packageTarballUrl}', tokenValues.packageTarballUrl)
      .replaceAll('{denoPackageSpecifier}', tokenValues.denoPackageSpecifier ?? '')
  })
}

export const planInstallMatrixVerification = ({
  matrix,
  activeNodeVersion,
  activeDenoVersionOutput,
  packageJson,
  packageTarball,
  packageTarballUrl,
  repositoryRoot,
  temporaryRoot,
}: PlanInstallMatrixVerificationOptions): PlannedInstallMatrixRow[] => {
  const selectedNodeRows = selectNodeRows(matrix, activeNodeVersion)
  const hasDenoRows = matrix.rows.some((row) => row.runtime === 'deno')
  const selectedDenoRows = hasDenoRows
    ? selectDenoRows(matrix, activeDenoVersionOutput ?? '')
    : []
  const denoPackageSpecifier = selectedDenoRows.length > 0
    ? resolveDenoPackageSpecifier(packageJson ?? {})
    : undefined
  const selectedRows = [...selectedNodeRows, ...selectedDenoRows]

  return selectedRows.map((row) => {
    const fixtureSourceDirectory = validateRepositoryPath({
      pathValue: row.fixtureDir,
      repositoryRoot,
      expectedPrefix: 'test/fixtures/compatibility/install',
      rowId: row.id,
      fieldName: 'fixtureDir',
    })
    const expectedStdoutFile = validateRepositoryPath({
      pathValue: row.expectedStdoutFile,
      repositoryRoot,
      expectedPrefix: 'test/artefacts/install-matrix',
      rowId: row.id,
      fieldName: 'expectedStdoutFile',
    })
    const fixtureTemporaryDirectory = path.join(
      temporaryRoot,
      `deep-redact-install-${row.id}-${process.pid}`,
    )

    return {
      id: row.id,
      packageManager: row.packageManager,
      runtime: row.runtime,
      fixtureSourceDirectory,
      fixtureTemporaryDirectory,
      installCommand: expandCommandTokens(
        row.installCommand,
        { packageTarball, packageTarballUrl, denoPackageSpecifier },
        row.id,
        row.runtime,
      ),
      runCommand: expandCommandTokens(
        row.runCommand,
        { packageTarball, packageTarballUrl, denoPackageSpecifier },
        row.id,
        row.runtime,
      ),
      expectedStdoutFile,
      expectedExitStatus: row.expectedExitStatus,
      denoPackageSpecifier: row.runtime === 'deno' ? denoPackageSpecifier : undefined,
    }
  })
}

export const compareStdout = ({
  rowId,
  expected,
  actual,
  phase = 'run',
}: {
  rowId: string;
  expected: string;
  actual: string;
  phase?: 'run';
}): void => {
  if (actual !== expected) {
    throw new InstallMatrixVerificationError({
      rowId,
      phase,
      reason: 'stdout',
      message: `Install-matrix row ${rowId} failed ${phase} stdout comparison: expected committed UTF-8 baseline exactly`,
    })
  }
}

const trimForError = (value: string): string => {
  const trimmed = value.trim()

  if (trimmed.length <= 400) {
    return trimmed
  }

  return `${trimmed.slice(0, 400)}...`
}

const assertCommandResult = ({
  rowId,
  phase,
  result,
  expectedExitStatus,
}: {
  rowId: string;
  phase: 'install' | 'run';
  result: CommandResult;
  expectedExitStatus: number;
}): void => {
  if (result.error) {
    throw new InstallMatrixVerificationError({
      rowId,
      phase,
      reason: 'spawn',
      message: `Install-matrix row ${rowId} failed ${phase} spawn: ${result.error.message}`,
    })
  }

  if (result.exitStatus !== expectedExitStatus) {
    const stderr = trimForError(result.stderr)
    const stderrMessage = stderr.length > 0 ? `; stderr: ${stderr}` : ''

    throw new InstallMatrixVerificationError({
      rowId,
      phase,
      reason: 'exit-status',
      message: `Install-matrix row ${rowId} failed ${phase} exit-status: expected ${expectedExitStatus}, received ${result.exitStatus}${stderrMessage}`,
    })
  }

  if (phase === 'run' && result.stderr.trim().length > 0) {
    throw new InstallMatrixVerificationError({
      rowId,
      phase,
      reason: 'stderr',
      message: `Install-matrix row ${rowId} failed ${phase} stderr: command wrote to stderr despite expected exit status ${expectedExitStatus}`,
    })
  }
}

export const executeCommand = async (execution: CommandExecution): Promise<CommandResult> => {
  const { spawn } = await import('node:child_process')

  return new Promise<CommandResult>((resolve) => {
    const child = spawn(execution.command, execution.arguments_, {
      cwd: execution.cwd,
      env: execution.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let stdoutBytes = 0
    let stderrBytes = 0
    let spawnError: Error | undefined

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutBytes < outputLimitBytes) {
        stdoutChunks.push(chunk)
      }

      stdoutBytes += chunk.byteLength
    })

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes < outputLimitBytes) {
        stderrChunks.push(chunk)
      }

      stderrBytes += chunk.byteLength
    })

    child.on('error', (error) => {
      spawnError = error
    })

    child.on('close', (code) => {
      resolve({
        exitStatus: code,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        error: spawnError,
      })
    })
  })
}

export const writeTemporaryDenoFixtureConfig = async (
  row: Pick<ExecutableInstallMatrixRow, 'id' | 'fixtureTemporaryDirectory' | 'denoPackageSpecifier' | 'npmRegistryUrl'>,
): Promise<void> => {
  const { denoPackageSpecifier, npmRegistryUrl } = row

  if (!denoPackageSpecifier) {
    throw new Error(`Install-matrix row ${row.id} cannot prepare a Deno fixture without a Deno package specifier`)
  }

  if (!npmRegistryUrl) {
    throw new Error(`Install-matrix row ${row.id} cannot prepare a Deno fixture without a loopback npm registry URL`)
  }

  const denoJsonPath = path.join(row.fixtureTemporaryDirectory, 'deno.json')
  const denoJson = await readFile(denoJsonPath, 'utf8')

  if (!denoJson.includes(denoPackageSpecifierToken)) {
    throw new Error(`Install-matrix row ${row.id} Deno fixture does not contain ${denoPackageSpecifierToken}`)
  }

  const resolvedDenoJson = denoJson.replaceAll(denoPackageSpecifierToken, denoPackageSpecifier)

  if (resolvedDenoJson.includes(denoPackageSpecifierToken)) {
    throw new Error(`Install-matrix row ${row.id} Deno fixture contains unresolved command tokens`)
  }

  await writeFile(denoJsonPath, resolvedDenoJson)
  await writeFile(path.join(row.fixtureTemporaryDirectory, '.npmrc'), `registry=${npmRegistryUrl}\n`)
}

const prepareTemporaryFixture = async (row: ExecutableInstallMatrixRow): Promise<void> => {
  if (row.packageManager === 'deno') {
    await writeTemporaryDenoFixtureConfig(row)
  }
}

export const runInstallMatrixRows = async (
  rows: ExecutableInstallMatrixRow[],
  options: RunInstallMatrixRowsOptions = {},
): Promise<void> => {
  const createTemporaryFixtureDirectory = options.createTemporaryFixtureDirectory
    ?? (async (temporaryDirectoryPrefix) => mkdtemp(`${temporaryDirectoryPrefix}-`))
  const copyFixture = options.copyFixture ?? (async (sourceDirectory, targetDirectory) => {
    await cp(sourceDirectory, targetDirectory, { recursive: true, verbatimSymlinks: true })
  })
  const removeFixture = options.removeFixture ?? (async (targetDirectory) => {
    await rm(targetDirectory, { force: true, recursive: true })
  })
  const prepareFixture = options.prepareFixture ?? prepareTemporaryFixture
  const afterInstall = options.afterInstall ?? (async () => undefined)
  const execute = options.execute ?? executeCommand
  const keepFixtures = options.keepFixtures ?? false
  const env = options.env ?? process.env

  for (const row of rows) {
    const fixtureTemporaryDirectory = await createTemporaryFixtureDirectory(row.fixtureTemporaryDirectory, row)
    const executableRow = {
      ...row,
      fixtureTemporaryDirectory,
    }
    const rowEnv = createRowEnvironment(env, executableRow)

    try {
      await copyFixture(executableRow.fixtureSourceDirectory, executableRow.fixtureTemporaryDirectory, executableRow)
      await prepareFixture(executableRow)

      const installResult = await execute({
        rowId: executableRow.id,
        phase: 'install',
        command: executableRow.installCommand[0],
        arguments_: executableRow.installCommand.slice(1),
        cwd: executableRow.fixtureTemporaryDirectory,
        env: rowEnv,
      })
      assertCommandResult({
        rowId: executableRow.id,
        phase: 'install',
        result: installResult,
        expectedExitStatus: executableRow.expectedExitStatus,
      })
      await afterInstall(executableRow)

      const runResult = await execute({
        rowId: executableRow.id,
        phase: 'run',
        command: executableRow.runCommand[0],
        arguments_: executableRow.runCommand.slice(1),
        cwd: executableRow.fixtureTemporaryDirectory,
        env: rowEnv,
      })
      assertCommandResult({
        rowId: executableRow.id,
        phase: 'run',
        result: runResult,
        expectedExitStatus: executableRow.expectedExitStatus,
      })
      compareStdout({
        rowId: executableRow.id,
        expected: executableRow.expectedStdout,
        actual: runResult.stdout,
      })
    } finally {
      if (!keepFixtures) {
        await removeFixture(executableRow.fixtureTemporaryDirectory, executableRow)
      }
    }
  }
}

export const createRowEnvironment = (
  baseEnv: NodeJS.ProcessEnv,
  row: Pick<ExecutableInstallMatrixRow, 'packageManager' | 'fixtureTemporaryDirectory' | 'npmRegistryUrl'>,
): NodeJS.ProcessEnv => {
  let rowEnv = baseEnv

  if (row.packageManager === 'yarn') {
    rowEnv = {
      ...rowEnv,
      YARN_NODE_LINKER: 'node-modules',
    }
  }

  if (row.packageManager === 'deno') {
    if (!row.npmRegistryUrl) {
      throw new Error('Deno install-matrix rows require a loopback npm registry URL')
    }

    rowEnv = {
      ...rowEnv,
      DENO_DIR: path.join(row.fixtureTemporaryDirectory, '.deno-cache'),
      NPM_CONFIG_REGISTRY: row.npmRegistryUrl,
      NPM_CONFIG_USERCONFIG: path.join(row.fixtureTemporaryDirectory, '.npmrc'),
      npm_config_registry: row.npmRegistryUrl,
      npm_config_userconfig: path.join(row.fixtureTemporaryDirectory, '.npmrc'),
    }
  }

  return rowEnv
}

export const packCurrentPackage = async ({
  repositoryRoot,
  temporaryRoot,
}: PackCurrentPackageOptions): Promise<string> => {
  const artefactDirectory = await mkdtemp(path.join(temporaryRoot, 'deep-redact-install-pack-'))

  try {
    await execFileAsync('pnpm', ['pack', '--pack-destination', artefactDirectory, '--json'], {
      cwd: repositoryRoot,
      maxBuffer: outputLimitBytes,
    })
  } catch (error) {
    throw new Error(`Failed to pack current package with pnpm pack: ${(error as Error).message}`)
  }

  const packedFiles = await readdir(artefactDirectory)
  const tarballs = packedFiles.filter((fileName) => fileName.endsWith('.tgz'))

  if (tarballs.length !== 1) {
    throw new Error(`Expected pnpm pack to produce one .tgz artefact, found ${tarballs.length}`)
  }

  return path.join(artefactDirectory, tarballs[0])
}

const readPackageJsonMetadata = async (repositoryRoot: string): Promise<PackageJsonMetadata> => {
  return JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8')) as PackageJsonMetadata
}

const readAvailableDenoVersionOutput = async (repositoryRoot: string): Promise<string> => {
  const result = await executeCommand({
    rowId: 'deno-2',
    phase: 'install',
    command: 'deno',
    arguments_: ['--version'],
    cwd: repositoryRoot,
    env: process.env,
  })

  if (result.error) {
    throw new Error(`Deno 2.x is required for the deno-2 install-matrix row: ${result.error.message}`)
  }

  if (result.exitStatus !== 0) {
    const stderr = trimForError(result.stderr)
    const stderrMessage = stderr.length > 0 ? `: ${stderr}` : ''

    throw new Error(`Deno 2.x is required for the deno-2 install-matrix row; deno --version exited ${result.exitStatus}${stderrMessage}`)
  }

  return `${result.stdout}${result.stderr}`
}

const createTarballServer = async (tarballPath: string): Promise<TarballServer> => {
  const server = createServer(async (request, response) => {
    if (request.url !== '/deep-redact.tgz') {
      response.writeHead(404)
      response.end()

      return
    }

    const tarballStats = await stat(tarballPath)

    response.writeHead(200, {
      'content-length': String(tarballStats.size),
      'content-type': 'application/octet-stream',
    })
    createReadStream(tarballPath).pipe(response)
  })

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()

  if (address === null || typeof address === 'string') {
    await closeServer(server)
    throw new Error('Failed to start loopback tarball server for Bun install row')
  }

  return {
    url: `http://127.0.0.1:${address.port}/deep-redact.tgz`,
    close: () => closeServer(server),
  }
}

export const createNpmRegistryServer = async ({
  packageJson,
  packageTarball,
}: CreateNpmRegistryServerOptions): Promise<NpmRegistryServer> => {
  const packageName = typeof packageJson.name === 'string' ? packageJson.name : ''
  const packageVersion = typeof packageJson.version === 'string' ? packageJson.version : ''

  resolveDenoPackageSpecifier(packageJson)

  const encodedPackageName = encodeURIComponent(packageName)
  const tarballRoute = `/${encodedPackageName}/-/${path.basename(packageTarball)}`
  const tarballBytes = await readFile(packageTarball)
  const tarballShasum = createHash('sha1').update(tarballBytes).digest('hex')
  const tarballIntegrity = `sha512-${createHash('sha512').update(tarballBytes).digest('base64')}`
  let registryUrl = ''
  let tarballUrl = ''
  let metadataRequests = 0
  let tarballRequests = 0

  const server = createServer(async (request, response) => {
    if (!request.url) {
      response.writeHead(400)
      response.end()

      return
    }

    const requestUrl = new URL(request.url, 'http://127.0.0.1')
    const decodedPath = decodeURIComponent(requestUrl.pathname)

    if (decodedPath === `/${packageName}`) {
      metadataRequests += 1
      response.writeHead(200, {
        'content-type': 'application/json',
      })
      response.end(JSON.stringify({
        _id: packageName,
        name: packageName,
        'dist-tags': {
          latest: packageVersion,
        },
        versions: {
          [packageVersion]: {
            name: packageName,
            version: packageVersion,
            dist: {
              tarball: tarballUrl,
              shasum: tarballShasum,
              integrity: tarballIntegrity,
            },
          },
        },
      }))

      return
    }

    if (requestUrl.pathname === tarballRoute) {
      tarballRequests += 1
      const tarballStats = await stat(packageTarball)

      response.writeHead(200, {
        'content-length': String(tarballStats.size),
        'content-type': 'application/octet-stream',
      })
      createReadStream(packageTarball).pipe(response)

      return
    }

    response.writeHead(404)
    response.end()
  })

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()

  if (address === null || typeof address === 'string') {
    await closeServer(server)
    throw new Error('Failed to start loopback npm registry for Deno install row')
  }

  registryUrl = `http://127.0.0.1:${address.port}/`
  tarballUrl = `${registryUrl}${encodedPackageName}/-/${path.basename(packageTarball)}`

  return {
    registryUrl,
    tarballUrl,
    close: () => closeServer(server),
    packageMetadataRequestCount: () => metadataRequests,
    packageTarballRequestCount: () => tarballRequests,
    assertCurrentPackageRequested: () => {
      if (metadataRequests === 0 || tarballRequests === 0) {
        throw new Error(
          `Deno install did not request current package metadata or tarball for ${packageName}@${packageVersion}`,
        )
      }
    },
  }
}

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)

        return
      }

      resolve()
    })
  })
}

const prepareToolchainCommand = async (
  command: string,
  arguments_: string[],
  repositoryRoot: string,
): Promise<void> => {
  const result = await executeCommand({
    rowId: 'toolchain',
    phase: 'install',
    command,
    arguments_,
    cwd: repositoryRoot,
    env: process.env,
  })

  if (result.error || result.exitStatus !== 0) {
    const stderr = trimForError(result.stderr)

    throw new Error(
      `Package-manager preparation failed for ${command} ${arguments_.join(' ')}${stderr ? `: ${stderr}` : ''}`,
    )
  }
}

const preparePackageManagers = async (
  rows: PlannedInstallMatrixRow[],
  repositoryRoot: string,
): Promise<void> => {
  const packageManagers = new Set(rows.map((row) => row.packageManager))
  const toolchainCheckDirectory = await mkdtemp(path.join(tmpdir(), 'deep-redact-toolchain-'))

  try {
    if (packageManagers.has('pnpm') || packageManagers.has('yarn')) {
      await prepareToolchainCommand('corepack', ['enable'], repositoryRoot)
    }

    if (packageManagers.has('pnpm')) {
      await prepareToolchainCommand('corepack', ['prepare', 'pnpm@10.33.0', '--activate'], repositoryRoot)
      await prepareToolchainCommand('pnpm', ['--version'], toolchainCheckDirectory)
    }

    if (packageManagers.has('yarn')) {
      await prepareToolchainCommand('corepack', ['prepare', 'yarn@stable', '--activate'], repositoryRoot)
      await prepareToolchainCommand('yarn', ['--version'], toolchainCheckDirectory)
    }

    if (packageManagers.has('npm')) {
      await prepareToolchainCommand('npm', ['--version'], toolchainCheckDirectory)
    }

    if (packageManagers.has('bun')) {
      await prepareToolchainCommand('bun', ['--version'], toolchainCheckDirectory)
    }
  } finally {
    await rm(toolchainCheckDirectory, { force: true, recursive: true })
  }
}

const readExecutableRows = async (
  plannedRows: PlannedInstallMatrixRow[],
  readExpectedStdout: (expectedStdoutFile: string, row: PlannedInstallMatrixRow) => Promise<string> = async (
    expectedStdoutFile,
  ) => readFile(expectedStdoutFile, 'utf8'),
): Promise<ExecutableInstallMatrixRow[]> => {
  return Promise.all(plannedRows.map(async (row) => ({
    id: row.id,
    packageManager: row.packageManager,
    runtime: row.runtime,
    fixtureSourceDirectory: row.fixtureSourceDirectory,
    fixtureTemporaryDirectory: row.fixtureTemporaryDirectory,
    installCommand: row.installCommand,
    runCommand: row.runCommand,
    expectedStdout: await readExpectedStdout(row.expectedStdoutFile, row),
    expectedExitStatus: row.expectedExitStatus,
    denoPackageSpecifier: row.denoPackageSpecifier,
    npmRegistryUrl: row.npmRegistryUrl,
  })))
}

const isBunFileUrlFallbackCandidate = (error: unknown): boolean => {
  return error instanceof InstallMatrixVerificationError
    && error.phase === 'install'
    && error.rowId.startsWith('bun-')
}

export const runInstallMatrixVerification = async ({
  matrix,
  activeNodeVersion,
  packageJson,
  packageTarball,
  repositoryRoot,
  temporaryRoot,
  preparePackageManagers: prepareRows = preparePackageManagers,
  readExpectedStdout,
  createTarballServer: createHttpTarballServer = createTarballServer,
  createNpmRegistryServer: createLoopbackNpmRegistry = createNpmRegistryServer,
  readDenoVersionOutput,
  ...runRowsOptions
}: RunInstallMatrixVerificationOptions): Promise<ExecutableInstallMatrixRow[]> => {
  const hasDenoRows = matrix.rows.some((row) => row.runtime === 'deno')
  const packageMetadata = packageJson ?? (hasDenoRows ? await readPackageJsonMetadata(repositoryRoot) : undefined)
  const activeDenoVersionOutput = hasDenoRows
    ? await (readDenoVersionOutput ?? (() => readAvailableDenoVersionOutput(repositoryRoot)))()
    : undefined
  const packageTarballFileUrl = pathToFileURL(packageTarball).href
  const plannedRows = planInstallMatrixVerification({
    matrix,
    activeNodeVersion,
    activeDenoVersionOutput,
    packageJson: packageMetadata,
    packageTarball,
    packageTarballUrl: packageTarballFileUrl,
    repositoryRoot,
    temporaryRoot,
  })
  await prepareRows(plannedRows, repositoryRoot)

  const nonBunPlannedRows = plannedRows.filter((row) => row.packageManager !== 'bun' && row.packageManager !== 'deno')
  const bunPlannedRows = plannedRows.filter((row) => row.packageManager === 'bun')
  const denoPlannedRows = plannedRows.filter((row) => row.packageManager === 'deno')
  const verifiedRows: ExecutableInstallMatrixRow[] = []
  const nonBunRows = await readExecutableRows(nonBunPlannedRows, readExpectedStdout)

  await runInstallMatrixRows(nonBunRows, runRowsOptions)
  verifiedRows.push(...nonBunRows)

  if (bunPlannedRows.length > 0) {
    const bunFileUrlRows = await readExecutableRows(bunPlannedRows, readExpectedStdout)

    try {
      await runInstallMatrixRows(bunFileUrlRows, runRowsOptions)
      verifiedRows.push(...bunFileUrlRows)
    } catch (error: unknown) {
      if (!isBunFileUrlFallbackCandidate(error)) {
        throw error
      }

      const tarballServer = await createHttpTarballServer(packageTarball)

      try {
        const httpPlannedRows = planInstallMatrixVerification({
          matrix,
          activeNodeVersion,
          activeDenoVersionOutput,
          packageJson: packageMetadata,
          packageTarball,
          packageTarballUrl: tarballServer.url,
          repositoryRoot,
          temporaryRoot,
        }).filter((row) => row.packageManager === 'bun')
        const bunHttpRows = await readExecutableRows(httpPlannedRows, readExpectedStdout)

        await runInstallMatrixRows(bunHttpRows, runRowsOptions)
        verifiedRows.push(...bunHttpRows)
      } finally {
        await tarballServer.close()
      }
    }
  }

  if (denoPlannedRows.length === 0) {
    return verifiedRows
  }

  const npmRegistry = await createLoopbackNpmRegistry({
    packageJson: packageMetadata ?? {},
    packageTarball,
  })

  try {
    const executableDenoRows = await readExecutableRows(denoPlannedRows, readExpectedStdout)
    const denoRows = executableDenoRows.map((row) => ({
      ...row,
      npmRegistryUrl: npmRegistry.registryUrl,
    }))
    const afterInstall = async (row: ExecutableInstallMatrixRow): Promise<void> => {
      await runRowsOptions.afterInstall?.(row)
      npmRegistry.assertCurrentPackageRequested()
    }

    await runInstallMatrixRows(denoRows, {
      ...runRowsOptions,
      afterInstall,
    })
    verifiedRows.push(...denoRows)

    return verifiedRows
  } finally {
    await npmRegistry.close()
  }
}

export const runCli = async (): Promise<void> => {
  const repositoryRoot = defaultRepositoryRoot
  const temporaryRoot = tmpdir()
  const matrix = await loadInstallMatrix(repositoryRoot)
  const packageTarball = await packCurrentPackage({ repositoryRoot, temporaryRoot })
  const keepTemporaryArtefacts = process.env.DEEP_REDACT_KEEP_INSTALL_FIXTURES === '1'

  try {
    const executableRows = await runInstallMatrixVerification({
      matrix,
      activeNodeVersion: process.version,
      packageTarball,
      repositoryRoot,
      temporaryRoot,
      keepFixtures: keepTemporaryArtefacts,
    })

    for (const row of executableRows) {
      console.log(`verified ${row.id}`)
    }
  } finally {
    if (!keepTemporaryArtefacts) {
      await rm(path.dirname(packageTarball), { force: true, recursive: true })
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runCli()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
