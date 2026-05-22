import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildGeneratedOneWayRedactionDocument,
  generatedFilePaths,
} from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.oneWayRedactionDocPath), { recursive: true })
writeFileSync(generatedFilePaths.oneWayRedactionDocPath, buildGeneratedOneWayRedactionDocument())
