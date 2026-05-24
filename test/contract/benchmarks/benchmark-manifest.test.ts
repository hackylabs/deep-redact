import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const requiredRowKeys = [
  'id',
  'fixtureDir',
  'workloadClass',
  'competitor',
  'runtime',
  'command',
  'outputArtefact',
  'thresholdPolicy',
]

const requiredThresholdPolicyKeys = [
  'comparatorMetric',
  'minOverheadPct',
  'maxOverheadPct',
  'runScope',
]

const requiredFixtureFiles = ['input.json', 'deep-redact-config.json', 'competitor-config.json']

describe('benchmark manifest contract', () => {
  it('loads the canonical benchmark manifest without error', () => {
    const manifestPath = path.join(repoRoot, 'test/bench/manifest.json')
    expect(existsSync(manifestPath)).toBe(true)
    expect(() => JSON.parse(readFileSync(manifestPath, 'utf8'))).not.toThrow()
  })

  it('requires all eight fields on every row', () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'test/bench/manifest.json'), 'utf8')) as {
      rows: Record<string, unknown>[];
    }

    for (const row of manifest.rows) {
      for (const key of requiredRowKeys) {
        expect(row, `row missing field: ${key}`).toHaveProperty(key)
      }
    }
  })

  it('requires all four fields on every thresholdPolicy', () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'test/bench/manifest.json'), 'utf8')) as {
      rows: Array<Record<string, unknown>>;
    }

    for (const row of manifest.rows) {
      expect(
        row.thresholdPolicy,
        `row "${row.id}" is missing thresholdPolicy`,
      ).toBeDefined()
      for (const key of requiredThresholdPolicyKeys) {
        expect(row.thresholdPolicy as Record<string, unknown>, `thresholdPolicy missing field: ${key}`).toHaveProperty(key)
      }
    }
  })

  it('declares competitor as fast-redact for every path-based row', () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'test/bench/manifest.json'), 'utf8')) as {
      rows: Array<{ workloadClass: string; competitor: string }>;
    }

    for (const row of manifest.rows) {
      if (row.workloadClass === 'path-based') {
        expect(row.competitor).toBe('fast-redact')
      }
    }
  })

  it('has unique row ids', () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'test/bench/manifest.json'), 'utf8')) as {
      rows: Array<{ id: string }>;
    }

    const ids = manifest.rows.map(r => r.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('has a fixtureDir that exists on disk with all required fixture files for every row', () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'test/bench/manifest.json'), 'utf8')) as {
      rows: Array<{ fixtureDir: string }>;
    }

    for (const row of manifest.rows) {
      const fixturePath = path.join(repoRoot, row.fixtureDir)
      expect(existsSync(fixturePath), `fixtureDir does not exist: ${row.fixtureDir}`).toBe(true)

      for (const file of requiredFixtureFiles) {
        const filePath = path.join(fixturePath, file)
        expect(existsSync(filePath), `fixture file missing: ${row.fixtureDir}/${file}`).toBe(true)
      }
    }
  })
})
