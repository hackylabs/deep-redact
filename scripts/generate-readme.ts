import { writeFileSync } from 'node:fs'
import { buildGeneratedReadme, generatedFilePaths } from './generated-files.ts'

writeFileSync(generatedFilePaths.readmePath, buildGeneratedReadme())
