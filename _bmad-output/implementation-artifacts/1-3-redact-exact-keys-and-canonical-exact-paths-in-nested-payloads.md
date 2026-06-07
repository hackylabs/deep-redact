# Story 1.3: Redact Exact Keys and Canonical Exact Paths in Nested Payloads

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one service redactor to target exact key names and canonical exact root-relative object paths,
so that I can protect predictable sensitive fields across nested payloads without altering unrelated data.

## Acceptance Criteria

1. Given exact static path selectors are configured at initialisation, when the redactor factory normalises them, then every selector is canonicalised into one internal root-relative form before any redaction occurs.
2. Given two exact path selectors collapse to the same canonical selector, when the factory initialises, then initialisation fails fast with a duplicate-selector validation error, and no redactor is created.
3. Given exact path selectors use dot or bracket notation for array indices, when they are canonicalised, then `users[0].email` and `users.0.email` are treated as equivalent canonical forms, and array indices match literally, so index `0` does not match any other index.
4. Given exact-key selectors are configured through `keys` at initialisation, when an exact-key rule matches a configured key name, then every value under that exact key is redacted wherever it occurs in the nested structure.
5. Given a payload where the same leaf matches both an exact-path rule and an exact-key rule, when redaction runs, then the exact-path rule takes precedence, and that leaf is redacted once only.
6. Given a payload containing both targeted and non-targeted sibling fields, when redaction runs, then only targeted values are redacted, and non-targeted sibling values remain unchanged in the returned result.
7. Given one reusable redactor configured with both `keys` and `paths`, when it is invoked on a payload, then both rule types are applied in one redaction pass, and one redacted result is returned to the caller.
8. Given configuration includes wildcard segments, recursive wildcards, exclusion segments, or regex-based key or path matching, when the factory initialises, then initialisation fails with an unsupported-selector validation error, and those selector types remain deferred to later stories in Epic `1`.

## Tasks / Subtasks

- [x] Introduce canonical exact-selector parsing, normalisation, and validation at init time (AC: 1, 2, 3, 8)
  - [x] Add architecture-aligned matching utilities under `src/core/matching/`, such as `path-parser.ts` and `path-normaliser.ts`, that accept only exact root-relative string selectors for this story, preserve exact quoted-property segments such as `headers["x-api-key"]`, and canonicalise bracket-index forms to the same internal dot-path representation.
  - [x] Extend the validation layer with story-specific selector semantics, preferably via `src/core/validation/validate-paths.ts`, so unsupported wildcard, recursive wildcard, exclusion, regex, empty-segment, and otherwise unsafe selector forms fail during factory creation rather than at runtime, while exact quoted-property string selectors remain supported.
  - [x] Detect duplicate exact-path selectors after canonicalisation and surface a structured validation error through the existing `ValidationReport` / `DeepRedactValidationError` flow instead of ad hoc thrown strings.
  - [x] Finalise `keys` as the canonical v4 exact-key option in `src/types/` and validation. In Story `1.3`, accept literal string entries only, inherit the existing global `censor` / `remove` / `retainStructure` defaults, and treat later regex-property, fuzzy, and case-insensitive work as widening this same surface rather than reviving `blacklistedKeys`.

- [x] Compile immutable exact-path and exact-key rule tables once per redactor instance (AC: 1, 2, 3, 7, 8)
  - [x] Evolve `src/core/create-redactor.ts` from storing raw `paths` entries to delegating compilation work into `src/core/compiler/`, with clear separation between exact string-path rules, exact `keys` rules, and compiled global defaults.
  - [x] Preserve Story `1.2`'s per-path override semantics by merging path-rule overrides over compiled global defaults for the matched rule only, while keeping the resulting policy immutable and reusable across calls.
  - [x] Ensure no selector parsing, canonicalisation, or rule merging happens inside the callable `redact(value)` path after successful initialisation.

- [x] Implement the first nested runtime redaction lane for exact paths and exact keys (AC: 4, 5, 6, 7)
  - [x] Introduce the minimal runtime modules needed under `src/core/runtime/` and `src/core/replacement/` so exact-path hits and exact-key hits are resolved within one invocation and return one structured result.
  - [x] Use canonical current-path tracking so exact-path matches are resolved before exact-key matches on the same leaf, and ensure that overlapping matches redact the leaf once only.
  - [x] Traverse nested objects and arrays without mutating the caller's source payload, preserve non-targeted siblings, and keep exact array indexes literal so `0` matches only index `0`.
  - [x] Keep `serialise` as the final output-shaping step after structured redaction rather than a separate traversal mode.

- [x] Add focused behavioural and grammar coverage for the new runtime slice (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Add green public-behaviour coverage under `test/contract/api/` for exact-key matching through `keys`, exact-path canonicalisation, duplicate canonical selector rejection, exact-path precedence over exact-key matches, sibling preservation, and unsupported legacy root options such as `blacklistedKeys`.
  - [x] Add narrow parser / normaliser / compiler coverage under `test/unit/**` for dot-vs-bracket equivalence, quoted-key parsing where string selectors remain exact, invalid empty segments, unsupported wildcard or regex selector rejection, and duplicate canonical selector detection.
  - [x] Extend the declaration and consumer type fixtures so `keys` is discoverable to ESM and CommonJS TypeScript consumers and `blacklistedKeys` remains rejected as an unsupported legacy alias.

- [x] Verify the story within the current v4 contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Run `pnpm run generate` if public types, exports, or generated README inputs change.
  - [x] Run `pnpm run lint` and `pnpm run test` under Node `24.14.1`.
  - [x] Run `pnpm run test:red-phase` as retained pressure only, and record any remaining failures separately from the green contract gate.

### Review Findings

- [x] [Review][Patch] Resolve the exact-key public surface to `keys` so Story `1.3` is implementable without inventing a new v4 API.
- [x] [Review][Patch] Clarify that exact string selectors may include exact quoted property segments, keeping Story `1.3` aligned with the architecture's published string-selector grammar.
- [x] [Review][Patch] Prototype-named root keys can crash runtime traversal [src/core/compiler/compile-redactor-plan.ts:74]
- [x] [Review][Patch] `keys` accepts unsupported wildcard, exclusion, and regex-style selectors [src/core/validation/validate-config.ts:112]
- [x] [Review][Patch] Sparse arrays lose untouched holes after unrelated redaction [src/core/runtime/redact-value.ts:94]

## Dev Notes

### Story Intent

- Story `1.3` is the first runtime-behaviour story in the v4 rewrite.
- It should move the redactor from Story `1.2`'s pass-through or serialise-only callable to real nested redaction, but only for exact key names and canonical exact root-relative paths.
- The core goal is precision: target the requested leaves, preserve safe sibling data, and reject unsupported selector forms up front instead of silently broadening scope.

### Technical Requirements

- Exact static path selectors must be canonicalised during initialisation into one internal root-relative representation before any payload is redacted.
- Canonical exact-path collisions must fail fast during initialisation; duplicate selectors are invalid even if they were written in different syntactic forms such as `users[0].email` and `users.0.email`.
- Exact string selectors in this story may include quoted property segments only for literal property names that cannot be represented safely as bare dot segments, such as `headers["x-api-key"]`; quoted-property support remains exact-only and must not be treated as wildcard or matcher syntax.
- Exact-key matching in this story is literal only. Regex property matching remains deferred to Story `1.5`, and fuzzy or case-insensitive literal key matching remains deferred to Story `2.6`.
- `keys` is the canonical v4 public option for exact-key targeting in this story. It accepts literal string entries only for now, inherits the already supported global replacement defaults, and is the same surface later stories must widen for regex-property and matching-option support.
- Exact-path rules must outrank exact-key rules on the same leaf, and the runtime must redact that leaf once only.
- One redactor instance must apply both exact-path and exact-key rules in one invocation and return one result.
- Non-targeted siblings must remain intact in the returned structure.
- After successful initialisation, supported object and array payloads must not throw during redaction.
- Runtime output must remain one-way only; do not introduce restore metadata, reversible output, or mutation modes.
- `serialise` remains the only public serialisation option and stays a final output adapter after structured redaction.
- Unsupported selector forms for this story include wildcard segments, recursive wildcards, ignore segments, regex-based property matching, regex-based path-segment matching, structured selector objects, and any unsafe or ambiguous exact-path syntax.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts) as the thin public facade. New runtime and compiler behaviour belongs under `src/core/`.
- Align new code with the architecture target by introducing only the minimal long-lived slices this story needs:
  - `src/core/compiler/` for immutable rule-plan compilation
  - `src/core/matching/` for selector parsing and canonicalisation
  - `src/core/runtime/` for invocation-time traversal and exact-path execution
  - `src/core/replacement/` for applying censor or removal semantics
  - `src/core/validation/` for structural and semantic init-time rejection
- Keep the core runtime zero-runtime-dependency and free of Node-only APIs.
- Exact-path behaviour should lay the groundwork for the architecture's fast lane, but the optimisation must not change observable precedence or output semantics.
- Use canonical dot-path syntax consistently in internal rule plans, diagnostics, fixtures, and tests.
- Preserve the one-way dependency direction described in the architecture: validation and matching may support compiler work, compiler feeds runtime, and core runtime must not depend on optional adapters.

### Current Brownfield Constraints

- [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts) currently compiles only global defaults, raw `paths` entries, and `serialise`, then returns the input payload unchanged apart from optional serialisation.
- [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts) currently validates only object shape, supported option names, and `remove` conflict combinations. It does not yet canonicalise selectors, detect duplicates, or distinguish supported exact selectors from future selector forms.
- [src/types/config.ts](/Users/ben.green/Code/deep-redact/src/types/config.ts), [src/types/paths.ts](/Users/ben.green/Code/deep-redact/src/types/paths.ts), and [src/types/public.ts](/Users/ben.green/Code/deep-redact/src/types/public.ts) are now the v4 public contract source of truth. Extend these modules rather than rebuilding inline types in the facade.
- The current v4 public config does not expose any exact-key option yet. Story `1.3` must add `keys` to the v4 contract, re-export any supporting key types from `src/types/public.ts`, and wire validation through `src/core/validation/validate-config.ts` rather than leaning on retained v3 `blacklistedKeys`.
- [src/types.ts](/Users/ben.green/Code/deep-redact/src/types.ts) and [src/utils/index.ts](/Users/ben.green/Code/deep-redact/src/utils/index.ts) still describe retained v3 concepts such as `DeepRedact`, `replacement`, and `blacklistedKeys`. Treat them as migration pressure and reference material only, not as the v4 implementation source of truth.
- The green suite currently covers [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts) and `test/contract/**/*.test.ts` only. [vitest.red-phase.config.ts](/Users/ben.green/Code/deep-redact/vitest.red-phase.config.ts) still runs `test/unit/**` and `test/load/**` as an informational retained lane.
- The local shell runtime is currently Node `v20.19.1`, while [.nvmrc](/Users/ben.green/Code/deep-redact/.nvmrc) pins the contributor baseline to `24.14.1`. Story verification that depends on `node --experimental-strip-types` should be executed under the pinned baseline, not the incidental shell default.
- No `project-context.md` file or UX planning artefact was present in `_bmad-output`.

### Library / Framework Requirements

- Contributor baseline remains:
  - Node `24.14.1`
  - `pnpm@10.33.0`
  - `tsdown@0.21.7`
  - `Vitest 4.1.4`
  - `xo`
- Node's official release page listed `v24.14.1` as the latest LTS release on `2026-04-13`, with `v25.9.0` listed as the latest Current release. The repo baseline is therefore still aligned with upstream LTS guidance.
- Vitest's official docs and blog both currently show `v4.1.4`, and the March `2026` `Vitest 4.1` announcement confirms the repo's dedicated `vitest.config.ts` approach remains current.
- The official `tsdown` site currently shows `v0.21.7`, which matches the repo baseline established in Story `1.1`.
- Do not spend this story changing build or test tool versions unless a blocker is proven. The story is about runtime capability, not toolchain churn.
- Keep ESM-first source patterns and explicit `.js` import specifiers in TypeScript source modules.

### File Structure Requirements

- Keep the root entrypoint at [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts).
- Prefer the architecture's target folders for new work instead of adding more logic back into the existing flat files:
  - `src/core/compiler/`
  - `src/core/matching/`
  - `src/core/runtime/`
  - `src/core/replacement/`
  - `src/core/validation/`
  - `src/types/`
- Keep tests in `test/`, not under `src/`.
- Continue treating `dist/` as disposable generated output, never as the source of truth.

### Testing Requirements

- Add contract tests that prove exact-key matches redact nested objects and arrays regardless of depth when the key name matches literally.
- Add contract tests that prove exact-path selectors canonicalise deterministically and reject duplicates after canonicalisation.
- Add contract tests that prove exact-path matches outrank exact-key matches on the same leaf and redact that leaf once only.
- Add contract tests that prove non-targeted sibling values remain unchanged in the returned result.
- Add contract and declaration-fixture coverage that `keys` is the canonical exact-key option and that `blacklistedKeys` remains rejected as an unsupported v3-era alias.
- Add unit tests for selector parsing and canonicalisation details such as:
  - bracket vs dot index equivalence
  - quoted-key handling for exact string selectors where supported
  - unsupported wildcard, recursive wildcard, ignore, and regex selector rejection
  - duplicate canonical selector detection
- Keep [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts), [test/contract/exports/import.test.ts](/Users/ben.green/Code/deep-redact/test/contract/exports/import.test.ts), [test/contract/exports/require.test.ts](/Users/ben.green/Code/deep-redact/test/contract/exports/require.test.ts), and [test/contract/types/declarations.test.ts](/Users/ben.green/Code/deep-redact/test/contract/types/declarations.test.ts) green.
- Verify with:
  - `pnpm run generate` if generated artefacts change
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run test:red-phase` (informational retained pressure only)

### Implementation Guardrails

- Do not reintroduce the legacy `DeepRedact` class or deep source-path public exports.
- Do not silently pull Story `1.4`, `1.5`, `1.6`, or Epic `2` scope into this implementation. Wildcards, recursive wildcards, ignore segments, regex property rules, regex path segments, substring targeting, and root-primitive targeting remain out of scope here.
- Do not parse or canonicalise selectors on every payload invocation. Compile once at initialisation.
- Do not mutate the caller's input object in place or expose a user-visible mutation mode.
- Do not rely on `structuredClone` or other full-graph clone shortcuts on the hot path.
- Do not import retained v3 utilities into the v4 runtime just because they look close. If a legacy helper is genuinely reused, document why and keep the new v4 surface authoritative in `src/types/` and `src/core/`.
- Do not add American-English aliases such as `serialize`.
- Do not reintroduce `blacklistedKeys` as a public alias, temporary bridge, or internal source of truth. `keys` is the canonical v4 surface for this story and later key-targeting stories must extend it rather than fork it.

### Previous Story Intelligence

- Story `1.2` already established the reusable factory boundary, the `ValidationReport` / `DeepRedactValidationError` pattern, and dedicated public type modules under `src/types/`.
- Story `1.2` deliberately stopped before runtime targeting. Its callable redactor is currently a safe pass-through or serialise-only function, which makes `src/core/create-redactor.ts` the correct extension point for compiled policy hand-off into runtime execution.
- Story `1.2` review feedback already proved one subtle validation rule: inherited global defaults must participate in per-path conflict checking. Reuse that discipline when exact-key defaults and exact-path defaults start sharing precedence and replacement semantics.
- Story `1.2` also kept the green consumer contract strong across ESM, CommonJS, and declaration fixtures. Any new public exact-key option must be reflected there instead of being introduced only in runtime tests.
- Story `1.1` and ADR `0001` confirmed that retained v3 files exist for migration pressure only. They should not drag the new runtime back toward the old class-oriented implementation.

### Recent Git Intelligence

- Recent implementation commits now provide real extension points:
  - `29bb954 feat: create and validate a reusable service redactor`
  - `3a85e78 fix: lint errors`
  - `eeda68c chore(architecture): destroy v3 to create template for v4`
- Commit `29bb954` introduced the exact files Story `1.3` should extend rather than replace:
  - `src/core/create-redactor.ts`
  - `src/core/validation/validate-config.ts`
  - `src/core/validation/validation-report.ts`
  - `src/types/config.ts`
  - `src/types/paths.ts`
  - `src/types/public.ts`
  - `test/contract/api/create-redactor.test.ts`
  - the ESM / CommonJS / declaration consumer fixtures
- Commit `3a85e78` was only a small clean-up in validation and factory code. Treat the current repository state as authoritative over the older planning-only commit history.

### Latest Technical Information

- Node's official release page listed `Node.js 24.14.1 (LTS)` on `2026-03-24`, and still labels `v24.14.1` as the latest LTS on `2026-04-13`. That matches the repo's pinned contributor baseline and reinforces using Node `24.14.1` for story verification.
- Vitest's official docs currently show `v4.1.4`, and the official Vitest blog lists `Announcing Vitest 4.1` on `2026-03-12`. The current dedicated [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts) setup remains aligned with upstream guidance.
- The official `tsdown` site currently shows `v0.21.7`, which matches the baseline adopted in Story `1.1`. No story-specific bundler migration is indicated.

### Open Questions / Assumptions

- Resolved during validation: use `keys` as the canonical v4 top-level exact-key option. Treat Epic `2.6`'s `blacklistedKeys` wording as legacy planning drift and extend `keys` in later key-targeting stories instead of reviving the v3 API name.
- Assume canonical internal path strings use dot notation with numeric index segments, while quoted-property rendering is reserved for cases where diagnostics would otherwise be ambiguous.
- Assume exact string selectors in this story remain root-relative and literal only. Structured selector arrays, regex segments, and matcher objects remain deferred even if the future architecture allows them.

### Project Structure Notes

- The repository still has only the minimal v4 slices created in Story `1.2`. Story `1.3` is the right point to introduce the first compiler, matching, runtime, and replacement subdirectories under `src/core/`.
- `test/unit/**` is still part of the retained red-phase lane, not the default green `pnpm run test` lane. New v4 unit tests may live there, but developers should remember that the red-phase command still includes intentionally failing legacy suites.
- Generated files and build output should remain side effects of scripts, not manually edited implementation targets.

### References

- Local planning artefacts
  - [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 1`, `Story 1.3`, `Story 1.4`, `Story 1.5`, `Story 2.6`
  - [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `API & Communication Patterns`, `Path Grammar & Selector Contract`, `Implementation Patterns & Consistency Rules`, `Project Structure & Boundaries`, `Decision Impact Analysis`
  - [prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `Technical Constraints`, `Integration Requirements`, `Risk Mitigations`, `Targeted Redaction Coverage`, `Precise Output Behaviour`, `Non-Functional Requirements`
  - [sprint-status.yaml](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [1-1-establish-the-scratch-v4-foundation-and-brownfield-transplant-scaffold.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/1-1-establish-the-scratch-v4-foundation-and-brownfield-transplant-scaffold.md)
  - [1-2-create-and-validate-a-reusable-service-redactor.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/1-2-create-and-validate-a-reusable-service-redactor.md)
  - [0001-scratch-v4-foundation-transplant.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/0001-scratch-v4-foundation-transplant.md)
- Current repo files
  - [package.json](/Users/ben.green/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben.green/Code/deep-redact/.nvmrc)
  - [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts)
  - [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/core/validation/validation-report.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validation-report.ts)
  - [src/types/config.ts](/Users/ben.green/Code/deep-redact/src/types/config.ts)
  - [src/types/paths.ts](/Users/ben.green/Code/deep-redact/src/types/paths.ts)
  - [src/types/public.ts](/Users/ben.green/Code/deep-redact/src/types/public.ts)
  - [src/types.ts](/Users/ben.green/Code/deep-redact/src/types.ts)
  - [src/utils/index.ts](/Users/ben.green/Code/deep-redact/src/utils/index.ts)
  - [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts)
  - [vitest.red-phase.config.ts](/Users/ben.green/Code/deep-redact/vitest.red-phase.config.ts)
  - [test/build.test.ts](/Users/ben.green/Code/deep-redact/test/build.test.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben.green/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben.green/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben.green/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
- Official external sources checked on `2026-04-13`
  - Node release page: https://nodejs.org/en/blog/release
  - Vitest guide: https://vitest.dev/guide/
  - Vitest blog: https://v4.vitest.dev/blog
  - tsdown home: https://tsdown.dev/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Finalise one canonical exact-selector story slice by compiling exact paths and exact keys into immutable init-time policy state.
- Introduce the first runtime traversal and replacement modules under `src/core/` so exact-path and exact-key rules execute in one deterministic pass with path precedence.
- Lock the behaviour down with contract tests for public API outcomes and unit tests for selector grammar and canonicalisation.

### Debug Log References

- Story context assembled from BMAD workflow inputs on `2026-04-13T14:48:00+0100`.
- Previous story intelligence extracted from Stories `1.1` and `1.2`, ADR `0001`, current source files, and recent git history.
- No `project-context.md` file or UX planning artefact was present in `_bmad-output`.
- Local shell runtime observed as Node `v20.19.1` with `pnpm v10.33.0`; repo baseline remains Node `24.14.1` from `.nvmrc`.
- Official Node, Vitest, and tsdown sources were checked on `2026-04-13` to confirm the current contributor baseline still aligns with upstream releases and docs.
- `PATH=$HOME/.nvm/versions/node/v24.14.1/bin:$PATH pnpm run generate` passed on `2026-04-13`.
- `PATH=$HOME/.nvm/versions/node/v24.14.1/bin:$PATH pnpm run lint` passed on `2026-04-13`.
- `PATH=$HOME/.nvm/versions/node/v24.14.1/bin:$PATH pnpm run test` passed on `2026-04-13` with `35/35` contract and build checks green.
- `PATH=$HOME/.nvm/versions/node/v24.14.1/bin:$PATH pnpm run test:red-phase` failed only in retained legacy suites `test/load/redact.test.ts` and `test/unit/index.test.ts`, both still expecting the removed `DeepRedact` class; new Story `1.3` unit coverage passed.

### Completion Notes List

- Implemented canonical exact-path parsing and normalisation, exact-selector semantic validation, duplicate canonical-path rejection, and the new `keys` public option for literal exact-key targeting.
- Replaced the Story `1.2` pass-through callable with compiled exact-path and exact-key rule plans plus a first nested runtime traversal that preserves siblings, applies exact-path precedence, and keeps `serialise` as the final output adapter.
- Added contract and unit coverage for exact-key behaviour, path canonicalisation, duplicate-selector rejection, unsupported selector rejection, and consumer type discoverability, then verified the story with `generate`, `lint`, `test`, and an informational red-phase run under Node `24.14.1`.

### File List

- _bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/compiler/compile-redactor-plan.ts
- src/core/create-redactor.ts
- src/core/matching/path-normaliser.ts
- src/core/matching/path-parser.ts
- src/core/replacement/apply-redaction.ts
- src/core/runtime/redact-value.ts
- src/core/validation/validate-config.ts
- src/core/validation/validate-paths.ts
- src/types/config.ts
- test/contract/api/create-redactor.test.ts
- test/fixtures/consumers/cjs/index.cjs
- test/fixtures/consumers/esm/index.mjs
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts
- test/unit/core/matching/path-normaliser.test.ts

### Change Log

- `2026-04-13`: Implemented Story `1.3` exact-key and canonical exact-path redaction across compiler, matching, validation, runtime, replacement, and verification coverage.
