import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  benchmarkResultsDocPath,
  buildBenchmarkResultsDoc,
  loadBenchmarkManifest,
  type BenchmarkArtefact,
} from './benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const runScope = process.env.DEEP_REDACT_BENCH_RUN_SCOPE ?? ''
const isGateScope = runScope === 'protected-branch' || runScope === 'release-candidate'

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runCli()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

async function runCli(): Promise<void> {
  const manifest = loadBenchmarkManifest(repoRoot)
  const failures: string[] = []
  const mismatches: string[] = []

  for (const row of manifest.rows) {
    const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)

    if (!existsSync(artefactPath)) {
      throw new Error(`Benchmark artefact missing: ${row.outputArtefact}`)
    }

    const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as BenchmarkArtefact

    console.log(
      `[${row.id}] overhead: ${artefact.overheadPct}% | threshold: ${artefact.thresholdDecision.minOverheadPct}%–${artefact.thresholdDecision.maxOverheadPct}% | passed: ${artefact.thresholdDecision.passed}`,
    )

    if (
      isGateScope &&
      artefact.thresholdDecision.runScope.includes(runScope) &&
      !artefact.thresholdDecision.passed
    ) {
      const reason = artefact.overheadPct > artefact.thresholdDecision.maxOverheadPct
        ? `exceeds max threshold ${artefact.thresholdDecision.maxOverheadPct}%`
        : `is below min threshold ${artefact.thresholdDecision.minOverheadPct}%`
      failures.push(`${row.id}: overhead ${artefact.overheadPct}% ${reason}`)
    }
  }

  const expectedDoc = buildBenchmarkResultsDoc(repoRoot)

  if (existsSync(benchmarkResultsDocPath)) {
    const currentDoc = readFileSync(benchmarkResultsDocPath, 'utf8')
    if (currentDoc !== expectedDoc) {
      mismatches.push('docs/benchmarks/results.md is out of date')
    }
  } else {
    mismatches.push('docs/benchmarks/results.md is missing')
  }

  const allIssues = [...failures, ...mismatches]
  if (allIssues.length > 0) {
    throw new Error(allIssues.join('\n'))
  }

  console.log('Benchmark verification passed.')
}
