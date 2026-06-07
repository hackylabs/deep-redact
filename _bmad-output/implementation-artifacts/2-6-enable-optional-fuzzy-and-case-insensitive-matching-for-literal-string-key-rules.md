# Story 2.6: Enable Optional Fuzzy and Case-Insensitive Matching for Literal String Key Rules

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want literal string key rules in the v4 `keys` API to support optional fuzzy and case-insensitive matching,
so that I can redact variant field names without enumerating every naming or formatting variant.

## Acceptance Criteria

1. Given Epic 2.6 is limited to literal string key rules, when global matching options are supplied through the public v4 factory options, then each literal string key rule in `keys` inherits `fuzzyKeyMatch` and `caseSensitiveKeyMatch` unless that rule explicitly overrides either setting.
2. Given two literal string key rules in the same redactor, when one rule defines local matching options and the other does not, then the local options apply only to the rule that defines them, and they do not change the behaviour of the other rule.
3. Given `fuzzyKeyMatch: false` and `caseSensitiveKeyMatch: true`, when the configured key is `PassCode`, then only an exact case-sensitive match on `PassCode` is treated as a hit, and `passcode`, `passCode`, and `PASS-CODE` are not hits.
4. Given `fuzzyKeyMatch: false` and `caseSensitiveKeyMatch: false`, when the configured key is `pass_code`, then matching uses canonical equality after lowercasing, trimming, and removing `_` and `-`, and `pass_code`, `pass-code`, `passCode`, and ` PASS_CODE ` are treated as the same key.
5. Given `fuzzyKeyMatch: true` and `caseSensitiveKeyMatch: true`, when the configured key is `pass`, then any payload key containing `pass` with the same case is a hit, and `password` and `passcode` are hits, and `Password` is not.
6. Given `fuzzyKeyMatch: true` and `caseSensitiveKeyMatch: false`, when the configured key is `pass_code`, then matching uses canonical containment after lowercasing, trimming, and removing `_` and `-`, and `passcode`, `passCode`, and `PASS-CODE` are hits.
7. Given a literal string key rule does not match under its active matching settings, when redaction runs, then that rule is not applied to that payload key.
8. Given a rule is configured with a `RegExp` key or a path selector is configured elsewhere in the same redactor, when redaction runs, then `fuzzyKeyMatch` and `caseSensitiveKeyMatch` do not alter those rules' matching behaviour.

## Tasks / Subtasks

- [x] Expand the v4 public key-selector contract to support structured literal key rules without reviving legacy `blacklistedKeys` (AC: 1, 2, 8)
  - [x] Introduce a narrow exported `KeyRule` type in `src/types/config.ts` with `key: string`, and re-export it through `src/types/public.ts` and `src/index.ts`. Update the exported union used by `DeepRedactOptions.keys` so the public type surface accepts `string | RegExp | KeyRule` without consumer casts. Keep the scope to `key`, `fuzzyKeyMatch?`, and `caseSensitiveKeyMatch?`; do not reopen per-key censor, remove, or retain-structure behaviour in this story.
  - [x] Add root-level `fuzzyKeyMatch?: boolean` and `caseSensitiveKeyMatch?: boolean` to `DeepRedactOptions`, with defaults of `false` and `true` respectively.
  - [x] Keep `blacklistedKeys` rejected in v4 validation and declaration fixtures. Treat the epic's `blacklistedKeys` wording as legacy intent only, not as a public API change.
  - [x] Update the consumer type fixtures so published declarations accept both bare `string` and `RegExp` key selectors and structured key-rule objects on the `keys` surface.

- [x] Validate and compile literal key rules into deterministic exact-key matching data (AC: 1, 2, 7, 8)
  - [x] Extend `src/core/validation/validate-config.ts` so `keys` accepts `string`, `RegExp`, or a literal-string `KeyRule` object. Validate allowed option names, boolean matching flags, and non-empty string `KeyRule.key` values. Keep bare `RegExp` entries on the existing regex-key path; do not add a parallel object-wrapped regex selector shape in this story.
  - [x] Reject unsupported option names on key-rule objects and do not allow them to accept path-rule or censor semantics in this story.
  - [x] Refactor `src/core/compiler/compile-redactor-plan.ts` so literal string key rules compile into resolved matcher records with global or local matching settings baked in once at initialisation, while regex key rules remain cloned and stored separately.
  - [x] Preserve deterministic order inside the literal exact-key tier: if more than one literal key rule matches after canonicalisation or fuzzy containment, the first configured literal rule wins.
  - [x] Precompute canonical string forms during compilation so runtime does not repeatedly lowercase, trim, and strip separators for every rule on every property walk.

- [x] Wire the new exact-key matcher into runtime precedence and prove the contract end to end (AC: 3, 4, 5, 6, 7, 8)
  - [x] Update `resolveDirectKeyMatch(...)` in `src/core/runtime/redact-value.ts` to resolve literal string key rules using the compiled matcher data before falling back to regex-key rules.
  - [x] Preserve Story 2.5 precedence exactly: exact-path > dynamic-path > inherited retained path > exact-key > regex-key > substring. The new fuzzy or case-insensitive literal matches must stay in the exact-key tier.
  - [x] Add a dedicated `describe('Story 2.6: fuzzy and case-insensitive literal key matching')` block in `test/contract/api/create-redactor.test.ts` covering all eight acceptance criteria, plus one precedence regression proving a fuzzy or case-insensitive literal key hit still beats regex-key and substring but does not outrank path rules.
  - [x] Add at least one function-censor contract proving that when more than one literal key rule matches the same property, the first configured winner is also the rule surfaced through `FunctionCensorContext.rulePath`, using the original configured string rather than a canonicalised surrogate.
  - [x] Add compiler-level tests in `test/unit/core/compiler/compile-redactor-plan.test.ts` for merged global or local matching defaults, frozen compiled matcher records, precomputed canonical forms, and deterministic first-match ordering.
  - [x] Update the consumer declaration fixtures under `test/fixtures/consumers/types/` and `test/fixtures/consumers/types-cjs/` so type-contract coverage includes `KeyRule` and the new root options while `blacklistedKeys` remains invalid.
  - [x] Verify with `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Story 2.6:" --reporter=verbose`, `pnpm exec vitest run test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`, `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase`. Rebuild `dist/` only through `pnpm run build` if source changes require it.

## Dev Notes

### Story Intent

- Story 2.6 reintroduces fuzzy and case-insensitive literal-key matching semantics on the active v4 `keys` surface without undoing the v4 break from the legacy `blacklistedKeys` API.
- The scope is literal string key rules only. Regex-key selectors, path selectors, substring rules, and per-key censor or remove policies stay as they are in this story.
- Epic 2.6 still uses legacy `blacklistedKeys` wording, but the active v4 contract rejects that option in both validation and type fixtures. Implement the requirement through `keys` plus a narrow structured key-rule object, not by reviving the old class-based surface.
- Story 2.5 already locked the precedence ladder in the runtime. Story 2.6 changes only what qualifies as an exact-key hit; it must not alter where exact-key matches sit in that ladder.

### Technical Requirements

- Keep public v4 option names rooted in `keys`; do not add `blacklistedKeys`, `replacement`, `serialize`, or class API compatibility in this story.
- Introduce a narrow `KeyRule` object for literal string keys rather than widening `KeySelector` straight to the legacy `BlacklistKeyConfig`. Local options in scope are only `fuzzyKeyMatch` and `caseSensitiveKeyMatch`, while bare `RegExp` entries continue to represent regex-key selectors.
- Matching semantics must preserve the intended combinations already encoded in Epic 2.6 and the legacy matcher reference:
  - exact plus case-sensitive: raw string equality
  - exact plus case-insensitive: canonical equality after lowercasing, trimming, and removing `_` and `-`
  - fuzzy plus case-sensitive: raw containment
  - fuzzy plus case-insensitive: canonical containment after the same normalisation
- Compile canonical forms once at initialisation. Do not recompute normalised rule strings inside every property walk.
- Preserve deterministic first-configured winner behaviour within literal string key rules when more than one literal rule matches the same property.
- Preserve existing function-censor context semantics: the winning literal rule must surface its original configured string through `FunctionCensorContext.rulePath`, not a canonicalised or normalised derivative.
- Keep `RegExp` key rules on the existing regex-key path. Matching options must not mutate or reinterpret regex semantics.
- If a shared key normaliser is required, place it under `src/core/matching/` or a similarly private v4 helper, not under legacy `src/utils/`.
- Do not broaden exact-key rules to support local censor, remove, or retain-structure settings in this story; that would widen policy compilation rather than just matching behaviour.
- Maintain frozen compiled-plan behaviour for any new exact-key matcher records so repeated calls cannot mutate initialised matching state.

### Architecture Compliance

- Keep `src/index.ts` and `src/core/create-redactor.ts` as thin public entrypoints; Story 2.6 should not widen the factory call shape beyond the documented `DeepRedactOptions`.
- Keep configuration validation in `src/core/validation/validate-config.ts`, compile-once rule resolution in `src/core/compiler/compile-redactor-plan.ts`, and match selection in `src/core/runtime/redact-value.ts`.
- Follow the architecture boundary that matching semantics live in v4 `src/core/**`; do not route the new behaviour through the legacy `DeepRedact` class or `src/utils/index.ts`.
- Preserve the current precedence ladder already established by Story 2.5 and the architecture document: exact path > structured path > exact key > regex property > substring.
- Continue to separate exact-key and regex-key concerns in the compiled plan. Exact-key matching options must not collapse both categories into a single generic matcher bucket.
- Keep generated artefact discipline intact: do not hand-edit `dist/`, and do not modify README or migration docs as part of this matcher story.

### Library / Framework Requirements

- Use the pinned repository baseline, not registry latest, unless a proven toolchain defect blocks the work:
  - Node `24.14.1` from `.nvmrc`
  - package engine floor Node `>=22.18.0`
  - `pnpm@10.33.0`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Latest registry check on 2026-05-04:
  - `tsdown@0.21.10`
  - `typescript@6.0.3`
  - `vitest@4.1.5`
  - `xo@2.0.2`
- Treat that version drift as out of scope for Story 2.6. This story is about exact-key matching semantics, not a toolchain refresh.
- Keep ESM source conventions and explicit `.js` specifiers in TypeScript source modules.
- Do not add runtime dependencies for string normalisation, fuzzy matching, or legacy API shims.

### File Structure Requirements

- Required source files:
  - `src/types/config.ts`
  - `src/types/public.ts`
  - `src/index.ts`
  - `src/core/validation/validate-config.ts`
  - `src/core/compiler/compile-redactor-plan.ts`
  - `src/core/runtime/redact-value.ts`
- Likely test files:
  - `test/contract/api/create-redactor.test.ts`
  - `test/unit/core/compiler/compile-redactor-plan.test.ts`
  - `test/fixtures/consumers/types/index.ts`
  - `test/fixtures/consumers/types-cjs/index.cts`
- Optional helper only if duplication justifies it:
  - `src/core/matching/<new helper>.ts`
- Generated outputs only via build if public types or runtime source changes require regeneration:
  - `dist/index.js`
  - `dist/index.cjs`
  - `dist/index.d.ts`
- Do not edit:
  - legacy `src/types.ts`
  - legacy `src/utils/index.ts`
  - README or migration docs
  - BMAD planning artefacts beyond this story file and `sprint-status.yaml`

### Testing Requirements

- Add contract tests in `test/contract/api/create-redactor.test.ts` for each acceptance criterion using the v4 `keys` API, not the legacy `blacklistedKeys` surface.
- Cover both root-level defaults and per-rule overrides in the same redactor so local matching options prove they do not leak into neighbouring literal key rules.
- Add fast-fail validation coverage for:
  - unsupported option names on key-rule objects
  - non-boolean `fuzzyKeyMatch`
  - non-boolean `caseSensitiveKeyMatch`
  - empty string `key`
  - non-string `KeyRule.key` values
- Add compiler tests proving the compiled exact-key matcher records preserve configuration order, freeze their data, separate literal and regex-key rules, and precompute canonical needles for case-insensitive matching.
- Add at least one contract asserting `FunctionCensorContext.rulePath` reports the first matching configured literal key rule verbatim when more than one literal matcher hits the same payload key.
- Add declaration-fixture coverage showing `KeyRule` and the new root options are exported and accepted, while `blacklistedKeys` remains invalid on the v4 surface.
- Add one precedence regression proving a fuzzy or case-insensitive literal key hit still behaves as an exact-key winner relative to regex-key and substring rules, while exact-path and structured path rules still outrank it.
- Use targeted markers such as `[FUZZY-KEY]`, `[CASE-INSENSITIVE-KEY]`, and `[REGEX-KEY]` in contract payloads so failures reveal which tier won.
- Verify with the focused contract and compiler commands first, then run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase`. Treat pre-existing red-phase failures as retained unless Story 2.6 changes them directly.

### Previous Story Intelligence

- Story 2.5 hardened precedence in `src/core/runtime/redact-value.ts` with `selectActivePolicy(...)` resolving exact-path -> dynamic-path -> inherited retained path -> exact-key -> regex-key before substring. Story 2.6 must preserve that order while expanding exact-key hit detection.
- Story 2.5 contract tests already distinguish `[EXACT-KEY]` and `[REGEX-KEY]`. Extend that style instead of inventing a separate matching harness for Story 2.6.
- Story 2.4 confirmed root primitive string matching routes through whole-value redaction rather than substring replacers. Story 2.6 should stay on object-property key matching and must not spill into root-string behaviour.
- Story 2.3 introduced ordered substring handling. Fuzzy or case-insensitive exact-key hits must still block substring redaction on the same leaf because they remain exact-key winners, not substring matches.
- Recent Epic 2 stories have kept the footprint surgical: contract-first changes in `test/contract/api/create-redactor.test.ts`, compiler or runtime edits only when needed, and generated `dist/` updates only through build.
- The current v4 runtime and compiler assume one shared exact-key policy bucket. Story 2.6 is the first story that likely requires exact-key compilation to carry per-rule matching metadata rather than a raw lookup table of strings.

### Recent Git Intelligence

- `e41c6fd feat(API): determinitic precedence across exact and structured, exact key and regex property, and substring rules` modified only the Story 2.5 artefact, sprint status, and `test/contract/api/create-redactor.test.ts`. That indicates the runtime already satisfied the previous precedence contract and the newest public-contract work is centralised in the API contract file.
- `ab3448f feat(API): redact matching root primitive string inputs` and `2d0d6df feat(API): react matched substrings in nested string values` both kept changes concentrated in `src/core/runtime/redact-value.ts`, the compiler or validation only when necessary, and the same contract test file. Story 2.6 should follow that surgical pattern.
- `5e7b3f8 feat(API): support function censors and same length string replacement` reinforced the established design: compile once at initialisation, reuse the compiled plan at runtime, and route whole-value redaction through shared policy handling instead of bespoke branch-specific logic.
- Git status was clean before this story was created, so the developer can treat Story 2.6 as a focused delta rather than a merge-recovery task.

### Latest Technical Information

- Registry checks on 2026-05-04 show minor newer releases for `tsdown`, `typescript`, and `vitest`, but no toolchain change is required to implement Story 2.6 correctly.
- The story-relevant technical risk is not dependency currency; it is preserving deterministic runtime semantics while widening exact-key matching. The developer should therefore prefer compile-time precomputation and contract coverage over any unrelated package updates.
- JavaScript string normalisation and containment are sufficient for the required matching modes here. No external fuzzy-matching library is warranted for canonical equality or containment after trimming, lowercasing, and stripping `_` and `-`.

### Project Context Reference

- All new code, comments, tests, and documentation in this story must use British English outside quoted identifiers and third-party API names.
- Planning artefacts remain under `_bmad-output/**`, not `docs/`.
- Outside BMAD-owned directories, avoid BMAD work-item terminology in public-facing code or documentation.

### Project Structure Notes

- The active v4 implementation lives under `src/core/**` and `src/types/**`; the legacy class implementation lives under `src/utils/**` and `src/types.ts`. Story 2.6 belongs only in the v4 side.
- Public API contract tests are intentionally centralised in `test/contract/api/create-redactor.test.ts`; keep Story 2.6 API behaviour there unless a genuinely reusable unit boundary emerges.
- Consumer declaration fixtures under `test/fixtures/consumers/types*` are part of the shipped API surface and need updating whenever exported types change.
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; implementation story files stay under `_bmad-output/implementation-artifacts/`.

### References

- Planning artefacts:
  - `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.6; Story 2.5 for precedence continuity
  - `_bmad-output/planning-artifacts/prd.md` — FR6, FR7, FR15, NFR8, NFR9
  - `_bmad-output/planning-artifacts/architecture.md` — compile-once rule plan, runtime precedence, and v4 API direction
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `project-context.md`
- Current v4 source:
  - `src/types/config.ts`
  - `src/types/public.ts`
  - `src/index.ts`
  - `src/core/create-redactor.ts`
  - `src/core/validation/validate-config.ts`
  - `src/core/compiler/compile-redactor-plan.ts`
  - `src/core/runtime/redact-value.ts`
  - `test/contract/api/create-redactor.test.ts`
  - `test/unit/core/compiler/compile-redactor-plan.test.ts`
  - `test/fixtures/consumers/types/index.ts`
  - `test/fixtures/consumers/types-cjs/index.cts`
  - `package.json`
  - `.nvmrc`
- Legacy semantic reference only:
  - `src/utils/index.ts`
  - `test/unit/redactorUtils.test.ts`
- Recent commits:
  - `e41c6fd`
  - `ab3448f`
  - `2d0d6df`
  - `5e7b3f8`

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

Story status set to `ready-for-dev`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `_bmad/core/tasks/validate-workflow.xml` is not present in this repository snapshot, so create-story validation was performed manually against `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`.
- Epic 2.6 still references `blacklistedKeys`, but the active v4 contract rejects that legacy option. This story explicitly translates the requirement onto the `keys` API to avoid reopening the class-based surface.
- Registry versions checked on 2026-05-04 via `npm view`: `tsdown@0.21.10`, `typescript@6.0.3`, `vitest@4.1.5`, `xo@2.0.2`.
- Manual checklist re-validation on 2026-05-04 found two story-spec gaps and tightened them in place: the public `keys` type union is now explicit about `KeyRule`, and deterministic first-match winner semantics now explicitly include `FunctionCensorContext.rulePath`.
- `pnpm exec vitest run test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` does not discover unit files under this repository's default Vitest include set, so compiler verification used `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`.
- `pnpm run test:red-phase` still reports retained legacy failures in `test/unit/index.test.ts` and `test/load/redact.test.ts` because those suites expect the removed `DeepRedact` constructor on the v4 root surface; Story 2.6 did not modify that legacy API area.

### Completion Notes List

- Exported `KeyRule` on the v4 public surface, added root `fuzzyKeyMatch` and `caseSensitiveKeyMatch` defaults to `DeepRedactOptions`, and updated both ESM and CJS consumer fixtures to cover the widened `keys` union while keeping `blacklistedKeys` invalid.
- Extended v4 config validation so `keys` accepts `string`, `RegExp`, or a narrow literal-string `KeyRule`, rejects unsupported object options, and preserves the existing regex-key validation path.
- Replaced the exact-key lookup table with ordered frozen literal matcher records plus a shared key normaliser so canonical needles are compiled once and first-match winner order stays deterministic.
- Updated runtime direct-key resolution to support exact or fuzzy and case-sensitive or case-insensitive literal matching without changing Story 2.5 precedence or `FunctionCensorContext.rulePath` semantics.
- Added Story 2.6 contract coverage, compiler-plan coverage, declaration-fixture coverage, and regenerated `dist/`; `pnpm run test` passes, while `pnpm run test:red-phase` retains unrelated legacy `DeepRedact` constructor failures outside the Story 2.6 v4 scope.

### File List

- `_bmad-output/implementation-artifacts/2-6-enable-optional-fuzzy-and-case-insensitive-matching-for-literal-string-key-rules.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/core/compiler/compile-redactor-plan.ts`
- `src/core/matching/key-normaliser.ts`
- `src/core/runtime/redact-value.ts`
- `src/core/validation/validate-config.ts`
- `src/index.ts`
- `src/types/config.ts`
- `src/types/public.ts`
- `test/contract/api/create-redactor.test.ts`
- `test/fixtures/consumers/types-cjs/index.cts`
- `test/fixtures/consumers/types/index.ts`
- `test/unit/core/compiler/compile-redactor-plan.test.ts`
- `test/unit/core/matching/key-normaliser.test.ts`

## Change Log

- 2026-05-04: Implemented Story 2.6 on the v4 `keys` API with exported `KeyRule`, root literal-key matching defaults, ordered compiled literal matchers, Story 2.6 contract and compiler coverage, and regenerated `dist/`.
