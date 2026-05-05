# Story 3.3: Resolve Built-In and Custom Transformers Deterministically

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want supported transformed runtime values to resolve through one deterministic transformer pipeline,
so that non-plain runtime values are converted safely before normal redaction continues.

## Acceptance Criteria

1. Given no ignored-value-type rule matches a value, when redaction encounters nested or root values of `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, or `URL`, then redaction completes without throwing, and one result is returned.
2. Given no custom transformer changes a `BigInt`, when redaction runs, then the value becomes `{ _transformer: 'bigint', value: { radix: 10, number: '<decimal string>' } }`.
3. Given no custom transformer changes a `Date`, when redaction runs, then the value becomes `{ _transformer: 'date', datetime: '<ISO 8601 string>' }`.
4. Given no custom transformer changes an `Error`, when redaction runs, then the value becomes `{ _transformer: 'error', value: { type, message, stack } }`.
5. Given no custom transformer changes a `Map`, `RegExp`, `Set`, or `URL`, when redaction runs, then `Map` becomes `{ _transformer: 'map', value: <plain object from entries> }`, `RegExp` becomes `{ _transformer: 'regex', value: { source, flags } }`, `Set` becomes `{ _transformer: 'set', value: <array from values> }`, and `URL` becomes `{ _transformer: 'url', value: '<href string>' }`.
6. Given a transformed object-like result such as a `Map`, `Set`, or `Error` payload contains descendant fields that match existing key or path rules, when no ignored-value-type rule matches that raw value, and redaction runs, then traversal continues into the transformed representation, and matching descendants are redacted.
7. Given custom transformers are registered in `byType`, `byConstructor`, and `fallback`, when a value matches more than one bucket, then resolution uses the bucket order `byType`, `byConstructor`, `fallback`.
8. Given more than one transformer is available within the same bucket, when redaction runs, then user-registered transformers are evaluated in declaration order before the built-in default transformer for that bucket, and the first transformer returning a different value wins.
9. Given a transformer wins for a value, when that value is resolved, then later transformers in the same bucket and all lower-precedence buckets are not applied to that value.
10. Given circular-reference handling, ignored-value-type behaviour, or transformer failure is involved, when this story is implemented, then circular handling remains governed by Story `3.2`, ignored-value-type semantics remain deferred to Story `3.4`, and localised `[UNSUPPORTED]` degradation remains deferred to Story `3.5`.

## Tasks / Subtasks

- [x] Add Story `3.3` contract coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] Add a dedicated `describe('built-in and custom transformer resolution')` block that covers root and nested `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL` inputs with explicit expected-result builders rather than snapshots.
  - [x] Add one regression with `serialise: true` on a root `BigInt` or equivalent transformed value so the test proves runtime transformation happens before the final `JSON.stringify(...)` adapter and therefore does not throw.
  - [x] Assert the exact public built-in output shapes for each supported transformed value, including decimal-string `BigInt`, ISO-string `Date`, `{ type, message, stack }` `Error`, string-keyed `Map` object output, `RegExp` source and flags, array-backed `Set`, and `URL.href`.
  - [x] Add at least one direct-match case where a path rule or key rule targets the transformed value position itself and prove existing whole-value censor or removal semantics still outrank descendant traversal when the current branch is already claimed by a terminal rule.
  - [x] Add at least one descendant-redaction case for a transformed object-like representation, for example a `Map`, `Set`, or `Error` payload whose transformed `value` object or array contains keys or paths that existing targeting rules redact after transformation.
  - [x] Add custom-transformer ordering cases that prove bucket precedence `byType` -> `byConstructor` -> `fallback`, declaration-order precedence inside each bucket, and short-circuit behaviour after the first transformer that returns a different value.
  - [x] Add one overlap regression showing that a transformed value still flows through the existing Story `3.2` identity-handling path when its transformed representation contains a circular edge or revisited identity, without redefining the circular marker contract in this story.
  - [x] Keep structured assertions as the primary oracle. Do not make exact serialised stack traces or full JSON snapshots the main proof, because stack text is host-specific and serialisation hides structural detail.

- [x] Extend the v4 public configuration surface for transformer registration without reviving legacy v3 entry points (AC: 1, 7, 8, 9, 10)
  - [x] Widen [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) so `DeepRedactOptions` exposes a `transformers` option that supports the Epic `3` bucketed contract: `byType`, `byConstructor`, and `fallback`.
  - [x] Re-export any new public transformer-related types through [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts) and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) only if they are part of the public TypeScript contract; do not create a second public entry point.
  - [x] If the transformer type definitions become too large for `config.ts`, extract them into a new `src/types/transformers.ts` file and re-export them through the existing public surface. Do not reuse the legacy root [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) file as the v4 source of truth.
  - [x] Keep the new public surface aligned with the accepted v4 naming (`transformers`, `serialise`, `DeepRedactOptions`) and do not reintroduce legacy `blacklistedKeys`, `replacement`, `serialize`, or class-based API expectations.

- [x] Compile and validate transformer configuration once at initialisation (AC: 1, 7, 8, 9, 10)
  - [x] Extend [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) so invalid transformer shapes fail fast at initialisation, including non-function entries, unsupported bucket names, and malformed constructor buckets.
  - [x] Extend [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) with a compiled transformer plan that is immutable, declaration-order preserving, and reusable across repeated invocations of one compiled redactor.
  - [x] If the compiler or validation logic becomes materially clearer, introduce small private helpers such as `src/core/compiler/compile-transformers.ts` or `src/core/validation/validate-transformers.ts`. Keep them inside the existing dependency order and avoid speculative subsystem sprawl.
  - [x] Register built-in defaults for the Story `3.3` supported values in the compiled plan rather than constructing them ad hoc during traversal.
  - [x] Merge user-registered transformers ahead of the built-in default transformer inside each applicable bucket while preserving the bucket precedence required by the acceptance criteria.

- [x] Introduce a minimal v4 transformer boundary instead of routing new work through legacy utilities (AC: 2, 3, 4, 5, 7, 8, 9, 10)
  - [x] Prefer a focused v4 boundary under `src/transformers/` for built-in transformer functions and any registry or resolution helper that is not inherently part of compiler validation or runtime orchestration.
  - [x] Use the retained legacy files only as semantic references for output shape and bucket ordering:
    - [src/utils/standardTransformers/bigint.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/bigint.ts)
    - [src/utils/standardTransformers/date.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/date.ts)
    - [src/utils/standardTransformers/error.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/error.ts)
    - [src/utils/standardTransformers/map.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/map.ts)
    - [src/utils/standardTransformers/regex.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/regex.ts)
    - [src/utils/standardTransformers/set.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/set.ts)
    - [src/utils/standardTransformers/url.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/url.ts)
    - [src/utils/TransformerRegistry.ts](/Users/ben/Code/deep-redact/src/utils/TransformerRegistry.ts)
    - [test/unit/redactorUtils.test.ts](/Users/ben/Code/deep-redact/test/unit/redactorUtils.test.ts)
  - [x] Do not import legacy [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts), [src/utils/TransformerRegistry.ts](/Users/ben/Code/deep-redact/src/utils/TransformerRegistry.ts), or the root [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) into the active v4 runtime or public type surface.

- [x] Integrate deterministic transformer resolution into the current runtime without disturbing Story `2.x` and `3.2` contracts (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] Keep [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) as the orchestration seam. If a private runtime helper is needed, keep it small and focused on transformer eligibility or resolution rather than creating a second traversal engine.
  - [x] Limit transformer eligibility in this story to the supported transformed runtime values: raw `bigint` values plus non-plain runtime objects whose constructor is `Date`, `Error`, `Map`, `RegExp`, `Set`, or `URL`. Do not widen normal plain-object, array, or primitive traversal beyond this story’s scope.
  - [x] Preserve the existing target-selection and replacement contract. Transformer resolution must not let descendant traversal outrank a current-branch exact-path, dynamic-path, exact-key, regex-key, or inherited retained-path policy that already selected whole-value redaction behaviour.
  - [x] When no terminal whole-value rule has claimed the branch, resolve the supported runtime value through the compiled transformer pipeline and then continue redaction into the resulting representation using the same invocation state and existing precedence ladder.
  - [x] Ensure transformed representations that are objects or arrays re-enter the normal traversal flow so descendant path, key, and substring rules can apply, while transformed primitive or string outputs continue through the existing leaf handling path.
  - [x] Keep `serialise` as the final output adapter in [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts). Do not serialise inside transformer resolution.
  - [x] Reuse the existing Story `3.2` per-invocation identity tracking for transformed structures instead of inventing a second circular or alias mechanism for transformer output.

- [x] Keep Story `3.3` scope tight and defer later Epic `3` behaviours explicitly (AC: 10)
  - [x] Do not implement ignored-value-type matching in this story. Story `3.4` owns the raw-value ignore decision that suppresses descendant traversal while still returning a safe transformed representation.
  - [x] Do not implement diagnostics sinks, sanitised failure events, or local `[UNSUPPORTED]` substitution here. Story `3.5` owns transformer failure recovery and diagnostics contracts.
  - [x] Do not broaden the story to arbitrary custom transformation of plain objects, arrays, strings, numbers, booleans, `null`, or `undefined` unless a failing contract proves the Epic `3` wording demands it now.
  - [x] Do not hand-edit generated artefacts such as [README.md](/Users/ben/Code/deep-redact/README.md) or package exports. If public-source changes require generated output refresh, use the existing scripts.

- [x] Verify within the current contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] Run `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "transform"` while iterating, or an equivalent focused filter for the new transformer contract block.
  - [x] Extend or add focused unit coverage for transformer compilation or resolution, and run it through `pnpm exec vitest run --config vitest.red-phase.config.ts <unit files> --reporter=verbose` if the default contract-only include set does not discover that file.
  - [x] Run `pnpm run lint` and `pnpm run test` once focused checks pass.
  - [x] Run `pnpm run test:red-phase` and record any retained failures that remain outside Story `3.3`.
  - [x] Run `pnpm run build` after public type or export changes so `dist/` stays aligned with the source-of-truth v4 surface.

### Review Findings

## Dev Notes

### Story Intent

- Story `3.3` is the transformer-integration step in Epic `3`.
- Story `3.1` established the supported plain-object and array traversal baseline. Story `3.2` added active and completed identity handling. Story `3.3` now adds the deterministic transformation layer for supported non-plain runtime values before ordinary traversal continues.
- The behaviour split that matters in this story is:
  - supported transformed runtime value encountered
  - current branch checked against the existing redaction contract
  - if no terminal whole-value rule ends processing, the value is resolved through the compiled transformer pipeline
  - redaction then continues into the transformed representation using the same per-call traversal state

### Current Runtime Intelligence

- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) already owns the current precedence ladder, branch traversal, substring handling, whole-value replacement, and Story `3.2` identity tracking.
- [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) already provides the correct compile-once boundary: config validation and plan compilation happen once at initialisation, while all traversal state remains local to one `redact(...)` invocation.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) does not yet compile any transformer plan.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) and [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) currently expose no v4 `transformers` option, so Story `3.3` must add the public config contract before runtime integration can be correct.
- The retained legacy transformer machinery under [src/utils/](/Users/ben/Code/deep-redact/src/utils) and the root [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) already show the historical built-in output shapes and ordered bucket idea, but they are not the active v4 source of truth.

### Technical Requirements

- Treat the following as the supported transformed runtime value set for this story:
  - raw `bigint`
  - `Date`
  - `Error`
  - `Map`
  - `RegExp`
  - `Set`
  - `URL`
- Introduce a dedicated exported v4 transformer type rather than a loose inline record. Keep the initial public surface intentionally narrow:
  - `byType` should cover only the `typeof` buckets needed by this story's supported runtime set, namely `bigint` and `object`
  - `byConstructor` should cover only the supported built-in constructor buckets `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`
  - `fallback` remains an ordered array of transformers
- When `byType.object` is present, apply it only to this story's supported non-plain runtime objects. Do not let ordinary plain objects or arrays enter transformer resolution just because their `typeof` is `object`.
- Reject the legacy root `Transformer[]` format, arbitrary bucket names, non-array bucket values, and unsupported constructor buckets on the v4 public surface unless a failing contract proves wider compatibility is intentionally required.
- Preserve the established public built-in output shapes exactly:
  - `BigInt` -> `{ _transformer: 'bigint', value: { radix: 10, number: '<decimal string>' } }`
  - `Date` -> `{ _transformer: 'date', datetime: '<ISO 8601 string>' }`
  - `Error` -> `{ _transformer: 'error', value: { type, message, stack } }`
  - `Map` -> `{ _transformer: 'map', value: <plain object from entries> }`
  - `RegExp` -> `{ _transformer: 'regex', value: { source, flags } }`
  - `Set` -> `{ _transformer: 'set', value: <array from values> }`
  - `URL` -> `{ _transformer: 'url', value: '<href string>' }`
- Use string-keyed `Map` fixtures in the public contract tests. Object-key `Map` semantics are not defined by this story and should not be invented implicitly.
- For `Error`, assert the public shape without snapshotting exact stack text. The contract is the presence of the `type`, `message`, and `stack` fields, not a platform-specific stack-string rendering.
- Preserve the existing precedence ladder from [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts): exact path > dynamic path > inherited retained path > exact key > regex key > substring.
- Preserve the existing non-mutating input contract. Introducing transformer handling must not mutate caller-owned `Map`, `Set`, `Date`, `Error`, `URL`, `RegExp`, or containing plain objects and arrays in place.
- Keep `JSON.stringify(...)` as evidence only of successful final adaptation, not as the primary behavioural oracle. Structured assertions should remain the main proof because they expose descendant traversal and preserve shape detail that serialised output can hide.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) and [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) as thin public entrypoints; transformer semantics belong in compile, validation, runtime, and the dedicated `src/transformers/` boundary, not in entrypoint glue.
- Respect the existing one-way flow: validation accepts config, compiler freezes a transformer plan, runtime resolves a supported runtime value through that plan, and replacement plus optional `serialise` happen afterwards.
- Reuse the Story `3.2` identity seam already in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts). Do not add a separate pre-walk, pre-serialise clean-up pass, or legacy-style circular-preprocessing stage just for transformed values.
- Preserve the architecture rule that the generic traversal lane, not a second traversal engine under `src/transformers/`, remains responsible for descendant redaction after transformation.
- Keep host-agnostic runtime behaviour inside `src/core/**` and `src/transformers/**`; do not introduce Node-only APIs or diagnostics concerns in Story `3.3`.

### Library / Framework Requirements

- Use the pinned repository baseline, not registry latest, unless a proven toolchain defect blocks the work:
  - Node `24.14.1` from [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - package engine floor Node `>=22.18.0`
  - `pnpm@10.33.0`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- `pnpm run test` currently expands to `pnpm run build && pnpm run test:contract`; it does not discover new unit files under `test/unit/**`, so any new transformer unit coverage must be run explicitly as part of story verification.
- Treat version drift in external tools as out of scope for Story `3.3`; this story is about transformer semantics, not dependency refresh.
- Keep ESM source conventions and explicit `.js` import specifiers in TypeScript source modules.
- Do not add runtime dependencies for registry lookup, type tagging, or transformation helpers.

### File and Boundary Guidance

- Primary implementation seams:
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
- Strongly preferred new boundary if additional files help clarity:
  - `src/transformers/transformer-registry.ts`
  - `src/transformers/default/*.ts`
  - `src/transformers/shared/*.ts`
  - `src/core/compiler/compile-transformers.ts`
  - `src/core/validation/validate-transformers.ts`
- Test seams most likely to change:
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
- Generated outputs only via build if public type or runtime source changes require regeneration:
  - `dist/index.js`
  - `dist/index.cjs`
  - `dist/index.d.ts`
- Legacy semantic oracles to read but not revive:
  - [src/utils/standardTransformers/index.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/index.ts)
  - [src/utils/TransformerRegistry.ts](/Users/ben/Code/deep-redact/src/utils/TransformerRegistry.ts)
  - [test/unit/standardTransformers.test.ts](/Users/ben/Code/deep-redact/test/unit/standardTransformers.test.ts)
  - [test/unit/transformerRegistry.test.ts](/Users/ben/Code/deep-redact/test/unit/transformerRegistry.test.ts)
- Do not edit:
  - legacy [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts)
  - legacy [src/utils/TransformerRegistry.ts](/Users/ben/Code/deep-redact/src/utils/TransformerRegistry.ts) as part of the v4 runtime path
  - legacy public root [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts)
  - README or migration docs unless generated-source changes force an artefact refresh through scripts
  - BMAD planning artefacts beyond this story file and [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml)

### Testing Requirements

- Add explicit contract coverage for:
  - root transformed values returning safely without post-init throws
  - nested transformed values inside supported plain objects and arrays
  - direct whole-value rule application at a transformed-value branch
  - descendant targeting inside transformed `value` objects or arrays
  - built-in output shape for every supported runtime value
  - user `byType` override beating `byConstructor` and `fallback`
  - user `byConstructor` override beating `fallback`
  - same-bucket declaration-order short-circuit
  - built-in default acting only when earlier user transformers leave the value unchanged
- Add compiler or unit coverage that proves:
  - compiled transformer entries are frozen or otherwise immutable once the plan is built
  - declaration order is preserved
  - unsupported transformer config shapes fail validation
  - the compiled plan does not share mutable caller-owned arrays that could reorder runtime behaviour after initialisation
- Add one precedence proof that uses a supported non-plain object such as `Date` or `Map` with both a `byType.object` transformer and a matching `byConstructor` transformer so the bucket-order contract is proven on a value that would otherwise match both buckets.
- Prove ordinary plain objects and arrays still bypass transformer resolution in Story `3.3`, even if `byType.object` is configured.
- Extend declaration-fixture coverage so the widened public `transformers` option is exercised by real consumer TypeScript compilation instead of only by internal source typing.
- If new v4 transformer unit files are added, use the retained expectations in [test/unit/standardTransformers.test.ts](/Users/ben/Code/deep-redact/test/unit/standardTransformers.test.ts) and [test/unit/transformerRegistry.test.ts](/Users/ben/Code/deep-redact/test/unit/transformerRegistry.test.ts) as semantic oracles only; do not import legacy runtime code into the new tests or implementation.
- Keep the red-phase run as an informational compatibility signal. Do not contort Story `3.3` to satisfy unrelated retained legacy failures.

### Previous Story Intelligence

- Story `3.2` introduced per-invocation active and completed identity tracking in the current runtime. Story `3.3` should build on that exact seam so transformed representations inherit the same circular and alias safety instead of bypassing it.
- Story `3.1` deliberately deferred transformed runtime values, custom transformers, ignored types, and local `[UNSUPPORTED]` degradation. Story `3.3` now addresses the first two only.
- Story `2.6` and Story `2.5` locked the literal-key matching defaults and the runtime precedence ladder. Transformer handling must fit underneath that already-established targeting contract rather than resetting it.
- Story `2.1` and Story `2.2` established whole-value replacement, removal, function-censor, and same-length replacement semantics. Transformer traversal must not cause descendant handling to outrank those existing whole-value decisions.

### Recent Git Intelligence

- `9971d06 feat(internals): safely handle circular refs and revisted identities` is the most relevant immediate implementation pattern. Story `3.3` should extend the same runtime seam rather than creating a parallel traversal flow.
- `0adfc67 feat(API): redact canonical nested mixed payload without post-init runtime throws` is the baseline proof that plain-object and array traversal are already stable.
- `395c52c feat(API): optional fuzzy and case-insensitive matching for literal string key rules` and `e41c6fd feat(API): determinitic precedence across exact and structured, exact key and regex property, and substring rules` both kept behaviour changes concentrated in the compiler, runtime, and contract-test seams. Story `3.3` should stay similarly surgical.
- The current worktree is dirty only because this story file is newly created and [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) records its `ready-for-dev` state; there is no evidence of unrelated source-surface churn that should force merge-recovery work before implementation begins.

### Latest Technical Information

- Checked on **5 May 2026**.
- [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc) pins Node `24.14.1`, [package.json](/Users/ben/Code/deep-redact/package.json) keeps the published engine floor at Node `>=22.18.0`, and the current repo baseline is `pnpm@10.33.0`, `tsdown@0.21.7`, `typescript@6.0.2`, `vitest@4.1.4`, and `xo@2.0.2`.
- [package.json](/Users/ben/Code/deep-redact/package.json) currently makes `pnpm run test` a build-plus-contract-suite check only. Story `3.3` therefore cannot rely on `pnpm run test` alone to execute new unit coverage for transformer compilation or resolution.
- Local repo inspection shows the retained `organisedStandardTransformers` semantic layout is `byType.bigint` plus `byConstructor` defaults for `URL`, `Date`, `Error`, `Map`, `Set`, and `RegExp`. That is the closest existing oracle for default bucket placement and output shape, but it is legacy reference material rather than the active v4 implementation path.

### Open Questions / Assumptions

- Assume the initial v4 public transformer contract should be a narrow bucketed `byType` / `byConstructor` / `fallback` form rather than the legacy `Transformer[] | OrganisedTransformers` root API, with `byType.object` permitted only for supported non-plain runtime objects and constructor buckets limited to `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`.
- Assume custom transformer fallback applies to the Story `3.3` supported transformed runtime values, not as a new general-purpose hook for every plain object and primitive in the runtime.
- Assume built-in transformer output shapes remain part of the public structured-output contract and therefore should be asserted explicitly in tests.
- Assume ignored-value-type matching will later happen against the raw pre-transform value in Story `3.4`, so Story `3.3` should preserve a clear seam for that decision instead of coupling it to transformed descendant traversal now.

### Project Context Reference

- All new code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names.
- Planning artefacts remain under `_bmad-output/**`, not `docs/`.
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation.

### Project Structure Notes

- The active v4 implementation surface remains [src/core/](/Users/ben/Code/deep-redact/src/core), [src/types/](/Users/ben/Code/deep-redact/src/types), [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts), and [test/](/Users/ben/Code/deep-redact/test).
- The architecture assigns transformation concerns to `src/transformers/`, even though that boundary has not been materialised yet in the current repository snapshot. Story `3.3` is the right point to introduce the minimum viable version of that boundary if it keeps the runtime clean.
- Public behavioural coverage still belongs primarily in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts).
- No UX planning artefact was found under `_bmad-output/planning-artifacts/`; none is required for this backend runtime story.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 3`, `Story 3.3`, and the surrounding `Story 3.4` to `Story 3.5` scope boundaries
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `FR4`, `FR8`, `FR16`, `FR23`, `FR26`, `FR31`
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `Data Architecture`, `API & Communication Patterns`, `Service Boundaries`, `Requirements to Structure Mapping`, `Project Structure & Boundaries`
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml)
  - [project-context.md](/Users/ben/Code/deep-redact/project-context.md)
- Previous implementation context
  - [3-2-handle-circular-references-and-revisited-identities-safely.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-2-handle-circular-references-and-revisited-identities-safely.md)
  - [3-1-redact-a-canonical-nested-mixed-payload-without-post-init-runtime-throws.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-1-redact-a-canonical-nested-mixed-payload-without-post-init-runtime-throws.md)
  - [2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md)
  - [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md)
  - [2-2-support-function-censors-and-same-length-string-replacement.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-2-support-function-censors-and-same-length-string-replacement.md)
  - [2-1-apply-literal-replacement-removal-and-retain-structure-handling.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md)
- Current repo files
  - [package.json](/Users/ben/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
  - [test/unit/standardTransformers.test.ts](/Users/ben/Code/deep-redact/test/unit/standardTransformers.test.ts)
  - [test/unit/transformerRegistry.test.ts](/Users/ben/Code/deep-redact/test/unit/transformerRegistry.test.ts)
  - [test/unit/redactorUtils.test.ts](/Users/ben/Code/deep-redact/test/unit/redactorUtils.test.ts)
  - [src/utils/TransformerRegistry.ts](/Users/ben/Code/deep-redact/src/utils/TransformerRegistry.ts)
  - [src/utils/standardTransformers/index.ts](/Users/ben/Code/deep-redact/src/utils/standardTransformers/index.ts)

## Story Completion Status

Implementation completed and validated; story is ready for review.

Story status set to `review`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Introduce the narrow public transformer types and validation rules first so the accepted v4 contract is explicit before runtime work starts.
- Compile an immutable transformer plan and minimum `src/transformers/` boundary next, reusing legacy semantics only as read-only output-shape and ordering references.
- Integrate the plan into [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) last, then verify with focused contract and unit runs before the repo-level lint, test, red-phase, and build checks.

### Debug Log References

- [_bmad-output](/Users/ben/Code/deep-redact/_bmad-output) was confirmed as the configured artefact root on `2026-05-05` by loading BMAD config through `.agents/skills/bmad-init/scripts/bmad_init.py`, with output language set to `English (UK)`.
- Story context assembled on `2026-05-05T04:24:02+0100` from the configured planning artefacts, current v4 source tree, retained legacy transformer references, and recent git history.
- The active v4 source surface currently has no `transformers` option in [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) and no compiled transformer plan in [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts); Story `3.3` therefore includes explicit public-surface, compiler, validation, and runtime tasks rather than assuming the seam already exists.
- The retained transformer machinery in [src/utils/standardTransformers/](/Users/ben/Code/deep-redact/src/utils/standardTransformers) and [src/utils/TransformerRegistry.ts](/Users/ben/Code/deep-redact/src/utils/TransformerRegistry.ts) is referenced only for semantic continuity and must not be revived as the v4 runtime path.
- Manual `validate-create-story` review on `2026-05-05` used [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md) because the older `_bmad/core/tasks/validate-workflow.xml` path referenced in some earlier story files is not present in this repository snapshot.
- Validation tightened Story `3.3` in place by narrowing the intended v4 transformer surface, adding the pinned contributor baseline and `pnpm run test` caveat, and promoting the retained legacy transformer tests to explicit semantic-oracle status.
- Implemented the narrow v4 transformer public surface, compiled transformer plan, built-in transformer boundary, and runtime integration on `2026-05-05`.
- Verified the new contract block directly with `pnpm exec vitest run test/contract/api/create-redactor.test.ts`, compiler coverage with `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts`, repo checks with `pnpm run lint` and `pnpm run test`, and a full red-phase sweep with `pnpm run test:red-phase`.
- The retained `test/unit/index.test.ts` and `test/load/redact.test.ts` red-phase failures still target the removed legacy `DeepRedact` class constructor, which remains explicitly out of scope for Story `3.3`.

### Completion Notes List

- Created and then validated the Story `3.3` implementation guide with acceptance criteria, file-level guardrails, testing expectations, and cross-story scope boundaries.
- Tightened the story so `byType.object` is only usable for this story's supported non-plain runtime values, not as a back door to general plain-object transformation.
- Added the current repo baseline and verification caveats, including the fact that `pnpm run test` does not execute new `test/unit/**` coverage.
- Promoted [src/utils/standardTransformers/](/Users/ben/Code/deep-redact/src/utils/standardTransformers), [test/unit/standardTransformers.test.ts](/Users/ben/Code/deep-redact/test/unit/standardTransformers.test.ts), and [test/unit/transformerRegistry.test.ts](/Users/ben/Code/deep-redact/test/unit/transformerRegistry.test.ts) to explicit semantic references only.
- Updated sprint tracking so Story `3.3` is marked `review`.
- Added a narrow public `transformers` option plus exported transformer types, backed by a compiled immutable transformer plan and dedicated `src/transformers/` built-ins and resolution helpers.
- Threaded deterministic transformer resolution through the existing runtime seam so supported non-plain values transform before descendant traversal, retain existing terminal-rule precedence, and reuse Story `3.2` circular/revisit handling.
- Added explicit contract, compiler, and declaration coverage for built-in output shapes, bucket precedence, declaration-order short-circuiting, plain-object bypass, and transformed-structure circular replay.
- Verified `pnpm run lint` and `pnpm run test` successfully; recorded the retained legacy red-phase failures that still expect the removed class-based API.

### File List

- _bmad-output/implementation-artifacts/3-3-resolve-built-in-and-custom-transformers-deterministically.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/compiler/compile-redactor-plan.ts
- src/core/compiler/compile-transformers.ts
- src/core/runtime/redact-value.ts
- src/core/validation/validate-config.ts
- src/index.ts
- src/transformers/built-ins.ts
- src/transformers/resolve-transformer.ts
- src/types/config.ts
- src/types/public.ts
- src/types/transformers.ts
- test/contract/api/create-redactor.test.ts
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts

## Change Log

- 2026-05-05: Manually validated Story `3.3` against [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md), narrowed the intended v4 transformer contract, added current contributor-baseline and test-run guidance, and expanded legacy semantic-reference guardrails while keeping the story `ready-for-dev`.
- 2026-05-05: Implemented deterministic built-in and custom transformer resolution across the public types, compiler, runtime, and contract/declaration coverage; verified `pnpm run lint` and `pnpm run test`; and recorded the retained red-phase legacy class-constructor failures as out of scope for Story `3.3`.
