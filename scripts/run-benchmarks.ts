import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBenchmarkManifest, runBenchmarkRow, writeArtefact } from './benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

const idFlag = process.argv.indexOf('--id')
const targetId = idFlag === -1 ? undefined : process.argv[idFlag + 1]

const manifest = loadBenchmarkManifest(repoRoot)
const rows = targetId === undefined ? manifest.rows : manifest.rows.filter(r => r.id === targetId)

for (const row of rows) {
  const artefact = runBenchmarkRow(row, repoRoot)
  const outputPath = writeArtefact(artefact, repoRoot, row.outputArtefact)
  console.log(`Wrote artefact: ${outputPath}`)
}
