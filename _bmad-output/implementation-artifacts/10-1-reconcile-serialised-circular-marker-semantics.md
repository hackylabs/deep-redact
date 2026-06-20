---
baseline_commit: fb1240991f1084768926b1a255cf2b066ec12446
---

# Story 10.1: Reconcile the Serialised Circular-Marker Semantics

Status: done

**Type:** Bug fix (patch on the v4 line, 4.0.x)

## Story

As a maintainer,
I want the serialised circular-marker `path` for cycles through `Map` and `Set` corrected so it reads consistently with object/array cycle paths and with the marker's own `value` field,
so that the circular-marker contract is consistent, a now-known serialisation bug is fixed, and Story 10.2 has a stable target contract to refactor against.

## Context

Story 8.3 moved transformer and circular-reference handling into the serialise-only output adapter (`buildSafeGraph` in `src/core/replacement/serialise-output.ts`). The 8.3 code review (2026-05-31) recorded a still-open deferred item about inconsistent circular-marker `path` semantics for self-cyclic `Set`/`Map` values.

A probe of the built code (2026-06-13) confirmed and **widened** the bug. A `Set`/`Map` is serialised as `{"_transformer":"set","value":[…]}` / `{"_transformer":"map","value":{…}}`, and a cycle through it leaks the transformer's synthetic `value` wrapper into the marker `path`:

| shape | current (buggy) `path` | corrected `path` |
|---|---|---|
| root Set self-cycle | `value.0` | `0` |
| root Map self-cycle | `value.me` | `me` |
| nested Set self-cycle | `roles.value.0` | `roles.0` |
| nested Map self-cycle | `meta.value.me` | `meta.me` |

This is inconsistent with object/array cycle paths (`user.self`, `list.0`, `a.ref.ref` — all clean) **and** with the marker's own `value` field, which is already rendered against the logical structure (e.g. `value:"roles"`, not `value:"roles.value"`). The 8.3 note described this as bare-root only; the probe shows **nested Set/Map are affected too** — so the fix covers both root and nested positions, and any future transformer-wrapped container that can hold references.

**Classification & versioning.** This corrects incorrect/inconsistent output, so it ships as a **patch on the v4 line (4.0.x)** — a bug fix, not a breaking contract change. Unchanged: the initialisation/configuration API (`deepRedact`/`createRedactor`, every option, exported types), the runtime input contract, all object-mode output, every non-Map/Set serialised marker, and the marker `value` field. The corrected Map/Set marker `path` should still be **called out in the changelog** for any consumer that parses circular markers in Map/Set payloads.

This story precedes Story 10.2: 10.2's lazy-path refactor must reproduce a *settled, correct* marker contract byte-for-byte. The corrected `path` (logical, no synthetic `value` segment) is also chosen to be **cheap to materialise from an ancestor chain**, aligning with 10.2.

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

1. **Given** the probe matrix (root and nested Set/Map self-cycles, plus object/array/mutual cycles as controls)
   **When** current output is characterised
   **Then** the buggy Map/Set marker `path` strings are recorded as the baseline being corrected.

2. **Given** a cycle through a `Set` or `Map`
   **When** the circular marker is emitted
   **Then** its `path` no longer contains the transformer's synthetic `value` segment and reads consistently with object/array cycle paths and with the marker's own `value` field — `value.0`→`0`, `value.me`→`me`, `roles.value.0`→`roles.0`, `meta.value.me`→`meta.me` — asserted by golden tests, in both root and nested positions.

3. **Given** the public API and unaffected output
   **Then** the initialisation/configuration API, the runtime input contract, all object-mode output, every non-Map/Set marker, and the marker `value` field are unchanged.

4. **Given** the classification
   **Then** the change ships as a **patch (4.0.1)**. There is no `CHANGELOG.md`/changeset in the package; the changelog entry is carried by a **conventional commit** (`fix:` …) on branch **`release/v4.0.1`**, and the commit body calls out the corrected Map/Set circular-marker `path` for any consumer that parses circular markers in Map/Set payloads.

5. **Given** Story 10.2's performance goal
   **When** the corrected `path` format is implemented
   **Then** it is materialisable from a retained ancestor chain without per-node eager construction.

6. **Given** this story addresses the 8.3-review deferred item
   **When** it is marked `done`
   **Then** the corresponding entry in `deferred-work-audit.md` (the `[Open]` "Root array/Set/Map self-cycle circular-marker `path` semantics inconsistency" under the 8-3 review section) is re-prefixed **`[Addressed]`** and annotated with a resolution note — matching this audit file's retain-with-note convention, **not** deleted (the `Deferred from:` reference below identifies the entry).

7. **Given** the full suite
   **When** it runs
   **Then** it passes — only tests asserting the **old buggy** Map/Set marker strings are updated; no input-API or test-API churn beyond those marker-output expectations.

## Tasks / Subtasks

- [x] AC 1 — Characterise current Map/Set marker output (root + nested) as the buggy baseline (AC: 1)
- [x] AC 2, 5 — Correct the marker `path` for transformed-container cycles (drop the synthetic `value` segment; render the logical path), chosen to be lazy-materialisable (AC: 2, 5)
  - [x] Update golden tests to the corrected strings (`test/contract/api/create-redactor.test.ts` and/or a dedicated serialise-output test)
- [x] AC 3 — Confirm init/config API, runtime input, object-mode output, non-Map/Set markers, and the `value` field unchanged (AC: 3)
- [ ] AC 4 — Classify as patch 4.0.1; record the changelog via a `fix:` conventional commit on branch `release/v4.0.1` (no `CHANGELOG.md` in-package) (AC: 4) — **still outstanding: the fix is uncommitted on `main`; the `fix:` release commit on `release/v4.0.1` is to be made at the release stage per maintainer decision**
- [x] AC 6 — Keep the `Deferred from:` reference; at done-time, re-prefix the audit entry `[Addressed]` with a resolution note (not delete) (AC: 6) — done 2026-06-20: `deferred-work-audit.md` entry re-prefixed `[Addressed]` with a resolution note (retained per the audit file's convention and the maintainer's retain-with-note decision)
- [x] AC 7 — `source .agents/initialise-env.sh && pnpm run test && pnpm lint`

### Review Findings

_Code review 2026-06-20 (bmad-code-review). Core fix verified correct: AC 1, 2, 3, 5, 7 met; full suite (737) + lint clean. Blind-Hunter "high" findings (wrapper `seen` bookkeeping, nested re-leak, user-data false-positive) refuted against source. 7 findings dismissed as noise/false-positive._

- [x] [Review][Decision→Dismissed] `buildTransformedGraph` generalisation scope — the helper treats *any* `{ _transformer: <string>, value }` shape as path-transparent and lets non-`value` keys extend the path; latent identity-registration order gap for multi-key/metadata-`value` wrappers. **Dismissed as YAGNI (Ben, 2026-06-20):** no built-in transformer emits such shapes, so there is no current trigger; output is correct for every shipping transformer. [`src/core/replacement/serialise-output.ts:204-226`]
- [x] [Review][Patch] Recursion-depth budget for the `buildTransformedGraph` ↔ `buildSafeGraph` mutual recursion — a custom transformer that manufactures a fresh wrapped identity per call recurses unboundedly (each level is a new identity, so `seen` never matches), defeating the no-throw guarantee. **Fixed (2026-06-20):** added `MAX_SERIALISE_DEPTH = 3000` and threaded a `depth` counter through `buildSafeGraph`/`buildTransformedGraph`; the descent now degrades to `[UNSUPPORTED]` instead of overflowing the stack or the downstream `JSON.stringify`. Limit chosen to sit above any realistic default-`maxDepth` structure (~1500) and below the `JSON.stringify` recursion ceiling. Regression test added (`degrades to a marker instead of overflowing when a transformer manufactures fresh identities`). Suite 738 pass, lint clean. [`src/core/replacement/serialise-output.ts`]

## Dev Notes

### Key Files

- `src/core/replacement/serialise-output.ts` — `buildSafeGraph`, the `{ _transformer: 'circular', path, value }` emission, `buildObjectChildPath` / `buildArrayChildPath`, `isStrictDescendantPath`, and the `seen` / `identityPaths` / `cycleRegistry` bookkeeping. The bug is here: when descending into a transformed `Set`/`Map` representation (`{_transformer, value}`), the `value` wrapper key is appended to the path like an ordinary segment, so a cycle inside reports `…value.<k>`.
- `src/core/create-redactor.ts` — the `serialise` branch that populates `cycleRegistry`.
- `test/contract/api/create-redactor.test.ts` — existing serialise + circular coverage to update to the corrected contract.

### Fix Direction

- When the adapter recurses into a transformer-wrapped container that can hold references (`Set`, `Map`), the circular-marker `path` should reflect the **logical** position (consistent with the marker's `value` field and with native object/array cycle paths), not the transformed output shape. Drop the synthetic `value` segment for these cycle paths.
- Keep the chosen rendering cheap to rebuild from an ancestor chain (Story 10.2 will materialise it lazily).

### Deferred-item linkage

- Deferred from: code review of 8-3-move-transformer-and-circular-handling-into-a-serialise-only-output-adapter — "Root array/Set/Map self-cycle circular-marker `path` semantics inconsistency" (now confirmed to affect nested Set/Map too).

### Project Structure Notes

- Tests live under `test/`, not co-located with `src/`.
- British English in comments and docs ("behaviour", "serialise", "artefact").

### References

- Epic 10 story text: [Source: _bmad-output/planning-artifacts/epics.md#Epic 10]
- Deferred item: [Source: _bmad-output/implementation-artifacts/deferred-work-audit.md]
- Story 8.3: [Source: _bmad-output/implementation-artifacts/8-3-move-transformer-and-circular-handling-into-a-serialise-only-output-adapter.md]
- Story 8.11 (serialise-output hardening): [Source: _bmad-output/implementation-artifacts/8-11-harden-serialise-output-transformer-edge-cases.md]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, BMad Dev Story workflow)

### Debug Log References

- Characterised the buggy baseline (AC 1) by adding the corrected golden assertions first and running them red: root Set self-cycle emitted `path:"value.0"` (expected `0`); the same `value` leak confirmed for root Map (`value.me`), nested Set (`roles.value.0`) and nested Map (`meta.value.me`).
- After the fix: `pnpm run test` → 737 passed (20 files); `pnpm lint` (eslint + `tsc --noEmit`) → clean. Evidence captured 2026-06-20.

### Completion Notes List

- **Root cause.** A `Set`/`Map` is transformed to `{ _transformer, value }` before recursion. `buildSafeGraph` recursed into that wrapper generically, so the synthetic `value` key was appended to the traversal path like an ordinary segment; a cycle through the container therefore reported `…value.<k>` instead of the logical `…<k>`.
- **Fix.** Added `buildTransformedGraph` in `src/core/replacement/serialise-output.ts`. When a transformer wrapper (`{ _transformer: <string>, value: … }`) is recursed, the `value` payload is treated as **path-transparent** — its children build their paths from the container's own path — while any other wrapper key extends the path normally. The two transform dispatch sites (supported-kind containers and custom non-plain objects) now route through this helper. This drops the synthetic `value` segment for Set/Map cycle paths and generalises to any future transformer-wrapped reference-holding container (AC 2). The marker's `value` field already used the logical container path (via `identityPaths`) and is unchanged.
- **Lazy-materialisable (AC 5).** The corrected rendering is the logical ancestor path plus the child index/key, with no synthetic `value` level — directly rebuildable from a retained ancestor chain, the format Story 10.2 will materialise lazily.
- **Unchanged surface (AC 3).** Change is confined to the serialise-output marker `path` field. Object-mode output, the runtime input contract, the init/config API, every non-Map/Set marker, and the marker `value` field are untouched; the full suite (737 tests) passes. Fallback/`byType` transformer shapes that carry a `value` key but no `_transformer` key (e.g. `{ bucket, value }`) are not treated as wrappers, so their behaviour is preserved.
- **Golden tests (AC 2).** Updated three existing buggy-baseline assertions (root Map self-cycle, nested Map, nested Set) and added a dedicated root+nested Set/Map matrix test in the "Circular references and revisited identities" block. Object/array/mutual cycle tests were left untouched as clean controls.
- **AC 4 — release commit deferred to the code-review stage** (maintainer decision, 2026-06-20). The fix is left uncommitted in the working tree on `main`; no `release/v4.0.1` branch/commit was created by this run. The `fix:` conventional commit (body calling out the corrected Map/Set marker `path`) remains outstanding and will be made at the code-review/release stage.
- **AC 6 — deferred-audit handling deferred to done-time** (maintainer decision, 2026-06-20). No change made to `deferred-work-audit.md` now (the story is at `review`, not `done`); the `[Open]` 8-3 entry is left intact and the `Deferred from:` linkage in Dev Notes is preserved. The unresolved conflict — AC 6's retain-with-note vs the project-context "Addressed Deferred Item Cleanup" HARD RULE and standing memory (both require deleting resolved entries on done) — is to be settled when the review/done workflow runs.

### File List

- `src/core/replacement/serialise-output.ts` (modified) — added `buildTransformedGraph`; routed both transform dispatch sites through it.
- `test/contract/api/create-redactor.test.ts` (modified) — corrected three buggy Map/Set marker assertions; added the root+nested Set/Map circular-path matrix golden test.
- `_bmad-output/implementation-artifacts/10-1-reconcile-serialised-circular-marker-semantics.md` (modified) — story bookkeeping (frontmatter, tasks, Dev Agent Record, Change Log, status).

## Change Log

- 2026-06-13: Story drafted to lock-then-defer the circular-marker fix to v5.
- 2026-06-13: Revised — output-only break accepted; marker reconciled now under a major (v5.0.0).
- 2026-06-13: Reclassified — the Set/Map marker `path` is a serialisation **bug** (leaks the transformer's synthetic `value` wrapper, affecting root and nested cycles); fixing it ships as a **patch (4.0.x)**, not a major. Concrete corrections recorded (`value.0`→`0`, etc.).
- 2026-06-20: Implemented the fix (`buildTransformedGraph` path-transparency for transformer wrappers). Corrected golden tests + added root/nested Set/Map matrix test. Full suite (737) and lint pass. Status → review. Per maintainer decision: AC 4 (release-branch `fix:` commit) deferred to the code-review/release stage — fix left uncommitted; AC 6 (deferred-audit handling, plus the retain-vs-delete conflict) deferred to done-time — audit file unchanged.
- 2026-06-20: Code review (bmad-code-review). Core fix verified correct (AC 1, 2, 3, 5, 7 met; suite + lint clean); three Blind-Hunter "high" findings refuted against source. D1 (generalisation-scope latent gap) dismissed as YAGNI (no built-in trigger). W1 (unbounded recursion via identity-manufacturing custom transformers) patched: added `MAX_SERIALISE_DEPTH = 3000` recursion guard threaded through `buildSafeGraph`/`buildTransformedGraph`, degrading to `[UNSUPPORTED]`; regression test added. Suite now 738 pass, lint clean. AC 4 and AC 6 remain outstanding (deferred to release/done stage).
