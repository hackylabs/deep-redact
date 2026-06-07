# Story 3.1: Redact a Canonical Nested Mixed Payload Without Post-Init Runtime Throws

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one compiled redactor to process a canonical nested mixed payload in a single pass,
so that supported production payloads can be redacted safely without pre-normalising their shape.

## Acceptance Criteria

1. Given a redactor has been successfully initialised, when it is invoked on a canonical supported fixture containing nested objects and arrays with supported leaf values limited to `string`, `number`, `boolean`, `null`, and `undefined`, then redaction completes without throwing, and one redacted result is returned.
2. Given the canonical fixture contains both targeted and non-targeted branches, when redaction runs, then targeted leaves are redacted according to the configured rules, and non-targeted sibling leaves remain unchanged in the returned result.
3. Given the canonical fixture contains nested arrays within objects and nested objects within arrays, when redaction runs, then the same targeting rules apply consistently across all nested branches in one invocation.
4. Given the canonical fixture includes at least one targeted field in an object-in-array branch and at least one targeted field in an array-in-object branch, when redaction runs, then both branches are redacted correctly within the same returned result.
5. Given the same compiled redactor is invoked sequentially on two different instances of the canonical supported fixture, when the second call runs, then it is evaluated independently of the first call, and no traversal state, cursor position, or branch-visitation state bleeds across invocations.
6. Given this story’s scope, when the implementation is reviewed, then circular references, transformed runtime values, custom transformers, ignored types, and localised `[UNSUPPORTED]` degradation remain out of scope for this story.

## Tasks / Subtasks

- [x] Add canonical mixed-payload integration coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add a dedicated `describe('canonical nested mixed payload traversal')` block that builds a supported fixture containing nested objects, nested arrays, object-in-array branches, array-in-object branches, and leaf values spanning `string`, `number`, `boolean`, `null`, and `undefined`.
  - [x] Use one compiled redactor that exercises the existing v4 targeting surface together in one pass: exact path, dynamic path, literal exact-key matching, regex-key matching, retained inherited path policy where relevant, and substring replacement where relevant. Use explicit markers such as `[EXACT-PATH]`, `[DYNAMIC-PATH]`, `[EXACT-KEY]`, `[REGEX-KEY]`, and `[SUBSTRING]` so failures identify the winning tier immediately.
  - [x] Assert both targeted branches and untouched sibling branches in the same returned result, including at least one object-in-array hit and one array-in-object hit.
  - [x] Add a repeated-invocation test that runs the same compiled redactor against two distinct fixture instances and proves the second call is independent of the first, still hits the regex-key and substring branches deterministically, and leaves the original inputs unchanged.

- [x] Preserve supported mixed-payload traversal semantics in the runtime without widening Epic `3` scope (AC: 1, 2, 3, 4, 5, 6)
  - [x] Keep [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) as the primary execution seam for plain-object and array traversal, target selection, replacement, and leaf handling unless a smaller private helper extraction is clearly warranted by failing tests.
  - [x] Keep [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) compile-once behaviour intact: configuration is validated and compiled at initialisation, while payload traversal state remains local to each invocation.
  - [x] Preserve the established precedence ladder inside the canonical integration fixture: exact path > dynamic path > inherited retained path > exact key > regex key > substring.
  - [x] Preserve non-mutating traversal, sibling preservation, removal semantics, retain-structure semantics, sparse-array behaviour, and `serialise` as the final output adapter rather than a traversal mechanism.

- [x] Keep the Story `3.1` supported-input boundary explicit (AC: 1, 5, 6)
  - [x] Treat only plain objects, arrays, and supported primitive leaves (`string`, `number`, `boolean`, `null`, `undefined`) as in-scope for the canonical fixture in this story.
  - [x] Do not start circular-reference handling, alias revisit caches, transformer resolution, ignored-value-type bypass, diagnostics sinks, traversal budgets, or `[UNSUPPORTED]` degradation here. Those belong to Stories `3.2` to `3.5`.
  - [x] Do not widen public options, type exports, or validation rules unless a failing Story `3.1` supported-input case proves a genuine contract gap.

- [x] Prepare only the minimum internal seams needed for later Epic `3` work (AC: 5, 6)
  - [x] If the current runtime needs refactoring to keep per-invocation state explicit, limit it to small private helpers under `src/core/runtime/` or adjacent v4 internal modules. Do not introduce a full identity-tracker, transformer-registry, or diagnostics subsystem in this story.
  - [x] Keep any new helper names and file placement aligned with the architecture boundaries under `src/core/`, and keep ESM `.js` import specifiers in TypeScript source.
  - [x] Avoid speculative abstractions. Story `3.1` should harden the supported nested mixed-payload baseline, not pre-implement later Epic `3` concerns.

- [x] Verify within the current contributor baseline (AC: 1, 2, 3, 4, 5)
  - [x] Run `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` while iterating on Story `3.1`.
  - [x] If runtime code changes, run `pnpm run lint` and `pnpm run test`.
  - [x] Run `pnpm run test:red-phase` and record any retained failures separately from Story `3.1` behaviour.
  - [x] Run `pnpm run build` only if source changes require regenerated `dist/` output.

### Review Findings

- [x] [Review][Patch] Add explicit non-aliasing assertions for the redacted results [test/contract/api/create-redactor.test.ts:1246]
- [x] [Review][Patch] Remove Story `3.1` work-item naming from the public contract test block [test/contract/api/create-redactor.test.ts:1049]

## Dev Notes

### Story Intent

- Story `3.1` is the integration baseline for Epic `3`. Its job is to prove that the current compiled v4 redactor can traverse a canonical supported nested payload safely, deterministically, and without post-init runtime throws.
- This story is intentionally narrower than FR16’s eventual end state. It does not yet claim support for circular references, transformed runtime values, ignored types, custom transformers, or localised `[UNSUPPORTED]` degradation.
- The value here is locking the supported plain-object and array runtime baseline before Epic `3` expands into identity tracking, transformer handling, and failure isolation.

### Current Runtime Intelligence

- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) already traverses plain objects and arrays, resolves exact-path, dynamic-path, exact-key, regex-key, and substring matches, and applies replacement through [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts).
- The current runtime is still recursive and treats only plain objects and arrays as traversable containers. That is acceptable for Story `3.1`, but it means this story must not imply support for cycles, revisited identities, or transformed runtime objects yet.
- [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) already gives the correct compile-once boundary: validation and plan compilation happen once at initialisation, and `serialise` remains a final formatting step after runtime execution.
- The existing contract suite already proves individual capabilities in isolation: exact-path and exact-key traversal, wildcard path traversal, substring handling, root primitive behaviour, retained-structure semantics, and repeated invocation of one compiled redactor. Story `3.1` should add the missing integrated mixed-payload baseline rather than re-proving each capability separately.

### Technical Requirements

- The canonical Story `3.1` fixture should include:
  - nested objects within arrays
  - nested arrays within objects
  - at least one exact-path or dynamic-path targeted branch
  - at least one literal exact-key targeted branch and at least one regex-key targeted branch
  - at least one nested string leaf that proves substring replacement still happens only after higher-precedence targeting has not claimed that leaf
  - untouched siblings with `number`, `boolean`, `null`, and `undefined` leaves that remain unchanged
- The same compiled redactor must be able to process the entire fixture in one call without any caller-side pre-normalisation or per-branch wrapper logic.
- Repeated calls must be independent. A prior invocation must not leak matched-path state, inherited policy state, array index progress, regex matcher position, or other traversal state into the next invocation.
- Keep structured output assertions as the primary proof for this story. If a serialised assertion is added, treat it as secondary because `JSON.stringify()` omits `undefined` object properties, converts `undefined` array elements to `null`, and throws on `BigInt` and circular references.
- Do not treat transformed values as already supported just because they are present in retained v3 utilities under [src/utils/](/Users/ben/Code/deep-redact/src/utils). Story `3.1` belongs wholly in the v4 `src/core/**` surface.

### Architecture Compliance

- Keep the current two-lane architecture intent intact:
  - exact canonical path lookups remain the fast lane
  - generic nested traversal remains the fallback lane for dynamic paths, key rules, substring rules, and later hostile-shape handling
- Do not use `structuredClone` or any other full-graph clone shortcut on the runtime hot path. The architecture explicitly rules that out, and later Epic `3` stories depend on identity-aware traversal semantics that deep cloning would undermine.
- Preserve the layer boundaries already described in the architecture:
  - `validation/` owns init-time config acceptance
  - `compiler/` owns immutable plan generation
  - `runtime/` owns traversal and target resolution
  - `replacement/` owns output shaping
- Any preparatory refactor in this story should stay private, local, and proportionate. Story `3.1` should not introduce the future `src/transformers/`, diagnostics, or adapter boundaries ahead of need.

### Library / Framework Requirements

- Use the pinned repo baseline, not registry latest, unless a proven toolchain defect blocks the work:
  - Node `24.14.1` from `.nvmrc`
  - package engine floor Node `>=22.18.0`
  - `pnpm@10.33.0`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Treat newer registry releases as out of scope for Story `3.1`; this story is about supported mixed-payload runtime semantics, not a toolchain refresh.
- Keep ESM source conventions and explicit `.js` import specifiers in TypeScript source modules.
- Do not add runtime dependencies for traversal, cloning, or canonical-fixture generation.

### Testing Requirements

- Add Story `3.1` coverage to [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts); that file is the authoritative green behavioural suite for the public v4 runtime contract.
- Prefer a local canonical fixture helper inside the contract file unless two or more Epic `3` stories clearly benefit from a shared test helper. Avoid premature fixture-module churn.
- Assert both value correctness and shape correctness:
  - targeted leaves change to the expected marker
  - untouched siblings stay byte-for-byte or structurally equal as appropriate
  - the returned result is separate from the caller-owned input where a change occurs
  - the original fixture remains unchanged after each invocation
- Add at least one repeated-call assertion with two different fixture instances so traversal-state isolation is proven by behaviour, not only by code inspection.
- Keep the existing green suites in [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts), [test/contract/exports/import.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/import.test.ts), [test/contract/exports/require.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/require.test.ts), and [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts) passing.

### Implementation Guardrails

- Do not implement circular markers, `WeakMap` or `WeakSet` identity tracking, revisited-subtree reuse, transformer pipelines, ignored-value-type handling, or local `[UNSUPPORTED]` substitution in Story `3.1`.
- Do not change the public v4 option names or add legacy aliases such as `serialize`, `replacement`, or `blacklistedKeys`.
- Do not reintroduce legacy `DeepRedact` class behaviour or import v3 runtime code back into the v4 engine.
- Do not use JSON serialisation as the execution mechanism for nested traversal correctness. It is only an output adapter and would hide `undefined` semantics that the structured runtime must preserve.
- Do not weaken the current precedence ladder or retarget substring logic so it can outrank path or key matches on the same leaf.

### Previous Story Intelligence

- Story `2.6` locked the current precedence behaviour for the v4 runtime: exact path > dynamic path > inherited retained path > exact key > regex key > substring. Story `3.1` should prove that the same ladder still holds inside one canonical mixed fixture.
- Story `2.4` separated root primitive string handling from nested traversal. Story `3.1` should stay focused on nested payload execution and should not fold root-primitive behaviour back into this mixed-payload baseline.
- Story `2.3` established substring replacement on nested string leaves only after higher-precedence target selection has not already claimed that leaf. The canonical fixture should keep that distinction visible.
- Story `2.1` hardened removal, retain-structure behaviour, sibling preservation, and non-mutating traversal. Story `3.1` must not regress those contracts when mixed nested branches are exercised together.
- Story `1.4` widened traversal across wildcard and repeated nested structures while preserving sparse-array behaviour and exact-path priority. Mixed array branches in Story `3.1` should reuse that runtime rather than introducing a second traversal concept.
- Story `1.3` established the first nested object and array traversal baseline plus canonical exact-path handling. Story `3.1` is a higher-level integration proof built on that same runtime foundation.

### Recent Git Intelligence

- Recent code changes show a consistent extension pattern:
  - `395c52c feat(API): optional fuzzy and case-insensitive matching for literal string key rules`
  - `e41c6fd feat(API): determinitic precedence across exact and structured, exact key and regex property, and substring rules`
  - `ab3448f feat(API): redact matching root primitive string inputs`
  - `2d0d6df feat(API): react matched substrings in nested string values`
- Those commits concentrated the behavioural work in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts), and [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts). Story `3.1` should follow the same surgical pattern.
- `cf9578c fix(BMAD): epic 2 is done` is planning-state only. The most relevant implementation guidance for Story `3.1` comes from the four feature commits above, not from planning-status churn.

### Latest Technical Information

- Checked on **4 May 2026**.
- MDN’s current `structuredClone()` documentation states that it creates a deep copy, can transfer transferable objects, and throws `DataCloneError` when part of the input is not serialisable. For Deep Redact, that reinforces the architecture rule to avoid `structuredClone` on the runtime hot path: even where it works, it rewrites identity and would cut across later Epic `3` alias and cycle semantics. Source: [MDN structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- MDN’s current `JSON.stringify()` documentation states that it omits `undefined` object properties, converts `undefined` array entries to `null`, and throws on circular references and `BigInt`. That means Story `3.1` should use structured assertions as its primary proof and must not treat serialised output as evidence that future circular or transformed-value behaviour already works. Source: [MDN JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- From local repo inspection, no toolchain change is required for Story `3.1`; the risk is runtime semantics, not dependency currency. That is an inference from [package.json](/Users/ben/Code/deep-redact/package.json) and the current scope, not a separate external requirement.

### Open Questions / Assumptions

- Assume Story `3.1` can be satisfied with contract coverage only if the current runtime already meets all acceptance criteria. Implementation changes should be driven by failing tests, not by speculative architecture churn.
- Assume the current `isTraversableContainer` boundary in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) remains the supported-input boundary for this story: plain objects and arrays traverse; other runtime object types wait for later Epic `3` stories.
- Assume the canonical fixture helper can stay local to [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) unless subsequent Epic `3` stories prove that shared fixture extraction reduces duplication.

### Project Context Reference

- All new code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names.
- Planning artefacts remain under `_bmad-output/**`, not `docs/`.
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation.

### Project Structure Notes

- The active v4 implementation surface remains [src/core/](/Users/ben/Code/deep-redact/src/core), [src/types/](/Users/ben/Code/deep-redact/src/types), and [test/](/Users/ben/Code/deep-redact/test). Story `3.1` should stay inside that structure.
- Public behavioural coverage belongs in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts); unit tests are optional for this story unless a new private helper warrants them.
- Legacy helpers under [src/utils/](/Users/ben/Code/deep-redact/src/utils) are retained v3 context only. Do not route Story `3.1` implementation through them.
- No UX planning artefact was found under `_bmad-output/planning-artifacts/`; none is needed for this backend runtime story.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 3`, `Story 3.1`
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `FR16`, `FR26`, runtime non-throw requirements
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `API & Communication Patterns`, `Quality Gates`, `Project Structure & Boundaries`
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
  - [project-context.md](/Users/ben/Code/deep-redact/project-context.md)
- Previous implementation context
  - [2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md)
  - [2-4-redact-matching-root-primitive-string-inputs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-4-redact-matching-root-primitive-string-inputs.md)
  - [2-3-redact-matched-substrings-in-nested-string-values.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-3-redact-matched-substrings-in-nested-string-values.md)
  - [2-1-apply-literal-replacement-removal-and-retain-structure-handling.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md)
  - [1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md)
  - [1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md)
- Current repo files
  - [package.json](/Users/ben/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/exports/import.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/import.test.ts)
  - [test/contract/exports/require.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/require.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
- External technical references
  - [MDN structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
  - [MDN JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)

## Story Completion Status

Context analysis completed; story is ready for implementation.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add Story `3.1` contract coverage around one canonical nested mixed fixture that exercises the current v4 targeting surface together in one pass.
- Keep runtime changes, if any, tightly scoped to per-invocation traversal state and supported plain-object or array execution; do not start circular or transformer work yet.
- Verify the focused contract first, then run the repo-level validation commands only if source changes are needed.

### Debug Log References

- Story context assembled on `2026-05-04T18:39:15+0100` from the configured BMAD planning artefacts, the current v4 source tree, and recent git history.
- No UX planning artefact was present under `_bmad-output/planning-artifacts/`; none was required for this backend runtime story.
- External runtime-behaviour checks were limited to MDN references for `structuredClone()` and `JSON.stringify()` because Story `3.1` risk is execution semantics rather than dependency churn.
- Manual `validate-create-story` review on `2026-05-04` used [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md) because the older `_bmad/core/tasks/validate-workflow.xml` path referenced in earlier story files is not present in this repository snapshot.
- Validation tightened Story `3.1` in place: the canonical mixed fixture now explicitly requires both exact-key and regex-key branches so the integrated test proves the whole precedence ladder, and the contributor baseline is now pinned to the repo’s current Node, `pnpm`, `tsdown`, `typescript`, `vitest`, and `xo` versions.
- 2026-05-04: Added the dedicated Story `3.1` contract block in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) with a canonical mixed fixture covering exact-path, dynamic-path, inherited retained-path, exact-key, regex-key, and substring behaviour in one compiled redactor.
- 2026-05-04: Focused Story `3.1` contract coverage passed without any `src/core/**` or public-API changes, confirming the current supported plain-object and array runtime already satisfies this story’s baseline.
- 2026-05-04: `pnpm run lint` passed cleanly and `pnpm run test` passed, including `build` plus the full contract suite.
- 2026-05-04: `pnpm run test:red-phase` still reports retained legacy failures in [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts) and [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts) because those suites still expect the removed `DeepRedact` constructor surface; a non-failing `vi.mock` hoist warning also remains in `test/unit/index.test.ts`.

### Completion Notes

- Added canonical mixed-payload contract coverage with one compiled redactor that exercises exact-path, dynamic-path, inherited retained-path, exact-key, regex-key, and substring targeting across nested objects and arrays in a single pass.
- Added structured assertions for both targeted and untouched sibling branches, including object-in-array and array-in-object hits plus untouched `number`, `boolean`, `null`, and `undefined` leaves.
- Added repeated-invocation coverage showing the same compiled redactor processes two distinct canonical fixture instances independently, keeps regex-key and substring branches deterministic, and leaves both caller payloads unchanged.
- No production-code changes were required in `src/core/**` or `src/types/**`; the existing runtime already met Story `3.1` once the missing behavioural proof was added.
- Verification completed with `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Story 3.1"`, `pnpm run lint`, `pnpm run test:red-phase`, and `pnpm run test`.

## File List

- _bmad-output/implementation-artifacts/3-1-redact-a-canonical-nested-mixed-payload-without-post-init-runtime-throws.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- test/contract/api/create-redactor.test.ts

## Change Log

- 2026-05-04: Added Story `3.1` canonical mixed-payload contract coverage, recorded retained red-phase baseline failures, and updated story tracking to `review`.
