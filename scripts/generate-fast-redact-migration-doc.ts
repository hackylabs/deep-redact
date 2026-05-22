import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildGeneratedFastRedactMigrationGuide,
  generatedFilePaths,
} from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.fastRedactMigrationGuidePath), { recursive: true })
writeFileSync(generatedFilePaths.fastRedactMigrationGuidePath, buildGeneratedFastRedactMigrationGuide())
