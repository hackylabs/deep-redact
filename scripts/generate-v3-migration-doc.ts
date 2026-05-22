import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildGeneratedV3MigrationGuide,
  generatedFilePaths,
} from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.v3MigrationGuidePath), { recursive: true })
writeFileSync(generatedFilePaths.v3MigrationGuidePath, buildGeneratedV3MigrationGuide())
