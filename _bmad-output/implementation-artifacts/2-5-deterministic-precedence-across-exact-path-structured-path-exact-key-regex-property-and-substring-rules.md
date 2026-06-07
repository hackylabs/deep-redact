# Story 2.5: Deterministic Precedence Across Exact Path, Structured Path, Exact Key, Regex Property, and Substring Rules

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want overlapping exact path, structured path, exact key, regex property, and substring rules to resolve in one deterministic order across the same nested payload,
so that sensitive data is redacted once without ambiguity or double application.

## Acceptance Criteria

1. Given one nested payload contains values that match more than one of these selector types in the same redaction call, when redaction runs, then one redacted result is returned, and the matches are resolved using this ordered precedence ladder: exact path, structured path, exact key, regex property, substring.
2. Given the same leaf matches an exact path rule and any lower-precedence rule, when redaction runs, then the exact path rule wins, and the leaf is redacted once only.
3. Given the same leaf matches a structured path rule and any lower-precedence rule other than an exact path rule, when redaction runs, then the structured path rule wins, and the leaf is redacted once only.
4. Given the same leaf matches an exact key rule and any lower-precedence rule other than an exact path or structured path rule, when redaction runs, then the exact key rule wins, and the leaf is redacted once only.
5. Given the same leaf matches a regex property rule and a substring rule, when redaction runs, then the regex property rule wins, and substring replacement is not applied to that leaf.
6. Given a matched container is redacted with `retainStructure: true`, when redaction runs, then the container remains present in the output, and traversal continues into its descendants, and descendant substring matches are still applied unless that descendant is already fully redacted by a higher-precedence whole-value rule.
7. Given overlapping rules are configured, when redaction runs repeatedly with the same input and configuration, then the output is identical on every run.

## Tasks / Subtasks

- [x] Lock the Story 2.5 precedence ladder into explicit contract coverage (AC: 1-7)
  - [x] Add a dedicated `describe('Story 2.5: precedence across path, key, and substring targeting')` block in `test/contract/api/create-redactor.test.ts` near the existing Epic 2 contract coverage. Keep this work in the current contract file rather than creating a new suite or folder.
  - [x] Add a single nested-payload contract case that exercises all five layers together and proves one deterministic result per leaf: exact path, structured path, exact key, regex-key, and substring (AC: 1).
  - [x] Add a focused contract proving exact path outranks structured path, exact key, regex-key, and substring on the same leaf, and that the leaf is redacted once only (AC: 2).
  - [x] Add a focused contract proving a structured path outranks exact key, regex-key, and substring when no exact path rule matches (AC: 3).
  - [x] Add a focused contract proving an exact key outranks regex-key and substring when no path rule matches (AC: 4).
  - [x] Add a focused contract proving a regex-key rule outranks substring replacement on the same leaf (AC: 5).
  - [x] Add retained-container coverage proving traversal continues inside a `retainStructure: true` match, but leaves already claimed by an inherited or more specific whole-value rule do not also run substring replacers; free leaves in the same payload may still use substring targeting where no higher-precedence rule applies (AC: 6).
  - [x] Add repeated-run determinism coverage that invokes the same redactor at least twice with the same overlapping-rule payload and asserts byte-for-byte equivalent output (AC: 7).
  - [x] Use `vi.fn()` spies and deliberately distinct markers such as `[EXACT-PATH]`, `[STRUCTURED-PATH]`, `[EXACT-KEY]`, `[REGEX-KEY]`, and `[SUBSTRING]` so failures reveal which layer won and whether substring logic ran more than once.
  - [x] Reuse the codebase's existing internal term `regex-key` in implementation-facing test names and comments, while mapping it back to the product language "regex property" only where helpful.

- [x] Keep production changes surgical and only in the runtime if a new Story 2.5 contract fails (AC: 1-6)
  - [x] Start from `src/core/runtime/redact-value.ts`, where `selectActivePolicy(...)` already resolves `exact-path` -> `dynamic-path` -> inherited retained path -> `exact-key` -> `regex-key`, and `transformNode(...)` applies that active whole-value policy before `transformSubstringValue(...)`.
  - [x] If a new Story 2.5 test fails, fix the precedence decision in `selectActivePolicy(...)`, direct-key resolution, or the substring gate without widening the public API.
  - [x] Preserve the current invariants: exact and structured path rules may override inherited retained parents when they are more specific; key rules do not outrank path rules; substring rules run only when no higher-precedence whole-value rule has already claimed that leaf.
  - [x] Do not change `src/core/compiler/compile-redactor-plan.ts`, `src/core/validation/*.ts`, `src/types/**/*.ts`, or generated consumer fixtures unless a failing Story 2.5 test proves missing compile-time data or a public-contract mismatch.

- [x] Verify behaviour and preserve repository discipline (AC: 1-7)
  - [x] Run the focused contract file while iterating, then run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase` under Node `24.14.1`.
  - [x] Record whether Story 2.5 required runtime edits or whether the behaviour was already latent and is now locked down by contract tests.
  - [x] If runtime source changes land, regenerate `dist/index.js` only through `pnpm run build`; never hand-edit `dist/`.

## Dev Notes

### Story Intent

- Story 2.5 turns the implicit runtime precedence ladder into an explicit, named contract for FR15. The implementation goal is not a new targeting mode; it is to prove that exact path, structured path, exact key, regex property, and substring rules compose deterministically on the same payload.
- The likely outcome is small or no production-code change. Manual probes against the current built package already show path and key rules beating substring rules, and retained parent policies preventing double redaction. The main gap is explicit Story 2.5 coverage that uses the exact precedence terms from the epic and locks the behaviour against regressions.
- Public precedence documentation remains out of scope here. Story `4.4` owns the normative precedence matrix and any documentation or artefact publication.

### Technical Requirements

- Use the existing runtime primitives rather than inventing a second precedence engine.
- `selectActivePolicy(...)` in `src/core/runtime/redact-value.ts` is the current source of truth for whole-value precedence. Any runtime fix should stay centred there.
- `transformNode(...)` currently applies `activePolicy` before `transformSubstringValue(...)`; preserve that ordering so whole-value rules win before substring rules on the same leaf.
- `resolveDirectKeyMatch(...)` already separates exact key and `regex-key` handling. Preserve exact-key-over-regex-key order.
- For `retainStructure: true` parents, traversal must continue into descendants, but a descendant already claimed by an inherited or more specific whole-value rule must not also run a substring replacer.
- Any new test payload should prove "redacted once only", not just the final censor text. Prefer spies or asymmetric outputs that reveal double application.
- Use canonical test markers such as `[EXACT-PATH]`, `[STRUCTURED-PATH]`, `[EXACT-KEY]`, `[REGEX-KEY]`, and `[SUBSTRING]` so failures immediately reveal which layer won.

### Architecture Compliance

- Keep `src/index.ts` and `src/core/create-redactor.ts` as thin entrypoints; Story 2.5 should not widen the public surface.
- Keep precedence enforcement inside `src/core/runtime/redact-value.ts`; do not duplicate the same decision logic in tests or helper modules.
- Preserve the compile-once immutable plan model from `src/core/compiler/compile-redactor-plan.ts`.
- Preserve the explicit architecture ladder from `_bmad-output/planning-artifacts/architecture.md`: exact string-path > structured path > exact key > regex property > substring; whole-value censor or removal outranks substring replacement.
- Do not turn this story into documentation work. Architecture and PRD both defer the published normative precedence matrix to Story `4.4`.

### Library / Framework Requirements

- Use the pinned repository baseline, not the latest registry versions, unless a proven toolchain bug blocks the work:
  - `pnpm@10.33.0`
  - contributor runtime from `.nvmrc`: Node `24.14.1`
  - `package.json` engine floor: Node `>=22.18.0`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Keep ESM source conventions and explicit `.js` specifiers in TypeScript source modules.
- Do not add dependencies.

### File Structure Requirements

- Primary expected edit: `test/contract/api/create-redactor.test.ts`
- Conditional runtime edit only if needed: `src/core/runtime/redact-value.ts`
- Generated artefact only if runtime source changes require rebuild: `dist/index.js`
- No new docs, no new planning files, no new public types, and no new test directories for this story.

### Testing Requirements

- Add Story 2.5 contract tests first and make them fail for any uncovered precedence gap before changing runtime code.
- Keep Story 2.5 coverage in `test/contract/api/create-redactor.test.ts`, following the current repo pattern; do not introduce `test/contract/precedence/` yet unless separately directed.
- Required scenarios:
  - single nested payload with all five targeting modes present and one deterministic result per leaf
  - exact path wins over every lower layer
  - structured path wins over exact key, regex-key, and substring
  - exact key wins over regex-key and substring
  - regex-key wins over substring
  - retained-container traversal continues, but already claimed descendants do not run substring replacers
  - repeated runs with the same input and configuration stay byte-for-byte equivalent
- Keep Story 2.5 cases nested. Root primitive string matching remains owned by Story `2.4` and should only move if a nested precedence regression proves that work was accidentally broken.
- Reuse and extend existing precedence tests instead of duplicating near-identical fixtures where possible.
- After focused iteration, run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase`. Treat pre-existing red-phase failures as retained unless Story 2.5 changes them.

### Implementation Guardrails

- Do not change the public option names or add a new explicit `precedence` config.
- Do not change compile-time validation just to encode behaviour already represented in runtime order.
- Do not let test-only language drift from the codebase's existing internal terms: use `regex-key` in implementation references, and mention "regex property" only when mapping back to the product language.
- Do not apply substring replacement after a whole-value rule has already censored or removed that leaf.
- Do not let a retained parent policy prevent more specific exact or structured path rules from overriding it on descendants; existing tests already rely on that behaviour.
- Do not update README, migration docs, or generated examples here. Story `4.4` and Epic `5` own public precedence exposition and published examples.
- Do not hand-edit generated artefacts.

### Current Source State

- `src/core/runtime/redact-value.ts` already resolves precedence in the right general order: exact path, dynamic path, inherited retained path, exact key, regex key, then substring only if no whole-value policy has claimed the leaf.
- Existing contract coverage already proves:
  - exact path beats exact key
  - exact path beats regex-key
  - exact path beats wildcard and regex path rules
  - dynamic path beats regex-key
  - retained parent path policy can be overridden by a more specific descendant path rule
  - a generic "path or key beats substring" case
- The existing contract test `'does not apply substring rules to values already selected by existing path or key targeting'` is the closest seed for Story 2.5. Expand or mirror that fixture shape instead of creating a disconnected duplicate.
- The gap is that Story 2.5 does not yet have an explicit, named contract block covering the full five-layer ladder using the canonical epic terminology and repeated-run determinism.
- Manual probes against the current built package already show:
  - exact path beats substring
  - exact key beats substring
  - regex-key beats substring
  - retained parent path policy prevents descendant substring double-application while free sibling leaves can still use substring rules
- Because the current runtime appears correct, expect this story to be mostly contract hardening unless a newly added failing case exposes a hidden edge.

### Previous Story Intelligence

- Story `2.4` added root-string whole-value handling and intentionally routes root matches through `applyRedaction(...)`, not a substring `replacer`. That work should remain untouched unless a new Story 2.5 test accidentally exercises root primitives.
- Story `2.3` introduced ordered `stringTests`, `CompiledSubstringRule`, `patternMatchesString(...)`, and the nested-string leaf hook in `redact-value.ts`. Story 2.5 builds directly on that path and must not regress first-match-wins or partial rewrite semantics.
- Epic 1 stories already established the path and key layers that Story 2.5 composes:
  - Story `1.3` exact path rules and canonical exact-path normalisation
  - Story `1.4` structured or dynamic path matching with wildcard and ignore segments
  - Story `1.5` regex-based property matching
- The existing generic substring-precedence contract test in `create-redactor.test.ts` is the seed to expand, not a behaviour to replace.
- Story `2.4` and the recent implementation commits show a stable pattern: one contract file for public API behaviour, surgical runtime edits only, `dist/index.js` regenerated only via build, and sprint status updated after the story is contexted or implemented.

### Recent Git Intelligence

- `ab3448f feat(API): redact matching root primitive string inputs` touched only `src/core/runtime/redact-value.ts`, `test/contract/api/create-redactor.test.ts`, `dist/index.js`, and the BMAD artefacts. That is the correct surgical footprint if Story 2.5 needs a runtime fix.
- `2d0d6df feat(API): react matched substrings in nested string values` added the substring machinery across `compile-redactor-plan.ts`, `redact-value.ts`, `validate-config.ts`, public types, consumer fixtures, and the contract file. Story 2.5 should avoid reopening that wider surface unless a failing test proves truly missing compile-time data.
- `5e7b3f8 feat(API): support function censors and same length string replacement` confirmed `applyRedaction(...)` as the shared whole-value mechanism. Story 2.5 should continue to treat whole-value path or key wins as `applyRedaction(...)` outcomes rather than bespoke replacement logic.

### Project Structure Notes

- The actual repository structure is leaner than the planning architecture sketch: the active runtime lives in `src/core/**`, the public contract tests live in `test/contract/api/create-redactor.test.ts`, and generated output lives in `dist/`.
- Keep implementation work in the existing files rather than introducing new runtime or test helper modules for a small precedence story.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this story file belongs under `_bmad-output/implementation-artifacts/`.

### References

- Planning artefacts:
  - `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.5; Epic 1 Stories 1.3-1.5; Story 4.4 precedence follow-on
  - `_bmad-output/planning-artifacts/prd.md` — FR15, NFR8, NFR9
  - `_bmad-output/planning-artifacts/architecture.md` — API & Communication Patterns; Path Grammar & Selector Contract; Implementation Patterns & Consistency Rules
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `project-context.md`
- Previous implementation context:
  - `_bmad-output/implementation-artifacts/2-4-redact-matching-root-primitive-string-inputs.md`
  - recent commits `ab3448f`, `2d0d6df`, `5e7b3f8`
- Current repo files:
  - `src/core/runtime/redact-value.ts`
  - `src/core/compiler/compile-redactor-plan.ts`
  - `src/core/create-redactor.ts`
  - `src/core/replacement/apply-redaction.ts`
  - `test/contract/api/create-redactor.test.ts`
  - `package.json`
  - `.nvmrc`

## Story Completion Status

Implementation, review hardening, and focused verification completed; story is done.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Validation framework `_bmad/core/tasks/validate-workflow.xml` is not present in this repository snapshot, so checklist validation for create-story was performed manually against `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`.
- Added a dedicated Story 2.5 contract block to `test/contract/api/create-redactor.test.ts` covering the five-layer precedence ladder, retained-container traversal, and repeated-run determinism.
- Senior review identified missing explicit coverage for retained-path inheritance over exact-key and regex-key descendants, plus missing structured-output repeated-run determinism coverage.
- Hardened the retained-container contract to prove inherited retained-path precedence over exact-key, regex-key, and substring matches while preserving exact-path override behaviour on a descendant leaf.
- Added a second repeated-run determinism contract for default structured output and asserted that repeated runs leave the caller-owned input unchanged.
- `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Story 2.5:" --reporter=verbose` passed before and after the review hardening without requiring any runtime edits.
- `pnpm run lint` passed under Node `v24.14.1`.
- `pnpm run test` passed under Node `v24.14.1`.
- `pnpm run test:red-phase` still fails in legacy `DeepRedact` constructor suites (`test/load/redact.test.ts`, `test/unit/index.test.ts`) that this story did not modify.

### Implementation Plan

- Add explicit Story 2.5 contract coverage in the existing API contract file using distinct winner markers and spies to prove one redaction pass per leaf.
- Run the focused Story 2.5 contract slice before touching runtime code, and only edit `src/core/runtime/redact-value.ts` if the new precedence tests expose a real gap.
- Finish with the required repository validations and record any retained unrelated red-phase failures instead of widening Story 2.5 scope.

### Completion Notes List

- Locked the precedence ladder into explicit contract coverage for exact-path, structured path, exact-key, regex-key, substring, retained-container traversal, and repeated-run determinism across both serialised and structured outputs.
- Closed the review follow-up gaps by proving inherited retained-path precedence over exact-key and regex-key descendants, while continuing to block descendant substring double-application under the retained path.
- The current runtime already satisfied the Story 2.5 precedence contract, so no production or generated artefact changes were required.
- `pnpm run lint` and `pnpm run test` passed under Node `24.14.1`.
- `pnpm run test:red-phase` retains unrelated legacy `DeepRedact is not a constructor` failures outside Story 2.5.

### File List

- `_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `test/contract/api/create-redactor.test.ts`

## Senior Developer Review (AI)

- Reviewer: GPT-5 Codex
- Date: 2026-05-04
- Outcome: Approved after fixes
- Findings addressed: strengthened retained-container precedence coverage so inherited retained-path policy explicitly beats exact-key, regex-key, and substring descendants unless a more specific exact-path rule overrides; added structured-output repeated-run determinism coverage and input immutability assertions alongside the existing serialised-output check.
- Verification: `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Story 2.5:" --reporter=verbose`

## Change Log

- 2026-05-04: Added Story 2.5 API contract coverage for deterministic precedence across exact-path, structured path, exact-key, regex-key, and substring rules; confirmed no runtime changes were needed; recorded retained unrelated `test:red-phase` failures in legacy `DeepRedact` suites.
- 2026-05-04: Hardened Story 2.5 review coverage for retained-path inheritance over exact-key and regex-key descendants and for default structured-output repeated-run determinism; approved the story and moved it to done.
