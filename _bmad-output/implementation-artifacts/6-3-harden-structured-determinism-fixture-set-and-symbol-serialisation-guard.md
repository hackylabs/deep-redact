# Story 6.3: Harden Structured-Determinism Fixture Set and Symbol Serialisation Guard

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the structured-determinism fixture set to be robust against trivial cross-contamination test reduction and worker-boundary serialisation loss,
so that the determinism tests remain meaningful under fixture pruning and do not fail silently under fork-based test runners.

## Acceptance Criteria

1. **Given** the cross-contamination warm-up test in `test/contract/api/create-redactor.test.ts:3639`, **when** any fixture set used by that test is reviewed, **then** every such fixture set contains at least two distinct fixtures, ensuring the test exercises genuine cross-contamination rather than running the same fixture twice.
2. **Given** the `failingMapMarker` identifier in `test/fixtures/structured-determinism/index.ts:97`, **when** the fixture set is evaluated under a `--pool=forks` Vitest configuration that serialises payloads across worker boundaries via `structuredClone`, **then** the marker survives serialisation — because it is expressed as a `WeakSet` membership check or a named class instance predicate rather than a Symbol property.
3. **Given** the changes are applied, **when** the full test suite runs under both the default pool and a `--pool=forks` configuration, **then** the determinism tests pass in both configurations.

## Tasks / Subtasks

- [ ] Audit all fixture sets used by the cross-contamination warm-up test (`test/contract/api/create-redactor.test.ts:3639`) and ensure each set contains at least two distinct fixture entries (AC: 1)
- [ ] Replace the `failingMapMarker` Symbol with a `WeakSet` or a named class predicate in `test/fixtures/structured-determinism/index.ts:97` so it survives `structuredClone` serialisation (AC: 2)
- [ ] Verify the full test suite passes under the default Vitest pool configuration (AC: 3)

## Dev Notes

**Deferred from:** Code review of Story 4.2 (2026-05-09).

**Item 1 — single-fixture set:** If any fixture set ever has only one fixture, the cross-contamination warm-up test reduces to two runs of the same fixture rather than proving cross-contamination. No current set triggers this, but the guard should be added proactively. A `test/contract/api/create-redactor.test.ts:3639` assertion or a fixture-set validation helper is the appropriate place.

**Item 2 — Symbol serialisation:** Symbol properties are silently dropped by `structuredClone` and structured-clone-based IPC. The `failingMapMarker` Symbol is currently used to tag entries that are expected to fail, which is fine under the default thread pool but would cause silent misidentification under `--pool=forks`. Replacing it with a `WeakSet` (`failingEntries.has(entry)`) or a named class (`entry instanceof FailingFixture`) preserves the semantics without relying on Symbol property survival.
