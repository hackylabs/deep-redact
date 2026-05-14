# Story 4.3: Prove Exact-Path Fast Lane and Generic Traversal Are Behaviourally Equivalent

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want exact-path-eligible redaction to produce the same observable result whether executed through the fast lane or the generic traversal lane,
so that performance optimisation never changes redaction semantics.

## Acceptance Criteria

1. Given the contract test harness for this story, when lane equivalence is exercised, then the same compiled policy can be executed through a test-only lane override of `fast` or `generic`, and that override is not exposed through the public factory API or any adapter entrypoint.
2. Given a control execution for a corpus fixture, when the fixture is run without the test-only override, then the harness can verify whether the normal runtime selected the fast lane or the generic lane for that fixture.
3. Given a fixture is admitted to the exact-path equivalence corpus, when its configuration is reviewed, then every targeted selector in that fixture compiles to an exact static absolute path eligible for the fast lane.
4. Given a fixture is admitted to the exact-path equivalence corpus, when its selector and matching surface are reviewed, then it excludes structured selectors, wildcard segments, recursive wildcards, ignore segments, regex path segments, key-only targeting, and substring-only targeting as the primary trigger for the asserted redaction outcome.
5. Given a fixture is admitted to the exact-path equivalence corpus, when it is recorded in the corpus manifest, then the manifest includes the fixture name, the exact-path eligibility reason, the configuration, the golden expected structured output, and where relevant the golden expected serialised output.
6. Given a named corpus fixture with `serialise: false`, when it is executed once through the forced `fast` lane and once through the forced `generic` lane, then the two structured outputs are deeply equal to each other and both are deeply equal to that fixture's golden expected structured output.
7. Given a named corpus fixture with `serialise: true`, when it is executed once through the forced `fast` lane and once through the forced `generic` lane, then the two returned strings are byte-for-byte identical to each other and both match that fixture's golden expected serialised output exactly.
8. Given a named corpus fixture uses a deterministic custom serialiser, when it is executed through both forced lanes, then the custom-serialised output is byte-for-byte identical across lanes and matches that fixture's golden expected serialised output exactly.

## Tasks / Subtasks

- [x] Design and implement the test-only lane override mechanism (AC: 1, 2)
  - [x] The "fast lane" for a compiled plan is already the O(1) lookup in `plan.exactPathRules`. For an exact-path-eligible config, `plan.dynamicPathRules` is always empty — confirmed by inspecting the result of `compileRedactorPlan(options)` in [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:195). No runtime changes to `redact-value.ts` are required for the fast-lane half.
  - [x] For the "generic" forced lane: create a helper `createGenericisedPlan(plan: CompiledRedactorPlan): CompiledRedactorPlan` in `test/fixtures/exact-path-equivalence/index.ts`. This helper creates a modified plan where `exactPathRules` is replaced with an empty lookup table and each `CompiledExactPathRule` from the original plan is converted into a `CompiledDynamicPathRule` using its already-compiled `segments` (which are of type `ExactPathSegment`, a valid subset of `PathSegment`) and appended to the existing `dynamicPathRules`. Since `matchesDynamicRule` in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:455) handles literal property and index segments natively, no changes to the runtime are required.
  - [x] Export `createLaneForcedRedactor(options: DeepRedactOptions, lane: 'fast' | 'generic'): (value: unknown) => unknown` from `test/fixtures/exact-path-equivalence/index.ts`. The `'fast'` variant calls `compileRedactorPlan(options)` directly and wraps the result with `redactValue` + serialisation. The `'generic'` variant calls `createGenericisedPlan(compileRedactorPlan(options))` before wrapping. Neither path goes through `deepRedact()` or `createRedactor()`, so neither lane override is exposed through any public factory API.
  - [x] The "normal runtime selected the fast lane" assertion: for exact-path-eligible configs, assert `Object.keys(plan.exactPathRules).length > 0` and `plan.dynamicPathRules.length === 0` to confirm normal execution exclusively uses fast-lane lookups, not dynamic traversal. Record this as a control assertion per corpus fixture.

- [x] Design and build the exact-path equivalence corpus (AC: 3, 4, 5)
  - [x] Create `test/fixtures/exact-path-equivalence/index.ts` as the corpus home, mirroring the fixture-set pattern from [test/fixtures/structured-determinism/index.ts](/Users/ben/Code/deep-redact/test/fixtures/structured-determinism/index.ts:1). Export a `exactPathEquivalenceCorpus` array of corpus entries, each carrying: `name`, `title`, `exactPathEligibilityReason`, `options: DeepRedactOptions`, `payload`, `expectedStructured`, `expectedSerialised`, and optionally `expectedCustomSerialised`.
  - [x] Corpus must contain at minimum these named fixtures:
    - `single-exact-path`: one exact path `user.password` with default censor, proving basic fast-lane match [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:133)]
    - `multiple-exact-paths`: two exact paths `user.password` and `session.token`, proving independent fast-lane matches
    - `exact-path-array-index`: path with array index `users.0.email`, proving numeric index segment matching
    - `exact-path-custom-censor`: exact path with literal string censor override, proving per-path censor policy is preserved across lanes
    - `exact-path-function-censor`: exact path with a function censor, proving the `FunctionCensorContext` fields are identical across lanes (matched path, rule path, root input)
    - `exact-path-retain-structure`: exact path with `retainStructure: true`, proving descendant traversal continues identically in both lanes
    - `exact-path-remove`: exact path with `remove: true`, proving property removal is equivalent across lanes
    - `exact-path-multiple-policies`: two exact paths with different per-path censor values, proving policy isolation
  - [x] Each corpus entry must include a committed hardcoded canary golden serialised string to guard against property-order regressions (following the `SERIALISED_*_CANARY` pattern established in [test/fixtures/structured-determinism/index.ts](/Users/ben/Code/deep-redact/test/fixtures/structured-determinism/index.ts:66)).
  - [x] For object/array payloads in the corpus, follow the deferred note from Story 4.2: protect `payload` and `expected` from shared reference contamination across multiple `createRun()` calls by ensuring each call creates a fresh payload copy (using `structuredClone` for plain objects, or a factory function for fixtures with non-clonable values). [Source: [4-2-return-deterministic-serialised-output-across-repeated-runs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/4-2-return-deterministic-serialised-output-across-repeated-runs.md:212)]

- [x] Add the equivalence contract tests (AC: 1, 2, 3, 6, 7, 8)
  - [x] Add a `describe('Exact-path fast-lane and generic traversal equivalence', ...)` block in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:4192) (after the current last `describe` block).
  - [x] For each corpus entry, run three variants in the same `it` block: (a) control — assert lane selection via `Object.keys(plan.exactPathRules).length > 0` and `plan.dynamicPathRules.length === 0`; (b) fast-lane run — compare structured output with `expect(...).toStrictEqual(expectedStructured)` and serialised output with `expect(...).toBe(expectedSerialised)`; (c) generic-lane run — compare the same outputs against the same golden values and additionally assert `expect(fastStructured).toStrictEqual(genericStructured)` (deep equality) and `expect(fastSerialised).toBe(genericSerialised)` (byte equality).
  - [x] For the function-censor fixture, capture the `FunctionCensorContext` argument inside the censor spy for both lanes and assert both contexts are deeply equal (same `matchedPath`, `rulePath`, `rootInput`, `terminalKey`), proving the context delivery contract is lane-invariant.
  - [x] For the custom-serialiser fixture, assert byte-for-byte equality of the custom-serialised output across lanes (AC: 8).
  - [x] Do not reduce the equivalence proof to snapshot text alone or reparsed object comparison. The final serialised assertion must be a direct string equality check.

- [x] Keep repository layout and scope boundaries intact (AC: 1, 6, 7, 8)
  - [x] All new fixture and corpus code goes in `test/fixtures/exact-path-equivalence/index.ts` — do NOT add it to [test/fixtures/structured-determinism/index.ts](/Users/ben/Code/deep-redact/test/fixtures/structured-determinism/index.ts:1) (keep the two corpora separate to avoid scope creep).
  - [x] Do NOT modify any file under `src/` for this story unless a test run reveals a genuine determinism gap. The lane-override mechanism is entirely in the test-fixture layer.
  - [x] Keep precedence publication, restore-surface denial, and console-adapter work out of scope. Those belong to Stories `4.4`, `4.5`, and `4.6`. [Source: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1139), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1190), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1233)]
  - [x] The repeated-run determinism corpus from Stories `4.1` and `4.2` must remain unchanged; run it after implementation to confirm no regressions.

## Dev Notes

### Technical Requirements

- Story `4.3` implements FR19's lane-equivalence proof only. Repeated-run determinism remains Stories `4.1` and `4.2`. Precedence explanation remains Story `4.4`. Restore exclusion remains Story `4.5`. Console adapter behaviour remains Story `4.6`. [Source: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1085), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1139)]
- The "fast lane" is the O(1) `exactPathRules` lookup. In [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:208), a compiled path rule goes into `exactPathRules` when it has no dynamic segments (no wildcards, no regex, no ignore segments). It goes into `dynamicPathRules` otherwise. For an exact-path-eligible config, `plan.dynamicPathRules` is always empty. [Source: [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:176)]
- The "generic lane" is the iterative `resolveDynamicPathRule` check in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:485). The `matchesDynamicRule` function at [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:455) handles literal property and index segments natively (see the `selectorSegment.kind === 'property'` and `selectorSegment.kind === 'index'` branches at lines 449–452), so exact path rule segments can be used directly as dynamic path rule segments without conversion.
- The lane-override mechanism requires NO changes to `src/`. The test helper creates a modified `CompiledRedactorPlan` by calling `compileRedactorPlan` directly (which is already exported at [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:317)) and then patching the plan: clear `exactPathRules`, append each `CompiledExactPathRule.segments` to a new `CompiledDynamicPathRule` list alongside the original `dynamicPathRules`. The patched plan is then passed directly to the already-exported `redactValue` at [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425).
- `CompiledExactPathRule.segments` is of type `readonly ExactPathSegment[]`. `ExactPathSegment` can only be `{ kind: 'property', value: string }` or `{ kind: 'index', value: number }`. These are structurally compatible with `PathSegment` (they are valid subtypes), so they can be used directly in a `CompiledDynamicPathRule.segments` array without conversion. [Source: [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts:1)]
- The `applySerialisation` function in [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:11) is not exported. The test helper should either inline the three-branch logic (`serialise === true ? JSON.stringify(value) : typeof serialise === 'function' ? serialise(value) : value`) or call `redactValue` without serialisation and apply it separately when constructing test assertions.
- `compileRedactorPlan` is already exported from [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:317) and is imported by `create-redactor.ts`. `redactValue` is already exported from [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425). The test fixture can import both directly.

### Architecture Compliance

- Do not add a `_testOnlyLaneOverride` flag to `CompiledRedactorPlan` or `DeepRedactOptions`. The lane-override mechanism must live entirely in the test-fixture layer, not in the production type surface. The override is the test helper creating a modified plan, not a runtime flag. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:138), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:546)]
- The deterministic security contract applies to both lanes equally. No corpus fixture may pass only because the lanes happen to produce the same broken output. Each fixture must have a committed golden expected value that is independently verified against the structured and serialised outputs of both lanes. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:138)]
- Keep the function-first API untouched. `deepRedact` and `createRedactor` are not used by the lane-override helper. The test helper calls internal modules directly. This is intentional and correct. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:133)]
- The architecture explicitly requires that "a golden corpus must prove that the exact-path fast lane and the generic fallback are behaviourally equivalent for the same supported inputs and configurations." Story `4.3` is the direct implementation of this requirement. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:395)]

### Library and Framework Requirements

- The live contributor baseline is Node `24.14.1` from [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1) with `pnpm@10.33.0`, `tsdown@0.21.7`, `TypeScript 6.0.2`, and `Vitest 4.1.4` from [package.json](/Users/ben/Code/deep-redact/package.json:10), [package.json](/Users/ben/Code/deep-redact/package.json:13), [package.json](/Users/ben/Code/deep-redact/package.json:87), [package.json](/Users/ben/Code/deep-redact/package.json:88).
- The repository lint gate is ESLint plus `tsc --noEmit`, not `xo`. Follow the live scripts in [package.json](/Users/ben/Code/deep-redact/package.json:64) even though older planning artefacts still mention `xo`.
- `compileRedactorPlan` is an internal export. When the test helper imports it directly, TypeScript will type-check against `CompiledRedactorPlan`. The patch to produce a "genericised" plan must satisfy the `CompiledRedactorPlan` interface — use `Object.freeze` consistently as the original compiler does.

### File Structure Requirements

- New fixture corpus: `test/fixtures/exact-path-equivalence/index.ts` (create new file)
- Runtime seams (read-only reference for the fixture helper):
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:89) — `CompiledRedactorPlan`, `CompiledExactPathRule`, `CompiledDynamicPathRule` type shapes
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:317) — `compileRedactorPlan` export
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425) — `redactValue` export
  - [src/core/matching/path-parser.ts](/Users/ben/Code/deep-redact/src/core/matching/path-parser.ts:1) — `ExactPathSegment` type (to understand the segments shape)
- Contract test target: [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:4192) — add new `describe` block at the end
- Do NOT touch:
  - [test/fixtures/structured-determinism/index.ts](/Users/ben/Code/deep-redact/test/fixtures/structured-determinism/index.ts:1) — keep structured and serialised determinism corpus unchanged
  - Any file under `src/` unless a test run reveals a genuine runtime gap

### Testing Requirements

- Run the focused equivalence slice while iterating:
  - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Exact-path fast-lane and generic traversal equivalence"`
- After implementation, re-run the structured and serialised determinism corpora to ensure no regressions:
  - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Structured determinism fixture corpus|Serialised determinism fixture corpus"`
- Run the declaration contract only if public typing or callback expectations change:
  - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/types/declarations.test.ts`
- Run the normal contract gate after implementation:
  - `source .agents/initialise-env.sh && pnpm run test:contract`
- If `src/` files change, run the broader repository gate:
  - `source .agents/initialise-env.sh && pnpm run test`
- If type or validation files change, run the current lint gate:
  - `source .agents/initialise-env.sh && pnpm run lint`
- Use `toStrictEqual` for structured output (deep equality including `undefined` properties), `toBe` for serialised strings (exact byte equality). Do NOT use snapshot text alone or reparsed object comparison as proof.
- For the function-censor fixture, use a `vi.fn()` spy to capture the `FunctionCensorContext` argument in both fast and generic lanes, then assert the captured contexts are deeply equal.

### Previous Story Intelligence

- Story `4.1` created the structured determinism corpus (`structuredDeterminismFixtureSets`) and its reusable harness. Story `4.3` creates a SEPARATE exact-path equivalence corpus — do not extend the structured-determinism fixture file. [Source: [4-1-return-deterministic-structured-output-across-repeated-runs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/4-1-return-deterministic-structured-output-across-repeated-runs.md:1)]
- Story `4.2` added `serialisedDeterminismFixtureSets` and the `Serialised determinism fixture corpus` describe block. Story `4.3` adds a further independent corpus (`exactPathEquivalenceCorpus`) and its own describe block. [Source: [4-2-return-deterministic-serialised-output-across-repeated-runs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/4-2-return-deterministic-serialised-output-across-repeated-runs.md:44)]
- Story `4.2` deferred a fix for `createSerialisedRootFixture` sharing payload references: "safe while all payloads are primitives. Revisit in Story 4.3 or whenever a fixture adds a non-primitive (object/array) payload." The exact-path equivalence corpus WILL have object payloads, so apply the deferred fix: ensure each `createRun()` call produces a fresh payload via `structuredClone` or a factory function — do NOT share object references across runs. [Source: [4-2-return-deterministic-serialised-output-across-repeated-runs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/4-2-return-deterministic-serialised-output-across-repeated-runs.md:212)]
- Story `4.2` also deferred a note about `failingMapMarker` Symbol across worker boundaries. If Story `4.3` uses `--pool=forks` Vitest configuration or worker-serialising payloads, replace any Symbol-keyed markers with `WeakSet` or a named class predicate. This story's equivalence corpus should use only plain object and array payloads, so this deferred item does not apply here. [Source: [4-2-return-deterministic-serialised-output-across-repeated-runs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/4-2-return-deterministic-serialised-output-across-repeated-runs.md:215)]
- Story `2.5` (precedence) and Story `3.1` (canonical nested mixed payload) established that exact path rules take the highest precedence and are matched via O(1) table lookup at `plan.exactPathRules[canonicalPath]`. Story `4.3`'s corpus must NOT include any wildcard, regex-key, or substring selectors as the primary trigger for the asserted outcome. [Source: [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md:1)]

### Recent Git Intelligence

- `68aa0cb fix(story 1.3): incorrect status` — most recent commit, so the repo is clean and the working state is post-Story-4.2 implementation. No in-progress stale state to account for.
- `7dbc5ca tests(output): deterministic structured output across repeated runs` and `5ba7365 tests(deterministic structured output across repeated runs)` — both Stories `4.2` and `4.1` have landed. Story `4.3` starts from a clean, post-4.2 baseline.
- `b4213be chore(linting): use eslint in place of XO` — ESLint is the live lint gate, not `xo`. Do not reference `xo` in any new scripts or config.
- `a3e37c1 chore(agents): optimise agent initialisation with correct environment toolchain` — every Node, pnpm, test, build, lint, or generation command must be prefixed with `source .agents/initialise-env.sh`.

### Latest Technical Information

- Checked on **14 May 2026** against the local repository baseline.
- The contributor baseline remains Node `24.14.1` from [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1), with `pnpm@10.33.0`, `TypeScript 6.0.2`, and `Vitest 4.1.4`. The published engine floor remains `>=22.18.0` in [package.json](/Users/ben/Code/deep-redact/package.json:16).
- `matchesDynamicRule` handles literal property and index path segments in the same function as wildcard and regex segments. Exact path rule segments (`ExactPathSegment`, which are strictly `{ kind: 'property' | 'index', value: string | number }`) are valid inputs to `matchesDynamicRule`. No conversion is needed; they can be cast to `PathSegment` directly because `ExactPathSegment` is structurally a strict subtype.
- TypeScript `6.0` `--stableTypeOrdering` affects declaration-emission stability, not runtime output ordering. Story `4.3`'s byte-stability contract is about runtime serialised bytes, not TypeScript declaration output.
- Vitest `4` still requires Node `>=20`; the repo's Node `24.14.1` pin remains compatible with the focused contract runs planned for this story.
- The planning artefacts still describe `xo` as the lint baseline in [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:114) and [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:367). Follow the live `eslint` gate from [package.json](/Users/ben/Code/deep-redact/package.json:64) instead.

### Open Questions / Assumptions

- Assume the "test-only lane override" is fully implemented in the test-fixture layer (not in `src/`) via a modified `CompiledRedactorPlan`. This satisfies "not exposed through the public factory API" without requiring any type-surface changes.
- Assume the exact-path equivalence corpus does not need to cover transformed runtime values (BigInt, Date, etc.), circular references, or `[UNSUPPORTED]` degradation as the primary redaction trigger — those are already covered by the serialised determinism corpus from Story `4.2`. The corpus focuses on plain object/array payloads with exact path rules as the sole targeting mechanism.
- Assume `compileRedactorPlan` and `redactValue` can be imported directly from their internal modules by the test fixture. This is already established by Story `4.2`'s fixture helper accessing `deepRedact` from `src/index.ts`, and the test contract files already import from internal paths. The equivalence test fixture will import from `src/core/compiler/compile-redactor-plan.ts` and `src/core/runtime/redact-value.ts` directly.
- Assume the `CompiledRedactorPlan` object is shaped such that a test helper can create a valid patched plan by spreading the original plan and replacing `exactPathRules` and `dynamicPathRules`. All fields are `readonly` but a new object can be constructed with the same structure.
- Assume the `retainStructure: true` corpus fixture does NOT need to mix key-only or substring rules as the primary trigger — but the exact path rule with `retainStructure` will cause traversal into descendants, and those descendants may match other exact paths. This is still exact-path-eligible because ALL path-based targeting uses exact path rules only.
- Assume `remove: true` corpus fixture output does not include the removed property in either lane (both produce structurally equivalent result, potentially `undefined` or omitted). The test assertion should use `toStrictEqual` (which treats missing keys and `undefined` values differently) to capture this precisely.

### Project Context Reference

- All code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:3).
- Planning artefacts must remain under `_bmad-output/**`, not `docs/`. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:16).
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:22).
- Every Node, package-manager, build, lint, test, generation, benchmark, or release command must be bootstrapped with `source .agents/initialise-env.sh`. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:9).

### Project Structure Notes

- The active implementation surface for this story is `test/` only. No `src/` changes are anticipated.
- New corpus home: `test/fixtures/exact-path-equivalence/index.ts` (new file, following the `test/fixtures/structured-determinism/index.ts` pattern).
- The existing equivalence test area in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:4192) receives a new `describe` block appended at the end.
- No UX artefact exists for this story. The work is runtime-contract proof and corpus design only.

### References

- Story definition: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1085)
- Epic `4` scope boundaries: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1085), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1139), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1190), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1233)
- Architecture contract: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:133), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:138), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:186), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:395)
- Fast-lane vs generic-lane runtime implementation: [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:407), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:455), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:485), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:492)
- Exact vs dynamic path compilation: [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:167), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:195), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:208)
- Exported runtime and compiler seams: [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:317), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425)
- Previous determinism corpus: [test/fixtures/structured-determinism/index.ts](/Users/ben/Code/deep-redact/test/fixtures/structured-determinism/index.ts:949), [test/fixtures/structured-determinism/index.ts](/Users/ben/Code/deep-redact/test/fixtures/structured-determinism/index.ts:1037)
- Serialised determinism tests: [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3570)
- Story `4.2` deferred items relevant to this story: [4-2-return-deterministic-serialised-output-across-repeated-runs.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/4-2-return-deterministic-serialised-output-across-repeated-runs.md:212)

## Dev Agent Record

### Completion Notes

Implemented Story 4.3 entirely within the test-fixture layer — no `src/` files were modified.

**Lane-override mechanism** (`createGenericisedPlan`, `createLaneForcedRedactor`): lives in `test/fixtures/exact-path-equivalence/index.ts`. The genericised plan clears `exactPathRules` and appends each converted rule to `dynamicPathRules`, casting `ExactPathSegment[]` to `PathSegment[]` (structurally valid subtype). The forced-fast variant skips the conversion entirely. Neither path goes through `deepRedact()` or `createRedactor()`.

**Corpus** (8 named fixtures): covers default censor, multiple simultaneous paths, numeric array-index segments, literal string censor, function censor with deterministic output, `retainStructure: true`, `remove: true`, and per-path censor isolation. Each fixture uses a `createPayload` factory to prevent shared reference contamination. Hardcoded `SERIALISED_*_CANARY` constants guard against property-order regressions.

**Contract tests** (10 new `it` blocks in `test/contract/api/create-redactor.test.ts`):
- 8 `it.each` cases (one per corpus entry) running control + fast-lane + generic-lane assertions
- 1 `it` for `FunctionCensorContext` context-capture equality across lanes
- 1 `it` for custom-serialiser byte-equality across lanes

All 320 contract tests pass; lint (ESLint + `tsc --noEmit`) is clean.

## File List

- `test/fixtures/exact-path-equivalence/index.ts` (created)
- `test/contract/api/create-redactor.test.ts` (modified — new imports and `describe` block appended)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status updated)

### Review Findings

- [x] [Review][Decision] AC 6/7 serialise path not exercised — resolved: extracted `createLaneForcedRedactorFromPlan` with inline serialise logic; added `serialise: true` test (AC 7)
- [x] [Review][Patch] Non-null assertions on corpus lookups will produce opaque `TypeError` if entry is renamed — add `expect(functionCensorEntry).toBeDefined()` and `expect(entry).toBeDefined()` before `!` dereferences [test/contract/api/create-redactor.test.ts]
- [x] [Review][Patch] `createLaneForcedRedactor` calls `compileRedactorPlan` once per lane — fast and generic lanes are not derived from the same compiled plan object, which could mask non-deterministic compilation [test/fixtures/exact-path-equivalence/index.ts]
- [x] [Review][Patch] Control assertion `Object.keys(plan.exactPathRules).length > 0` is weaker than asserting the specific canonical path key is present — strengthened to `toBe((entry.options.paths ?? []).length)` [test/contract/api/create-redactor.test.ts]
- [x] [Review][Patch] `FunctionCensorContext` test only asserts cross-lane structural equality — individual field assertions against golden values (`matchedPath`, `rulePath`, `rootInput`, `terminalKey`) are absent; a bug corrupting both lanes identically would pass [test/contract/api/create-redactor.test.ts]
- [x] [Review][Defer] `signature` field on converted dynamic rule uses `canonicalPath` string rather than a `renderSelectorSignature`-produced value — semantically imprecise but no runtime impact for current corpus [test/fixtures/exact-path-equivalence/index.ts:22] — deferred, pre-existing
- [x] [Review][Defer] No corpus entry for bracket-quoted or special-character property keys — equivalence proof incomplete for paths whose canonical representation differs from dot-notation — deferred, pre-existing
- [x] [Review][Defer] `retainStructure` alias-replay caching behaviour not exercised across lanes — `createPayload` creates fresh objects so no shared-identity alias is ever replayed — deferred, pre-existing
- [x] [Review][Defer] No corpus entry for non-string primitive leaf values (number, boolean, null) under an exact path — deferred, pre-existing
- [x] [Review][Defer] No corpus entry for a path that is absent from the payload — silent no-op divergence between lanes would go undetected — deferred, pre-existing
- [x] [Review][Defer] No corpus entry for `replaceStringByLength: true` policy — deferred, pre-existing
- [x] [Review][Defer] Converted-rule ordering in `createGenericisedPlan` appends after pre-existing `dynamicPathRules`; relies on the `dynamicPathRules.length === 0` invariant enforced by the control assertion — deferred, pre-existing

## Change Log

- 2026-05-14: Implemented Story 4.3 — exact-path fast-lane and generic traversal equivalence corpus and contract tests
- 2026-05-14: Code review complete — 1 decision needed, 4 patches, 7 deferred, 7 dismissed
