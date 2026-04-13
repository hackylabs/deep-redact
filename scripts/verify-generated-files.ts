import { readFileSync } from 'node:fs'
import {
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

if (mismatches.length > 0) {
  throw new Error(mismatches.join('\n'))
}
