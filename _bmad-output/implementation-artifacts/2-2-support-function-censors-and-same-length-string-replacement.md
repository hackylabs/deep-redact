# Story 2.2: Support Function Censors and Same-Length String Replacement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want matched targets to support function censors and length-preserving string replacement,
so that I can tailor redacted output to the matched value while preserving only safe diagnostic cues.

## Acceptance Criteria

1. Given a matched target and a function censor is resolved for that target, when redaction runs, then the censor is invoked once with exactly two arguments: the original matched `value` and a `context` object.
2. Given a function censor `context` object, when it is exposed through the public API, then its exact public shape is `FunctionCensorContext = { matchedPath: PathSegments, rulePath: PathSegments, rootInput: unknown, terminalKey?: string | number }`.
3. Given a function censor context, `matchedPath` is the canonical root-relative path to the matched target, `rulePath` is the configured rule path that produced the match expressed in the same public path-segment format, and `rootInput` is the original unmodified root input reference supplied to the redactor.
4. Given a matched target with a final property key or array index, when the function censor context is created, then `terminalKey` is present and contains that final key or index.
5. Given the match is the root input, when the function censor context is created, then `terminalKey` is omitted.
6. Given both a local function censor and a broader global literal or function censor are configured, when redaction runs, then the local function censor takes precedence for that matched rule only.
7. Given a matched rule does not define a local censor, when redaction runs, then the resolved censor falls back to the compiled global censor.
8. Given neither a local censor nor a compiled global censor is defined, when redaction runs, then the resolved censor falls back to the library default censor.
9. Given a function censor returns a replacement value, when redaction runs, then only the matched target is replaced with that returned value and non-targeted siblings remain unchanged.
10. Given `replaceStringByLength: true` and the resolved censor is a non-empty literal string, when the matched value is a string, then the redacted output is produced by repeating the literal token as needed and truncating to exactly the original string length.
11. Given `replaceStringByLength: true` and the matched value is not a string, when redaction runs, then same-length replacement is not applied and the resolved censor output is used as-is.
12. Given `replaceStringByLength: true` and the resolved censor is a function, when redaction runs, then same-length replacement is not applied and the function return value is used as-is.
13. Given `replaceStringByLength: true` and the resolved literal censor is an empty string, when the factory initialises, then initialisation fails with a validation error and no redactor is created.
14. Given a configuration sets `remove: true` together with `censor`, `retainStructure: true`, or `replaceStringByLength: true` on the same effective rule, when the factory initialises, then initialisation fails with a validation error and no redactor is created.
15. Given a root primitive input such as a string, when this story is implemented, then root-primitive targeting remains out of scope for Story `2.2` and dedicated root-primitive matching behaviour is deferred to Story `2.4`.

## Tasks / Subtasks

- [x] Extend the public v4 configuration and type surface without reviving legacy names (AC: 2, 10, 11, 12, 13, 15)
  - [x] In [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts), introduce public `PathSegments`, `FunctionCensorContext`, and data-only dynamic rule-path marker types, then update `Censor` so function censors receive `(value: unknown, context: FunctionCensorContext) => unknown`.
  - [x] Define `FunctionCensorContext` with readonly public properties: `readonly matchedPath: PathSegments`, `readonly rulePath: PathSegments`, `readonly rootInput: unknown`, and `readonly terminalKey?: string | number`.
  - [x] Define `PathSegments` as a readonly array of public context segment values, not internal parser nodes. It must support `string`, `number`, `RegExp`, `IgnorePathSegment`, and public wildcard marker objects such as `{ readonly any: true }` and `{ readonly anyDepth: true }` so configured dynamic rule paths can be represented without leaking parser records.
  - [x] Keep `matchedPath` exact-only for this story: it contains only `string` and `number` segments. `rulePath` may contain `RegExp`, `IgnorePathSegment`, and public wildcard marker values when the configured rule was dynamic.
  - [x] Do not widen the accepted path-selector input grammar merely because `PathSegments` can represent context-output wildcard markers. `PathSegments` is the function-censor context format, not a promise that every segment value is accepted as a new configuration input form.
  - [x] Keep existing one-argument function censors type-compatible. TypeScript permits assigning callbacks with fewer parameters to callback types with more parameters; prove this through consumer type fixtures rather than weakening the public context contract.
  - [x] Add `replaceStringByLength?: boolean` to [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) and [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) as a root option and path-rule override.
  - [x] Re-export `FunctionCensorContext` and `PathSegments` from [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts) and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts).
  - [x] Do not add `replacement`, `serialize`, `blacklistedKeys`, `types`, or any other retained v3 option to the v4 public surface.

- [x] Compile replacement policy once at initialisation, including function-context metadata (AC: 2, 3, 4, 6, 7, 8, 10, 13)
  - [x] Extend `CompiledRedactionPolicy` in [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) with `replaceStringByLength: boolean`.
  - [x] Merge `replaceStringByLength` the same way as `censor`, `remove`, and `retainStructure`: local path-rule override, then compiled global default, then library default `false`.
  - [x] Preserve object freezing and null-prototype lookup tables already used by the compiled plan.
  - [x] Carry enough public rule identity into compiled exact-path, dynamic-path, exact-key, and regex-key rules for the runtime to build `rulePath` without exposing internal parser objects or reparsing selectors during redaction.
  - [x] For exact and dynamic path rules, compile a public `rulePath` once from the parsed selector. Map exact property/index segments to `string`/`number`, regex segments to cloned `RegExp`, ignore segments to `IgnorePathSegment`, `*` to `{ readonly any: true }`, and `**` to `{ readonly anyDepth: true }`.
  - [x] For exact-key rules, keep the configured key available as the rule path. For regex-key rules, keep the configured cloned `RegExp` matcher available as the rule path.
  - [x] Resolve regex-key matches to the first matching compiled regex-key rule, not just to a boolean `regex-key` source, so `rulePath` is deterministic when multiple regex key selectors match the same property.
  - [x] For inherited retained path policies, preserve the parent rule path as descendants are redacted.

- [x] Validate new same-length combinations before any redactor is created (AC: 13, 14)
  - [x] In [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts), allow only `boolean` values for `replaceStringByLength` at root and path-rule levels.
  - [x] Add `replaceStringByLength` to the root and path-rule allowed-option sets.
  - [x] Reject an effective policy where `replaceStringByLength: true` resolves to an empty literal string censor, including inherited-default cases.
  - [x] Reject an effective policy where `remove: true` resolves together with `replaceStringByLength: true`, including root-level, path-rule, and inherited-default cases. Do not silently resolve this by letting removal take precedence.
  - [x] Preserve existing failures for `remove + censor` and `remove + retainStructure` at root and path-rule levels, including conflicts that only appear after defaults are merged.
  - [x] Do not reject function censors with `replaceStringByLength: true`; same-length handling is simply skipped for function censors.

- [x] Build the function-censor runtime context at the point of whole-value redaction (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 15)
  - [x] Update [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) and [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) so each redactor call passes the original caller-supplied value into traversal as `rootInput`.
  - [x] Update [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) so traversal carries `rootInput`, canonical matched path segments, terminal key, and the matched rule path into replacement.
  - [x] Make direct key matching return the rule identity needed for `rulePath` (configured exact key or first matching cloned regex), rather than only returning the match source category.
  - [x] Update [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) so function censors are called exactly once with `(originalMatchedValue, context)`.
  - [x] Prove the runtime call has exactly two arguments. Do not rely only on TypeScript signatures; callbacks using `arguments.length` must observe `2`.
  - [x] Ensure `rootInput` is the original caller-supplied reference, not a cloned or partially transformed value.
  - [x] Ensure `matchedPath` is root-relative and exact for object properties and array indexes, for example `['accounts', 'primary', 'token']` and `['users', 1, 'email']`.
  - [x] Ensure `terminalKey` is the last exact matched segment for non-root matches and is omitted only for a root match. Do not add any public root selector or root-primitive targeting in this story.
  - [x] Build a fresh context object and fresh `matchedPath` / `rulePath` arrays for each function-censor invocation. If a censor mutates those arrays at runtime, that mutation must not affect later invocations, the compiled plan, or traversal state.
  - [x] Treat a function return value of `undefined` as the replacement value, not as removal. Removal must continue to use the existing `removedValue` sentinel and explicit `remove: true` policy.
  - [x] Do not await or special-case `Promise` returns; this story keeps the redactor synchronous.

- [x] Implement same-length literal string replacement without over-allocation (AC: 10, 11, 12, 13)
  - [x] Keep [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) as the whole-value output-shaping module unless tests prove a narrow helper split is necessary.
  - [x] Apply same-length replacement only when `replaceStringByLength: true`, the original matched value is a JavaScript string, and the resolved censor is a non-empty literal string.
  - [x] Use JavaScript string `.length` semantics. Do not add grapheme segmentation, locale handling, or a Unicode dependency in this story.
  - [x] Build the repeated token to exactly the target length, for example quotient plus remainder, rather than creating an overlong string and relying on truncation after a possible allocation spike.
  - [x] Preserve the library default `[REDACTED]` as a valid resolved literal censor. If same-length is enabled with no explicit `censor`, the default token is repeated/truncated to the original string length.
  - [x] Skip same-length behaviour for non-string matched values and for function censors, using the resolved censor output as-is.

- [x] Add focused green coverage for the public contract (AC: 1-15)
  - [x] Add contract tests in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) for global function censors on exact-key, regex-key, exact-path, and dynamic-path matches.
  - [x] Add contract tests showing a local path-rule function censor beats a broader global literal or function censor for that matched rule only.
  - [x] Add contract tests proving the context object contains `matchedPath`, `rulePath`, `rootInput`, and `terminalKey`, including an array-index match.
  - [x] Add contract tests proving `rulePath` is public-data-only for exact paths, dynamic wildcard paths, regex path segments, ignore segments, exact keys, and regex keys. Include a case where multiple regex key selectors match and the first matching configured regex becomes `rulePath`.
  - [x] Add contract tests proving function censors receive exactly two runtime arguments.
  - [x] Add a retained-parent case showing a function censor inherited from a retained path policy receives the retained parent `rulePath` while each descendant receives its own exact `matchedPath`.
  - [x] Add contract tests proving function returns replace only the matched target, preserve siblings, and do not mutate the caller-owned payload.
  - [x] Add contract tests proving context object and context arrays are isolated between invocations by mutating one context inside a censor and asserting later invocations and compiled rule metadata are unaffected.
  - [x] Add contract tests for same-length global and local literal censors, including a token longer than one character, a non-string matched value, a function censor with `replaceStringByLength: true`, a local `replaceStringByLength: false` override over a global `true`, and the default `[REDACTED]` fallback.
  - [x] Add validation tests for empty-string literal censors with `replaceStringByLength: true` at root, path-rule, and inherited-default levels.
  - [x] Add validation tests proving `remove: true` with `replaceStringByLength: true` fails at factory initialisation for root-level, path-rule, and inherited-default combinations.
  - [x] Add or update consumer type fixtures under [test/fixtures/consumers/](/Users/ben/Code/deep-redact/test/fixtures/consumers) to prove `FunctionCensorContext`, `PathSegments`, dynamic rule-path marker types, readonly context properties, and `replaceStringByLength` are available in ESM and CJS declaration consumers.

- [x] Preserve existing v4 boundaries and verification discipline (AC: 1-15)
  - [x] Keep implementation work in `src/core/**`, `src/types/**`, and `test/**`.
  - [x] Do not import from retained legacy modules such as [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) or `src/utils/**`.
  - [x] Do not change the precedence ladder from Story `2.1`: exact path, dynamic path, inherited path policy, exact key, regex key.
  - [x] Do not implement substring targeting, root-primitive targeting, fuzzy matching, case-insensitive key matching, transformers, diagnostics, or console adapters in this story.
  - [x] Do not hand-edit generated `dist/` files or generated README/export artefacts.
  - [x] Run focused Vitest checks while iterating, then run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase` under Node `24.14.1`. Record retained red-phase failures separately from new story regressions.
  - [x] Run `pnpm run generate` if public type exports, generated README inputs, or generated export metadata change.

### Review Findings

- [x] [Review][Patch] Dead ternary in `buildFunctionCensorContext` — `pathSegments.map((seg) => (seg.kind === 'index' ? seg.value : seg.value))` has identical branches; replace with `seg.value` directly [src/core/runtime/redact-value.ts]
- [x] [Review][Patch] Context arrays not frozen at runtime — `matchedPath` (from `.map()`) and `rulePathCopy` (from spread `[...]`) are plain mutable arrays despite being typed as `readonly PathSegments`; apply `Object.freeze` and remove the `as unknown as PathSegments` double-cast on `rulePathCopy` [src/core/runtime/redact-value.ts]
- [x] [Review][Patch] `buildSameLengthReplacement` missing zero-length token guard — if `token` is `''` and `targetLength > 0`, division by zero produces `Infinity` and `''.repeat(Infinity)` throws a `RangeError`; add `if (tokenLength === 0) return ''` as a defensive guard [src/core/replacement/apply-redaction.ts]
- [x] [Review][Patch] `RegexPathSegment` removed from ESM consumer type fixture — the type remains exported from `src/index.ts` and is covered in the CJS fixture, but the ESM fixture no longer imports or exercises it; restore it to maintain coverage parity [test/fixtures/consumers/types/index.ts]
- [x] [Review][Defer] Stateful regex matchers in `findMatchingRegexKey` — closed; `getUnsupportedRegexMessage` in `src/core/validation/regex-safety.ts` already rejects `/g` and `/y` key selectors at factory init, making this unreachable through the public API
- [x] [Review][Defer] Inherited key-rule policy overridden by deeper direct-key match when `retainStructure: true` — `selectActivePolicy` blocks inherited path-source policies from being superseded by a `directKeyMatch`, but inherited `exact-key`/`regex-key` source policies have no equivalent protection [src/core/runtime/redact-value.ts] — deferred, pre-existing precedence behaviour (predates Story 2.2)

## Dev Notes

### Story Intent

- Story `2.2` extends the replacement semantics formalised in Story `2.1`. The goal is to make function censors first-class in the v4 public contract and add length-preserving literal string replacement without changing the targeting scope.
- The current v4 runtime already invokes function censors, but only with the matched value. This story must add the public second-argument context and prove it through contract tests.
- The current v4 public configuration does not expose `replaceStringByLength`. This story owns adding it to the root and per-path rule surfaces.
- Root primitive matching remains out of scope. Do not invent a root selector or call function censors for root primitive strings in this story.

### Technical Requirements

- Public censor functions must be synchronous and invoked as `(value, context)`. The redactor must not await function returns or create an async public redaction path.
- The context object must be a fresh, plain object for each function-censor invocation. It must not expose internal parser segment objects, mutable traversal state, or partially redacted output.
- Public context properties must be readonly in the declaration surface. Runtime code must still create fresh context arrays so a hostile or careless censor cannot mutate shared traversal or compiled-plan state through `matchedPath` or `rulePath`.
- `rootInput` must be the exact input reference passed to the redactor call. It must not be cloned, serialised, or replaced with the current subtree.
- `matchedPath` must represent the actual matched target path, not the configured selector pattern. Use root-relative public path segments.
- `rulePath` must identify the configured selector that selected the policy. For path rules this is the configured path rule in public segment form; for exact-key and regex-key rules this is the configured key selector in segment form. If several regex-key selectors match a property, the first matching configured regex-key rule supplies `rulePath`.
- `PathSegments` must stay public-data-only: `string`, `number`, `RegExp`, `IgnorePathSegment`, and explicit public wildcard marker objects such as `{ readonly any: true }` and `{ readonly anyDepth: true }` are allowed; internal `{ kind: ... }` parser records are not.
- `matchedPath` contains only exact `string` and `number` segments in Story `2.2`. Dynamic marker values only appear in `rulePath` when the configured selector used wildcard, recursive wildcard, regex, or ignore semantics.
- `terminalKey` is present for object-property and array-index matches and omitted only if a root match becomes possible in a later story.
- Same-length replacement applies only to literal string censors. Function censors always return their own value as-is, even when `replaceStringByLength: true`.
- Same-length replacement uses the matched value's JavaScript `.length`, not byte length or grapheme length.
- Empty literal censors with active same-length replacement are invalid at initialisation because they cannot be repeated to a non-zero target length.
- `remove: true` with `replaceStringByLength: true` is an invalid effective policy at initialisation. Do not implement it as a runtime precedence rule.
- Function-censor return values are replacement values. Returning `undefined` must not remove an object property or array element.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) as the thin public facade over [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts).
- Keep validation in [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts), immutable plan construction in [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts), whole-value output shaping in [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts), and traversal/orchestration in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts).
- Keep the core browser-safe and free of Node-only APIs.
- Preserve structured output as the default. Function censors and same-length replacement must work before any final `serialise` adapter step.
- Preserve exact-path, dynamic-path, inherited retained path policy, exact-key, and regex-key precedence from Story `2.1`.
- Use the current brownfield repository structure rather than creating the fuller future architecture split from the planning document.

### Current Brownfield Constraints

- [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) currently exposes `Censor = string | ((value: unknown) => unknown)`. Widen it carefully so existing one-argument function censors remain source-compatible.
- [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts) currently exposes only `censor`, `keys`, `paths`, `remove`, `retainStructure`, and `serialise` on `DeepRedactOptions`.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) currently rejects unsupported root/path-rule options. It must be updated before `replaceStringByLength` can be used in tests.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) currently tracks effective inherited defaults for `censor`, `remove`, and `retainStructure`. Extend that effective-default model to include `replaceStringByLength` so inherited `remove + replaceStringByLength` and inherited empty-string same-length conflicts are caught before any redactor is created.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) currently compiles only `censor`, `remove`, and `retainStructure` into the policy. Add `replaceStringByLength` there rather than resolving it repeatedly at runtime.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) currently stores exact-key rule lookup values as booleans and regex-key rules as a matcher array. Change the compiled key-rule shape enough for the runtime to recover configured exact-key and first-matching regex-key rule identity for `rulePath`.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) currently keeps parsed path segments, which are internal records. Add compiled public `rulePath` data alongside internal matcher segments so function context can be built without exposing parser records.
- [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) currently invokes function censors with one argument. This is the narrowest point to add the second context argument and same-length literal handling.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) currently tracks canonical path strings and exact path segments. Reuse that path data to create `matchedPath` rather than reparsing selectors during replacement.
- [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts) currently calls `redactValue(value, plan)`. Pass the same `value` reference through as `rootInput` for every traversal call before any serialisation adapter runs.
- [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) and `src/utils/**` still contain retained v3 `replacement`, `replaceStringByLength`, `blacklistedKeys`, `serialize`, and class-based logic. They are reference material only; do not import or revive them in v4.
- The retained v3 same-length code repeats `replacement.toString()` by the original string length and can produce an overlong value. Do not copy that implementation.
- There is still no `test/security/` tree in the working copy. Story-critical behaviour belongs primarily in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts), with unit coverage added only for plan compilation or validation gaps.

### Source Discovery Results

- Loaded BMAD configuration from [_bmad/bmm/config.yaml](/Users/ben/Code/deep-redact/_bmad/bmm/config.yaml): planning artefacts live in `_bmad-output/planning-artifacts/` and implementation artefacts live in `_bmad-output/implementation-artifacts/`.
- Loaded [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md), [project-context.md](/Users/ben/Code/deep-redact/project-context.md), and the previous story [2-1-apply-literal-replacement-removal-and-retain-structure-handling.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md).
- No UX-specific planning file matching `*ux*.md` exists for this library story.

### Library / Framework Requirements

- Use the current repository baseline from [package.json](/Users/ben/Code/deep-redact/package.json), not older planning examples:
  - `pnpm@10.33.0`
  - Node engine `>=22.18.0`, with contributor verification under [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc) Node `24.14.1`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Keep ESM-first source patterns and explicit `.js` import specifiers in TypeScript source modules.
- Do not spend this story changing tool versions unless a blocker is proven. The story is about runtime semantics, public types, and contract coverage.

### Testing Requirements

- Add failing tests first for the new Story `2.2` behaviours, then implement the narrowest runtime/type changes needed to pass them.
- Use [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) as the main green behavioural suite.
- Use [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts) for policy merge and compiled metadata assertions if contract tests alone make failures hard to diagnose.
- Use [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts) and its consumer fixtures to prove public type exports.
- Add at least one type fixture where a one-argument censor remains assignable and one fixture where a two-argument censor reads `FunctionCensorContext` with readonly `matchedPath`, `rulePath`, and optional `terminalKey`.
- Keep [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts), [test/contract/exports/import.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/import.test.ts), [test/contract/exports/require.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/require.test.ts), and [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts) green.
- `test/unit/**` is not covered by the default `pnpm run test` command unless a file is also included through the contract suite. Run any touched unit test explicitly.

### Implementation Guardrails

- Do not add public root-primitive targeting to satisfy the root-match `terminalKey` case. The context builder can support an empty path internally, but public matching remains scoped to existing object/array targets.
- Do not use function-censor return value `undefined` as an implicit removal mechanism.
- Do not allow `remove: true` with `replaceStringByLength: true`; reject that effective policy during factory validation rather than relying on runtime precedence.
- Do not couple same-length replacement to serialisation or `JSON.stringify`.
- Do not mutate caller-owned input to build function context.
- Do not use internal parser segment objects in public context output.
- Do not share `matchedPath` or `rulePath` array instances between censor invocations or expose compiled-plan arrays directly to user code.
- Do not add new structured wildcard selector input support unless the implementation explicitly chooses to broaden parser support and covers it. The required wildcard marker objects are for context output.
- Do not add asynchronous redaction or Promise unwrapping.
- Do not add substring matching, fuzzy matching, case-insensitive key matching, transformer handling, diagnostics sinks, or console adapters.
- Do not change generated artefacts by hand.

### Previous Story Intelligence

- Story `2.1` confirmed that the current v4 codebase already satisfies literal replacement, removal, and retained-structure semantics once contract coverage is present.
- Story `2.1` established [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) as the current whole-value redaction module and [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) as the traversal/orchestration module. Continue that split.
- Story `2.1` proved key rules have no local override surface in the current public API. Function censors on key matches therefore come from the compiled global policy.
- Story `2.1` preserved the precedence ladder exact path > dynamic path > inherited path policy > exact key > regex key. Function-censor context and same-length handling must not reorder matching.
- Story `2.1` added green contract tests but did not require production-code changes. For Story `2.2`, production changes are expected because the public context and `replaceStringByLength` option do not exist yet.
- Story `1.6` established regex path-segment matching and cloned regex matchers at initialisation. Reuse that clone-at-compile discipline for regex selectors exposed through `rulePath`.
- Story `1.4` established sparse-array-hole preservation. Same-length and function-censor work must not alter sparse-array behaviour.
- Story `1.3` established canonical exact-path matching, prototype-key safety, and non-mutating traversal. Context creation must not weaken those guarantees.
- Sprint status still records Story `1.3` as `review` while later Epic `1` stories and Story `2.1` are marked `done`. Treat the current source tree and green tests as authoritative unless a failing check proves otherwise.

### Recent Git Intelligence

- `65759bf tests(API): censor, retainStructure, and remove coverage` completed Story `2.1` primarily through contract and compiler tests. Follow that proof-first pattern for Story `2.2`.
- `07510e9 fix(epic 1): set status to done` adjusted planning state after Epic `1`; avoid unrelated planning churn.
- `aa1b7bc fix(Node runtime): types should be same major as dev runtime` and `6d83cf3 fix(version): bump to 4.0.0` show that runtime/package baselines have recently been stabilised. Do not churn tool versions.
- `ccbd1b3 feat: match sensitive fields by regex-based path segments` is the latest feature commit touching compiler, validation, runtime, and contract tests across one coherent slice.

### Latest Technical Information

- Reviewed on 3 May 2026.
- The current `fast-redact` README documents function censors as receiving the original value and using the function output as the redacted value, with asynchronous functions unsupported. Deep Redact should remain synchronous but intentionally extend the function-censor call with the public context object. Source: [fast-redact README](https://raw.githubusercontent.com/davidmarkclements/fast-redact/master/readme.md).
- The current `fast-redact` README also documents mutation, serialisation, and restore behaviour as part of its performance model. Deep Redact v4 must not copy that model because the architecture requires one-way redaction, structured output by default, and no restore capability. Source: [fast-redact README](https://raw.githubusercontent.com/davidmarkclements/fast-redact/master/readme.md).
- MDN documents `String.prototype.repeat()` as returning repeated copies of a string and throwing `RangeError` for negative counts or counts that overflow maximum string length. Use a quotient/remainder approach to construct exactly the target output length and avoid avoidable over-allocation before truncation. Source: [MDN String.prototype.repeat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat).
- The TypeScript handbook documents that callbacks with fewer parameters can be assigned where callbacks with more parameters are expected because ignored extra parameters are common in JavaScript. Use this to keep existing one-argument function censors source-compatible while exposing a two-argument public function type. Source: [TypeScript Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility).

### Resolved Scope Decisions

- `replaceStringByLength` is a v4 public option in this story because the epic names it directly and current v4 has no equivalent.
- `replaceStringByLength` is available globally and per path rule. Key rules inherit the compiled global policy because there is no per-key override surface in the current API.
- Empty string literal censors are still allowed when `replaceStringByLength` is not active.
- Function censors remain valid with `replaceStringByLength: true`, but same-length replacement does not apply to their return values.
- `remove: true` with `replaceStringByLength: true` is invalid at factory initialisation, including inherited-default cases.
- Returning `undefined` from a function censor does not remove a property or array item.
- Root primitive redaction remains deferred to Story `2.4`.

### Project Structure Notes

- The real v4 implementation surface is currently `src/core/**`, `src/types/**`, and `test/**`. Prefer extending that structure over creating new top-level modules.
- [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) is the current output-shaping module.
- [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) is the main green behavioural suite.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 2`, `Story 2.2`
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `MVP - Minimum Viable Product`, `FR5`, replacement behaviour requirements
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `API & Communication Patterns`, `Data Models & Schema Changes`, `Quality Gates`
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [2-1-apply-literal-replacement-removal-and-retain-structure-handling.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md)
  - [1-6-match-sensitive-fields-by-regex-based-path-segments.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-6-match-sensitive-fields-by-regex-based-path-segments.md)
  - [1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md)
  - [1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md)
- Current repo files
  - [package.json](/Users/ben/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - [project-context.md](/Users/ben/Code/deep-redact/project-context.md)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
  - [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts)
  - [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts)
- External technical references
  - [fast-redact README](https://raw.githubusercontent.com/davidmarkclements/fast-redact/master/readme.md)
  - [MDN String.prototype.repeat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat)
  - [TypeScript Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility)

## Story Completion Status

Context analysis completed; story is ready for implementation.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-03)

### Debug Log References

None — all tests passed after straightforward implementation.

### Completion Notes List

- Added `PathSegments`, `FunctionCensorContext`, `PublicWildcardSegment`, `PublicRecursiveWildcardSegment` to `src/types/paths.ts`. Updated `Censor` to `string | ((value, ctx: FunctionCensorContext) => unknown)`. One-arg censors remain assignable (TypeScript callback arity compatibility).
- Added `replaceStringByLength?: boolean` to `PathRule` and `DeepRedactOptions`.
- Re-exported all new public types from `src/types/public.ts` and `src/index.ts`.
- Extended `CompiledRedactionPolicy` with `replaceStringByLength: boolean`. Added `rulePath: PathSegments` to `CompiledExactPathRule` and `CompiledDynamicPathRule`. `rulePath` compiled once from parsed selector at initialisation using `toPublicPathSegment` mapper (no internal parser nodes exposed).
- Updated `validateConfig` to accept `replaceStringByLength` as a boolean option at root and path-rule levels. Added validation rejecting `remove + replaceStringByLength` and `empty-string-censor + replaceStringByLength` effective combinations, including inherited-default cases.
- Updated `resolveDirectKeyMatch` to return a `DirectKeyMatchResult` with `source` and `rulePath`. For exact-key matches: `rulePath = [key]`. For regex-key matches: `rulePath = [firstMatchingRegex]` via `matchers.find()`.
- Added `rootInput` to `TraversalContext`. Updated `selectActivePolicy` to carry `rulePath: PathSegments` in `ActivePolicyMatch`. `buildFunctionCensorContext` builds a fresh (non-frozen) context object and fresh mutable arrays per invocation, so censor mutations don't affect subsequent calls or compiled plan state.
- `applyRedaction` updated to accept `FunctionCensorContext` and pass it as the second argument to function censors (`policy.censor.call(undefined, value, context)` — exactly 2 args). `buildSameLengthReplacement` uses quotient+remainder approach (no over-allocation).
- Retained red-phase failures: 7 pre-existing `test/unit/index.test.ts` failures (legacy v3 class tests for `serialize`/`traverse`/`redactorUtils`). Updated `test/unit/core/compiler/compile-redactor-plan.test.ts` unit tests to include `replaceStringByLength: false` and `rulePath` in expected policy shapes.
- 32 new contract tests added covering all ACs. All 130 contract tests pass. Lint and TypeScript noEmit pass.

### File List

- src/types/paths.ts (modified — PathSegments, FunctionCensorContext, PublicWildcardSegment, PublicRecursiveWildcardSegment, updated Censor, replaceStringByLength on PathRule)
- src/types/config.ts (modified — replaceStringByLength on DeepRedactOptions)
- src/types/public.ts (modified — re-export new types)
- src/index.ts (modified — re-export new types)
- src/core/validation/validate-config.ts (modified — replaceStringByLength validation, updated EffectiveRuleDefaults)
- src/core/compiler/compile-redactor-plan.ts (modified — replaceStringByLength in policy, rulePath on path rules, toPublicPathSegment helper)
- src/core/replacement/apply-redaction.ts (modified — FunctionCensorContext param, function censor called with 2 args, same-length replacement)
- src/core/runtime/redact-value.ts (modified — rootInput threading, DirectKeyMatchResult with rulePath, ActivePolicyMatch with rulePath, buildFunctionCensorContext)
- test/contract/api/create-redactor.test.ts (modified — 32 new Story 2.2 tests)
- test/fixtures/consumers/types/index.ts (modified — FunctionCensorContext, PathSegments, replaceStringByLength, one-arg and two-arg censor fixtures)
- test/fixtures/consumers/types-cjs/index.cts (modified — same for CJS consumer)
- test/unit/core/compiler/compile-redactor-plan.test.ts (modified — updated expected policy shapes to include replaceStringByLength: false and rulePath)
