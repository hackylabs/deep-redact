# Story 1.1: Establish the Scratch v4 Foundation and Brownfield Transplant Scaffold

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Deep Redact maintainer,
I want to generate the mandated scratch v4 foundation and transplant only the approved package conventions into the existing repository,
so that the rewrite starts from the selected architecture baseline without replacing the current red-phase tests and fixtures.

## Acceptance Criteria

1. Given the approved v4 architecture selects `create-tsdown` `minimal` as the starter workflow, when Story `1.1` begins, then a scratch package foundation is generated with `pnpm create tsdown@latest deep-redact-v4 --template minimal`, and that scratch output is treated as the reference source for the brownfield transplant.
2. Given the scratch starter output and the current repository, when the v4 foundation is merged, then only the chosen build, lint, test, packaging, and generated-artefact conventions are transplanted into the existing repository, and the current test suite and fixtures remain in place, and no existing coverage is deleted or disabled through a wholesale scaffold replacement.
3. Given the new package foundation, when contributor tooling metadata is defined, then the repository declares `Node 24.14.1`, `pnpm`, `tsdown`, `Vitest`, and `xo` as the contributor baseline, and the exact scaffold-selected `pnpm` version is pinned through the `packageManager` field for consistent Corepack-managed local and CI use.
4. Given the v4 package configuration, when the package is prepared for development and publishing, then the source is treated as ESM during development, the build is configured to emit ESM, CommonJS, and type declarations, and the core package scaffold remains browser-safe where practical without introducing Node-specific helpers into the primary entrypoint.
5. Given the new public API shape, when the entrypoint scaffold is generated, then `deepRedact` is exposed as the primary public factory, `createRedactor` is exposed as a named alias through generated export metadata rather than hand-maintained export maps, and the generated root package surface does not continue advertising the legacy `DeepRedact` class or deep source-path exports as primary public APIs.
6. Given the repository automation requirements, when the foundation is complete, then documented scripts exist and run for build, lint, test, generated exports, and generated README workflows.
7. Given the built package artefacts, when the package is consumed from clean fixtures using both `import` and `require`, then the entrypoint resolves successfully, and both `deepRedact` and `createRedactor` are available as documented exports, and type declarations are available to consumers.
8. Given the transplanted scaffold is reviewed, when brownfield-safety is assessed, then the selected starter conventions are documented as having come from the scratch template workflow, and any retained repository-specific files outside that workflow are deliberate and justified.
9. Given this is a foundation-only story driven by the starter workflow, when the story is reviewed, then no redaction algorithm, transformation logic, or policy behaviour is implemented beyond the minimum compile-safe scaffolding needed to validate the package surface.

## Tasks / Subtasks

- [x] Generate the scratch reference scaffold outside the existing repository (AC: 1, 8)
  - [x] Run `pnpm create tsdown@latest deep-redact-v4 --template minimal` in a temporary sibling or scratch directory, not over the current repo.
  - [x] Capture the generated dependency versions, config files, scripts, and file layout that will be transplanted.
  - [x] Record which template conventions are adopted unchanged, which are adapted, and which are intentionally rejected for Deep Redact.

- [x] Establish the contributor and package baseline in the brownfield repo (AC: 2, 3, 4, 6, 8)
  - [x] Move the contributor baseline from the current `.nvmrc` value `22` to `24.14.1`.
  - [x] Switch the repo from the current npm-first setup to `pnpm` with a `packageManager` field, a committed `pnpm-lock.yaml`, and the exact scaffold-selected `pnpm` version pinned for Corepack-managed local and CI use.
  - [x] Remove or replace npm-only defaults that conflict with the new baseline, including the current `.npmrc` `package-lock=true` setting and the committed `package-lock.json`, but do so deliberately and document the change.
  - [x] Audit all retained and newly introduced dependencies, both runtime and development, and pin each one to the exact latest version unless it is explicitly planned for removal in this story.
  - [x] If the exact latest version of any retained dependency is incompatible with the chosen stack, stop and re-think the dependency choice or foundation approach rather than silently pinning an older version.
  - [x] Update release or CI workflows that still assume `npm ci` or npm-first script execution so automation matches the new contributor baseline.
  - [x] Replace the current dual-`tsc` build plumbing and Airbnb ESLint stack with the selected `tsdown` and `xo` baseline while preserving equivalent build, lint, and test entrypoints.
  - [x] Make the repository itself ESM, while keeping published artefacts dual-format with ESM, CommonJS, and declarations, without making the core package Node-only.

- [x] Preserve and modernise generated artefact workflows (AC: 5, 6, 8)
  - [x] Keep exports and README generation source-driven, deterministic, and reviewable; do not hand-maintain the `package.json` export map or `README.md`.
  - [x] Replace the current `update-*` generated-artefact scripts with a `generate-*` workflow that aligns with the architecture naming and keeps README and export generation explicit and script-driven.
  - [x] Add a dedicated `scripts/verify-generated-files.ts` check so generated exports and generated README verification run consistently in CI and locally.
  - [x] Decide whether to use `tsdown` auto-generated exports directly or behind the local verification layer, while keeping the final workflow deterministic and reviewable.

- [x] Create only the minimum compile-safe v4 public surface (AC: 4, 5, 7, 9)
  - [x] Add a new `src/index.ts` public facade that exposes `deepRedact` as the primary factory and `createRedactor` as a named alias.
  - [x] Add only the minimal supporting files needed for the package surface and type declarations to compile under the new structure.
  - [x] Keep any placeholder implementation explicitly temporary and surface-only; do not implement path matching, traversal, replacement, transformers, diagnostics, or policy compilation in this story.
  - [x] Ensure generated exports point at the new public surface rather than the old v3 class-based layout.
  - [x] Ensure the generated root package surface exposes only the intended v4 factory facade for this story; do not accidentally retain `DeepRedact` or legacy deep source-path exports unless a documented migration bridge explicitly requires them.

- [x] Keep the current test and fixture estate intact as the red-phase safety harness (AC: 2, 6, 8, 9)
  - [x] Preserve the existing `test/` tree, benchmark artefacts, and fixture/setup files in place.
  - [x] Add new package-surface smoke tests for `import` and `require` under `test/contract/exports/`, and type-resolution checks under `test/contract/types/`, without deleting existing coverage.
  - [x] If legacy runtime tests remain red because the v4 runtime is not implemented yet, preserve them as retained contract pressure rather than deleting, muting, or silently skipping them.

- [x] Verify package consumption and baseline scripts (AC: 6, 7)
  - [x] Confirm build, lint, test, generated exports, and generated README scripts all exist and run under the new baseline.
  - [x] Validate that clean fixture consumers can resolve both `import` and `require` entrypoints.
  - [x] Validate that declaration files are emitted and discoverable for consumers.
  - [x] Keep benchmark wiring compatible with `vitest bench` and JSON output for later benchmark stories.

- [x] Document transplant provenance and deliberate brownfield deviations (AC: 2, 8)
  - [x] Leave an implementation note, ADR-style note, or equivalent repo documentation describing which files came from the scratch template and which repository-specific files were intentionally retained.
  - [x] Explicitly justify any retained legacy files that survive Story `1.1`.

### Review Findings

- [x] [Review][Patch] Repair CommonJS declaration output and add CommonJS consumer type coverage [tsdown.config.ts:1]
- [x] [Review][Patch] Verify generated artefacts before build output is produced [package.json:56]
- [x] [Review][Patch] Restore lint and contract-test publish gates [.github/workflows/npmPublish.yml:18]

## Dev Notes

### Story Intent

- This story establishes the v4 package and tooling foundation only.
- The output of the scratch `create-tsdown` scaffold is the reference input, but the existing repository remains the destination of record.
- This story must stop at compile-safe package-surface scaffolding. Runtime behaviour belongs to later stories after the API, validation, grammar, precedence, diagnostics, and traversal decisions are implemented in sequence.

### Technical Requirements

- Contributor baseline: Node `24.14.1`, `pnpm`, `tsdown`, `Vitest`, and `xo`.
- Contributor package management: pin the scaffold-selected `pnpm` version through the `packageManager` field so Corepack-managed local and CI use stays aligned.
- Dependency policy: all retained or newly introduced runtime and development dependencies, excluding packages deliberately removed as part of the v4 foundation move, must be pinned to the exact latest available version.
- Package shape: repository itself is ESM; published output remains ESM, CommonJS, and `.d.ts`.
- Public API direction: function-first `deepRedact(options)` primary factory, with `createRedactor(options)` as an ergonomic alias.
- Generated artefacts remain mandatory: exports and README stay source-driven, deterministic, script-generated, and verified through a dedicated generated-files check.
- The core package remains zero-runtime-dependency.
- The contributor baseline must not redefine the published support matrix; keep the core scaffold browser-safe where practical and keep Node-specific helpers out of the primary package surface.
- Existing tests remain as the initial red-phase contract suite rather than being replaced by scaffold defaults.

### Architecture Compliance

- `src/index.ts` is the only primary public package facade.
- `src/` contains production code only; all tests live under `test/`.
- New public exports must be introduced through source entrypoints and generation workflows, not by editing `package.json` exports by hand.
- Any future Node-specific integration remains adapter-only; do not place Node-only helpers in `src/index.ts` or the core scaffold for this story.
- British English is the default for project-owned names, comments, docs, and identifiers; American English spellings are allowed only for explicit compatibility aliases such as `serialize`.
- Keep optional integrations and future runtime domains out of scope for this story. Do not build out `src/core/runtime/`, `src/adapters/`, or transformer logic unless a file is genuinely required for compile-safe scaffolding.

### Current Brownfield Constraints

- The current repo is still npm-first:
  - `.nvmrc` is `22`.
  - `.npmrc` includes `package-lock=true`.
  - `package-lock.json` is committed.
  - `.github/workflows/npmPublish.yml` still uses `Node 22.x` with `npm ci`.
- The current toolchain is pre-v4:
  - `.eslintrc.json` uses the Airbnb stack.
  - `package.json` uses `tsc`-based `build:esm` and `build:cjs` scripts plus `scripts/js-to-mjs.sh`.
  - `package.json` currently hand-maintains a large `exports` map.
- Existing generated-artefact lineage to replace during the v4 foundation move:
  - `scripts/update-exports.ts`
  - `scripts/update-readme.ts`
  - `scripts/templates/README.txt`
- Recent git history is planning-only (`docs(BMAD): create PRD`, `create architecture`, `create epics and stories`), so there is no prior v4 implementation pattern to copy from commits yet.
- The current public API is class-based in [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts) and still exports `DeepRedact`; Story `1.1` is where the v4 function-first entrypoint scaffold starts replacing that shape.
- Current tests and fixtures that must remain present include:
  - [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts)
  - [test/unit/index.test.ts](/Users/ben.green/Code/deep-redact/test/unit/index.test.ts)
  - [test/load/redact.test.ts](/Users/ben.green/Code/deep-redact/test/load/redact.test.ts)
  - `test/setup/*`
- `test/build.test.ts` currently derives expectations from the large hand-maintained export map; Story `1.1` should reframe that check around the intended v4 public surface rather than preserve legacy export breadth by accident.
- `dist/` is disposable build output, but the source test and fixture estate is not.

### Library / Framework Requirements

- `tsdown`
  - Official docs say `tsdown` requires Node `20.19` or higher and deprecates Node versions below `22.18.0`.
  - Official docs provide starter templates through `create-tsdown`.
  - Official docs provide experimental auto-generation for `exports`, `main`, `module`, and `types`, with a warning to review generated fields before publishing.
- Node / Corepack / pnpm
  - Official Node docs say the `"packageManager"` field defines the expected package manager and is leveraged by Corepack.
  - Official Corepack docs say it can ensure the whole team uses the requested package-manager version and will resolve the version from the nearest `package.json`.
  - Official Node archive data shows `v24.14.1` as the latest LTS and lists npm `11.11.0` for that release.
- `Vitest`
  - Official docs support a dedicated `vitest.config.ts` using `defineConfig` from `vitest/config`.
  - Official benchmark config docs define `benchmark.outputJson`, which is the right direction for future benchmark stories.
- `xo`
  - Official XO docs state that XO requires the project to be ESM.
- Version selection rule for Story `1.1`: pin every retained or newly introduced dependency to the exact latest version available at implementation time; if the latest version creates an incompatibility, treat that as a signal to re-think the dependency choice or foundation plan rather than downgrading quietly.

### File Structure Requirements

- Align the foundation with the target architecture without over-building it.
- Required direction for this story:
  - root-level toolchain files: `package.json`, `pnpm-lock.yaml`, `tsdown.config.ts`, `xo.config.*`, `vitest.config.ts`
  - production source only under `src/`
  - tests only under `test/`
  - generation and verification scripts under `scripts/`, including `generate-*` workflows and `verify-generated-files.ts`
- The architecture’s longer-term target structure includes `src/core/`, `src/types/`, `src/transformers/`, `src/adapters/`, and `src/internal/`, but Story `1.1` should only create the minimum subset needed to validate the package surface.
- Avoid prematurely introducing deep runtime skeletons that imply implementation progress not yet delivered.

### Testing Requirements

- Add or update package-surface tests that prove:
  - ESM consumers can `import` the package.
  - CommonJS consumers can `require` the package.
  - `deepRedact` and `createRedactor` are present as documented exports.
  - Type declarations resolve for consumers.
- Place the new package-surface checks under the architecture-aligned contract locations:
  - `test/contract/exports/` for `import` and `require` entrypoint verification
  - `test/contract/types/` for consumer-facing declaration resolution checks
- Preserve the existing red-phase tests and fixtures. Do not delete them, and do not silently downgrade coverage expectations just to make the scaffold land cleanly.
- Keep benchmark wiring aligned with Vitest’s benchmark configuration, especially JSON result output for later comparison workflows.
- The minimum passing verification for this story is the package/tooling surface, not runtime redaction semantics.

### Implementation Guardrails

- Do not implement redaction behaviour in this story.
- Do not invent a second public facade or keep the old class API as a parallel primary path.
- Do not overwrite the repository wholesale with the scaffold output.
- Do not keep both Airbnb ESLint and XO active unless there is a tightly justified transitional reason.
- Do not let the Node `24.14.1` contributor baseline narrow the intended published support targets or pull Node-specific helpers into the core entrypoint.
- Do not hand-edit generated outputs after generation.
- Do not remove the existing tests, fixtures, benchmark files, or planning artefacts.

### Open Questions / Assumptions

- The architecture examples include specific tool versions, but Story `1.1` should treat those as planning references rather than hard pins. The implementation rule is to record the exact latest versions actually selected in `package.json` and `pnpm-lock.yaml`, excluding packages deliberately removed from the v4 foundation.
- If adopting the exact latest version of a retained dependency breaks the selected stack, that is a design problem to resolve explicitly, not a reason to pin an older version without discussion.
- `tsdown` auto-exports are marked experimental. If they cannot cleanly replace the current bespoke exports script on their own, keep a local verification layer rather than reverting to hand-maintained exports.
- README generation can evolve, but it must remain deterministic and scripted.

### Project Structure Notes

- Current repo structure does not yet match the architecture target. The main deviations are the flat `src/types.ts` file, the `src/utils/` tree, npm-first metadata, and the hand-maintained export map in `package.json`.
- The target test taxonomy is not in place yet; Story `1.1` should start that migration specifically at `test/contract/exports/` and `test/contract/types/` for package-surface verification.
- Story `1.1` should correct the package and tooling baseline first, while leaving deeper runtime decomposition for later stories.
- Any retained legacy file after the transplant must be either:
  - required to preserve the red-phase safety harness, or
  - part of a deliberate migration bridge with an explicit note explaining why it remains.

### References

- Local planning artefacts
  - [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 1`, `Story 1.1`
  - [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Starter Template Evaluation`, `Infrastructure & Deployment`, `Implementation Sequence`, `Project Structure & Boundaries`, `Implementation Handoff`
  - [prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `MVP - Minimum Viable Product`, `Technical Constraints`
  - [sprint-status.yaml](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Current brownfield repo files
  - [package.json](/Users/ben.green/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben.green/Code/deep-redact/.nvmrc)
  - [.npmrc](/Users/ben.green/Code/deep-redact/.npmrc)
  - [.github/workflows/npmPublish.yml](/Users/ben.green/Code/deep-redact/.github/workflows/npmPublish.yml)
  - [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts)
  - [src/types.ts](/Users/ben.green/Code/deep-redact/src/types.ts)
  - [scripts/update-exports.ts](/Users/ben.green/Code/deep-redact/scripts/update-exports.ts)
  - [scripts/update-readme.ts](/Users/ben.green/Code/deep-redact/scripts/update-readme.ts)
  - [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts)
  - [test/unit/index.test.ts](/Users/ben.green/Code/deep-redact/test/unit/index.test.ts)
  - [test/load/redact.test.ts](/Users/ben.green/Code/deep-redact/test/load/redact.test.ts)
- Official external sources checked on 2026-04-13
  - `tsdown` home and getting started: https://tsdown.dev/ and https://tsdown.dev/guide/getting-started
  - `tsdown` package exports: https://tsdown.dev/options/package-exports
  - Node `24.14.1` archive: https://nodejs.org/en/download/archive/v24.14.1
  - Node packages / `packageManager` field: https://nodejs.org/download/release/v22.12.0/docs/api/packages.html
  - Node Corepack docs: https://nodejs.org/download/release/v18.20.8/docs/api/corepack.html
  - Vitest config: https://vitest.dev/config/
  - Vitest benchmark config: https://vitest.dev/config/benchmark
  - Vitest releases: https://github.com/vitest-dev/vitest/releases
  - XO repo / docs: https://github.com/xojs/xo

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context assembled from BMAD workflow inputs on `2026-04-13T10:27:11+0100`.
- Sprint tracking moved to `in-progress` on `2026-04-13T10:45:00+0100`.
- Scratch scaffold generated at `/tmp/deep-redact-v4` with `pnpm create tsdown@latest /tmp/deep-redact-v4 --template minimal`, then inspected after `pnpm install` and `pnpm run build`.
- Validation green on `pnpm run generate`, `pnpm run lint`, `pnpm run build`, and `pnpm run test` under Node `24.14.1`.
- Review patch set applied on `2026-04-13T11:50:48+0100`, fixing CommonJS declaration output, generated-file verification ordering, and publish quality gates.
- Retained red-phase validation executed through `pnpm run test:red-phase` and `pnpm run bench`; both now fail on `DeepRedact is not a constructor`, which is the expected v3-to-v4 pressure signal for this foundation-only story.

### Completion Notes List

- Comprehensive story context created for Story `1.1`.
- No previous story intelligence exists because this is the first story in Epic `1`.
- No `project-context.md` file was found in the repository.
- Scratch scaffold reference captured `pnpm@10.33.0`, `tsdown@0.21.7`, and `typescript@6.0.2`, and those decisions were documented in `_bmad-output/planning-artifacts/0001-scratch-v4-foundation-transplant.md`.
- Replaced the npm-first / Airbnb / dual-`tsc` baseline with Node `24.14.1`, `pnpm`, `tsdown`, a root-only v4 package surface, and a deliberate `xo` + `tsc --noEmit` lint gate.
- Added deterministic generated-file workflows for package export metadata and README content plus explicit verification through `scripts/verify-generated-files.ts`.
- Added clean-fixture contract coverage for `import`, `require`, and both ESM and CommonJS consumer-facing type declarations under `test/contract/`.
- `pnpm run test` now passes for the new package-surface contract; retained red-phase tests and the benchmark suite continue to run separately and fail because the legacy `DeepRedact` class is intentionally no longer exported in Story `1.1`.

### File List

- .github/workflows/npmPublish.yml
- .gitignore
- .npmrc
- .nvmrc
- README.md
- _bmad-output/planning-artifacts/0001-scratch-v4-foundation-transplant.md
- package.json
- pnpm-lock.yaml
- scripts/generate-exports.ts
- scripts/generate-readme.ts
- scripts/generated-files.ts
- scripts/templates/README.md.template
- scripts/verify-generated-files.ts
- src/index.ts
- test/build.test.ts
- test/contract/exports/import.test.ts
- test/contract/exports/require.test.ts
- test/contract/support/package-fixture.ts
- test/contract/types/declarations.test.ts
- test/fixtures/consumers/cjs/index.cjs
- test/fixtures/consumers/cjs/package.json
- test/fixtures/consumers/esm/index.mjs
- test/fixtures/consumers/esm/package.json
- test/fixtures/consumers/types/index.ts
- test/fixtures/consumers/types/package.json
- test/fixtures/consumers/types/tsconfig.json
- tsconfig.json
- tsdown.config.ts
- vitest.config.ts
- vitest.bench.config.ts
- vitest.red-phase.config.ts
- xo.config.js
- dist/index.cjs
- dist/index.d.cts
- dist/index.d.ts
- dist/index.js
- .eslintrc.json (deleted)
- package-lock.json (deleted)
- scripts/_renderTable.ts (deleted)
- scripts/blacklistKeyConfig.ts (deleted)
- scripts/js-to-mjs.sh (deleted)
- scripts/mainOptions.ts (deleted)
- scripts/stringTestConfig.ts (deleted)
- scripts/templates/LICENSE.txt (deleted)
- scripts/templates/README.txt (deleted)
- scripts/update-exports.ts (deleted)
- scripts/update-license.ts (deleted)
- scripts/update-readme.ts (deleted)
- tsconfig.cjs.json (deleted)
- tsconfig.eslint.json (deleted)
- tsconfig.esm.json (deleted)
- dist/** legacy multi-entry v3 artefacts (deleted)

### Change Log

- `2026-04-13`: Established the scratch-derived v4 foundation, migrated the repo to `pnpm`/`tsdown`, added generated export and README workflows, introduced the root-only `deepRedact` / `createRedactor` facade, added clean-fixture contract tests, and documented deliberate brownfield retention in ADR `0001`.
