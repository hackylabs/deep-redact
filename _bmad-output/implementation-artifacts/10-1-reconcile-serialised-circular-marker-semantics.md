# Story 10.1: Reconcile the Serialised Circular-Marker Semantics

Status: ready-for-dev

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
   **Then** the change ships as a **patch (4.0.x)** with a changelog entry calling out the corrected Map/Set circular-marker `path`.

5. **Given** Story 10.2's performance goal
   **When** the corrected `path` format is implemented
   **Then** it is materialisable from a retained ancestor chain without per-node eager construction.

6. **Given** this story addresses the 8.3-review deferred item
   **When** it is marked `done`
   **Then** the corresponding entry is removed from `deferred-work-audit.md` per the addressed-deferred-item cleanup rule (the `Deferred from:` reference below drives that removal).

7. **Given** the full suite
   **When** it runs
   **Then** it passes — only tests asserting the **old buggy** Map/Set marker strings are updated; no input-API or test-API churn beyond those marker-output expectations.

## Tasks / Subtasks

- [ ] AC 1 — Characterise current Map/Set marker output (root + nested) as the buggy baseline (AC: 1)
- [ ] AC 2, 5 — Correct the marker `path` for transformed-container cycles (drop the synthetic `value` segment; render the logical path), chosen to be lazy-materialisable (AC: 2, 5)
  - [ ] Update golden tests to the corrected strings (`test/contract/api/create-redactor.test.ts` and/or a dedicated serialise-output test)
- [ ] AC 3 — Confirm init/config API, runtime input, object-mode output, non-Map/Set markers, and the `value` field unchanged (AC: 3)
- [ ] AC 4 — Add the changelog entry; classify as a patch (AC: 4)
- [ ] AC 6 — Keep the `Deferred from:` reference; register removal is a done-time action (AC: 6)
- [ ] AC 7 — `source .agents/initialise-env.sh && pnpm run test && pnpm lint`

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

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-06-13: Story drafted to lock-then-defer the circular-marker fix to v5.
- 2026-06-13: Revised — output-only break accepted; marker reconciled now under a major (v5.0.0).
- 2026-06-13: Reclassified — the Set/Map marker `path` is a serialisation **bug** (leaks the transformer's synthetic `value` wrapper, affecting root and nested cycles); fixing it ships as a **patch (4.0.x)**, not a major. Concrete corrections recorded (`value.0`→`0`, etc.).
