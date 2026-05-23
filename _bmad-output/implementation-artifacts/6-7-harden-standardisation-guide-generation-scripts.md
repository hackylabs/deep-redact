# Story 6.7: Harden Standardisation Guide Generation Scripts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform or security evaluator,
I want the standardisation guide generation scripts to validate their inputs, handle errors gracefully, and produce structurally correct output under all manifest states,
so that guide generation fails visibly rather than silently and the rendered Markdown is always well-formed.

## Acceptance Criteria

1. **Given** the `CAPABILITY_EXAMPLES` ID list used in `scripts/standardisation-guide.ts:31-37`, **when** the guide generation script runs, **then** each ID is validated against the loaded example manifest before generation proceeds, and any ID absent from the manifest causes an immediate error identifying the missing ID.
2. **Given** the standardisation guide contract test resolves `repoRoot`, **when** `buildGeneratedStandardisationGuide` is tested, **then** the contract test derives `repoRoot` using the same method as the verify script's default resolution rather than an independently computed path.
3. **Given** `buildGeneratedStandardisationGuide()` throws during generation, **when** `scripts/verify-generated-files.ts` calls it as part of the lockstep check, **then** the error is caught and added to the mismatches array with a descriptive context message, rather than propagating uncaught and discarding already-accumulated mismatches.
4. **Given** a v3 migration matrix row classified as `intentional-divergence`, **when** `row.v4Action` or one of its required sub-fields is `undefined` or missing, **then** `scripts/standardisation-guide.ts:30` emits a diagnostic warning identifying the row ID and the missing field rather than silently rendering `"undefined"` strings in the guide.
5. **Given** the `writeFileSync` call in `scripts/generate-standardisation-guide.ts:6` fails, **when** the error is caught, **then** a descriptive message including the target file path is emitted to `stderr` before the process exits with a non-zero code.
6. **Given** the fast-redact migration matrix has zero intentional-divergence rows, **when** the guide divergences section is rendered by `scripts/standardisation-guide.ts:26`, **then** no double blank lines appear in the output — the section either omits the divergence block entirely or renders a single blank line as the separator.
7. **Given** the standardisation guide contract test, **when** it validates the rendered guide, **then** it includes an explicit assertion that the divergence list is non-empty, so an accidental removal of all intentional-divergence rows from the matrix causes a test failure rather than a silent rendering change.

## Tasks / Subtasks

- [ ] Add manifest ID validation for each `CAPABILITY_EXAMPLES` ID against the loaded example manifest before guide generation in `scripts/standardisation-guide.ts:31-37` (AC: 1)
- [ ] Align the `repoRoot` derivation in `test/contract/platform/standardisation-guide.test.ts:7` with the resolution used by the verify script default (AC: 2)
- [ ] Wrap the `buildGeneratedStandardisationGuide()` call in `scripts/verify-generated-files.ts` with a try/catch that appends a descriptive mismatch entry rather than letting the error propagate (AC: 3)
- [ ] Add null-safety guards for `row.v4Action` and its sub-fields in `scripts/standardisation-guide.ts:30`, emitting a warning for missing fields rather than rendering `"undefined"` (AC: 4)
- [ ] Add a try/catch around `writeFileSync` in `scripts/generate-standardisation-guide.ts:6` with a descriptive `stderr` message and non-zero exit (AC: 5)
- [ ] Fix the zero-divergence double-blank-line rendering in `scripts/standardisation-guide.ts:26` by conditionally omitting the divergence block or using a single blank line separator (AC: 6)
- [ ] Add a contract test assertion that the divergence list rendered in the guide is non-empty (`test/contract/platform/standardisation-guide.test.ts`) (AC: 7)

## Dev Notes

**Deferred from:** Code review of Story 5.11 (2026-05-23).

**Item 1 — CAPABILITY_EXAMPLES validation:** The current script calls `manifest.rows.find(r => r.id === id)` inside a template expression with no prior validation. Move this to an upfront validation pass: `for (const id of CAPABILITY_EXAMPLES) { if (!manifest.rows.some(r => r.id === id)) throw new Error(\`CAPABILITY_EXAMPLES references unknown example ID: "${id}"\`); }`.

**Item 3 — verify script error propagation:** The `verify-generated-files.ts` script accumulates mismatches in an array and reports them all at the end. An uncaught throw from `buildGeneratedStandardisationGuide()` short-circuits this and may discard earlier mismatches. Pattern: `try { const generated = buildGeneratedStandardisationGuide(); /* diff check */ } catch (err) { mismatches.push(\`standardisation guide: ${err.message}\`); }`.

**Item 4 — null-safety:** For `intentional-divergence` rows, the guide renders `row.v4Action.summary`, `row.v4Action.config`, etc. A missing `v4Action` would currently render `undefined.summary` (TypeError) or `"undefined"` if TypeScript nulls are not caught. Add optional chaining and a fallback warning: `row.v4Action?.summary ?? warnAndReturn(rowId, 'v4Action.summary')`.

**Item 6 — double blank lines:** The current template likely produces `\n\n` before the divergences list and `\n\n` after, resulting in `\n\n\n\n` when the list is empty. Use `divergences.length > 0 ? renderDivergences(divergences) : ''` and ensure the surrounding blank lines are not duplicated.
