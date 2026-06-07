# Story 1.5: Match Sensitive Fields by Regex-Based Property Names

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one service redactor to support regex-based object property matching,
so that I can redact predictable sensitive fields even when property names vary within known patterns.

## Acceptance Criteria

1. Given regex-based property matching is configured through the public factory options, when the redactor is invoked on nested objects or arrays, then properties whose names match the configured regular expression are redacted wherever they occur.
2. Given a payload containing both matching and non-matching property names, when redaction runs, then only the matched properties are redacted, and non-targeted sibling values remain unchanged in the returned result.
3. Given a payload where the same leaf matches both an exact-path rule and a regex-based property rule, when redaction runs, then the exact-path rule takes precedence, and that leaf is redacted once only.
4. Given a configuration containing an invalid, unsupported, or unsafe property regular expression, when the factory initialises, then initialisation fails with a validation error before any redactor is created.
5. Given a JavaScript or TypeScript consumer, when regex-based property matching is configured through the public entrypoint, then the supported option shape is typed and editor-discoverable.

## Tasks / Subtasks

- [x] Widen the public key-selector contract for regex property rules (AC: 1, 5)
  - [x] Extend [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) and [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts) so `keys` accepts exact strings and `RegExp` instances, preferably through a named `KeySelector = string | RegExp` export.
  - [x] Re-export any new public key-selector type through [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts), because the package entrypoint uses an explicit type export list.
  - [x] Keep regex property matching inside the existing `keys` option. Do not add `blacklistedKeys`, `regexKeys`, `propertyRegexes`, or other parallel public configuration names.
  - [x] Keep path-selector regex segments out of this story. `RegExp` values inside structured `paths` remain unsupported until Story `1.6`.
  - [x] Update TypeScript consumer fixtures in [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts) and [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts) so ESM and CommonJS consumers can discover regex key selectors and any exported `KeySelector` type.

- [x] Validate regex property selectors at initialisation (AC: 4, 5)
  - [x] Extend [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) so `keys` entries accept non-empty strings or `RegExp` instances only.
  - [x] Keep regex-like string selectors such as `'/password/i'` invalid; users must pass real `RegExp` values such as `/password/i`.
  - [x] For this story, reject `RegExp` values with `global` or `sticky` flags to avoid stateful `lastIndex` behaviour during repeated property-name checks.
  - [x] Add a conservative safe-regex validation helper with named limits for regex source length and known catastrophic nested-quantifier shapes. Reject unsafe patterns such as `/^(a+)+$/` during factory initialisation.
  - [x] Do not add a runtime dependency for regex safety. Keep the package zero-runtime-dependency.

- [x] Compile exact and regex key rules into immutable plan state (AC: 1, 4)
  - [x] Evolve [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) so exact string keys stay in the current null-prototype lookup table and regex key selectors are stored in a separate compiled collection.
  - [x] Compile regex key matchers once at initialisation. Do not reparse or recreate user regexes during traversal.
  - [x] Preserve the current global-policy model for key rules: regex property matches use the compiled global `censor`, `remove`, and `retainStructure` defaults, matching exact-key behaviour in this story.
  - [x] If a reusable matcher helper is introduced, keep it in the current v4 core structure, such as `src/core/matching/key-matcher.ts`, rather than importing from legacy v3 utilities.

- [x] Apply regex property matching during object traversal without regressing path or key behaviour (AC: 1, 2, 3)
  - [x] Extend [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) so `transformObject` checks each own enumerable property key against compiled regex key rules.
  - [x] Do not match array indexes as regex property keys in `transformArray`; arrays should still be traversed so regex-matched property names inside array elements are redacted.
  - [x] Preserve precedence: exact path rules outrank dynamic path rules, all path rules outrank key rules, and exact key rules outrank regex property rules.
  - [x] Ensure a leaf that matches a path rule and a regex property rule is redacted once only, using the higher-precedence path policy.
  - [x] Preserve the current non-mutating traversal approach, safe sibling preservation, sparse-array behaviour, and prototype-named key handling from previous stories.

- [x] Add focused contract, unit, and type coverage (AC: 1, 2, 3, 4, 5)
  - [x] Extend [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) with nested object and array-element cases such as `keys: [/password$/i]`, proving matching property names are redacted wherever they occur and siblings remain unchanged.
  - [x] Add coverage proving exact-path and dynamic path rules still outrank regex property matches on the same leaf, with path-specific `censor` values making the precedence observable.
  - [x] Add green-gate validation coverage for regex-like string rejection, stateful flag rejection, unsafe nested-quantifier rejection, and non-`string | RegExp` key entries so required regex safety is not proved only in the retained red-phase lane.
  - [x] Add coverage proving accepted non-stateful `RegExp` selectors do not mutate caller-owned regex state during repeated redaction. Use a configured regex object across multiple calls and assert its `lastIndex` remains unchanged.
  - [x] Add compiler or matcher unit tests under `test/unit/core/` for exact-key versus regex-key bucket separation and deterministic regex matching as supporting coverage, and run those files directly because the default green Vitest config does not include `test/unit/**`.
  - [x] Extend declaration fixtures so `keys: ['password', /token$/i]` and any exported `KeySelector` type-check while legacy `blacklistedKeys` and American-English public aliases remain rejected.

- [x] Verify within the current v4 contributor baseline (AC: 1, 2, 3, 4, 5)
  - [x] Run `pnpm run generate` if public types, exports, generated README inputs, or generated export metadata change.
  - [x] Run `pnpm run lint` and `pnpm run test` under Node `24.14.1`; required regex property behaviour, validation, precedence, and declaration coverage must be represented in this green gate.
  - [x] If new focused unit or security files are added outside `test/contract/**/*.test.ts`, run them explicitly with `pnpm exec vitest run <paths> --reporter=verbose` before the full red-phase suite and record the exact command.
  - [x] Run `pnpm run test:red-phase` as retained pressure only, and record any remaining legacy failures separately from the green contract gate.

### Review Findings

- [x] [Review][Patch] Unsafe overlapping-alternation regex selectors bypass validation [src/core/validation/validate-config.ts:118]

## Dev Notes

### Story Intent

- Story `1.5` completes the regex half of FR9 for object property names, building on Story `1.3` exact key targeting and Story `1.4` dynamic path traversal.
- The user-facing shape should remain a small service-root configuration: `deepRedact({ keys: ['password', /(?:api|access)?token$/i] })`.
- This story is key/property matching only. Regex path segments, matcher-object path segments, fuzzy matching, case-insensitive literal-key matching, substring redaction, root primitive redaction, and per-key local policy overrides remain deferred.

### Technical Requirements

- The public `keys` option is the intended configuration home for exact and regex object property matching.
- Exact key strings remain exact, case-sensitive property-name matches.
- Regex key selectors match object property names during traversal and apply wherever those object properties appear in nested payloads, including objects inside arrays.
- Regex key selectors must not match array indexes in `transformArray`. Index matching belongs to path selectors and Story `1.6` path-segment work, not FR9 property matching.
- Regex property matching uses the same global redaction policy as exact-key matching in this story. Do not introduce per-key `censor`, `remove`, or `retainStructure` objects yet.
- `RegExp` selectors must be validated once at factory initialisation. Unsupported or unsafe regex configuration must fail before a redactor is returned.
- Do not mutate user-supplied `RegExp` objects or allow order-dependent matching. Rejecting `g` and `y` flags in this story is the clearest initial contract.
- Keep the runtime one-way only. Do not introduce restore metadata, mutation modes, reversible state, or legacy v3 `DeepRedact` class behaviour.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) as the thin public facade. Public type changes belong under `src/types/`.
- Keep the core package zero-runtime-dependency and browser-safe. Regex safety should be implemented locally and tested directly.
- Continue the architecture's compiled-policy model: validate configuration first, compile immutable exact and regex key matchers once, then reuse the plan across all redactor calls.
- Preserve the two-lane runtime contract from previous stories: exact static paths remain eligible for the fast lane, and dynamic selectors plus key matching run through the traversal lane without changing observable precedence.
- Do not weaken duplicate exact-path or dynamic-selector validation to fit regex key support.
- Preserve dependency direction: matching and validation support compilation; compilation feeds runtime; optional adapters stay out of this story.

### Current Brownfield Constraints

- [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) currently exposes `keys?: readonly string[]`; this is the public type to widen.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) currently rejects non-string key entries and regex-like key strings. Keep the regex-like string rejection while adding real `RegExp` support.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) currently compiles only exact keys into `CompiledExactKeyRules`. Add a separate regex-key collection instead of mixing regexes into the lookup table.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) currently carries a boolean `directKeyMatch` into `selectActivePolicy`. This is the right extension point for exact versus regex property matches and precedence.
- [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) and `src/utils/**` contain retained v3 concepts such as `blacklistedKeys`, `replacement`, and `BlacklistKeyConfig`. Do not use those files as the v4 implementation source for this story.
- [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) re-exports public types through an explicit list; public type additions in `src/types/public.ts` are not discoverable from the package entrypoint until this list is updated.
- The current green suite lives in [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts) and [test/contract/**/*.test.ts](/Users/ben/Code/deep-redact/test/contract). [vitest.red-phase.config.ts](/Users/ben/Code/deep-redact/vitest.red-phase.config.ts) owns `test/unit/**/*.test.ts` and `test/load/**/*.test.ts`, so any new unit-only proof must be run directly or backed by green contract coverage.
- [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc) pins the contributor baseline to Node `24.14.1`.

### Regex Safety Notes

- JavaScript `RegExp` objects with `global` or `sticky` flags use mutable `lastIndex` state during repeated matching. That matters because a single configured regex will be tested against many property names in one traversal.
- Use deterministic matching for every property key. If a later story chooses to support stateful flags, it must clone or reset regex state deliberately and test the behaviour; this story should reject those flags.
- Regex safety does not need to solve every theoretical ReDoS pattern in this story, but it must enforce explicit boundedness and reject representative catastrophic nested-quantifier patterns before runtime.
- Latest external context checked: MDN's `RegExp.lastIndex` documentation notes that global and sticky regexes use `lastIndex` state during execution. Source: [MDN RegExp: lastIndex](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastindex).

### Testing Requirements

- Add a green-path contract test for `keys: [/password$/i]` redacting `password`, `dbPassword`, and `temporaryPassword` across nested objects while preserving `passcode`, `username`, and unrelated siblings.
- Add an array traversal test proving regex property rules apply to object elements inside arrays but do not redact whole array entries because their numeric indexes happen to match a regex.
- Add a precedence test with `paths: [{ path: 'user.passwordHash', censor: '[PATH]' }]` and `keys: [/password/i]`, proving `user.passwordHash` receives `[PATH]` and not the global key censor.
- Add a precedence test with a wildcard or structured ignore path from Story `1.4` and a regex property rule, proving path rules still outrank regex keys after dynamic path support.
- Add validation tests for unsupported `keys: ['/password/i']`, `keys: [/password/g]`, `keys: [/password/y]`, and at least one unsafe nested-quantifier pattern.
- Add a repeated-call determinism test for accepted non-stateful regex selectors, proving the redactor does not mutate the configured regex object's `lastIndex`.
- Keep representative unsafe-regex rejection in the green gate. The architecture's preferred long-term location is `test/security/redos.test.ts`; because no `test/security/` suite exists yet, either wire that path into the green Vitest config or place this story's safe-regex rejection coverage in the existing contract suite and keep lower-level helper tests as supporting direct-run coverage.
- Add type-fixture coverage for `RegExp` key selectors in both ESM and CommonJS consumers.
- Keep legacy v3 regex-key tests in the red-phase lane unless they are deliberately ported to the v4 public API.

### Implementation Guardrails

- Do not introduce a second traversal pass for regex keys. Regex property matching must participate in the existing one-pass traversal.
- Do not call `.test()` on a user-supplied stateful regex in a way that can mutate `lastIndex` and make output depend on traversal order.
- Do not treat regex property matching as string-substring redaction. This story targets whole property values by property name only.
- Do not interpret regex-like string values in `keys`; accepting those would blur the public API and conflict with existing validation.
- Do not implement regex path segments here, even though structured path regex support appears in the architecture and Story `1.6`.
- Do not import from `src/utils/index.ts` or the legacy `src/types.ts` v3 redactor model to shortcut matching logic.
- Do not regress Story `1.3` prototype-key safety or Story `1.4` sparse-array handling.
- Do not edit generated files manually. If generated outputs change, run the generator scripts.

### Previous Story Intelligence

- Story `1.4` added the dynamic path rule bucket, structured selector support, and runtime matching for wildcard and ignore segments. Regex property matching should integrate with that traversal rather than creating a parallel runtime.
- Story `1.4` explicitly left regex-based property matching and regex-based path-segment matching unsupported. This story should remove only the property-key part of that unsupported surface.
- Story `1.4` review fixes matter here: structured selector strings are literal, invalid numeric structured segments fail validation, sparse array holes are preserved, and dynamic selectors reject duplicates.
- Story `1.3` established exact-path precedence over exact-key rules, canonical exact path validation, safe prototype-key handling, and the non-mutating traversal pattern. Regex key support must preserve those behaviours.
- Story `1.2` established startup validation and immutable compiled policy as the mechanism for rejecting invalid configuration before runtime.

### Recent Git Intelligence

- The latest relevant implementation commit is `2836f91 feat: support wildcard and exclusion selectors for repeated nested structures`.
- That commit changed [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts), [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts), [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts), [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts), [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts), public path types, consumer fixtures, contract tests, and unit tests.
- The preceding exact-key/path commit is `547e087 feat: redact exact keys and canonical exact paths in nested payloads`; it established the exact key lookup table, path canonicalisation, replacement application, and public validation surface that this story extends.

### Open Questions / Assumptions

- Assume regex property matching is represented by widening `keys` to `readonly (string | RegExp)[]`, not by adding a new root option.
- Assume regex key rules share the global key policy for now because the current public `keys` shape has no per-key rule object.
- Assume stateful regex flags are rejected in this story rather than normalised, because rejection is simpler to document, test, and keep deterministic.
- Assume Story `1.6` will decide how `RegExp` values inside structured `paths` are represented and validated.

### Project Structure Notes

- The repository already has the relevant v4 slices under `src/core/` and `src/types/`; prefer extending those over creating top-level modules.
- There is no current `src/internal/` directory or `test/security/` suite in the working tree. If a dedicated regex safety suite is introduced, wire it into verification deliberately; otherwise keep story-critical ReDoS rejection in the existing green contract path.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this story lives under `_bmad-output/implementation-artifacts/`.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 1`, `Story 1.5`, `Story 1.6`
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `API & Communication Patterns`, `Path Grammar & Selector Contract`, `Component-to-Requirement Mapping`
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `FR8`, `FR9`, `FR10`, `FR17`, NFR security and reliability notes
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md)
  - [1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md)
  - [1-2-create-and-validate-a-reusable-service-redactor.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-2-create-and-validate-a-reusable-service-redactor.md)
- Current repo files
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts)
  - [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts)
  - [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts)
  - [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
  - [test/unit/core/matching/path-normaliser.test.ts](/Users/ben/Code/deep-redact/test/unit/core/matching/path-normaliser.test.ts)
- External technical reference
  - [MDN RegExp: lastIndex](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastindex)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Widen the public `keys` selector type to `string | RegExp` through a named `KeySelector` export while preserving `keys` as the only public key-matching option.
- Validate regex key selectors at factory initialisation, rejecting regex-like strings, non-key selector values, stateful flags, overlong sources, and representative nested quantified patterns.
- Compile exact key selectors and regex key selectors into separate plan buckets so exact keys retain the existing null-prototype lookup table and regex matchers are cloned once at initialisation.
- Extend object traversal to resolve exact key matches before regex key matches, keep path rules higher precedence than all key rules, and avoid treating array indexes as regex property keys.
- Cover the feature through green contract tests, TypeScript consumer fixtures, and direct unit coverage for compiled regex key state.

### Debug Log References

- Story context assembled from BMAD workflow inputs on `2026-05-01T01:11:14+0100`.
- Previous story intelligence extracted from Story `1.4`, current source files, current test fixtures, and recent git history.
- No `project-context.md` file was found in the repository.
- Focused declaration red check: `pnpm exec vitest run test/contract/types/declarations.test.ts --reporter=verbose` failed before the `KeySelector` export and widened `keys` type were added.
- Focused validation red check: `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` failed before `RegExp` key validation was added.
- Focused compiler red check: `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` failed before `regexKeyRules` existed.
- Focused runtime red check: `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` failed before traversal checked compiled regex key rules.
- Final Node `24.14.1` verification passed: `pnpm run generate`, `pnpm run lint`, `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`, and `pnpm run test`.
- Retained red-phase pressure on Node `24.14.1`: `pnpm run test:red-phase` failed in legacy v3 constructor coverage only: `test/unit/index.test.ts` and `test/load/redact.test.ts` still expect `DeepRedact` to be a constructor.
- Review red check: `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` failed before overlapping alternation regex safety rejected `/^(a|aa)+$/`.
- Review fix verification on Node `24.14.1` passed: `pnpm run lint`, `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`, `pnpm exec vitest run test/contract/types/declarations.test.ts --reporter=verbose`, and `pnpm run test`.
- Review retained red-phase pressure on Node `24.14.1`: `pnpm run test:red-phase` still fails only in legacy v3 constructor coverage: `test/unit/index.test.ts` and `test/load/redact.test.ts`.

### Completion Notes List

- Added the public `KeySelector = string | RegExp` type, widened `keys`, re-exported the type through the public entrypoint, and updated ESM/CommonJS declaration fixtures for regex key discovery.
- Added init-time validation for regex key selectors, including non-string/non-RegExp rejection, regex-like string rejection, stateful flag rejection, bounded regex source length, and representative nested-quantifier rejection.
- Added a compiled regex key rule bucket with init-time cloned matchers and the same global key policy as exact key rules, leaving exact strings in the null-prototype lookup table.
- Applied regex key matching during object traversal with path-first precedence, exact-key-before-regex-key resolution, array index exclusion, and continued non-mutating sibling preservation.
- Added focused contract, declaration-fixture, and unit coverage for regex key matching, validation rejection paths, precedence, caller regex state preservation, and compiled regex matcher separation.
- Added review hardening so quantified regex groups with overlapping alternatives such as `/^(a|aa)+$/` are rejected during factory initialisation.
- Verified the story under Node `24.14.1` with generation, lint, focused unit coverage, and the full contract gate; retained red-phase failures remain limited to legacy v3 constructor expectations.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/1-5-match-sensitive-fields-by-regex-based-property-names.md
- dist/index.js
- src/core/compiler/compile-redactor-plan.ts
- src/core/runtime/redact-value.ts
- src/core/validation/validate-config.ts
- src/index.ts
- src/types/config.ts
- src/types/public.ts
- test/contract/api/create-redactor.test.ts
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts

### Change Log

- 2026-05-01: Implemented regex-based property-name key selectors through the public `keys` option, with validation, compiled plan state, traversal support, tests, and declaration fixture coverage.
- 2026-05-01: Resolved code review finding for unsafe overlapping-alternation regex selector validation.
