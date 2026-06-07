import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadResourceBenchmarkManifest, runResourceBenchmarkRow, writeResourceArtefact } from './resource-benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

const idFlag = process.argv.indexOf('--id')
let targetId: string | undefined
if (idFlag !== -1) {
  const next = process.argv[idFlag + 1]
  if (!next || next.startsWith('--')) {
    throw new Error('--id requires a value')
  }
  targetId = next
}

const manifest = loadResourceBenchmarkManifest(repoRoot)
const rows = targetId === undefined ? manifest.rows : manifest.rows.filter(r => r.id === targetId)

if (targetId !== undefined && rows.length === 0) {
  throw new Error(`no resource benchmark row found with id "${targetId}"`)
}

for (const row of rows) {
  const artefact = runResourceBenchmarkRow(row, repoRoot)
  const outputPath = writeResourceArtefact(artefact, repoRoot, row.outputArtefact)
  console.log(`Wrote artefact: ${outputPath}`)
}
