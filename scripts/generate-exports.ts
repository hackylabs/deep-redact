import { writeFileSync } from 'node:fs'
import { generatedFilePaths, readPackageJson, serialisePackageJson } from './generated-files.ts'

writeFileSync(
  generatedFilePaths.packageJsonPath,
  serialisePackageJson(readPackageJson()),
)
