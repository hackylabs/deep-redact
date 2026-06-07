import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildResourceBenchmarkResultsDoc,
  loadResourceBenchmarkManifest,
  resourceBenchmarkResultsDocPath,
  type ResourceBenchmarkArtefact,
} from './resource-benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runCli()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

async function runCli(): Promise<void> {
  const manifest = loadResourceBenchmarkManifest(repoRoot)
  const mismatches: string[] = []

  for (const row of manifest.rows) {
    const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks/resource', row.outputArtefact)

    if (!existsSync(artefactPath)) {
      throw new Error(`Resource benchmark artefact missing: ${row.outputArtefact}`)
    }

    const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as ResourceBenchmarkArtefact
    const { subject, comparator, measurements } = artefact

    console.log(
      `[${row.id}] subject peak heap: ${(measurements.subject.peakHeapUsedBytes / 1024).toFixed(1)} KiB | comparator peak heap: ${(measurements.comparator.peakHeapUsedBytes / 1024).toFixed(1)} KiB | subject after-GC delta: ${(measurements.subject.heapDeltaAfterGcBytes / 1024).toFixed(1)} KiB`,
    )
    console.log(
      `  subject: ${subject.name} ${subject.version} | comparator: ${comparator.name} ${comparator.version} | gcExposed: ${artefact.conditions.gcExposed}`,
    )
  }

  const expectedDoc = buildResourceBenchmarkResultsDoc(repoRoot)
  const docPath = resourceBenchmarkResultsDocPath(repoRoot)

  if (existsSync(docPath)) {
    const currentDoc = readFileSync(docPath, 'utf8')
    if (currentDoc !== expectedDoc) {
      mismatches.push('docs/benchmarks/resource-results.md is out of date — run pnpm bench:resource:generate-doc')
    }
  } else {
    mismatches.push('docs/benchmarks/resource-results.md is missing — run pnpm bench:resource:generate-doc')
  }

  if (mismatches.length > 0) {
    throw new Error(mismatches.join('\n'))
  }

  console.log('Resource benchmark verification passed.')
}
