# Story 5.1: Define the Canonical Installation Verification Matrix and Baseline Fixtures

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one canonical installation-verification manifest and fixture set for the supported package ecosystems,
so that later verification stories execute against one stable source of truth rather than hand-maintained release steps.

## Acceptance Criteria

1. Given the installation verification source of truth, when it is reviewed, then it is defined by one canonical manifest at `test/compatibility/install/matrix.json`.
2. Given the canonical install matrix manifest, when it is inspected, then it defines exactly these named verification rows: `npm-node22`, `npm-node24`, `pnpm-node22`, `pnpm-node24`, `yarn-node22`, `yarn-node24`, `bun-node22`, `bun-node24`, and `deno-2`.
3. Given a row in the canonical install matrix manifest, when it is inspected, then it records the fixture directory, runtime version, install command, run command, expected stdout file, and expected exit status for that row.
4. Given any row in the canonical install matrix manifest, when its baseline smoke fixture is executed, then it uses the public factory entrypoint `deepRedact(...)`, initialises a redactor with `paths: ['user.password', 'token']`, redacts `{ user: { password: 'secret' }, token: 'abc123', ok: true }`, and writes `{"user":{"password":"[REDACTED]"},"token":"[REDACTED]","ok":true}` to stdout in stable JSON form.
5. Given this story's scope, when the implementation is reviewed, then executable verification across the Node package-manager rows remains deferred to Story `5.2`.
6. Given this story's scope, when the implementation is reviewed, then Deno verification and installation-documentation lockstep remain deferred to Story `5.3`.
7. Given this story's scope, when the implementation is reviewed, then migration, worked examples, benchmarks, and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Add the canonical install matrix manifest (AC: 1, 2, 3)
  - [x] Create `test/compatibility/install/matrix.json` as the only source of truth for installation verification rows.
  - [x] Use a strict, predictable shape such as `{ "schemaVersion": 1, "rows": [...] }`; do not split row definitions across package-manager-specific files.
  - [x] Store row commands as argument arrays, not shell strings, so later verifiers can execute them with `execFile`/`spawn` without shell parsing.
  - [x] Define exactly the row IDs from AC2 and preserve that order in the manifest.
  - [x] For each row, include these required fields: `id`, `fixtureDir`, `runtimeVersion`, `installCommand`, `runCommand`, `expectedStdoutFile`, and `expectedExitStatus`.
  - [x] Include package-manager/runtime metadata if it helps later stories, but keep the AC-required field names present and unambiguous.
  - [x] Keep manifest paths repository-relative: the manifest lives under `test/compatibility/install/`, fixture directories live under `test/fixtures/compatibility/install/`, and committed stdout baselines live under `test/artefacts/install-matrix/`; do not point at `dist/` or temporary directories as source data.

- [x] Define command-token conventions for later execution stories (AC: 3, 5, 6)
  - [x] Use tokenised package inputs for unpublished release artefacts, for example `{packageTarball}`, `{packageTarballUrl}`, or `{denoPackageSpecifier}`, and document the token meaning in manifest metadata so `matrix.json` remains the source of truth.
  - [x] Node package-manager rows should represent clean-fixture installation from the package artefact that Story `5.2` will build or pack, not from the repository symlink pattern used by existing consumer tests.
  - [x] Use exact Node runtime versions that align with the current support contract: `node@22.18.0` rows for the package engine floor and `node@24.14.1` rows for the contributor/LTS baseline.
  - [x] Keep the `deno-2` row present but non-executed in this story; record `runtimeVersion: "deno@2"` plus static `installCommand` and `runCommand` arrays for the later verifier.
  - [x] Use the explicit Deno import convention: `smoke.ts` imports `deepRedact` from the bare package specifier `@hackylabs/deep-redact`, and the Deno fixture's `deno.json` maps that bare specifier to `{denoPackageSpecifier}`. Define `{denoPackageSpecifier}` in manifest metadata as the Story `5.3` verifier-provided Deno-compatible package specifier, expected to resolve to the public npm package form such as `npm:@hackylabs/deep-redact@{packageVersion}` once documentation lockstep is finalised.
  - [x] Do not add Node `26`, browser, migration, benchmark, or worked-example rows in this story.

- [x] Add baseline installation fixtures (AC: 3, 4)
  - [x] Create one shared Node baseline fixture directory, for example `test/fixtures/compatibility/install/node-baseline/`, unless implementation needs separate ESM/CommonJS fixtures.
  - [x] Add a minimal fixture `package.json` for the Node fixture with `"type": "module"` and no direct dependency on `@hackylabs/deep-redact`; the install command row should add the package artefact later.
  - [x] Add a Node smoke entrypoint, for example `smoke.mjs`, that imports `deepRedact` from `@hackylabs/deep-redact`, initialises `deepRedact({ paths: ['user.password', 'token'] })`, redacts the canonical payload, and writes stable JSON to stdout.
  - [x] Create a Deno baseline fixture directory, for example `test/fixtures/compatibility/install/deno-baseline/`, with the same semantic smoke entrypoint shape using the public `deepRedact` factory.
  - [x] Add `test/fixtures/compatibility/install/deno-baseline/deno.json` with an `imports` entry that maps `@hackylabs/deep-redact` to `{denoPackageSpecifier}`; avoid solving documentation lockstep or executing the Deno row in this story.
  - [x] Keep all fixture code small and product-like; do not import from `src/`, `dist/`, test helpers, or private package subpaths.

- [x] Add the canonical expected stdout artefact (AC: 3, 4)
  - [x] Add the expected stdout file under a stable committed-baseline path, for example `test/artefacts/install-matrix/expected/baseline-structured.stdout`.
  - [x] Store exactly the canonical structured redaction output, with the same trailing-newline convention used by the smoke fixture.
  - [x] Ensure every manifest row points to the same expected stdout file unless an execution environment genuinely requires a different line-ending convention.
  - [x] Do not place committed expected stdout baselines under `dist/`, `coverage/`, or transient temporary directories.

- [x] Add static contract coverage for the manifest and fixtures (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Add a contract test under `test/contract/compatibility/install-matrix.test.ts` so it runs through the existing `pnpm run test:contract` include pattern.
  - [x] Validate that `matrix.json` parses as JSON, has `schemaVersion: 1`, and has no extra or missing row IDs.
  - [x] Validate each row has the AC-required fields with the expected primitive/array types, non-empty command arrays, and `expectedExitStatus: 0`.
  - [x] Validate each `fixtureDir` and `expectedStdoutFile` exists and stays within the allowed repository test paths: fixture directories under `test/fixtures/compatibility/install/`, expected stdout under `test/artefacts/install-matrix/`, and the manifest under `test/compatibility/install/`.
  - [x] Validate the Node rows use the Node baseline fixture and the Deno row uses the Deno baseline fixture.
  - [x] Validate the Deno fixture uses the bare package import in `smoke.ts` and the `deno.json` import map entry points `@hackylabs/deep-redact` to `{denoPackageSpecifier}`.
  - [x] Validate the smoke fixture source references the public `deepRedact` import, the exact path list `['user.password', 'token']`, and the canonical payload fields.
  - [x] Validate the expected stdout file content matches `{"user":{"password":"[REDACTED]"},"token":"[REDACTED]","ok":true}` plus the fixture's chosen newline convention.
  - [x] Assert this story does not introduce package-manager execution, Deno execution, generated public documentation, migration matrices, example manifests, or benchmark artefacts.

- [x] Keep generated artefacts and public documentation out of scope (AC: 5, 6, 7)
  - [x] Do not hand-edit `README.md` or generated package metadata for installation claims.
  - [x] Do not add installation guide content under `docs/`; Story `5.3` owns documentation lockstep.
  - [x] Do not add release workflows that execute the matrix yet; Story `5.2` owns Node package-manager execution and Story `5.3` owns Deno execution.
  - [x] If a helper script such as `scripts/verify-install-matrix.ts` is introduced, keep it static-only in this story and do not make it run package-manager commands.

- [x] Verify the story implementation (AC: 1-7)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if implementation touches package exports, build output, generated files, or shared TypeScript configuration.
  - [x] Record any intentionally deferred execution proof in the Dev Agent Record rather than widening this story.

## Dev Notes

### Story Intent

- This story starts Epic `5` by creating the immutable source data for installation verification, not by executing the full release matrix.
- The key deliverable is `test/compatibility/install/matrix.json` plus baseline fixtures and expected stdout files that later verification stories can consume.
- The matrix must prove scope discipline: it defines the `npm`, `pnpm`, `yarn`, `bun`, and `deno` rows now, while deferring Node package-manager execution to Story `5.2` and Deno execution/documentation lockstep to Story `5.3`.
- The baseline smoke fixture must exercise the public package entrypoint exactly as a consumer would. It must not import internal source paths, built files by relative path, or test-only helpers.

### Current Runtime Intelligence

- The published root package name is `@hackylabs/deep-redact`, and the package is ESM with dual-format build outputs declared through `main`, `module`, `types`, and `exports`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:2)]
- The package engine floor is currently Node `>=22.18.0`, and the contributor baseline is Node `24.14.1` with `pnpm@10.33.0`. The install matrix should record `node@22.18.0` and `node@24.14.1`, not loose major-only values or an ambient local Node version. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10)]
- The default contract test command runs `test/build.test.ts` and `test/contract/**/*.test.ts`; a static matrix contract test belongs under `test/contract/compatibility/` unless the test config is deliberately expanded. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:73)]
- Existing consumer-fixture tests use a repository symlink into `node_modules`; this is useful for package-surface checks but is not enough for release installation verification from a packed artefact. [Source: [test/contract/support/package-fixture.ts](/Users/ben.green/Code/deep-redact/test/contract/support/package-fixture.ts:14)]
- Current ESM consumer fixtures already demonstrate the public import style `import * as packageSurface from '@hackylabs/deep-redact'` and use `packageSurface.deepRedact(...)`. The install smoke fixture should use the public import even if it is much smaller. [Source: [test/fixtures/consumers/esm/index.mjs](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/esm/index.mjs:1)]
- Generated package metadata is produced from `scripts/generated-files.ts`; do not hand-edit generated export-map content for this story. [Source: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:36)]
- `vitest.config.ts` does not currently include `test/compatibility/**/*.test.ts`, so placing executable/static tests directly under `test/compatibility/` will not run under the default contract gate without config changes. [Source: [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts:7)]

### Architecture Compliance

- Release verification must cover Node `22` and `24`, Deno `2.x`, install smoke tests across `npm`, `pnpm`, `yarn`, and `bun`, and browser-safe smoke coverage for the core build. Story `5.1` covers the source data for the install rows only. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:370)]
- Tests belong under `test/`, scripts under `scripts/`, and generated outputs must not be treated as primary source data. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:475)]
- The architecture separates compatibility coverage from migration coverage; do not place this install matrix under `test/migration/`. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:966)]
- The architecture already names `scripts/verify-install-matrix.ts` and `test/compatibility/` as release-verification homes, but this story should keep any script static-only if introduced. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:879)]
- Compatibility manifests belong under `test/compatibility/`, fixtures under `test/fixtures/`, and committed verification baselines under `test/artefacts/`; `dist/` remains disposable build output. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:970)]

### Library and Framework Requirements

- Use the live pinned repository baseline: Node `24.14.1`, `pnpm@10.33.0`, TypeScript `6.0.2`, Vitest `4.1.4`, `tsdown@0.21.7`, and ESLint `9.39.4`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10)]
- Every Node, package-manager, build, lint, test, generation, benchmark, or release command must be prefixed with `source .agents/initialise-env.sh` from the repository root. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:18)]
- Keep the package zero-runtime-dependency; current dependencies are development-only and this story should not add a runtime package to validate JSON. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:77)]
- The root package facade exports `deepRedact` and `createRedactor`; fixture code should use `deepRedact(...)` because the story explicitly requires the public factory entrypoint. [Source: [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts:33)]
- TypeScript can import JSON because `resolveJsonModule` is enabled, but a contract test can also read and parse `matrix.json` through `node:fs` to avoid widening tsconfig includes. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:10)]

### Manifest Contract Guidance

Recommended row shape:

```json
{
  "id": "npm-node22",
  "fixtureDir": "test/fixtures/compatibility/install/node-baseline",
  "runtimeVersion": "node@22.18.0",
  "installCommand": ["npm", "install", "{packageTarball}"],
  "runCommand": ["node", "smoke.mjs"],
  "expectedStdoutFile": "test/artefacts/install-matrix/expected/baseline-structured.stdout",
  "expectedExitStatus": 0
}
```

- Use exact `runtimeVersion` values for Node rows: `node@22.18.0` for the engine-floor rows and `node@24.14.1` for the contributor-baseline rows. Use `deno@2` for the non-executed Deno row because Story `5.3` owns the exact Deno `2.x` runner selection.
- Use one shared Node fixture directory for all eight Node rows unless separate package-manager fixture files are genuinely needed.
- Suggested install command patterns:
  - `npm-node*`: `["npm", "install", "{packageTarball}"]`
  - `pnpm-node*`: `["pnpm", "add", "{packageTarball}"]`
  - `yarn-node*`: `["yarn", "add", "@hackylabs/deep-redact@file:{packageTarball}"]`
  - `bun-node*`: use an explicit package artefact token, for example `["bun", "add", "@hackylabs/deep-redact@{packageTarballUrl}"]`, and leave final URL/path expansion to Story `5.2`.
  - `deno-2`: use `fixtureDir: "test/fixtures/compatibility/install/deno-baseline"`, `installCommand: ["deno", "install", "--entrypoint", "smoke.ts"]`, and `runCommand: ["deno", "run", "smoke.ts"]`. Keep this row static and non-executed in Story `5.1`.
- The Deno fixture must use a bare import in `smoke.ts`, for example `import { deepRedact } from '@hackylabs/deep-redact'`, with `deno.json` mapping `"@hackylabs/deep-redact"` to `{denoPackageSpecifier}`. Do not choose an inline `npm:` import in `smoke.ts`; the import-map token keeps Story `5.3` responsible for final package-version and documentation lockstep.
- Document all command tokens in manifest metadata:
  - `{packageTarball}` means the packed `.tgz` produced from the current repository build.
  - `{packageTarballUrl}` means a verifier-provided URL form of the same packed artefact.
  - `{denoPackageSpecifier}` means the Story `5.3` verifier-provided Deno-compatible package specifier for the public package, expected to use an `npm:` form such as `npm:@hackylabs/deep-redact@{packageVersion}`.

### File Structure Requirements

Expected new source/test data:

- `test/compatibility/install/matrix.json`
- `test/fixtures/compatibility/install/node-baseline/package.json`
- `test/fixtures/compatibility/install/node-baseline/smoke.mjs`
- `test/fixtures/compatibility/install/deno-baseline/smoke.ts`
- `test/fixtures/compatibility/install/deno-baseline/deno.json`
- `test/artefacts/install-matrix/expected/baseline-structured.stdout`
- `test/contract/compatibility/install-matrix.test.ts`

Conditional files only if implementation finds them useful:

- `scripts/verify-install-matrix.ts`, static-only in this story
- `test/artefacts/install-matrix/README.md` only if the distinction between source fixtures and later emitted verification artefacts needs documenting

Avoid:

- `docs/` installation guide updates in this story
- `README.md` manual edits
- `dist/` source-data references
- `test/migration/` paths for install verification
- package-manager execution scripts or CI workflows that belong to Story `5.2`

### Testing Requirements

- Prefer a static contract test that proves the manifest and fixture source are complete and future-verifier-ready.
- Do not execute `npm`, `pnpm`, `yarn`, `bun`, or `deno` in this story's tests. Execution would claim support before the dedicated verification stories prove it.
- Assert exact row IDs and reject extra rows so future support claims cannot drift silently.
- Assert command arrays are not empty and contain only strings; this prevents later verifiers from inheriting shell-dependent command fragments.
- Assert all row paths are relative, normalised, and remain under allowed test-data directories.
- Assert expected stdout uses the same line-ending convention as the fixture. If the fixture uses `console.log`, the expected file should include a single trailing LF; if it uses `process.stdout.write`, the expected file should omit it and the test should enforce that intentionally.
- Run `pnpm run test:contract` and `pnpm run lint` through the environment bootstrap after implementation.

### Previous Story Intelligence

- Story `4.6` established the pattern of keeping public package surfaces explicit and tested through contract fixtures; follow that discipline for install fixtures instead of adding private imports or generated metadata edits. [Source: [_bmad-output/implementation-artifacts/4-6-provide-optional-console-redaction-through-an-explicit-guarded-adapter.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-6-provide-optional-console-redaction-through-an-explicit-guarded-adapter.md:135)]
- Story `4.6` also showed that package export, consumer fixture, and declaration checks are easy to break together; this story should keep install fixtures isolated from package-surface changes unless a real package issue is discovered. [Source: [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts:18)]
- Story `4.5` and `4.6` reinforced a source-of-truth pattern: generated artefacts are validated from maintained source data, not edited as primary outputs. Apply the same approach to `matrix.json` and expected stdout.
- Recent commits show the last Epic `4` work has been contract-test-led and source-of-truth focused: `75afb1b` added the optional console adapter, `83a1c02` enforced the one-way deny list, and `e416d91` published the precedence matrix.

### Latest Technical Information

- Checked on 22 May 2026 against the live repository baseline and current official docs.
- npm documents installation from a filesystem tarball via `npm install <tarball file>`, with `.tar`, `.tar.gz`, or `.tgz` extensions and package contents containing a `package.json` with `name` and `version`. This supports an unpublished package-tarball token for npm rows. [Source: [npm install docs](https://docs.npmjs.com/cli-documentation/install/)]
- pnpm documents local filesystem installs from tarballs or directories, including `pnpm add ./package.tar.gz`; this supports the same tarball-token approach for pnpm rows. [Source: [pnpm package sources](https://pnpm.io/package-sources)]
- Yarn documents adding a local gzipped tarball with the `file:` protocol, for example `yarn add local-package-name@file:../path/to/local-package-name-v0.1.2.tgz`; use that package-specifier shape for Yarn rows. [Source: [Yarn add](https://yarnpkg.com/cli/add)]
- Bun documents `bun add` for adding dependencies and tarball dependencies through package specifiers. If local file tarball semantics are not proven during Story `5.2`, prefer a verifier-expanded `{packageTarballUrl}` token instead of hard-coding undocumented local path behaviour. [Source: [Bun add](https://bun.com/docs/pm/cli/add)]
- Deno documents first-class `npm:` specifier support and states no `npm install` is necessary before `deno run` for npm imports. Deno also documents `deno install --entrypoint` for installing dependencies from an entrypoint. Story `5.3` should finalise the exact Deno install/run flow from these primitives. [Source: [Deno Node/npm compatibility](https://docs.deno.com/runtime/fundamentals/node/), [Deno install](https://docs.deno.com/runtime/reference/cli/install/)]
- Node's current package docs still emphasise explicit package entrypoints through `exports`; the install smoke fixtures should import only the public root package path, not deep implementation files. [Source: [Node package docs](https://nodejs.org/api/packages.html)]
- No dependency upgrade is required for this story. Do not chase latest Node, package-manager, or Deno versions beyond the support matrix already captured in the planning artefacts.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:5)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:32)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:38)]

### Project Structure Notes

- `test/compatibility/` does not currently exist in the live repository. Creating `test/compatibility/install/` is expected and aligns with the architecture.
- Existing consumer fixtures under `test/fixtures/consumers/` are package-surface fixtures, not release install fixtures. Reuse ideas, not the symlink approach; place the new install fixtures under `test/fixtures/compatibility/install/`.
- `test/artefacts/` does not currently exist in the live repository. Creating `test/artefacts/install-matrix/expected/` for the committed stdout baseline is expected and keeps generated or transient outputs separate from maintained source data.
- `README.md` currently describes broad current status and is generated from `scripts/templates/README.md.template`; leave install documentation claims for Story `5.3`.
- The live repository already has `src/adapters/console/` from Story `4.6`; this story should not alter adapter boundaries.

### Open Questions / Assumptions

- Assume `matrix.json` should be committed JSON rather than TypeScript so non-Node release tooling can consume it later.
- Assume command arrays are the correct manifest representation because they avoid shell quoting and allow deterministic execution through `execFile`.
- Assume `{packageTarball}` means the packed `.tgz` produced from the current repository build, `{packageTarballUrl}` means a verifier-provided URL form of that same artefact, and `{denoPackageSpecifier}` means the Story `5.3` verifier-provided Deno-compatible public package specifier.
- Assume static manifest validation is in scope, while actual installation execution is out of scope until Story `5.2` and Story `5.3`.
- Assume the expected stdout file may include one trailing newline if the smoke fixture uses `console.log`; whichever convention is chosen must be locked by test.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1304)
- Story `5.2` dependency: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1349)
- Story `5.3` dependency: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1378)
- FR34: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:440)
- NFR installation verification: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:479)
- Release verification architecture: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:370)
- Compatibility structure: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:734)
- Package metadata: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)
- Existing consumer fixture helper: [test/contract/support/package-fixture.ts](/Users/ben.green/Code/deep-redact/test/contract/support/package-fixture.ts:1)
- Vitest include pattern: [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts:7)
- Project context: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)
- npm install docs: [https://docs.npmjs.com/cli-documentation/install/](https://docs.npmjs.com/cli-documentation/install/)
- pnpm package sources: [https://pnpm.io/package-sources](https://pnpm.io/package-sources)
- Yarn add docs: [https://yarnpkg.com/cli/add](https://yarnpkg.com/cli/add)
- Bun add docs: [https://bun.com/docs/pm/cli/add](https://bun.com/docs/pm/cli/add)
- Deno Node/npm compatibility: [https://docs.deno.com/runtime/fundamentals/node/](https://docs.deno.com/runtime/fundamentals/node/)
- Deno install docs: [https://docs.deno.com/runtime/reference/cli/install/](https://docs.deno.com/runtime/reference/cli/install/)
- Node package docs: [https://nodejs.org/api/packages.html](https://nodejs.org/api/packages.html)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `source .agents/initialise-env.sh && pnpm run test:contract` failed as expected while `matrix.json`, fixtures, and the expected stdout baseline were absent.
- Green phase: `source .agents/initialise-env.sh && pnpm run test:contract` passed after adding the matrix, fixtures, baseline, and static contract tests.
- Quality gates: `source .agents/initialise-env.sh && pnpm run lint` passed.
- Regression gate: `source .agents/initialise-env.sh && pnpm run test` passed.

### Completion Notes List

- Added `test/compatibility/install/matrix.json` as the canonical install verification manifest with `schemaVersion: 1`, the exact nine required row IDs in order, repository-relative paths, argument-array commands, expected exit statuses, and package-manager/runtime metadata.
- Documented command-token conventions for `{packageTarball}`, `{packageTarballUrl}`, and `{denoPackageSpecifier}` in manifest metadata, with static deferred-phase metadata for package-manager execution, Deno verification/documentation lockstep, and later release guidance.
- Added shared Node and Deno baseline fixtures that use the public `deepRedact(...)` entrypoint with `paths: ['user.password', 'token']` and the canonical smoke payload.
- Added the committed expected stdout baseline with a single trailing newline matching the fixture `console.log` convention.
- Added static contract coverage for manifest shape, row ordering, command arrays, repository-relative paths, fixture source, Deno import-map behaviour, expected stdout, and scope discipline.
- Kept executable package-manager/Deno verification, installation documentation, migration guidance, examples, benchmark artefacts, and release workflows out of scope.

### File List

- `_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `test/artefacts/install-matrix/expected/baseline-structured.stdout`
- `test/compatibility/install/matrix.json`
- `test/contract/compatibility/install-matrix.test.ts`
- `test/fixtures/compatibility/install/deno-baseline/deno.json`
- `test/fixtures/compatibility/install/deno-baseline/smoke.ts`
- `test/fixtures/compatibility/install/node-baseline/package.json`
- `test/fixtures/compatibility/install/node-baseline/smoke.mjs`

### Change Log

- 2026-05-22: Added the canonical installation verification matrix, baseline fixtures, expected stdout baseline, and static contract coverage; moved story to review.
