# Story 1.6: Match Sensitive Fields by Regex-Based Path Segments

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one service redactor to support regex-based path-segment matching in structured selectors,
so that I can redact sensitive values when only part of the path name varies within known patterns.

## Acceptance Criteria

1. Given regex-based path-segment matching is configured in structured selector form, when the redactor is invoked on a payload with matching segment names, then only paths whose targeted segment matches the configured regular expression are redacted.
2. Given a payload containing both matching and non-matching path segments, when redaction runs, then only the matched paths are redacted, and non-targeted sibling values remain unchanged in the returned result.
3. Given a payload where the same leaf matches both an exact-path rule and a regex-based path-segment rule, when redaction runs, then the exact-path rule takes precedence, and that leaf is redacted once only.
4. Given a payload where the same leaf matches both a regex-based path-segment rule and a regex-based property rule, when redaction runs, then the path-segment rule takes precedence, and that leaf is redacted once only.
5. Given a configuration containing an invalid, unsupported, or unsafe path-segment regular expression, when the factory initialises, then initialisation fails with a validation error before any redactor is created.
6. Given a JavaScript or TypeScript consumer, when regex-based path-segment matching is configured through the public entrypoint, then the supported structured selector shape is typed and editor-discoverable.

## Tasks / Subtasks

- [x] Widen the structured path-selector contract for regex path segments (AC: 1, 5, 6)
  - [x] Extend [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) so structured selectors accept `RegExp` segments alongside the existing `string`, `number`, and `{ ignore: ... }` forms.
  - [x] Extend `IgnorePathSegment.ignore` to allow `RegExp`, reusing the same validated regex-segment matcher contract; keep matcher objects such as `{ match: 'token' }`, fuzzy matching, and case-insensitive matching invalid in this story.
  - [x] Re-export any new named path matcher types through [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts) and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) if they become part of the public type surface.
  - [x] Keep regex path matching inside `paths` structured selector arrays. Do not add `regexPaths`, `pathRegexes`, `regexSegments`, or any parallel public option.
  - [x] Keep string selectors literal except for the already-supported `*` and `**`. Regex-like string path segments such as `'users./^team-/i.token'` remain invalid.

- [x] Parse, render, and validate regex path segments at initialisation (AC: 1, 5, 6)
  - [x] Extend [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts) with explicit parsed segment kinds for direct regex path segments and, if included, regex ignore matchers.
  - [x] Treat every regex path segment as dynamic: it must stay out of exact-path canonicalisation and the exact-path lookup table.
  - [x] Extend [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts) so `renderSelectorSignature` renders regex segments deterministically using source and flags, allowing duplicate dynamic-selector detection to work for regex selectors.
  - [x] Render regex selector signatures with an explicit non-JSON marker that cannot collide with literal properties or ignore selectors. The signature must distinguish direct regex segments from regex ignore segments and must include both `source` and `flags`, for example by using a marker plus JSON-encoded source and flags rather than relying on `JSON.stringify(RegExp)`.
  - [x] Extend [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts) so duplicate regex dynamic selectors fail during factory initialisation instead of relying on array order.
  - [x] Reuse or extract the existing regex safety checks in [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) instead of duplicating a second unsafe-regex implementation for path segments.
  - [x] Reject regex path segments with `global` or `sticky` flags, overlong sources, representative nested quantified patterns, and overlapping quantified alternation patterns during initialisation.
  - [x] Clone accepted regex matchers during parsing or compilation so caller-owned `RegExp` instances and their `lastIndex` values are not mutated by repeated redaction.

- [x] Compile regex path selectors into immutable dynamic rule state (AC: 1, 3, 4, 5)
  - [x] Extend [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) so regex path segments compile into the existing `dynamicPathRules` collection, not a new traversal pass.
  - [x] Preserve exact-path rules in `exactPathRules` and keep regex path rules in the traversal lane.
  - [x] Preserve per-path policy merging: path-rule `censor`, `remove`, and `retainStructure` overrides merge over compiled global defaults only for the matched rule.
  - [x] Keep compiled plans immutable and reusable across redactor calls. Do not parse, validate, or compile regex selectors inside the callable payload path.

- [x] Apply regex path-segment matching during traversal without regressing existing precedence (AC: 1, 2, 3, 4)
  - [x] Extend [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) so `matchesSingleSegment` tests regex path segments against exactly one current structural segment.
  - [x] Match object keys by their property text and array indexes by their canonical numeric segment text, for example index `0` is tested as `'0'`.
  - [x] Use normal JavaScript `RegExp.test(segmentText)` semantics against that one segment text. Do not concatenate path segments or inspect values. Users must anchor expressions with `^` and `$` when they need the regex to cover the full segment text.
  - [x] Preserve the current precedence ladder: exact path > dynamic path, including regex path segments > inherited path policy > exact key > regex property key.
  - [x] Prove an exact path and a regex path segment matching the same leaf apply only the exact-path policy.
  - [x] Prove a regex path segment and a regex property key matching the same leaf apply only the path policy.
  - [x] Prove a retained parent path policy does not hide a more specific regex path rule below it: a child regex path rule must still win at the matched leaf when a parent path rule uses `retainStructure: true`.
  - [x] Preserve non-mutating traversal, sparse-array holes, prototype-named key safety, and sibling preservation from Stories `1.3`, `1.4`, and `1.5`.
  - [x] Keep regex path matching as whole-segment matching. Do not treat it as substring redaction inside values; substring and root primitive targeting remain Epic 2 scope.

- [x] Add focused contract, unit, and type coverage (AC: 1, 2, 3, 4, 5, 6)
  - [x] Extend [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) with direct regex segment cases such as `paths: [['tenants', /^tenant-\d+$/, 'token']]`, proving matching branches redact and non-matching siblings remain unchanged.
  - [x] Add array-index regex coverage, for example `['orders', /^\d+$/, 'cardNumber']`, proving regex path segments can target numeric path segments. Also document the text-only segment contract with an object property named `'0'`: the regex sees segment text, so a numeric-looking object key matches unless the surrounding selector structure rules it out.
  - [x] Add regex ignore coverage proving `['users', { ignore: /^internal/ }, 'token']` excludes matching branches and redacts the remaining direct children.
  - [x] Add exact-path precedence coverage using distinct `censor` values so `users.admin.token` can visibly outrank `['users', /^(admin|alice)$/, 'token']`.
  - [x] Add regex-path-over-regex-key precedence coverage using distinct `censor` values so the same leaf receives the path policy rather than the regex key policy.
  - [x] Add retained-parent precedence coverage with a parent path rule using `retainStructure: true` and a more specific regex path rule below it, proving the child regex path policy wins at the matched leaf.
  - [x] Add validation coverage for regex-like string segments, stateful regex flags, unsafe nested quantifiers, unsafe overlapping alternation, overlong regex sources, unsupported matcher objects, and duplicate regex dynamic selectors.
  - [x] Add a repeated-call determinism test proving accepted regex path selectors do not mutate caller-owned regex `lastIndex` values.
  - [x] Extend [test/unit/core/matching/path-normaliser.test.ts](/Users/ben/Code/deep-redact/test/unit/core/matching/path-normaliser.test.ts) and [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts) for regex segment signatures and compiled dynamic rule shape.
  - [x] Extend TypeScript consumer fixtures in [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts) and [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts) so ESM and CommonJS consumers can discover regex structured path selectors.

- [x] Verify within the current v4 contributor baseline (AC: 1, 2, 3, 4, 5, 6)
  - [x] Run `pnpm run generate` if public types, exports, generated README inputs, or generated export metadata change.
  - [x] Run `pnpm run lint` and `pnpm run test` under Node `24.14.1`.
  - [x] If new focused unit or security files are added outside `test/contract/**/*.test.ts`, run them explicitly with the relevant `pnpm exec vitest run ... --reporter=verbose` command and record it in the implementation notes.
  - [x] Run `pnpm run test:red-phase` as retained pressure only, and record any remaining legacy failures separately from the green contract gate.

### Review Findings

- [x] [Review][Patch] `splitRegexAlternatives` does not track parenthesis nesting depth — splits `|` inside inner groups, producing incorrect alternatives and weakening overlapping-alternation ReDoS detection for nested patterns [src/core/validation/regex-safety.ts:9-48]
- [x] [Review][Patch] `isRegExp` duplicated — private copy in `path-parser.ts` should be removed and the shared export from `regex-safety.ts` imported instead [src/core/matching/path-parser.ts:454]
- [x] [Review][Patch] Internal `RegexPathSegment` interface (`kind: 'regex'`) in `path-parser.ts` has the same name as the public `RegexPathSegment = RegExp` type alias — renamed to `ParsedRegexSegment` / `ParsedIgnoreRegexSegment` [src/core/matching/path-parser.ts:32-35]
- [x] [Review][Patch] `getUnsupportedKeyRegexMessage` still contains a local `global || sticky` guard that short-circuits before delegating to `getUnsupportedRegexMessage` — removed local guard; deduplication now complete [src/core/validation/validate-config.ts:140-142]
- [x] [Review][Patch] No contract-level validation tests for unsafe patterns (`global` flag, `sticky` flag, nested quantifiers, overlapping alternation, overlong source) on the `{ ignore: RegExp }` path segment form — added 3 test cases [test/contract/api/create-redactor.test.ts]
- [x] [Review][Patch] `StructuredPathSelector` and `StructuredPathSegment` container types are not imported or used in consumer type fixture files — added typed variables to both ESM and CJS fixtures [test/fixtures/consumers/types/index.ts, test/fixtures/consumers/types-cjs/index.cts]
- [x] [Review][Patch] `maxRegexSourceLength` check uses `.length` (UTF-16 code units) not Unicode code point count — promoted from defer; fixed to `[...selector.source].length`; added rejection test (257 code points) and acceptance test (256 code points with emoji) [src/core/validation/regex-safety.ts:83]
- [x] [Review][Defer] (promoted to patch and fixed — see above)

## Dev Notes

### Story Intent

- Story `1.6` completes Epic 1's path-targeting surface by adding regex-based path-segment matching to the structured selector form introduced in Story `1.4`.
- The user-facing shape should stay compact and service-root oriented, for example `deepRedact({ paths: [['tenants', /^tenant-\d+$/, 'apiToken']] })`.
- This story targets whole values selected by path structure. It must not implement substring value redaction, root primitive redaction, fuzzy matching, case-insensitive matcher objects, transformer handling, diagnostics sinks, or console adapters.
- Regex path segments are path rules, not key rules. They participate in the existing dynamic path traversal lane and must outrank exact-key and regex-key matching on the same leaf.

### Technical Requirements

- `RegExp` path segments are valid only inside structured selector arrays. String selectors must not gain regex syntax.
- A direct regex path segment matches exactly one structural segment at that position.
- Object property segments are tested using their property text. Array index segments are tested using their canonical numeric text, such as `'0'`.
- Regex matching uses the compiled matcher against the single segment text with normal JavaScript `RegExp.test()` semantics. The implementation must not add implicit anchors; callers use `^` and `$` for full-string segment matches.
- Numeric-looking object keys and array indexes are both segment text for regex purposes. A regex such as `/^\d+$/` matches object key `'0'` and array index `0` when either appears at the targeted selector position.
- Regex path selectors apply the matched path rule's policy, including any per-path `censor`, `remove`, or `retainStructure` override.
- Exact-path rules still outrank all dynamic path rules, including regex path segments.
- Dynamic path rules, including regex path segments, outrank exact and regex key rules.
- Exact key rules still outrank regex property rules when no path rule applies.
- Invalid or unsafe regex selectors must fail during factory initialisation, before any redactor is returned.
- Accepted regex selectors must be compiled or cloned once at initialisation and reused safely across calls.
- Caller-owned `RegExp` objects must not have their `lastIndex` mutated by validation, compilation, or runtime matching.
- The package remains zero-runtime-dependency. Do not add a regex safety dependency for this story.
- Runtime output remains one-way only. Do not introduce restore metadata, reversible state, or mutation modes.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) as the thin public facade. Public type changes belong under `src/types/`.
- Keep selector parsing and rendering under `src/core/matching/`, validation under `src/core/validation/`, immutable plan construction under `src/core/compiler/`, and runtime traversal under `src/core/runtime/`.
- Preserve the architecture's two-lane model:
  - exact static paths stay in the exact-path lookup table
  - wildcard, recursive wildcard, ignore, and regex path selectors stay in the dynamic traversal lane
- Preserve the dependency direction already used by the current source: matching and validation support compilation; compilation feeds runtime; optional adapters remain outside core runtime.
- Keep the core package browser-safe and free of Node-only APIs.
- Generated artefacts are not source of truth. Do not hand-edit `dist/`, generated exports, or generated README output.

### Current Brownfield Constraints

- [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) currently exposes `IgnorePathSegment` with `ignore: string | number` and `StructuredPathSegment = string | number | IgnorePathSegment`. This is the public type to widen.
- [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts) currently rejects unsupported structured matcher objects and treats structured strings as literal properties. Preserve both behaviours while adding `RegExp` support.
- [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts) currently renders dynamic signatures for `*`, `**`, and literal ignore segments only. Regex signatures must be deterministic enough for duplicate detection and useful validation messages.
- Current rendering helpers would not preserve `RegExp` identity if they relied on plain JSON stringification. Add explicit rendering for direct regex segments and regex ignore segments, using source and flags in a collision-resistant format.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) currently contains regex safety helpers for `keys`. Extract a shared helper rather than copying a second implementation for path regexes.
- [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts) currently distinguishes exact canonical duplicates from dynamic selector duplicates. Regex dynamic selectors must enter that same duplicate-checking path.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) already separates exact and dynamic path rules and separates exact and regex key rules. Extend those buckets rather than adding a parallel plan.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) already resolves exact path, dynamic path, exact key, and regex key precedence in one traversal. Regex path matching should extend `matchesSingleSegment` and leave the policy selection shape intact.
- [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) and `src/utils/**` still contain retained v3 concepts. Do not import those modules to shortcut v4 regex path work.
- [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) is the main green public behaviour suite. `test/unit/**` is still outside the default green Vitest command unless run explicitly or reached through the red-phase config.
- [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc) pins the contributor baseline to Node `24.14.1`.

### Library / Framework Requirements

- Use the current repository baseline from [package.json](/Users/ben/Code/deep-redact/package.json), not older planning examples:
  - `pnpm@10.33.0`
  - Node engine `>=22.18.0`, with contributor verification under `.nvmrc` Node `24.14.1`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Keep ESM-first source patterns and explicit `.js` import specifiers in TypeScript source modules.
- Do not spend this story changing tool versions unless a blocker is proven. The story is about regex path-segment capability, not toolchain churn.

### Regex Safety Notes

- JavaScript `RegExp` instances with `global` or `sticky` flags are stateful through `lastIndex`, so accepting those flags would make repeated path-segment checks order-sensitive unless the runtime deliberately resets or clones state. This story should reject those flags for path selectors, matching the Story `1.5` key-selector contract.
- MDN documents that `RegExp.prototype.test()` uses `lastIndex` state for `global` and `sticky` regexes, and the `lastIndex` page notes that these flags affect the next match position.
- OWASP's ReDoS guidance describes catastrophic regex execution as a denial-of-service risk when vulnerable regexes are run against crafted input. This story should keep bounded source-length and unsafe-pattern rejection in the green gate.
- Regex safety does not need to solve every theoretical ReDoS case in this story, but it must reject representative catastrophic patterns and keep selector complexity bounded. Keep direct validation examples for nested quantified patterns such as `/^(a+)+$/` and overlapping quantified alternation such as `/^(a|aa)+$/`.

### Testing Requirements

- Add green contract coverage for direct regex path segments redacting matching nested branches and preserving non-matching siblings.
- Add green contract coverage for regex path segments matching array index path segments by canonical index text.
- Add green contract coverage for exact-path precedence over regex dynamic path rules using path-specific `censor` values.
- Add green contract coverage for regex path rules outranking regex property rules on the same leaf.
- Add green contract coverage for a retained parent path policy and a more specific child regex path rule so inherited path policy precedence stays explicit.
- Add validation tests for unsupported string-form regex segments and unsupported matcher objects so future selector forms do not slip in accidentally.
- Add validation tests for stateful flags, unsafe nested quantifiers, unsafe overlapping alternation, overlong regex sources, and duplicate regex dynamic selectors.
- Add a repeated-call test proving caller-owned regex path selectors keep their original `lastIndex` after multiple redactions.
- Extend declaration and consumer fixture coverage for regex structured selector types.
- Keep [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts), [test/contract/exports/import.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/import.test.ts), [test/contract/exports/require.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/require.test.ts), and [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts) green.

### Implementation Guardrails

- Do not add a second traversal pass for regex path selectors.
- Do not weaken exact-path duplicate rejection to fit regex dynamic selectors.
- Do not treat regex path segments as key selectors; they match only the segment position where they appear in a structured path.
- Do not match regex property keys against array indexes through `keys`; Story `1.5` deliberately kept array indexes out of regex key matching.
- Do not accept regex-like string selectors in either `keys` or `paths`.
- Do not allow global or sticky regex flags into compiled path matchers.
- Do not mutate caller payloads in place or use `structuredClone` as a hot-path shortcut.
- Do not regress Story `1.3` prototype-key safety, Story `1.4` sparse-array handling, or Story `1.5` regex-key determinism.
- Do not reintroduce the legacy `DeepRedact` class, `blacklistedKeys`, or American-English aliases such as `serialize`.
- Do not edit generated files manually. If generated outputs change, run the generator scripts.

### Previous Story Intelligence

- Story `1.5` widened `keys` to `string | RegExp`, added conservative regex safety validation, cloned accepted regex key matchers, and proved regex key matching does not mutate caller-owned `RegExp` state. Reuse that pattern for path regexes.
- Story `1.5` established that regex property rules share the global key policy and run below all path rules. Story `1.6` must preserve that precedence and add direct coverage for regex path over regex key.
- Story `1.4` added the dynamic path rule bucket and traversal matching for wildcard, recursive wildcard, and structured ignore selectors. Regex path segments should extend this dynamic path machinery rather than creating new plan or runtime categories.
- Story `1.4` review fixes matter here: structured selector strings are literal, invalid numeric structured segments fail validation, sparse array holes are preserved, and duplicate dynamic selectors are rejected.
- Story `1.3` established exact-path canonicalisation, exact-path precedence, prototype-named key safety, and non-mutating nested traversal. Regex path support must not weaken these contracts.
- Story `1.2` established startup validation and immutable compiled policy as the mechanism for rejecting invalid configuration before runtime.
- Sprint status still lists Story `1.3` as `review`, while Stories `1.4` and `1.5` are `done` and current source builds on the Story `1.3` implementation. Treat the current source and tests as authoritative unless a failing check proves otherwise.

### Recent Git Intelligence

- The latest implementation commit is `e9b2f35 feat: match sensitive fields by regex-based property names`; it changed path-adjacent public types, validation, compiler, runtime, contract tests, type fixtures, and the Story `1.5` context.
- The preceding dynamic path commit is `1c51a9f feat: support wildcard and exclusion selectors for repeated nested structures`; it added the dynamic path rule bucket, dynamic selector signatures, wildcard and ignore traversal matching, and duplicate dynamic-selector validation.
- The exact key/path commit `c6584ab feat: redact exact keys and canonical exact paths in nested payloads` introduced the path parser, path normaliser, exact path lookup, replacement application, and exact path over key precedence this story depends on.
- This story was assembled as new implementation context, so the working tree is expected to contain the new story artefact and the corresponding sprint-status update before implementation begins.

### Latest Technical Information

- MDN `RegExp.prototype.test()` currently documents JavaScript regexes with `global` or `sticky` flags as stateful because they store `lastIndex` from previous matches. Source: [MDN RegExp.prototype.test()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test).
- MDN `RegExp.lastIndex` currently documents that `lastIndex` is used by regex instances with `g` or `y` flags and affects where the next match starts. Source: [MDN RegExp: lastIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex).
- OWASP currently describes Regular expression Denial of Service as a risk where vulnerable regex processing can become extremely slow on crafted input. Source: [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS).

### Open Questions / Assumptions

- Assume direct `RegExp` structured path segments are in scope for Story `1.6`.
- Assume `RegExp` inside `{ ignore: ... }` is in scope and must use the same safe matcher helper and validation path as direct regex segments.
- Assume regex path segments test the canonical segment text and match one segment only; they do not scan descendant paths or inspect values.
- Assume stateful flags are rejected rather than normalised or reset, because rejection matches Story `1.5` and is simpler to keep deterministic.

### Project Structure Notes

- The repository already has the relevant v4 slices under `src/core/` and `src/types/`; prefer extending those over creating top-level modules.
- If a shared regex safety helper is extracted, keep it in the current v4 source tree, such as `src/core/validation/regex-safety.ts` or `src/core/matching/regex-safety.ts`, and cover it through existing validation and matcher tests.
- There is no current `test/security/` suite in the working tree. Put story-critical unsafe-regex rejection in the green contract path, and run any lower-level unit or security proof explicitly if it lives outside the default green suite.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this story lives under `_bmad-output/implementation-artifacts/`.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 1`, `Story 1.6`
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `API & Communication Patterns`, `Path Grammar & Selector Contract`, `Quality Gates`, `Project Structure & Boundaries`
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `Targeted Redaction Coverage`, `Precise Output Behaviour`, `Security`, `Reliability & Failure Handling`
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [1-5-match-sensitive-fields-by-regex-based-property-names.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-5-match-sensitive-fields-by-regex-based-property-names.md)
  - [1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md)
  - [1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md)
  - [1-2-create-and-validate-a-reusable-service-redactor.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-2-create-and-validate-a-reusable-service-redactor.md)
- Current repo files
  - [package.json](/Users/ben/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - [project-context.md](/Users/ben/Code/deep-redact/project-context.md)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts)
  - [src/core/matching/path-normaliser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-normaliser.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/core/validation/validate-paths.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-paths.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
  - [test/unit/core/matching/path-normaliser.test.ts](/Users/ben/Code/deep-redact/test/unit/core/matching/path-normaliser.test.ts)
- External technical references
  - [MDN RegExp.prototype.test()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test)
  - [MDN RegExp: lastIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex)
  - [OWASP Regular expression Denial of Service](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

## Story Completion Status

Context analysis completed and the story is ready for implementation.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context assembled from local planning artefacts, previous implementation stories, current source files, current package metadata, recent git history, and external regex references on `2026-05-01T02:17:43+0100`.
- Red phase: focused contract run failed on 14 expected regex path-segment gaps before implementation.
- Green focused checks: `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` passed 73 tests.
- Green focused unit checks: `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/matching/path-normaliser.test.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` passed 32 tests.
- Generated outputs refreshed with `pnpm run generate`.
- Node baseline confirmed with `node --version` under `nvm use 24.14.1`: `v24.14.1`.
- Green quality gate: `pnpm run lint` passed.
- Green contract gate: `pnpm run test` passed 5 files and 80 tests.
- Retained red-phase pressure: `pnpm run test:red-phase` still fails legacy `DeepRedact` constructor coverage in `test/unit/index.test.ts` and `test/load/redact.test.ts`; new regex path unit coverage passed in that run.

### Implementation Plan

- Widen the public structured selector type to accept `RegExp` direct segments and regex ignore segments without adding a parallel public option.
- Parse regex segments into explicit dynamic path segment kinds, clone caller-owned matchers, and render deterministic direct-regex and ignore-regex signatures.
- Extract shared regex safety validation and reuse it for key and path regex selectors.
- Match regex path segments in the existing traversal lane using current segment text while preserving exact path and dynamic path precedence.
- Cover public behaviour, validation, dynamic rule shape, signature rendering, and consumer type discovery.

### Completion Notes List

- Added `RegexPathSegment` to the public type surface and widened `IgnorePathSegment.ignore` to support `RegExp`.
- Added direct regex and regex-ignore path segment parsing, signature rendering, startup validation, and runtime matching.
- Extracted shared conservative regex safety checks for key and path selectors.
- Preserved exact path over dynamic path precedence and dynamic path over regex-key precedence with focused contract tests.
- Verified array indexes and numeric-looking object keys are matched as segment text.
- Regenerated the tracked ESM build output after the source change.

### File List

- `_bmad-output/implementation-artifacts/1-6-match-sensitive-fields-by-regex-based-path-segments.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `dist/index.js`
- `src/core/matching/path-normaliser.ts`
- `src/core/matching/path-parser.ts`
- `src/core/runtime/redact-value.ts`
- `src/core/validation/regex-safety.ts`
- `src/core/validation/validate-config.ts`
- `src/core/validation/validate-paths.ts`
- `src/index.ts`
- `src/types/paths.ts`
- `src/types/public.ts`
- `test/contract/api/create-redactor.test.ts`
- `test/fixtures/consumers/types-cjs/index.cts`
- `test/fixtures/consumers/types/index.ts`
- `test/unit/core/compiler/compile-redactor-plan.test.ts`
- `test/unit/core/matching/path-normaliser.test.ts`

### Change Log

- 2026-05-01: Implemented regex-based structured path-segment matching, validation, precedence coverage, and public type discovery; story moved to review.
