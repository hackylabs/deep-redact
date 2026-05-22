import { readFileSync } from 'node:fs'
import {
  buildGeneratedFastRedactMigrationGuide,
  buildGeneratedOneWayRedactionDocument,
  buildGeneratedPrecedenceDocument,
  buildGeneratedReadme,
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

if (mismatches.length > 0) {
  throw new Error(mismatches.join('\n'))
}
