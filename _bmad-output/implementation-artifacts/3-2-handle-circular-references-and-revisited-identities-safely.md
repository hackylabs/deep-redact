# Story 3.2: Handle Circular References and Revisited Identities Safely

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one compiled redactor to process cyclic object graphs and repeated object identities in a single pass,
so that production payloads can be redacted safely without recursion failures or unstable alias handling.

## Acceptance Criteria

1. Given a supported input envelope limited to objects and arrays with leaf values already supported by Story `3.1`, when the redactor encounters a direct self-reference on an object or array branch, then the circular edge is replaced with the public circular marker object `{ _transformer: 'circular', value: '', path: <current path> }`, and non-circular sibling values remain intact.
2. Given a supported input contains a nested circular reference in an object-in-array branch or an array-in-object branch, when redaction runs, then only the circular edge is replaced with the same public circular marker shape, and the current object path is recorded in `path`, and the original reference path is recorded in `value` when available, and the surrounding parent structure is preserved.
3. Given two supported objects or arrays reference each other mutually, when redaction runs, then each circular edge is handled deterministically using the public circular marker shape, and the call completes without throwing.
4. Given the same object or array identity is encountered again after it has already been fully traversed during the same redaction call, when redaction runs, then the redactor does not descend into that identity a second time, and the revisited branch appears in the returned result with deterministic output, and the call completes without throwing.
5. Given a completed identity is revisited through the same effective rule context, when redaction runs, then the already produced redacted result is reused for that revisited branch.
6. Given a completed identity is revisited through a different effective rule context, when redaction runs, then the returned structure remains deterministic and path-correct without re-entering the completed subtree.
7. Given the same cyclic or aliased fixture is redacted repeatedly with the same configuration, when redaction runs on separate invocations, then the output is identical on every run.
8. Given transformed runtime values, custom transformers, ignored types, and localised `[UNSUPPORTED]` degradation, when this story is implemented, then those behaviours remain out of scope for Story `3.2`.

## Tasks / Subtasks

- [x] Add Story `3.2` contract coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Add a dedicated `describe('Circular references and revisited identities')` block with local fixture builders for object self-reference, array self-reference, nested object-in-array and array-in-object cycles, mutual references, same-context alias revisits, and different-context alias revisits.
  - [x] Assert the exact public marker shape `{ _transformer: 'circular', value, path }`, including `value: ''` for direct self-reference to the root identity and canonical current-path recording for nested circular edges.
  - [x] Add one same-context revisit assertion that proves the revisited branch resolves from the already produced redacted result without re-entering the original input identity, and one different-context revisit assertion that proves path-correct separation takes priority over alias preservation.
  - [x] Make the different-context revisit fixture share the compiled default policy object across different effective rule sources, for example exact-key versus regex-key or matched versus unmatched traversal, so the regression fails if completed-result caching keys only on policy reference.
  - [x] Add a repeated-invocation regression that redacts equivalent fresh cyclic fixtures with one compiled redactor and proves output equality across runs while original inputs remain unchanged.
  - [x] Keep structured assertions as the primary proof. Do not use `JSON.stringify()` snapshots as the main oracle for this story because cycle handling, `undefined`, and alias identity are part of the behaviour under test.

- [x] Introduce per-invocation identity tracking inside the v4 runtime execution seam (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Keep [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) as the main integration seam. Extract one small private helper under `src/core/runtime/` only if it materially clarifies active-versus-completed identity tracking.
  - [x] Track active container identities separately from completed container identities using `WeakSet` and `WeakMap`, and record each identity’s first-seen canonical path so circular markers can report the original reference location through `value` when available.
  - [x] When an active identity is re-encountered, emit the public circular marker object instead of descending again, using the current canonical branch path for `path`.
  - [x] When a completed identity is re-encountered, reuse or derive deterministic output without descending into the original input identity again.
  - [x] Distinguish effective rule context explicitly. Do not key completed-result reuse only by the frozen `CompiledRedactionPolicy` reference, because different rules can legitimately share the same compiled policy object while still requiring different path-correct output.
  - [x] Ensure completed-result reuse never mutates a previously cached output object or array in place.

- [x] Preserve existing traversal, precedence, and output-shaping semantics while adding identity safety (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Preserve the established precedence ladder in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts): exact path > dynamic path > inherited retained path > exact key > regex key > substring.
  - [x] Preserve non-mutating input handling, sibling preservation, removal semantics, retain-structure semantics, and final `serialise` adaptation in [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts).
  - [x] Be deliberate about unchanged traversed containers. A container that participates in circular handling or completed-identity reuse may still need a materialised output object or array rather than returning the caller-owned original identity unchanged.
  - [x] Keep canonical path rendering consistent with [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts) so marker `path` and `value` strings align with the rest of the runtime.
  - [x] Do not use `structuredClone()` or JSON serialisation on the runtime hot path.

- [x] Keep Story `3.2` scope tight and defer later Epic `3` concerns (AC: 8)
  - [x] Keep the supported-input boundary from Story `3.1`: plain objects, arrays, and supported primitive leaves only.
  - [x] Do not implement built-in transformer resolution for `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, or `URL` here. Those belong to Story `3.3`.
  - [x] Do not implement ignored-value-type bypass, diagnostics sinks, traversal budgets, or localised `[UNSUPPORTED]` degradation here. Those belong to Stories `3.4` and `3.5`.
  - [x] Do not revive or import legacy runtime code from `src/utils/**`; use it only as a semantic reference for marker shape and prior behaviour.
  - [x] Do not widen the public option surface unless a failing contract proves a genuine gap. The current `unknown` output contract already permits the public circular marker object.

- [x] Verify within the current contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Run `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Circular references and revisited identities"` while iterating.
  - [x] If a new runtime helper is added, run its focused unit file as well, for example under `test/unit/core/runtime/`.
  - [x] Run `pnpm run lint` and `pnpm run test` once the focused story checks pass.
  - [x] Run `pnpm run test:red-phase` and record any retained failures separately from Story `3.2` behaviour.
  - [x] Run `pnpm run build` only if source changes require regenerated `dist/` output.

### Review Findings

- [x] [Validation][Patch] Remove Story `3.2` work-item naming from the public contract test guidance so it stays aligned with [project-context.md](/Users/ben/Code/deep-redact/project-context.md) and the Story `3.1` review outcome.
- [x] [Validation][Patch] Relax same-context alias proof from mandatory referential identity to non-reentry reuse, which matches the current architecture more closely while still preventing repeated descent.
- [x] [Validation][Patch] Require a different-context fixture that shares the compiled default policy object across distinct rule sources so the `CompiledRedactionPolicy` cache-key pitfall becomes observable in tests.
- [x] [Review][Patch] Completed-result fallback can skip required redaction after an unmatched first visit [src/core/runtime/redact-value.ts:268]
- [x] [Review][Patch] Revisited cyclic and path-sensitive aliases reuse stale branch paths and function-censor output [src/core/runtime/redact-value.ts:255]
- [x] [Review][Patch] Different-context revisit coverage does not prove path-correct separation or matched-versus-unmatched behaviour [test/contract/api/create-redactor.test.ts:2796]

## Dev Notes

### Story Intent

- Story `3.2` is the first identity-aware runtime hardening step in Epic `3`.
- It builds directly on Story `3.1`'s supported plain-object and array baseline and adds safe behaviour for circular edges and repeated object identities inside that same supported-input boundary.
- The key behavioural split is:
  - active identity revisit -> emit the public circular marker
  - completed identity revisit -> avoid re-entering the original subtree and return deterministic structured output
- Path-correct output takes priority over alias preservation when the same input identity is reached through different effective rule contexts.

### Current Runtime Intelligence

- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) is still a recursive plain-object and array walker with no active or completed identity tracking. In its current form it will recurse indefinitely on cycles and will descend into repeated aliases more than once.
- `transformObject(...)` and `transformArray(...)` currently return the original caller-owned object or array when no descendant change is detected. That optimisation is acceptable for Story `3.1`'s acyclic baseline, but it is not sufficient on its own for Story `3.2` because completed-identity reuse may require a safe materialised output graph even when descendant values are unchanged.
- [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) already provides the correct compile-once boundary: validation and plan compilation happen once at initialisation, while traversal state belongs to a single `redact(...)` call.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) already freezes compiled policies and rule metadata. That is good for immutability, but it means effective rule context cannot be inferred from policy-object identity alone.

### Technical Requirements

- Use the existing canonical-path helpers in [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts) for both the current circular-edge `path` and the original-reference `value`.
- Preserve the existing Story `3.1` container boundary:
  - traversable: plain objects and arrays
  - non-traversable but currently supported leaves: `string`, `number`, `boolean`, `null`, and `undefined`
  - transformed runtime objects remain out of scope
- Treat direct self-reference back to the root identity as `value: ''`. For nested or mutual cycles, record the first known canonical path to the already active identity when available.
- Effective rule context must reflect the policy semantics actually governing the revisited branch. At minimum, do not treat these as automatically equivalent just because they share the same default compiled policy object:
  - exact-path versus dynamic-path matches
  - inherited retained-path traversal versus direct whole-node targeting
  - exact-key versus regex-key matching
  - no-match traversal versus matched traversal
- When a completed identity is revisited through the same effective rule context, reusing the already produced redacted result is acceptable and desirable. If referential identity is preserved for that case, treat it as an allowed optimisation outcome rather than the only valid external proof.
- When a completed identity is revisited through a different effective rule context, path-correct output takes priority. That may mean returning a distinct structured result derived without re-entering the original input identity.
- Do not mutate a cached completed result in place when another branch may already be sharing it inside the current returned graph.
- Do not import or rewrap [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts). Legacy code may inform expected marker shape, but Story `3.2` belongs wholly in the v4 `src/core/**` surface.
- Keep `serialise` as the final output adapter only. If you add a serialisation assertion, use it as a secondary regression, not as the main correctness proof.

### Architecture Compliance

- Respect the architecture boundary that runtime execution lives under `src/core/runtime/`, validation under `src/core/validation/`, compilation under `src/core/compiler/`, and output shaping under `src/core/replacement/`.
- The architecture describes future files such as `src/core/runtime/identity-tracker.ts` and a fuller traversal-engine split, but the current repository does not yet have those seams. Story `3.2` should add only the minimum private runtime structure needed now.
- Keep the hot path free of Node-only APIs and deep-clone shortcuts. Identity tracking should be object-based using `WeakMap` and `WeakSet`, not path-only bookkeeping.
- Preserve the architecture rule that structured and serialised output are first-class, while serialisation remains a final adapter step after structured runtime resolution.
- Preserve the conditional alias rule from the architecture:
  - same effective rule context may preserve shared identity
  - different effective rule context may return separate output objects if that is what path correctness requires

### Library / Framework Requirements

- Use the pinned repo baseline, not ad hoc upgrades:
  - Node `24.14.1` from [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - package engine floor Node `>=22.18.0`
  - `pnpm@10.33.0`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- No dependency or toolchain refresh is required for Story `3.2`; the risk is runtime semantics, not package currency.
- Keep ESM source conventions and explicit `.js` import specifiers in TypeScript source modules.
- Do not add runtime dependencies for graph traversal, cloning, or circular-reference handling.

### File Structure Requirements

- Required source files:
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts)
- Likely test file:
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
- Optional helper only if it removes real complexity:
  - `src/core/runtime/<new private helper>.ts`
  - `test/unit/core/runtime/<new helper>.test.ts`
- Do not edit:
  - legacy [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts)
  - legacy `src/types.ts`
  - README or migration docs
  - BMAD planning artefacts beyond this story file and [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml)

### Testing Requirements

- Add contract coverage for each acceptance-criteria group:
  - direct self-reference on objects
  - direct self-reference on arrays
  - nested object-in-array and array-in-object cycles
  - mutual circular references
  - completed revisit through the same effective rule context
  - completed revisit through a different effective rule context
  - repeated-run determinism across fresh equivalent cyclic fixtures
- Reuse the Story `3.1` style of expressive fixture helpers and explicit expected-result builders so failures reveal which rule tier or revisit path went wrong.
- For same-context alias reuse, prove non-reentry and reuse of the already produced redacted result first. Assert referential reuse only if the selected fixture and final implementation intentionally preserve shared identity for that case.
- For different-context alias revisits, assert path-correct content first and referential separation only where it makes that path distinction observable.
- Keep original input fixtures unchanged after each call. For cyclic fixtures, prefer targeted referential assertions plus `structuredClone(...)` test helpers where appropriate.
- If a new private runtime helper is introduced, add narrow unit tests for:
  - active versus completed identity detection
  - original-path recording for markers
  - same-context reuse selection
  - different-context non-reentry behaviour
- Do not bootstrap a broad new `test/security/` harness in this story unless a very small focused test genuinely belongs there. The current repo’s authoritative green behavioural suite is still [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts).

### Previous Story Intelligence

- Story `3.1` proved the supported nested mixed-payload baseline and explicitly deferred circular references, revisited identities, transformers, ignored types, and localised `[UNSUPPORTED]` degradation. Story `3.2` now picks up the first two of those deferred concerns only.
- Story `3.1` also reinforced the compile-once runtime boundary: per-call traversal state must not bleed across invocations. Story `3.2` should preserve that discipline while adding active and completed identity maps.
- Story `2.6` and Story `2.5` locked the current precedence ladder and exact-key-versus-regex-key distinctions. Identity handling must not disturb that target-selection order.
- Story `2.1` hardened non-mutating traversal, removal semantics, retain-structure behaviour, and sibling preservation. Circular handling must keep those contracts intact for non-circular branches.
- Legacy [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts) and [test/unit/redactorUtils.test.ts](/Users/ben/Code/deep-redact/test/unit/redactorUtils.test.ts) already describe the historical circular marker shape, including `value: ''` for root self-reference and populated `value` for mutual references. Use that only as a semantic oracle, not as implementation code.

### Recent Git Intelligence

- `0adfc67 feat(API): redact canonical nested mixed payload without post-init runtime throws` added Story `3.1` behavioural proof without widening the v4 public surface. Story `3.2` should follow the same contract-first approach, but it is more likely to require runtime changes than Story `3.1` did.
- `395c52c feat(API): optional fuzzy and case-insensitive matching for literal string key rules` and `e41c6fd feat(API): determinitic precedence across exact and structured, exact key and regex property, and substring rules` both kept changes concentrated in the compiler, runtime, and contract test seam. Story `3.2` should stay similarly surgical.
- Git status was clean before this story was created, so the developer can treat Story `3.2` as a focused delta rather than merge-recovery work.

### Latest Technical Information

- Checked on **4 May 2026**.
- MDN’s current `WeakMap` documentation states that `WeakMap` key equality for objects is identity-based and that `WeakMap` entries are not enumerable because key liveness must not be observable. That makes `WeakMap` a strong fit for per-invocation completed-result and origin-path tracking keyed by object identity. Source: [MDN WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- MDN’s current `WeakSet` documentation states that object membership is identity-based and the collection is not enumerable. That fits active-identity tracking for circular-edge detection without exposing traversal-state ordering. Source: [MDN WeakSet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)
- MDN’s current `JSON.stringify()` documentation states that circular references still throw a `TypeError`. That reinforces the requirement that Story `3.2` must break cycles in structured runtime output before any optional final serialisation step runs. Source: [MDN JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- MDN’s current `structuredClone()` documentation states that it preserves circular references while creating a deep clone with different object identity. That makes it useful in tests when copying cyclic fixtures, but it remains unsuitable for the runtime hot path because it rewrites identity instead of enforcing Deep Redact’s rule-context-aware output semantics. Source: [MDN structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)

### Open Questions / Assumptions

- Assume Story `3.2` satisfies the current public contract with structured-output coverage first. Serialised-output determinism remains a later Epic `4` concern.
- Assume the current `isTraversableContainer(...)` boundary remains the supported-input boundary for this story: plain objects and arrays traverse; transformed runtime values wait for Story `3.3`.
- Assume completed-identity state stays private to one `redact(...)` call and does not require a public diagnostics or warnings surface yet.
- Assume path-correct separation is acceptable when the same input identity is revisited through different effective rule contexts, even if the returned branches are no longer referentially equal.

### Project Context Reference

- All new code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names.
- Planning artefacts remain under `_bmad-output/**`, not `docs/`.
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation.

### Project Structure Notes

- The active v4 implementation surface remains [src/core/](/Users/ben/Code/deep-redact/src/core), [src/types/](/Users/ben/Code/deep-redact/src/types), and [test/](/Users/ben/Code/deep-redact/test). Story `3.2` should stay inside that structure.
- The architecture describes future `runtime/`, `transformers/`, and `diagnostics/` expansion, but the current repository snapshot has not yet materialised those seams. Story `3.2` should add the minimum private runtime scaffolding needed now, not the entire future architecture in one jump.
- Public behavioural coverage still belongs primarily in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts).
- No UX planning artefact was found under `_bmad-output/planning-artifacts/`; none is required for this backend runtime story.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 3`, `Story 3.2`, and the surrounding `Story 3.3` to `Story 3.5` scope boundaries
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `FR22`, `FR23`, `FR24`, `FR25`, `FR26`, `FR27`
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Runtime execution model`, `API & Communication Patterns`, `Service Boundaries`, `Runtime Resilience & Safety`, and alias-behaviour test expectations
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml)
  - [project-context.md](/Users/ben/Code/deep-redact/project-context.md)
- Previous implementation context
  - [3-1-redact-a-canonical-nested-mixed-payload-without-post-init-runtime-throws.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-1-redact-a-canonical-nested-mixed-payload-without-post-init-runtime-throws.md)
  - [2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md)
  - [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md)
  - [2-1-apply-literal-replacement-removal-and-retain-structure-handling.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md)
- Current repo files
  - [package.json](/Users/ben/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts)
  - [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/unit/redactorUtils.test.ts](/Users/ben/Code/deep-redact/test/unit/redactorUtils.test.ts)
- External technical references
  - [MDN WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
  - [MDN WeakSet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)
  - [MDN JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
  - [MDN structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)

## Story Completion Status

Story implementation completed and validated against the current v4 contributor baseline.

Story status set to `review`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context assembled on `2026-05-04T19:45:45+0100` from the configured BMAD planning artefacts, the current v4 source tree, and recent git history.
- No UX planning artefact was present under `_bmad-output/planning-artifacts/`; none was required for this backend runtime story.
- Manual create-story validation used [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md) because the older `_bmad/core/tasks/validate-workflow.xml` path referenced in some earlier story files is not present in this repository snapshot.
- Current v4 runtime inspection confirmed that [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) has no identity tracking yet and still returns original unchanged containers, which is the key implementation risk for Story `3.2`.
- Manual validation tightened one critical guardrail into the story file: completed-result reuse must not be keyed only by `CompiledRedactionPolicy` identity, because multiple rule sources can legitimately share the same frozen policy object.
- Legacy [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts) and [test/unit/redactorUtils.test.ts](/Users/ben/Code/deep-redact/test/unit/redactorUtils.test.ts) were treated as semantic references for circular marker shape only, not as code to transplant back into the v4 runtime.
- Implemented per-invocation traversal state in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) using active and completed identity tracking, canonical origin-path recording, and cache-safe materialised completed results for reuse and derived revisit output.
- Added public contract coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) for direct self-reference markers, nested mixed cycles, mutual references, same-context revisits, different-context revisits, and repeated invocation determinism.
- Validation completed on `2026-05-04T21:00:00+0100` with `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Circular references and revisited identities"`, `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`, `pnpm run lint`, and `pnpm run test`.
- `pnpm run test:red-phase` still reports retained legacy failures outside Story `3.2` scope: `test/load/redact.test.ts` and `test/unit/index.test.ts` both still expect the removed class-based `DeepRedact` constructor.

### Completion Notes List

- Added cycle and revisit contract coverage with exact circular-marker assertions, getter-backed non-reentry proofs, and repeated invocation determinism checks.
- Introduced active and completed identity tracking in the v4 runtime, including canonical origin-path recording, rule-context cache keys, and cache-safe materialised results for derived revisit output.
- Regenerated [dist/index.js](/Users/ben/Code/deep-redact/dist/index.js) through the normal build path after the runtime change set.
- Verified the story with `pnpm run lint` and `pnpm run test`, and recorded the retained legacy red-phase constructor failures separately from Story `3.2`.

### File List

- _bmad-output/implementation-artifacts/3-2-handle-circular-references-and-revisited-identities-safely.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/runtime/redact-value.ts
- test/contract/api/create-redactor.test.ts

## Change Log

- 2026-05-04: Created ready-for-dev Story `3.2` context, updated sprint tracking, and tightened validation guidance for alias and cache-key coverage.
- 2026-05-04: Implemented v4 circular and revisited-identity handling, added public contract coverage, regenerated `dist/index.js`, and moved Story `3.2` to review.
