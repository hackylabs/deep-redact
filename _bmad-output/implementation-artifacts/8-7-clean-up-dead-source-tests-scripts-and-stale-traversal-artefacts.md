# Story 8.7: Clean Up Dead Source, Tests, Scripts, and Stale Traversal Artefacts

Status: done

Implementation note: Correct-course context analysis completed before implementation. Story 8.7 clean-up and code review are complete; the completion notes below include the AC 9 cleanup inventory.

## Story

As a Deep Redact maintainer,
I want dead source code, obsolete tests, stale scripts, v3-era leftovers, and misleading traversal artefact references cleaned up after the rule-driven engine replacement,
so that future Epic 8 work starts from the current v4 engine contract rather than from superseded fast-lane or legacy v3 assumptions.

## Context

Epic 8 replaced the Story 7.1 compiled path executor with `buildPathDrivenExecutor` in [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts). There is no current `src/core/runtime/fast-lane.ts`, `buildFastLaneExecutor`, or `isFastLaneSafePayload` source module, but active source/tests still contain future-facing "fast lane" terminology. Older story artefacts also reference stale names such as `deferred-work.md` and removed guards.

The cleanup scope also includes dead code and tests left over from Deep Redact v3. Preserve intentional v3 migration fixtures, generated migration documentation inputs, and type-negative assertions that prove the v4 API rejects legacy options. Do not preserve obsolete v3 source, legacy load/unit tests, old utility modules, or stale helper imports merely because they mention v3-era concepts.

This is intentionally a cleanup story. It must not change redaction behaviour, benchmark thresholds, traversal budgets, alias semantics, or serialise-output marker shapes. It prepares the repo for Stories 8.8 to 8.12 by removing misleading names, obsolete v3-era implementation leftovers, and any truly unused helpers.

Readiness correction: keep this as a cleanup-only inventory and removal story. If reference analysis finds a candidate that needs runtime behaviour, benchmark threshold, lint-rule, or generated-output changes, record it for a separate follow-up story rather than expanding this scope.

## Source Audit Items Covered

- **Major cleanup:** stale `fast lane` / `compiled path executor` terminology in active source comments, test helpers, config files, generated README templates, and future-facing artefacts.
- **Major cleanup:** obsolete source/test/script helpers left behind by the compiled-executor replacement, including stale `isExactPathOnly`, `buildFastLaneExecutor`, `isFastLaneSafePayload`, `fast-lane.ts`, and `deferred-work.md` references where they could guide future work incorrectly.
- **Major cleanup:** v3-era dead source, tests, scripts, benchmark/load artefacts, red-phase artefacts, and helper modules that are no longer part of the v4 product surface.
- **Major cleanup:** old utility/type roots and tests such as `src/utils/**`, `src/types.ts`, `test/unit/index.test.ts`, `test/unit/redactorUtils.test.ts`, `test/unit/transformerRegistry.test.ts`, `test/unit/standardTransformers.test.ts`, `test/load/redact.test.ts`, and `test/bench/redact.bench.ts`, where reference analysis proves they are stale v3 residue rather than current v4 coverage.
- **Minor included by fit:** stale Dev Notes references to removed `isFastLaneSafePayload`, stale `deferred-work.md` references, stale generated README/red-phase wording, stale future-story links such as Story 8.11's `test/unit/standardTransformers.test.ts` pointer, and stale config references such as lint overrides for deleted `src/core/runtime/fast-lane.ts`.
- **Protected out of scope:** benchmark threshold policy, lint-rule redesign, runtime traversal behaviour, alias semantics, budget accounting, serialise-output marker shapes, generated migration-guide content, and transformer dispatch behaviour except where a direct stale-reference rename is required.

## Acceptance Criteria

1. **Given** active source, tests, scripts, and generated-input artefacts are searched for obsolete traversal terms
   **When** this story is complete
   **Then** no future-facing source/test/script comment or helper name describes the current rule-driven executor as the old compiled fast lane
   **And** live zero-hit checks exclude the story file itself and historical artefacts that are explicitly preserved in the cleanup inventory
   **And** references to `fast-redact` as a comparator, migration package, or product name are preserved.

2. **Given** active source, tests, scripts, and fixtures are searched for v3-era leftovers
   **When** this story is complete
   **Then** obsolete `DeepRedact` class tests, `blacklistedKeys` runtime usage, legacy load tests, stale v3 utility modules, and unreachable helper imports are removed or rewritten
   **And** intentional v3 migration fixtures, generated migration-guide inputs, and negative type/API assertions are preserved.

3. **Given** historical story sections still describe completed Story 4.3, Story 7.1, or Story 7.5 fast-lane work
   **When** cleanup is performed
   **Then** historical context is not rewritten wholesale
   **And** only stale references likely to guide future implementation are corrected or annotated
   **And** preserved historical references are listed in the completion inventory.

4. **Given** any candidate dead helper, fixture, script, or import is found
   **When** it is removed or renamed
   **Then** `rg` proves no remaining live reference is broken
   **And** the relevant focused tests still pass.

5. **Given** the audit file is used by future stories
   **When** stale physical-file references are encountered
   **Then** they point to `_bmad-output/implementation-artifacts/deferred-work-audit.md`, not `deferred-work.md`.

6. **Given** this story is a cleanup-only change
   **When** implementation is reviewed
   **Then** no runtime behaviour, public API, benchmark threshold, lint rule, or generated documentation output changes unless directly required by a rename.

7. **Given** reference analysis finds a candidate that requires runtime behaviour, benchmark threshold, lint-rule, or generated-output changes
   **When** the candidate is classified
   **Then** it is recorded for a separate follow-up story rather than expanding Story 8.7.

8. **Given** a deferred-work-audit item contains both stale wording and unresolved runtime/performance work
   **When** Story 8.7 updates the audit
   **Then** only the stale wording or stale backlink is updated
   **And** the underlying runtime/performance item remains `[Open]` or `[Partially addressed]` unless the non-cleanup issue is resolved by another story.

9. **Given** implementation completes
   **When** the story is moved out of `ready-for-dev`
   **Then** this story's completion notes include a cleanup inventory covering removed files, rewritten files, renamed helpers/prose, preserved migration/negative coverage, preserved historical references, and any follow-up items recorded from out-of-scope candidates.

## Tasks / Subtasks

- [x] Search source, tests, scripts, docs, root guidance files, config files, generated README templates, and implementation/planning artefacts for obsolete traversal terms:
  - `fast lane`
  - `fast-lane`
  - `fast-lane.ts`
  - `compiled path executor`
  - `isExactPathOnly`
  - `isFastLaneSafePayload`
  - `buildFastLaneExecutor`
  - `deferred-work.md`
- [x] Search source, tests, scripts, benchmark/load suites, red-phase suites, README templates, and fixtures for v3-era leftovers:
  - `DeepRedact`
  - `blacklistedKeys`
  - `replacement`
  - `serialize`
  - `TransformerRegistry`
  - `standardTransformers`
  - `legacy`
- [x] Do not treat broad terms such as `replacement`, `serialize`, or `legacy` as removal instructions by themselves; use them only to classify concrete files and preserve valid migration, generated guide, fast-redact migration, and type-negative coverage.
- [x] Classify each hit as live product terminology, valid historical context, or stale future-facing guidance.
- [x] For v3-related hits, classify each as intentional migration coverage, negative v4 API proof, or dead v3 implementation/test/script residue.
- [x] Record any candidate requiring runtime behaviour, benchmark threshold, lint-rule, or generated-output changes as separate follow-up work.
- [x] Rename active test helpers and variables that currently use "fast" to mean the current path-driven executor, unless the name is deliberately preserving a historical equivalence fixture.
- [x] Correct source comments such as "path-driven fast lane" to "path-driven executor" or "rule-driven executor".
- [x] Remove or rewrite obsolete v3-era tests and benchmark/load artefacts such as legacy class/load tests, old red-phase utility tests, and old `.redact()` benchmark suites when they no longer exercise the v4 public API.
- [x] Classify and remove stale v3 utility/type roots such as `src/utils/**` and `src/types.ts` only after proving current v4 source, generated scripts, contract tests, and migration verifiers no longer import them.
- [x] Remove dead helpers/imports/scripts only after proving they have no live references.
- [x] Update README/template wording if red-phase tests or legacy benchmark/load artefacts are removed; if generated README output is not changed in this cleanup story, record that contradiction as follow-up work.
- [x] Retarget future-facing story references, especially Story 8.11 references to `test/unit/standardTransformers.test.ts`, if the referenced file is removed or reclassified as stale utility coverage.
- [x] Remove or reclassify stale config references such as lint overrides for deleted `src/core/runtime/fast-lane.ts`; if the change would become lint-rule redesign rather than stale-reference cleanup, record it as follow-up work.
- [x] Update this story's completion notes with a short cleanup inventory: removed, rewritten, renamed, preserved migration/negative coverage, preserved historical.
- [x] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) for cleanup items that are fully addressed; for mixed items, update or split only the stale-reference part and leave unresolved runtime/performance work open.

### Review Findings

- [x] [Review][Patch] Stale lane and fast-lane terminology remains in active source and test helpers [src/core/matching/path-parser.ts:560]
- [x] [Review][Patch] Removed benchmark/load suites leave orphaned benchmark/load dependencies and stale package commentary [package.json:89]
- [x] [Review][Patch] README and generated template still describe the runtime as placeholder-only [README.md:64]

## Dev Notes

Start with reference analysis, not deletion. `fast-redact` references are usually legitimate migration or benchmark terminology. V3 references are legitimate only when they are part of the migration matrix, generated migration documentation, or explicit negative API tests proving v4 rejects legacy options. V3-era source modules, legacy class tests, and load tests built around `new DeepRedact(...)` should be treated as cleanup candidates, not automatically preserved.

Expected active hotspots include:

- [src/core/create-redactor.ts](src/core/create-redactor.ts) comments around serialise routing.
- [src/core/matching/path-parser.ts](src/core/matching/path-parser.ts) comments around unsafe wildcard overlap.
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) lane-forcing helper names and section titles.
- [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts) lane-forcing helper names and comments where "fast" now means the rule-driven executor.
- [test/unit/index.test.ts](test/unit/index.test.ts) legacy class API tests.
- [test/unit/redactorUtils.test.ts](test/unit/redactorUtils.test.ts), [test/unit/transformerRegistry.test.ts](test/unit/transformerRegistry.test.ts), and [test/unit/standardTransformers.test.ts](test/unit/standardTransformers.test.ts) old utility tests.
- [test/load/redact.test.ts](test/load/redact.test.ts) legacy load tests using `new DeepRedact(...)`.
- [test/bench/redact.bench.ts](test/bench/redact.bench.ts) old benchmark suite using `new DeepRedact(...)` and `.redact()`, while preserving intentional v3 comparator fixtures under [test/bench/competitors/deep-redact-v3/](test/bench/competitors/deep-redact-v3).
- [src/utils/](src/utils) and [src/types.ts](src/types.ts) old utility/type roots.
- [README.md](README.md) and [scripts/templates/README.md.template](scripts/templates/README.md.template) retained-legacy/red-phase wording if the corresponding tests are removed.
- [project-context.md](project-context.md) stale physical deferred-work file name references.
- [eslint.config.mjs](eslint.config.mjs) stale deleted-`fast-lane.ts` override references, provided the change stays a stale-reference cleanup and does not redesign lint policy.
- [test/migration/v3/](test/migration/v3) migration fixtures and matrix entries that should usually be preserved.
- Story artefacts for 7.1, 8.2, 8.3, 8.6, and 8.11 where stale names or file targets could be copied by a future developer.

Deferred-work-audit opportunities that fit this story:

- The Story 7.1 Dev Notes snippet that imports `buildFastLaneExecutor` and `isFastLaneSafePayload` is pure artefact cleanup.
- The `for...in` retained traversal item may have stale `fast-lane.ts` wording cleaned up, but the retained-subtree traversal behaviour remains out of scope.
- The `pathDrivenOnly` eligibility item may have stale `isExactPathOnly` wording cleaned up, but eligibility refinement remains out of scope.
- The `resolveRetainTerminal` item may have stale `deferred-work.md` backlinks cleaned up, but alias semantics remain out of scope.
- Benchmark batch behaviour, benchmark threshold floors, baseline lint errors, exact-path budget accounting, alias-aware redaction conflicts, serialise-output edge cases, retain-structure performance, and retain/wildcard coverage gaps remain out of scope unless this story only records them as follow-up.

Use British English in replacement prose. Preserve API identifiers such as `pathDrivenOnly`.

## Verification

- Live stale-reference zero-hit checks, excluding historical artefacts that are intentionally preserved in the completion inventory:
  - `rg -n -S "isFastLaneSafePayload|buildFastLaneExecutor|isExactPathOnly|fast-lane\\.ts|deferred-work\\.md" src test scripts docs project-context.md README.md scripts/templates eslint.config.mjs`
  - `rg -n -S "path-driven fast lane|rule-driven fast lane|fast-lane and generic-lane|exact-path fast-lane|compiled path executor" src test scripts README.md scripts/templates eslint.config.mjs`
- Historical and future-facing artefact review, with every remaining hit classified in the completion inventory:
  - `rg -n -S "isFastLaneSafePayload|buildFastLaneExecutor|isExactPathOnly|fast-lane\\.ts|fast lane|fast-lane|compiled path executor|deferred-work\\.md" _bmad-output project-context.md`
- V3 residue classification, preserving migration docs/fixtures, fast-redact migration material, v3 comparator fixtures, and negative type/API assertions:
  - `rg -n -S "DeepRedact|blacklistedKeys|replacement|serialize|TransformerRegistry|standardTransformers|legacy" src test scripts docs README.md scripts/templates package.json vitest*.config.ts`
  - `rg -n -S "src/utils|src/types\\.ts|test/unit/index\\.test\\.ts|test/unit/redactorUtils\\.test\\.ts|test/unit/transformerRegistry\\.test\\.ts|test/unit/standardTransformers\\.test\\.ts|test/load/redact\\.test\\.ts|test/bench/redact\\.bench\\.ts|test:red-phase|vitest.red-phase" src test scripts docs README.md scripts/templates package.json vitest*.config.ts _bmad-output`
- Reference integrity checks after any removal or rename:
  - `rg -n -S "src/utils|src/types\\.ts|RedactorUtils|TransformerRegistry|standardTransformers" src test scripts docs package.json tsconfig.json vitest*.config.ts eslint.config.mjs`
  - `rg -n -S "test/unit/standardTransformers\\.test\\.ts|test/unit/redactorUtils\\.test\\.ts|test/unit/transformerRegistry\\.test\\.ts|test/load/redact\\.test\\.ts|test/bench/redact\\.bench\\.ts" _bmad-output README.md scripts/templates package.json vitest*.config.ts`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- If red-phase tests/config remain after cleanup: `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts --reporter=verbose`; if they are removed, prove `package.json`, `README.md`, `scripts/templates/README.md.template`, and Vitest configs no longer advertise stale red-phase tests.
- If `test/bench/redact.bench.ts` remains after cleanup: `source .agents/initialise-env.sh && pnpm exec vitest bench --config vitest.bench.config.ts --run`; if it is removed, prove `pnpm bench` no longer includes the stale v3 `.redact()` suite while preserving current benchmark-runner artefacts and intentional `deep-redact-v3` comparator coverage.
- `source .agents/initialise-env.sh && pnpm run verify-generated-files`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- Run `source .agents/initialise-env.sh && pnpm lint` where practical; if baseline lint remains red before Story 8.10, record exact unchanged baseline output and run ESLint on changed files.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log

- 2026-06-05: Initial stale-reference `rg` checks found obsolete `fast-lane`, `isFastLaneSafePayload`, `isExactPathOnly`, deleted utility roots, legacy unit/load/benchmark suites, stale red-phase wording, and stale `deferred-work.md` physical-file references.
- 2026-06-05: Focused `create-redactor` verification first exposed two missed helper variable renames from `fastContexts` to `pathDrivenContexts`; both were corrected before the suite passed.
- 2026-06-05: Broad historical artefact searches still return older story titles, cancelled story names, historical acceptance text, and this story's own verification/inventory references; these were classified as preserved historical context rather than rewritten wholesale.
- 2026-06-05: Review patches removed remaining active execution-mode `lane` terminology, stale placeholder-runtime README/template prose, and orphaned benchmark/load dependencies; `pnpm-lock.yaml` was regenerated.

### Completion Notes

Clean-up inventory:

- Removed dead v3-era source and helper roots: `src/types.ts`, `src/utils/index.ts`, `src/utils/TransformerRegistry.ts`, and all `src/utils/standardTransformers/*.ts` modules.
- Removed obsolete tests and suites that no longer exercised the v4 public API: `test/unit/index.test.ts`, `test/unit/redactorUtils.test.ts`, `test/unit/standardTransformers.test.ts`, `test/unit/transformerRegistry.test.ts`, `test/load/redact.test.ts`, `test/bench/redact.bench.ts`, `test/setup/blacklist.ts`, `test/setup/dummyUser.ts`, and `vitest.bench.config.ts`.
- Rewritten live traversal terminology in source/tests/fixtures from old fast-lane wording to path-driven or generic executor wording, including `src/core/create-redactor.ts`, `src/core/matching/path-parser.ts`, `src/core/runtime/navigate-exact-paths.ts`, `test/contract/api/create-redactor.test.ts`, `test/contract/api/rule-driven-traversal-contract.test.ts`, and `test/fixtures/exact-path-equivalence/index.ts`.
- Updated config and README/template wiring so red-phase testing points at the current focused unit suites, stale lint overrides for deleted files are gone, `pnpm bench` delegates to the current benchmark producer rather than the removed Vitest benchmark suite, and orphaned benchmark/load dependencies are removed from `package.json`/`pnpm-lock.yaml`.
- Retargeted future-facing artefact references to current files: Story 8.11 now points transformer edge-case work at `test/contract/api/create-redactor.test.ts`; stale `deferred-work.md` physical-file references in active guidance and future-facing story notes now point to `_bmad-output/implementation-artifacts/deferred-work-audit.md`.
- Updated `deferred-work-audit.md` only for stale wording/backlinks that this clean-up resolved; unresolved runtime, traversal, alias, performance, benchmark, lint, and serialise-output work remains open or partially addressed for its owning stories.
- Preserved valid v3 and comparator coverage: `test/migration/v3/**`, `docs/migration/from-v3.md`, generated migration-guide inputs, `test/bench/competitors/deep-redact-v3/**`, fast-redact migration/comparator references, public negative type/API assertions, and identifiers such as `DeepRedactOptions`, `DeepRedactValidationError`, `replacement`, and `serialize` where they are part of current contracts or third-party compatibility.
- Preserved historical artefact references in older BMAD story text, cancelled story names, sprint keys, planning inputs, and this story's verification inventory when they describe past work rather than future implementation guidance.
- No new follow-up story was created by this clean-up. Existing out-of-scope items remain with their owning artefacts, including baseline lint errors before Story 8.10, serialise-output edge cases for Story 8.11, and unresolved runtime/performance items in `deferred-work-audit.md`.

Verification completed:

- `rg -n -S "isFastLaneSafePayload|buildFastLaneExecutor|isExactPathOnly|fast-lane\\.ts|deferred-work\\.md" src test scripts docs project-context.md README.md scripts/templates eslint.config.mjs` — zero live hits.
- `rg -n -S "path-driven fast lane|rule-driven fast lane|fast-lane and generic-lane|exact-path fast-lane|compiled path executor" src test scripts README.md scripts/templates eslint.config.mjs` — zero live hits.
- `rg -n -S "src/utils|src/types\\.ts|RedactorUtils|TransformerRegistry|standardTransformers" src test scripts docs package.json tsconfig.json vitest*.config.ts eslint.config.mjs` — zero live hits.
- `rg -n -S "\"bench\": \"pnpm run bench:produce\"|vitest\\.bench\\.config|test/bench/.*\\.bench|redact\\.bench\\.ts" package.json vitest*.config.ts test/bench scripts README.md scripts/templates` — only the intended `package.json` `bench` script hit.
- `rg -n -S "\\blane\\b|\\blanes\\b|Lane|createLaneForced|lane-forcing|cross-lane|Generic-lane|fast lane|rule-driven fast lane|path-driven fast lane|throws until the v4 runtime lands|placeholder-only|autocannon|obglob|@hackylabs/obglob|@memlab/core|@types/autocannon|memlab" src test scripts README.md scripts/templates package.json eslint.config.mjs` — zero live hits.
- `rg -n -S "autocannon|obglob|@hackylabs/obglob|@memlab/core|@types/autocannon|memlab" pnpm-lock.yaml` — zero hits.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` — pass, 495 tests.
- `source .agents/initialise-env.sh && pnpm run test:red-phase` — pass, 76 tests.
- `source .agents/initialise-env.sh && pnpm run verify-generated-files` — pass.
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` — pass.
- `source .agents/initialise-env.sh && pnpm exec eslint src/core/create-redactor.ts test/contract/api/create-redactor.test.ts test/fixtures/exact-path-equivalence/index.ts test/contract/api/rule-driven-traversal-contract.test.ts eslint.config.mjs vitest.red-phase.config.ts` — pass.
- `source .agents/initialise-env.sh && pnpm exec eslint src/core/matching/path-parser.ts test/contract/api/create-redactor.test.ts test/contract/api/rule-driven-traversal-contract.test.ts test/fixtures/exact-path-equivalence/index.ts` — pass.
- `source .agents/initialise-env.sh && pnpm run test` — pass, 642 tests.
- `source .agents/initialise-env.sh && pnpm lint` — baseline remains red before Story 8.10 with seven existing `src/core/replacement/serialise-output.ts` violations and one existing `src/core/runtime/navigate-exact-paths.ts` violation: `unicorn/prefer-string-replace-all` x2, `unicorn/prefer-string-raw`, `unicorn/no-typeof-undefined`, `unicorn/no-negated-condition`, `@typescript-eslint/no-unused-expressions`, and `unicorn/no-new-array` x2.

### File List

- `README.md`
- `_bmad-output/implementation-artifacts/5-9-produce-canonical-benchmark-runs-and-publish-benchmark-artefacts.md`
- `_bmad-output/implementation-artifacts/6-2-extend-exact-path-equivalence-corpus-to-cover-deferred-selector-scenarios.md`
- `_bmad-output/implementation-artifacts/6-4-harden-v3-migration-validation-scripts.md`
- `_bmad-output/implementation-artifacts/6-5-harden-example-validation-and-documentation-generation-scripts.md`
- `_bmad-output/implementation-artifacts/7-1-implement-compiled-path-executor-for-exact-path-only-configurations.md`
- `_bmad-output/implementation-artifacts/8-11-harden-serialise-output-transformer-edge-cases.md`
- `_bmad-output/implementation-artifacts/8-2-implement-rule-driven-exact-path-navigation-and-deprecate-the-compiled-path-executor.md`
- `_bmad-output/implementation-artifacts/8-7-clean-up-dead-source-tests-scripts-and-stale-traversal-artefacts.md`
- `_bmad-output/implementation-artifacts/deferred-work-audit.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `eslint.config.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `project-context.md`
- `scripts/templates/README.md.template`
- `src/core/create-redactor.ts`
- `src/core/matching/path-parser.ts`
- `src/core/runtime/navigate-exact-paths.ts`
- `src/types.ts` (deleted)
- `src/utils/TransformerRegistry.ts` (deleted)
- `src/utils/index.ts` (deleted)
- `src/utils/standardTransformers/bigint.ts` (deleted)
- `src/utils/standardTransformers/date.ts` (deleted)
- `src/utils/standardTransformers/error.ts` (deleted)
- `src/utils/standardTransformers/index.ts` (deleted)
- `src/utils/standardTransformers/map.ts` (deleted)
- `src/utils/standardTransformers/regex.ts` (deleted)
- `src/utils/standardTransformers/set.ts` (deleted)
- `src/utils/standardTransformers/url.ts` (deleted)
- `test/bench/redact.bench.ts` (deleted)
- `test/contract/api/create-redactor.test.ts`
- `test/contract/api/rule-driven-traversal-contract.test.ts`
- `test/fixtures/exact-path-equivalence/index.ts`
- `test/load/redact.test.ts` (deleted)
- `test/setup/blacklist.ts` (deleted)
- `test/setup/dummyUser.ts` (deleted)
- `test/unit/index.test.ts` (deleted)
- `test/unit/redactorUtils.test.ts` (deleted)
- `test/unit/standardTransformers.test.ts` (deleted)
- `test/unit/transformerRegistry.test.ts` (deleted)
- `vitest.bench.config.ts` (deleted)
- `vitest.red-phase.config.ts`

### Change Log

| Date | Change |
|------|--------|
| 2026-06-05 | Cleaned dead v3 source/tests/scripts and stale traversal artefact references; updated story status to review after verification. |
