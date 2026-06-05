# Story 8.7: Clean Up Dead Source, Tests, Scripts, and Stale Traversal Artefacts

Status: ready-for-dev

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

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

- **Major cleanup:** stale `fast lane` / `compiled path executor` terminology in active source comments, test helpers, and future-facing artefacts.
- **Major cleanup:** obsolete source/test/script helpers left behind by the compiled-executor replacement, if any are found by reference analysis.
- **Major cleanup:** v3-era dead source, tests, scripts, and helper modules that are no longer part of the v4 product surface.
- **Minor included by fit:** stale Dev Notes references to removed `isFastLaneSafePayload` and stale `deferred-work.md` references where they can mislead future stories.

## Acceptance Criteria

1. **Given** active source, tests, scripts, and generated-input artefacts are searched for obsolete traversal terms
   **When** this story is complete
   **Then** no future-facing source/test/script comment or helper name describes the current rule-driven executor as the old compiled fast lane
   **And** references to `fast-redact` as a comparator, migration package, or product name are preserved.

2. **Given** active source, tests, scripts, and fixtures are searched for v3-era leftovers
   **When** this story is complete
   **Then** obsolete `DeepRedact` class tests, `blacklistedKeys` runtime usage, legacy load tests, stale v3 utility modules, and unreachable helper imports are removed or rewritten
   **And** intentional v3 migration fixtures, generated migration-guide inputs, and negative type/API assertions are preserved.

3. **Given** historical story sections still describe completed Story 4.3, Story 7.1, or Story 7.5 fast-lane work
   **When** cleanup is performed
   **Then** historical context is not rewritten wholesale
   **And** only stale references likely to guide future implementation are corrected or annotated.

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

## Tasks / Subtasks

- [ ] Search source, tests, scripts, docs, and implementation artefacts for obsolete traversal terms:
  - `fast lane`
  - `fast-lane`
  - `compiled path executor`
  - `isFastLaneSafePayload`
  - `buildFastLaneExecutor`
  - `deferred-work.md`
- [ ] Search source, tests, scripts, and fixtures for v3-era leftovers:
  - `DeepRedact`
  - `blacklistedKeys`
  - `replacement`
  - `serialize`
  - `TransformerRegistry`
  - `standardTransformers`
  - `legacy`
- [ ] Classify each hit as live product terminology, valid historical context, or stale future-facing guidance.
- [ ] For v3-related hits, classify each as intentional migration coverage, negative v4 API proof, or dead v3 implementation/test/script residue.
- [ ] Record any candidate requiring runtime behaviour, benchmark threshold, lint-rule, or generated-output changes as separate follow-up work.
- [ ] Rename active test helpers and variables that currently use "fast" to mean the current path-driven executor, unless the name is deliberately preserving a historical equivalence fixture.
- [ ] Correct source comments such as "path-driven fast lane" to "path-driven executor" or "rule-driven executor".
- [ ] Remove or rewrite obsolete v3-era tests such as legacy class/load tests when they no longer exercise the v4 public API.
- [ ] Remove dead helpers/imports/scripts only after proving they have no live references.
- [ ] Update this story's completion notes with a short cleanup inventory: removed, rewritten, renamed, preserved migration/negative coverage, preserved historical.
- [ ] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) for cleanup items that are fully addressed.

## Dev Notes

Start with reference analysis, not deletion. `fast-redact` references are usually legitimate migration or benchmark terminology. V3 references are legitimate only when they are part of the migration matrix, generated migration documentation, or explicit negative API tests proving v4 rejects legacy options. V3-era source modules, legacy class tests, and load tests built around `new DeepRedact(...)` should be treated as cleanup candidates, not automatically preserved.

Expected active hotspots include:

- [src/core/create-redactor.ts](src/core/create-redactor.ts) comments around serialise routing.
- [src/core/matching/path-parser.ts](src/core/matching/path-parser.ts) comments around unsafe wildcard overlap.
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) lane-forcing helper names and section titles.
- [test/unit/index.test.ts](test/unit/index.test.ts) legacy class API tests.
- [test/load/redact.test.ts](test/load/redact.test.ts) legacy load tests using `new DeepRedact(...)`.
- [src/utils/](src/utils) and [test/unit/standardTransformers.test.ts](test/unit/standardTransformers.test.ts) old transformer utility paths.
- [test/migration/v3/](test/migration/v3) migration fixtures and matrix entries that should usually be preserved.
- Story artefacts for 7.1, 8.2, 8.3, and 8.6 where stale names could be copied by a future developer.

Use British English in replacement prose. Preserve API identifiers such as `pathDrivenOnly`.

## Verification

- `rg -n -S "isFastLaneSafePayload|buildFastLaneExecutor|deferred-work\\.md" src test scripts docs _bmad-output`
- `rg -n -S "fast lane|fast-lane|compiled path executor" src test scripts docs _bmad-output`
- `rg -n -S "DeepRedact|blacklistedKeys|replacement|serialize|TransformerRegistry|standardTransformers|legacy" src test scripts docs _bmad-output`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- Run `source .agents/initialise-env.sh && pnpm lint` where practical; if baseline lint remains red before Story 8.10, record exact unchanged baseline output and run ESLint on changed files.
