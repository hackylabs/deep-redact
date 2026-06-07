import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deepRedact } from '@hackylabs/deep-redact'

const require = createRequire(import.meta.url)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = path.resolve(scriptDirectory, '..')

// Measured calls are batched: each timed sample runs BATCH_SIZE calls and divides the elapsed
// redaction time by the batch size. Clones are prepared one at a time and clone-preparation time
// is subtracted from the batch window, avoiding unrealistic simultaneous batch pre-allocation
// while still keeping clone work outside the measured redaction cost. SAMPLE_COUNT * BATCH_SIZE
// == ITERATIONS.
const SAMPLE_COUNT = 200
const BATCH_SIZE = 500
const ITERATIONS = SAMPLE_COUNT * BATCH_SIZE
const WARMUP_ITERATIONS = 10_000

export interface BenchmarkThresholdPolicy {
  comparatorMetric: string;
  minOverheadPct: number;
  minOverheadRationale?: string;
  maxOverheadPct: number;
  runScope: string[];
}

export interface BenchmarkRow {
  id: string;
  fixtureDir: string;
  workloadClass: string;
  competitor: string;
  competitorConfigFile?: string;
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
  overheadPct: number | null;
  comparatorMetricWasZero?: true;
  generatingPlatform: {
    os: string;
    arch: string;
    nodeVersion: string;
  };
  thresholdDecision: {
    passed: boolean;
    metric: string;
    minOverheadPct: number;
    minOverheadRationale?: string;
    maxOverheadPct: number;
    runScope: string[];
  };
  generatedAt: string;
}

export function loadBenchmarkManifest(repoRoot: string): BenchmarkManifest {
  const manifestPath = path.join(repoRoot, 'test/bench/speed-manifest.json')
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw) as BenchmarkManifest
}

export function collectSamples(fn: (fresh: unknown) => void, payload: unknown): MeasurementStats {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn(structuredClone(payload))
  }

  // Each sample is the mean per-call redaction time over freshly-cloned payloads.
  const samples: number[] = []
  for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
    const t0 = performance.now()
    let cloneElapsed = 0
    for (let i = 0; i < BATCH_SIZE; i++) {
      const cloneStart = performance.now()
      const fresh = structuredClone(payload)
      cloneElapsed += performance.now() - cloneStart
      fn(fresh)
    }
    const elapsed = performance.now() - t0 - cloneElapsed
    if (elapsed <= 0) {
      throw new Error('Benchmark sample produced non-positive redaction time after clone subtraction.')
    }

    samples.push(elapsed / BATCH_SIZE)
  }

  samples.sort((a, b) => a - b)
  const median = samples[Math.floor(samples.length / 2)]
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length
  const min = samples[0]
  const max = samples.at(-1) as number

  return { median, mean, min, max, unit: 'ms' }
}

export function runBenchmarkRow(row: BenchmarkRow, repoRoot: string): BenchmarkArtefact {
  const configFileName = row.competitorConfigFile ?? 'competitor-config.json'
  const subjectConfigPath = path.join(repoRoot, row.fixtureDir, 'deep-redact-config.json')
  const competitorConfigPath = path.join(repoRoot, row.fixtureDir, configFileName)
  const payloadPath = path.join(repoRoot, row.fixtureDir, 'input.json')

  const subjectConfig = JSON.parse(readFileSync(subjectConfigPath, 'utf8')) as Record<string, unknown>
  const frConfig = JSON.parse(readFileSync(competitorConfigPath, 'utf8')) as Record<string, unknown>
  const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as unknown

  const subjectPkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { name: string; version: string }

  const isLocalCompetitor = row.competitor.startsWith('./')
  const resolvedCompetitorPath = isLocalCompetitor
    ? path.resolve(repoRoot, row.competitor)
    : row.competitor
  const competitorPkgPath = isLocalCompetitor
    ? path.join(resolvedCompetitorPath, 'package.json')
    : path.join(repoRoot, 'node_modules', row.competitor, 'package.json')
  const competitorPkg = JSON.parse(readFileSync(competitorPkgPath, 'utf8')) as { version: string }

  const redactor = deepRedact(subjectConfig)

  const competitorFn = require(resolvedCompetitorPath) as (config: Record<string, unknown>) => (payload: unknown) => unknown
  const frInstance = competitorFn(frConfig)

  const subjectStats = collectSamples(fresh => redactor(fresh), payload)

  const comparatorStats = collectSamples(fresh => frInstance(fresh), payload)

  const metric = row.thresholdPolicy.comparatorMetric as keyof MeasurementStats
  const comparatorValue = comparatorStats[metric] as number | undefined
  const subjectValue = subjectStats[metric] as number | undefined

  if (comparatorValue === undefined || subjectValue === undefined) {
    throw new Error(
      `Unknown comparatorMetric "${row.thresholdPolicy.comparatorMetric}" for row "${row.id}". Valid metrics: median, mean, min, max`,
    )
  }

  let overheadPct: number | null
  let comparatorMetricWasZero = false
  if (comparatorValue === 0) {
    overheadPct = null
    comparatorMetricWasZero = true
  } else {
    overheadPct = Math.round(
      ((subjectValue - comparatorValue) / comparatorValue) * 100 * 100,
    ) / 100
  }

  const passed = overheadPct !== null &&
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
      version: competitorPkg.version,
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
    ...(comparatorMetricWasZero ? { comparatorMetricWasZero: true as const } : {}),
    generatingPlatform: {
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    thresholdDecision: {
      passed,
      metric: row.thresholdPolicy.comparatorMetric,
      minOverheadPct: row.thresholdPolicy.minOverheadPct,
      ...(row.thresholdPolicy.minOverheadRationale === undefined
        ? {}
        : { minOverheadRationale: row.thresholdPolicy.minOverheadRationale }),
      maxOverheadPct: row.thresholdPolicy.maxOverheadPct,
      runScope: row.thresholdPolicy.runScope,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function writeArtefact(artefact: BenchmarkArtefact, repoRoot: string, outputArtefact: string): string {
  const outputDir = path.join(repoRoot, 'test/artefacts/benchmarks/speed')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, outputArtefact)
  writeFileSync(outputPath, JSON.stringify(artefact, null, 2) + '\n')
  return outputPath
}

export function benchmarkResultsDocPath(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'benchmarks', 'speed-results.md')
}

export function buildBenchmarkResultsDoc(repoRoot: string): string {
  const manifest = loadBenchmarkManifest(repoRoot)
  const sections: string[] = [
    '# Benchmark Results',
    '',
    'Generated from canonical benchmark artefacts in `test/artefacts/benchmarks/speed/`.',
  ]

  for (const row of manifest.rows) {
    const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks/speed', row.outputArtefact)
    if (!existsSync(artefactPath)) {
      throw new Error(`Benchmark artefact missing: ${row.outputArtefact}`)
    }
    const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as BenchmarkArtefact
    const { conditions, comparator, subject, measurements, overheadPct, thresholdDecision } = artefact

    const subjectHeader = `${subject.name} ${subject.version}`
    const comparatorHeader = `${comparator.name} ${comparator.version}`
    const thresholdLines = [
      `**Overhead:** ${overheadPct === null ? 'N/A (comparator metric was zero)' : `${overheadPct}%`}`,
      `**Policy:** ${thresholdDecision.metric} within ${thresholdDecision.minOverheadPct}% to ${thresholdDecision.maxOverheadPct}%`,
      ...(thresholdDecision.minOverheadRationale === undefined
        ? []
        : [`**Lower-bound rationale:** ${thresholdDecision.minOverheadRationale}`]),
      `**Gate scope:** ${thresholdDecision.runScope.join(', ')}`,
      `**Result:** ${thresholdDecision.passed ? 'PASSED' : 'FAILED'}`,
    ]

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
      ...thresholdLines,
    )
  }

  return sections.join('\n') + '\n'
}
