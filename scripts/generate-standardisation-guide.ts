import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })
writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())
console.log(`Wrote standardisation guide: ${generatedFilePaths.standardisationGuideDocPath}`)
