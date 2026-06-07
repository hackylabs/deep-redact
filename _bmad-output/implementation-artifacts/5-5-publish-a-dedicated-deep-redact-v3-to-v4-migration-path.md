# Story 5.5: Publish a Dedicated Deep Redact v3-to-v4 Migration Path

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want a dedicated migration path from the class-based Deep Redact v3 API to the v4 function-first API,
so that I can move existing services without ambiguity about the required API and configuration changes.

## Acceptance Criteria

1. Given Deep Redact v4 migration documentation is published, when migration guides are reviewed, then the v3-to-v4 migration path exists as a dedicated track separate from the `fast-redact` migration guide.
2. Given the v3 migration guide, when it is generated or validated, then it focuses on replacing the class-based API with the v4 function-first API and configuration model, and it does not assume `fast-redact` reader intent or reuse `fast-redact` migration examples as its primary source.
3. Given the v3 migration source of truth, when it is reviewed, then it is defined by one canonical manifest at `test/migration/v3/matrix.json`.
4. Given the canonical v3 migration manifest, when it is validated, then every row conforms to one strict JSON schema with these required fields: `id`, `fixtureDir`, `v3Usage`, `v4Usage`, `migrationSteps`, `assertionMode`, and `expectedResult`.
5. Given the canonical v3 migration manifest, when a row is inspected, then `fixtureDir` points to a named fixture directory under `test/migration/v3/fixtures/<id>/` containing the shared input payload, the expected migrated output artefact, and any row-specific notes required by the documentation generator.
6. Given the canonical v3 migration manifest, when a row is inspected, then `assertionMode` uses only declared enum values supported by the v3 migration validator.
7. Given the v3 migration row set, when it is reviewed before release, then it explicitly includes admitted rows covering replacement of class instantiation with `deepRedact(...)`, replacement of v3 invocation patterns with the callable redactor function, and any documented option-name rewrites required for the supported migration path.
8. Given a row in the canonical v3 migration manifest, when migration validation runs, then the `v4Usage` described by that row satisfies the row's `assertionMode` and produces the row's `expectedResult` exactly for the shared fixture payload.
9. Given a row in the canonical v3 migration manifest, when migration documentation is generated, then it shows the original `v3Usage`, the replacement `v4Usage`, and the exact `migrationSteps` required for that row.
10. Given the published v3 migration guide and the v3 migration validation suite, when they are maintained over time, then both are generated from or validated directly against the same canonical v3 migration manifest and fixture directories, and migration verification fails when the guide, manifest, or fixture outputs drift apart.
11. Given this story's scope, when the implementation is reviewed, then worked examples remain deferred to Stories `5.6` to `5.8`, and benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Create the canonical v3 migration manifest and fixture layout (AC: 3, 4, 5, 6)
  - [x] Add `test/migration/v3/matrix.json` as the single source of truth. Do not split row definitions across docs, examples, or validator-specific files.
  - [x] Use a strict, versioned JSON shape such as `{ "schemaVersion": 1, "metadata": {...}, "rows": [...] }` with the AC-required row fields present for every row.
  - [x] Keep all `fixtureDir` values repository-relative, normalised, and confined to `test/migration/v3/fixtures/<id>/`.
  - [x] For each fixture directory, include a shared input payload, expected v4 result artefact, and row notes used by the documentation generator. Use JSON fixtures for payloads and expected values.
  - [x] Do not store executable source of truth in generated Markdown. The manifest and fixture directories must drive both validation and documentation.
  - [x] Define a small explicit `assertionMode` enum. The following modes are recommended: `v4-structured-output` (callable redactor produces the expected structured result), `v4-serialised-output` (callable redactor produces the expected serialised string), and `v4-initialisation-error` (unsupported v3 option fails explicitly in v4).

- [x] Cover the documented v3 API scenarios with admitted migration rows (AC: 7, 8, 9)
  - [x] Include an admitted row for replacing class instantiation with the v4 factory: `new DeepRedact({ ... })` → `deepRedact({ ... })`. Use the structured output assertion mode so the row proves functional parity.
  - [x] Include an admitted row for replacing the `.redact()` method call with a direct callable redactor invocation: `redactor.redact(payload)` → `redactor(payload)`. This is the primary invocation-pattern change.
  - [x] Include an admitted row for renaming `blacklistedKeys` to `keys`: v3 `blacklistedKeys: [...]` → v4 `keys: [...]`. Use the structured output assertion mode.
  - [x] Include an admitted row for renaming `replacement` to `censor` with a literal string value: v3 `replacement: '[PRIVATE]'` → v4 `censor: '[PRIVATE]'`. Use the structured output assertion mode.
  - [x] Include an admitted row for renaming `replacement` to `censor` with a function value. Store the censor function as a named fixture helper ID in the manifest and map it to a local script function in the validator. Use the structured output assertion mode.
  - [x] Include an admitted row for options that carry over unchanged: `retainStructure`, `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, and `replaceStringByLength` are all valid v4 options with the same names and semantics. The row should prove at least two unchanged options in one fixture.
  - [x] Include an admitted row for `serialise` carrying over with the same British English spelling. v3 had both `serialize` and `serialise`; if the v3 contract used the American spelling as an alias, document that as a rewrite to `serialise` in v4.
  - [x] Include an admitted row covering `remove: true` carrying over unchanged to v4.
  - [x] Include an admitted row or rows covering combined usage: multiple options migrated together in one configuration, including both key rename and option renames in the same fixture.
  - [x] Do not add `blacklistedKeys`, `replacement`, or `serialize` as compatibility aliases to the v4 runtime. Migration documentation concerns must not introduce or preserve unsupported options in the public API.

- [x] Implement v3 migration validation without adding runtime dependencies (AC: 4, 6, 8, 10)
  - [x] Add a validator module at `scripts/v3-migration.ts` that loads the manifest, validates schema, resolves fixture paths, and defines row assertion logic. Follow the structure of `scripts/fast-redact-migration.ts`.
  - [x] Add a verifier entrypoint at `scripts/verify-v3-migration.ts` that exercises all rows and reports failures with row id, fixture path, assertion mode, and comparison phase identified clearly.
  - [x] Add a generator entrypoint at `scripts/generate-v3-migration-doc.ts` that renders `docs/migration/from-v3.md` from the manifest and fixtures.
  - [x] Keep the validator deterministic and offline. It should read committed fixtures and local dependencies only. Do not call `new DeepRedact` at validation time; use the v4 `deepRedact` factory from the local build to prove migration correctness.
  - [x] Keep the package zero-runtime-dependency. Any schema validation helpers should be small typed guards in `scripts/` or `test/` rather than new packages.
  - [x] Ensure assertion failures identify row id, fixture path, and comparison phase without dumping full sensitive payload values.

- [x] Generate and verify the published migration guide from the same source data (AC: 1, 2, 9, 10)
  - [x] Add the public guide at `docs/migration/from-v3.md`, generated from the canonical manifest and fixtures. Include a generated-file header matching the style of `docs/migration/from-fast-redact.md`.
  - [x] Render each row with the original `v3Usage`, the replacement `v4Usage`, the migration steps, and the expected result summary.
  - [x] Keep the guide focused on the class-to-function transition. Do not reference `fast-redact` API or reuse `fast-redact` migration examples. The v3 guide's primary audience is existing Deep Redact users, not `fast-redact` adopters.
  - [x] Wire the guide into `scripts/generated-files.ts` and `scripts/verify-generated-files.ts` following the same pattern used for `buildGeneratedFastRedactMigrationGuide` and `generatedFilePaths.fastRedactMigrationGuidePath`.
  - [x] Update `package.json` scripts: add `generate-v3-migration-doc` script, include it in the `generate` composite, add `verify:migration:v3` script. Ensure `pnpm run verify-generated-files` fails on guide drift.
  - [x] Do not hand-edit `README.md` for v3 migration content. A README link may be added only through the existing README generator workflow.

- [x] Add contract coverage and release-verification wiring (AC: 3–10)
  - [x] Add contract tests at `test/contract/migration/v3-migration.test.ts` following the pattern of `test/contract/migration/fast-redact-migration.test.ts`.
  - [x] Add a test that verifies the manifest path, schema, required row fields, and fixture confinement to `test/migration/v3/fixtures/`.
  - [x] Add a test that verifies the required rows are present: class-instantiation replacement, invocation-pattern replacement, `blacklistedKeys` rename, `replacement` rename, and unchanged-options coverage.
  - [x] Add tests that prove v4 does not accept `blacklistedKeys`, `replacement`, or `serialize` as undocumented options. Unknown options are rejected by `validate-config.ts`; prove this with explicit assertions.
  - [x] Add a test that verifies the generated guide is byte-for-byte equal to the renderer output, matching the lockstep pattern for `docs/migration/from-fast-redact.md`.
  - [x] Wire `verify:migration:v3` into `.github/workflows/npmPublish.yml` before publish, following the same position as `verify:migration:fast-redact`.
  - [x] Keep all contract tests offline and side-effect free.

- [x] Maintain scope boundaries (AC: 11)
  - [x] Do not add `fast-redact` migration content. Story `5.4` owns `test/migration/fast-redact/` and `docs/migration/from-fast-redact.md`. Do not mix the two tracks.
  - [x] Do not create the worked-example manifest or public worked examples. Stories `5.6` to `5.8` own those.
  - [x] Do not create benchmark manifests, artefacts, gates, or platform-adoption guidance.
  - [x] Do not change public redaction semantics, precedence, console adapter behaviour, Deno/install verification, package exports, or the release installation matrix unless a migration-row test exposes a real current-surface defect.
  - [x] Do not add `blacklistedKeys`, `replacement`, `serialize`, or any other v3 option alias to the v4 public API or runtime validation contract.

- [x] Verify the story implementation (AC: 1–11)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:migration:v3`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify-generated-files` after generating the guide.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if package scripts, generated files, validator scripts, docs, or shared test fixtures changed.
  - [x] Record any intentionally deferred worked-example, benchmark, or platform-adoption proof in the Dev Agent Record rather than widening this story.

### Review Findings

- [x] [Review][Defer] No `v4-initialisation-error` manifest rows — mode declared but never exercised via matrix; rejection proofs exist in contract tests only — deferred, contract-test coverage accepted as sufficient
- [x] [Review][Patch] "Reports failures" contract test exercises schema validation, not fixture-drift — reworked: mutation now changes the v4 config censor value so actual output diverges from committed expected-v4.json, proving real drift detection [test/contract/migration/v3-migration.test.ts:216]
- [x] [Review][Patch] Typo in `verifySerialised0utputRow` — renamed to `verifySerialisedOutputRow` (capital O) [scripts/v3-migration.ts:433]
- [x] [Review][Patch] Dead code after `fail()` in `verifyInitialisationErrorRow` — removed unreachable `readFixtureJson(...)` line; `repositoryRoot` parameter prefixed `_repositoryRoot` per lint convention [scripts/v3-migration.ts:477–479]
- [x] [Review][Patch] `unchanged-options` migration step mentions `replaceStringByLength` as unchanged but it is absent from `v4Usage.config` — step updated to correctly describe only the demonstrated options, with `replaceStringByLength` noted separately [test/migration/v3/matrix.json, unchanged-options row]
- [x] [Review][Defer] Row key order enforced via `Object.keys().join()` comparison — brittle for contributors whose JSON formatter reorders keys [scripts/v3-migration.ts] — deferred, pre-existing pattern from fast-redact migration infrastructure
- [x] [Review][Defer] `readFixtureText` strips only the final line ending — CRLF portability issue on Windows with `core.autocrlf=true` [scripts/v3-migration.ts:161] — deferred, pre-existing pattern; CI runs Linux only
- [x] [Review][Defer] JSON parse errors in `readJsonFile` not wrapped with row/fixture context [scripts/v3-migration.ts:145] — deferred, pre-existing pattern
- [x] [Review][Defer] `v4Usage.config` keys not validated against known v4 option names — config typos pass schema checks and fail only at runtime [scripts/v3-migration.ts] — deferred, caught during `verify:migration:v3`
- [x] [Review][Defer] `renderV3MigrationGuide` summary omits `v4-initialisation-error` row count — moot currently but would silently undercount if error rows are added [scripts/v3-migration.ts:604] — deferred, no such rows exist
- [x] [Review][Defer] Helper reference collision — `isHelperReference` treats any `{ helperId }` single-key object as a helper; a future v4 config option named `helperId` would be misidentified [scripts/v3-migration.ts:110] — deferred, theoretical

## Dev Notes

### Story Intent

- Story `5.5` delivers the dedicated v3-to-v4 migration track. It must produce one inspectable source of truth at `test/migration/v3/matrix.json`, executable proof for each admitted row, and a generated guide at `docs/migration/from-v3.md` that cannot drift from that proof.
- This is not a compatibility-shim story. Deep Redact v4 must not acquire `blacklistedKeys`, `replacement`, or `serialize` as backwards-compatible aliases. The story's job is to document the rewrites required, prove them executable, and publish a guide that walks existing users through each change.
- The main false-positive risk is a hand-written guide that claims parity without executable fixtures, exactly the pattern that Story `5.4` guarded against for `fast-redact`. Story `5.5` must apply the same lockstep discipline to v3 migration.

### Source Document Summary

- Story `5.5` implements FR30 only: providing a dedicated v3-to-v4 migration path. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:1479)]
- FR30 requires existing Deep Redact users to be able to migrate from the v3 class-based API to the v4 API through dedicated migration guidance. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:49)]
- The architecture explicitly separates `fast-redact` migration from Deep Redact v3 migration, stating that intentional divergences must be documented in one consistent format and codemod fixtures must use the same naming and output expectations as migration docs. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:565)]
- Migration artefacts belong under `src/compat/`, `docs/migration/`, `codemods/`, and `test/migration/`. Story `5.5` uses `docs/migration/` and `test/migration/v3/` and must not place migration sources under install compatibility paths. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:869)]
- Security requirements still apply: v4 is one-way only and the migration guide must not describe any restore or unredact capability. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:461)]

### Current Repository Intelligence

- The package is `@hackylabs/deep-redact` version `4.0.0`, ESM with dual-format published output and Node engine floor `>=22.18.0`. [Source: [package.json](package.json:2)]
- The v4 public config accepts `keys`, `paths`, `censor`, `remove`, `retainStructure`, `serialise`, `stringTests`, `transformers`, `diagnostics`, `ignoredValueTypes`, and `replaceStringByLength`. It does not accept `blacklistedKeys`, `replacement`, or `serialize`. [Source: [src/types/config.ts](src/types/config.ts:21)]
- Unknown root options are rejected at initialisation by `validate-config.ts`. Tests must prove that `blacklistedKeys`, `replacement`, and `serialize` remain unsupported rather than silently accepted. [Source: [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts:12)]
- The v3 API was class-based. From the retained red-phase test suite: `new DeepRedact({ blacklistedKeys, replacement, retainStructure, fuzzyKeyMatch, caseSensitiveKeyMatch, replaceStringByLength, serialise })`. The `.redact()` method was the invocation surface. [Source: [test/unit/index.test.ts](test/unit/index.test.ts:1)]
- The v3 types file `src/types.ts` still exists in the repository as part of the red-phase contract suite. It documents `blacklistedKeys` (`Array<string | RegExp | BlacklistKeyConfig>`), `replacement` (`string | Transformer`), and `replaceStringByLength`. Do not delete it as part of this story. [Source: [src/types.ts](src/types.ts:73)]
- The `fast-redact` migration infrastructure established in Story `5.4` is the direct model for this story. The key scripts are `scripts/fast-redact-migration.ts`, `scripts/generate-fast-redact-migration-doc.ts`, `scripts/verify-fast-redact-migration.ts`. [Source: [scripts/fast-redact-migration.ts](scripts/fast-redact-migration.ts:1)]
- `scripts/generated-files.ts` already wires the `fast-redact` guide through `buildGeneratedFastRedactMigrationGuide` and `generatedFilePaths.fastRedactMigrationGuidePath`. Follow this exact pattern to add the v3 guide. [Source: [scripts/generated-files.ts](scripts/generated-files.ts:83)]
- The `generate` package script already chains: `generate-exports`, `generate-readme`, `generate-precedence-doc`, `generate-one-way-redaction-doc`, `generate-fast-redact-migration-doc`. Add `generate-v3-migration-doc` to this chain. [Source: [package.json](package.json:1)]
- `verify:migration:fast-redact` is wired into `.github/workflows/npmPublish.yml` before publish. Add `verify:migration:v3` at the same position. [Source: [.github/workflows/npmPublish.yml](.github/workflows/npmPublish.yml:1)]
- `docs/migration/from-fast-redact.md` already exists and is the reference for the guide format. Note that `docs/migration/from-v3.md` does not yet exist. [Source: [docs/migration/from-fast-redact.md](docs/migration/from-fast-redact.md:1)]

### Previous Story Intelligence

- Story `5.4` established the full migration infrastructure pattern: canonical manifest at `test/migration/fast-redact/matrix.json`, fixture directories under `test/migration/fast-redact/fixtures/<id>/`, validator module at `scripts/fast-redact-migration.ts`, generator at `scripts/generate-fast-redact-migration-doc.ts`, verifier at `scripts/verify-fast-redact-migration.ts`, contract tests at `test/contract/migration/fast-redact-migration.test.ts`, generated-file wiring, package scripts, and release-workflow gate. Story `5.5` must mirror this structure for v3. [Source: [_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md](_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md:54)]
- The review findings from Story `5.4` are highly relevant: the validator must enforce the strict row schema, fixture-path checks must be repository-relative, and documented assertions must prove the committed artefact rather than passing on unrelated errors. Apply these lessons to the v3 validator from the start. [Source: [_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md](_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md:93)]
- Story `5.4` also established that function censors and custom serialisers must be stored as named fixture helper IDs rather than embedded JavaScript strings. The same rule applies to any v3 function `replacement` migration rows.
- Recent commit history: `3baa795 chore(migration): write fast-redact migration` completed Story `5.4`. This confirms the fast-redact migration infrastructure is fully in place and Story `5.5` begins from a clean working state.

### Architecture Compliance

- Migration artefacts belong under `docs/migration/`, `test/migration/`, and `src/compat/`. Story `5.5` uses `docs/migration/from-v3.md` and `test/migration/v3/`. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:869)]
- Tests live under `test/`, each directory maps to one responsibility domain, and `test/compatibility/` is separate from `test/migration/`. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:965)]
- Generated documentation must be generated or verified from maintained source data. Do not treat generated Markdown as the source of truth. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:897)]
- All code, comments, tests, docs, and commit messages must use British English unless quoting identifiers or third-party APIs. `serialise` is the correct spelling throughout. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:430)]
- Release workflows must verify migration fixtures before publish. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:989)]

### v3 API Reference

These are the key v3 API facts needed to write migration rows. They come from the retained red-phase test suite and `src/types.ts`.

**v3 instantiation (class-based):**
```ts
import { DeepRedact } from '@hackylabs/deep-redact'

const redactor = new DeepRedact({
  blacklistedKeys: ['password', 'token'],
  replacement: '[REDACTED]',
  serialise: false,
})

const result = redactor.redact({ user: { password: 'secret' }, token: 'abc123' })
```

**v4 equivalent (function-first):**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redact = deepRedact({
  keys: ['password', 'token'],
  censor: '[REDACTED]',
})

const result = redact({ user: { password: 'secret' }, token: 'abc123' })
```

**Key option renames:**
| v3 option | v4 option | Notes |
|-----------|-----------|-------|
| `blacklistedKeys` | `keys` | Same semantics, renamed |
| `replacement` | `censor` | Same semantics, renamed. String or function accepted in both. |
| `serialize` (alias) | `serialise` | v3 had both spellings; v4 accepts only `serialise` |

**Options that carry over unchanged (same name, same semantics):**
`serialise`, `retainStructure`, `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, `replaceStringByLength`, `remove`

**Invocation pattern change:**
| v3 | v4 |
|----|----|
| `redactor.redact(payload)` | `redactor(payload)` — the returned value is directly callable |

**v3 function `replacement` shape:**
In v3, `replacement` accepted `string | Transformer` where `Transformer` was `(value: unknown) => unknown`. In v4, `censor` accepts `string | ((value: unknown, context?: FunctionCensorContext) => unknown)`. The context parameter is new in v4; function censors written for v3 will continue to work because the context argument is optional.

### Implementation Guardrails

- Recommended manifest row shape for v3 migration:

```json
{
  "id": "class-instantiation-to-factory",
  "fixtureDir": "test/migration/v3/fixtures/class-instantiation-to-factory",
  "v3Usage": {
    "import": "DeepRedact",
    "instantiation": "new DeepRedact({ blacklistedKeys: ['password'], replacement: '[REDACTED]' })",
    "invocation": "redactor.redact(payload)"
  },
  "v4Usage": {
    "import": "deepRedact",
    "factory": "deepRedact({ keys: ['password'], censor: '[REDACTED]' })",
    "invocation": "redact(payload)"
  },
  "migrationSteps": [
    "Replace `new DeepRedact(options)` with `deepRedact(options)`.",
    "Replace `redactor.redact(payload)` with `redactor(payload)`.",
    "Rename `blacklistedKeys` to `keys`.",
    "Rename `replacement` to `censor`."
  ],
  "assertionMode": "v4-structured-output",
  "expectedResult": {
    "kind": "structured",
    "file": "expected-v4.json"
  }
}
```

- Recommended `assertionMode` enum values:
  - `v4-structured-output`: the v4 callable redactor applied to the fixture input produces the expected structured JSON result.
  - `v4-serialised-output`: the v4 callable redactor with `serialise: true` produces the expected string result.
  - `v4-initialisation-error`: an unsupported v3 option passed to `deepRedact(...)` fails explicitly with a validation error.
- Keep fixture directories small and reviewable. Use `input.json`, `expected-v4.json` or `expected-v4.txt`, and `notes.md` only if the doc generator needs extra prose.
- For function `replacement`/`censor` rows, store the function as a named helper ID in the manifest and map it to a local TypeScript function in the validator. Do not embed arbitrary JavaScript strings in JSON.
- The v3 guide prose should explain each rewrite in plain release-facing language. Avoid BMAD terminology. Sentences like "Replace the class constructor call with the factory function" are appropriate.
- Do not include a v3 `restore` or v3 `unredact` row — v3 Deep Redact never had restore capability. If reviewing the v3 types.ts confirms otherwise, add a divergence row, but this is not expected.

### File Structure Requirements

Files to add:

- `test/migration/v3/matrix.json`
- `test/migration/v3/fixtures/class-instantiation-to-factory/input.json`
- `test/migration/v3/fixtures/class-instantiation-to-factory/expected-v4.json`
- `test/migration/v3/fixtures/invocation-pattern-change/input.json`
- `test/migration/v3/fixtures/invocation-pattern-change/expected-v4.json`
- `test/migration/v3/fixtures/blacklisted-keys-rename/input.json`
- `test/migration/v3/fixtures/blacklisted-keys-rename/expected-v4.json`
- `test/migration/v3/fixtures/replacement-string-rename/input.json`
- `test/migration/v3/fixtures/replacement-string-rename/expected-v4.json`
- `test/migration/v3/fixtures/replacement-function-rename/input.json`
- `test/migration/v3/fixtures/replacement-function-rename/expected-v4.json`
- `test/migration/v3/fixtures/unchanged-options/input.json`
- `test/migration/v3/fixtures/unchanged-options/expected-v4.json`
- `test/migration/v3/fixtures/serialise-option-carryover/input.json`
- `test/migration/v3/fixtures/serialise-option-carryover/expected-v4.json`
- `test/migration/v3/fixtures/remove-option-carryover/input.json`
- `test/migration/v3/fixtures/remove-option-carryover/expected-v4.json`
- `test/migration/v3/fixtures/combined-migration/input.json`
- `test/migration/v3/fixtures/combined-migration/expected-v4.json`
- `scripts/v3-migration.ts`
- `scripts/generate-v3-migration-doc.ts`
- `scripts/verify-v3-migration.ts`
- `docs/migration/from-v3.md`
- `test/contract/migration/v3-migration.test.ts`

Files to update:

- `scripts/generated-files.ts` — add `buildGeneratedV3MigrationGuide` and `generatedFilePaths.v3MigrationGuidePath`
- `scripts/verify-generated-files.ts` — add v3 guide to the lockstep checks
- `package.json` — add `generate-v3-migration-doc` script, add it to `generate` composite, add `verify:migration:v3` script
- `.github/workflows/npmPublish.yml` — add `verify:migration:v3` before publish, at the same position as `verify:migration:fast-redact`
- `_bmad-output/implementation-artifacts/5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Files not to add or update for this story:

- `test/migration/fast-redact/` — owned by Story `5.4`
- `docs/migration/from-fast-redact.md` — owned by Story `5.4`
- `docs/examples/manifest.json` — owned by Stories `5.6`–`5.8`
- `test/bench/manifest.json` — owned by Stories `5.9`–`5.10`
- `docs/platform/standardisation-guide.md` — owned by Story `5.11`
- `src/types/config.ts` or any v4 public API types — do not add v3 option aliases
- `src/core/validation/validate-config.ts` — do not add acceptance of v3 option names

### Testing Requirements

- Add red-phase tests first for the manifest path, schema shape, required rows, fixture confinement, and generated guide lockstep.
- Add a test that fails if the manifest omits any AC-required row category (class instantiation, invocation pattern, `blacklistedKeys` rename, `replacement` rename).
- Add a test that proves the generated guide is byte-for-byte equal to the renderer output, matching the existing lockstep test for `docs/migration/from-fast-redact.md`.
- Add tests proving fixture paths cannot escape `test/migration/v3/fixtures/`.
- Add tests proving v4 does not silently accept `blacklistedKeys`, `replacement`, or `serialize` — these must fail with a validation error when passed to `deepRedact(...)`.
- Add row-level assertion tests that execute `deepRedact(...)` with the migrated v4 config from each fixture and compare the output against the committed expected artefact.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](project-context.md:1)]
- Node, package-manager, build, lint, test, generation, benchmark, and release commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: [project-context.md](project-context.md:16)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: [project-context.md](project-context.md:30)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](project-context.md:36)]

### Open Questions / Assumptions

- Assume the v3 API surface is fully captured by `src/types.ts` and `test/unit/index.test.ts`. If additional v3 options exist in those files that are not covered by the task list (e.g. `paths` was not a v3 option but check `src/types.ts` to confirm), add additional migration rows accordingly.
- Assume Story `5.5` should not add a v3 codemod. The architecture says migration-assist tooling is planned, but the story acceptance criteria require a verified matrix and generated guide only.
- Assume `docs/migration/from-v3.md` does not yet exist and should be generated from scratch. Confirm with `ls docs/migration/` before starting.
- Assume the `serialize` alias was present in the v3 API based on the red-phase test evidence. If `src/types.ts` does not include `serialize`, skip the serialize-alias row and note this in the Dev Agent Record.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:1479)
- FR30: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:49)
- Migration architecture decisions: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:146)
- Migration file organisation: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:869)
- v3 red-phase tests: [test/unit/index.test.ts](test/unit/index.test.ts:1)
- v3 types: [src/types.ts](src/types.ts:73)
- v4 config types: [src/types/config.ts](src/types/config.ts:21)
- v4 validation boundary: [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts:12)
- Generated-file workflow: [scripts/generated-files.ts](scripts/generated-files.ts:83)
- fast-redact migration validator (direct model): [scripts/fast-redact-migration.ts](scripts/fast-redact-migration.ts:1)
- fast-redact migration contract tests (direct model): [test/contract/migration/fast-redact-migration.test.ts](test/contract/migration/fast-redact-migration.test.ts:1)
- fast-redact migration guide (format reference): [docs/migration/from-fast-redact.md](docs/migration/from-fast-redact.md:1)
- Previous story: [_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md](_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md:1)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented 9 migration rows covering all AC-required categories: class instantiation, invocation pattern, `blacklistedKeys` rename, `replacement` (string and function), unchanged options, `serialise` carryover, `remove` carryover, and combined migration.
- The `serialize` alias check is included in the matrix migration steps (with notes explaining the rename) and in contract tests proving v4 rejects `serialize` as an unsupported option.
- The `unchanged-options` row uses `retainStructure`, `fuzzyKeyMatch`, and `caseSensitiveKeyMatch` together (3 unchanged options, exceeding the AC minimum of 2).
- The function censor helper `maskValueType` is stored as a named helper ID in the manifest and resolved in `scripts/v3-migration.ts`; the fixture `expected-v4.json` contains `[masked-string]` proving the function ran correctly.
- `docs/migration/from-v3.md` is generated and verified byte-for-byte in lockstep; `pnpm run verify-generated-files` catches any drift.
- All 424 contract tests pass; `pnpm run lint` passes; `pnpm run verify:migration:v3` verifies all 9 rows against the built dist.
- No worked-example, benchmark, or platform-adoption rows were added; those are deferred to Stories 5.6–5.11 per AC 11.

### File List

- `test/migration/v3/matrix.json` (added)
- `test/migration/v3/fixtures/class-instantiation-to-factory/input.json` (added)
- `test/migration/v3/fixtures/class-instantiation-to-factory/expected-v4.json` (added)
- `test/migration/v3/fixtures/class-instantiation-to-factory/notes.md` (added)
- `test/migration/v3/fixtures/invocation-pattern-change/input.json` (added)
- `test/migration/v3/fixtures/invocation-pattern-change/expected-v4.json` (added)
- `test/migration/v3/fixtures/invocation-pattern-change/notes.md` (added)
- `test/migration/v3/fixtures/blacklisted-keys-rename/input.json` (added)
- `test/migration/v3/fixtures/blacklisted-keys-rename/expected-v4.json` (added)
- `test/migration/v3/fixtures/blacklisted-keys-rename/notes.md` (added)
- `test/migration/v3/fixtures/replacement-string-rename/input.json` (added)
- `test/migration/v3/fixtures/replacement-string-rename/expected-v4.json` (added)
- `test/migration/v3/fixtures/replacement-string-rename/notes.md` (added)
- `test/migration/v3/fixtures/replacement-function-rename/input.json` (added)
- `test/migration/v3/fixtures/replacement-function-rename/expected-v4.json` (added)
- `test/migration/v3/fixtures/replacement-function-rename/notes.md` (added)
- `test/migration/v3/fixtures/unchanged-options/input.json` (added)
- `test/migration/v3/fixtures/unchanged-options/expected-v4.json` (added)
- `test/migration/v3/fixtures/unchanged-options/notes.md` (added)
- `test/migration/v3/fixtures/serialise-option-carryover/input.json` (added)
- `test/migration/v3/fixtures/serialise-option-carryover/expected-v4.txt` (added)
- `test/migration/v3/fixtures/serialise-option-carryover/notes.md` (added)
- `test/migration/v3/fixtures/remove-option-carryover/input.json` (added)
- `test/migration/v3/fixtures/remove-option-carryover/expected-v4.json` (added)
- `test/migration/v3/fixtures/remove-option-carryover/notes.md` (added)
- `test/migration/v3/fixtures/combined-migration/input.json` (added)
- `test/migration/v3/fixtures/combined-migration/expected-v4.json` (added)
- `test/migration/v3/fixtures/combined-migration/notes.md` (added)
- `scripts/v3-migration.ts` (added)
- `scripts/generate-v3-migration-doc.ts` (added)
- `scripts/verify-v3-migration.ts` (added)
- `docs/migration/from-v3.md` (added — generated)
- `test/contract/migration/v3-migration.test.ts` (added)
- `scripts/generated-files.ts` (modified — added `buildGeneratedV3MigrationGuide` and `v3MigrationGuidePath`)
- `scripts/verify-generated-files.ts` (modified — added v3 guide lockstep check)
- `package.json` (modified — added `generate-v3-migration-doc` and `verify:migration:v3` scripts)
- `.github/workflows/npmPublish.yml` (modified — added `verify:migration:v3` before publish)
- `_bmad-output/implementation-artifacts/5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-05-22: Implemented Story 5.5 — v3-to-v4 migration path with canonical manifest, 9 fixture rows, validator, generator, contract tests, and lockstep guide verification.
