# Story 9.3: Update v3 Migration Matrix, Generated Migration Doc, and Worked Examples for Restored Capabilities

Status: ready-for-dev

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

- [ ] Update `test/migration/v3/matrix.json`: add `types` to the options-that-carry-over set; rework the `blacklistedKeys-rename` row so it documents `BlacklistKeyConfig` → `KeyRule` field parity (including `replacement` → `censor`); add a new row + fixture for a regex `key` carrying per-key overrides.
- [ ] Add or update fixtures under `test/migration/v3/fixtures/` to match the new and revised rows.
- [ ] Regenerate `docs/migration/from-v3.md` via `pnpm run generate-v3-migration-doc` (do not hand-edit the generated file); confirm with `pnpm run verify:migration:v3`.
- [ ] Extend the worked-example manifest (`docs/examples/manifest.json`) and add example sources + fixtures under `docs/examples/` for: value-type allowlist with the string-only default, value-type allowlist permitting additional types, and per-key rule overrides on string and regex selectors.
- [ ] Regenerate example docs via `pnpm run generate-example-docs` and validate with `pnpm run verify:examples`.
- [ ] Update capability documentation to list the value-type allowlist and full `KeyRule` parity as supported.
- [ ] Mark the value-type-allowlist and per-key-parity items as addressed in [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) (cross-referencing Stories 9.1 and 9.2).

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

### Completion Notes

### File List

### Change Log
