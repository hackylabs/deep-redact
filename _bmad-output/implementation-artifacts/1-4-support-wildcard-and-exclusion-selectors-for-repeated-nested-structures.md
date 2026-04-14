# Story 1.4: Support Wildcard and Exclusion Selectors for Repeated Nested Structures

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one service redactor to support wildcard, recursive wildcard, and exclusion path selectors,
so that I can redact repeated nested sensitive fields without enumerating every path manually.

## Acceptance Criteria

1. Given path selectors for this story are configured at initialisation, when the factory validates them, then it accepts root-relative string selectors with literal segments, `*`, and `**`, and it accepts structured selector arrays composed only of literal string or numeric segments plus optional exclusion segments such as `['users', { ignore: 'admin' }, 'email']`, and regex-based property matching and regex-based path-segment matching remain unsupported in this story.
2. Given a selector containing `*`, when the redactor is invoked on nested objects or arrays, then `*` matches exactly one segment at that position, and only leaves reached through that one-segment match are redacted, and `users.*.email` matches `users.0.email` and `users.1.email` but not `users.profile.contact.email`.
3. Given a selector containing `**`, when the redactor is invoked on nested structures of variable depth, then `**` matches zero or more intermediate segments below that position, and matching descendant leaves are redacted in one pass, and `account.**.token` matches `account.token`, `account.session.token`, and `account.audit.session.token`.
4. Given a structured selector containing an exclusion segment, when the redactor is invoked on sibling branches, then the exclusion segment matches any single segment except the ignored key or index, and excluded branches remain unchanged, and `['users', { ignore: 'admin' }, 'email']` matches `users.alice.email` and `users.0.email` but not `users.admin.email`.
5. Given a selector targets an array branch, when the redactor is invoked on indexed entries, then array indices are treated as path segments, and wildcard matching applies to them, and `orders.*.cardNumber` redacts each entry’s `cardNumber` without requiring explicit numeric indices.
6. Given a payload where the same leaf matches both an exact-path rule and a wildcard or exclusion selector, when redaction runs, then the exact-path rule takes precedence, and that leaf is redacted once only.
7. Given a payload containing both targeted and non-targeted branches, when wildcard or exclusion selectors are applied, then only targeted values are redacted, and non-targeted sibling and excluded values remain unchanged in the returned result.
8. Given invalid selector syntax for this story, when the factory initialises, then initialisation fails with a validation error for partial wildcard text, more than one recursive wildcard segment in one selector, or exclusion syntax supplied in unsupported string-selector form, and no redactor is created.
9. Given two wildcard or structured selectors in the same precedence layer compile to the same segment sequence, when the factory initialises, then initialisation fails with a duplicate-selector validation error instead of relying on insertion order or silent overwrite behaviour.

## Tasks / Subtasks

- [x] Broaden the public path-selector contract just enough for wildcard and exclusion support (AC: 1, 8)
  - [x] Replace the current string-only `PathRule.path` surface in [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) with an explicit selector union that still supports exact string selectors and now also supports structured selector arrays for ignore segments.
  - [x] Keep the public surface intentionally narrow for this story: string selectors may use literal segments, `*`, and `**`; structured selectors may use literal string or numeric segments plus `{ ignore: string | number }`; leave regex, matcher-object, fuzzy, and case-insensitive selector forms for later stories.
  - [x] Make the intended structured-selector floor explicit in types and behaviour: exact structured selectors such as `['users', 0, 'email']` are valid in this story so exclusion selectors extend one consistent structured-selector surface rather than introducing a one-off special case.
  - [x] Re-export any new selector types from [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts) so ESM, CommonJS, and TypeScript consumers discover the widened contract from the canonical v4 public types.

- [x] Extend selector parsing, normalisation, and validation from exact paths to mixed exact and dynamic path grammar (AC: 1, 8, 9)
  - [x] Evolve [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts) and [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts) so they can tokenise exact segments, single-segment wildcards, recursive wildcards, and structured ignore segments without widening into regex or matcher-object scope.
  - [x] Preserve exact-path canonicalisation from Story `1.3` for literal selectors, while introducing a separate compiled representation for dynamic selectors so exact canonical duplicates still fail within the exact-path layer and dynamic selectors stay out of the fast-lane lookup table.
  - [x] Extend [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts) and [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) so partial wildcard text such as `foo*bar`, multiple `**` segments in one selector, empty segments, unsupported string exclusion syntax, any regex-like structured path segments, and duplicate dynamic selectors in the same precedence layer fail at initialisation.

- [x] Compile dynamic path rules into immutable init-time plan state alongside the existing exact-path rules (AC: 1, 6, 8, 9)
  - [x] Extend [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) to separate exact-path rules from wildcard or ignore-based path rules, while preserving the existing immutable merged-policy model.
  - [x] Keep exact-path rules in the canonical lookup table for the fast lane, and add a distinct ordered collection for wildcard and exclusion rules only after validation has rejected duplicate dynamic selectors, so precedence is explicit and deterministic rather than dependent on silent overwrites.
  - [x] Preserve Story `1.3`’s rule-merging semantics so per-path overrides continue to merge over compiled global defaults only for the matched rule.

- [x] Teach the runtime traversal lane to resolve wildcard, recursive wildcard, and exclusion selectors without regressing exact-path behaviour (AC: 2, 3, 4, 5, 6, 7)
  - [x] Extend [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) so dynamic path rules are evaluated during traversal against the current path stack, with `*` matching exactly one segment and `**` matching zero or more segments.
  - [x] Ensure exclusion segments behave as “match any one segment except this key or index” for structured selectors only, including numeric array indexes.
  - [x] Keep exact-path precedence intact by resolving exact-path matches before dynamic path matches on the same leaf and redacting the leaf once only.
  - [x] Preserve the current non-mutating traversal approach, safe sibling preservation, and array handling, including the sparse-array behaviour fixed during Story `1.3`.

- [x] Add focused contract and unit coverage for wildcard and exclusion semantics (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Extend [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) with green-path cases for `*`, `**`, exact structured selectors such as `['users', 0, 'email']`, structured ignore selectors, array-index wildcarding, exact-path precedence over wildcard matches, unchanged excluded siblings, and duplicate dynamic-selector rejection.
  - [x] Add or extend unit coverage under `test/unit/core/` for path grammar parsing, invalid wildcard syntax rejection, recursive wildcard limits, structured ignore selector validation, structured-vs-string selector equivalence where both describe the same exact path, duplicate dynamic-selector rejection, and any new matcher helpers introduced for traversal.
  - [x] Extend declaration and consumer fixtures under [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts) and [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts) so the widened path-selector types are visible to TypeScript consumers without exposing future regex or fuzzy forms prematurely.

- [x] Verify the story within the current v4 contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Run `pnpm run generate` if public types, exports, or generated README inputs change.
  - [x] Run `pnpm run lint` and `pnpm run test` under Node `24.14.1`.
  - [x] Run `pnpm run test:red-phase` as retained pressure only, and record any remaining failures separately from the green contract gate.

## Dev Notes

### Story Intent

- Story `1.4` broadens Story `1.3`’s exact path runtime into repeated-structure targeting without abandoning the current exact-path fast-lane foundation.
- The core user value is coverage across arrays and variable-depth branches with one reusable redactor, while still preserving exact-path precision, sibling safety, and one-way output.
- This story should add only wildcard, recursive wildcard, and exclusion-selector capability. Regex property rules, regex path segments, fuzzy matching, and case-insensitive matching remain explicitly deferred.

### Technical Requirements

- String path selectors in this story are root-relative and may contain literal segments, `*`, and at most one `**` segment.
- Structured path selectors in this story may contain literal string or numeric segments plus `{ ignore: string | number }`, so exact structured selectors and exclusion selectors share one consistent public surface.
- `*` matches exactly one segment, including an object key or an array index.
- `**` matches zero or more intermediate segments below its position. `account.**.token` must therefore match both `account.token` and deeper descendants such as `account.session.token`.
- Exclusion selectors are supported only in structured selector form and must behave as “match any single segment except the ignored key or index”.
- String-selector exclusion syntax remains invalid. Users must write selectors such as `['users', { ignore: 'admin' }, 'email']`, not punctuation-based variants.
- Exact-path rules still outrank wildcard and exclusion rules on the same leaf, and overlapping matches must redact that leaf once only.
- Duplicate wildcard or structured selectors that compile to the same segment sequence within the same precedence layer must fail validation rather than relying on collection order.
- Per-path `censor`, `remove`, and `retainStructure` overrides continue to merge over compiled global defaults for the matched rule only.
- Array indexes participate in path matching as structural segments, so wildcard and ignore logic must work for both object keys and numeric indexes.
- Supported inputs must continue to avoid post-init runtime throws. Invalid selector forms must fail during factory creation, not at payload traversal time.
- Runtime output remains one-way only. Do not introduce restore metadata, mutation modes, or reversible state.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) as the thin public facade. New selector, compiler, validation, and runtime logic belongs under `src/core/` and `src/types/`.
- Stay aligned with the architecture’s two-lane execution model:
  - exact static absolute string-path rules remain eligible for the compiled fast lane
  - wildcard, recursive wildcard, and ignore-segment selectors execute through the generic traversal lane
- The fast lane is an optimisation only. Dynamic-selector support must not alter observable precedence, output, or diagnostics semantics for exact-path matches.
- Preserve the one-way dependency direction already emerging in the codebase: matching and validation support compiler work; the compiler feeds runtime; optional adapters remain out of core runtime.
- Keep the core package zero-runtime-dependency and free of Node-only APIs.

### Current Brownfield Constraints

- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) currently compiles only exact string-path rules and exact-key rules into immutable tables. There is no dynamic-path rule bucket yet.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) currently resolves exact-path and exact-key matches during traversal, so it is the right place to add dynamic path matching without re-parsing selectors on every call.
- [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts) currently assumes every path candidate is an exact string selector. It needs to split exact-path canonical validation from dynamic-selector validation rather than weakening exact-path guarantees.
- [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) still exposes `path: string` only, so the public contract must be widened carefully without smuggling in later-story selector forms.
- The current green suite covers [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts) and `test/contract/**/*.test.ts`; `test/unit/**` still sits in the retained red-phase lane driven by [vitest.red-phase.config.ts](/Users/ben/Code/deep-redact/vitest.red-phase.config.ts).
- [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc) still pins the contributor baseline to Node `24.14.1`. Verification should be run against that pinned version, not an incidental shell default.

### Testing Requirements

- Add contract coverage for `users.*.email`-style one-segment wildcard matching across both object properties and array indexes.
- Add contract coverage for `account.**.token`-style recursive wildcard matching at zero, one, and multiple intermediate depths.
- Add contract coverage for structured ignore selectors such as `['users', { ignore: 'admin' }, 'email']`, proving that excluded branches remain unchanged.
- Add contract coverage for exact structured selectors such as `['users', 0, 'email']`, proving they are accepted and behave equivalently to exact string selectors where both forms describe the same path.
- Add contract coverage proving exact-path rules still outrank wildcard or exclusion selectors on the same leaf.
- Add validation tests proving the factory rejects partial wildcard text, multiple recursive wildcards in one selector, string-form exclusion syntax, and duplicate dynamic selectors in the same precedence layer.
- Add declaration-fixture coverage proving the public path-selector types expose the new wildcard and structured ignore forms without claiming regex support yet.
- Keep [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts), [test/contract/exports/import.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/import.test.ts), [test/contract/exports/require.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/require.test.ts), and [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts) green.

### Implementation Guardrails

- Do not collapse wildcard or ignore selector support into ad hoc runtime string matching. Compile selectors once at initialisation and reuse the compiled representation.
- Do not weaken Story `1.3` exact-path canonicalisation or duplicate-path rejection in order to fit wildcard support.
- Do not widen structured selectors in a way that makes exact structured selectors type-valid but runtime-invalid within this story.
- Do not accept regex path segments, matcher objects, fuzzy matching, or case-insensitive matching in this story, even if the long-term architecture anticipates them.
- Do not invent a punctuation-based ignore syntax for string selectors. Exclusion support is structured-selector only in Story `1.4`.
- Do not silently allow duplicate wildcard or structured selectors to fall through to collection-order precedence. Reject them during validation.
- Do not mutate the caller’s input object in place or rely on `structuredClone` on the hot path.
- Do not regress the sparse-array and prototype-key edge cases already surfaced during Story `1.3` review work.
- Do not reintroduce the legacy `DeepRedact` class, `blacklistedKeys`, or American-English aliases such as `serialize`.

### Previous Story Intelligence

- Story `1.3` already established the current path-parser, path-normaliser, compiler, replacement, and runtime traversal extension points. Reuse those modules instead of introducing parallel selector systems.
- Story `1.3` also established the exact-path precedence rule over exact-key rules. Story `1.4` must widen that same precedence ladder, not replace it.
- Review fixes recorded against Story `1.3` matter here:
  - prototype-named root keys previously risked crashing traversal, so dynamic matching must stay defensive around key lookup and object traversal
  - unsupported selector forms were already being rejected in validation, so wildcard support must be added surgically rather than by dropping validation
  - sparse-array handling was corrected, so array wildcard support must preserve that behaviour
- Story `1.2`’s validation-report pattern and per-path default-merging rules remain the right mechanism for init-time failures and rule-policy compilation.

### Recent Git Intelligence

- Recent implementation commits show the current extension path clearly:
  - `547e087 feat: redact exact keys and canonical exact paths in nested payloads`
  - `a9f4b0e docs(agents): instruction to keep BMAD references in _bmad-output`
  - `3a85e78 fix: lint errors`
  - `29bb954 feat: create and validate a reusable service redactor`
- The most relevant existing files to extend are:
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts)
  - [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts)
  - [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts)
  - [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)

### Open Questions / Assumptions

- Assume the public structured-selector form introduced in this story is intentionally minimal: literal string or numeric segments plus `{ ignore: string | number }`. Future matcher objects and regex segments will widen this surface later.
- Assume exact-path canonical strings continue to use dot notation with numeric index segments, while dynamic selectors are stored in a separate compiled representation rather than forced into one canonical string.
- Assume one `**` segment per selector is the intended story boundary, matching the acceptance criteria and the architecture’s safety guidance around bounded selector complexity.

### Project Structure Notes

- The repository already has the right v4 slices for this story under `src/core/`; prefer extending those instead of creating new top-level modules.
- Keep new green behaviour coverage in `test/contract/` and supporting parser or compiler detail tests in `test/unit/core/`.
- Generated files and build output remain script side effects, not manual editing targets.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 1`, `Story 1.3`, `Story 1.4`
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `API & Communication Patterns`, `Path Grammar & Selector Contract`, `Decision Impact Analysis`
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `FR11`, `FR12`, `FR13`
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md)
  - [1-2-create-and-validate-a-reusable-service-redactor.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-2-create-and-validate-a-reusable-service-redactor.md)
  - [0001-scratch-v4-foundation-transplant.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/0001-scratch-v4-foundation-transplant.md)
- Current repo files
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts)
  - [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts)
  - [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [vitest.config.ts](/Users/ben/Code/deep-redact/vitest.config.ts)
  - [vitest.red-phase.config.ts](/Users/ben/Code/deep-redact/vitest.red-phase.config.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Widen the selector contract minimally so wildcard and structured ignore selectors become first-class v4 path inputs.
- Compile dynamic path selectors separately from exact-path rules, keeping exact canonical fast-lane behaviour intact.
- Extend traversal matching and tests so repeated nested structures are redacted deterministically without touching excluded branches.

### Debug Log References

- Story context assembled from BMAD workflow inputs on `2026-04-14T05:02:06+0100`.
- Previous story intelligence extracted from Stories `1.2` and `1.3`, current source files, and recent git history.
- Generated exports and README inputs refreshed on `2026-04-14T05:18:43+0100`, followed by a package rebuild to refresh `dist` declarations and entrypoints.
- Validation runs completed on `2026-04-14T05:22:37+0100`: `tsc --noEmit`, `xo`, `vitest` contract/build/declaration suites, and `vitest --config vitest.red-phase.config.ts`.

### Completion Notes List

- Added minimal public selector unions for wildcard and structured ignore paths, including root exports for TypeScript consumers.
- Compiled wildcard and ignore selectors into a separate dynamic rule bucket while preserving exact-path canonical fast-lane lookups and precedence.
- Extended traversal matching for `*`, `**`, and structured `{ ignore: ... }` segments without regressing sibling safety, sparse arrays, or exact-path priority.
- Added contract, unit, and consumer-type coverage for exact structured selectors, wildcard matching, recursive wildcards, ignore selectors, and duplicate dynamic-selector rejection.
- Green verification completed for generate, lint, build, contract, and declaration checks.
- `test:red-phase` still fails only in pre-existing legacy `DeepRedact` class/load tests in `test/unit/index.test.ts` and `test/load/redact.test.ts`, which remain outside this story’s v4 scope.
- Resolved the review follow-up so structured selector strings stay literal and invalid structured numeric segments now fail validation before compilation.

### Review Findings

- [x] [Review][Patch] Make the structured-selector contract explicit so exact structured selectors are either clearly supported and tested now or not exposed prematurely.
- [x] [Review][Patch] Reject duplicate wildcard or structured selectors in the same precedence layer so dynamic-path precedence stays deterministic.
- [x] [Review][Patch] Treat structured string segments as literal keys instead of reusing string-selector syntax parsing [src/core/matching/path-parser.ts:116]
- [x] [Review][Patch] Reject impossible structured numeric segments and ignore indexes so invalid values do not silently mis-target or match every array entry [src/core/matching/path-parser.ts:116]

### File List

- _bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/compiler/compile-redactor-plan.ts
- src/core/matching/path-normaliser.ts
- src/core/matching/path-parser.ts
- src/core/runtime/redact-value.ts
- src/core/validation/validate-config.ts
- src/core/validation/validate-paths.ts
- src/index.ts
- src/types/paths.ts
- src/types/public.ts
- test/contract/api/create-redactor.test.ts
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts
- test/unit/core/matching/path-normaliser.test.ts

### Change Log

- 2026-04-14: Implemented Story 1.4 wildcard, recursive wildcard, and structured ignore selector support; refreshed public types and verification coverage; recorded retained legacy red-phase failures separately from the green contract gate.
- 2026-04-14: Resolved code review patches for literal structured string segments and structured numeric validation; rechecked Story 1.4 contract and unit coverage.
