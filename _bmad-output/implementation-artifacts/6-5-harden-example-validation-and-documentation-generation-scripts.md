# Story 6.5: Harden Example Validation and Documentation Generation Scripts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want example validation and documentation generation scripts to handle malformed manifests, untested error fields, and unsafe Markdown output robustly,
so that failures surface with clear context and generated documentation remains structurally sound regardless of source content.

## Acceptance Criteria

1. **Given** a malformed `docs/examples/manifest.json`, **when** `loadExampleManifest` is called, **then** the resulting error message includes the manifest file path as context rather than surfacing a raw `SyntaxError`.
2. **Given** an `ExampleVerificationError` is thrown during example validation, **when** the contract test suite inspects it, **then** the `rowId`, `fixtureDir`, `assertionMode`, and `phase` property fields are all explicitly asserted by at least one test.
3. **Given** `buildAllGeneratedExampleDocs` is called during doc generation, **when** it runs, **then** it calls `validateExampleManifest` before calling `loadExampleManifest` so invalid manifests are rejected with a clear validation error before generation proceeds.
4. **Given** a source file used by an example doc generator contains a line beginning with three consecutive backticks, **when** `buildGeneratedExampleDoc` renders the Markdown fence, **then** the fence is not prematurely closed — the inner backticks are escaped or the fence delimiter is lengthened.
5. **Given** a migration row in the example manifest, **when** `expectRepositoryPath` validates `row.fixtureDir`, **then** it enforces the same trailing-slash subdirectory constraint as the runtime `validateFixturePath` guard so the two validators cannot silently diverge.

## Tasks / Subtasks

- [ ] Wrap `JSON.parse` in `loadExampleManifest` with a try/catch that includes the manifest file path in the error message (`scripts/example-validation.ts:88–90`) (AC: 1)
- [ ] Add contract test assertions for `rowId`, `fixtureDir`, `assertionMode`, and `phase` fields on `ExampleVerificationError` instances (`test/contract/examples/example-manifest.test.ts`) (AC: 2)
- [ ] Add a `validateExampleManifest` call at the top of `buildAllGeneratedExampleDocs` in `scripts/generated-files.ts:125` before `loadExampleManifest` is called (AC: 3)
- [ ] Add backtick-fence escaping to `buildGeneratedExampleDoc`: detect lines beginning with ` ``` ` and either escape them or increase the outer fence delimiter length (`scripts/generated-files.ts:103`) (AC: 4)
- [ ] Tighten `expectRepositoryPath` for migration row `fixtureDir` validation to require a trailing-slash subdirectory, matching the runtime `validateFixturePath` constraint (`test/contract/examples/example-manifest.test.ts:95`) (AC: 5)

## Dev Notes

**Deferred from:** Code reviews of Stories 5.6 (2026-05-22) and 5.8 (2026-05-23).

**Item 1 — loadExampleManifest SyntaxError:** Consistent with the pre-existing `loadV3MigrationMatrix` pattern which also exposes raw parse errors; however, adding path context is a low-cost improvement. Pattern: `catch (err) { throw new Error(\`Failed to parse example manifest at ${manifestPath}: ${err.message}\`); }`.

**Item 3 — validateExampleManifest guard:** In the build-script context the manifest is a trusted committed file so the risk is theoretical, but adding the guard follows the principle applied elsewhere in the script. Place the call at the top of `buildAllGeneratedExampleDocs` before `loadExampleManifest`.

**Item 4 — backtick escaping:** The CommonMark spec allows a fenced code block delimiter of four or more backticks if the content contains three. The safest approach is to count the maximum consecutive-backtick run in the source content and use `max + 1` backticks as the fence delimiter. Alternatively, insert a zero-width space before any line-opening ` ``` `.

**Item 5 — expectRepositoryPath strictness gap:** `expectRepositoryPath(row.fixtureDir, 'test/migration/.../fixtures')` accepts the bare base directory, while runtime `validateFixturePath` requires a trailing-slash subdirectory such as `test/migration/.../fixtures/`. Align the contract test helper to the stricter form.
