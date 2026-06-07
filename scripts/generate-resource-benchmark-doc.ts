import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildResourceBenchmarkResultsDoc, resourceBenchmarkResultsDocPath } from './resource-benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

const content = buildResourceBenchmarkResultsDoc(repoRoot)
const outputPath = resourceBenchmarkResultsDocPath(repoRoot)

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, content)
console.log(`Wrote resource benchmark results doc: ${outputPath}`)
