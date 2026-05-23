# Story 6.6: Harden Benchmark Runner and Release Gate Scripts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform evaluator,
I want the benchmark runner and release gate scripts to handle edge cases, unknown competitors, missing flags, and platform-provenance information robustly,
so that CI failures are diagnosable and benchmark artefacts accurately reflect their generating environment.

## Acceptance Criteria

1. **Given** `--id` is passed to `scripts/run-benchmarks.ts` without a subsequent value, or with an ID that does not match any manifest row, **when** the script executes, **then** it exits with a non-zero status code and emits a descriptive error message identifying the problem rather than silently running all rows or producing empty output.
2. **Given** `comparatorStats.median` is exactly zero, **when** overhead percentage is computed in `scripts/benchmark-runner.ts`, **then** division-by-zero is detected and the artefact records a clearly sentinel value (such as `null` or `"Infinity"`) along with a diagnostic note, rather than producing a silent `NaN` or `Infinity`.
3. **Given** a benchmark manifest row declares a `competitor` other than `fast-redact`, **when** the benchmark runner resolves the comparator module, **then** it uses the row's `competitor` field to dynamically load the correct module rather than the hardcoded `require('fast-redact')`.
4. **Given** a benchmark manifest row has a `thresholdPolicy.comparatorMetric` value other than `"median"`, **when** `overheadPct` is computed, **then** the computation uses the metric named by `comparatorMetric` rather than always reading `.median`.
5. **Given** a benchmark manifest row is missing the `thresholdPolicy` field, **when** the contract test validates it, **then** the test produces a clear, row-identifying assertion failure rather than a raw `TypeError` from accessing a property of `undefined`.
6. **Given** `buildBenchmarkResultsDoc` is called with a custom `repoRoot` argument, **when** it resolves the output document path, **then** it derives the path from the provided `repoRoot` argument rather than the module-level `repositoryRoot` constant so the function is correct when called with an isolated directory.
7. **Given** a benchmark artefact is generated on a specific platform and architecture (e.g. darwin/arm64), **when** the artefact is inspected, **then** it includes a `generatingPlatform` field recording the OS, architecture, and Node.js version at the time of generation, so CI consumers understand the provenance of the measurements.

## Tasks / Subtasks

- [ ] Add bounds-checking for the `--id` flag in `scripts/run-benchmarks.ts:8-9`: detect missing value (next argv is another flag or undefined) and unmatched ID; exit non-zero with a descriptive message in both cases (AC: 1)
- [ ] Add a division-by-zero guard in `scripts/benchmark-runner.ts:132-134`: detect `comparatorStats.median === 0` and record `null` with a `"comparatorMedianWasZero": true` diagnostic note in the artefact (AC: 2)
- [ ] Replace `require('fast-redact')` in `scripts/benchmark-runner.ts:122-123` with `require(row.competitor)` to use the manifest-declared competitor identity (AC: 3)
- [ ] Replace the hardcoded `.median` reference in `overheadPct` with `comparatorStats[row.thresholdPolicy.comparatorMetric]` in `scripts/benchmark-runner.ts:132` (AC: 4)
- [ ] Add an explicit existence check for `row.thresholdPolicy` before any property access in `test/contract/benchmarks/benchmark-manifest.test.ts:53-57`, producing a named assertion failure when the field is absent (AC: 5)
- [ ] Replace the module-level `repositoryRoot` reference in `buildBenchmarkResultsDoc`'s path resolution with the `repoRoot` parameter in `scripts/benchmark-runner.ts:180` (AC: 6)
- [ ] Add a `generatingPlatform` field to the benchmark artefact output using `process.platform`, `process.arch`, and `process.version` in `scripts/benchmark-runner.ts` (AC: 7)

## Dev Notes

**Deferred from:** Code reviews of Stories 5.9 (2026-05-23) and 5.10 (2026-05-23).

**Item 1 — `--id` flag:** `process.argv[idFlag + 1]` is never bounds-checked. If the flag is the last argument or the next argument starts with `--`, there is no value. Guard: `const id = process.argv[idFlag + 1]; if (!id || id.startsWith('--')) { console.error('--id requires a value'); process.exit(1); }`. For unmatched ID: filter rows after parsing and exit non-zero if `rows.length === 0`.

**Item 3 — competitor resolution:** The module identifier comes from `row.competitor` which is already a string in the manifest (e.g. `"fast-redact"`). Using `require(row.competitor)` makes future manifest rows with different competitors work correctly. Ensure the competitor package is listed as a dev dependency before adding a second manifest row.

**Item 4 — comparatorMetric:** Current code: `const overheadPct = ((s - c) / c) * 100` where `c = comparatorStats.median`. Correct to `c = comparatorStats[row.thresholdPolicy.comparatorMetric]`. This is a no-op for all current rows (all use `"median"`) but makes the script correct for future rows.

**Item 6 — repoRoot parameter:** `buildBenchmarkResultsDoc(repoRoot: string, ...)` already accepts the parameter but `benchmarkResultsDocPath` is set from `repositoryRoot` at module level. Extract the path computation inside the function using the provided `repoRoot`.

**Item 7 — platform provenance:** This is particularly relevant given CI runs on ubuntu-latest/x86-64 while artefacts are generated on darwin/arm64. The field provides transparency without changing the gate logic.
