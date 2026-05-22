import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderPrecedenceDocument } from '../test/fixtures/precedence-matrix/index.ts'
import { renderOneWayRedactionDocument } from '../test/fixtures/one-way-deny-list/index.ts'

type PackageJson = Record<string, unknown> & {
  exports?: Record<string, unknown>;
  main?: string;
  module?: string;
  types?: string;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const packageJsonPath = path.join(repositoryRoot, 'package.json')
const readmeTemplatePath = path.join(scriptDirectory, 'templates', 'README.md.template')
const nodeVersionPath = path.join(repositoryRoot, '.nvmrc')

const generatedEntrypoint = {
  import: './dist/index.js',
  require: './dist/index.cjs',
  types: './dist/index.d.ts',
}

export const readPackageJson = (): PackageJson => {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
}

export const buildGeneratedPackageJson = (packageJson: PackageJson): PackageJson => {
  return {
    ...packageJson,
    main: generatedEntrypoint.require,
    module: generatedEntrypoint.import,
    types: generatedEntrypoint.types,
    exports: {
      '.': generatedEntrypoint,
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

  return template
    .replaceAll('{{PACKAGE_NAME}}', String(packageJson.name))
    .replaceAll('{{CONTRIBUTOR_NODE_VERSION}}', contributorNodeVersion)
    .replaceAll('{{PACKAGE_MANAGER}}', packageManager)
}

export const buildGeneratedPrecedenceDocument = (): string => {
  return renderPrecedenceDocument()
}

export const buildGeneratedOneWayRedactionDocument = (): string => {
  return renderOneWayRedactionDocument()
}

export const generatedFilePaths = {
  oneWayRedactionDocPath: path.join(repositoryRoot, 'docs', 'architecture', 'one-way-redaction.md'),
  packageJsonPath,
  precedenceDocPath: path.join(repositoryRoot, 'docs', 'architecture', 'precedence.md'),
  readmePath: path.join(repositoryRoot, 'README.md'),
}
