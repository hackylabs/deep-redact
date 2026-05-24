import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBenchmarkManifest, runBenchmarkRow, writeArtefact } from './benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

const idFlag = process.argv.indexOf('--id')
let targetId: string | undefined
if (idFlag !== -1) {
  const next = process.argv[idFlag + 1]
  if (!next || next.startsWith('--')) {
    console.error('Error: --id requires a value')
    process.exit(1)
  }
  targetId = next
}

const manifest = loadBenchmarkManifest(repoRoot)
const rows = targetId === undefined ? manifest.rows : manifest.rows.filter(r => r.id === targetId)

if (targetId !== undefined && rows.length === 0) {
  console.error(`Error: no benchmark row found with id "${targetId}"`)
  process.exit(1)
}

for (const row of rows) {
  const artefact = runBenchmarkRow(row, repoRoot)
  const outputPath = writeArtefact(artefact, repoRoot, row.outputArtefact)
  console.log(`Wrote artefact: ${outputPath}`)
}
