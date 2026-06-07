import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAllGeneratedExampleDocs } from './generated-files.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docs = buildAllGeneratedExampleDocs(repositoryRoot)

for (const [docPath, content] of Object.entries(docs)) {
  mkdirSync(path.dirname(docPath), { recursive: true })
  writeFileSync(docPath, content, 'utf8')
  console.log(`Generated ${path.relative(repositoryRoot, docPath)}`)
}
