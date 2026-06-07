# Story 6.6: Harden Benchmark Runner and Release Gate Scripts

Status: done

## Story

As a platform evaluator,
I want the benchmark runner and release gate scripts to handle edge cases, unknown competitors, missing flags, and platform-provenance information robustly,
so that CI failures are diagnosable and benchmark artefacts accurately reflect their generating environment.

## Acceptance Criteria

1. **Given** `--id` is passed to `scripts/run-benchmarks.ts` without a subsequent value, or with an ID that does not match any manifest row, **when** the script executes, **then** it exits with a non-zero status code and emits a descriptive error message identifying the problem rather than silently running all rows or producing empty output.
2. **Given** `comparatorStats.median` is exactly zero, **when** overhead percentage is computed in `scripts/benchmark-runner.ts`, **then** division-by-zero is detected and the artefact records a clearly sentinel value (such as `null` or `"Infinity"`) along with a diagnostic note, rather than producing a silent `NaN` or `Infinity`.
3. **Given** a benchmark manifest row declares a `competitor` other than `fast-redact`, **when** the benchmark runner resolves the comparator module, **then** it uses the row's `competitor` field to dynamically load the correct module rather than the hardcoded `require('fast-redact')`, **and** it reads the competitor's version from `node_modules/${row.competitor}/package.json` rather than the hardcoded `fast-redact` path.
4. **Given** a benchmark manifest row has a `thresholdPolicy.comparatorMetric` value other than `"median"`, **when** `overheadPct` is computed, **then** the computation uses the metric named by `comparatorMetric` rather than always reading `.median`.
5. **Given** a benchmark manifest row is missing the `thresholdPolicy` field, **when** the contract test validates it, **then** the test produces a clear, row-identifying assertion failure rather than a raw `TypeError` from accessing a property of `undefined`.
6. **Given** `buildBenchmarkResultsDoc` is called with a custom `repoRoot` argument, **when** it resolves the output document path, **then** it derives the path from the provided `repoRoot` argument rather than the module-level `repositoryRoot` constant so the function is correct when called with an isolated directory.
7. **Given** a benchmark artefact is generated on a specific platform and architecture (e.g. darwin/arm64), **when** the artefact is inspected, **then** it includes a `generatingPlatform` field recording the OS, architecture, and Node.js version at the time of generation, so CI consumers understand the provenance of the measurements.

## Tasks / Subtasks

- [x] Add bounds-checking for the `--id` flag in `scripts/run-benchmarks.ts`: detect missing value (next argv is another flag or undefined) and unmatched ID; exit non-zero with a descriptive message in both cases (AC: 1)
- [x] Add a division-by-zero guard in `scripts/benchmark-runner.ts` `runBenchmarkRow`: detect `comparatorStats[metric] === 0` (after applying AC-4's metric lookup) and record `null` with a `"comparatorMetricWasZero": true` diagnostic note on the artefact (AC: 2)
- [x] Replace the hardcoded `require('fast-redact')` with `require(row.competitor)` **and** replace the hardcoded `node_modules/fast-redact/package.json` path with `node_modules/${row.competitor}/package.json` in `scripts/benchmark-runner.ts` `runBenchmarkRow` (AC: 3)
- [x] Replace the hardcoded `.median` references in the `overheadPct` computation with `comparatorStats[row.thresholdPolicy.comparatorMetric]` in `scripts/benchmark-runner.ts` `runBenchmarkRow` (AC: 4)
- [x] Add an explicit `toBeDefined()` assertion for `row.thresholdPolicy` before the key-iteration loop in `test/contract/benchmarks/benchmark-manifest.test.ts` (AC: 5)
- [x] Convert `benchmarkResultsDocPath` from a module-level constant to an exported function `benchmarkResultsDocPath(repoRoot: string): string` in `scripts/benchmark-runner.ts`, then update all three callers: `scripts/generate-benchmark-doc.ts`, `scripts/verify-benchmarks.ts`, and `test/contract/benchmarks/benchmark-artefacts.test.ts` (AC: 6)
- [x] Add a `generatingPlatform` top-level field to `BenchmarkArtefact` (interface + `runBenchmarkRow` output) recording `process.platform`, `process.arch`, and `process.version`; update `requiredArtefactKeys` in `test/contract/benchmarks/benchmark-artefacts.test.ts` to include `"generatingPlatform"` (AC: 7)
- [x] Run `source .agents/initialise-env.sh && pnpm run test && pnpm run verify:benchmarks` to confirm all tests pass and no generated files changed (All ACs)

## Dev Notes

**Deferred from:** Code reviews of Stories 5.9 (2026-05-23) and 5.10 (2026-05-23).

**Environment bootstrap (required before any test or verify command):**
```bash
source .agents/initialise-env.sh
```

---

### Primary Files

| File | Change type |
|------|-------------|
| `scripts/run-benchmarks.ts` | Modify — AC 1: `--id` bounds-checking |
| `scripts/benchmark-runner.ts` | Modify — AC 2: division-by-zero guard; AC 3: dynamic competitor; AC 4: `comparatorMetric` lookup; AC 6: `benchmarkResultsDocPath` → function; AC 7: `generatingPlatform` field |
| `scripts/generate-benchmark-doc.ts` | Modify — AC 6: update `benchmarkResultsDocPath` call site |
| `scripts/verify-benchmarks.ts` | Modify — AC 6: update `benchmarkResultsDocPath` call sites |
| `test/contract/benchmarks/benchmark-manifest.test.ts` | Modify — AC 5: `thresholdPolicy` existence check |
| `test/contract/benchmarks/benchmark-artefacts.test.ts` | Modify — AC 6: update `benchmarkResultsDocPath` call sites; AC 7: add `generatingPlatform` to `requiredArtefactKeys` |

No `src/` production files are modified. No fixture files are created.

---

### Codebase Context

**`scripts/run-benchmarks.ts`** (19 lines, ESM):
- Parses `--id` at line 8–9:
  ```typescript
  const idFlag = process.argv.indexOf('--id')
  const targetId = idFlag === -1 ? undefined : process.argv[idFlag + 1]
  ```
  There is no bounds check: if `--id` is the last argument, `process.argv[idFlag + 1]` returns `undefined`, and `rows` will be empty (silent no-op). If the next token is another flag (e.g., `--id --verbose`), `rows` will filter by `"--verbose"` and also silently produce empty output.
- The `rows` array at line 12 is never checked for emptiness before the `for` loop.

**`scripts/benchmark-runner.ts`** (243 lines, ESM):
- **`runBenchmarkRow`** (line 108–170):
  - Line 118 — hardcoded competitor package.json path:
    ```typescript
    const frPkg = JSON.parse(readFileSync(path.join(repoRoot, 'node_modules/fast-redact/package.json'), 'utf8')) as { version: string }
    ```
  - Lines 122–123 — hardcoded `require`:
    ```typescript
    const fastRedact = require('fast-redact') as (config: Record<string, unknown>) => (payload: unknown) => unknown
    const frInstance = fastRedact(frConfig)
    ```
  - Lines 129–132 — hardcoded `.median` in overhead formula and no zero guard:
    ```typescript
    const overheadPct = Math.round(
      ((subjectStats.median - comparatorStats.median) / comparatorStats.median) * 100 * 100,
    ) / 100
    ```
    If `comparatorStats.median === 0`, this produces `Infinity` or `-Infinity` (not `NaN`), which is serialised as `null` by `JSON.stringify` — a silent data loss bug.
  - The `BenchmarkArtefact` return value at lines 137–169 includes a `conditions` object with `nodeVersion`, `platform`, and `arch`, but no dedicated top-level `generatingPlatform` field.
- **`benchmarkResultsDocPath`** (line 180) — module-level constant:
  ```typescript
  export const benchmarkResultsDocPath = path.join(repositoryRoot, 'docs', 'benchmarks', 'results.md')
  ```
  Uses `repositoryRoot` (derived from `import.meta.url` at module load time), not the `repoRoot` argument of `buildBenchmarkResultsDoc`. Three callers import this constant.
- **`buildBenchmarkResultsDoc(repoRoot: string)`** (lines 182–242) already uses `repoRoot` for all artefact paths inside the function, but callers rely on `benchmarkResultsDocPath` (the constant) to know where to write/read the output document.

**`test/contract/benchmarks/benchmark-manifest.test.ts`** (96 lines):
- The `thresholdPolicy` key-iteration test at lines 47–57:
  ```typescript
  for (const row of manifest.rows) {
    for (const key of requiredThresholdPolicyKeys) {
      expect(row.thresholdPolicy, `thresholdPolicy missing field: ${key}`).toHaveProperty(key)
    }
  }
  ```
  If `row.thresholdPolicy` is `undefined`, vitest produces a low-signal "received undefined" failure rather than identifying the specific row. An explicit `expect(row.thresholdPolicy, `row ${row.id} missing thresholdPolicy`).toBeDefined()` before the inner loop gives a clear named failure.

**`test/contract/benchmarks/benchmark-artefacts.test.ts`** (72 lines):
- `requiredArtefactKeys` (line 9–20) does NOT include `generatingPlatform`. After AC 7 is implemented, this array must be updated.
- Uses `benchmarkResultsDocPath` as a constant at lines 64 and 69 — both call sites must change when AC 6 converts it to a function.

---

### Fix 1 — `--id` bounds-checking (AC 1)

**File:** `scripts/run-benchmarks.ts` — replace lines 8–12.

**Current:**
```typescript
const idFlag = process.argv.indexOf('--id')
const targetId = idFlag === -1 ? undefined : process.argv[idFlag + 1]

const manifest = loadBenchmarkManifest(repoRoot)
const rows = targetId === undefined ? manifest.rows : manifest.rows.filter(r => r.id === targetId)
```

**Replace with:**
```typescript
const idFlag = process.argv.indexOf('--id')
let targetId: string | undefined
if (idFlag !== -1) {
  const next = process.argv[idFlag + 1]
  if (!next || next.startsWith('--')) {
    console.error('Error: --id requires a value')
    process.exit(1)
  }
  targetId = next
}

const manifest = loadBenchmarkManifest(repoRoot)
const rows = targetId === undefined ? manifest.rows : manifest.rows.filter(r => r.id === targetId)

if (targetId !== undefined && rows.length === 0) {
  console.error(`Error: no benchmark row found with id "${targetId}"`)
  process.exit(1)
}
```

---

### Fix 2, 3, 4 — `runBenchmarkRow` changes (AC 2, 3, 4)

All three fixes are within `runBenchmarkRow` in `scripts/benchmark-runner.ts`. Apply them together in a single coherent edit.

**Current lines 118 and 122–132 (relevant excerpts):**
```typescript
const frPkg = JSON.parse(readFileSync(path.join(repoRoot, 'node_modules/fast-redact/package.json'), 'utf8')) as { version: string }
// ...
const fastRedact = require('fast-redact') as (config: Record<string, unknown>) => (payload: unknown) => unknown
const frInstance = fastRedact(frConfig)
// ...
const overheadPct = Math.round(
  ((subjectStats.median - comparatorStats.median) / comparatorStats.median) * 100 * 100,
) / 100
```

**Replace with (annotated):**
```typescript
// AC 3 — use manifest-declared competitor for both require() and package.json
const competitorPkg = JSON.parse(
  readFileSync(path.join(repoRoot, 'node_modules', row.competitor, 'package.json'), 'utf8'),
) as { version: string }
// ...
const competitorFn = require(row.competitor) as (config: Record<string, unknown>) => (payload: unknown) => unknown
const frInstance = competitorFn(frConfig)
// ...
// AC 4 — use manifest-declared metric for comparator
const comparatorValue = comparatorStats[row.thresholdPolicy.comparatorMetric as keyof MeasurementStats] as number

// AC 2 — guard division by zero
let overheadPct: number | null
let comparatorMetricWasZero = false
if (comparatorValue === 0) {
  overheadPct = null
  comparatorMetricWasZero = true
} else {
  overheadPct = Math.round(
    ((subjectStats.median - comparatorValue) / comparatorValue) * 100 * 100,
  ) / 100
}
```

Update the `passed` computation and artefact return value accordingly:
```typescript
const passed = overheadPct !== null &&
  overheadPct <= row.thresholdPolicy.maxOverheadPct &&
  overheadPct >= row.thresholdPolicy.minOverheadPct
```

Update the `comparator` field in the return value to use `competitorPkg.version`:
```typescript
comparator: {
  name: row.competitor,
  version: competitorPkg.version,
},
```

Add `comparatorMetricWasZero` to the return value only when true — add it as an optional field on `BenchmarkArtefact`:
```typescript
...(comparatorMetricWasZero ? { comparatorMetricWasZero: true } : {}),
```

Also update `BenchmarkArtefact` interface to reflect these changes:
```typescript
overheadPct: number | null;
comparatorMetricWasZero?: true;
```

---

### Fix 5 — `thresholdPolicy` existence check (AC 5)

**File:** `test/contract/benchmarks/benchmark-manifest.test.ts` — the `requires all four fields on every thresholdPolicy` test.

Add before the inner `for` loop:
```typescript
for (const row of manifest.rows) {
  expect(
    (row as Record<string, unknown>).thresholdPolicy,
    `row "${(row as Record<string, unknown>).id}" is missing thresholdPolicy`,
  ).toBeDefined()
  for (const key of requiredThresholdPolicyKeys) {
    expect(row.thresholdPolicy, `thresholdPolicy missing field: ${key}`).toHaveProperty(key)
  }
}
```

---

### Fix 6 — `benchmarkResultsDocPath` → function (AC 6)

**File:** `scripts/benchmark-runner.ts` — line 180.

**Current:**
```typescript
export const benchmarkResultsDocPath = path.join(repositoryRoot, 'docs', 'benchmarks', 'results.md')
```

**Replace with:**
```typescript
export function benchmarkResultsDocPath(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'benchmarks', 'results.md')
}
```

**Caller updates required:**

`scripts/generate-benchmark-doc.ts:10`:
```typescript
// Before:
const outputPath = benchmarkResultsDocPath
// After:
const outputPath = benchmarkResultsDocPath(repoRoot)
```

`scripts/verify-benchmarks.ts:57–58`:
```typescript
// Before:
if (existsSync(benchmarkResultsDocPath)) {
  const currentDoc = readFileSync(benchmarkResultsDocPath, 'utf8')
// After:
const docPath = benchmarkResultsDocPath(repoRoot)
if (existsSync(docPath)) {
  const currentDoc = readFileSync(docPath, 'utf8')
```
(Update the `mismatches.push` message strings on lines 60 and 63 to use the variable if desired, though the literal string is fine.)

`test/contract/benchmarks/benchmark-artefacts.test.ts:64, 69`:
```typescript
// Before:
expect(existsSync(benchmarkResultsDocPath), ...
const current = readFileSync(benchmarkResultsDocPath, 'utf8')
// After:
const resultsDocPath = benchmarkResultsDocPath(repoRoot)
expect(existsSync(resultsDocPath), ...
const current = readFileSync(resultsDocPath, 'utf8')
```

---

### Fix 7 — `generatingPlatform` field (AC 7)

**File:** `scripts/benchmark-runner.ts`.

Add to `BenchmarkArtefact` interface:
```typescript
generatingPlatform: {
  os: string;
  arch: string;
  nodeVersion: string;
};
```

Add to `runBenchmarkRow` return value:
```typescript
generatingPlatform: {
  os: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
},
```

Note: `conditions.platform`, `conditions.arch`, and `conditions.nodeVersion` already capture the same values. The `generatingPlatform` field is a deliberate top-level duplicate for provenance discoverability — CI consumers inspecting an artefact do not need to look inside `conditions`.

**File:** `test/contract/benchmarks/benchmark-artefacts.test.ts`.

Add `'generatingPlatform'` to `requiredArtefactKeys`:
```typescript
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
  'generatingPlatform',  // AC 7
]
```

After adding this key, **re-run the benchmarks** (`node --experimental-strip-types ./scripts/run-benchmarks.ts`) to regenerate the committed artefact(s) with the new field, then run `pnpm run generate-benchmark-doc` (or `node --experimental-strip-types ./scripts/generate-benchmark-doc.ts`) so the results doc is up to date.

---

### Defects Identified During Story Creation (2026-05-24)

The following were found by cross-referencing the story against the actual source files and are corrected in the tasks and dev notes above:

1. **AC 3 scope understated** — the original story only mentioned replacing `require('fast-redact')` but `node_modules/fast-redact/package.json` (line 118) was also hardcoded. Both must change together or the reported `comparator.version` remains wrong for any non-`fast-redact` competitor.

2. **AC 6 caller scope unstated** — the original story only mentioned `scripts/benchmark-runner.ts:180`. Converting `benchmarkResultsDocPath` from a constant to a function is a breaking change affecting three other files: `scripts/generate-benchmark-doc.ts`, `scripts/verify-benchmarks.ts`, and `test/contract/benchmarks/benchmark-artefacts.test.ts`. All call sites are listed above with before/after code.

3. **AC 7 contract test gap** — the original story described adding `generatingPlatform` to the artefact but did not mention updating `requiredArtefactKeys` in `benchmark-artefacts.test.ts`. Without this, the field would be unchecked by contract tests and could be silently dropped in a future refactor.

4. **Line numbers in original dev notes** — cited `scripts/benchmark-runner.ts:132-134` for the overhead computation; actual lines are 129–132 in the current codebase.

---

## Dev Agent Record

### Completion Notes

All seven ACs implemented and verified on 2026-05-24.

- **AC 1** — `scripts/run-benchmarks.ts`: added `--id` bounds-check; exits non-zero with a descriptive message when the flag has no value or no matching row.
- **AC 2** — `scripts/benchmark-runner.ts` `runBenchmarkRow`: detects `comparatorValue === 0` after the AC-4 metric lookup; records `overheadPct: null` and `comparatorMetricWasZero: true` on the artefact.
- **AC 3** — replaced `require('fast-redact')` → `require(row.competitor)` and hardcoded `node_modules/fast-redact/package.json` → `node_modules/${row.competitor}/package.json`.
- **AC 4** — replaced hardcoded `.median` with `comparatorStats[row.thresholdPolicy.comparatorMetric as keyof MeasurementStats]`.
- **AC 5** — `test/contract/benchmarks/benchmark-manifest.test.ts`: added `expect(row.thresholdPolicy, ...).toBeDefined()` before the key-iteration inner loop.
- **AC 6** — `benchmarkResultsDocPath` converted from module-level constant to exported function `(repoRoot: string): string`; all three callers updated (`generate-benchmark-doc.ts`, `verify-benchmarks.ts`, `benchmark-artefacts.test.ts`).
- **AC 7** — `BenchmarkArtefact` interface and `runBenchmarkRow` return value both gain `generatingPlatform: { os, arch, nodeVersion }`; `requiredArtefactKeys` in `benchmark-artefacts.test.ts` updated; artefact regenerated; results doc regenerated.

Full test suite: 470 tests pass. `pnpm run verify:benchmarks` passes.

### File List

- `scripts/run-benchmarks.ts` — modified (AC 1)
- `scripts/benchmark-runner.ts` — modified (AC 2, 3, 4, 6, 7)
- `scripts/generate-benchmark-doc.ts` — modified (AC 6)
- `scripts/verify-benchmarks.ts` — modified (AC 6)
- `test/contract/benchmarks/benchmark-manifest.test.ts` — modified (AC 5)
- `test/contract/benchmarks/benchmark-artefacts.test.ts` — modified (AC 6, 7)
- `test/artefacts/benchmarks/path-based-single-object-node24.json` — regenerated (AC 7)
- `docs/benchmarks/results.md` — regenerated (AC 6, 7)

### Change Log

- 2026-05-24: Implemented all 7 ACs for story 6.6 — hardened `--id` flag handling, division-by-zero guard, dynamic competitor loading, configurable comparator metric, `thresholdPolicy` existence assertion, `benchmarkResultsDocPath` function refactor, and `generatingPlatform` provenance field.

### Review Findings

- [x] [Review][Patch] Asymmetric overhead formula — numerator hardcoded to `subjectStats.median` while denominator uses `comparatorMetric`; if `comparatorMetric` is `"mean"`, `"min"`, or `"max"`, the percentage is internally inconsistent [scripts/benchmark-runner.ts:145]
- [x] [Review][Patch] Unknown `comparatorMetric` produces silent `NaN` — `comparatorStats[metric]` returns `undefined` for unrecognised metric names, bypasses the zero guard, and propagates NaN; no error is thrown [scripts/benchmark-runner.ts:135]
- [x] [Review][Patch] `verify-benchmarks.ts` does not handle `null` `overheadPct` — comparison `null > maxOverheadPct` evaluates to `false` (wrong branch), producing a confusing `"overhead null%"` failure message [scripts/verify-benchmarks.ts:40,48,51]
- [x] [Review][Patch] `buildBenchmarkResultsDoc` renders `null` `overheadPct` as literal `"null%"` in the markdown results doc [scripts/benchmark-runner.ts:259]
