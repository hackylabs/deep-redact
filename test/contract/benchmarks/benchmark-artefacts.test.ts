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
  ) as { rows: Array<{ id: string; outputArtefact: string }> }

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
