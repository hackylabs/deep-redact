# Story 6.3: Harden Structured-Determinism Fixture Set and Symbol Serialisation Guard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the structured-determinism fixture set to be robust against trivial cross-contamination test reduction and worker-boundary serialisation loss,
so that the determinism tests remain meaningful under fixture pruning and do not fail silently under fork-based test runners.

## Acceptance Criteria

1. **Given** the cross-contamination test in `test/contract/api/create-redactor.test.ts:4078`, **when** any fixture set used by that test is reviewed, **then** every such fixture set contains at least two distinct fixtures, ensuring the test exercises genuine cross-contamination rather than running the same fixture twice.
2. **Given** the `failingMapMarker` identifier in `test/fixtures/structured-determinism/index.ts:97`, **when** the fixture set is evaluated under a `--pool=forks` Vitest configuration that serialises payloads across worker boundaries via `structuredClone`, **then** the marker survives serialisation — because it is expressed as a `WeakSet` membership check rather than a Symbol property.
3. **Given** the changes are applied, **when** the full test suite runs under both the default pool and a `--pool=forks` configuration, **then** the determinism tests pass in both configurations.

## Tasks / Subtasks

- [x] Add a `expect(fixtureSet.fixtures.length).toBeGreaterThanOrEqual(2)` guard inside the cross-contamination test at `test/contract/api/create-redactor.test.ts:4078` to enforce the two-fixture invariant (AC: 1)
- [x] Replace the `failingMapMarker` Symbol, `MarkedFailingMap` type, `markFailingMap`, and `isMarkedFailingMap` with a `WeakSet`-based implementation in `test/fixtures/structured-determinism/index.ts` so the marker survives `structuredClone` serialisation (AC: 2)
- [x] Verify the full test suite passes under the default Vitest pool and under `--pool=forks` (AC: 3)

## Dev Notes

**Deferred from:** Code review of Story 4.2 (2026-05-09).

**Environment bootstrap (required before any test or pnpm command):**
```bash
source .agents/initialise-env.sh
```

---

### Fix 1 — Single-fixture set guard (AC 1)

**File:** `test/contract/api/create-redactor.test.ts:4078`

**Context:** The cross-contamination test (`keeps %s / %s deterministic after other named fixtures on the same compiled redactor`) iterates over all *other* fixtures in the same fixture set between the first and second run of the focal fixture. If a fixture set has only one entry the loop body is never entered, so the test reduces to two back-to-back runs of the same fixture — it no longer proves cross-contamination. No current set triggers this, but the guard enforces the invariant proactively.

**Fix:** Add an assertion at the top of the `it.each` callback:

```typescript
it.each(structuredDeterminismCases)('keeps %s / %s deterministic after other named fixtures on the same compiled redactor', (
  _fixtureSetTitle,
  _fixtureTitle,
  fixtureSet,
  fixture,
) => {
  expect(fixtureSet.fixtures.length).toBeGreaterThanOrEqual(2)

  const redact = fixtureSet.createRedactor()
  // ... rest of test body unchanged
```

The same guard should be added to the equivalent block in the serialised-determinism corpus test at line 4131 (`keeps %s / %s byte-stable after other named fixtures on the same compiled redactor`) for the same reason.

---

### Fix 2 — `failingMapMarker` WeakSet replacement (AC 2)

**File:** `test/fixtures/structured-determinism/index.ts:97`

**Problem:** Symbol properties are silently dropped by `structuredClone` and structured-clone-based IPC. Under `--pool=forks`, Vitest serialises fixture payloads across worker boundaries. Any `Map` tagged via `markedValue[failingMapMarker] = true` arrives at the worker with the Symbol property stripped, so `isMarkedFailingMap` returns `false` and the fixture silently misidentifies the map as non-failing.

**Current code (lines 97–113):**
```typescript
const failingMapMarker = Symbol('failingMapMarker')

type MarkedFailingMap = Map<string, unknown> & {
  [failingMapMarker]?: true;
}

const markFailingMap = (value: Map<string, unknown>): MarkedFailingMap => {
  const markedValue = value as MarkedFailingMap

  markedValue[failingMapMarker] = true

  return markedValue
}

const isMarkedFailingMap = (value: unknown): value is MarkedFailingMap => {
  return value instanceof Map && (value as MarkedFailingMap)[failingMapMarker] === true
}
```

**Replacement:** Remove all four of the above declarations and replace with:
```typescript
const failingMapRegistry = new WeakSet<Map<string, unknown>>()

const markFailingMap = (value: Map<string, unknown>): Map<string, unknown> => {
  failingMapRegistry.add(value)

  return value
}

const isMarkedFailingMap = (value: unknown): value is Map<string, unknown> => {
  return value instanceof Map && failingMapRegistry.has(value)
}
```

**Type impact:** The `MarkedFailingMap` intersection type is no longer needed and must be removed. The return type of `markFailingMap` becomes `Map<string, unknown>`. Callers in `createSerialisationEdgePayload` (line 821) call `markFailingMap(new Map(...))` and pass the result directly into the payload — the return type change is transparent there. Search for any remaining references to `MarkedFailingMap` and remove them.

**Why WeakSet over named class:** A named-class approach (`class FailingMap extends Map {}`) would require reconstructing the `Map` instance at creation time, which changes the identity of the object stored in the payload. The `WeakSet` approach keeps the same `Map` instance and adds no enumerable or Symbol-keyed properties.

---

### Running Tests

**Default pool:**
```bash
source .agents/initialise-env.sh && pnpm run test -- --reporter=verbose test/contract/api/create-redactor.test.ts
```

**Fork pool (required for AC 3):**
```bash
source .agents/initialise-env.sh && pnpm run test -- --pool=forks --reporter=verbose test/contract/api/create-redactor.test.ts
```

---

### Project Structure Notes

- All changes are confined to `test/fixtures/structured-determinism/index.ts` (Symbol → WeakSet replacement) and `test/contract/api/create-redactor.test.ts` (fixture-set guard).
- No production source files are modified.

## File List

- `test/contract/api/create-redactor.test.ts` — added `expect(fixtureSet.fixtures.length).toBeGreaterThanOrEqual(2)` guard to both cross-contamination `it.each` blocks (structured and serialised determinism)
- `test/fixtures/structured-determinism/index.ts` — replaced Symbol-keyed `failingMapMarker` / `MarkedFailingMap` / `markFailingMap` / `isMarkedFailingMap` with a `WeakSet`-based implementation

## Change Log

- 2026-05-24: Implemented Story 6.3. Added two-fixture invariant guards to cross-contamination tests and replaced Symbol marker with WeakSet in structured-determinism fixtures. All 468 tests pass under both default pool and `--pool=forks`.

## Dev Agent Record

### Completion Notes

- **AC 1**: Added `expect(fixtureSet.fixtures.length).toBeGreaterThanOrEqual(2)` at the top of both cross-contamination `it.each` callbacks — the structured-determinism one at line 4078 and the serialised-determinism one at line 4131.
- **AC 2**: Removed `failingMapMarker` Symbol, `MarkedFailingMap` intersection type, and the two Symbol-keyed helper functions. Replaced with `failingMapRegistry = new WeakSet<Map<string, unknown>>()` and updated `markFailingMap` / `isMarkedFailingMap` accordingly. No callers needed updating — return type of `markFailingMap` is now `Map<string, unknown>` which is compatible everywhere.
- **AC 3**: Full suite (468 tests) passes under both `pnpm run test` (default pool) and `pnpm run test -- --pool=forks`.
