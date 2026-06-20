---
baseline_commit: 4925a35f0c4c50305ca132dcaee402c486451352
---

# Story 10.2: Eliminate the Serialise-Output Depth Cliff with Lazy Path Tracking

Status: done

## Story

As a backend engineer logging redacted payloads,
I want the serialise-only output adapter to stop building a path string and running per-key work on every node during descent, materialising the reference path only when a circular reference is actually emitted,
so that `serialise: true` no longer degrades non-linearly with payload depth.

## Context

`serialise: true` is the primary safe-logging path: object-mode output (`serialise: false`) is **not** safe for a caller's own `JSON.stringify` — it throws on `BigInt` and circular references and silently collapses `Map`/`Set` to `{}` and drops `undefined`. The `buildSafeGraph` adapter (Story 8.3) exists to guarantee no-throw, no-silent-loss serialised output, so this path is load-bearing for the dominant logging job.

An ad-hoc scaling experiment (2026-06-13, v4 vs deep-redact-v2 2.2.1, matched configs, frozen shared input) showed the serialised gap stable at ~1.8× under breadth but blowing out to ~7× under depth (deep-200: 6.86×; wide+deep: 7.01×). Root cause: `buildSafeGraph` (and the transformer-wrapper helper `buildTransformedGraph`) eagerly builds a path string per node on descent (`buildObjectChildPath` / `buildArrayChildPath`, including a `bareIdentifierPattern.test(key)` per object key — note `buildTransformedGraph` runs this for the `_transformer` wrapper key on *every* acyclic Map/Set node too) and maintains per-node identity bookkeeping (`identityPaths.set` on every descent). The externally-observable product of that work is the circular-marker's `path` **and** `value` fields, consumed **only** when a cycle is actually emitted.

This story moves that work off the hot descent path and materialises the reference path lazily (walking a retained ancestor chain) only when a cycle is detected.

**Preserved vs changeable surfaces.** The **public API is preserved on both surfaces**: the **initialisation/configuration API** (`deepRedact` / `createRedactor` factories, every configuration option, and exported initialisation/input types) and the **runtime input contract** (the callable redactor's accepted input) are unchanged. Output may change at the epic level (Story 10.1 reconciles the circular-marker contract), but **Story 10.2 is output-neutral relative to Story 10.1's reconciled contract** — it changes performance, not output, gated byte-for-byte against the 10.1 baseline. The Story 8.3 two-pass boundary is **preserved** — no fuse of `buildSafeGraph` into `redactValue` (the leak-safety and maintainability reasons stand regardless of output latitude). The breadth ~1.8× gap is left untouched (noise).

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

1. **Given** `serialise: true` and an acyclic payload
   **When** `buildSafeGraph` **and `buildTransformedGraph`** descend
   **Then** no per-node path string is constructed and `bareIdentifierPattern.test(key)` is not invoked on the descent path — including the `_transformer` wrapper key inside `buildTransformedGraph` (currently `bareIdentifierPattern.test('_transformer')` runs per transformed Map/Set node).

2. **And** cycle detection continues to use an ancestor-identity structure sufficient to detect a back-edge without eagerly constructing a per-node path string, and the existing `depth` / `MAX_SERIALISE_DEPTH` recursion guard (Story 10.1 review patch) is preserved across the new descent signature.

3. **Given** a circular reference (or a `cycleRegistry` back-edge) is detected at **any of the three current emission sites** — supported-kind/transformed identity (`seen`), plain object/array (`seen`), and the `cycleRegistry` back-edge
   **When** the `{ _transformer: 'circular', path, value }` marker is emitted
   **Then** its `path`/`value` matches the reconciled Story 10.1 contract, materialised lazily from the retained ancestor chain, preserving the `isStrictDescendantPath` registry comparison. Note the marker `value` (for `seen`-based cycles) is the **ancestor's** first-seen path, not the current path — so the retained chain must carry each frame's object **identity** (not just its key) to find and materialise the matching ancestor frame's path; the `cycleRegistry` site's `value` (`registryPath`) is already a stored string and is unaffected.

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
   **And** the **speed-manifest** `deep-serialised-v4baseline-node24` row has its `thresholdPolicy.runScope` **flipped from `['informational']` to a gating scope** (e.g. `release-candidate`) with `maxOverheadPct ≤ 0`, so the improvement vs 4.0.0 is enforced for the 4.0.1 release rather than merely recorded. The gate flip applies to the **speed manifest only** — the resource manifest is informational-by-design (`resource-manifest.json`: "informational only, no gate policy"; its rows carry no `thresholdPolicy`), so the resource `deep-serialised-v4baseline-node24` row stays an informational measurement and is **not** gated.

## Tasks / Subtasks

- [x] AC 1–2 — Make descent path/identity tracking lazy in `src/core/replacement/serialise-output.ts` (AC: 1, 2)
  - [x] Stop computing `currentPath`/child paths on every descent in **both** `buildSafeGraph` **and `buildTransformedGraph`** (the latter's `_transformer` wrapper key currently triggers `buildObjectChildPath` → `bareIdentifierPattern.test` per transformed node); retain only the ancestor-identity structure needed for cycle detection
  - [x] Establish a retained ancestor linkage (parent chain) cheap to walk on demand, carrying each frame's object **identity** and the key taken
  - [x] Preserve the `depth` / `MAX_SERIALISE_DEPTH` recursion guard (Story 10.1 review patch W1, pinned by the identity-manufacturing regression test) across the refactored descent signature
- [x] AC 3 — Lazy marker-path materialisation to the Story 10.1 contract at all three emission sites (two `seen` sites + the `cycleRegistry` back-edge); materialise the marker `value` (ancestor's first-seen path) by walking the identity-tagged chain; preserve `isStrictDescendantPath` (AC: 3)
- [x] AC 4 — Byte-equivalence against the 10.1 baseline + exotic/getter/deep coverage (AC: 4)
- [x] AC 5 — Confirm both public-API surfaces unchanged; no fuse; breadth untouched (AC: 5)
- [x] AC 6 — Re-measure the committed `deep-*` rows and confirm depth no longer scales the per-node overhead (AC: 6)
- [x] AC 7 — Re-run the `deep-*-v4baseline` rows and flip the **speed-manifest** `deep-serialised-v4baseline-node24` row's `thresholdPolicy.runScope` from `['informational']` to a gating scope (`maxOverheadPct ≤ 0`), refreshing the benchmark docs, so the improvement vs 4.0.0 is enforced. Leave the resource-manifest row informational (the resource suite has no gate mechanism by design) (AC: 7)
- [x] Verify: `source .agents/initialise-env.sh && pnpm run test && pnpm lint`

## Dev Notes

### Key Files

- `src/core/replacement/serialise-output.ts` — `buildSafeGraph`, **`buildTransformedGraph`** (added by Story 10.1 — the transformer-wrapper recursion that must also go lazy; its `_transformer` wrapper key currently runs `buildObjectChildPath`/`bareIdentifierPattern.test` per transformed Map/Set node), and helpers `buildObjectChildPath`, `buildArrayChildPath`, `bareIdentifierPattern`, `isStrictDescendantPath`; the `seen` (WeakSet), `identityPaths` (WeakMap), and `cycleRegistry` bookkeeping; the **`depth` counter and `MAX_SERIALISE_DEPTH` recursion guard** (added by the Story 10.1 review patch W1 — must be preserved through the refactored descent signature). Three circular-marker emission sites: supported-kind/transformed identity `seen`, plain object/array `seen`, and the `cycleRegistry` back-edge.
- `src/core/create-redactor.ts` — serialise branch; `cycleRegistry` is populated by the general traversal and passed into `serialiseOutput`. The lazy path must still satisfy the registry-based `isStrictDescendantPath(registryPath, currentPath)` comparison.

### Design (smallest viable change)

- Keep `seen` / identity tracking for cycle detection. Replace eager `currentPath` threading + per-key `buildObjectChildPath` / `buildArrayChildPath` (in **both** `buildSafeGraph` and `buildTransformedGraph`) with a retained parent chain (each frame links to its parent plus the **object identity and key taken**), materialising the concrete path string only inside the cycle/registry branches.
- The marker has **two** path-derived fields, both currently fed by the eager `identityPaths.set` on descent: `path` (current location of the back-edge) and `value` (where the target identity was first seen). The lazy `path` is the current frame's chain walked to root; the lazy `value` for `seen`-based cycles is the **ancestor frame's** chain — hence frames must carry identity so the matching ancestor can be located and its path materialised. The `cycleRegistry` site's `value` is the already-stored `registryPath` and needs no chain walk.
- Preserve the `depth` / `MAX_SERIALISE_DEPTH` recursion guard added by the Story 10.1 review (degrades identity-manufacturing transformers to `[UNSUPPORTED]`); thread the counter through the new descent signature and keep its regression test green.
- **Lazy half only** — explicitly **not** the fuse of `buildSafeGraph` into `redactValue`.

### Baseline & before/after gate

- The infrastructure is **already in place** (formalised 2026-06-13): the `deep-redact-v4-baseline` comparator (`npm:@hackylabs/deep-redact@4.0.0` + adapter under `test/bench/competitors/`), the `deep-object` / `deep-object-serialised` fixtures, and `deep-*` rows in both the speed and resource manifests are committed, with artefacts and `docs/benchmarks/*-results.md` regenerated. Current-vs-4.0.0 reads ~0% today (baseline captured).
- This story's gate work is therefore just to **re-measure and tighten**: regenerate the `deep-*` artefacts on the candidate, confirm `deep-serialised-v4baseline-node24` shows a clear negative overhead, then change that row's `thresholdPolicy` from `runScope: ['informational']` to a gating scope with `maxOverheadPct ≤ 0`, and refresh the benchmark docs.
- Leave the object-mode and breadth rows informational — they guard against regression, not improvement.

### Constraints / Risks

- Output-neutral relative to Story 10.1: the marker `path`/`value` strings must equal 10.1's reconciled baseline byte-for-byte. A lazily-rebuilt path that reorders one bracket or segment is a silent change → fail.
- Preserve the `cycleRegistry` path-comparison semantics (`isStrictDescendantPath`).
- Both public-API surfaces (initialisation/configuration and runtime input) are unchanged.
- Depends on Story 10.1 (reconciled marker contract) landing first. 10.1 is `done` and its fix is in the source on this branch (`release/v4.0.1`), but its AC 4 (the `fix:` release commit) is still outstanding — so 10.2's byte-equivalence gate (AC 4) must baseline against the **committed 10.1 source output**, not a release commit that has not yet been made.
- British English in comments.

### Out of Scope

- Fusing `buildSafeGraph` into the general traversal (re-couples Story 8.3).
- The breadth ~1.8× serialise gap (treated as noise).
- (Removed 2026-06-20: the prior "promote the ad-hoc benchmark scripts" item is moot — `scripts/adhoc-serialise-scaling-bench.ts` / `scripts/adhoc-serialise-safety-demo.ts` are not present in the tree or git history; the canonical `deep-object` / `deep-object-serialised` fixtures and `deep-*` rows already supersede any ad-hoc script.)

### References

- Epic 10 story text: [Source: _bmad-output/planning-artifacts/epics.md#Epic 10]
- Story 10.1 (reconciled marker contract — the refactor target): [Source: _bmad-output/implementation-artifacts/10-1-reconcile-serialised-circular-marker-semantics.md]
- Story 8.3 (serialise-only adapter): [Source: _bmad-output/implementation-artifacts/8-3-move-transformer-and-circular-handling-into-a-serialise-only-output-adapter.md]
- Serialise adapter source: `src/core/replacement/serialise-output.ts`

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- Green baseline before refactor: 738 contract tests passing.
- Byte-equivalence cross-check: the `loopBack`/Set deep fixture output was captured from the **baseline** source (`git stash` of `serialise-output.ts`) and matched the refactored output byte-for-byte (`{"outer":{"items":{"_transformer":"set","value":[{"loopBack":{"items":{"_transformer":"circular","path":"outer.items.0.loopBack.items","value":"outer.items"}}}]}}}`), confirming the lazy chain reproduces the redact-prepass + serialise interaction unchanged.
- Speed gate (release-candidate scope): `deep-serialised-v4baseline-node24` overhead **-4.63%** (threshold −100%–0%, passed); `deep-non-serialised-v4baseline-node24` **-0.6%** (within noise, informational). Two prior measurements read -4.28% / -4.88%, i.e. a stable, reproducible improvement vs 4.0.0.
- Final: 742 contract tests passing; `pnpm lint` (eslint + `tsc --noEmit`) clean; `verify:speed-benchmarks` and `verify:resource-benchmarks` pass in release-candidate scope.

### Completion Notes List

- **Lazy path tracking (AC 1–2).** Replaced the eager `currentPath` string threading and the `identityPaths` WeakMap with a retained `PathFrame` linked chain. Each *container* node allocates a single frame carrying `{ parent, key, index, identity }`; primitives and other leaves allocate nothing. For acyclic payloads no path string is built and `bareIdentifierPattern.test` is never invoked on the descent path — including the `_transformer` wrapper key inside `buildTransformedGraph`, which now passes the container's frame straight through (transparent `value` step) instead of calling `buildObjectChildPath`. `seen` (WeakSet) still provides O(1) cycle detection; the `depth`/`MAX_SERIALISE_DEPTH` guard is threaded through the new signature and its identity-manufacturing regression test stays green.
- **Lazy materialisation (AC 3).** Path strings are materialised on demand only at the three emission sites by walking the frame chain and replaying the exact `buildObjectChildPath`/`buildArrayChildPath` steps (so output is byte-identical, root rendered as `''`). The marker `value` for `seen`-based cycles is the back-edge target's first-seen path, found by walking the chain for the matching `identity` (always an active ancestor) and materialising that frame; the `cycleRegistry` site's `value` remains the stored `registryPath`, and `isStrictDescendantPath` is preserved.
- **Byte-equivalence (AC 4).** Output-neutral vs the committed Story 10.1 source: full suite green, plus four new deep-cycle tests pinning a depth-120 back-edge to root, a mid-chain ancestor `value`, a bracket-quoted non-bareword segment, and a path-transparent Set frame at depth.
- **API unchanged / no fuse (AC 5).** Only internal `buildSafeGraph`/`buildTransformedGraph` signatures changed; `serialiseOutput`'s public signature, all factories/options/types, and the runtime input contract are untouched. `buildSafeGraph` remains a separate pass from `redactValue`. Breadth path left untouched.
- **Benchmarks (AC 6–7).** Regenerated all `deep-*` speed and resource artefacts on the candidate and both `docs/benchmarks/*-results.md`. Flipped the **speed-manifest** `deep-serialised-v4baseline-node24` `thresholdPolicy` from `runScope: ['informational']` / `maxOverheadPct: 100000` to `runScope: ['protected-branch','release-candidate']` / `maxOverheadPct: 0`, enforcing the improvement vs 4.0.0 for the 4.0.1 release. The resource-manifest row was left informational (the resource suite carries no `thresholdPolicy` by design). The novel `maxOverheadRationale` key was deliberately *not* added, to keep the gated-row shape identical to existing gated rows and the `BenchmarkThresholdPolicy` interface.

### File List

- `src/core/replacement/serialise-output.ts` — lazy `PathFrame` chain; removed `identityPaths` WeakMap; new `materialiseFramePath` / `materialiseStepPath` / `materialiseAncestorPath` helpers; refactored `buildSafeGraph` / `buildTransformedGraph` descent signatures.
- `test/contract/api/create-redactor.test.ts` — four new deep-cycle coverage tests under "Circular references and revisited identities".
- `test/bench/speed-manifest.json` — flipped `deep-serialised-v4baseline-node24` row to a gating scope (`maxOverheadPct: 0`).
- `docs/benchmarks/speed-results.md`, `docs/benchmarks/resource-results.md` — regenerated from refreshed artefacts (lockstep).
- `test/artefacts/benchmarks/speed/deep-*.json` (9 rows) and `test/artefacts/benchmarks/resource/deep-*.json` (9 rows) — re-measured on the candidate.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status `in-progress` → `review`.
- `_bmad-output/implementation-artifacts/10-2-eliminate-serialise-output-depth-cliff-with-lazy-path-tracking.md` — frontmatter `baseline_commit`, task checkboxes, this record, status.

## Change Log

- 2026-06-13: Story drafted (lazy path tracking; byte-identical to current output).
- 2026-06-13: Revised — gate retargeted to Story 10.1's reconciled baseline (output-neutral vs 10.1); public API preserved on both the initialisation/configuration and runtime-input surfaces.
- 2026-06-13: Added a before/after performance gate (AC 7) requiring the candidate to beat the released 4.0.0 baseline on the serialised depth workload (and not regress elsewhere), with 4.0.0 sourced as an npm comparator (`@hackylabs/deep-redact@4.0.0`).
- 2026-06-13: Benchmark formalised — `deep-redact-v4-baseline` comparator, `deep-object` / `deep-object-serialised` fixtures, and `deep-*` rows committed to both the speed and resource suites with informational baseline measurements (current-vs-4.0.0 ~0%). AC 6/7 retargeted from "fixture pending decision" to "re-measure and flip the `deep-serialised-v4baseline` row to a gating scope".
- 2026-06-20: Implemented. Replaced eager `currentPath`/`identityPaths` descent bookkeeping with a lazy retained `PathFrame` chain materialised only at circular-marker emission; output byte-identical to the 10.1 baseline (742 contract tests green, lint clean). Re-measured the `deep-*` rows (serialised v4baseline ~-4.6% vs 4.0.0, object-mode within noise) and flipped the speed-manifest `deep-serialised-v4baseline-node24` row to a gating scope (`maxOverheadPct: 0`); resource row left informational. Benchmark docs regenerated; both verify gates pass in release-candidate scope.
- 2026-06-20: Validation pass against the post-10.1 codebase. Refreshed for staleness — Key Files/Design/AC 1–3 now name `buildTransformedGraph` and the `depth`/`MAX_SERIALISE_DEPTH` recursion guard (both added by Story 10.1 after this story was last revised) as surfaces the lazy refactor must touch/preserve; AC 1 corrected to flag that `bareIdentifierPattern.test('_transformer')` runs per transformed Map/Set node today. AC 3/Design clarified that the marker `value` (ancestor's first-seen path) needs identity-tagged frames, and that all three emission sites are in scope. AC 7 re-scoped to the **speed manifest only** (resource manifest is informational-by-design, no gate mechanism). Out-of-Scope ad-hoc-script item removed (files absent from tree and git history). Constraint added: byte-equivalence baselines against the committed 10.1 source (10.1 AC 4 release commit still outstanding).
