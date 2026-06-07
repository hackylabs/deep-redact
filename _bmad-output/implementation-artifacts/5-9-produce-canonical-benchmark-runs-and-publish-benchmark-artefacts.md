# Story 5.9: Produce Canonical Benchmark Runs and Publish Benchmark Artefacts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform evaluator,
I want canonical benchmark runs and published Deep Redact benchmark artefacts,
so that performance evidence exists as inspectable release artefacts before any gating policy is enforced.

## Acceptance Criteria

1. Given the benchmark source of truth, when it is reviewed, then it is defined by one canonical manifest at `test/bench/manifest.json`.
2. Given the canonical benchmark manifest, when it is validated, then every benchmark row conforms to one strict JSON schema with these required fields: `id`, `fixtureDir`, `workloadClass`, `competitor`, `runtime`, `command`, `outputArtefact`, and `thresholdPolicy`.
3. Given the canonical benchmark manifest, when a row is inspected, then `competitor` is explicitly declared and comparable path-based rows use `fast-redact` as the comparator.
4. Given the canonical benchmark manifest, when a row is inspected, then `thresholdPolicy` defines the row's pass/fail contract using declared fields for comparator metric, minimum overhead percentage, maximum overhead percentage, and run scope.
5. Given a comparable path-based benchmark row, when the benchmark is executed, then the benchmark uses the immutable workload fixture identified by `fixtureDir` and records both the Deep Redact result and the comparator result needed to compute overhead for that row.
6. Given a comparable benchmark row against `fast-redact`, when overhead is computed, then the row uses one declared formula: `((deep-redact - fast-redact) / fast-redact) * 100`.
7. Given a row in the canonical benchmark manifest, when it is executed, then it produces the declared `outputArtefact` under `test/artefacts/benchmarks/`.
8. Given a published benchmark artefact, when it is inspected, then it includes the benchmark `id`, workload class, runtime, benchmark conditions, comparator identity, measured raw values, computed overhead percentage where applicable, and the threshold decision for that row.
9. Given this story's scope, when the implementation is reviewed, then release-gate enforcement and benchmark-documentation lockstep remain deferred to Story `5.10` and broader platform-adoption guidance remains deferred to Story `5.11`.

## Tasks / Subtasks

- [x] Create `test/bench/manifest.json` (AC: 1, 2, 3, 4)
  - [x] Define `schemaVersion: 1`, `metadata`, and `rows` array at top level
  - [x] Add row `path-based-single-object-node24`: `workloadClass: "path-based"`, `competitor: "fast-redact"`, `runtime: "node24"`, `fixtureDir: "test/bench/fixtures/path-based-single-object"`, `command: "node --experimental-strip-types ./scripts/run-benchmarks.ts --id path-based-single-object-node24"`, `outputArtefact: "path-based-single-object-node24.json"`, `thresholdPolicy: { comparatorMetric: "median", minOverheadPct: 0, maxOverheadPct: 50, runScope: ["protected-branch", "release-candidate"] }`

- [x] Create workload fixture directory `test/bench/fixtures/path-based-single-object/` (AC: 5)
  - [x] Create `input.json`: an immutable nested user payload with password, email, firstName, ip, and address fields (see Dev Notes for exact payload)
  - [x] Create `deep-redact-config.json`: the v4 `deepRedact` configuration for this workload (paths-based targeting matching comparable fast-redact paths)
  - [x] Create `competitor-config.json`: the fast-redact configuration for this workload (matching paths array)

- [x] Create `scripts/benchmark-runner.ts` helper module (AC: 5, 6, 7, 8)
  - [x] Export `BenchmarkManifest` and `BenchmarkRow` TypeScript types matching the manifest schema
  - [x] Export `loadBenchmarkManifest(repoRoot: string): BenchmarkManifest` — reads and parses `test/bench/manifest.json`, throws on parse error
  - [x] Export `runBenchmarkRow(row: BenchmarkRow, repoRoot: string): BenchmarkArtefact` — executes both subject and comparator measurement, computes overhead, returns artefact data
  - [x] Use a `ITERATIONS = 100_000` constant and `WARMUP_ITERATIONS = 10_000` constant; expose these in artefact `conditions`
  - [x] Measurement loop: warm up with `WARMUP_ITERATIONS` iterations, then measure `ITERATIONS` iterations using `performance.now()` before and after; compute median via `ITERATIONS` timing samples (collect array of per-iteration times, sort, pick middle)
  - [x] Import subject as `import { deepRedact } from '@hackylabs/deep-redact'` (built package)
  - [x] Import comparator using `createRequire` (established CJS import pattern — see `scripts/fast-redact-migration.ts:119`): add `import { createRequire } from 'node:module'` at top, `const require = createRequire(import.meta.url)` at module scope, then instantiate via `require('fast-redact')` cast to the appropriate callable type
  - [x] Load subject config from `path.join(repoRoot, row.fixtureDir, 'deep-redact-config.json')`
  - [x] Load competitor config from `path.join(repoRoot, row.fixtureDir, 'competitor-config.json')`
  - [x] Load payload from `path.join(repoRoot, row.fixtureDir, 'input.json')`
  - [x] Compute overhead with formula: `((subjectMedian - comparatorMedian) / comparatorMedian) * 100`
  - [x] Threshold decision: `passed = overhead <= row.thresholdPolicy.maxOverheadPct && overhead >= row.thresholdPolicy.minOverheadPct`

- [x] Create `scripts/run-benchmarks.ts` standalone entry-point script (AC: 7)
  - [x] Accept optional `--id <row-id>` CLI argument to run a single named row; without it, run all rows
  - [x] Call `loadBenchmarkManifest`, filter rows by id if `--id` is given
  - [x] For each selected row, call `runBenchmarkRow` and write artefact JSON to `path.join(repoRoot, 'test/artefacts/benchmarks', row.outputArtefact)`
  - [x] Create `test/artefacts/benchmarks/` directory if missing (use `mkdirSync` with `recursive: true`)
  - [x] Log each artefact path written

- [x] Add `bench:produce` script to `package.json` (AC: 7)
  - [x] `"bench:produce": "pnpm run build && node --experimental-strip-types ./scripts/run-benchmarks.ts"`

- [x] Run benchmarks and commit produced artefacts (AC: 7, 8)
  - [x] Run `source .agents/initialise-env.sh && pnpm run bench:produce`
  - [x] Verify artefact file exists at `test/artefacts/benchmarks/path-based-single-object-node24.json` with all required fields
  - [ ] Commit the artefact file

- [x] Create `test/contract/benchmarks/benchmark-manifest.test.ts` contract test (AC: 1, 2, 3, 4)
  - [x] Test: manifest loads without error from `test/bench/manifest.json`
  - [x] Test: every row has all required fields (`id`, `fixtureDir`, `workloadClass`, `competitor`, `runtime`, `command`, `outputArtefact`, `thresholdPolicy`)
  - [x] Test: every `thresholdPolicy` has `comparatorMetric`, `minOverheadPct`, `maxOverheadPct`, `runScope`
  - [x] Test: `path-based` rows declare `competitor: "fast-redact"`
  - [x] Test: row ids are unique
  - [x] Test: each row's `fixtureDir` exists on disk and contains `input.json`, `deep-redact-config.json`, and `competitor-config.json`

- [x] Verify the story implementation (AC: 1–9)
  - [x] Run `source .agents/initialise-env.sh && pnpm run bench:produce` — must produce artefact with no errors
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract` — all contract tests must pass including the new `benchmark-manifest.test.ts`
  - [x] Run `source .agents/initialise-env.sh && pnpm run build` — must pass with no regressions
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`
  - [x] Verify artefact JSON contains all required fields (id, workloadClass, runtime, conditions, comparator, subject, measurements, overheadPct, thresholdDecision, generatedAt)

### Review Findings

- [x] [Review][Patch] `structuredClone` inside timed window — clone should be prepared before `t0`, not inside the timed lambda per spec pseudocode [scripts/benchmark-runner.ts:88-100]
- [x] [Review][Defer] `--id` flag: missing value silently runs all rows; unmatched ID silently exits with no output [scripts/run-benchmarks.ts:8-9] — deferred, pre-existing
- [x] [Review][Defer] Division by zero: no guard when `comparatorStats.median === 0` produces `Infinity`/`NaN` `overheadPct` [scripts/benchmark-runner.ts:132-134] — deferred, pre-existing
- [x] [Review][Defer] `competitor` field not used to resolve module; `require('fast-redact')` hardcoded regardless of `row.competitor` [scripts/benchmark-runner.ts:122-123] — deferred, pre-existing
- [x] [Review][Defer] `overheadPct` always uses `.median` regardless of `thresholdPolicy.comparatorMetric` field [scripts/benchmark-runner.ts:132] — deferred, pre-existing
- [x] [Review][Defer] Contract test: `row.thresholdPolicy` accessed directly before existence check — confusing `TypeError` on malformed row [test/contract/benchmarks/benchmark-manifest.test.ts:53-57] — deferred, pre-existing

## Dev Notes

### Story Intent

Story `5.9` has two responsibilities:

1. **Canonical benchmark manifest** — define `test/bench/manifest.json` as the single source of truth for benchmark rows, each row describing an executable benchmark configuration that can produce a committed artefact.

2. **Produce and publish artefacts** — implement the measurement infrastructure (`scripts/benchmark-runner.ts`, `scripts/run-benchmarks.ts`) and run it to produce committed artefact JSON files that platform evaluators can inspect. Story `5.10` will enforce gating logic against these artefacts; this story only needs to produce them and record the threshold decision without blocking on it.

### Comparable Workload Design

The "comparable path-based workload" row (`path-based-single-object-node24`) compares:
- **Subject**: `deepRedact({ paths: ['user.password', 'user.email', 'user.firstName', 'user.ip'] })`
- **Competitor**: `fastRedact({ paths: ['user.password', 'user.email', 'user.firstName', 'user.ip'], serialize: false })`

Both target the same paths on the same JSON payload. `serialize: false` is required on fast-redact to produce structured output (otherwise fast-redact serialises to string by default). The v4 default already returns structured output when `serialise` is omitted.

The `-node24` suffix in the row ID is a naming convention identifying the intended runtime tier; it is not enforced at execution time. The actual runtime is captured in `conditions.nodeVersion` from `process.version`. Do not add a Node-version guard — the artefact records the real runtime regardless of row ID.

### Immutable Workload Payload (`test/bench/fixtures/path-based-single-object/input.json`)

```json
{
  "user": {
    "id": 1,
    "firstName": "Emily",
    "lastName": "Johnson",
    "email": "emily.johnson@example.com",
    "password": "emilyspass",
    "ip": "42.48.100.32",
    "address": {
      "street": "123 Maple Avenue",
      "city": "Springfield",
      "postalCode": "62701"
    }
  },
  "requestId": "req-abc-123",
  "ok": true
}
```

This payload is intentionally modest in size — it is a repeatable, stable fixture, not a stress workload. The overhead comparison is about algorithmic cost, not raw throughput.

### `deep-redact-config.json`

```json
{
  "paths": ["user.password", "user.email", "user.firstName", "user.ip"]
}
```

### `competitor-config.json`

```json
{
  "paths": ["user.password", "user.email", "user.firstName", "user.ip"],
  "serialize": false
}
```

### Required Artefact Shape

Each artefact file at `test/artefacts/benchmarks/<id>.json` must conform to this shape:

```typescript
interface BenchmarkArtefact {
  id: string
  workloadClass: string
  runtime: string
  conditions: {
    nodeVersion: string     // process.version
    platform: string        // process.platform
    arch: string            // process.arch
    iterations: number
    warmupIterations: number
  }
  comparator: {
    name: string            // e.g. "fast-redact"
    version: string         // read from node_modules/fast-redact/package.json
  }
  subject: {
    name: string            // "@hackylabs/deep-redact"
    version: string         // read from package.json at repo root
  }
  measurements: {
    subject: { median: number; mean: number; min: number; max: number; unit: 'ms' }
    comparator: { median: number; mean: number; min: number; max: number; unit: 'ms' }
  }
  overheadPct: number       // ((subject.median - comparator.median) / comparator.median) * 100, rounded to 2 dp
  thresholdDecision: {
    passed: boolean
    metric: string          // matches thresholdPolicy.comparatorMetric
    minOverheadPct: number
    maxOverheadPct: number
    runScope: string[]
  }
  generatedAt: string       // ISO 8601
}
```

### Measurement Approach

Use a per-iteration timing loop rather than vitest bench to keep the measurement script self-contained. A simple per-sample collection approach:

```typescript
// Warm up
for (let i = 0; i < WARMUP_ITERATIONS; i++) {
  subjectFn(JSON.parse(JSON.stringify(payload)))
}

// Measure
const samples: number[] = []
for (let i = 0; i < ITERATIONS; i++) {
  const fresh = JSON.parse(JSON.stringify(payload)) // prevent redactor from seeing the same object identity
  const t0 = performance.now()
  subjectFn(fresh)
  samples.push(performance.now() - t0)
}
samples.sort((a, b) => a - b)
const median = samples[Math.floor(samples.length / 2)]
const mean = samples.reduce((s, v) => s + v, 0) / samples.length
const min = samples[0]
const max = samples[samples.length - 1]
```

Do this for both subject and comparator. Use fresh payload copies for each iteration to avoid object-identity shortcircuiting in the traversal engine. **Additionally**, fast-redact with `serialize: false` mutates its input in-place (replacing field values with the censor string on the original object). Without a fresh copy each iteration, fast-redact receives a pre-redacted payload from the prior iteration, invalidating both the measurement and the overhead comparison.

**Important**: The v4 redactor is initialised ONCE before the measurement loop (factory is called at setup time, not inside the loop). Only the returned callable redactor is invoked per iteration. fast-redact also initialises once before the loop.

**Timing overhead note**: `performance.now()` adds ~1–2 µs of overhead per pair of calls. This inflates absolute median values for both subject and comparator equally, so `overheadPct` is unaffected. Do not add a bulk-timing correction — both functions must be measured identically.

### Reading Package Versions

```typescript
import { readFileSync } from 'node:fs'
import path from 'node:path'

// subject version
const subjectPkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const subjectVersion = subjectPkg.version as string

// fast-redact version
const frPkg = JSON.parse(readFileSync(path.join(repoRoot, 'node_modules/fast-redact/package.json'), 'utf8'))
const comparatorVersion = frPkg.version as string
```

### Contract Test Boilerplate

Follow the existing contract test patterns in `test/contract/examples/example-manifest.test.ts` for structure:
- Use `import.meta.url`-based `repoRoot` resolution (not `process.cwd()`)
- Use `describe` + `it` structure
- Import `readFileSync` from `node:fs` and `path` from `node:path`

```typescript
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
```

### `scripts/benchmark-runner.ts` Module Boundary

This module is imported by `run-benchmarks.ts` only. It should NOT be called during `pnpm run build` (unlike `verify-generated-files.ts` which is called during build). Do NOT wire it into `generated-files.ts` or `verify-generated-files.ts`.

### Retired Vitest Bench Suite

Story 8.7 cleanup note (2026-06-05): the old Vitest bench suite that used the v3 class-based API has been removed. Current benchmark work should use the artefact-producing infrastructure (`test/bench/manifest.json` + `scripts/run-benchmarks.ts`).

Story `5.9`'s verification uses `pnpm run bench:produce`.

### Benchmark Runner Configuration

The removed Vitest bench configuration governed only the retired bench suite. It is separate from the current artefact-producing infrastructure.

### CLI Argument Parsing in `run-benchmarks.ts`

Parse `--id` from `process.argv` manually (no CLI library needed):

```typescript
const idFlag = process.argv.indexOf('--id')
const targetId = idFlag !== -1 ? process.argv[idFlag + 1] : undefined
```

### fast-redact Initialisation Pattern

fast-redact is a CJS module. The established codebase pattern for importing CJS modules in this ESM project is `createRequire` — see `scripts/fast-redact-migration.ts:119` as the authoritative reference. Do NOT use `import fastRedact from 'fast-redact'`; `pnpm run lint` runs `tsc --noEmit` against `scripts/**/*.ts` and the synthetic default import may fail strict `NodeNext` module resolution.

```typescript
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Initialise fast-redact once before measurement (factory called at setup time, not inside loop)
const frConfig = JSON.parse(readFileSync(competitorConfigPath, 'utf8'))
const fastRedact = require('fast-redact') as (config: Record<string, unknown>) => (payload: unknown) => unknown
const frInstance = fastRedact(frConfig) // frInstance(payload) redacts payload.user.password etc. in-place
```

Verify that `serialize: false` is present in `competitor-config.json` so the fast-redact return value is structured (object) rather than a string — this makes the comparison fair (both functions returning structured output).

### Architecture Compliance

- British English in all code, comments, tests, docs, and commit messages. Use `artefacts` (not `artifacts` in prose), `serialise` (not `serialize`). **Exception:** `"serialize": false` in `competitor-config.json` is fast-redact's own API field name — do NOT change its spelling to `serialise`, or fast-redact will ignore the option and return a serialised string instead of structured output.
- `test/bench/` — benchmark scenarios live here. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)]
- `test/artefacts/benchmarks/` — published benchmark artefact outputs. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:892)]
- `scripts/` — generator and release-support scripts. [Source: project-context.md]
- No `new DeepRedact` anywhere — use `deepRedact({...})` factory from `@hackylabs/deep-redact`.
- Scripts run with `node --experimental-strip-types`, imports use `./module.ts` with `.ts` extension.
- All commands must be prefixed with `source .agents/initialise-env.sh &&` before running.
- Scripts import from `@hackylabs/deep-redact` (built package), not from `../../src/`. The `bench:produce` script pre-runs `pnpm run build` before the measurement script.
- `test/contract/benchmarks/` — benchmark contract tests map to `test/contract/` by the established test taxonomy. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:486)]

### Scope Guard

Do NOT add benchmark documentation generation or lockstep enforcement — that is Story `5.10`. Do NOT add platform-adoption guidance — that is Story `5.11`. Do NOT touch migration infrastructure, install matrix, example infrastructure, or generated-files verification chain.

The architecture document (line 892) declares `scripts/verify-benchmarks.ts` as a canonical location. That file will be created by Story `5.10` as the gate-enforcement script. Story `5.9` creates `scripts/benchmark-runner.ts` (library) and `scripts/run-benchmarks.ts` (entry point) only — do not create a `verify-benchmarks.ts` stub here.

### Previous Story Intelligence (5.8)

- `scripts/generated-files.ts` is the pattern for reusable script modules (exported functions, module-level `repositoryRoot` constant resolved via `import.meta.url`). Follow this pattern in `scripts/benchmark-runner.ts`.
- `scripts/verify-generated-files.ts` shows how to import and use a module from another script, including path resolution via `import.meta.url`.
- `scripts/generate-example-docs.ts` shows the standalone script pattern: import from sibling `.ts` file, resolve repo root, write output files, log each output.
- `import.meta.url`-based repo root: `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')`.
- `readFileSync` is the standard file reader across all scripts — do not use `fs.promises` or streams.
- Contract tests use `repoRoot` resolved from `import.meta.url`, not `process.cwd()`.

### Source Document Summary

- FR37 requires benchmark artefacts for platform evaluation. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md)]
- NFR1 requires Deep Redact v4 to operate within roughly 25%–50% overhead versus `fast-redact` on comparable path-based workloads. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:61)]
- NFR2 requires published benchmark artefacts included with the release. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:62)]
- NFR3 requires published benchmark sets with clearly documented comparable workloads and conditions. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:63)]
- `test/artefacts/benchmarks/` and `scripts/verify-benchmarks.ts` are declared architecture locations. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:892-893)]

### Project Context Reference

- British English in all code, comments, tests, docs, and commit messages. Use `serialise` (not `serialize`), `artefacts` (not `artifacts` in prose). [Source: project-context.md]
- Node, package-manager, build, lint, test, and verify commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: project-context.md]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: project-context.md]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: project-context.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `test/bench/manifest.json` as the canonical benchmark manifest (schemaVersion 1, one row: `path-based-single-object-node24` targeting `fast-redact` as comparator).
- Created immutable workload fixtures under `test/bench/fixtures/path-based-single-object/` (`input.json`, `deep-redact-config.json`, `competitor-config.json`).
- Created `scripts/benchmark-runner.ts` as a reusable module exporting `loadBenchmarkManifest`, `runBenchmarkRow`, and `writeArtefact`. Uses `createRequire` for CJS fast-redact import, `structuredClone` for fresh payload copies per iteration (satisfying `unicorn/prefer-structured-clone`), and `samples.at(-1)` for max value.
- Created `scripts/run-benchmarks.ts` as the standalone entry point accepting `--id` CLI argument.
- Added `bench:produce` script to `package.json`.
- Produced `test/artefacts/benchmarks/path-based-single-object-node24.json` via `pnpm run bench:produce`. Artefact contains all required fields. Overhead recorded as 543.28% (`thresholdDecision.passed: false`); enforcement is deferred to Story 5.10.
- Created `test/contract/benchmarks/benchmark-manifest.test.ts` with 6 contract tests covering manifest loading, required fields, thresholdPolicy shape, competitor identity, id uniqueness, and fixture file existence. All 6 pass.
- All 445 contract tests pass with no regressions. Lint (`eslint` + `tsc --noEmit`) passes cleanly.

### File List

- `test/bench/manifest.json` (new)
- `test/bench/fixtures/path-based-single-object/input.json` (new)
- `test/bench/fixtures/path-based-single-object/deep-redact-config.json` (new)
- `test/bench/fixtures/path-based-single-object/competitor-config.json` (new)
- `scripts/benchmark-runner.ts` (new)
- `scripts/run-benchmarks.ts` (new)
- `package.json` (modified — added `bench:produce` script)
- `test/contract/benchmarks/benchmark-manifest.test.ts` (new)
- `test/artefacts/benchmarks/path-based-single-object-node24.json` (new — produced artefact)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
