import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deepRedact } from '@hackylabs/deep-redact'

const require = createRequire(import.meta.url)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = path.resolve(scriptDirectory, '..')

const ITERATIONS = 100_000
const WARMUP_ITERATIONS = 10_000

export interface BenchmarkThresholdPolicy {
  comparatorMetric: string;
  minOverheadPct: number;
  maxOverheadPct: number;
  runScope: string[];
}

export interface BenchmarkRow {
  id: string;
  fixtureDir: string;
  workloadClass: string;
  competitor: string;
  runtime: string;
  command: string;
  outputArtefact: string;
  thresholdPolicy: BenchmarkThresholdPolicy;
}

export interface BenchmarkManifest {
  schemaVersion: number;
  metadata: Record<string, unknown>;
  rows: BenchmarkRow[];
}

export interface MeasurementStats {
  median: number;
  mean: number;
  min: number;
  max: number;
  unit: 'ms';
}

export interface BenchmarkArtefact {
  id: string;
  workloadClass: string;
  runtime: string;
  conditions: {
    nodeVersion: string;
    platform: string;
    arch: string;
    iterations: number;
    warmupIterations: number;
  };
  comparator: {
    name: string;
    version: string;
  };
  subject: {
    name: string;
    version: string;
  };
  measurements: {
    subject: MeasurementStats;
    comparator: MeasurementStats;
  };
  overheadPct: number;
  thresholdDecision: {
    passed: boolean;
    metric: string;
    minOverheadPct: number;
    maxOverheadPct: number;
    runScope: string[];
  };
  generatedAt: string;
}

export function loadBenchmarkManifest(repoRoot: string): BenchmarkManifest {
  const manifestPath = path.join(repoRoot, 'test/bench/manifest.json')
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw) as BenchmarkManifest
}

function collectSamples(fn: (fresh: unknown) => void, payload: unknown): MeasurementStats {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn(structuredClone(payload))
  }

  const samples: number[] = []
  for (let i = 0; i < ITERATIONS; i++) {
    const fresh = structuredClone(payload)
    const t0 = performance.now()
    fn(fresh)
    samples.push(performance.now() - t0)
  }

  samples.sort((a, b) => a - b)
  const median = samples[Math.floor(samples.length / 2)]
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length
  const min = samples[0]
  const max = samples.at(-1) as number

  return { median, mean, min, max, unit: 'ms' }
}

export function runBenchmarkRow(row: BenchmarkRow, repoRoot: string): BenchmarkArtefact {
  const subjectConfigPath = path.join(repoRoot, row.fixtureDir, 'deep-redact-config.json')
  const competitorConfigPath = path.join(repoRoot, row.fixtureDir, 'competitor-config.json')
  const payloadPath = path.join(repoRoot, row.fixtureDir, 'input.json')

  const subjectConfig = JSON.parse(readFileSync(subjectConfigPath, 'utf8')) as Record<string, unknown>
  const frConfig = JSON.parse(readFileSync(competitorConfigPath, 'utf8')) as Record<string, unknown>
  const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as unknown

  const subjectPkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { name: string; version: string }
  const frPkg = JSON.parse(readFileSync(path.join(repoRoot, 'node_modules/fast-redact/package.json'), 'utf8')) as { version: string }

  const redactor = deepRedact(subjectConfig)

  const fastRedact = require('fast-redact') as (config: Record<string, unknown>) => (payload: unknown) => unknown
  const frInstance = fastRedact(frConfig)

  const subjectStats = collectSamples(fresh => redactor(fresh), payload)

  const comparatorStats = collectSamples(fresh => frInstance(fresh), payload)

  const overheadPct = Math.round(
    ((subjectStats.median - comparatorStats.median) / comparatorStats.median) * 100 * 100,
  ) / 100

  const passed =
    overheadPct <= row.thresholdPolicy.maxOverheadPct &&
    overheadPct >= row.thresholdPolicy.minOverheadPct

  return {
    id: row.id,
    workloadClass: row.workloadClass,
    runtime: row.runtime,
    conditions: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      iterations: ITERATIONS,
      warmupIterations: WARMUP_ITERATIONS,
    },
    comparator: {
      name: row.competitor,
      version: frPkg.version,
    },
    subject: {
      name: subjectPkg.name,
      version: subjectPkg.version,
    },
    measurements: {
      subject: subjectStats,
      comparator: comparatorStats,
    },
    overheadPct,
    thresholdDecision: {
      passed,
      metric: row.thresholdPolicy.comparatorMetric,
      minOverheadPct: row.thresholdPolicy.minOverheadPct,
      maxOverheadPct: row.thresholdPolicy.maxOverheadPct,
      runScope: row.thresholdPolicy.runScope,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function writeArtefact(artefact: BenchmarkArtefact, repoRoot: string, outputArtefact: string): string {
  const outputDir = path.join(repoRoot, 'test/artefacts/benchmarks')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, outputArtefact)
  writeFileSync(outputPath, JSON.stringify(artefact, null, 2) + '\n')
  return outputPath
}

export const benchmarkResultsDocPath = path.join(repositoryRoot, 'docs', 'benchmarks', 'results.md')

export function buildBenchmarkResultsDoc(repoRoot: string): string {
  const manifest = loadBenchmarkManifest(repoRoot)
  const sections: string[] = [
    '# Benchmark Results',
    '',
    'Generated from canonical benchmark artefacts in `test/artefacts/benchmarks/`.',
  ]

  for (const row of manifest.rows) {
    const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)
    if (!existsSync(artefactPath)) {
      throw new Error(`Benchmark artefact missing: ${row.outputArtefact}`)
    }
    const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as BenchmarkArtefact
    const { conditions, comparator, subject, measurements, overheadPct, thresholdDecision } = artefact

    const subjectHeader = `${subject.name} ${subject.version}`
    const comparatorHeader = `${comparator.name} ${comparator.version}`

    sections.push(
      '',
      `## ${row.id}`,
      '',
      `**Workload class:** ${artefact.workloadClass}`,
      `**Runtime:** ${artefact.runtime}`,
      '',
      '### Conditions',
      '',
      '| Parameter | Value |',
      '|-----------|-------|',
      `| Node version | ${conditions.nodeVersion} |`,
      `| Platform | ${conditions.platform} |`,
      `| Architecture | ${conditions.arch} |`,
      `| Iterations | ${conditions.iterations} |`,
      `| Warmup iterations | ${conditions.warmupIterations} |`,
      '',
      '### Comparator',
      '',
      `**Name:** ${comparator.name}`,
      `**Version:** ${comparator.version}`,
      '',
      '### Measurements',
      '',
      `| Metric | ${subjectHeader} | ${comparatorHeader} |`,
      `|--------|${'-'.repeat(subjectHeader.length + 2)}|${'-'.repeat(comparatorHeader.length + 2)}|`,
      `| Median | ${measurements.subject.median.toFixed(6)} ms | ${measurements.comparator.median.toFixed(6)} ms |`,
      `| Mean | ${measurements.subject.mean.toFixed(6)} ms | ${measurements.comparator.mean.toFixed(6)} ms |`,
      `| Min | ${measurements.subject.min.toFixed(6)} ms | ${measurements.comparator.min.toFixed(6)} ms |`,
      `| Max | ${measurements.subject.max.toFixed(6)} ms | ${measurements.comparator.max.toFixed(6)} ms |`,
      '',
      '### Threshold',
      '',
      `**Overhead:** ${overheadPct}%`,
      `**Policy:** ${thresholdDecision.metric} within ${thresholdDecision.minOverheadPct}% to ${thresholdDecision.maxOverheadPct}%`,
      `**Gate scope:** ${thresholdDecision.runScope.join(', ')}`,
      `**Result:** ${thresholdDecision.passed ? 'PASSED' : 'FAILED'}`,
    )
  }

  return sections.join('\n') + '\n'
}
