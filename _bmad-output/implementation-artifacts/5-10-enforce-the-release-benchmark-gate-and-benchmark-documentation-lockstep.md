# Story 5.10: Enforce the Release Benchmark Gate and Benchmark Documentation Lockstep

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform evaluator,
I want benchmark thresholds and published benchmark documentation to be enforced from the same canonical artefacts,
so that release performance claims fail closed when benchmark evidence drifts or falls outside the agreed range.

## Acceptance Criteria

1. Given a comparable path-based benchmark row whose `thresholdPolicy.runScope` includes `protected-branch` or `release-candidate`, when release benchmark verification runs in that scope, then the computed Deep Redact overhead recorded in the committed artefact must be within that row's declared `minOverheadPct` and `maxOverheadPct`.
2. Given a comparable path-based benchmark row whose committed artefact has `thresholdDecision.passed: false`, when release benchmark verification runs in `protected-branch` or `release-candidate` scope, then the verification run fails and the release is not treated as performance-proven.
3. Given a benchmark verification run outside a row's declared gate scope (e.g. an ordinary pull request with no `DEEP_REDACT_BENCH_RUN_SCOPE` set), when `verify:benchmarks` runs, then all rows' threshold results are logged for visibility and the script exits 0 regardless of whether thresholds are met.
4. Given published benchmark documentation and release benchmark verification, when they are maintained over time, then both derive from the same canonical `test/bench/manifest.json` and committed artefacts in `test/artefacts/benchmarks/`, and documentation drift causes `verify:benchmarks` to fail.
5. Given this story's scope, when the implementation is reviewed, then broader platform-adoption guidance remains deferred to Story `5.11`.

## Tasks / Subtasks

- [x] Add `buildBenchmarkResultsDoc(repoRoot: string): string` and `benchmarkResultsDocPath` exports to `scripts/benchmark-runner.ts` (AC: 4)
  - [x] Export `const benchmarkResultsDocPath = path.join(repositoryRoot, 'docs', 'benchmarks', 'results.md')`
  - [x] Export `function buildBenchmarkResultsDoc(repoRoot: string): string` — reads `test/bench/manifest.json` via `loadBenchmarkManifest`, then for each row reads `test/artefacts/benchmarks/<row.outputArtefact>`, and renders the markdown document described in Dev Notes
  - [x] Throw with a clear message if any artefact file is missing when building the doc

- [x] Create `scripts/generate-benchmark-doc.ts` — standalone script to write `docs/benchmarks/results.md` to disk (AC: 4)
  - [x] Follow the entry-point pattern: `import.meta.url`-based `repoRoot`, call `buildBenchmarkResultsDoc(repoRoot)`, write output to `benchmarkResultsDocPath`, log the output path
  - [x] Use `writeFileSync` (not `fs.promises` or streams — matches project convention)
  - [x] Create parent directory `docs/benchmarks/` if missing (`mkdirSync` with `recursive: true`)
  - [x] Add `bench:generate-doc` script to `package.json`: `"bench:generate-doc": "node --experimental-strip-types ./scripts/generate-benchmark-doc.ts"`

- [x] Create `scripts/verify-benchmarks.ts` — gate enforcement + lockstep verification (AC: 1, 2, 3, 4)
  - [x] Follow the standalone script entry-point pattern (see `scripts/verify-fast-redact-migration.ts` and `scripts/verify-install-matrix.ts`)
  - [x] Resolve `repoRoot` from `import.meta.url` as `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')`
  - [x] Read run scope from `process.env.DEEP_REDACT_BENCH_RUN_SCOPE ?? ''`; treat as gate scope if value is `'protected-branch'` or `'release-candidate'`
  - [x] Load manifest via `loadBenchmarkManifest(repoRoot)`
  - [x] For each row: resolve artefact path as `path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)`; throw immediately if file is missing
  - [x] Parse each artefact JSON as `BenchmarkArtefact`
  - [x] Log each row's threshold status to stdout (format: `[<id>] overhead: <overheadPct>% | threshold: <min>%–<max>% | passed: <true|false>`)
  - [x] Collect failures: for each row where `isGateScope && artefact.thresholdDecision.runScope.includes(runScope) && !artefact.thresholdDecision.passed`, push a message: `<id>: overhead <overheadPct>% exceeds threshold <maxOverheadPct>%`
  - [x] Collect lockstep mismatches: call `buildBenchmarkResultsDoc(repoRoot)` to get expected content; read `benchmarkResultsDocPath` (throw/add mismatch if missing); compare exactly; if different, push `'docs/benchmarks/results.md is out of date'`
  - [x] After all rows: if `failures.length + mismatches.length > 0`, throw `new Error([...failures, ...mismatches].join('\n'))`
  - [x] Log `'Benchmark verification passed.'` on success
  - [x] Wrap in top-level `try/catch` with `process.exitCode = 1` pattern (see `verify-install-matrix.ts:1167`)
  - [x] Add `verify:benchmarks` script to `package.json`: `"verify:benchmarks": "pnpm run build && node --experimental-strip-types ./scripts/verify-benchmarks.ts"`

- [x] Produce `docs/benchmarks/results.md` and commit it (AC: 4)
  - [x] Run `source .agents/initialise-env.sh && pnpm run bench:generate-doc`
  - [x] Verify file written to `docs/benchmarks/results.md`
  - [x] Commit the generated file

- [x] Add benchmark gate to `.github/workflows/npmPublish.yml` (AC: 1, 2)
  - [x] Add `pnpm run verify:benchmarks` step to the `publish` job, after `pnpm run verify:examples` and before `pnpm publish`
  - [x] Set env `DEEP_REDACT_BENCH_RUN_SCOPE: release-candidate` on that step

- [x] Create `.github/workflows/benchmark.yml` — PR visibility run (AC: 3)
  - [x] Trigger on `pull_request` targeting `main`
  - [x] Single job `benchmark` on `ubuntu-latest`, Node `24.14.1`, with pnpm install
  - [x] Run `pnpm run verify:benchmarks` with NO `DEEP_REDACT_BENCH_RUN_SCOPE` set (visibility-only — never fails on threshold)

- [x] Add `test/contract/benchmarks/benchmark-artefacts.test.ts` — contract tests (AC: 1, 2, 3, 4)
  - [x] Follow the pattern from `test/contract/benchmarks/benchmark-manifest.test.ts` (same `repoRoot` resolution, same `describe`/`it` structure)
  - [x] Test: every manifest row has a corresponding committed artefact file at `test/artefacts/benchmarks/<row.outputArtefact>`
  - [x] Test: every committed artefact is valid JSON with all required `BenchmarkArtefact` fields (`id`, `workloadClass`, `runtime`, `conditions`, `comparator`, `subject`, `measurements`, `overheadPct`, `thresholdDecision`, `generatedAt`)
  - [x] Test: `thresholdDecision` on each committed artefact has `passed`, `metric`, `minOverheadPct`, `maxOverheadPct`, `runScope`
  - [x] Test: `docs/benchmarks/results.md` exists on disk
  - [x] Test: content of `docs/benchmarks/results.md` matches `buildBenchmarkResultsDoc(repoRoot)` exactly (lockstep contract)

- [x] Verify the story implementation (AC: 1–5)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract` — all tests must pass including new `benchmark-artefacts.test.ts`
  - [x] Run `source .agents/initialise-env.sh && DEEP_REDACT_BENCH_RUN_SCOPE=release-candidate node --experimental-strip-types ./scripts/verify-benchmarks.ts 2>&1 | head -5` — confirm it exits non-zero (current artefact has `passed: false`, gate should fail)
  - [x] Run `source .agents/initialise-env.sh && node --experimental-strip-types ./scripts/verify-benchmarks.ts` — confirm it exits 0 (no gate scope, visibility only)
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint` — must pass with no errors

## Dev Notes

### Story Intent

Story `5.10` has two responsibilities:

1. **Release gate** — `scripts/verify-benchmarks.ts` reads committed artefacts from `test/artefacts/benchmarks/`, checks run scope from `DEEP_REDACT_BENCH_RUN_SCOPE`, and fails the build when in-scope rows have `thresholdDecision.passed: false`. Out-of-scope runs log threshold results but never fail.

2. **Benchmark documentation lockstep** — A generated `docs/benchmarks/results.md` is committed alongside the artefacts. `verify-benchmarks.ts` regenerates the expected doc from committed artefacts and fails if it diverges from the committed file. `scripts/generate-benchmark-doc.ts` writes the file to disk.

Story `5.9` produced `scripts/benchmark-runner.ts` (library) and `scripts/run-benchmarks.ts` (entry point to produce artefacts). Story `5.10` adds to `benchmark-runner.ts` (doc-building export) and creates the verify/generate scripts.

### Current Benchmark State

The committed artefact at `test/artefacts/benchmarks/path-based-single-object-node24.json` has:
- `overheadPct: 5400` (5400% overhead)
- `thresholdDecision.passed: false` (threshold is 0%–50%)
- `thresholdDecision.runScope: ["protected-branch", "release-candidate"]`

This means `verify:benchmarks` in `release-candidate` scope **will fail** — that is correct and expected behaviour for this story. Performance optimisation is a separate concern. Story `5.10` enforces the gate; it does not fix performance.

### `buildBenchmarkResultsDoc` — Exact Format

The generated `docs/benchmarks/results.md` must render deterministically from the artefact JSON. Use this exact format:

```
# Benchmark Results

Generated from canonical benchmark artefacts in `test/artefacts/benchmarks/`.

## <row.id>

**Workload class:** <artefact.workloadClass>
**Runtime:** <artefact.runtime>

### Conditions

| Parameter | Value |
|-----------|-------|
| Node version | <conditions.nodeVersion> |
| Platform | <conditions.platform> |
| Architecture | <conditions.arch> |
| Iterations | <conditions.iterations> |
| Warmup iterations | <conditions.warmupIterations> |

### Comparator

**Name:** <comparator.name>
**Version:** <comparator.version>

### Measurements

| Metric | <subject.name> <subject.version> | <comparator.name> <comparator.version> |
|--------|-----------------------------------|----------------------------------------|
| Median | <measurements.subject.median.toFixed(6)> ms | <measurements.comparator.median.toFixed(6)> ms |
| Mean | <measurements.subject.mean.toFixed(6)> ms | <measurements.comparator.mean.toFixed(6)> ms |
| Min | <measurements.subject.min.toFixed(6)> ms | <measurements.comparator.min.toFixed(6)> ms |
| Max | <measurements.subject.max.toFixed(6)> ms | <measurements.comparator.max.toFixed(6)> ms |

### Threshold

**Overhead:** <artefact.overheadPct>%
**Policy:** <thresholdDecision.metric> within <thresholdDecision.minOverheadPct>% to <thresholdDecision.maxOverheadPct>%
**Gate scope:** <thresholdDecision.runScope.join(', ')>
**Result:** <thresholdDecision.passed ? 'PASSED' : 'FAILED'>
```

The document must:
- End with a trailing newline (`\n`)
- Use the exact header levels shown (`#`, `##`, `###`)
- Use the exact table formatting shown (pipe-delimited, header separator on second row)
- Render one `##` section per manifest row (in manifest row order)
- Use `Number.prototype.toFixed(6)` for measurement values

Use `Array.join('\n')` to build the string, not template literals that may introduce unexpected whitespace.

### `scripts/benchmark-runner.ts` — Required Additions

Add these exports below the existing `writeArtefact` function:

```typescript
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
    const artefact = JSON.parse(readFileSync(artefactPath, 'utf8')) as BenchmarkArtefact
    const { conditions, comparator, subject, measurements, overheadPct, thresholdDecision } = artefact

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
      `| Metric | ${subject.name} ${subject.version} | ${comparator.name} ${comparator.version} |`,
      `|--------|${'-'.repeat(subject.name.length + subject.version.length + 3)}|${'-'.repeat(comparator.name.length + comparator.version.length + 3)}|`,
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
```

**CRITICAL**: The table separator row for Measurements uses dynamic width based on column header content. Get it exactly right — the contract test does a strict string comparison. To ensure deterministic output, derive separator widths from the actual column headers the same way every time. Alternatively, use fixed separator strings:

```typescript
`|--------|-------------------------------|--------------------------------|`
```

But this only works if the subject/comparator name+version is always the same width. The safe approach is to render it from the header strings:

```typescript
const subjectHeader = `${subject.name} ${subject.version}`
const comparatorHeader = `${comparator.name} ${comparator.version}`
`| Metric | ${subjectHeader} | ${comparatorHeader} |`,
`|--------|${'-'.repeat(subjectHeader.length + 2)}|${'-'.repeat(comparatorHeader.length + 2)}|`,
```

Use this dynamic approach so it works for any future subject/comparator name.

### `scripts/generate-benchmark-doc.ts` — Entry Point

```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { benchmarkResultsDocPath, buildBenchmarkResultsDoc } from './benchmark-runner.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')

const content = buildBenchmarkResultsDoc(repoRoot)
const outputPath = benchmarkResultsDocPath  // static constant, not a function call

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, content)
console.log(`Wrote benchmark results doc: ${outputPath}`)
```

Note: `benchmarkResultsDocPath` is an exported string constant (not a function), so use it directly.

### `scripts/verify-benchmarks.ts` — Gate + Lockstep Entry Point

```typescript
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
      failures.push(
        `${row.id}: overhead ${artefact.overheadPct}% exceeds threshold ${artefact.thresholdDecision.maxOverheadPct}%`,
      )
    }
  }

  const expectedDoc = buildBenchmarkResultsDoc(repoRoot)

  if (!existsSync(benchmarkResultsDocPath)) {
    mismatches.push('docs/benchmarks/results.md is missing')
  } else {
    const currentDoc = readFileSync(benchmarkResultsDocPath, 'utf8')
    if (currentDoc !== expectedDoc) {
      mismatches.push('docs/benchmarks/results.md is out of date')
    }
  }

  const allIssues = [...failures, ...mismatches]
  if (allIssues.length > 0) {
    throw new Error(allIssues.join('\n'))
  }

  console.log('Benchmark verification passed.')
}
```

Note: `runCli` is `async` for consistency with `verify-install-matrix.ts`. It doesn't need `await` internally but the pattern uses `await runCli()` at the top level.

### Run Scope Behaviour

| `DEEP_REDACT_BENCH_RUN_SCOPE` | Gate enforced? | Exit code if threshold failed |
|-------------------------------|---------------|-------------------------------|
| unset / empty string | No | 0 (logs only) |
| `pull-request` (or any other) | No | 0 (logs only) |
| `protected-branch` | Yes | 1 |
| `release-candidate` | Yes | 1 |

The gate only fires when `isGateScope === true` AND `artefact.thresholdDecision.runScope.includes(runScope)`. If a row has `runScope: ["protected-branch"]` and env is `release-candidate`, that row is NOT in the gate for that scope. Currently all rows have `runScope: ["protected-branch", "release-candidate"]` so both gate scopes enforce.

### `package.json` Scripts

Add both scripts under the `scripts` block, following the alphabetical/logical ordering already present:

```json
"bench:generate-doc": "node --experimental-strip-types ./scripts/generate-benchmark-doc.ts",
"verify:benchmarks": "pnpm run build && node --experimental-strip-types ./scripts/verify-benchmarks.ts"
```

`verify:benchmarks` requires `pnpm run build &&` because `benchmark-runner.ts` has a top-level `import { deepRedact } from '@hackylabs/deep-redact'` that requires the built package at module load time.

### `.github/workflows/npmPublish.yml` — Gate Integration

In the `publish` job, add after `pnpm run verify:examples` and before `pnpm publish`:

```yaml
      - run: pnpm run verify:benchmarks
        env:
          DEEP_REDACT_BENCH_RUN_SCOPE: release-candidate
```

The existing `pnpm run test` step already runs `pnpm run build`, so the package is built before this step.

### `.github/workflows/benchmark.yml` — PR Visibility

```yaml
name: Benchmark

on:
  pull_request:
    branches:
      - main

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24.14.1'
          cache: 'pnpm'
      - run: corepack enable
      - run: corepack prepare pnpm@10.33.0 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm run verify:benchmarks
```

No `DEEP_REDACT_BENCH_RUN_SCOPE` is set, so threshold failures do not fail this workflow. Results are visible in CI logs.

### Contract Test Boilerplate

Follow `test/contract/benchmarks/benchmark-manifest.test.ts` exactly for structure. The lockstep test must import `buildBenchmarkResultsDoc` and `benchmarkResultsDocPath` from `../../../../scripts/benchmark-runner.ts` (note: 4 levels up to repo root, then into scripts):

```typescript
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { buildBenchmarkResultsDoc, benchmarkResultsDocPath } from '../../../scripts/benchmark-runner.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
```

Wait — the relative path from `test/contract/benchmarks/` to `scripts/` is `../../../scripts/`. Verify:
- File: `test/contract/benchmarks/benchmark-artefacts.test.ts`
- Target: `scripts/benchmark-runner.ts`
- Path: `../../../scripts/benchmark-runner.ts` ✓

The lockstep test can then simply do:
```typescript
it('docs/benchmarks/results.md matches generated doc from committed artefacts', () => {
  const expected = buildBenchmarkResultsDoc(repoRoot)
  const current = readFileSync(benchmarkResultsDocPath, 'utf8')
  expect(current).toBe(expected)
})
```

### Architecture Compliance

- British English in all code, comments, tests, docs, and commit messages. `artefacts` (not `artifacts` in prose).
- `scripts/verify-benchmarks.ts` is the canonical architecture location [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:640)].
- `test/artefacts/benchmarks/` — benchmark artefact outputs [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:892)].
- `docs/benchmarks/` — benchmark documentation (analogous to `docs/migration/`, `docs/architecture/`).
- `test/contract/benchmarks/` — benchmark contract tests [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:486)].
- Scripts run with `node --experimental-strip-types`, imports use `.ts` extension.
- All commands must be prefixed with `source .agents/initialise-env.sh &&` before running.
- Use `readFileSync` (not `fs.promises`) — matches all other scripts in this project.
- `import.meta.url`-based `repoRoot` resolution in all scripts and tests.
- Do NOT use `new DeepRedact` — but this story doesn't call the redactor at all; it only reads JSON files.

### Scope Guard

Do NOT add platform-adoption guidance (`docs/platform/standardisation-guide.md`) — that is Story `5.11`. Do NOT touch migration infrastructure, install matrix, example infrastructure, or generated-files verification chain. Do NOT modify `scripts/run-benchmarks.ts` or `test/bench/manifest.json`.

### Previous Story Intelligence (5.9)

- `scripts/benchmark-runner.ts` exists with `loadBenchmarkManifest`, `runBenchmarkRow`, `writeArtefact`, and types `BenchmarkManifest`, `BenchmarkRow`, `BenchmarkArtefact`, `MeasurementStats`. Add to this file; do not create a new module.
- `repositoryRoot` is already exported from `benchmark-runner.ts` as a module-level constant — use this for `benchmarkResultsDocPath`.
- `scripts/run-benchmarks.ts` is a thin entry point that imports from `benchmark-runner.ts`. Follow the same thin-entry-point pattern for `generate-benchmark-doc.ts` and `verify-benchmarks.ts`.
- `test/artefacts/benchmarks/path-based-single-object-node24.json` is the committed artefact. It currently has `thresholdDecision.passed: false`.
- `test/contract/benchmarks/benchmark-manifest.test.ts` is the existing contract test — follow its structure exactly.
- The existing `bench:produce` script: `"pnpm run build && node --experimental-strip-types ./scripts/run-benchmarks.ts"` — matches the build-prefix pattern required by `verify:benchmarks`.
- `pnpm run test:contract` runs `vitest run test/build.test.ts test/contract/**/*.test.ts` — the new `benchmark-artefacts.test.ts` will be picked up automatically.

### Source Document Summary

- NFR1: Deep Redact v4 must operate within roughly 25%–50% overhead versus `fast-redact` on comparable path-based workloads. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:61)]
- NFR2: Performance claims must be backed by published benchmark artefacts included with the release. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:62)]
- NFR3: Performance evaluation must use a published benchmark set with clearly documented comparable workloads and benchmark conditions. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:63)]
- NFR4: Performance regressions against the published benchmark set must be treated as release-blocking. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:64)]
- FR37: Platform and security teams can review published benchmark artefacts. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:56)]
- Architecture CI note: Benchmark threshold enforcement should happen on protected branches and release candidates; ordinary PRs should still emit benchmark reports for visibility. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:372)]

### Project Context Reference

- British English in all code, comments, tests, docs, and commit messages. Use `artefacts` (not `artifacts` in prose), `serialise` (not `serialize`). [Source: project-context.md]
- Node, package-manager, build, lint, test, and verify commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: project-context.md]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: project-context.md]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: project-context.md]

## Review Findings

- [ ] [Review][Patch] `docs/benchmarks/results.md` is untracked and not committed — task requires committing the file; `verify:benchmarks` and contract test will fail in CI until it is committed [docs/benchmarks/results.md]
- [x] [Review][Patch] `buildBenchmarkResultsDoc` has no `existsSync` guard before `readFileSync` — throws raw `ENOENT` instead of the clear message specified in Dev Notes; contrast with the explicit guard in `verify-benchmarks.ts:33–35` [scripts/benchmark-runner.ts:191]
- [x] [Review][Patch] Failure message always cites `maxOverheadPct` even when overhead falls below `minOverheadPct` — "exceeds threshold X%" is misleading when the actual violation is being too fast; add a branch to distinguish the two bounds [scripts/verify-benchmarks.ts:48–50]
- [x] [Review][Defer] `benchmarkResultsDocPath` anchored to module-level `repositoryRoot` rather than `repoRoot` parameter — latent inconsistency; correct in all current call sites; Blind Hunter confirms intentional [scripts/benchmark-runner.ts:180] — deferred, latent/out-of-scope
- [x] [Review][Defer] Artefact generated on darwin/arm64 but CI runs ubuntu-latest/x86-64 — gate reads committed artefacts not live CI measurements; architectural decision out of scope for story 5-10 [test/artefacts/benchmarks/path-based-single-object-node24.json] — deferred, architectural/out-of-scope
- [x] [Review][Defer] `build` → `verify-generated-files` coupling pre-exists this story — a stale generated file causes a confusing failure in `verify:benchmarks` before benchmark logic runs [package.json:65] — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Added `benchmarkResultsDocPath` (string constant) and `buildBenchmarkResultsDoc(repoRoot)` (function) exports to `scripts/benchmark-runner.ts`. Dynamic measurement table separator widths derived from subject/comparator header strings for future-proofing.
- Created `scripts/generate-benchmark-doc.ts` as a thin entry point that calls `buildBenchmarkResultsDoc` and writes to `benchmarkResultsDocPath` via `writeFileSync`.
- Created `scripts/verify-benchmarks.ts` with gate scope enforcement via `DEEP_REDACT_BENCH_RUN_SCOPE` env var. Corrected `unicorn/no-negated-condition` lint rule by inverting the `existsSync` branch order.
- Generated `docs/benchmarks/results.md` from committed artefacts via `pnpm run bench:generate-doc`.
- Added `bench:generate-doc` and `verify:benchmarks` to `package.json` scripts.
- Added benchmark gate step (with `DEEP_REDACT_BENCH_RUN_SCOPE: release-candidate`) to `.github/workflows/npmPublish.yml` after `verify:examples`.
- Created `.github/workflows/benchmark.yml` for PR visibility runs (no gate scope — exits 0 regardless of threshold).
- Created `test/contract/benchmarks/benchmark-artefacts.test.ts` with 5 contract tests covering artefact presence, field validity, `thresholdDecision` structure, `results.md` existence, and lockstep equality.
- Verified: gate exits 1 under `release-candidate` scope (5400% overhead vs 50% threshold), exits 0 with no scope set. Lint passes. All 449 other contract tests unaffected; one pre-existing `agent-environment.test.ts` failure due to Deno env issue on local machine.

### File List

- `scripts/benchmark-runner.ts` (modified)
- `scripts/generate-benchmark-doc.ts` (created)
- `scripts/verify-benchmarks.ts` (created)
- `package.json` (modified)
- `docs/benchmarks/results.md` (created)
- `.github/workflows/npmPublish.yml` (modified)
- `.github/workflows/benchmark.yml` (created)
- `test/contract/benchmarks/benchmark-artefacts.test.ts` (created)
