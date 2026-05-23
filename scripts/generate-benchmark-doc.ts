import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { benchmarkResultsDocPath, buildBenchmarkResultsDoc } from './benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

const content = buildBenchmarkResultsDoc(repoRoot)
const outputPath = benchmarkResultsDocPath

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, content)
console.log(`Wrote benchmark results doc: ${outputPath}`)
