# Story 5.6: Establish the Worked-Example Manifest and Validation Harness

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one canonical worked-example manifest and validator harness,
so that example coverage can expand in small verified slices without redefining the release machinery in every story.

## Acceptance Criteria

1. Given the release-critical example source of truth, when it is reviewed, then it is defined by one canonical manifest at `docs/examples/manifest.json`.
2. Given the canonical example manifest, when it is validated, then every row conforms to one strict JSON schema with these required fields: `id`, `category`, `docTarget`, `sourceFile`, `fixtureDir`, `assertionMode`, and `expectedResultFile`.
3. Given the canonical example manifest, when a row is inspected, then `category` is exactly one of `setup`, `targeting`, `replacement`, `output`, `runtime`, `console`, `migration-fast-redact`, or `migration-v3`.
4. Given the canonical example manifest, when a row is inspected, then `assertionMode` uses only declared enum values supported by the example validator, and each row covers one behaviour only.
5. Given the canonical example manifest, when a row is inspected, then `fixtureDir` points to a named fixture directory under `docs/examples/fixtures/<id>/` containing the shared input payload and the artefacts required by that row's `assertionMode`.
6. Given a row in the canonical example manifest, when example validation runs, then the example source identified by `sourceFile` is executed or evaluated against its paired fixture directory using the semantics defined by that row's `assertionMode`.
7. Given any row fails schema validation, fixture resolution, example execution, assertion-mode evaluation, or expected-result comparison, when example validation runs, then the validation run fails and that example is not treated as release-proven.
8. Given this story's scope, when the implementation is reviewed, then release-critical non-migration worked examples remain deferred to Story `5.7`, and migration worked examples and example-documentation lockstep remain deferred to Story `5.8`, and benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Create the canonical example manifest at `docs/examples/manifest.json` (AC: 1, 2, 3, 4, 5)
  - [x] Add `docs/examples/manifest.json` with `{ "schemaVersion": 1, "metadata": {...}, "rows": [] }` shape. Start with an empty rows array — Story `5.7` and `5.8` will populate it.
  - [x] Include `metadata` fields: `title`, `fixtureRoot` (`docs/examples/fixtures`), and `assertionModes` listing all declared enum values.
  - [x] Keep all `fixtureDir` values repository-relative, normalised, and confined to `docs/examples/fixtures/<id>/` — enforce this in the validator rather than the manifest schema alone.
  - [x] Do not embed executable JavaScript in the manifest. `sourceFile` is a repository-relative path to a TypeScript source file; the validator handles execution.

- [x] Implement the example validation module at `scripts/example-validation.ts` (AC: 2–7)
  - [x] Define TypeScript types: `ExampleCategory`, `ExampleAssertionMode`, `ExampleRow`, `ExampleManifest`, and `VerifiedExampleRow`. Mirror the naming convention of `scripts/v3-migration.ts`.
  - [x] Declare `ExampleCategory` as a union of `'setup' | 'targeting' | 'replacement' | 'output' | 'runtime' | 'console' | 'migration-fast-redact' | 'migration-v3'`.
  - [x] Declare `ExampleAssertionMode` as a union of `'structured-output' | 'serialised-output'`. Add further modes only if a Story `5.7` console-adapter row demonstrably requires a third mode; do not speculate.
  - [x] Export `loadExampleManifest(repositoryRoot?: string): ExampleManifest` that reads and JSON-parses `docs/examples/manifest.json`, following the `loadV3MigrationMatrix` pattern from `scripts/v3-migration.ts`.
  - [x] Export `validateExampleManifest(manifest: ExampleManifest): void` that throws on unknown `schemaVersion`, required-field absence, invalid `category`, invalid `assertionMode`, fixture-path escape (`..`), or absolute paths.
  - [x] Export `verifyExampleManifest(options?: VerifyExampleManifestOptions): VerifiedExampleRow[]` that loads the manifest, validates schema, resolves each fixture directory, executes each `sourceFile` against its fixture, and asserts the result against `expectedResultFile`. With an empty rows array this returns `[]` without error.
  - [x] For `structured-output` rows: import the `sourceFile` via dynamic `import()`, call its default or named `runExample(input: unknown): unknown` export with `input.json` from `fixtureDir`, and compare `isDeepStrictEqual` against the parsed `expectedResultFile`.
  - [x] For `serialised-output` rows: same as above but compare the string result against the text content of `expectedResultFile`.
  - [x] Identify assertion failures with row `id`, `fixtureDir`, `assertionMode`, and comparison phase — do not dump full payload values.
  - [x] Keep the module offline and deterministic. No network calls, no side effects beyond reading committed files and importing local `dist/`.

- [x] Add the verify entrypoint at `scripts/verify-examples.ts` (AC: 7)
  - [x] Follow the pattern of `scripts/verify-v3-migration.ts`: import `verifyExampleManifest`, call it, log the verified row count.
  - [x] Exit with a non-zero code on failure (thrown errors surface naturally via Node's unhandled-rejection behaviour).

- [x] Add contract tests at `test/contract/examples/example-manifest.test.ts` (AC: 1–7)
  - [x] Add a test that verifies `docs/examples/manifest.json` exists and is valid JSON.
  - [x] Add a test that verifies `schemaVersion` is `1` and `metadata.fixtureRoot` is `docs/examples/fixtures`.
  - [x] Add a test that verifies every row (when rows exist) has all seven required fields: `id`, `category`, `docTarget`, `sourceFile`, `fixtureDir`, `assertionMode`, `expectedResultFile`.
  - [x] Add a test that verifies `category` for every row is within the declared enum — `setup`, `targeting`, `replacement`, `output`, `runtime`, `console`, `migration-fast-redact`, `migration-v3`.
  - [x] Add a test that verifies `assertionMode` for every row is within the declared enum — `structured-output`, `serialised-output`.
  - [x] Add a test that verifies `fixtureDir` for every row cannot escape `docs/examples/fixtures/`: no absolute paths, no `..` traversal, normalised POSIX separators.
  - [x] Add a test that calls `validateExampleManifest` with a fabricated row whose `category` is `'unknown-category'` and verifies it throws.
  - [x] Add a test that calls `validateExampleManifest` with a fabricated row whose `assertionMode` is `'unknown-mode'` and verifies it throws.
  - [x] Add a test that calls `validateExampleManifest` with a fabricated row whose `fixtureDir` contains `..` and verifies it throws.
  - [x] Add a test that calls `verifyExampleManifest` with the real manifest and verifies it returns without error (empty rows returns `[]`).
  - [x] Keep all contract tests offline and side-effect free. Follow `test/contract/migration/v3-migration.test.ts` for structure and import patterns.

- [x] Wire `verify:examples` into `package.json` and CI (AC: 7)
  - [x] Add `"verify:examples": "pnpm run build && node --experimental-strip-types ./scripts/verify-examples.ts"` to `package.json` scripts. Follow the pattern of `verify:migration:v3`.
  - [x] Add `- run: pnpm run verify:examples` to `.github/workflows/npmPublish.yml` in the `publish` job, after `verify:migration:v3` and before `pnpm publish`. Maintain the same release-gate position as the migration verify steps.

- [x] Maintain scope boundaries (AC: 8)
  - [x] Do not add any worked-example rows to `docs/examples/manifest.json`. Stories `5.7` and `5.8` own those.
  - [x] Do not create fixture directories under `docs/examples/fixtures/`. Stories `5.7` and `5.8` own those.
  - [x] Do not create a documentation generator or wire into `scripts/generated-files.ts`. Story `5.8` owns the example-documentation lockstep.
  - [x] Do not create benchmark manifests, artefacts, gates, or platform-adoption guidance.
  - [x] Do not change public redaction semantics, console adapter behaviour, package exports, migration infrastructure, or the release installation matrix.

- [x] Verify the story implementation (AC: 1–8)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:examples`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if `package.json`, CI workflow, or shared test infrastructure changed.
  - [x] Record any deferred decisions about assertion modes, `sourceFile` execution strategy, or documentation generation in the Dev Agent Record.

### Review Findings

- [x] [Review][Patch] Key-order validation brittle — `Object.keys(candidateRow).join('\n') !== rowKeys.join('\n')` depends on JS insertion order; any JSON serialiser that sorts keys alphabetically will cause spurious failures [`scripts/example-validation.ts:156`]
- [x] [Review][Patch] `sourceFile` and `expectedResultFile` not validated for path traversal — only non-empty-string checked; `sourceFile: "../../.env"` passes validation and is handed to `import()` / `readFileSync` [`scripts/example-validation.ts` — `validateExampleManifest`]
- [x] [Review][Patch] `runFn` result not awaited — async example exports return a `Promise` that is compared directly against the expected value, causing an always-fail with a misleading message [`scripts/example-validation.ts:257, 276`]
- [x] [Review][Patch] `verifySerialisedOutputRow` has no `typeof actual === 'string'` guard — a non-string return causes a misleading failure with no type-mismatch indication [`scripts/example-validation.ts:276`]
- [x] [Review][Patch] Fixture and execution errors misclassified as `'comparison'` phase — the outer `catch` block wraps all errors (including `ENOENT` from missing `input.json`) as `comparison`; `'fixture'` phase is declared but never raised [`scripts/example-validation.ts:304–310`]
- [x] [Review][Patch] `readTextFile` strips only a single trailing newline and does not normalise mid-file `\r\n` — serialised comparisons will fail on Windows-authored fixtures [`scripts/example-validation.ts:92–94`]
- [x] [Review][Patch] `fixtureDir === fixtureRoot` is permitted — spec guardrails explicitly require raising an error when `fixtureDir` equals `docs/examples/fixtures` exactly [`scripts/example-validation.ts:208`]
- [x] [Review][Patch] `validateFixturePath` does not enforce `docs/examples/fixtures/<id>/` scoping — a row with `id: "foo"` and `fixtureDir: "docs/examples/fixtures/bar"` passes; AC5 requires the path to be scoped to the row's own `id` [`scripts/example-validation.ts` — `validateFixturePath`]
- [x] [Review][Patch] `process.cwd()` in contract tests makes path resolution environment-sensitive — if vitest runs from a subdirectory, all file-existence assertions fail; use `import.meta.url`-based resolution instead [`test/contract/examples/example-manifest.test.ts:12`]
- [x] [Review][Defer] Test hardcodes `[]` expectation for `verifyExampleManifest` — correct for Story 5.6 scope but will break when Story 5.7 adds rows; update the test when rows are introduced [`test/contract/examples/example-manifest.test.ts`] — deferred, pre-existing
- [x] [Review][Defer] `loadExampleManifest` surfaces a raw `SyntaxError` on invalid JSON with no filename context — consistent with existing `loadV3MigrationMatrix` pattern; acceptable for now [`scripts/example-validation.ts:88–90`] — deferred, pre-existing
- [x] [Review][Defer] Contract tests do not assert `ExampleVerificationError` property fields (`rowId`, `fixtureDir`, `assertionMode`, `phase`) — not required by the story's Testing Requirements; add when verifying row execution in Stories 5.7/5.8 [`test/contract/examples/example-manifest.test.ts`] — deferred, pre-existing
- [x] [Review][Defer] `verify:examples` triggers a full rebuild on every CI run — consistent with all other `verify:*` scripts and matches the spec-mandated command; acceptable for now [`package.json`, `.github/workflows/npmPublish.yml`] — deferred, pre-existing

## Dev Notes

### Story Intent

- Story `5.6` delivers the manifest schema and executable validator that all subsequent worked-example stories depend on. It does not add any worked examples — the rows array starts empty and returns `[]` cleanly from `verifyExampleManifest`.
- The key deliverable is the validated contract: the manifest schema, the declared `category` and `assertionMode` enums, and a harness that can execute future `sourceFile` entries against fixture directories. Stories `5.7` and `5.8` rely on this contract being stable.
- The main false-positive risk is a harness that passes with an empty manifest but silently fails when rows are added. The contract tests must prove that `validateExampleManifest` rejects invalid categories, modes, and paths before any real rows exist.

### Source Document Summary

- Story `5.6` implements FR31: providing release-critical worked examples. This story is the manifest and harness half; Stories `5.7` and `5.8` are the coverage halves. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:1537)]
- FR31 requires developers to evaluate v4 through code examples that cover singleton setup, key targeting, regex-based object property matching, object-path targeting, regex-based path segment matching, substring targeting, root-primitive redaction, replacement and removal behaviour, retain-structure handling, same-length string replacement, structured versus serialised output, ignored-value-type configuration, custom transformer configuration, graceful error replacement, optional `console.*` redaction, `fast-redact` migration, and v3 migration. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:434)]
- Architecture lists `docs/examples/` as a Trust & Standardisation Support FR directory alongside `test/bench/` and `test/artefacts/benchmarks/`. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:889)]
- PRD states examples must be practical, minimal, and representative of real service usage rather than abstract toy snippets. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:351)]

### Current Repository Intelligence

- The package is `@hackylabs/deep-redact` version `4.0.0`, ESM with dual-format published output and Node engine floor `>=22.18.0`. [Source: [package.json](package.json:2)]
- Existing generation and verification patterns: `scripts/v3-migration.ts` (validator module), `scripts/verify-v3-migration.ts` (entrypoint), `test/contract/migration/v3-migration.test.ts` (contract tests). These are the direct model for Story `5.6`.
- `scripts/generated-files.ts` already wires `buildGeneratedFastRedactMigrationGuide` and `buildGeneratedV3MigrationGuide`. Do not touch this file in Story `5.6` — documentation generation is Story `5.8`'s responsibility.
- `scripts/verify-generated-files.ts` verifies README, package.json exports, precedence doc, one-way-redaction doc, fast-redact guide, and v3 guide. Do not add example-manifest verification here — that belongs to `verify-examples.ts`, a separate entrypoint.
- The `generate` script chain is: `generate-exports`, `generate-readme`, `generate-precedence-doc`, `generate-one-way-redaction-doc`, `generate-fast-redact-migration-doc`, `generate-v3-migration-doc`. Do not extend this chain in Story `5.6`.
- `verify:migration:fast-redact` and `verify:migration:v3` are already wired into `.github/workflows/npmPublish.yml` at lines 47–48. Add `verify:examples` immediately after `verify:migration:v3` at line 49, before `pnpm publish`.
- All verify scripts follow `pnpm run build && node --experimental-strip-types ./scripts/verify-<name>.ts`. Match this exactly.
- Node scripts use `--experimental-strip-types` to run TypeScript directly without a compile step separate from the build. [Source: [package.json](package.json:1)]

### Previous Story Intelligence

- Story `5.5` established the v3 migration infrastructure as the direct model: canonical manifest at `test/migration/v3/matrix.json`, fixture directories under `test/migration/v3/fixtures/<id>/`, validator module at `scripts/v3-migration.ts`, verify entrypoint at `scripts/verify-v3-migration.ts`, contract tests at `test/contract/migration/v3-migration.test.ts`. Story `5.6` mirrors this structure for worked examples. [Source: [_bmad-output/implementation-artifacts/5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path.md](_bmad-output/implementation-artifacts/5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path.md:134)]
- Review findings from Story `5.5` to apply from the start: the validator must enforce the strict row schema, fixture-path checks must be repository-relative, and contract tests must prove actual drift detection rather than passing on unrelated errors. [Source: [_bmad-output/implementation-artifacts/5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path.md](_bmad-output/implementation-artifacts/5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path.md:92)]
- Story `5.5` deferred: `verifySerialised0utput` typo (capital-zero O) — already fixed in v3-migration.ts. Use correct spelling `verifySerialisedOutput` in any new example-validation code.
- Story `5.5` deferred: `isHelperReference` collision risk if a future config option is named `helperId`. The example validator has no helper-ID pattern unless console-adapter source files need one — omit if not required.
- Recent commits: `8cf9cf5 chore(migration): write v3 migration` confirms Story `5.5` is done and the repository is in a clean working state. Story `5.6` begins from a clean branch.

### Architecture Compliance

- `docs/examples/` is the declared location for worked examples. Keep all manifest and fixture paths under this directory. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:889)]
- Tests live under `test/`, each directory maps to one responsibility domain. The contract tests for the example manifest belong at `test/contract/examples/`. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:965)]
- Generated documentation must be generated or verified from maintained source data — not treated as the source of truth. The manifest is the source of truth; the documentation generator (Story `5.8`) will render from it. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:897)]
- All code, comments, tests, docs, and commit messages must use British English unless quoting identifiers or third-party APIs. `serialise`, `artefacts`, `behaviour` are the correct spellings throughout. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:430)]
- Release workflows must verify examples before publish. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:989)]
- The core package remains zero-runtime-dependency. Any schema validation helpers must be small typed guards in `scripts/` rather than new packages. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:143)]

### Manifest Schema Reference

Recommended manifest shape for `docs/examples/manifest.json`:

```json
{
  "schemaVersion": 1,
  "metadata": {
    "title": "Deep Redact Worked-Example Manifest",
    "fixtureRoot": "docs/examples/fixtures",
    "assertionModes": ["structured-output", "serialised-output"]
  },
  "rows": []
}
```

Recommended row shape (for Stories `5.7` and `5.8` to follow):

```json
{
  "id": "singleton-setup",
  "category": "setup",
  "docTarget": "docs/examples/singleton-setup.md",
  "sourceFile": "docs/examples/examples/singleton-setup.ts",
  "fixtureDir": "docs/examples/fixtures/singleton-setup",
  "assertionMode": "structured-output",
  "expectedResultFile": "expected.json"
}
```

Declared `category` enum values: `setup`, `targeting`, `replacement`, `output`, `runtime`, `console`, `migration-fast-redact`, `migration-v3`.

Declared `assertionMode` enum values: `structured-output`, `serialised-output`. Add `console-output` only if a Story `5.7` console-category row cannot be satisfied by one of the two existing modes.

### Source File Execution Contract

Each `sourceFile` must export a default function or a named `runExample` export with the signature:

```ts
export const runExample = (input: unknown): unknown => { ... }
// or
export default (input: unknown): unknown => { ... }
```

The validator imports `sourceFile` via `import()` (dynamic import), reads `input.json` from `fixtureDir`, calls `runExample(parsedInput)`, and compares the return value against the parsed `expectedResultFile`.

For `serialised-output` rows, the result is expected to be a string and is compared against the text content (not parsed JSON) of `expectedResultFile`.

This execution contract applies to Stories `5.7` and `5.8`. Story `5.6` only defines and tests the harness — no source files are created yet.

### Implementation Guardrails

- Start with `rows: []`. The validator must return `[]` cleanly for an empty manifest without throwing.
- Mirror `scripts/v3-migration.ts` exactly for: `loadExampleManifest`, `validateExampleManifest`, `verifyExampleManifest`, and the `VerifyExampleManifestOptions` interface (accepting optional `manifest` and `repositoryRoot` overrides to support testability).
- Use `isDeepStrictEqual` from `node:util` for structured-output comparison, matching the migration pattern.
- Use `posix.relative`, `posix.isAbsolute`, and `posix.normalize` for path validation. Reject paths with `..`, absolute paths, and Windows separators (`\`).
- For fixture-path confinement, check that `fixtureDir` starts with `docs/examples/fixtures/` (or equals it exactly, which would be invalid for a fixture directory — raise an error in that case too).
- Do not call `new DeepRedact` anywhere in the harness. Use the v4 `deepRedact` factory from the local `dist/` build via `createRequire` or dynamic import, consistent with `scripts/v3-migration.ts`.
- Assertion failures must identify `id`, `fixtureDir`, `assertionMode`, and comparison phase without dumping full payload values.

### File Structure Requirements

Files to add:

- `docs/examples/manifest.json`
- `scripts/example-validation.ts`
- `scripts/verify-examples.ts`
- `test/contract/examples/example-manifest.test.ts`

Files to update:

- `package.json` — add `verify:examples` script
- `.github/workflows/npmPublish.yml` — add `pnpm run verify:examples` after `verify:migration:v3`, before `pnpm publish`
- `_bmad-output/implementation-artifacts/5-6-establish-the-worked-example-manifest-and-validation-harness.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Files not to add or update for this story:

- `docs/examples/fixtures/` — owned by Stories `5.7` and `5.8`
- `docs/examples/examples/` — owned by Stories `5.7` and `5.8`
- `scripts/generated-files.ts` — documentation generation is Story `5.8`
- `scripts/verify-generated-files.ts` — does not include example manifest verification
- `test/migration/` — owned by Stories `5.4` and `5.5`
- `docs/migration/` — owned by Stories `5.4` and `5.5`
- `test/bench/` — owned by Stories `5.9`–`5.10`
- `docs/platform/` — owned by Story `5.11`
- `src/` — no public API changes

### Testing Requirements

- Add contract tests first that fail until the manifest and validator are in place (red-first approach consistent with Story `5.5`).
- Test that `validateExampleManifest` rejects: missing required fields, unknown `category`, unknown `assertionMode`, `fixtureDir` with `..` traversal, `fixtureDir` with absolute path.
- Test that `verifyExampleManifest` with the real manifest (empty rows) returns `[]` without error.
- Do not add row-execution tests in this story — no rows exist yet. Row-execution tests will be added by Stories `5.7` and `5.8` as rows are introduced.
- Follow the import and describe-block patterns of `test/contract/migration/v3-migration.test.ts` exactly.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](project-context.md:1)]
- Node, package-manager, build, lint, test, generation, benchmark, and release commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: [project-context.md](project-context.md:16)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: [project-context.md](project-context.md:30)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](project-context.md:36)]

## Story Completion Status

Implementation complete. All tasks checked, 435/435 tests pass, lint clean, verify:examples passes with 0 rows. Code review complete: 9 patches applied, 4 deferred, 3 dismissed.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `docs/examples/manifest.json` with `schemaVersion: 1`, empty `rows: []`, and metadata declaring `fixtureRoot` and both `assertionModes`.
- Created `scripts/example-validation.ts` exporting `ExampleCategory`, `ExampleAssertionMode`, `ExampleRow`, `ExampleManifest`, `VerifiedExampleRow`, `VerifyExampleManifestOptions`, `ExampleVerificationError`, `loadExampleManifest`, `validateExampleManifest`, and `verifyExampleManifest`. Async `verifyExampleManifest` returns `[]` cleanly for empty rows.
- Created `scripts/verify-examples.ts` following the `verify-v3-migration.ts` pattern exactly.
- Created `test/contract/examples/example-manifest.test.ts` with 11 contract tests covering manifest existence, schema version, field presence, enum constraints, fixture-path confinement, rejection tests for invalid category/assertionMode/fixtureDir, and the round-trip `verifyExampleManifest` call.
- Added `verify:examples` script to `package.json` following the `verify:migration:v3` pattern.
- Added `pnpm run verify:examples` step to `.github/workflows/npmPublish.yml` after `verify:migration:v3` and before `pnpm publish`.
- Deferred decisions: no new `assertionMode` values were added (only `structured-output` and `serialised-output` are declared). `sourceFile` execution strategy uses `dynamic import()` with a named `runExample` or default export contract. Documentation generation remains deferred to Story 5.8.

### File List

**New files:**
- `docs/examples/manifest.json`
- `scripts/example-validation.ts`
- `scripts/verify-examples.ts`
- `test/contract/examples/example-manifest.test.ts`

**Modified files:**
- `package.json` — added `verify:examples` script
- `.github/workflows/npmPublish.yml` — added `pnpm run verify:examples` release gate step
- `_bmad-output/implementation-artifacts/5-6-establish-the-worked-example-manifest-and-validation-harness.md` — task checkboxes, Dev Agent Record, File List, Change Log, Status
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status updated

## Change Log

- 2026-05-22: Story 5.6 implemented. Added canonical example manifest, validation harness (`scripts/example-validation.ts`), verify entrypoint (`scripts/verify-examples.ts`), 11 contract tests, `verify:examples` npm script, and CI release gate. All ACs satisfied. 435/435 tests pass, lint clean.

## Status

done
