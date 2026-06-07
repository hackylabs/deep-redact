import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildGeneratedPrecedenceDocument,
  generatedFilePaths,
} from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.precedenceDocPath), { recursive: true })
writeFileSync(generatedFilePaths.precedenceDocPath, buildGeneratedPrecedenceDocument())
