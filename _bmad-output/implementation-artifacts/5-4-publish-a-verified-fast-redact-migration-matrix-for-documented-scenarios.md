# Story 5.4: Publish a Verified `fast-redact` Migration Matrix for Documented Scenarios

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want documented `fast-redact` scenarios to map to Deep Redact v4 through a verified migration matrix of equivalents, rewrites, and divergences,
so that I can judge migration effort before changing production services.

## Acceptance Criteria

1. Given the `fast-redact` migration source of truth, when it is reviewed, then it is defined by one canonical manifest at `test/migration/fast-redact/matrix.json`.
2. Given the canonical `fast-redact` migration manifest, when it is validated, then every row conforms to one strict JSON schema with these required fields: `id`, `classification`, `fixtureDir`, `fastRedactConfig`, `v4Action`, `assertionMode`, and `expectedResult`.
3. Given the canonical `fast-redact` migration manifest, when a row is inspected, then `classification` is exactly one of `direct-equivalent`, `mechanical-rewrite`, or `intentional-divergence`.
4. Given the canonical `fast-redact` migration manifest, when a row is inspected, then `assertionMode` is valid for that row classification and uses only declared enum values supported by the migration validator.
5. Given the canonical `fast-redact` migration manifest, when a row is inspected, then `fixtureDir` points to a named fixture directory under `test/migration/fast-redact/fixtures/<id>/` containing the shared input payload, the expected v4 result or divergence artefact, and any row-specific notes required by the documentation generator.
6. Given a row classified as `direct-equivalent`, when migration validation runs, then the v4 configuration described by `v4Action` produces the row's expected result exactly for the shared fixture payload and that row is treated as a parity case in the generated migration documentation.
7. Given a row classified as `mechanical-rewrite`, when migration validation runs, then the rewritten v4 configuration described by `v4Action` produces the row's expected result exactly for the shared fixture payload.
8. Given a row classified as `mechanical-rewrite`, when migration documentation is generated, then it shows the original `fast-redact` configuration, the rewritten v4 configuration, and the exact rewrite required for that row.
9. Given the mechanical-rewrite row set, when it is reviewed before release, then it explicitly includes at least one admitted scenario covering the serialisation-option spelling difference between source and target configurations.
10. Given a row classified as `intentional-divergence`, when migration validation runs, then the row satisfies the alternative assertion defined by its `assertionMode` and `expectedResult` rather than being treated as a parity case.
11. Given a row classified as `intentional-divergence`, when migration documentation is generated, then it states the `fast-redact` behaviour, the v4 behaviour, the migration action required, and the reason for divergence for that row.
12. Given the intentional-divergence row set, when it is reviewed before release, then it explicitly includes admitted rows covering lack of `restore`, lack of `strict`, and `serialise` defaulting to `false` rather than implicit JSON serialisation.
13. Given the published `fast-redact` migration guide and the migration validation suite, when they are maintained over time, then both are generated from or validated directly against the same canonical migration manifest and fixture directories, and documentation drift causes migration verification to fail.
14. Given this story's scope, when the implementation is reviewed, then Deep Redact v3 migration remains deferred to Story `5.5`, worked examples remain deferred to Stories `5.6` to `5.8`, and benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Create the canonical `fast-redact` migration manifest and fixture layout (AC: 1, 2, 3, 4, 5)
  - [x] Add `test/migration/fast-redact/matrix.json` as the single source of truth. Do not split row definitions across docs, examples, or validator-specific files.
  - [x] Use a strict, versioned JSON shape, for example `{ "schemaVersion": 1, "metadata": {...}, "rows": [...] }`, with the AC-required row fields present for every row.
  - [x] Validate `classification` against exactly `direct-equivalent`, `mechanical-rewrite`, and `intentional-divergence`.
  - [x] Define a small explicit `assertionMode` enum, and reject assertion modes that are not valid for the row's classification.
  - [x] Keep all `fixtureDir` values repository-relative, normalised, and confined to `test/migration/fast-redact/fixtures/<id>/`.
  - [x] For each fixture directory, include a shared input payload, expected v4 result or divergence artefact, and row notes used by the documentation generator. Prefer JSON fixtures for payloads and expected values; use named fixture helper IDs only where functions are unavoidable.
  - [x] Do not store executable source of truth in generated Markdown. The manifest and fixture directories must drive both validation and documentation.

- [x] Cover the documented `fast-redact` API scenarios with admitted migration rows (AC: 6, 7, 8, 9, 10, 11, 12)
  - [x] Include admitted rows for documented path targeting that Deep Redact v4 already supports: dot paths, bracket-quoted property paths such as `headers["X-Forwarded-For"]`, numeric array indexes, final-position wildcard paths such as `a.b.*`, and intermediate wildcard paths where the same string syntax works. Classify each row as `direct-equivalent` or `mechanical-rewrite` depending on whether the v4 action changes options or syntax.
  - [x] Include mechanical-rewrite rows for documented `fast-redact` syntax that needs a v4 rewrite, including `a[*].c.d` to `a.*.c.d` and `serialize` to `serialise`.
  - [x] Include a mechanical-rewrite row where a `fast-redact` default JSON-string output must become `serialise: true` in v4.
  - [x] Include a mechanical-rewrite row where a `fast-redact` custom `serialize` function becomes the equivalent Deep Redact `serialise` function. Store any custom serialiser as a declared fixture helper ID rather than embedding source code inside JSON.
  - [x] Include rows for `remove: true`, literal string `censor`, and function `censor` behaviour. For function censors, encode the function as a declared fixture helper ID rather than embedding source code inside JSON.
  - [x] Include intentional-divergence rows for all AC-mandated cases: no `restore` API, no `strict` option, and default structured output when `serialise` is omitted.
  - [x] Include at least one divergence or explicit limitation row for documented non-string `fast-redact` `censor` values unless the implementation deliberately widens the v4 public `Censor` type and validation contract in this story. The current v4 public type accepts string or function censors only.
  - [x] For any row that executes `fast-redact`, run it against a fresh clone of the fixture payload because `fast-redact` may mutate and restore the caller object during serialisation.
  - [x] Do not treat `fast-redact` input mutation, restore, or `strict` compatibility as features to reintroduce. They are migration documentation concerns, not v4 runtime requirements.

- [x] Implement migration validation without adding runtime dependencies (AC: 2, 4, 6, 7, 10, 13)
  - [x] Add a validator script or shared module, for example `scripts/verify-fast-redact-migration.ts` plus a reusable `scripts/fast-redact-migration.ts`, that loads the manifest, validates schema, resolves fixture paths, and runs row assertions.
  - [x] Use the existing devDependency `fast-redact@3.5.0` for comparator execution. Do not fetch the latest package during tests or release verification.
  - [x] Use `createRequire(import.meta.url)` or an equivalent CJS-compatible import boundary for `fast-redact`; do not add a wrapper to the published package.
  - [x] Keep the validator deterministic and offline. It should read committed fixtures and local dependencies only.
  - [x] Ensure assertion failures identify row id, classification, assertion mode, fixture path, and comparison phase without dumping full sensitive payload values.
  - [x] Keep the package zero-runtime-dependency. If schema validation helpers are needed, implement small typed guards in scripts/tests rather than adding a dependency.

- [x] Generate and verify the published migration guide from the same source data (AC: 8, 11, 13)
  - [x] Add the public guide at `docs/migration/from-fast-redact.md`, generated from the canonical manifest and fixtures. Include a generated-file header like the current architecture docs.
  - [x] Render each row with the original `fast-redact` configuration, the v4 configuration or action, classification, assertion mode, expected result or divergence artefact, and migration steps.
  - [x] Render intentional divergences in plain release-facing language: `restore` is unsupported, `strict` is unsupported, omitted `serialise` returns structured output, and any unsupported `fast-redact` censor value shape needs an explicit migration action.
  - [x] Wire the guide into the existing generated-file workflow by extending `scripts/generated-files.ts`, `scripts/verify-generated-files.ts`, and adding a generator entrypoint such as `scripts/generate-fast-redact-migration-doc.ts`.
  - [x] Update `package.json` scripts so `pnpm run generate` includes the guide generator and `pnpm run verify-generated-files` fails on guide drift.
  - [x] Do not hand-edit `README.md` for migration content. Add a README link only if it is rendered through the existing README generator and covered by generated-file verification.

- [x] Add contract coverage and release-verification wiring (AC: 1-14)
  - [x] Add contract tests under `test/contract/migration/` so the default `pnpm run test:contract` gate validates manifest schema, fixture confinement, required row coverage, row classifications, assertion modes, comparator execution, generated documentation lockstep, and required divergence coverage.
  - [x] Add tests that intentionally fail if `serialize` or `strict` is silently accepted as a v4 compatibility alias.
  - [x] Add tests that prove the returned Deep Redact v4 redactor exposes no `.restore`, `.unredact`, or equivalent reverse-operation method. `restore` is a `fast-redact` redactor method when `serialize: false`, not just a root configuration option.
  - [x] Add tests that prove the generated migration guide is byte-for-byte equal to the renderer output, similar to the existing README and architecture-doc lockstep tests.
  - [x] Add a package script such as `verify:migration:fast-redact` if the validator is not fully covered by contract tests, and wire it into the release workflow before publish if it is needed for explicit release evidence.
  - [x] Keep default contract tests offline and side-effect free. They may execute local `fast-redact` and Deep Redact against committed fixtures, but must not run package-manager installs or network calls.

- [x] Maintain scope boundaries (AC: 14)
  - [x] Do not add Deep Redact v3 migration content; Story `5.5` owns `test/migration/v3/` and `docs/migration/from-v3.md`.
  - [x] Do not create the worked-example manifest or public worked examples; Stories `5.6` to `5.8` own those.
  - [x] Do not create benchmark manifests, benchmark artefacts, benchmark gates, or platform-adoption guidance.
  - [x] Do not change public redaction semantics, precedence, console adapter behaviour, Deno/install verification, package exports, or release installation matrix unless a migration-row test exposes a real current-surface defect.
  - [x] Do not add `restore`, `unredact`, mutation compatibility, `strict`, or a public `serialize` alias to Deep Redact v4.

- [x] Verify the story implementation (AC: 1-14)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:migration:fast-redact` if that package script is added.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify-generated-files` after generating the guide.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if package scripts, generated files, validator scripts, docs, or shared test fixtures changed.
  - [x] Record any intentionally deferred v3 migration, worked-example, benchmark, or platform-adoption proof in the Dev Agent Record rather than widening this story.

### Review Findings

- [x] [Review][Patch] Validator does not enforce the declared strict row schema [scripts/fast-redact-migration.ts:325]
- [x] [Review][Patch] Repository-relative path checks ignore the supplied repository root and use platform-specific generated-guide paths [scripts/fast-redact-migration.ts:124]
- [x] [Review][Patch] Documented-divergence assertions can pass without proving the committed divergence artefact [scripts/fast-redact-migration.ts:498]
- [x] [Review][Patch] Initialisation-error rows can pass on unrelated errors when `unsupportedOption` is absent [scripts/fast-redact-migration.ts:549]
- [x] [Review][Patch] Matrix omits documented `fast-redact` leading-bracket path coverage [test/migration/fast-redact/matrix.json:13]
- [x] [Review][Patch] Rows classified as direct equivalents still document option migration steps from `serialize: false` [test/migration/fast-redact/matrix.json:15]
- [x] [Review][Patch] `strict` divergence does not state the actual `fast-redact` behaviour for the row configuration [test/migration/fast-redact/matrix.json:456]
- [x] [Review][Patch] Public guide renders fixture helper placeholders as literal `fast-redact` and v4 configurations [docs/migration/from-fast-redact.md:446]
- [x] [Review][Patch] Generated guide row sections run together without a blank line between notes and the next heading [docs/migration/from-fast-redact.md:112]

## Dev Notes

### Story Intent

- Story `5.4` starts the migration track for external `fast-redact` adopters. It must produce one inspectable source of truth, executable proof for each admitted row, and a generated guide that cannot drift from the proof.
- This is not a compatibility-shim story. Deep Redact v4 should document equivalents, mechanical rewrites, and intentional divergences without adding `fast-redact` restore, mutation, `strict`, or `serialize` aliases to the public API.
- The main false-positive risk is a hand-written migration guide that claims parity without executable fixtures. The implementation must make docs fail when the manifest, fixture outputs, or row explanations drift.

### Source Document Summary

- Epic `5` is about migration, release verification, benchmark evidence, and adoption guidance. Story `5.4` implements FR28 and FR29 only. [Source: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1300), [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1411)]
- FR28 requires documented `fast-redact` scenarios to migrate through equivalent or clearly documented alternative configuration; FR29 requires intentional `fast-redact` behavioural differences to be identifiable before adoption. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:431)]
- Security requirements still apply to migration material: v4 is one-way only and must not expose restore or unredact capability. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:461)]
- Architecture explicitly says `fast-redact` parity is surface-level and deliberate: `paths`, `censor`, and `remove` migrate where useful, while `serialise` spelling, structured-output default, lack of `strict`, and lack of restore must be documented as divergences or rewrites. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:146), [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:350)]

### Current Repository Intelligence

- The package is `@hackylabs/deep-redact` version `4.0.0`, ESM with dual-format published output and Node engine floor `>=22.18.0`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:2)]
- `fast-redact@3.5.0` and `@types/fast-redact@3.0.4` are already devDependencies, and `package.json` states comparison packages are not used in the library runtime. Keep that boundary intact. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:78), [package.json](/Users/ben.green/Code/deep-redact/package.json:88)]
- The v4 public config currently exposes `paths`, `keys`, `censor`, `remove`, `retainStructure`, `serialise`, `stringTests`, transformers, diagnostics, ignored value types, and same-length replacement. It does not expose `serialize` or `strict`. [Source: [src/types/config.ts](/Users/ben.green/Code/deep-redact/src/types/config.ts:21)]
- The current public `Censor` type accepts a string or function. A documented `fast-redact` non-string literal censor must therefore be treated as a limitation/divergence unless this story deliberately changes both type and validation contracts. [Source: [src/types/paths.ts](/Users/ben.green/Code/deep-redact/src/types/paths.ts:18), [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:125)]
- `serialise: true` uses `JSON.stringify`, a function `serialise` is called after redaction, and omitted `serialise` returns structured output. This is the core default-output divergence from `fast-redact`. [Source: [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts:11)]
- Unknown root options are rejected by validation, so tests should prove that `serialize` and `strict` remain unsupported rather than silently accepted. [Source: [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:12), [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:101)]
- String path parsing supports dot notation, bracket-quoted property segments, numeric bracket indexes, bare `*`, and bare `**`. Bracket wildcard syntax such as `a[*].c.d` is rejected and should be represented as a mechanical rewrite to `a.*.c.d`. [Source: [src/core/matching/path-parser.ts](/Users/ben.green/Code/deep-redact/src/core/matching/path-parser.ts:285), [src/core/matching/path-parser.ts](/Users/ben.green/Code/deep-redact/src/core/matching/path-parser.ts:333)]
- Generated documentation is already enforced for README, precedence, and one-way redaction artefacts through `scripts/generated-files.ts` and `scripts/verify-generated-files.ts`. Follow this pattern for `docs/migration/from-fast-redact.md`. [Source: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:54), [scripts/verify-generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/verify-generated-files.ts:1)]
- The generated one-way redaction document already states the no-restore divergence from `fast-redact` and earlier versions. Link to or reuse this fact instead of creating a contradictory migration claim. [Source: [docs/architecture/one-way-redaction.md](/Users/ben.green/Code/deep-redact/docs/architecture/one-way-redaction.md:1)]
- The generated precedence document and fixture renderer provide a local model for canonical fixture data producing both runtime proof and public documentation. [Source: [test/fixtures/precedence-matrix/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/precedence-matrix/index.ts:1), [docs/architecture/precedence.md](/Users/ben.green/Code/deep-redact/docs/architecture/precedence.md:1)]

### Previous Story Intelligence

- Stories `5.1` to `5.3` established the release-verification pattern: canonical manifest, repository-relative fixtures, committed expected artefacts, hermetic contract tests, generated documentation lockstep, and explicit release gates. Reuse that operating model for migration instead of creating hand-maintained guide content.
- Story `5.1` established manifest paths under `test/compatibility/install/`, fixture paths under `test/fixtures/compatibility/install/`, and expected output under `test/artefacts/install-matrix/`. Story `5.4` should use the migration-specific architecture home instead: `test/migration/fast-redact/`. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:24)]
- Story `5.2` hardened verifier behaviour around row selection, shell-free execution planning, stdout comparisons, and temporary fixture cleanup. Migration validation should be similarly strict about row identity, fixture paths, and actionable failure output. [Source: [_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md:17)]
- Story `5.3` made generated README installation documentation fail closed against canonical matrix data. Story `5.4` should make `docs/migration/from-fast-redact.md` fail closed against canonical migration data. [Source: [_bmad-output/implementation-artifacts/5-3-verify-the-deno-baseline-path-and-installation-documentation-lockstep.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-3-verify-the-deno-baseline-path-and-installation-documentation-lockstep.md:34)]
- Recent commits are source-of-truth and verifier-led: `da401b4` verified Deno installation and documentation lockstep, `0b5e604` verified Node package-manager installation flow, `e5bfb9d` defined the canonical install matrix and baseline fixtures, and `75afb1b` completed optional console adapter work.

### Architecture Compliance

- Migration artefacts belong under `src/compat/`, `docs/migration/`, `codemods/`, and `test/migration/`; this story should use `docs/migration/` and `test/migration/fast-redact/` and should not place migration sources under install compatibility paths. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:869)]
- Tests live under `test/`, each test directory maps to one responsibility domain, and `test/compatibility/` is separate from `test/migration/`. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:965)]
- Generated documentation and verification outputs must be generated or verified from maintained source data. Do not treat generated Markdown as the source of truth. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:897)]
- Release workflows should verify compatibility matrix, generated artefacts, migration fixtures, benchmark thresholds, and security gates before publish. This story covers the `fast-redact` migration-fixture part only. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:989)]

### Latest Technical Information

- Checked on 22 May 2026 against npm, the upstream `fast-redact` README, and the local pinned package. npm lists `fast-redact` latest as `3.5.0`, published on 19 March 2024, matching this repository's devDependency. [Source: [npm fast-redact package](https://www.npmjs.com/package/fast-redact), [package.json](/Users/ben.green/Code/deep-redact/package.json:93)]
- The documented `fast-redact` API is `require('fast-redact')({ paths, censor, serialize }) => Function`; its default usage serialises with `JSON.stringify`. [Source: [fast-redact npm README](https://www.npmjs.com/package/fast-redact)]
- `fast-redact` documents dot paths, bracket-quoted property paths, numeric indexes, leading brackets, final wildcards, intermediate wildcards, and `a[*].c.d` array wildcard syntax. Deep Redact v4 supports several of these directly and needs explicit rewrites for bracket wildcard syntax. [Source: [fast-redact npm README](https://www.npmjs.com/package/fast-redact), [upstream fast-redact README](https://raw.githubusercontent.com/davidmarkclements/fast-redact/master/readme.md)]
- `fast-redact` documents `remove`, `censor`, `serialize`, `restore` when `serialize: false`, and `strict`. The migration matrix must classify each supported equivalent, mechanical rewrite, or divergence rather than omitting difficult cases. [Source: [fast-redact npm README](https://www.npmjs.com/package/fast-redact)]
- Public advisory context as of 22 May 2026: CVE-2025-57319 exists in NVD as a disputed `fast-redact` prototype-pollution record, while GitHub's related advisory was withdrawn because it covered an internal undocumented utility rather than the public API. Do not widen Deep Redact runtime exposure to `fast-redact`, do not fetch unpinned comparator versions, and keep comparator execution limited to committed fixtures through the existing local devDependency. [Source: [NVD CVE-2025-57319](https://nvd.nist.gov/vuln/detail/CVE-2025-57319), [GitHub Advisory GHSA-ffrw-9mx8-89p8](https://github.com/advisories/GHSA-ffrw-9mx8-89p8)]

### Implementation Guardrails

- Recommended manifest row shape:

```json
{
  "id": "static-path-default-serialisation",
  "classification": "mechanical-rewrite",
  "fixtureDir": "test/migration/fast-redact/fixtures/static-path-default-serialisation",
  "fastRedactConfig": {
    "paths": ["headers.cookie"]
  },
  "v4Action": {
    "kind": "deep-redact-config",
    "config": {
      "paths": ["headers.cookie"],
      "serialise": true
    },
    "migrationSteps": ["Rename serialize to serialise when present.", "Set serialise: true when the old call relied on default JSON string output."]
  },
  "assertionMode": "same-serialised-output",
  "expectedResult": {
    "kind": "serialised",
    "file": "expected.txt"
  }
}
```

- Suggested `assertionMode` enum:
  - `same-structured-output` for output parity where both sides are compared as structured values.
  - `same-serialised-output` for output parity where both sides are compared as strings.
  - `v4-structured-output` for mechanical rewrites where the expected v4 structured output is the acceptance target.
  - `v4-serialised-output` for mechanical rewrites where the expected v4 string output is the acceptance target.
  - `documented-divergence` for rows that validate the guide text and expected divergence artefact rather than pretending parity.
  - `v4-initialisation-error` for rows that prove unsupported `fast-redact` options or value shapes fail explicitly in v4.
- Classify assertion modes strictly:
  - `direct-equivalent` rows may use only `same-structured-output` or `same-serialised-output`.
  - `mechanical-rewrite` rows may use `same-structured-output`, `same-serialised-output`, `v4-structured-output`, or `v4-serialised-output`, depending on whether the row compares both libraries directly or validates a rewritten v4 acceptance target.
  - `intentional-divergence` rows may use only `documented-divergence` or `v4-initialisation-error`; do not classify divergence rows as parity checks.
- Keep row fixtures small and reviewable. A practical fixture directory shape is `input.json`, `expected-v4.json` or `expected-v4.txt`, `divergence.json` for divergence rows, and `notes.md` only if the documentation generator needs extra prose.
- If a row needs a function censor or custom serialiser, store a named helper ID in JSON and map it to a local test/script function in the validator. Do not embed arbitrary JavaScript strings in the manifest.
- Use fresh payload copies for each comparator run. Avoid relying on `fast-redact` restore to clean up state before Deep Redact runs.
- Generated guide prose should avoid BMAD terminology because it will live under `docs/` as product documentation.

### File Structure Requirements

Likely files to add:

- `test/migration/fast-redact/matrix.json`
- `test/migration/fast-redact/fixtures/<row-id>/input.json`
- `test/migration/fast-redact/fixtures/<row-id>/expected-v4.json` or `expected-v4.txt`
- `test/migration/fast-redact/fixtures/<row-id>/divergence.json` for divergence rows
- `scripts/fast-redact-migration.ts`
- `scripts/verify-fast-redact-migration.ts`
- `scripts/generate-fast-redact-migration-doc.ts`
- `docs/migration/from-fast-redact.md`
- `test/contract/migration/fast-redact-migration.test.ts`

Likely files to update:

- `scripts/generated-files.ts`
- `scripts/verify-generated-files.ts`
- `package.json`
- `.github/workflows/npmPublish.yml` if an explicit migration verification script is added to the release gate
- `_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Do not add or update for this story:

- `test/migration/v3/`
- `docs/migration/from-v3.md`
- `docs/examples/manifest.json`
- `docs/examples/fixtures/`
- `test/bench/manifest.json`
- `test/artefacts/benchmarks/`
- `docs/platform/standardisation-guide.md`
- public runtime aliases for `restore`, `unredact`, `strict`, or `serialize`

### Testing Requirements

- Add red-phase tests first for the manifest path, schema, required classifications, required divergence coverage, and generated guide lockstep.
- Add a test that fails if the canonical matrix omits the AC-mandated divergence rows for no `restore`, no `strict`, and omitted `serialise` defaulting to structured output.
- Add comparator tests for admitted output parity rows using local `fast-redact@3.5.0` and local Deep Redact v4.
- Add documentation tests that render the guide from the manifest and fixture directories and compare it byte-for-byte with `docs/migration/from-fast-redact.md`.
- Add tests proving fixture paths cannot escape `test/migration/fast-redact/fixtures/`.
- Add tests proving generated docs mention the exact migration action for mechanical rewrites, especially `serialize` to `serialise`.
- Add tests proving v4 does not accept unsupported compatibility aliases or options unless this story intentionally changes the public API, which it should avoid.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)]
- Node, package-manager, build, lint, test, generation, benchmark, and release commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:16)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:30)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:36)]

### Open Questions / Assumptions

- Assume "documented `fast-redact` scenarios" means the official `fast-redact@3.5.0` README/API surface plus the local pinned package, not every historical test case or undocumented internal behaviour.
- Assume `docs/migration/from-fast-redact.md` is the published guide for this story. A README link may be added only through generated README workflow.
- Assume the migration validator may compare against local `fast-redact@3.5.0` because it is already a devDependency and is not part of the Deep Redact runtime package.
- Assume Story `5.4` should not add a full codemod yet. Architecture says migration-assist tooling is planned, but this story's acceptance criteria require a verified matrix and generated guide.
- Assume any current v4 inability to accept documented non-string `fast-redact` censor values should be documented as a divergence unless the maintainer explicitly chooses to widen the v4 contract.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1411)
- FR28 and FR29: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:431)
- Migration architecture decisions: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:146)
- Migration file organisation: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:869)
- Package metadata and scripts: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)
- Public v4 config type: [src/types/config.ts](/Users/ben.green/Code/deep-redact/src/types/config.ts:21)
- Path parser: [src/core/matching/path-parser.ts](/Users/ben.green/Code/deep-redact/src/core/matching/path-parser.ts:285)
- Validation boundary: [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:12)
- Serialisation behaviour: [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts:11)
- Generated-file workflow: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:54)
- One-way redaction doc: [docs/architecture/one-way-redaction.md](/Users/ben.green/Code/deep-redact/docs/architecture/one-way-redaction.md:1)
- Previous story: [_bmad-output/implementation-artifacts/5-3-verify-the-deno-baseline-path-and-installation-documentation-lockstep.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-3-verify-the-deno-baseline-path-and-installation-documentation-lockstep.md:1)
- `fast-redact` npm package: [https://www.npmjs.com/package/fast-redact](https://www.npmjs.com/package/fast-redact)
- Upstream `fast-redact` README: [https://raw.githubusercontent.com/davidmarkclements/fast-redact/master/readme.md](https://raw.githubusercontent.com/davidmarkclements/fast-redact/master/readme.md)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/migration/fast-redact-migration.test.ts --reporter=verbose` failed as expected on missing `scripts/fast-redact-migration.ts`.
- Focused migration contract: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/migration/fast-redact-migration.test.ts --reporter=verbose` passed with 8 tests.
- Generated-file verification: `source .agents/initialise-env.sh && pnpm run verify-generated-files` passed.
- Explicit migration verifier: `source .agents/initialise-env.sh && pnpm run verify:migration:fast-redact` passed and verified 16 rows.
- Lint and type-check: `source .agents/initialise-env.sh && pnpm run lint` passed.
- Contract suite: `source .agents/initialise-env.sh && pnpm run test:contract` passed with 410 tests.
- Full package gate: `source .agents/initialise-env.sh && pnpm run test` passed with 410 tests after build.

### Completion Notes List

- Added the canonical `fast-redact` migration manifest at `test/migration/fast-redact/matrix.json` with strict row fields, declared classifications, declared assertion modes, and 16 admitted rows.
- Added committed fixture directories for direct equivalents, mechanical rewrites, and intentional divergences, including helper IDs for function censor and custom serialiser scenarios.
- Added `scripts/fast-redact-migration.ts` plus generator and verifier entrypoints to validate schema, confine fixture paths, compare local `fast-redact@3.5.0` with Deep Redact v4, and render the public guide.
- Added generated public documentation at `docs/migration/from-fast-redact.md` and wired it into generated-file verification.
- Added contract coverage for manifest shape, fixture confinement, row coverage, comparator execution, guide lockstep, unsupported `serialize` and `strict` aliases, and absence of restore-like redactor methods.
- Wired `verify:migration:fast-redact` into `package.json` and the npm publish workflow before publish.
- Kept Deep Redact v3 migration, worked examples, benchmark evidence, and platform-adoption guidance deferred to their later work; no runtime `restore`, `unredact`, `strict`, mutation compatibility, or public `serialize` alias was added.

### File List

- `.github/workflows/npmPublish.yml`
- `_bmad-output/implementation-artifacts/5-4-publish-a-verified-fast-redact-migration-matrix-for-documented-scenarios.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/migration/from-fast-redact.md`
- `package.json`
- `scripts/fast-redact-migration.ts`
- `scripts/generate-fast-redact-migration-doc.ts`
- `scripts/generated-files.ts`
- `scripts/verify-fast-redact-migration.ts`
- `scripts/verify-generated-files.ts`
- `test/contract/migration/fast-redact-migration.test.ts`
- `test/migration/fast-redact/matrix.json`
- `test/migration/fast-redact/fixtures/bracket-array-wildcard-rewrite/expected-v4.json`
- `test/migration/fast-redact/fixtures/bracket-array-wildcard-rewrite/input.json`
- `test/migration/fast-redact/fixtures/bracket-array-wildcard-rewrite/notes.md`
- `test/migration/fast-redact/fixtures/bracket-quoted-property-path/expected-v4.json`
- `test/migration/fast-redact/fixtures/bracket-quoted-property-path/input.json`
- `test/migration/fast-redact/fixtures/bracket-quoted-property-path/notes.md`
- `test/migration/fast-redact/fixtures/custom-serialize-function-rewrite/expected-v4.txt`
- `test/migration/fast-redact/fixtures/custom-serialize-function-rewrite/input.json`
- `test/migration/fast-redact/fixtures/custom-serialize-function-rewrite/notes.md`
- `test/migration/fast-redact/fixtures/default-json-output-serialise-true/expected-v4.txt`
- `test/migration/fast-redact/fixtures/default-json-output-serialise-true/input.json`
- `test/migration/fast-redact/fixtures/default-json-output-serialise-true/notes.md`
- `test/migration/fast-redact/fixtures/dot-path-structured-output/expected-v4.json`
- `test/migration/fast-redact/fixtures/dot-path-structured-output/input.json`
- `test/migration/fast-redact/fixtures/dot-path-structured-output/notes.md`
- `test/migration/fast-redact/fixtures/final-wildcard-path/expected-v4.json`
- `test/migration/fast-redact/fixtures/final-wildcard-path/input.json`
- `test/migration/fast-redact/fixtures/final-wildcard-path/notes.md`
- `test/migration/fast-redact/fixtures/function-censor-helper/expected-v4.json`
- `test/migration/fast-redact/fixtures/function-censor-helper/input.json`
- `test/migration/fast-redact/fixtures/function-censor-helper/notes.md`
- `test/migration/fast-redact/fixtures/intermediate-wildcard-path/expected-v4.json`
- `test/migration/fast-redact/fixtures/intermediate-wildcard-path/input.json`
- `test/migration/fast-redact/fixtures/intermediate-wildcard-path/notes.md`
- `test/migration/fast-redact/fixtures/literal-string-censor/expected-v4.json`
- `test/migration/fast-redact/fixtures/literal-string-censor/input.json`
- `test/migration/fast-redact/fixtures/literal-string-censor/notes.md`
- `test/migration/fast-redact/fixtures/no-restore-api/divergence.json`
- `test/migration/fast-redact/fixtures/no-restore-api/input.json`
- `test/migration/fast-redact/fixtures/no-restore-api/notes.md`
- `test/migration/fast-redact/fixtures/no-strict-option/divergence.json`
- `test/migration/fast-redact/fixtures/no-strict-option/input.json`
- `test/migration/fast-redact/fixtures/no-strict-option/notes.md`
- `test/migration/fast-redact/fixtures/non-string-censor-value/divergence.json`
- `test/migration/fast-redact/fixtures/non-string-censor-value/input.json`
- `test/migration/fast-redact/fixtures/non-string-censor-value/notes.md`
- `test/migration/fast-redact/fixtures/numeric-array-index-path/expected-v4.json`
- `test/migration/fast-redact/fixtures/numeric-array-index-path/input.json`
- `test/migration/fast-redact/fixtures/numeric-array-index-path/notes.md`
- `test/migration/fast-redact/fixtures/omitted-serialise-structured-output/divergence.json`
- `test/migration/fast-redact/fixtures/omitted-serialise-structured-output/input.json`
- `test/migration/fast-redact/fixtures/omitted-serialise-structured-output/notes.md`
- `test/migration/fast-redact/fixtures/remove-true-rewrite/expected-v4.txt`
- `test/migration/fast-redact/fixtures/remove-true-rewrite/input.json`
- `test/migration/fast-redact/fixtures/remove-true-rewrite/notes.md`
- `test/migration/fast-redact/fixtures/serialize-false-spelling-rewrite/expected-v4.json`
- `test/migration/fast-redact/fixtures/serialize-false-spelling-rewrite/input.json`
- `test/migration/fast-redact/fixtures/serialize-false-spelling-rewrite/notes.md`

### Change Log

- 2026-05-22: Published verified `fast-redact` migration matrix, fixtures, generated guide, contract tests, generated-file wiring, package verifier, and release workflow gate.
