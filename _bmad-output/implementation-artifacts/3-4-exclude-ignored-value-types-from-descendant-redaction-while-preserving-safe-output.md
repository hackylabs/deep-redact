# Story 3.4: Exclude Ignored Value Types from Descendant Redaction While Preserving Safe Output

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want ignored-value-type rules to suppress descendant redaction inside selected transformed runtime values,
so that I can preserve chosen runtime values while still returning safe output.

## Acceptance Criteria

1. Given ignored-value-type rules are configured for supported transformed runtime values, when redaction evaluates a value, then ignore matching is performed against the raw value before traversal enters that value.
2. Given an ignored-value-type rule matches a raw `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, or `URL`, when redaction runs, then the value is still resolved through the applicable safe-output transformer contract from Story `3.3`.
3. Given an ignored-value-type rule matches a raw transformed runtime value, when its safe transformed representation is produced, then key, path, and substring targeting are not applied within that value or its transformed representation.
4. Given a nested ignored `Map`, `Set`, or `Error` would otherwise contain descendant matches, when redaction runs, then those descendants remain unredacted because traversal does not continue into the ignored branch.
5. Given an ignored-value-type rule does not match a raw transformed runtime value, when redaction runs, then normal transformer resolution, traversal, and targeting continue for that value.
6. Given one branch matches an ignored-value-type rule and another branch does not, when redaction runs, then the ignored branch is excluded from descendant redaction and unrelated branches continue through normal redaction processing.
7. Given the root input is a supported transformed runtime value and it matches an ignored-value-type rule, when redaction runs, then the returned root value is the safe transformed representation and no further targeting is applied within it.
8. Given transformer failure or localised `[UNSUPPORTED]` degradation occurs, when this story is implemented, then that behaviour remains deferred to Story `3.5`.

## Tasks / Subtasks

- [x] Add Story `3.4` contract coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2598) (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Add a dedicated `describe(...)` block immediately after the existing Story `3.3` transformer block so ignored-value behaviour is asserted against the same supported runtime fixtures and helper builders already used there.
  - [x] Add root-input cases for at least `BigInt` and one object-like transformed value such as `Map` or `Error` showing that `ignoredValueTypes` still returns the Story `3.3` safe transformed representation while descendant paths such as `value.number`, `value.password`, or `value.message` do not fire.
  - [x] Add one case where an ignored raw supported runtime value also has a winning custom transformer, proving the ignore decision is locked from the raw value before transformer output shape changes and that the custom safe output is still returned without descendant targeting inside it.
  - [x] Add nested mixed-payload cases covering one ignored branch and one non-ignored sibling branch in the same invocation, proving the ignored branch bypasses descendant redaction while the other branch still follows the existing Story `3.3` traversal-and-targeting contract.
  - [x] Add one regression where a transformed branch is both ignored by type and directly claimed by an existing terminal whole-value rule, proving the current-branch whole-value rule still wins and ignored-type handling does not reopen the branch for safe transformed output.
  - [x] Add at least one case each for ignored `Map`, ignored `Set`, and ignored `Error` descendants whose transformed payload would otherwise contain matching nested fields, and assert those nested fields remain visible because the ignored branch is not descended into for redaction.
  - [x] Add at least one substring-focused regression proving configured `stringTests` do not fire inside an ignored transformed representation, for example against `Error.value.message`, `URL.value`, `BigInt.value.number`, or equivalent custom transformer output.
  - [x] Keep ignored-branch fixtures focused on plain nested payloads unless a specific case is proving the boundary. Do not accidentally broaden this story into recursive descendant safety semantics that belong to Story `3.3` or `3.5`.

- [x] Extend the v4 public configuration surface with a dedicated ignored-value-type option without reviving legacy v3 terminology (AC: 1, 2, 3, 5, 6, 7)
  - [x] Add an `ignoredValueTypes` option to [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:19) and re-export its public type through [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:3) and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:3).
  - [x] Keep the initial v4 shape narrow and explicit to the Story `3.3` supported runtime-value set. Prefer a typed object with optional keys `bigint`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL` rather than a loose string array or an overloaded transformer bucket.
  - [x] If the new type definitions materially improve readability, extract them into a focused `src/types/ignored-value-types.ts` module and re-export them through the existing public surface only. Do not route the v4 source of truth through legacy [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts:181).
  - [x] Do not overload legacy `types`, `serialize`, `blacklistedKeys`, or array-style `transformers` semantics to express this feature. This story needs a fresh v4 contract, not a compatibility alias.

- [x] Compile and validate ignored-value-type configuration once at initialisation (AC: 1, 2, 5, 6, 7)
  - [x] Extend [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts:11) so `ignoredValueTypes` is a recognised root option and invalid shapes fail fast at initialisation with explicit issue paths.
  - [x] Reject unsupported ignored-type keys, non-boolean values, and malformed containers. Keep validation aligned with the same supported runtime-value set used by Story `3.3`.
  - [x] Extend [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:83) with an immutable compiled ignored-value-type plan alongside the already compiled transformer plan.
  - [x] If the compiler becomes clearer with a helper, introduce a small private module such as `src/core/compiler/compile-ignored-value-types.ts`. Keep it inside the existing dependency order and avoid speculative subsystem sprawl.

- [x] Integrate ignored-value matching into the existing transformer boundary without disturbing Story `2.x`, `3.2`, or `3.3` guarantees (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Reuse the supported-runtime-value seam in [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:48) for raw-value matching so ignored-type checks and transformer resolution stay aligned on the same supported set.
  - [x] If the runtime needs the supported kind name or raw-match result, extract that helper from [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:48) rather than duplicating `typeof` and `instanceof` checks in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1038).
  - [x] Keep [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1038) as the orchestration seam. The ignored-value decision should be made after current-branch whole-value redaction has had the chance to win, but before descendant traversal enters the transformed representation.
  - [x] When an ignored-value-type rule matches, still resolve the current raw value through the applicable Story `3.3` transformer pipeline, then return that safe transformed representation without allowing descendant key, path, or substring targeting inside it.
  - [x] When an ignored-value-type rule does not match, preserve the current Story `3.3` behaviour exactly: transformer resolution first, then normal descendant traversal, targeting, and identity handling.
  - [x] For supported object identities (`Date`, `Error`, `Map`, `RegExp`, `Set`, `URL`), preserve the existing Story `3.2` identity-tracking seam and completed-snapshot bookkeeping. Ignored-type support must not create a second circular or revisit mechanism.
  - [x] Do not apply ignored-type semantics to ordinary plain objects, arrays, strings, numbers, booleans, `null`, or `undefined`. Story `3.4` is only about the supported transformed runtime values from Story `3.3`.

- [x] Extend unit and declaration coverage for the new public surface and compiled plan (AC: 1, 2, 5, 7)
  - [x] Add focused compiler or validation assertions in [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts:451) proving the compiled ignored-value-type plan is immutable, rejects unsupported keys, and does not share caller-owned mutable containers after initialisation.
  - [x] Extend [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1) and [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts) so the new `ignoredValueTypes` option is exercised by real consumer TypeScript compilation.
  - [x] Keep [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12) as the declaration-contract harness; the new option must compile cleanly in both ESM and CJS consumer fixtures.

- [x] Keep Story `3.4` scope tight and defer later Epic `3` behaviour explicitly (AC: 8)
  - [x] Do not implement transformer-failure diagnostics, sanitised warning sinks, or local `[UNSUPPORTED]` substitution in this story. Story `3.5` owns those behaviours.
  - [x] Do not widen ignored-type matching into a general branch-exclusion system for ordinary containers or path selectors.
  - [x] Do not hand-edit generated artefacts such as [README.md](/Users/ben/Code/deep-redact/README.md) or package exports. If public-source changes require generated output refresh, use the existing scripts.

- [ ] Verify within the current contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Run a focused contract slice around the transformer and ignored-value block in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2598) while iterating.
  - [x] Run the relevant unit and declaration coverage explicitly. `pnpm run test` still covers build plus contract tests only, so new unit checks must be invoked directly if they sit outside the contract suite.
  - [ ] Run `pnpm run lint`, `pnpm run test`, `pnpm run test:red-phase`, and `pnpm run build` once focused checks pass.

### Review Findings

- [x] [Review][Patch] Ignored `Map`/`Set` branches bypass circular and revisit handling inside transformed output [src/core/runtime/redact-value.ts:1072]
- [x] [Review][Patch] Story `3.4` contract coverage omits ignored `Date` and `RegExp` cases [test/contract/api/create-redactor.test.ts:2980]

## Dev Notes

### Story Intent

- Story `3.4` is the raw-value ignore gate that follows Story `3.3`’s deterministic transformer pipeline.
- The behavioural sequence that matters is:
  - current-branch whole-value policy selection still happens first
  - supported runtime-value detection and ignored-type matching happen against the raw value
  - the current raw value still resolves through the Story `3.3` safe transformer contract
  - ignored branches stop descendant redaction from entering the transformed representation, while non-ignored branches continue through the existing Story `3.3` traversal seam
- The story is intentionally narrow. It is not a general-purpose “skip this subtree” feature for plain objects or arrays.

### Current Runtime Intelligence

- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1038) currently resolves supported runtime values through `transformSupportedRuntimeValue(...)` and always re-enters the transformed representation for ordinary traversal when a transformer changes the value.
- [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:48) already centralises the supported runtime-value set and the bucketed transformer precedence used by Story `3.3`.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:83) currently compiles defaults, paths, key rules, substring rules, serialisation, and transformers, but has no ignored-value-type plan yet.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts:11) currently recognises `transformers` but no ignored-value-type option.
- [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:19), [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:3), and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:3) expose no public ignored-value-type contract yet.
- The declaration fixtures at [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1) currently prove the public transformer surface only.
- Legacy [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts:181) already uses `types` for a different v3 meaning and [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts:194) exposes the American-English `serialize` alias. Story `3.4` must not pull those legacy semantics back into the v4 surface.

### Technical Requirements

- Introduce a dedicated root-level `ignoredValueTypes` option on `DeepRedactOptions`.
- Keep the initial public contract explicit and closed to the Story `3.3` supported runtime-value set:
  - `bigint`
  - `Date`
  - `Error`
  - `Map`
  - `RegExp`
  - `Set`
  - `URL`
- Treat ignored-type matching as a compile-once membership test, not as a second transformer registry and not as a path-rule override.
- Decide ignored-type eligibility from the original raw supported runtime value before any custom transformer changes the output shape. A winning custom transformer may change the returned safe representation, but it must not retroactively change whether the branch counted as ignored.
- Match ignored-value types against the raw value before descendant traversal would enter that value, but do not let ignored-type handling outrank an already-selected terminal whole-value redaction at the current branch.
- When a raw supported runtime value matches an ignored-value-type rule:
  - still run the ordinary Story `3.3` transformer-resolution ladder
  - return the resulting safe transformed representation
  - do not apply descendant key, path, or substring targeting inside that representation
- When a raw supported runtime value does not match an ignored-value-type rule, keep the current Story `3.3` behaviour unchanged.
- Keep British-English naming on the new public option and diagnostics. Do not introduce an American-English alias for this new v4 feature.

### Architecture Compliance

- Respect the architecture’s compile-once model from [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:134): ignored-value-type configuration should compile at initialisation into an immutable runtime plan.
- Keep the runtime execution order aligned with [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:135): fast-lane and fallback traversal must remain behavioural equivalents, and no optimisation may change observable ignored-type behaviour.
- Keep transformer concerns aligned with [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:139) and [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:203): ignored-value-type rules are part of the main runtime contract and must share the same supported runtime-value boundaries as transformer resolution.
- Preserve the current source-of-truth boundaries described in [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:800) and [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:820): `src/core/` owns orchestration, `src/transformers/` owns transformation matching, and public exports stay thin.

### Library / Framework Requirements

- Follow the pinned repository baseline rather than external registry drift:
  - Node `24.14.1` from [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1)
  - package engine floor Node `>=22.18.0` from [package.json](/Users/ben/Code/deep-redact/package.json:11)
  - `pnpm@10.33.0`, `tsdown@0.21.7`, `typescript@6.0.2`, `vitest@4.1.4`, and `xo@2.0.2` from [package.json](/Users/ben/Code/deep-redact/package.json:10)
- [package.json](/Users/ben/Code/deep-redact/package.json:54) currently defines `pnpm run test` as build plus contract tests. New unit coverage for ignored-value-type compilation or runtime helpers must be run explicitly if it is not part of the contract suite.
- Keep ESM source conventions and explicit `.js` import specifiers in TypeScript source modules.
- Do not add runtime dependencies for matcher registries, metadata tagging, or branch-skipping helpers.

### File and Boundary Guidance

- Primary public and compile seams:
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:19)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:3)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:3)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:83)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts:11)
- Primary runtime seams:
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1038)
  - [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:48)
  - [src/core/compiler/compile-transformers.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-transformers.ts:19)
- Strongly preferred new helper boundaries if clarity warrants them:
  - `src/types/ignored-value-types.ts`
  - `src/core/compiler/compile-ignored-value-types.ts`
  - `src/core/validation/validate-ignored-value-types.ts`
- Test seams most likely to change:
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2598)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts:451)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
- Do not edit legacy runtime entry points under `src/utils/` or the legacy public root [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts:181) as part of the active v4 implementation path.

### Testing Requirements

- Cover raw-value ignore matching before descendant traversal for every supported runtime-value category, using focused representative fixtures rather than broad snapshots.
- Prove that ignored root `BigInt` and ignored root object-like values still return the Story `3.3` transformed representation while descendant paths below `value` or `message` do not apply.
- Prove that ignored-type matching is decided from the raw value, not the transformed result, by covering at least one branch where a custom transformer changes the output shape after the ignore decision has already been made.
- Prove that ignored nested `Map`, `Set`, and `Error` branches preserve visible descendant fields that would otherwise have been redacted.
- Prove that a non-ignored sibling branch in the same payload still follows ordinary Story `3.3` traversal and targeting.
- Prove that a current-branch terminal path or key rule still outranks ignored-type handling on that same branch.
- Prove that configured substring rules do not fire anywhere inside an ignored transformed representation, including a case whose safe output still contains token-like string content.
- Add compiler-validation coverage for unsupported ignored-type keys, malformed container shapes, and non-boolean entries.
- Extend real consumer declaration fixtures so `ignoredValueTypes` is exercised in both ESM and CJS TypeScript consumers.
- Keep structured assertions as the primary oracle. Do not reduce this story to full-object JSON snapshots, because the critical proof is whether descendant targeting fires or not.

### Previous Story Intelligence

- Story `3.3` already established the supported runtime-value set, deterministic transformer precedence, and the contract that safe transformation happens before descendant targeting. Story `3.4` must build on that seam rather than replacing it.
- Story `3.2` introduced active and completed identity tracking in the current runtime. Ignored-value handling must continue to respect that identity machinery for supported object values.
- Story `2.5` and Story `2.6` fixed the targeting precedence ladder and literal-key defaults. Ignored-value handling must fit underneath that already-established precedence contract.
- Story `2.1` and Story `2.2` fixed whole-value replacement, removal, retain-structure, function-censor, and same-length replacement semantics. Ignored-value matching must not let descendant processing outrank those whole-value decisions.

### Recent Git Intelligence

- `82e67a0 feat(API): resolve built-in and custom transformers deterministically` is the direct parent implementation pattern. Story `3.4` should extend that new transformer seam rather than inventing a separate runtime pass.
- `9971d06 feat(internals): safely handle circular refs and revisted identities` is still relevant because ignored supported object values must keep using the existing identity-tracking seam rather than bypassing it unsafely.
- The current worktree was clean before this story-file creation, so there is no unrelated source churn that should influence the implementation plan.

### Latest Technical Information

- Checked on **6 May 2026** against the local repository baseline.
- The current contributor toolchain is pinned by [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1) and [package.json](/Users/ben/Code/deep-redact/package.json:10), so this story should follow the repo’s fixed Node and package-manager baseline rather than chasing external version changes.
- The public declaration harness already compiles both ESM and CJS consumer fixtures through [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12); Story `3.4` should extend that existing contract instead of inventing a one-off type check.

### Open Questions / Assumptions

- Assume the new public option name should be `ignoredValueTypes`, not a reused legacy `types` flag and not a transformer-bucket extension.
- Assume the initial v4 surface should remain root-level and compile-once only. No current epic, PRD, or architecture artefact requires per-path ignored-type overrides.
- Assume “preserving safe output” in this story refers to the current branch still being resolved through the Story `3.3` transformer contract before descendant redaction is suppressed.
- Assume the ignored-branch boundary should be implemented conservatively: once the current supported runtime value has been safely transformed, descendant targeting does not proceed into that transformed representation. If a failing contract later proves that additional non-targeting safety descent is required, add the smallest possible runtime flag rather than replacing the current seam wholesale.
- Assume transformer failure, local `[UNSUPPORTED]` substitution, and sanitised diagnostics remain entirely deferred to Story `3.5`.

### Project Context Reference

- All code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:3).
- Planning artefacts remain under `_bmad-output/**`, not `docs/`. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:16).
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:22).

### Project Structure Notes

- The active v4 implementation surface remains `src/core/`, `src/transformers/`, `src/types/`, `src/index.ts`, and `test/`.
- No dedicated UX artefact was found for this story. The work is runtime-contract and public-type shaping only.
- Generated output still lives under `dist/` and should be refreshed through the existing build pipeline only if public-source changes require it.

### References

- Story definition: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:919), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:423)
- Architecture contract: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:134), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:139), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:203), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:820)
- Previous implementation context: [3-3-resolve-built-in-and-custom-transformers-deterministically.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-3-resolve-built-in-and-custom-transformers-deterministically.md)
- Current runtime seams: [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1038), [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:48), [src/core/compiler/compile-transformers.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-transformers.ts:19)
- Public type and declaration seams: [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:19), [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:3), [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:3), [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1), [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Manual `validate-create-story` review on `2026-05-06` used [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md) because the older `_bmad/core/tasks/validate-workflow.xml` path referenced in some earlier story files is not present in this repository snapshot.
- Current v4 runtime inspection confirmed that supported transformed runtime-value detection still lives in [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:48) and flows through [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1038), so Story `3.4` should extend those seams rather than introduce a parallel matcher path.
- Validation tightened Story `3.4` in place by adding an explicit raw-value-versus-custom-transformer regression requirement, explicit substring-suppression coverage inside ignored transformed output, and a helper-reuse guardrail for supported-kind detection.
- `2026-05-06`: `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Built-in and custom transformer resolution|Ignored value types suppress descendant redaction inside transformed runtime values|Reusable redactor factory contract"` passed after adding ignored-value contract coverage and root-option validation cases.
- `2026-05-06`: `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts`, `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm run test`, and `pnpm run build` all passed after wiring the compiled ignored-value-type plan through the public surface, validation, runtime, and declarations.
- `2026-05-06`: `pnpm run test:red-phase` failed in legacy `test/unit/index.test.ts` and `test/load/redact.test.ts` because those suites still instantiate the removed `DeepRedact` class and configure legacy `blacklistedKeys`, so the story remains `in-progress` instead of moving to `review`.

### Completion Notes List

- Manually validated Story `3.4` against the local create-story checklist and retained its `ready-for-dev` status.
- Added explicit implementation and test guardrails for ignored-type interaction with winning custom transformers.
- Added direct substring-suppression coverage requirements so ignored transformed output cannot accidentally re-enter `stringTests`.
- Added a dedicated `ignoredValueTypes` v4 option, compiled it into an immutable initialisation-time plan, and re-exported the public type through the supported v4 surface.
- Integrated raw-value ignored-type matching into the existing supported-runtime transformer seam so matched branches still produce safe transformed output but do not re-enter descendant key, path, or substring targeting.
- Added contract, compiler-validation, and consumer declaration coverage for ignored `BigInt`, `Map`, `Set`, `Error`, `URL`, mixed sibling branches, and custom-transformer output-shape changes.
- Verified focused Story `3.4` coverage plus `lint`, `test`, and `build`; `test:red-phase` remains blocked by pre-existing legacy `DeepRedact` constructor tests outside this story’s scope.

### File List

- _bmad-output/implementation-artifacts/3-4-exclude-ignored-value-types-from-descendant-redaction-while-preserving-safe-output.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/compiler/compile-ignored-value-types.ts
- src/core/compiler/compile-redactor-plan.ts
- src/core/runtime/redact-value.ts
- src/core/validation/validate-config.ts
- src/index.ts
- src/transformers/resolve-transformer.ts
- src/types/config.ts
- src/types/ignored-value-types.ts
- src/types/public.ts
- test/contract/api/create-redactor.test.ts
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts

## Change Log

- 2026-05-06: Manually validated Story `3.4` against [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md), added explicit raw-value/custom-transformer and substring-suppression guardrails, and kept the story `ready-for-dev`.
- 2026-05-06: Implemented ignored runtime-value-type branch suppression across public types, validation, compilation, runtime orchestration, contract coverage, unit coverage, consumer declarations, and generated build output; held the story in `in-progress` because legacy `test:red-phase` suites still fail outside this scope.
