import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('benchmark workflow contract', () => {
  it('runs benchmark verification in protected-branch gate scope for pull requests', () => {
    const workflow = readFileSync(path.join(repoRoot, '.github/workflows/benchmark.yml'), 'utf8')
    const verifyStep = workflow.match(/-\s+run:\s+pnpm run verify:benchmarks[\s\S]*?(?=\n\s+-\s+run:|\n\s+-\s+uses:|\n\S|$)/)

    expect(verifyStep?.[0], 'benchmark verification step is missing').toBeDefined()
    expect(verifyStep?.[0]).toContain('DEEP_REDACT_BENCH_RUN_SCOPE: protected-branch')
  })
})
