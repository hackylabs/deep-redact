# Story 10.2: Eliminate the Serialise-Output Depth Cliff with Lazy Path Tracking

Status: ready-for-dev

## Story

As a backend engineer logging redacted payloads,
I want the serialise-only output adapter to stop building a path string and running per-key work on every node during descent, materialising the reference path only when a circular reference is actually emitted,
so that `serialise: true` no longer degrades non-linearly with payload depth.

## Context

`serialise: true` is the primary safe-logging path: object-mode output (`serialise: false`) is **not** safe for a caller's own `JSON.stringify` — it throws on `BigInt` and circular references and silently collapses `Map`/`Set` to `{}` and drops `undefined`. The `buildSafeGraph` adapter (Story 8.3) exists to guarantee no-throw, no-silent-loss serialised output, so this path is load-bearing for the dominant logging job.

An ad-hoc scaling experiment (2026-06-13, v4 vs deep-redact-v2 2.2.1, matched configs, frozen shared input) showed the serialised gap stable at ~1.8× under breadth but blowing out to ~7× under depth (deep-200: 6.86×; wide+deep: 7.01×). Root cause: `buildSafeGraph` eagerly builds a path string per node on descent (`buildObjectChildPath` / `buildArrayChildPath`, including a `bareIdentifierPattern.test(key)` per object key) and maintains per-node identity bookkeeping — work whose only externally-observable product is the circular-marker `path`, consumed **only** when a cycle is actually emitted.

This story moves that work off the hot descent path and materialises the reference path lazily (walking a retained ancestor chain) only when a cycle is detected.

**Preserved vs changeable surfaces.** The **public API is preserved on both surfaces**: the **initialisation/configuration API** (`deepRedact` / `createRedactor` factories, every configuration option, and exported initialisation/input types) and the **runtime input contract** (the callable redactor's accepted input) are unchanged. Output may change at the epic level (Story 10.1 reconciles the circular-marker contract), but **Story 10.2 is output-neutral relative to Story 10.1's reconciled contract** — it changes performance, not output, gated byte-for-byte against the 10.1 baseline. The Story 8.3 two-pass boundary is **preserved** — no fuse of `buildSafeGraph` into `redactValue` (the leak-safety and maintainability reasons stand regardless of output latitude). The breadth ~1.8× gap is left untouched (noise).

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

1. **Given** `serialise: true` and an acyclic payload
   **When** `buildSafeGraph` descends
   **Then** no per-node path string is constructed and `bareIdentifierPattern.test(key)` is not invoked on the descent path.

2. **And** cycle detection continues to use an ancestor-identity structure sufficient to detect a back-edge without eagerly constructing a per-node path string.

3. **Given** a circular reference (or a `cycleRegistry` back-edge) is detected
   **When** the `{ _transformer: 'circular', path, value }` marker is emitted
   **Then** its `path`/`value` matches the reconciled Story 10.1 contract, materialised lazily from the retained ancestor chain, preserving the `isStrictDescendantPath` registry comparison.

4. **Given** the byte-equivalence gate against the **Story 10.1 reconciled baseline**, plus exotic-type (`Map`, `Set`, `BigInt`, `Symbol`, `Date`, `Error`, `RegExp`, `URL`), throwing/non-idempotent getter, and nested/deep coverage
   **When** the full suite runs
   **Then** Story 10.2 introduces **no further output change** and all tests pass.

5. **Given** the change
   **Then** the public API is unchanged on both surfaces — the initialisation/configuration API (factories, options, exported init/input types) and the runtime input contract — and `buildSafeGraph` remains a separate pass from `redactValue` (no fuse); the breadth ~1.8× gap is left untouched.

6. **And** the per-node descent overhead no longer scales with depth, measured on the canonical **`deep-object` / `deep-object-serialised`** benchmark fixtures (rows `deep-non-serialised-*` / `deep-serialised-*`) now committed to both the speed and resource suites.

7. **Given** the committed **`deep-redact-v4-baseline`** comparator (`npm:@hackylabs/deep-redact@4.0.0`) and the canonical `deep-serialised-v4baseline-node24` / `deep-non-serialised-v4baseline-node24` rows (speed + resource), which capture current-vs-4.0.0 at ~0% today
   **When** the candidate is re-measured on those same rows after this story's change
   **Then** the candidate is **measurably faster** than 4.0.0 on the serialised depth row (median improvement beyond run-to-run noise)
   **And within noise** of 4.0.0 on the object-mode row (no regression)
   **And** the `deep-serialised-v4baseline-node24` row is **flipped from `informational` to a gating `runScope`** (e.g. `release-candidate`) with `maxOverheadPct ≤ 0`, so the improvement vs 4.0.0 is enforced for the 4.0.1 release rather than merely recorded.

## Tasks / Subtasks

- [ ] AC 1–2 — Make descent path/identity tracking lazy in `src/core/replacement/serialise-output.ts` (AC: 1, 2)
  - [ ] Stop computing `currentPath`/child paths on every descent; retain only the ancestor-identity structure needed for cycle detection
  - [ ] Establish a retained ancestor linkage (parent chain) cheap to walk on demand
- [ ] AC 3 — Lazy marker-path materialisation to the Story 10.1 contract; preserve `isStrictDescendantPath` (AC: 3)
- [ ] AC 4 — Byte-equivalence against the 10.1 baseline + exotic/getter/deep coverage (AC: 4)
- [ ] AC 5 — Confirm both public-API surfaces unchanged; no fuse; breadth untouched (AC: 5)
- [ ] AC 6 — Re-measure the committed `deep-*` rows and confirm depth no longer scales the per-node overhead (AC: 6)
- [ ] AC 7 — Re-run the `deep-*-v4baseline` rows and flip `deep-serialised-v4baseline-node24` from `informational` to a gating scope (`maxOverheadPct ≤ 0`), refreshing the benchmark docs, so the improvement vs 4.0.0 is enforced (AC: 7)
- [ ] Verify: `source .agents/initialise-env.sh && pnpm run test && pnpm lint`

## Dev Notes

### Key Files

- `src/core/replacement/serialise-output.ts` — `buildSafeGraph` and helpers `buildObjectChildPath`, `buildArrayChildPath`, `bareIdentifierPattern`, `isStrictDescendantPath`; the `seen` (WeakSet), `identityPaths` (WeakMap), and `cycleRegistry` bookkeeping.
- `src/core/create-redactor.ts` — serialise branch; `cycleRegistry` is populated by the general traversal and passed into `serialiseOutput`. The lazy path must still satisfy the registry-based `isStrictDescendantPath(registryPath, currentPath)` comparison.

### Design (smallest viable change)

- Keep `seen` / identity tracking for cycle detection. Replace eager `currentPath` threading + per-key `buildObjectChildPath` / `buildArrayChildPath` with a retained parent chain (each frame links to its parent plus the key taken), materialising the concrete path string only inside the cycle/registry branches.
- **Lazy half only** — explicitly **not** the fuse of `buildSafeGraph` into `redactValue`.

### Baseline & before/after gate

- The infrastructure is **already in place** (formalised 2026-06-13): the `deep-redact-v4-baseline` comparator (`npm:@hackylabs/deep-redact@4.0.0` + adapter under `test/bench/competitors/`), the `deep-object` / `deep-object-serialised` fixtures, and `deep-*` rows in both the speed and resource manifests are committed, with artefacts and `docs/benchmarks/*-results.md` regenerated. Current-vs-4.0.0 reads ~0% today (baseline captured).
- This story's gate work is therefore just to **re-measure and tighten**: regenerate the `deep-*` artefacts on the candidate, confirm `deep-serialised-v4baseline-node24` shows a clear negative overhead, then change that row's `thresholdPolicy` from `runScope: ['informational']` to a gating scope with `maxOverheadPct ≤ 0`, and refresh the benchmark docs.
- Leave the object-mode and breadth rows informational — they guard against regression, not improvement.

### Constraints / Risks

- Output-neutral relative to Story 10.1: the marker `path`/`value` strings must equal 10.1's reconciled baseline byte-for-byte. A lazily-rebuilt path that reorders one bracket or segment is a silent change → fail.
- Preserve the `cycleRegistry` path-comparison semantics (`isStrictDescendantPath`).
- Both public-API surfaces (initialisation/configuration and runtime input) are unchanged.
- Depends on Story 10.1 (reconciled marker contract) landing first.
- British English in comments.

### Out of Scope

- Fusing `buildSafeGraph` into the general traversal (re-couples Story 8.3).
- The breadth ~1.8× serialise gap (treated as noise).
- Promoting the ad-hoc benchmark scripts (`scripts/adhoc-serialise-scaling-bench.ts`, `scripts/adhoc-serialise-safety-demo.ts`) into the canonical suite — user decision pending.

### References

- Epic 10 story text: [Source: _bmad-output/planning-artifacts/epics.md#Epic 10]
- Story 10.1 (reconciled marker contract — the refactor target): [Source: _bmad-output/implementation-artifacts/10-1-reconcile-serialised-circular-marker-semantics.md]
- Story 8.3 (serialise-only adapter): [Source: _bmad-output/implementation-artifacts/8-3-move-transformer-and-circular-handling-into-a-serialise-only-output-adapter.md]
- Serialise adapter source: `src/core/replacement/serialise-output.ts`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-06-13: Story drafted (lazy path tracking; byte-identical to current output).
- 2026-06-13: Revised — gate retargeted to Story 10.1's reconciled baseline (output-neutral vs 10.1); public API preserved on both the initialisation/configuration and runtime-input surfaces.
- 2026-06-13: Added a before/after performance gate (AC 7) requiring the candidate to beat the released 4.0.0 baseline on the serialised depth workload (and not regress elsewhere), with 4.0.0 sourced as an npm comparator (`@hackylabs/deep-redact@4.0.0`).
- 2026-06-13: Benchmark formalised — `deep-redact-v4-baseline` comparator, `deep-object` / `deep-object-serialised` fixtures, and `deep-*` rows committed to both the speed and resource suites with informational baseline measurements (current-vs-4.0.0 ~0%). AC 6/7 retargeted from "fixture pending decision" to "re-measure and flip the `deep-serialised-v4baseline` row to a gating scope".
