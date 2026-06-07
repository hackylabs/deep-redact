import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deepRedact } from '@hackylabs/deep-redact'

const require = createRequire(import.meta.url)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = path.resolve(scriptDirectory, '..')

// Multiple warmup rounds ensure JIT is fully compiled and V8 heap layout is stable
// before any heap measurements are taken.
const WARMUP_ITERATIONS = 50_000
const SAMPLE_COUNT = 100
const BATCH_SIZE = 500
const TOTAL_MEASUREMENT_ITERATIONS = SAMPLE_COUNT * BATCH_SIZE

function forceGc(): void {
  const maybeGc = (globalThis as { gc?: () => void }).gc
  if (typeof maybeGc === 'function') {
    maybeGc()
    maybeGc()
  }
}

export interface ResourceMeasurementStats {
  baselineHeapUsedBytes: number;
  peakHeapUsedBytes: number;
  afterGcHeapUsedBytes: number;
  heapDeltaBeforeGcBytes: number;
  heapDeltaAfterGcBytes: number;
  baselineRssBytes: number;
  peakRssBytes: number;
}

export interface ResourceBenchmarkRow {
  id: string;
  fixtureDir: string;
  workloadClass: string;
  competitor: string;
  competitorConfigFile?: string;
  runtime: string;
  command: string;
  outputArtefact: string;
}

export interface ResourceBenchmarkManifest {
  schemaVersion: number;
  metadata: Record<string, unknown>;
  rows: ResourceBenchmarkRow[];
}

export interface ResourceBenchmarkArtefact {
  id: string;
  workloadClass: string;
  runtime: string;
  conditions: {
    nodeVersion: string;
    platform: string;
    arch: string;
    warmupIterations: number;
    measurementBatches: number;
    batchSize: number;
    totalMeasurementIterations: number;
    gcExposed: boolean;
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
    subject: ResourceMeasurementStats;
    comparator: ResourceMeasurementStats;
  };
  generatingPlatform: {
    os: string;
    arch: string;
    nodeVersion: string;
  };
  generatedAt: string;
}

export function loadResourceBenchmarkManifest(repoRoot: string): ResourceBenchmarkManifest {
  const manifestPath = path.join(repoRoot, 'test/bench/resource-manifest.json')
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw) as ResourceBenchmarkManifest
}

export function collectResourceSamples(fn: (fresh: unknown) => void, payload: unknown): ResourceMeasurementStats {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn(structuredClone(payload))
  }

  forceGc()
  forceGc()

  const baselineMem = process.memoryUsage()
  const baselineHeapUsedBytes = baselineMem.heapUsed
  const baselineRssBytes = baselineMem.rss

  let peakHeapUsedBytes = baselineHeapUsedBytes
  let peakRssBytes = baselineRssBytes

  for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
    for (let i = 0; i < BATCH_SIZE; i++) {
      fn(structuredClone(payload))
    }
    const mem = process.memoryUsage()
    if (mem.heapUsed > peakHeapUsedBytes) peakHeapUsedBytes = mem.heapUsed
    if (mem.rss > peakRssBytes) peakRssBytes = mem.rss
  }

  forceGc()
  forceGc()

  const afterGcHeapUsedBytes = process.memoryUsage().heapUsed

  return {
    baselineHeapUsedBytes,
    peakHeapUsedBytes,
    afterGcHeapUsedBytes,
    heapDeltaBeforeGcBytes: peakHeapUsedBytes - baselineHeapUsedBytes,
    heapDeltaAfterGcBytes: afterGcHeapUsedBytes - baselineHeapUsedBytes,
    baselineRssBytes,
    peakRssBytes,
  }
}

export function runResourceBenchmarkRow(row: ResourceBenchmarkRow, repoRoot: string): ResourceBenchmarkArtefact {
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

  const gcExposed = typeof (globalThis as { gc?: () => void }).gc === 'function'

  const subjectStats = collectResourceSamples(fresh => redactor(fresh), payload)
  const comparatorStats = collectResourceSamples(fresh => frInstance(fresh), payload)

  return {
    id: row.id,
    workloadClass: row.workloadClass,
    runtime: row.runtime,
    conditions: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      warmupIterations: WARMUP_ITERATIONS,
      measurementBatches: SAMPLE_COUNT,
      batchSize: BATCH_SIZE,
      totalMeasurementIterations: TOTAL_MEASUREMENT_ITERATIONS,
      gcExposed,
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
    generatingPlatform: {
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function writeResourceArtefact(artefact: ResourceBenchmarkArtefact, repoRoot: string, outputArtefact: string): string {
  const outputDir = path.join(repoRoot, 'test/artefacts/benchmarks/resource')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, outputArtefact)
  writeFileSync(outputPath, JSON.stringify(artefact, null, 2) + '\n')
  return outputPath
}

export function resourceBenchmarkResultsDocPath(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'benchmarks', 'resource-results.md')
}

function fmtKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

export function buildResourceBenchmarkResultsDoc(repoRoot: string): string {
  const manifest = loadResourceBenchmarkManifest(repoRoot)
  const sections: string[] = [
    '# Resource Usage Benchmark Results',
    '',
    'Generated from canonical resource benchmark artefacts in `test/artefacts/benchmarks/resource/`.',
    '',
    '> Heap values are sampled between batches of 500 calls after 50,000 warmup iterations.',
    '> `gcExposed: true` means Node was started with `--expose-gc`, enabling deterministic GC between phases.',
  ]

  for (const row of manifest.rows) {
    const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks/resource', row.outputArtefact)
    if (!existsSync(artefactPath)) {
      throw new Error(`Resource benchmark artefact missing: ${row.outputArtefact}`)
    }
    const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as ResourceBenchmarkArtefact
    const { conditions, comparator, subject, measurements } = artefact

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
      `| Warmup iterations | ${String(conditions.warmupIterations)} |`,
      `| Measurement iterations | ${String(conditions.totalMeasurementIterations)} |`,
      `| GC exposed | ${conditions.gcExposed} |`,
      '',
      '### Measurements',
      '',
      `| Metric | ${subjectHeader} | ${comparatorHeader} |`,
      `|--------|${'-'.repeat(subjectHeader.length + 2)}|${'-'.repeat(comparatorHeader.length + 2)}|`,
      `| Baseline heap used | ${fmtKiB(measurements.subject.baselineHeapUsedBytes)} | ${fmtKiB(measurements.comparator.baselineHeapUsedBytes)} |`,
      `| Peak heap used | ${fmtKiB(measurements.subject.peakHeapUsedBytes)} | ${fmtKiB(measurements.comparator.peakHeapUsedBytes)} |`,
      `| After-GC heap used | ${fmtKiB(measurements.subject.afterGcHeapUsedBytes)} | ${fmtKiB(measurements.comparator.afterGcHeapUsedBytes)} |`,
      `| Heap delta (before GC) | ${fmtKiB(measurements.subject.heapDeltaBeforeGcBytes)} | ${fmtKiB(measurements.comparator.heapDeltaBeforeGcBytes)} |`,
      `| Heap delta (after GC) | ${fmtKiB(measurements.subject.heapDeltaAfterGcBytes)} | ${fmtKiB(measurements.comparator.heapDeltaAfterGcBytes)} |`,
      `| Baseline RSS | ${fmtKiB(measurements.subject.baselineRssBytes)} | ${fmtKiB(measurements.comparator.baselineRssBytes)} |`,
      `| Peak RSS | ${fmtKiB(measurements.subject.peakRssBytes)} | ${fmtKiB(measurements.comparator.peakRssBytes)} |`,
    )
  }

  return sections.join('\n') + '\n'
}
