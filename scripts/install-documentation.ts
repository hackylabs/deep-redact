import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  resolveDenoPackageSpecifier,
  type InstallMatrix,
  type InstallMatrixRow,
  type PackageJsonMetadata,
} from './verify-install-matrix.ts'

interface InstallDocumentationSources {
  matrix: InstallMatrix;
  packageJson: PackageJsonMetadata;
  denoConfigSource: string;
}

const packageManagersForPublicInstall = ['npm', 'pnpm', 'yarn', 'bun']
const denoPackageSpecifierToken = '{denoPackageSpecifier}'

const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, 'utf8')) as T

const requirePackageName = (packageJson: PackageJsonMetadata): string => {
  if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
    throw new Error('Cannot render installation documentation without a package name')
  }

  return packageJson.name
}

const selectPublicNodeInstallRows = (matrix: InstallMatrix): InstallMatrixRow[] => {
  return packageManagersForPublicInstall.map((packageManager) => {
    const row = matrix.rows.find((candidate) =>
      candidate.runtime === 'node'
      && candidate.runtimeVersion === 'node@24.14.1'
      && candidate.packageManager === packageManager)

    if (!row) {
      throw new Error(`Cannot render installation documentation without the ${packageManager} Node 24 install row`)
    }

    return row
  })
}

export const renderPublicInstallCommand = (row: InstallMatrixRow, packageName: string): string => {
  let replacedPackageSource = false
  const publicCommand = row.installCommand.map((commandPart) => {
    if (commandPart.includes('{packageTarball}') || commandPart.includes('{packageTarballUrl}')) {
      replacedPackageSource = true

      return packageName
    }

    return commandPart
  })

  if (!replacedPackageSource) {
    throw new Error(`Install-matrix row ${row.id} does not contain a verifier package-source token`)
  }

  return publicCommand.join(' ')
}

const renderDenoImportMap = ({
  denoConfigSource,
  denoPackageSpecifier,
  packageName,
}: {
  denoConfigSource: string;
  denoPackageSpecifier: string;
  packageName: string;
}): string => {
  const denoConfig = JSON.parse(denoConfigSource) as { imports?: Record<string, string> }

  if (denoConfig.imports?.[packageName] !== denoPackageSpecifierToken) {
    throw new Error(`Deno fixture import map must keep ${packageName} mapped to ${denoPackageSpecifierToken}`)
  }

  return JSON.stringify({
    ...denoConfig,
    imports: {
      ...denoConfig.imports,
      [packageName]: denoPackageSpecifier,
    },
  }, null, 2)
}

const selectDenoInstallRow = (matrix: InstallMatrix): InstallMatrixRow => {
  const denoRow = matrix.rows.find((row) => row.id === 'deno-2')

  if (!denoRow) {
    throw new Error('Cannot render Deno installation documentation without the deno-2 matrix row')
  }

  if (denoRow.runtime !== 'deno' || denoRow.runtimeVersion !== 'deno@2') {
    throw new Error('The deno-2 matrix row must target Deno 2')
  }

  return denoRow
}

export const renderInstallationDocumentation = ({
  matrix,
  packageJson,
  denoConfigSource,
}: InstallDocumentationSources): string => {
  const packageName = requirePackageName(packageJson)
  const denoPackageSpecifier = resolveDenoPackageSpecifier(packageJson)
  const publicInstallCommands = selectPublicNodeInstallRows(matrix)
    .map((row) => renderPublicInstallCommand(row, packageName))

  // guard: throws if the Deno row is absent from the install matrix
  selectDenoInstallRow(matrix)

  return [
    '## Installation',
    '',
    '```sh',
    ...publicInstallCommands,
    '```',
    '',
    '**Deno** — add the package to your import map (`deno.json`):',
    '',
    '```json',
    renderDenoImportMap({ denoConfigSource, denoPackageSpecifier, packageName }),
    '```',
    '',
  ].join('\n')
}

export const buildInstallDocumentation = (
  repositoryRoot: string,
  packageJson: PackageJsonMetadata,
): string => {
  const denoFixtureDirectory = path.join(
    repositoryRoot,
    'test',
    'fixtures',
    'compatibility',
    'install',
    'deno-baseline',
  )

  return renderInstallationDocumentation({
    matrix: readJson<InstallMatrix>(path.join(repositoryRoot, 'test', 'compatibility', 'install', 'matrix.json')),
    packageJson,
    denoConfigSource: readFileSync(path.join(denoFixtureDirectory, 'deno.json'), 'utf8'),
  })
}
