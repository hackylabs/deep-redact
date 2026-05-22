import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderPrecedenceDocument } from '../test/fixtures/precedence-matrix/index.ts'
import { renderOneWayRedactionDocument } from '../test/fixtures/one-way-deny-list/index.ts'
import { buildInstallDocumentation } from './install-documentation.ts'
import {
  loadFastRedactMigrationMatrix,
  renderFastRedactMigrationGuide,
} from './fast-redact-migration.ts'
import {
  loadV3MigrationMatrix,
  renderV3MigrationGuide,
} from './v3-migration.ts'

type PackageJson = Record<string, unknown> & {
  exports?: Record<string, unknown>;
  main?: string;
  module?: string;
  name?: unknown;
  types?: string;
  version?: unknown;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const packageJsonPath = path.join(repositoryRoot, 'package.json')
const readmeTemplatePath = path.join(scriptDirectory, 'templates', 'README.md.template')
const nodeVersionPath = path.join(repositoryRoot, '.nvmrc')

const generatedRootEntrypoint = {
  import: './dist/index.js',
  require: './dist/index.cjs',
  types: './dist/index.d.ts',
}

const generatedConsoleAdapterEntrypoint = {
  import: './dist/adapters/console/index.js',
  require: './dist/adapters/console/index.cjs',
  types: './dist/adapters/console/index.d.ts',
}

export const readPackageJson = (): PackageJson => {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
}

export const buildGeneratedPackageJson = (packageJson: PackageJson): PackageJson => {
  return {
    ...packageJson,
    main: generatedRootEntrypoint.require,
    module: generatedRootEntrypoint.import,
    types: generatedRootEntrypoint.types,
    exports: {
      '.': generatedRootEntrypoint,
      './adapters/console': generatedConsoleAdapterEntrypoint,
      './package.json': './package.json',
    },
  }
}

export const serialisePackageJson = (packageJson: PackageJson): string => {
  return `${JSON.stringify(buildGeneratedPackageJson(packageJson), null, 2)}\n`
}

export const buildGeneratedReadme = (): string => {
  const packageJson = readPackageJson()
  const template = readFileSync(readmeTemplatePath, 'utf8')
  const contributorNodeVersion = readFileSync(nodeVersionPath, 'utf8').trim()
  const packageManager = String(packageJson.packageManager ?? 'pnpm')
  const installationDocumentation = buildInstallDocumentation(repositoryRoot, packageJson)

  return template
    .replaceAll('{{PACKAGE_NAME}}', String(packageJson.name))
    .replaceAll('{{CONTRIBUTOR_NODE_VERSION}}', contributorNodeVersion)
    .replaceAll('{{PACKAGE_MANAGER}}', packageManager)
    .replaceAll('{{INSTALLATION_DOCUMENTATION}}', installationDocumentation.trimEnd())
}

export const buildGeneratedPrecedenceDocument = (): string => {
  return renderPrecedenceDocument()
}

export const buildGeneratedOneWayRedactionDocument = (): string => {
  return renderOneWayRedactionDocument()
}

export const buildGeneratedFastRedactMigrationGuide = (): string => {
  return renderFastRedactMigrationGuide(loadFastRedactMigrationMatrix(repositoryRoot), repositoryRoot)
}

export const buildGeneratedV3MigrationGuide = (): string => {
  return renderV3MigrationGuide(loadV3MigrationMatrix(repositoryRoot), repositoryRoot)
}

export const generatedFilePaths = {
  fastRedactMigrationGuidePath: path.join(repositoryRoot, 'docs', 'migration', 'from-fast-redact.md'),
  v3MigrationGuidePath: path.join(repositoryRoot, 'docs', 'migration', 'from-v3.md'),
  oneWayRedactionDocPath: path.join(repositoryRoot, 'docs', 'architecture', 'one-way-redaction.md'),
  packageJsonPath,
  precedenceDocPath: path.join(repositoryRoot, 'docs', 'architecture', 'precedence.md'),
  readmePath: path.join(repositoryRoot, 'README.md'),
}
