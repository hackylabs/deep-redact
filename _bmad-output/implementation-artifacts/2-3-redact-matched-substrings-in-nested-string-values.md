# Story 2.3: Redact Matched Substrings in Nested String Values

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want ordered substring-targeting rules to partially redact nested string content,
so that I can protect embedded secrets without losing surrounding safe context.

## Acceptance Criteria

1. Given substring-targeting rules are configured through the public factory options, when the factory initialises, then it accepts an ordered list of rules containing either bare `RegExp` tests or structured `{ pattern: RegExp, replacer: (value: string, pattern: RegExp) => string }` rules.
2. Given a configured rule is invalid, unsafe, or fails regex validation, when the factory initialises, then initialisation fails with a validation error and no redactor is created.
3. Given a configured pattern is empty, matches the empty string, or would create ambiguous zero-length matching behaviour, when the factory initialises, then initialisation fails with a validation error.
4. Given multiple substring rules are configured, when redaction runs, then rules are evaluated in configuration order and the first matching rule wins.
5. Given a nested string value matches a bare `RegExp` rule, when redaction runs, then the entire string value is redacted using the resolved whole-value censor behaviour for that match and later substring rules are not applied to that value.
6. Given a nested string value matches a structured substring rule, when redaction runs, then the `replacer` is called once with the original string value and an invocation-local clone of the configured pattern, the returned string is used as-is, and no later substring rules are applied to that value.
7. Given a structured substring rule partially rewrites a string, when redaction runs, then only the matched substrings are altered and surrounding unmatched text remains unchanged.
8. Given a string value does not match any substring rule, when redaction runs, then that value is returned unchanged.
9. Given a targeted value is not a string, when redaction runs, then substring targeting is not applied to that value.
10. Given substring targeting collides with key, path, or deep-key targeting, when this story is implemented, then cross-target precedence remains deferred to the later precedence story.

## Tasks / Subtasks

- [x] Extend the v4 public option and type surface for substring rules (AC: 1)
  - [x] Add `stringTests?: readonly StringTest[]` to `DeepRedactOptions` in `src/types/config.ts`; use this option name for this story because retained v3 tests and product artefacts already describe the existing capability as string tests.
  - [x] Introduce public v4 types equivalent to `type StringTest = RegExp | SubstringRule` and `interface SubstringRule { readonly pattern: RegExp; readonly replacer: (value: string, pattern: RegExp) => string }`.
  - [x] Re-export the new public types from `src/types/public.ts` and `src/index.ts`; update both ESM and CJS consumer type fixtures.
  - [x] Do not add a second public alias such as `substringRules` unless a product decision explicitly changes the API; do not revive unrelated v3 options such as `blacklistedKeys`, `replacement`, `serialize`, or `types`.

- [x] Validate substring rules before compilation (AC: 1, 2, 3)
  - [x] Add `stringTests` to the root allowed-option set in `src/core/validation/validate-config.ts`.
  - [x] Validate that `stringTests`, when provided, is an array whose entries are either `RegExp` instances or plain structured rule objects with `pattern` as a `RegExp` and `replacer` as a function.
  - [x] Reject unsupported structured rule fields, missing `pattern`, missing `replacer`, non-`RegExp` patterns, and non-function replacers with paths such as `options.stringTests[0]`.
  - [x] Reuse the source-length and ReDoS checks from `src/core/validation/regex-safety.ts` for substring patterns. Do not blindly reuse the current key/path flag check if it would reject `g`, because structured substring replacers may need global regexes to replace multiple occurrences.
  - [x] Reject sticky (`y`) substring patterns unless a specific deterministic sticky semantics is designed and tested. Permit global (`g`) substring patterns only with cloned internal regexes and explicit `lastIndex` reset before each match attempt.
  - [x] Add a zero-length match guard for substring patterns. Reject patterns that can match an empty value or produce a zero-length match on representative probes, covering at least `/(?:)/`, `/^/`, `/$/`, `/a?/`, and `/(?=secret)/`.
  - [x] Ensure validation does not mutate caller-owned `RegExp` instances or depend on their current `lastIndex`.
  - [x] Add explicit coverage for configured substring patterns whose caller-owned `lastIndex` is non-zero, including global patterns whose `lastIndex` would otherwise advance during matching.

- [x] Compile substring rules once into the immutable redactor plan (AC: 1, 4, 5, 6)
  - [x] Extend `CompiledRedactorPlan` in `src/core/compiler/compile-redactor-plan.ts` with an ordered `substringRules` collection.
  - [x] Clone every configured `RegExp` at compilation with `new RegExp(pattern.source, pattern.flags)` and preserve rule order exactly, including the `g` flag when it is valid for substring use.
  - [x] Store whether each compiled rule is bare-regex whole-value redaction or structured-replacer redaction without reparsing or inspecting user options during traversal.
  - [x] Freeze the compiled substring rule array and its rule records, matching the existing compiled-plan immutability pattern.

- [x] Apply substring targeting during nested traversal without changing existing whole-value matching (AC: 4, 5, 6, 7, 8, 9, 10)
  - [x] In `src/core/runtime/redact-value.ts`, evaluate substring rules only for nested string values that are not already selected by an exact path, dynamic path, inherited retained path policy, exact key, or regex key policy.
  - [x] Keep root primitive string handling out of scope by requiring a non-empty `pathSegments` context before substring targeting runs. Story `2.4` owns root primitive matching.
  - [x] Evaluate compiled substring rules in configuration order, stop at the first match, and apply no later substring rules to that value.
  - [x] For a bare `RegExp` rule, redact the entire matched string through existing whole-value behaviour in `applyRedaction`, using the compiled global policy and a `FunctionCensorContext` whose `matchedPath` is the actual nested path and whose `rulePath` identifies the substring pattern, for example `[pattern]`.
  - [x] Preserve Story `2.2` semantics for bare-regex substring hits: global function censors still receive exactly two arguments, `replaceStringByLength` still applies to literal censors, and explicit `remove: true` still uses the existing `removedValue` sentinel.
  - [x] For a structured rule, call `replacer(originalString, patternClone)` exactly once and use the returned string as-is; do not also call the global censor, same-length replacement, or removal logic for that structured rule.
  - [x] Pass an invocation-local `RegExp` clone to structured replacers so a replacer cannot mutate compiled-plan regex state through `lastIndex`.
  - [x] Reset internal regex `lastIndex` before and after runtime matching wherever a compiled substring pattern may be global.
  - [x] Return non-matching strings unchanged and return all non-string primitive values unchanged.
  - [x] Do not add new graceful-degradation or `[UNSUPPORTED]` handling for structured replacer exceptions in this story; Story `3.5` owns localised runtime-failure handling for substring replacer execution.
  - [x] Do not implement the final precedence ladder that includes substring rules; Story `2.5` owns the normative cross-target precedence matrix.

- [x] Add focused contract, compiler, validation, and type coverage (AC: 1-10)
  - [x] Add contract tests in `test/contract/api/create-redactor.test.ts` for bare `RegExp` substring rules redacting nested object properties and array elements with the default censor, a literal global censor, a function censor context, and `replaceStringByLength: true`.
  - [x] Add contract tests for structured replacers proving the replacer receives `(originalString, patternClone)`, is called once, can partially rewrite a string, can use a global regex to replace multiple occurrences, preserves surrounding unmatched text, and prevents later substring rules from running.
  - [x] Add contract tests proving ordered first-match-wins behaviour for bare-vs-structured and structured-vs-bare rule order.
  - [x] Add contract tests proving unmatched strings, non-string values, and root primitive strings remain unchanged in Story `2.3`.
  - [x] Add contract tests proving sparse-array holes are preserved when substring redaction changes another array element without active removal, and that bare substring `remove: true` uses the existing array compaction path rather than creating sparse removal artefacts.
  - [x] Add contract tests proving `serialise: true` and a custom `serialise` function receive the already-substring-redacted structured result for both bare and structured substring rules.
  - [x] Add runtime coverage proving caller-owned global `RegExp.lastIndex` is unchanged across repeated redaction calls and that a structured replacer mutating its invocation-local pattern clone does not affect later payload fields or later redactor calls.
  - [x] Add validation tests for invalid containers, invalid rule shapes, unsafe regex patterns, sticky flags, overlong regex sources, and zero-length matching patterns. Add positive coverage for a safe global substring pattern.
  - [x] Add compiler-plan tests in `test/unit/core/compiler/compile-redactor-plan.test.ts` proving substring rules are cloned, frozen, ordered, and do not share mutable `RegExp` instances with caller-owned configuration.
  - [x] Update ESM and CJS consumer declaration fixtures to prove `stringTests`, `StringTest`, and `SubstringRule` are exported and usable.

- [x] Preserve v4 boundaries and verification discipline (AC: 1-10)
  - [x] Keep implementation work in `src/core/**`, `src/types/**`, and `test/**`; do not import from retained legacy modules such as `src/types.ts` or `src/utils/**`.
  - [x] Do not add dependencies or Node-only APIs. The core must remain zero-runtime-dependency and browser-safe.
  - [x] Do not hand-edit generated `dist/` files or generated README/export artefacts. Run generators only through the project scripts if generated inputs change.
  - [x] Run focused Vitest checks while iterating, then run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase` under Node `24.14.1`. Record retained red-phase failures separately from new Story `2.3` regressions.

## Dev Notes

### Story Intent

- Story `2.3` adds nested substring targeting to the current v4 runtime. It is the first Epic `2` story that targets string contents rather than whole matched values.
- The product requirement is precise partial-string handling: a structured rule can alter only matched substrings and leave surrounding safe text intact.
- Bare `RegExp` substring rules are different from structured replacer rules. Bare rules select the whole string for the existing whole-value censor pipeline; structured rules own their returned string and bypass whole-value censor/removal handling.
- Root primitive string redaction is intentionally deferred to Story `2.4`. Do not add a public root selector or make top-level primitive strings match in this story.

### Technical Requirements

- Public configuration should add `stringTests` to `DeepRedactOptions`. This preserves the current Deep Redact capability name from the retained v3 tests while keeping the v4 factory API function-first.
- `stringTests` accepts an ordered array of either `RegExp` or `{ pattern: RegExp, replacer: (value: string, pattern: RegExp) => string }`.
- Rule order is observable. The first matching substring rule wins for a string value, and no later substring rule runs for that value.
- All substring `RegExp` instances must pass initialisation-time safety checks for source length and ReDoS risk. Unsafe regex input must never be deferred to runtime.
- Key and path regex selectors reject `g` and `y` because their matchers are reused as selectors. Substring rules are different: permit `g` when it is needed for structured replacement, but reject `y` unless deterministic sticky semantics are explicitly designed and tested.
- Any runtime use of a global substring regex must reset `lastIndex` before matching, and structured replacers must receive an invocation-local pattern clone so user code cannot corrupt compiled regex state.
- Reject empty and zero-length matching patterns. This story must not create ambiguous infinite-loop or no-op replacement semantics around patterns such as `/^/`, `/$/`, `/(?:)/`, `/a?/`, or `/(?=secret)/`.
- Compile substring patterns once and clone them before runtime use. Do not mutate or depend on caller-owned `RegExp` objects.
- Bare `RegExp` substring hits use the compiled global policy for `censor`, `remove`, `retainStructure`, and `replaceStringByLength`. There is no per-substring local censor surface in this story.
- Structured substring replacers receive the original unredacted string and a cloned pattern for that invocation. The replacer result is used as-is, and Deep Redact does not inspect, post-process, serialise, or same-length-transform that return value before it is placed into the structured output.
- Substring targeting applies only to string leaf values reached during object or array traversal. Non-string values are ignored.
- Preserve caller-owned payload non-mutation. Return new containers only on changed branches, matching the current traversal pattern.
- Preserve array traversal invariants from earlier stories: substring rewrites must not densify sparse arrays, and bare substring removal should continue through the existing `removedValue` and array-compaction behaviour.

### Architecture Compliance

- Keep `src/index.ts` as the thin public facade over `src/core/create-redactor.ts`.
- Keep validation in `src/core/validation/validate-config.ts`, immutable plan construction in `src/core/compiler/compile-redactor-plan.ts`, whole-value output shaping in `src/core/replacement/apply-redaction.ts`, and traversal orchestration in `src/core/runtime/redact-value.ts`.
- Reuse `src/core/validation/regex-safety.ts` for shared source-length and ReDoS checks. If needed, refactor that helper so substring rules can permit safe global patterns without weakening key/path selector validation.
- The architecture requires configuration to be normalised at initialisation into an immutable rule plan. Substring rules must follow that compile-once pattern.
- The architecture treats substring targeting as a separate targeting system. This story should introduce the runtime hook but not finalise all cross-target precedence rules.
- Existing whole-value precedence remains authoritative until Story `2.5`: exact path, dynamic path, inherited path policy, exact key, regex key. Substring redaction should run only when no existing whole-value policy already selected that leaf.
- Deep Redact is one-way only. Do not add restore metadata, mutation-and-restore mechanics, or `fast-redact` style restore behaviour.

### Current Brownfield Constraints

- The current v4 public surface in `src/types/config.ts` is `censor`, `keys`, `paths`, `remove`, `retainStructure`, `serialise`, and `replaceStringByLength`. `stringTests` does not exist yet.
- `src/types.ts` and `src/utils/**` contain retained v3 `stringTests` and `ComplexStringTest` code. They are reference material only. Do not import them into v4 code.
- `src/utils/index.ts` has a legacy `applyStringTransformations` implementation that loops over `stringTests`. Use it only to understand prior behaviour; do not copy its over-broad private utility structure into the v4 runtime.
- `src/core/validation/regex-safety.ts` already centralises regex validation for flag checks, maximum source length, nested quantified patterns, and overlapping quantified alternatives. Substring validation may need a narrower shared helper so global string patterns can be accepted safely.
- `src/core/runtime/redact-value.ts` currently applies whole-value redaction before returning primitive leaves unchanged. Substring handling belongs in that leaf path after active whole-value policy selection has been ruled out.
- `applyRedaction` already owns removal, function-censor invocation, default censor fallback, and same-length replacement. Bare substring regex rules should call into that instead of duplicating whole-value behaviour.
- `test/contract/api/create-redactor.test.ts` is the main green behavioural suite and already covers API creation, validation errors, key/path targeting, removal, retained structure, function-censor context, and same-length replacement.
- `test/unit/core/compiler/compile-redactor-plan.test.ts` is the existing place to prove compiled-plan immutability and cloned regex matcher behaviour.

### Library / Framework Requirements

- Use the current repository baseline from `package.json`, not older planning examples:
  - `pnpm@10.33.0`
  - Node engine `>=22.18.0`
  - contributor runtime from `.nvmrc`: Node `24.14.1`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- As of 4 May 2026, `npm view` reports newer patch versions for `tsdown` (`0.21.10`), `typescript` (`6.0.3`), and `vitest` (`4.1.5`). Do not upgrade tool versions in this story unless a blocker is proven.
- `fast-redact` remains `3.5.0` as of 4 May 2026. It does not provide Deep Redact's nested substring rule model; use it only as migration context, not as an implementation template for this feature.
- Keep ESM-first source patterns and explicit `.js` import specifiers in TypeScript source modules.
- The core package has no runtime dependencies. Do not add a regex or string-matching dependency for this story.

### Testing Requirements

- Add failing tests first for `stringTests` validation and nested substring output before implementing runtime changes.
- Use `test/contract/api/create-redactor.test.ts` for the main behavioural coverage:
  - bare regex default censor
  - bare regex with global literal censor
  - bare regex with global function censor context
  - bare regex with `replaceStringByLength: true`
  - bare regex with `remove: true` on object properties and array items, if the runtime naturally supports it through `applyRedaction`
  - structured replacer partial rewrite
  - structured replacer full rewrite
  - first matching rule wins
  - unmatched strings remain unchanged
  - non-string values remain unchanged
  - root primitive strings remain unchanged
  - caller-owned global `RegExp.lastIndex` remains unchanged across repeated calls
  - sparse-array holes remain holes for non-removal substring rewrites
  - `serialise` runs after substring redaction and receives the redacted structured result
- Use `test/unit/core/compiler/compile-redactor-plan.test.ts` for cloned and frozen compiled substring rule assertions.
- Use `test/contract/types/declarations.test.ts` and its fixtures under `test/fixtures/consumers/` to prove public type exports.
- Preserve these green suites: `test/build.test.ts`, `test/contract/exports/import.test.ts`, `test/contract/exports/require.test.ts`, and `test/contract/types/declarations.test.ts`.
- `test/unit/**` is not fully covered by the default `pnpm run test` command unless included through the contract suite or red-phase config. Run touched unit tests explicitly.

### Implementation Guardrails

- Do not implement root primitive substring targeting. A payload like `'token=abc'` must remain unchanged in Story `2.3` even if it matches `stringTests`.
- Do not implement fuzzy or case-insensitive key matching. Story `2.6` owns those behaviours.
- Do not implement the Story `2.5` final precedence matrix. For now, do not double-apply substring redaction to leaves already matched by path or key rules.
- Do not make structured replacers asynchronous, awaitable, or Promise-aware.
- Do not call structured replacers with `FunctionCensorContext`; their contract is exactly `(value: string, pattern: RegExp) => string`.
- Do not apply `replaceStringByLength` to structured replacer results.
- Do not interpret `undefined` from a structured replacer as removal. The public type returns `string`; tests should keep replacers string-returning.
- Do not mutate configured regexes. Tests should set an unusual `lastIndex` on caller-owned patterns and prove repeated redaction remains deterministic.
- Do not expose compiled regex instances to user replacers. A replacer that mutates the `pattern.lastIndex` it receives must not affect later redaction calls or other payload fields.
- Do not catch structured replacer exceptions or introduce substring-specific diagnostics in this story. Story `3.5` owns transformer, function-censor, substring-replacer, and traversal failure degradation to `[UNSUPPORTED]`.
- Do not use `String.prototype.replaceAll()` with non-global regexes. `String.prototype.replace()` supports both one-match replacement and all-match replacement when the regex has `g`.
- Do not use `delete` or sparse-array-producing operations for removal. Continue using the existing `removedValue` and compaction behaviour if bare substring rules interact with `remove: true`.
- Do not hand-edit generated files. If public type exports require generated artefact updates, run `pnpm run generate`.

### Previous Story Intelligence

- Story `2.2` added public `FunctionCensorContext`, `PathSegments`, and `replaceStringByLength`, and updated `applyRedaction` so function censors receive exactly two arguments.
- Story `2.2` established that `rulePath` can contain public-data-only matcher identity such as cloned `RegExp` objects. Bare substring regex redaction should follow that convention rather than exposing internal compiler records.
- Story `2.2` added runtime-frozen `matchedPath` and `rulePath` arrays. Preserve that safety for bare substring regex function-censor contexts.
- Story `2.2` confirmed `replaceStringByLength: true` is valid with function censors but same-length handling is skipped for function returns.
- Story `2.1` established `applyRedaction` as the whole-value output-shaping module and `redact-value.ts` as traversal/orchestration. Continue that split.
- Story `2.1` formalised removal and retained-structure traversal. Do not regress object-property omission, array compaction, sparse-array-hole preservation, or caller-payload non-mutation.
- Story `1.6` established cloned regex matchers and shared regex-safety validation. Reuse that approach for substring patterns.
- Story `1.4` established sparse-array-hole preservation. Substring work must not densify unrelated sparse arrays.
- Story `1.3` established canonical exact-path matching, prototype-key safety, and non-mutating traversal. Substring handling must preserve those guarantees.
- Sprint status still records Story `1.3` as `review` while later Epic `1` stories and Stories `2.1` to `2.2` are marked `done`. Treat the current source tree and green tests as authoritative unless a failing check proves otherwise.

### Recent Git Intelligence

- `5e7b3f8 feat(API): support function censors and same length string replacement` touched the exact files this story will likely touch: `src/types/**`, `src/core/compiler/compile-redactor-plan.ts`, `src/core/replacement/apply-redaction.ts`, `src/core/runtime/redact-value.ts`, `src/core/validation/validate-config.ts`, consumer fixtures, and contract/compiler tests.
- `65759bf tests(API): censor, retainStructure, and remove coverage` completed Story `2.1` primarily through contract and compiler coverage. Follow that proof-first pattern.
- `ccbd1b3 feat: match sensitive fields by regex-based path segments` introduced `regex-safety.ts` and demonstrated the current pattern for adding a regex-bearing public surface.
- `aa1b7bc fix(Node runtime): types should be same major as dev runtime` and `6d83cf3 fix(version): bump to 4.0.0` show that runtime and package baselines were recently stabilised. Avoid unrelated version churn.

### Latest Technical Information

- Reviewed on 4 May 2026.
- MDN documents `RegExp.prototype.test()` as stateful for regexes with `global` or `sticky` flags because they store and advance `lastIndex`. Substring rules must therefore clone patterns and reset `lastIndex` for deterministic global matching. Source: [MDN RegExp.prototype.test](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test).
- MDN documents `String.prototype.replace()` as returning a new string and leaving the original string unchanged. Structured replacer examples can use `value.replace(pattern, replacement)` without mutating source strings. Source: [MDN String.prototype.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace).
- MDN documents that `replace()` with an empty string pattern prepends the replacement, and global replacement requires a regex with the `g` flag. Deep Redact should reject empty/zero-length substring patterns while still allowing safe global patterns for structured replacers. Source: [MDN String.prototype.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace).
- The current `fast-redact@3.5.0` README documents function censors, mutation, serialisation, and restore-oriented behaviour, but it does not define Deep Redact's nested substring rules. Do not copy its mutation-and-restore model. Source: [fast-redact npm README](https://www.npmjs.com/package/fast-redact).

### Resolved Scope Decisions

- The public option for this story is `stringTests`, matching the retained Deep Redact capability name. Adding a differently named alias is deferred unless product direction changes.
- Bare `RegExp` substring rules select the whole nested string for existing whole-value redaction.
- Structured substring rules are the only Story `2.3` mechanism for partial string rewrites.
- Structured replacer rules do not get `FunctionCensorContext`.
- Root primitive strings remain unchanged until Story `2.4`.
- Cross-target precedence against path and key rules remains deferred to Story `2.5`; this story should avoid double application by applying substring rules only to otherwise unmatched nested string leaves.

### Source Discovery Results

- Loaded `sprint-status.yaml`; story key `2-3-redact-matched-substrings-in-nested-string-values` is currently `ready-for-dev`, and Epic `2` is already `in-progress`.
- Loaded `epics.md`; Story `2.3` implements `FR14` and `FR18` and is scoped to nested string values.
- Loaded `prd.md`; `FR14` requires matched substrings and root primitive strings, while `FR18` requires substring targeting to alter only matched substrings. Root primitive handling is explicitly separated into Story `2.4`.
- Loaded `architecture.md`; substring rules are part of compiled policy, generic traversal, regex-safety, and the future precedence contract.
- Loaded `project-context.md`; all generated story content and code/docs output must use British English conventions.
- No UX-specific planning artefact matching `*ux*.md` exists. This is a library story with no UI requirements.

### Project Structure Notes

- The real v4 implementation surface is currently compact: `src/core/**`, `src/types/**`, and `test/**`. Prefer extending that structure over creating the fuller future architecture tree.
- `src/core/validation/validate-config.ts` should remain the central option-shape validator.
- `src/core/validation/regex-safety.ts` should remain the central regex-safety helper.
- `src/core/compiler/compile-redactor-plan.ts` should own immutable substring rule compilation.
- `src/core/runtime/redact-value.ts` should own traversal-time rule selection. Add a narrow helper if needed, but do not create a parallel traversal engine.
- `src/core/replacement/apply-redaction.ts` should remain the whole-value redaction module. Structured substring replacer handling can live near traversal or in a small helper, but it should not be mixed into the whole-value replacement semantics in a way that confuses censor/removal behaviour.
- `test/contract/api/create-redactor.test.ts` is the primary behavioural suite. Keep Story `2.3` coverage there unless a lower-level unit test gives clearer diagnostics.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`.

### References

- Local planning artefacts
  - `_bmad-output/planning-artifacts/epics.md` - `Epic 2`, `Story 2.3`
  - `_bmad-output/planning-artifacts/prd.md` - `FR14`, `FR18`, `FR31`, `Security`, `Precise Output Behaviour`
  - `_bmad-output/planning-artifacts/architecture.md` - `Core Architectural Decisions`, `Data Architecture`, `API & Communication Patterns`, `Relationship to Other Targeting Modes`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` - current development status
- Previous implementation context
  - `_bmad-output/implementation-artifacts/2-2-support-function-censors-and-same-length-string-replacement.md`
  - `_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md`
  - `_bmad-output/implementation-artifacts/1-6-match-sensitive-fields-by-regex-based-path-segments.md`
  - `_bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md`
  - `_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md`
- Current repo files
  - `package.json`
  - `.nvmrc`
  - `project-context.md`
  - `src/index.ts`
  - `src/core/create-redactor.ts`
  - `src/core/compiler/compile-redactor-plan.ts`
  - `src/core/replacement/apply-redaction.ts`
  - `src/core/runtime/redact-value.ts`
  - `src/core/validation/regex-safety.ts`
  - `src/core/validation/validate-config.ts`
  - `src/types/config.ts`
  - `src/types/paths.ts`
  - `src/types/public.ts`
  - `test/contract/api/create-redactor.test.ts`
  - `test/contract/types/declarations.test.ts`
  - `test/fixtures/consumers/types/index.ts`
  - `test/fixtures/consumers/types-cjs/index.cts`
  - `test/unit/core/compiler/compile-redactor-plan.test.ts`
  - `src/types.ts`
  - `src/utils/index.ts`
- External technical references
  - [MDN RegExp.prototype.test](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test)
  - [MDN String.prototype.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)
  - [fast-redact npm README](https://www.npmjs.com/package/fast-redact)

## Story Completion Status

Context analysis completed; story is ready for implementation.

## Dev Agent Record

### Agent Model Used

GPT-5.5 Codex (2026-05-04)

### Debug Log References

- `pnpm exec vitest run test/contract/types/declarations.test.ts --reporter=verbose` - red failure confirmed missing `StringTest`, `SubstringRule`, and `stringTests` declarations before implementation.
- `pnpm run build` - regenerated package declaration output from the updated source surface.
- `pnpm exec vitest run test/contract/types/declarations.test.ts --reporter=verbose` - passed after public type exports were added.
- `pnpm run test:contract` - passed after the public type surface task.
- `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Story 2.3: substring rule validation"` - red failure confirmed validation still rejected `stringTests` as unsupported.
- `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Story 2.3: substring rule validation"` - passed after adding substring rule validation.
- `pnpm run test:contract` - passed after validation changes.
- `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose -t "substring"` - red failure confirmed the compiled plan had no `substringRules` collection.
- `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose -t "substring"` - passed after compiling cloned substring rules into the immutable plan.
- `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` - passed after compiler changes.
- `pnpm run test:contract` - passed after compiler changes.
- `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Story 2.3: substring rule redaction"` - red failure confirmed traversal ignored compiled substring rules.
- `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "Story 2.3: substring rule redaction"` - passed after adding the nested string leaf hook.
- `pnpm run test:contract` - passed after runtime changes.
- `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` - passed after runtime changes.
- `. /Users/ben/.nvm/nvm.sh && nvm install 24.14.1` - installed the exact `.nvmrc` runtime for final verification.
- `. /Users/ben/.nvm/nvm.sh && nvm use 24.14.1 && pnpm run lint` - passed under Node `v24.14.1`.
- `. /Users/ben/.nvm/nvm.sh && nvm use 24.14.1 && pnpm run test` - passed under Node `v24.14.1`; build emitted the existing tsdown CommonJS format warning.
- `. /Users/ben/.nvm/nvm.sh && nvm use 24.14.1 && pnpm run test:red-phase` - retained failures only: `test/load/redact.test.ts` and 7 tests in `test/unit/index.test.ts` still expect the removed legacy `DeepRedact` constructor; no Story `2.3` tests failed.
- `git diff --check` - passed.

### Completion Notes List

- Created Story `2.3` from the Epic `2` requirements and current sprint status.
- Loaded planning artefacts, project context, previous Story `2.2`, current v4 source files, recent git commits, and current external references.
- Validation framework file `_bmad/core/tasks/validate-workflow.xml` is not present in this repository; checklist review was performed manually against `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`.
- Added the v4 `stringTests` option and public `StringTest`/`SubstringRule` types without introducing an alias or reviving unrelated legacy v3 options.
- Updated ESM and CJS declaration fixtures to prove `stringTests`, `StringTest`, and `SubstringRule` are consumer-visible.
- Added initialisation-time validation for `stringTests`, including structured rule shape checks, shared regex safety, sticky rejection, safe global acceptance, zero-length guards, and non-mutating caller-owned regex handling.
- Added immutable compiled substring rule records that preserve configuration order, clone regex patterns, keep global flags for valid substring use, and distinguish whole-value redaction from structured replacer rules.
- Added nested string leaf substring matching that preserves existing path/key selection precedence, leaves root primitive strings out of scope, routes bare regex hits through `applyRedaction`, and routes structured rules through invocation-local pattern clones.
- Added focused Story `2.3` coverage across public declarations, validation, compiled plan immutability, and runtime contract behaviour.
- Kept v4 implementation within the current core/type/test surfaces plus the required public facade re-export; no dependencies or Node-only runtime APIs were added.
- Regenerated `dist/index.js` through `pnpm run test` / `pnpm run build`; generated files were not hand-edited.
- Final verification passed for lint and the build-backed contract suite under Node `v24.14.1`; retained red-phase legacy constructor failures were recorded separately.

### File List

- `_bmad-output/implementation-artifacts/2-3-redact-matched-substrings-in-nested-string-values.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `dist/index.js`
- `src/index.ts`
- `src/core/compiler/compile-redactor-plan.ts`
- `src/core/runtime/redact-value.ts`
- `src/core/validation/regex-safety.ts`
- `src/core/validation/validate-config.ts`
- `src/types/config.ts`
- `src/types/public.ts`
- `test/contract/api/create-redactor.test.ts`
- `test/fixtures/consumers/types/index.ts`
- `test/fixtures/consumers/types-cjs/index.cts`
- `test/unit/core/compiler/compile-redactor-plan.test.ts`

### Senior Developer Review (AI)

Reviewed 2026-05-04 by Claude Sonnet 4.6.

**Findings fixed (4):**

- **H1 (fixed):** `cloneRegExp` was duplicated in `compile-redactor-plan.ts` and `redact-value.ts`. Consolidated into `regex-safety.ts` as an exported utility; both files now import it from there.
- **M1 (fixed):** No contract test proved that bare substring `remove: true` removes an **object property** (only array compaction was tested). Added `'removes object properties matched by bare substring rules when remove: true'` to the Story 2.3 contract suite.
- **M2 (fixed):** The compiler isolation test set caller-owned `lastIndex` *after* compilation, so it did not prove that a non-zero `lastIndex` at compile time does not corrupt the compiled plan. Added `'compiles cloned substring patterns with lastIndex=0 even when caller-owned lastIndex is non-zero at compile time'` to the compiler unit suite.
- **M3 (fixed):** No test exercised the structured-replacer no-op path (`replacement !== value` → `changed: false`), which is load-bearing for the non-mutation guarantee. Added `'does not copy the parent container when a structured replacer returns the original string unchanged'`.

**Low findings noted but not auto-fixed:**
- `new RegExp('')` implicitly tests the `/(?:)/` probe but is labelled `'empty pattern'`; acceptable without a label change.
- `buildSubstringRulePath` allocates a new `RegExp` per bare-regex censor call; known design cost, no action required in this story.

All 160 tests pass; lint clean.

### Change Log

- 2026-05-04: Implemented Story `2.3` nested substring redaction with public `stringTests` types, validation, immutable compilation, runtime traversal, contract/unit/type coverage, and generated build output.
- 2026-05-04: Code review — fixed `cloneRegExp` duplication (H1), added object-property removal test (M1), added pre-compilation `lastIndex` compiler test (M2), added structured-replacer no-op non-mutation test (M3). Status → done.
