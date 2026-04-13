# Story 1.2: Create and Validate a Reusable Service Redactor

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want to create one reusable redactor from startup configuration,
so that I can standardise redaction setup once per service and reuse it without re-initialising on every call.

## Acceptance Criteria

1. Given a valid startup configuration object for the factory API, when the consumer calls `deepRedact(validOptions)` during service startup, then a callable redactor function is returned, and no payload redaction work is performed at creation time.
2. Given a redactor created from valid startup configuration, when the consumer invokes it multiple times with payloads, then the same initialised redactor instance is reused, and no configuration argument is required on subsequent calls.
3. Given the public API surface, when the consumer calls `createRedactor(validOptions)`, then it returns the same callable redactor behaviour as `deepRedact(validOptions)`, and both factories are available from the public entrypoint.
4. Given an invalid configuration shape, unsupported option value, or unsupported public option name, when either factory is called, then initialisation fails immediately with a validation error, and no redaction function is returned.
5. Given startup configuration includes `paths`, when the public config is typed and validated for this story, then each entry is either a string selector or a path-rule object with `path` plus optional `censor`, `remove`, and `retainStructure` overrides, and selector execution beyond this story's init-time contract remains deferred to later stories in Epic `1`.
6. Given invalid option combinations for this story, when `remove` is combined with `censor` or `retainStructure` at the global config level or inside a path-rule object, then factory creation is rejected during initialisation, and the validation error identifies the conflicting option or combination.
7. Given a TypeScript consumer, when the factory functions are imported from the public entrypoint, then the package exposes typed signatures for supported startup options, `serialise` is the only public serialisation option and accepts `boolean | ((value: unknown) => string)`, structured output remains the default when `serialise` is omitted, and the returned redactor is editor-discoverable as a callable function.
8. Given a validly initialised redactor in this story before runtime targeting is implemented, when the consumer invokes it with a payload compatible with the configured `serialise` setting, then it returns the payload unchanged apart from optional serialisation configured at initialisation, and it does not throw solely because later targeting stories have not landed yet.
9. Given clean ESM and CommonJS consumer fixtures, when the built package exports are imported and either factory is invoked, then each returns a callable redactor and the built root surface still exposes only `deepRedact` and `createRedactor`.
10. Given this story's scope, when the implementation is reviewed, then it covers reusable factory creation and init-time validation only, and nested key/path redaction behaviour remains deferred to later stories in Epic `1`.

## Tasks / Subtasks

- [x] Finalise the v4 factory contract at the public entrypoint (AC: 1, 2, 3, 7, 8, 10)
  - [x] Move the concrete factory implementation out of `src/index.ts` into `src/core/create-redactor.ts`, keeping `src/index.ts` as the thin public facade.
  - [x] Expose `deepRedact` as the primary factory and `createRedactor` as a named alias with identical callable behaviour.
  - [x] Ensure one factory call returns one reusable callable redactor and that subsequent payload calls do not accept or require configuration input.
  - [x] Make the interim callable contract explicit: before Story `1.3` lands, the returned redactor performs pass-through or configured serialisation only and does not lazy-throw because selector runtime behaviour is still deferred.

- [x] Introduce architecture-aligned public types and validation modules (AC: 1, 3, 4, 5, 6, 7, 10)
  - [x] Create dedicated v4 type modules under `src/types/` for the public config and callable redactor contract instead of keeping the source of truth inline in `src/index.ts`, including `paths` entries as string selectors or path-rule objects with `path`, `censor`, `remove`, and `retainStructure`.
  - [x] Add `src/core/validation/validate-config.ts` and `src/core/validation/validation-report.ts` so creation-time validation is explicit, reusable, and testable.
  - [x] Expose `serialise` as the only public serialisation option, typed as `boolean | ((value: unknown) => string)` with structured output as the default when omitted, and avoid reviving legacy v3 public names such as `replacement` or `blacklistedKeys`.
  - [x] Introduce `src/types/paths.ts` for the `paths` contract so selector and path-rule typing does not collapse back into inline root-facade definitions.

- [x] Fail fast on invalid init-time combinations without implementing runtime targeting yet (AC: 1, 2, 4, 5, 6, 8, 10)
  - [x] Reject `remove + censor` and `remove + retainStructure` at both the global option level and inside path-rule objects carried by `paths`.
  - [x] Keep factory work limited to validation, defaulting, and immutable init-time plan creation; do not traverse payloads or perform redaction while initialising.
  - [x] Replace the current throwing placeholder with a compile-safe callable redactor that returns the original payload unchanged or serialised according to `serialise`, without prematurely implementing exact-key or exact-path redaction.

- [x] Add public contract coverage for creation, reuse, and validation (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] Add tests under `test/contract/api/` proving valid creation, alias equivalence, init-time validation failure, one-time initialisation behaviour, and the interim pass-through or serialise-only runtime contract.
  - [x] Extend clean consumer fixture coverage so the built ESM and CommonJS packages invoke both factories and prove the returned values are callable redactors rather than only proving export presence.
  - [x] Extend declaration coverage so TypeScript consumers can discover the callable return type, the `paths` string-or-path-rule contract, and `serialise` as the only public serialisation option with its supported type shape.
  - [x] Keep existing `import`, `require`, and declaration-fixture coverage green without weakening or deleting retained red-phase tests.

- [x] Verify the story within the v4 foundation rules (AC: 3, 7, 9)
  - [x] Run `pnpm run generate` if any generated export or README inputs change.
  - [x] Run `pnpm run lint` and `pnpm run test` to keep the v4 green suite healthy.
  - [x] Run `pnpm run test:red-phase` only as a retained pressure check; do not treat existing v3-oriented failures as a reason to dilute the new v4 contract.

### Review Findings

- [x] [Review][Patch] Respect inherited global defaults when validating and compiling path-rule overrides so effective `remove + censor` and `remove + retainStructure` combinations fail during initialisation [src/core/validation/validate-config.ts:1]

## Dev Notes

### Story Intent

- Story `1.2` is the point where the placeholder v4 package surface becomes a real service-root factory contract.
- The goal is one initialised redactor per startup configuration, with validation and compiled init-time state prepared once and reused across calls.
- This story deliberately stops before exact-key or exact-path runtime behaviour. Until Story `1.3` lands, the returned redactor remains a non-throwing pass-through or serialise-only callable so the factory contract can be exercised safely.

### Technical Requirements

- `deepRedact(options)` is the primary public factory and must return a callable redactor function.
- `createRedactor(options)` is a named alias exposed from the same root entrypoint and must behave the same as `deepRedact(options)`.
- Public config for this story must support `paths` entries as either string selectors or path-rule objects containing `path` with optional `censor`, `remove`, and `retainStructure` overrides.
- `serialise` is the only public serialisation option in v4 for this story, accepts `boolean | ((value: unknown) => string)`, and defaults to structured output when omitted.
- Factory creation must do init-time work only: validation, default resolution, and immutable per-instance setup.
- Payload traversal and matching must not happen during factory creation.
- Validation must fail fast and clearly when config is malformed or when conflicting options are provided.
- `remove + censor` and `remove + retainStructure` are invalid combinations now and must not be silently resolved at either the global option level or inside path-rule objects.
- The returned redactor must accept payload input immediately after successful initialisation and must return pass-through or configured serialised output rather than throwing solely because runtime targeting is deferred.
- TypeScript discoverability is part of the product contract, not a side effect. Public types must make the returned redactor obviously callable in editor tooling.
- Keep the core package zero-runtime-dependency and browser-safe where practical.

### Architecture Compliance

- `src/index.ts` remains the only primary public package facade. Keep it thin.
- Start aligning the source tree with the architecture target by introducing the minimal `src/core/` and `src/types/` slices this story genuinely needs.
- `src/core/validation/` owns init-time validation only and must not depend on runtime traversal.
- `src/core/create-redactor.ts` may depend on validation and public types, but not on optional adapters.
- `src/types/` is the v4 public contract surface. Do not treat the retained legacy `src/types.ts` file as the v4 source of truth.
- British English is the default for project-owned text and identifiers, and the v4 public API should not expose a second serialisation-option spelling.

### Current Brownfield Constraints

- [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts) currently contains a minimal inline `DeepRedactOptions` interface and a throwing placeholder redactor. Story `1.2` should move past that foundation without inventing later runtime features.
- [src/types.ts](/Users/ben.green/Code/deep-redact/src/types.ts) and [src/utils/index.ts](/Users/ben.green/Code/deep-redact/src/utils/index.ts) still describe the retained v3 world (`DeepRedact`, `blacklistedKeys`, `replacement`, transformer utilities). Treat them as migration pressure only, not as the new public contract.
- [package.json](/Users/ben.green/Code/deep-redact/package.json) already publishes only the root v4 surface, so any new public contract must continue to fit that generated export model.
- The clean consumer fixtures currently prove export presence and alias identity only. Story `1.2` should extend them to invoke the built factories and prove the returned values are callable redactors in both ESM and CommonJS consumption paths.
- [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json) type-checks the root facade, scripts, and contract suite. New source files must be reachable from that surface or the contract tests to stay covered by `tsc --noEmit`.
- [xo.config.js](/Users/ben.green/Code/deep-redact/xo.config.js) currently keeps TypeScript linting lightweight and ignores `test/unit/**`; do not spend this story trying to redesign the lint stack.
- [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts) runs the green contract suite from `test/contract/**/*.test.ts`, while [vitest.red-phase.config.ts](/Users/ben.green/Code/deep-redact/vitest.red-phase.config.ts) keeps the retained v3-oriented `test/unit/**` and `test/load/**` pressure isolated.

### Library / Framework Requirements

- Contributor baseline remains Node `24.14.1`, `pnpm`, `tsdown`, `Vitest`, and `xo`.
- Keep generated exports and README workflows intact. If source entry metadata changes, regenerate through scripts rather than by editing generated artefacts directly.
- Vitest contract coverage should live under `test/contract/` so it runs in the normal green suite.
- TypeScript is running in strict `NodeNext` mode. Any new public modules must type-check cleanly under that baseline.
- Do not add runtime dependencies for this story.

### File Structure Requirements

- Expected source files to add or update for this story:
  - [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts)
  - `src/core/create-redactor.ts`
  - `src/core/validation/validate-config.ts`
  - `src/core/validation/validation-report.ts`
  - `src/types/public.ts`
  - `src/types/config.ts`
  - `src/types/paths.ts`
- Expected tests to add or update:
  - `test/contract/api/create-redactor.test.ts`
  - [test/contract/types/declarations.test.ts](/Users/ben.green/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/esm/index.mjs](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/esm/index.mjs)
  - [test/fixtures/consumers/cjs/index.cjs](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/cjs/index.cjs)
  - [test/fixtures/consumers/types/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
- Do not create `src/core/runtime/`, `src/adapters/`, or transformer modules yet unless a file is strictly necessary to support the factory contract in this story.

### Testing Requirements

- Add green-suite contract tests that prove `deepRedact(validOptions)` and `createRedactor(validOptions)` both return callable functions from the public package surface.
- Add a contract test that proves init-time validation happens when the factory is called, not lazily on the first payload invocation.
- Add contract tests proving the interim Story `1.2` redactor returns pass-through or configured serialised output without throwing solely because runtime targeting is still deferred.
- Add validation tests for the explicit conflicting combinations in this story: `remove + censor` and `remove + retainStructure`, at both the global config level and inside path-rule objects.
- Keep `test/build.test.ts` and the clean consumer fixtures green so the published root package surface remains stable.
- Extend clean consumer fixtures so the built ESM and CommonJS packages invoke both factories and assert that the returned values are callable redactors.
- Extend type fixtures to show the returned redactor is callable, that `paths` accepts string selectors and path-rule objects, and that `serialise` is the only public serialisation option with the supported type shape.
- Retained `test/unit/**` and `test/load/**` cases remain red-phase signals. Preserve them, but do not let them dictate the new v4 public contract.
- Verify with:
  - `pnpm run generate`
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run test:red-phase` (informational pressure only)

### Implementation Guardrails

- Keep `src/index.ts` declarative and thin; do not bury validation logic or interim runtime state inside the public facade.
- Do not import retained v3 utilities into the new v4 public surface just to save time. If a legacy helper is genuinely reused, document why and keep the v4 API names intact.
- Do not hand-edit generated `README.md` content or the package export map.
- Do not reintroduce the legacy `DeepRedact` class, deep source-path exports, or class-oriented public naming.
- Do not add a second serialisation-option spelling to the v4 public surface.
- Do not implement exact-path, wildcard, recursive wildcard, regex-path, regex-property, substring, transformer, diagnostics, or console-adapter runtime behaviour in this story.
- Structure validation output so later stories can extend it consistently instead of replacing it with ad hoc thrown strings.

### Previous Story Intelligence

- Story `1.1` already established the scratch-derived v4 contributor baseline, the root-only `deepRedact` / `createRedactor` export surface, and deterministic generated-file workflows.
- Story `1.1` deliberately retained [src/types.ts](/Users/ben.green/Code/deep-redact/src/types.ts), [src/utils/index.ts](/Users/ben.green/Code/deep-redact/src/utils/index.ts), `test/unit/**`, `test/load/**`, and `test/bench/**` as brownfield pressure only. Do not mistake those files for the approved v4 shape.
- [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts) and the existing clean-consumer fixtures already enforce that the root package exposes only `deepRedact` and `createRedactor`. Extend that harness to prove the built factories return callable redactors rather than inventing a parallel one.
- [docs/adr/0001-scratch-v4-foundation-transplant.md](/Users/ben.green/Code/deep-redact/docs/adr/0001-scratch-v4-foundation-transplant.md) records which scaffold conventions were adopted, adapted, or intentionally rejected. Use it if you need to justify why a retained brownfield file should still not drive the v4 design.
- Story `1.1` noted that the current `xo` TypeScript path is unreliable under this exact stack, so `tsc --noEmit` is still the main TypeScript quality gate. Work with that constraint instead of trying to fix the lint stack mid-story.

### Recent Git Intelligence

- Recent commits are still planning-only:
  - `eeda68c chore(architecture): destroy v3 to create template for v4`
  - `8474f40 docs(BMAD): create epics and stories`
  - `ada1034 docs(BMAD): create architecture`
  - `cd87097 docs(BMAD): create PRD`
- Treat the current repository state, Story `1.1`, and ADR `0001` as the authoritative implementation context. Commit history does not yet capture the local v4 foundation work.

### Latest Technical Information

- Node's official download page listed `v24.14.1` as the current LTS release when this story context was assembled on `2026-04-13`.
- Node's package documentation still describes the `packageManager` field as the package-manager recommendation leveraged by Corepack shims, which matches the repo baseline already established in Story `1.1`.
- Vitest's official configuration docs continue to use `defineConfig`, which matches the current [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts) setup and does not require a story-specific test-runner change here.

### Open Questions / Assumptions

- Assumption: Story `1.2` can expose string selectors and path-rule objects in public types before later stories implement richer selector execution, as long as runtime behaviour beyond init-time validation remains deferred.
- If the implementation accepts future-facing option fields for typing completeness, validation must still reject clearly invalid combinations now rather than silently ignoring them.

### Project Structure Notes

- The repository does not yet match the full target architecture. Story `1.2` should create only the minimal long-lived structure needed for public factory creation and validation.
- `src/types.ts` and `src/utils/**` remain present for brownfield continuity, but new v4 code should prefer `src/types/` and `src/core/`.
- `test/contract/` is now the correct home for green public-API coverage. Avoid putting new v4 coverage into `test/unit/` unless the intent is specifically to keep it in the red-phase lane.
- Any retained deviation from the architecture target should be deliberate and easy to justify from Story `1.1` or ADR `0001`.

### References

- Local planning artefacts
  - [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 1`, `Story 1.2`
  - [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architecture Decisions`, `Path Grammar & Selector Contract`, `Infrastructure & Deployment`, `Implementation Sequence`, `Implementation Patterns & Consistency Rules`, `Project Structure & Boundaries`
  - [prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `Executive Summary`, `Technical Constraints`, `Integration Requirements`, `Functional Requirements`
  - [sprint-status.yaml](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [1-1-establish-the-scratch-v4-foundation-and-brownfield-transplant-scaffold.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/1-1-establish-the-scratch-v4-foundation-and-brownfield-transplant-scaffold.md)
  - [0001-scratch-v4-foundation-transplant.md](/Users/ben.green/Code/deep-redact/docs/adr/0001-scratch-v4-foundation-transplant.md)
- Current repo files
  - [package.json](/Users/ben.green/Code/deep-redact/package.json)
  - [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts)
  - [src/types.ts](/Users/ben.green/Code/deep-redact/src/types.ts)
  - [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json)
  - [xo.config.js](/Users/ben.green/Code/deep-redact/xo.config.js)
  - [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts)
  - [vitest.red-phase.config.ts](/Users/ben.green/Code/deep-redact/vitest.red-phase.config.ts)
  - [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts)
  - [test/contract/exports/import.test.ts](/Users/ben.green/Code/deep-redact/test/contract/exports/import.test.ts)
  - [test/contract/exports/require.test.ts](/Users/ben.green/Code/deep-redact/test/contract/exports/require.test.ts)
  - [test/contract/support/package-fixture.ts](/Users/ben.green/Code/deep-redact/test/contract/support/package-fixture.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben.green/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
- Official external sources checked on 2026-04-13
  - Node download page: https://nodejs.org/en/download/
  - Node packages / `packageManager` field: https://nodejs.org/download/release/v16.17.1/docs/api/packages.html
  - Vitest config docs: https://vitest.dev/config/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Drive Story `1.2` with contract-first tests for factory creation, alias behaviour, validation, and the interim serialise-only runtime contract.
- Move the reusable factory into `src/core/` while keeping `src/index.ts` as a thin public facade over the v4 surface.
- Add dedicated public type and validation modules, then verify the green suite and retained red-phase pressure without reviving the legacy class API.

### Debug Log References

- Story context assembled from BMAD workflow inputs on `2026-04-13T12:30:16+0100`.
- Previous story intelligence extracted from Story `1.1` and ADR `0001`.
- No `project-context.md` file or UX planning artefact was present in `_bmad-output`.
- Current repo state reviewed across the root package metadata, v4 facade, retained v3 types/utilities, contract fixtures, and toolchain configs.
- Official Node and Vitest documentation was checked on `2026-04-13` to confirm the existing contributor baseline still aligns with upstream guidance.
- Added failing contract and fixture coverage first, confirming the placeholder factory and missing init-time validation failed Story `1.2` expectations.
- Implemented the reusable factory in `src/core/create-redactor.ts`, added explicit init-time validation under `src/core/validation/`, and moved the public v4 source of truth into `src/types/`.
- `pnpm run lint` passed in the default environment; `pnpm run test` passed under Node `v24.14.1` after the default Node `v20.19.1` runtime failed on `--experimental-strip-types`.
- `pnpm run test:red-phase` was executed under Node `v24.14.1` as an informational pressure check and still fails only in retained legacy suites expecting the removed `DeepRedact` class (`test/unit/index.test.ts`, `test/load/redact.test.ts`).

### Completion Notes List

- Replaced the throwing placeholder with a reusable service-root factory that initialises once per config and returns a non-throwing callable redactor with pass-through or configured serialisation behaviour.
- Added dedicated v4 public types for `serialise`, `paths`, and the callable redactor contract, plus explicit init-time validation with structured error reporting for malformed options and conflicting `remove` combinations.
- Extended contract, built-consumer, and declaration fixtures so ESM, CommonJS, and TypeScript consumers all prove the callable factory surface and supported option typing.
- Verified generated artefacts were already current, so `pnpm run generate` was not required for this story.
- Green verification passed with `pnpm run lint` and `pnpm run test` under Node `v24.14.1`; retained red-phase failures remain limited to legacy v3 `DeepRedact` constructor expectations.

### File List

- _bmad-output/implementation-artifacts/1-2-create-and-validate-a-reusable-service-redactor.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/create-redactor.ts
- src/core/validation/validate-config.ts
- src/core/validation/validation-report.ts
- src/index.ts
- src/types/config.ts
- src/types/paths.ts
- src/types/public.ts
- test/contract/api/create-redactor.test.ts
- test/contract/exports/import.test.ts
- test/contract/exports/require.test.ts
- test/fixtures/consumers/cjs/index.cjs
- test/fixtures/consumers/esm/index.mjs
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts

### Change Log

- `2026-04-13`: Created the Story `1.2` implementation brief, captured previous-story learnings and current brownfield constraints, and set sprint status to `ready-for-dev`.
- `2026-04-13`: Tightened the Story `1.2` factory contract around `paths`, `serialise`, non-throwing interim callable behaviour, and built-fixture invocation coverage.
- `2026-04-13`: Implemented the reusable v4 redactor factory, added explicit public types and init-time validation, extended contract and consumer coverage, and advanced the story to `review`.
- `2026-04-13`: Fixed the review finding that path-rule overrides were not inheriting global defaults during init-time validation and plan compilation, added regression coverage for inherited conflicts, and advanced the story to `done`.
