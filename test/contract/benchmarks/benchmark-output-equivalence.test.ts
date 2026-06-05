import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deepRedact } from '@hackylabs/deep-redact'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

interface BenchmarkRow {
  id: string;
  fixtureDir: string;
  competitor: string;
  competitorConfigFile?: string;
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown
}

function cloneJson(value: unknown): unknown {
  return structuredClone(value)
}

function normaliseOutput(output: unknown): unknown {
  return typeof output === 'string'
    ? JSON.parse(output) as unknown
    : output
}

describe('benchmark output equivalence contract', () => {
  const manifest = readJson(path.join(repoRoot, 'test/bench/manifest.json')) as { rows: BenchmarkRow[] }

  it('produces equivalent redacted output for every benchmark row', () => {
    for (const row of manifest.rows) {
      const configFileName = row.competitorConfigFile ?? 'competitor-config.json'
      const fixturePath = path.join(repoRoot, row.fixtureDir)
      const subjectConfig = readJson(path.join(fixturePath, 'deep-redact-config.json')) as Record<string, unknown>
      const competitorConfig = readJson(path.join(fixturePath, configFileName)) as Record<string, unknown>
      const payload = readJson(path.join(fixturePath, 'input.json'))
      const competitorPath = row.competitor.startsWith('./')
        ? path.resolve(repoRoot, row.competitor)
        : row.competitor

      const subjectRedactor = deepRedact(subjectConfig)
      const competitorFactory = require(competitorPath) as (config: Record<string, unknown>) => (payload: unknown) => unknown
      const competitorRedactor = competitorFactory(competitorConfig)

      const subjectOutput = normaliseOutput(subjectRedactor(cloneJson(payload)))
      const competitorOutput = normaliseOutput(competitorRedactor(cloneJson(payload)))

      expect(subjectOutput, `subject output diverged from comparator for ${row.id}`).toEqual(competitorOutput)
    }
  })
})
