import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from './generated-files.ts'

try {
  mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })
  writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())
  console.log(`Wrote standardisation guide: ${generatedFilePaths.standardisationGuideDocPath}`)
} catch (err) {
  process.stderr.write(
    `Error writing standardisation guide to ${generatedFilePaths.standardisationGuideDocPath}: ${err instanceof Error ? err.message : String(err)}\n`,
  )
  process.exit(1)
}
