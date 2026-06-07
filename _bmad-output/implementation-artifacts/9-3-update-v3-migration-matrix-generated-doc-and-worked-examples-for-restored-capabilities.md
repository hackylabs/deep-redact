# Story 9.3: Update v3 Migration Matrix, Generated Migration Doc, and Worked Examples for Restored Capabilities

Status: done

## Story

As a migration owner moving from Deep Redact v3,
I want the v3 migration matrix, generated migration guide, and worked examples to reflect the restored `types` and `KeyRule` capabilities,
so that the documented carry-over and parity match the actual v4 behaviour and the generated-file gate stays green.

## Context

`docs/migration/from-v3.md` is generated from `test/migration/v3/matrix.json` and the fixtures under `test/migration/v3/fixtures/` by `scripts/generate-v3-migration-doc.ts`; the same manifest drives verification, so documentation drift fails the generated-file checks. The matrix currently states that `blacklistedKeys` → `keys` carries the per-key object across unchanged and omits `types` from the carry-over list — both now inaccurate after Stories 9.1 and 9.2 restore the value-type allowlist and full `KeyRule` parity.

This story is documentation- and fixture-only. It depends on Stories 9.1 and 9.2 having landed the engine capabilities, and must not change runtime behaviour.

## Acceptance Criteria

1. **Given** `test/migration/v3/matrix.json` and its fixtures
   **When** updated
   **Then** `types` is recorded as an option that carries over to v4 unchanged
   **And** the `blacklistedKeys` → `keys` row documents that a v3 `BlacklistKeyConfig` object maps to a v4 `KeyRule` with the same fields, with `replacement` mapped to `censor`
   **And** a fixture row covers a regex-key rule (`key: /.../`) carrying per-key overrides.

2. **Given** the generated `docs/migration/from-v3.md`
   **When** regenerated from the matrix and fixtures
   **Then** it reflects the restored `types` carry-over and full `KeyRule` parity
   **And** the generated-file verification (`pnpm run verify-generated-files`) passes
   **And** no hand edits remain in the generated file.

3. **Given** the worked-example manifest and validation harness
   **When** extended
   **Then** there are validated worked examples for the value-type allowlist (including the string-only default) and for per-key rule overrides on both string and regex key selectors
   **And** each example's expected output is verified by the example validation harness.

4. **Given** the v3-parity capabilities are delivered by Stories 9.1 and 9.2
   **When** capability documentation and the deferred-work audit are reviewed
   **Then** the value-type allowlist and full `KeyRule` parity are documented as supported
   **And** any related deferred-work audit items are recorded as addressed.

## Tasks / Subtasks

- [x] Update `test/migration/v3/matrix.json`: add `types` to the options-that-carry-over set; rework the `blacklistedKeys-rename` row so it documents `BlacklistKeyConfig` → `KeyRule` field parity (including `replacement` → `censor`); add a new row + fixture for a regex `key` carrying per-key overrides.
- [x] Add or update fixtures under `test/migration/v3/fixtures/` to match the new and revised rows.
- [x] Regenerate `docs/migration/from-v3.md` via `pnpm run generate-v3-migration-doc` (do not hand-edit the generated file); confirm with `pnpm run verify:migration:v3`.
- [x] Extend the worked-example manifest (`docs/examples/manifest.json`) and add example sources + fixtures under `docs/examples/` for: value-type allowlist with the string-only default, value-type allowlist permitting additional types, and per-key rule overrides on string and regex selectors.
- [x] Regenerate example docs via `pnpm run generate-example-docs` and validate with `pnpm run verify:examples`.
- [x] Update capability documentation to list the value-type allowlist and full `KeyRule` parity as supported.
- [x] Mark the value-type-allowlist and per-key-parity items as addressed in [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) (cross-referencing Stories 9.1 and 9.2).

## Dev Notes

Likely files:

- `test/migration/v3/matrix.json`
- `test/migration/v3/fixtures/` (new and revised fixture directories)
- `scripts/generate-v3-migration-doc.ts`
- `docs/migration/from-v3.md` (generated — do not hand-edit)
- `docs/examples/manifest.json`
- `docs/examples/` (example sources and fixtures)
- [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md)

The matrix is the single source of truth for the generated migration doc; change the matrix and fixtures, then regenerate — never hand-edit `from-v3.md`. Keep British-English spelling (`serialise`, `behaviour`). This story changes documentation and fixtures only; it must not alter runtime source. Sequence after Stories 9.1 and 9.2.

## Verification

- `source .agents/initialise-env.sh && pnpm run generate-v3-migration-doc && pnpm run generate-example-docs`
- `source .agents/initialise-env.sh && pnpm run verify-generated-files`
- `source .agents/initialise-env.sh && pnpm run verify:migration:v3`
- `source .agents/initialise-env.sh && pnpm run verify:examples`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm lint`

## Dev Agent Record

### Debug Log

- The v3 migration matrix is pure JSON, so a regex `key` selector could not be expressed directly: the harness previously materialised only `{ helperId }` references (to functions). Added a JSON regex-reference shape `{ regexSource, regexFlags }` to `scripts/v3-migration.ts` — recognised by a new `isRegexReference` predicate, materialised to `new RegExp(source, flags)` for verification, and rendered as `/source/flags` in the generated guide. This is migration/doc tooling only; no runtime `src/` code changed.
- `validateV3MigrationMatrix` rejects any `v4Usage.config` key absent from `KNOWN_V4_OPTIONS`. Story 9.1 added `types` to `DeepRedactOptions` but the migration harness allowlist had not been updated, so the new `value-type-allowlist-carryover` row failed validation until `'types'` was added to `KNOWN_V4_OPTIONS_ARRAY` (the array is `satisfies ReadonlyArray<keyof DeepRedactOptions>`, so it remains type-checked).
- Two existing contract tests pinned the prior row/example sets and failed once the new rows landed: `test/contract/migration/v3-migration.test.ts` (`expectedRowIds`) and `test/contract/examples/example-manifest.test.ts` (verified-row list, total count 20→24, non-migration count 18→22). Both were updated to the new canonical sets — no assertion was relaxed, only the pinned expectations were brought in line with the deliberate matrix/manifest additions.

### Completion Notes

Documentation- and fixture-only story (no runtime `src/` change) bringing the published v3-to-v4 migration parity into line with the capabilities restored by Stories 9.1 (`types`) and 9.2 (`KeyRule`):

- **v3 migration matrix** (`test/migration/v3/matrix.json`): `types` added to the generated guide's "Options That Carry Over Unchanged" list and exercised by a new `value-type-allowlist-carryover` row (`types: ['string','number']` redacts the string and number, leaves the boolean untouched). The `blacklisted-keys-rename` row was reworked to document a v3 `BlacklistKeyConfig` object mapping to a v4 `KeyRule` object with the per-key `replacement` mapped to `censor`. A new `regex-key-rule-overrides` row covers a regex `key` (`/token$/i`) carrying a per-key `censor` override. Matrix now has 12 rows; all 12 verified.
- **Generated guide** (`docs/migration/from-v3.md`): regenerated from the matrix/fixtures — never hand-edited — and locked by `verify-generated-files`.
- **Worked examples** (`docs/examples/`): four new validated examples — `value-type-allowlist-default` (string-only default leaves a non-string target untouched), `value-type-allowlist-extended` (`['string','number']` widening), `per-key-rule-overrides-string`, and `per-key-rule-overrides-regex`. Manifest now has 24 rows; all 24 verified.
- **Capability documentation** (`docs/platform/standardisation-guide.md`, via `scripts/standardisation-guide.ts`): "Supported capabilities" now lists the value-type allowlist and per-key rule overrides, each linked to a validated worked example.
- **Deferred-work audit**: the 9.1/9.2 engine-side items remain `[Addressed]`; a Story 9.3 section records the migration/documentation parity as closed, cross-referencing both.

Verification (2026-06-06, Node 24.14.1 / pnpm 10.33.0): `pnpm run generate-v3-migration-doc && pnpm run generate-example-docs && pnpm run generate:standardisation-guide`, `pnpm run verify-generated-files` (pass), `pnpm run verify:migration:v3` (12 rows verified), `pnpm run verify:examples` (24 example rows verified), `pnpm run test` (736 passed), `pnpm lint` (`eslint .` + `tsc --noEmit`, exit 0).

### File List

New:
- `test/migration/v3/fixtures/value-type-allowlist-carryover/input.json`
- `test/migration/v3/fixtures/value-type-allowlist-carryover/expected-v4.json`
- `test/migration/v3/fixtures/value-type-allowlist-carryover/notes.md`
- `test/migration/v3/fixtures/regex-key-rule-overrides/input.json`
- `test/migration/v3/fixtures/regex-key-rule-overrides/expected-v4.json`
- `test/migration/v3/fixtures/regex-key-rule-overrides/notes.md`
- `docs/examples/examples/value-type-allowlist-default.ts`
- `docs/examples/examples/value-type-allowlist-extended.ts`
- `docs/examples/examples/per-key-rule-overrides-string.ts`
- `docs/examples/examples/per-key-rule-overrides-regex.ts`
- `docs/examples/fixtures/value-type-allowlist-default/{input.json,expected.json}`
- `docs/examples/fixtures/value-type-allowlist-extended/{input.json,expected.json}`
- `docs/examples/fixtures/per-key-rule-overrides-string/{input.json,expected.json}`
- `docs/examples/fixtures/per-key-rule-overrides-regex/{input.json,expected.json}`
- `docs/examples/value-type-allowlist-default.md` (generated)
- `docs/examples/value-type-allowlist-extended.md` (generated)
- `docs/examples/per-key-rule-overrides-string.md` (generated)
- `docs/examples/per-key-rule-overrides-regex.md` (generated)

Modified:
- `scripts/v3-migration.ts` — added `types` to `KNOWN_V4_OPTIONS`; added regex-reference materialiser/renderer; added `types` to the "Options That Carry Over Unchanged" list.
- `test/migration/v3/matrix.json` — reworked `blacklisted-keys-rename`; added `regex-key-rule-overrides` and `value-type-allowlist-carryover` rows.
- `test/migration/v3/fixtures/blacklisted-keys-rename/expected-v4.json` — per-key censor `[REDACTED]` → `[PWD]`.
- `test/migration/v3/fixtures/blacklisted-keys-rename/notes.md` — documents the `BlacklistKeyConfig` → `KeyRule` object mapping.
- `docs/migration/from-v3.md` — regenerated.
- `docs/examples/manifest.json` — added four worked-example rows.
- `scripts/standardisation-guide.ts` — added value-type allowlist and per-key rule overrides to `CAPABILITY_EXAMPLES`.
- `docs/platform/standardisation-guide.md` — regenerated.
- `test/contract/migration/v3-migration.test.ts` — updated `expectedRowIds` for the two new rows.
- `test/contract/examples/example-manifest.test.ts` — updated verified-row list/count (20→24) and non-migration count (18→22).
- `_bmad-output/implementation-artifacts/deferred-work-audit.md` — added the Story 9.3 `[Addressed]` migration/documentation-parity entry.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status `ready-for-dev` → `in-progress` → `review`.

### Change Log

- 2026-06-06 — Story 9.3: updated the v3 migration matrix, regenerated `docs/migration/from-v3.md`, added validated worked examples, and updated the capability documentation to reflect the restored `types` value-type allowlist (Story 9.1) and full `KeyRule` parity (Story 9.2). Added a JSON regex-reference materialiser to the v3 migration harness so a regex-key `KeyRule` fixture can be expressed and verified. Documentation/fixtures/tooling only — no runtime `src/` change. 12 migration rows and 24 example rows verified; full test suite (736) and lint green. Status set to `review`.
- 2026-06-06 — Code review (bmad-code-review): no Critical/High/Medium defects; all four ACs verified MET. Applied two low-severity patches — (1) aligned the `regex-key-rule-overrides` migration row censor to `[TOKEN REDACTED]` to match the worked example (matrix + `expected-v4.json` + `notes.md`, regenerated `from-v3.md`); (2) added `validateRegexReferences` to `scripts/v3-migration.ts` so an invalid regex `key` reference fails at the validation stage with a row-scoped message rather than a raw `SyntaxError` later. One finding dismissed (shape-based `isRegexReference` detection — not reachable today). Re-verified: `verify:migration:v3` (12 rows), `verify:examples` (24 rows), full test suite (736), `eslint .` + `tsc --noEmit` all green. Status set to `done`.

### Review Findings

Adversarial code review (Blind Hunter / Edge-Case Hunter / Acceptance Auditor) — 2026-06-06. All four acceptance criteria verified **MET**; every redaction claim executed against the live engine and matched committed fixtures byte-for-byte; `verify-generated-files`, `verify:migration:v3` (12 rows), `verify:examples` (24 rows), full suite (736) and lint all green; no `src/` change; British spelling preserved. **No Critical/High/Medium defects.** Surviving items are all low-severity polish on the newly-added regex-reference tooling, plus one cosmetic doc-consistency choice.

- [x] [Review][Patch] Align regex migration-row censor to `[TOKEN REDACTED]` [test/migration/v3/matrix.json](test/migration/v3/matrix.json) — set the `regex-key-rule-overrides` row censor `[TOKEN]` → `[TOKEN REDACTED]` to match the [worked example](docs/examples/examples/per-key-rule-overrides-regex.ts); updated `expected-v4.json` + `notes.md`, regenerated `from-v3.md`, re-ran `verify:migration:v3` (12 rows verified). **Fixed 2026-06-06.**
- [x] [Review][Patch] Validate the regex reference in `validateV3MigrationMatrix` [scripts/v3-migration.ts](scripts/v3-migration.ts) — added a recursive `validateRegexReferences` walk that constructs each regex reference and fails with a row-scoped `not a valid RegExp` message at the validation stage, instead of a raw `SyntaxError` later. Sanity-checked against invalid flags/source and a valid regex. **Fixed 2026-06-06.**
- [x] [Review][Dismissed] `isRegexReference` shape-based detection — left as-is per review decision: not reachable today (`KeyRule.key` is `string | RegExp`; no v4 option takes a `{ regexSource, regexFlags }` object).
