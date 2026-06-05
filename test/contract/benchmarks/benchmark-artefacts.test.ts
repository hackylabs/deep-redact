import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { benchmarkResultsDocPath, buildBenchmarkResultsDoc } from '../../../scripts/benchmark-runner.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const requiredArtefactKeys = [
  'id',
  'workloadClass',
  'runtime',
  'conditions',
  'comparator',
  'subject',
  'measurements',
  'overheadPct',
  'thresholdDecision',
  'generatedAt',
  'generatingPlatform',
]

const requiredThresholdDecisionKeys = ['passed', 'metric', 'minOverheadPct', 'maxOverheadPct', 'runScope']

describe('benchmark artefacts contract', () => {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, 'test/bench/manifest.json'), 'utf8'),
  ) as {
    rows: Array<{
      id: string;
      outputArtefact: string;
      thresholdPolicy: {
        comparatorMetric: string;
        minOverheadPct: number;
        maxOverheadPct: number;
        runScope: string[];
        minOverheadRationale?: string;
      };
    }>;
  }

  it('every manifest row has a corresponding committed artefact file', () => {
    for (const row of manifest.rows) {
      const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)
      expect(existsSync(artefactPath), `artefact missing for row ${row.id}: ${row.outputArtefact}`).toBe(true)
    }
  })

  it('every committed artefact is valid JSON with all required BenchmarkArtefact fields', () => {
    for (const row of manifest.rows) {
      const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)
      const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as Record<string, unknown>

      for (const key of requiredArtefactKeys) {
        expect(artefact, `artefact ${row.outputArtefact} missing field: ${key}`).toHaveProperty(key)
      }
    }
  })

  it('thresholdDecision on each committed artefact has all required fields', () => {
    for (const row of manifest.rows) {
      const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)
      const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as {
        thresholdDecision: Record<string, unknown>;
      }

      for (const key of requiredThresholdDecisionKeys) {
        expect(
          artefact.thresholdDecision,
          `thresholdDecision in ${row.outputArtefact} missing field: ${key}`,
        ).toHaveProperty(key)
      }
    }
  })

  it('thresholdDecision on each committed artefact matches the current manifest policy', () => {
    for (const row of manifest.rows) {
      const artefactPath = path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)
      const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as {
        overheadPct: number | null;
        thresholdDecision: Record<string, unknown>;
      }

      expect(artefact.thresholdDecision.metric, `${row.outputArtefact} metric is stale`).toBe(row.thresholdPolicy.comparatorMetric)
      expect(artefact.thresholdDecision.minOverheadPct, `${row.outputArtefact} min overhead is stale`).toBe(row.thresholdPolicy.minOverheadPct)
      expect(artefact.thresholdDecision.maxOverheadPct, `${row.outputArtefact} max overhead is stale`).toBe(row.thresholdPolicy.maxOverheadPct)
      expect(artefact.thresholdDecision.runScope, `${row.outputArtefact} run scope is stale`).toEqual(row.thresholdPolicy.runScope)
      expect(artefact.thresholdDecision.passed, `${row.outputArtefact} passed decision is stale`).toBe(
        artefact.overheadPct !== null &&
        artefact.overheadPct >= row.thresholdPolicy.minOverheadPct &&
        artefact.overheadPct <= row.thresholdPolicy.maxOverheadPct,
      )

      if (row.thresholdPolicy.minOverheadRationale === undefined) {
        expect(
          artefact.thresholdDecision,
          `${row.outputArtefact} should not retain obsolete minOverheadRationale metadata`,
        ).not.toHaveProperty('minOverheadRationale')
      } else {
        expect(
          artefact.thresholdDecision.minOverheadRationale,
          `${row.outputArtefact} min overhead rationale is stale`,
        ).toBe(row.thresholdPolicy.minOverheadRationale)
      }
    }
  })

  it('docs/benchmarks/results.md exists on disk', () => {
    const resultsDocPath = benchmarkResultsDocPath(repoRoot)
    expect(existsSync(resultsDocPath), 'docs/benchmarks/results.md does not exist').toBe(true)
  })

  it('docs/benchmarks/results.md matches generated doc from committed artefacts', () => {
    const resultsDocPath = benchmarkResultsDocPath(repoRoot)
    const expected = buildBenchmarkResultsDoc(repoRoot)
    const current = readFileSync(resultsDocPath, 'utf8')
    expect(current).toBe(expected)
  })
})
