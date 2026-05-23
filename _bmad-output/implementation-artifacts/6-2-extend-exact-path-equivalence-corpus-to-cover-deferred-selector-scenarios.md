# Story 6.2: Extend Exact-Path Equivalence Corpus to Cover Deferred Selector Scenarios

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the exact-path equivalence corpus to cover all deferred selector scenarios,
so that the behavioural equivalence proof between the fast lane and generic traversal lane is complete.

## Acceptance Criteria

1. **Given** the exact-path equivalence corpus, **when** bracket-quoted or special-character property key paths are reviewed, **then** at least one corpus entry exercises lane equivalence for those key forms.
2. **Given** the exact-path equivalence corpus, **when** non-string primitive leaf value types are reviewed, **then** at least one corpus entry covers number, boolean, and null leaf values under an exact path.
3. **Given** the exact-path equivalence corpus, **when** absent-path behaviour is reviewed, **then** at least one corpus entry asserts that a path absent from the payload produces identical silent no-op output across both lanes.
4. **Given** the exact-path equivalence corpus, **when** `replaceStringByLength: true` policy is reviewed, **then** at least one corpus entry exercises this policy under an exact path and confirms output is lane-equivalent.
5. **Given** the exact-path equivalence corpus, **when** `retainStructure` alias-replay caching behaviour is reviewed, **then** at least one corpus entry exercises shared-identity alias payloads and confirms caching behaviour is consistent across both lanes.
6. **Given** the `createGenericisedPlan` conversion function in `test/fixtures/exact-path-equivalence/index.ts`, **when** a converted `ExactPathRule` is appended as a `DynamicPathRule`, **then** the `signature` field is produced using `renderSelectorSignature` rather than the raw `canonicalPath` string.
7. **Given** the `createGenericisedPlan` conversion logic, **when** it is invoked, **then** a control assertion enforces `dynamicPathRules.length === 0` before conversion is attempted, making the invariant explicit rather than implicit.

## Tasks / Subtasks

- [ ] Fix `signature` field assignment in `createGenericisedPlan` to use `renderSelectorSignature` (`test/fixtures/exact-path-equivalence/index.ts`) (AC: 6)
- [ ] Make `dynamicPathRules.length === 0` invariant explicit as a control assertion in `createGenericisedPlan` (`test/fixtures/exact-path-equivalence/index.ts`) (AC: 7)
- [ ] Add corpus entry: bracket-quoted and special-character property keys (e.g. `users["first.name"].email`) — verify both lanes produce identical output (AC: 1)
- [ ] Add corpus entry: non-string primitive leaf values — one fixture covering `number`, `boolean`, and `null` leaves under an exact path (AC: 2)
- [ ] Add corpus entry: absent path — exact path selector targeting a key not present in the payload; both lanes must produce the unchanged input (AC: 3)
- [ ] Add corpus entry: `replaceStringByLength: true` policy under an exact path selector (AC: 4)
- [ ] Add corpus entry: `retainStructure` alias-replay — payload where the same object identity is reached via two branches with identical effective rule context; verify caching behaviour is lane-equivalent (AC: 5)
- [ ] Run the full equivalence test suite and confirm all new corpus entries pass

## Dev Notes

**Deferred from:** Code review of Story 4.3 (2026-05-14).

**Key file:** `test/fixtures/exact-path-equivalence/index.ts`

**Item-by-item reference:**
- AC 6 / `signature` field: The `createGenericisedPlan` helper constructs converted dynamic rules but sets `signature` directly from `canonicalPath`. `renderSelectorSignature` is the canonical production function for this field — use it.
- AC 7 / ordering invariant: The comment in the deferred-work entry states the conversion appends after pre-existing `dynamicPathRules` and relies on `dynamicPathRules.length === 0`. Promote this to an explicit `if (plan.dynamicPathRules.length !== 0) throw new Error(...)` assertion.
- AC 5 / alias-replay: `createPayload` currently creates fresh objects, so no shared-identity alias is ever replayed. Add a fixture that deliberately shares object identity across two branches to exercise caching across lanes.
