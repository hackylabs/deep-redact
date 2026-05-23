import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildAllGeneratedExampleDocs,
  buildGeneratedFastRedactMigrationGuide,
  buildGeneratedOneWayRedactionDocument,
  buildGeneratedPrecedenceDocument,
  buildGeneratedReadme,
  buildGeneratedV3MigrationGuide,
  generatedFilePaths,
  readPackageJson,
  serialisePackageJson,
} from './generated-files.ts'

const mismatches: string[] = []

const currentPackageJson = readFileSync(generatedFilePaths.packageJsonPath, 'utf8')
const expectedPackageJson = serialisePackageJson(readPackageJson())

if (currentPackageJson !== expectedPackageJson) {
  mismatches.push('package.json export metadata is out of date')
}

const currentReadme = readFileSync(generatedFilePaths.readmePath, 'utf8')
const expectedReadme = buildGeneratedReadme()

if (currentReadme !== expectedReadme) {
  mismatches.push('README.md is out of date')
}

const currentPrecedenceDocument = readFileSync(generatedFilePaths.precedenceDocPath, 'utf8')
const expectedPrecedenceDocument = buildGeneratedPrecedenceDocument()

if (currentPrecedenceDocument !== expectedPrecedenceDocument) {
  mismatches.push('docs/architecture/precedence.md is out of date')
}

const currentOneWayRedactionDocument = readFileSync(generatedFilePaths.oneWayRedactionDocPath, 'utf8')
const expectedOneWayRedactionDocument = buildGeneratedOneWayRedactionDocument()

if (currentOneWayRedactionDocument !== expectedOneWayRedactionDocument) {
  mismatches.push('docs/architecture/one-way-redaction.md is out of date')
}

const currentFastRedactMigrationGuide = readFileSync(generatedFilePaths.fastRedactMigrationGuidePath, 'utf8')
const expectedFastRedactMigrationGuide = buildGeneratedFastRedactMigrationGuide()

if (currentFastRedactMigrationGuide !== expectedFastRedactMigrationGuide) {
  mismatches.push('docs/migration/from-fast-redact.md is out of date')
}

const currentV3MigrationGuide = readFileSync(generatedFilePaths.v3MigrationGuidePath, 'utf8')
const expectedV3MigrationGuide = buildGeneratedV3MigrationGuide()

if (currentV3MigrationGuide !== expectedV3MigrationGuide) {
  mismatches.push('docs/migration/from-v3.md is out of date')
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryRootForDocs = path.resolve(scriptDir, '..')

const exampleDocs = buildAllGeneratedExampleDocs(repositoryRootForDocs)
for (const [docPath, expectedContent] of Object.entries(exampleDocs)) {
  const relativePath = path.relative(repositoryRootForDocs, docPath)
  try {
    const currentContent = readFileSync(docPath, 'utf8')
    if (currentContent !== expectedContent) {
      mismatches.push(`${relativePath} is out of date`)
    }
  } catch {
    mismatches.push(`${relativePath} is missing`)
  }
}

if (mismatches.length > 0) {
  throw new Error(mismatches.join('\n'))
}
