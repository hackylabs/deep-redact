# Story 8.6: Integrate Substring Matching and Finalise Rule-Driven Engine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a backend engineer,
I want substring matching to integrate cleanly with the rule-driven engine and the traversal mode boundary to be explicitly documented and enforced,
so that the rule-driven engine is feature-complete across all supported targeting modes.

## Context

Epic 8 replaces the old full-payload walk for path-driven configurations with a rule-driven engine. Stories 8.2 and 8.4 already cover the efficient lane for exact paths and safe single-level wildcard (`*`) paths. Story 8.5 pinned recursive wildcard (`**`) paths and key-based rules as `pathDrivenOnly: false` cases that use the generic `O(N)` traversal. Story 8.6 completes that boundary by making substring matching explicit: any configuration with `stringTests` must use the generic traversal because it must inspect string values across the payload.

This should be a focused proof and documentation finalisation story, not a rewrite. The current compiler already excludes substring rules from the rule-driven lane: `compileRedactorPlan` builds `substringRules` and requires `substringRules.length === 0` for `pathDrivenOnly: true` ([compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts#L308), [compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts#L355-L362)). The public redactor uses `buildPathDrivenExecutor` only when `plan.pathDrivenOnly` is true; otherwise it calls `redactValue` directly ([create-redactor.ts](src/core/create-redactor.ts#L20-L22)). Under `serialise: true` or a custom `serialise` function, public routing intentionally uses the generic traversal first regardless of plan shape so the serialise adapter receives cycle-registration context ([create-redactor.ts](src/core/create-redactor.ts#L24-L37)).

Substring behaviour already lives in the generic traversal. `redact-value.ts` clones substring regexes for matcher context, tests string values only, applies the first matching substring rule in configuration order, handles root primitive strings specially, and runs substring handling after path/key/retain policy selection ([redact-value.ts](src/core/runtime/redact-value.ts#L625), [redact-value.ts](src/core/runtime/redact-value.ts#L677-L689), [redact-value.ts](src/core/runtime/redact-value.ts#L699), [redact-value.ts](src/core/runtime/redact-value.ts#L1236-L1260)). Existing contract tests cover much of this behaviour in the "Substring rule redaction", "Root primitive string redaction", and "Precedence across path, key, and substring targeting" sections ([create-redactor.test.ts](test/contract/api/create-redactor.test.ts#L688), [create-redactor.test.ts](test/contract/api/create-redactor.test.ts#L1007), [create-redactor.test.ts](test/contract/api/create-redactor.test.ts#L1158)).

The documentation still says substring boundary finalisation remains Story 8.6 scope. This story must update that wording to the final state: `pathDrivenOnly: true` is exact paths and/or safe single-level `*` paths only; every other configuration, including substring tests, uses the generic traversal ([rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md#L127), [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md#L147)).

**Environment bootstrap:** before any Node.js, package-manager, build, lint, test, generation, benchmark, or release command, run `source .agents/initialise-env.sh` from the repository root. Treat bootstrap failure as a blocker. The repository pins Node `24.14.1` and `pnpm@10.33.0`.

**Pinned toolchain:** use the project pins in [package.json](package.json): Node `24.14.1`, `pnpm@10.33.0`, `vitest 4.1.4`, `typescript 6.0.2`, and `tsdown 0.21.7`. Do not mix dependency upgrades into this story.

**British English** throughout prose, comments, and documentation. Keep API identifiers unchanged (`pathDrivenOnly`, `stringTests`, `caseSensitiveKeyMatch`, `fuzzyKeyMatch`, `serialise`, etc.). Use `.js` import extensions in TypeScript source.

## Acceptance Criteria

**Substring traversal mode**

1. **Given** any configuration containing `stringTests`, including bare `RegExp` entries and structured `{ pattern, replacer }` entries
   **When** the plan is compiled
   **Then** `pathDrivenOnly: false` is set
   **And** the public redactor uses the generic `O(N)` traversal for structured output (`serialise` omitted or `false`)
   **And** `serialise: true` or a custom `serialise` function still runs the generic traversal before the serialise output adapter, preserving the Story 8.3 serialise contract.

2. **Given** an otherwise rule-driven-safe path configuration containing only exact paths and/or safe single-level `*` paths
   **When** a `stringTests` entry is added
   **Then** `pathDrivenOnly: false` is set
   **And** the configuration does not enter the rule-driven trie in [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts).

**Substring behaviour in the generic traversal**

3. **Given** a `pathDrivenOnly: false` configuration containing substring tests
   **When** the generic traversal processes nested objects, arrays, sparse arrays, and root primitive strings
   **Then** existing substring semantics are preserved: nested object and array string leaves use bare `RegExp` rules for whole-value redaction/removal and structured substring rules for replacer-based rewrites; root primitive strings use whole-value censor/removal for any matching substring rule and never invoke structured replacers; the first matching substring rule wins; unmatched strings and non-string values are unchanged; caller-owned `RegExp.lastIndex` is not mutated; sparse-array holes are preserved; and root primitive strings return raw structured output when `serialise: false`.

4. **Given** path rules, inherited retain policies, key rules, regex key rules, and substring rules can all match the same or neighbouring leaves
   **When** the payload is redacted
   **Then** precedence remains unchanged: exact path > structured dynamic path > inherited path/key policy > exact key > regex key > substring
   **And** substring replacers are not invoked for leaves already selected by a higher-precedence path/key/retain policy.

**Final boundary documentation**

5. **Given** the finalised rule-driven engine contract
   **When** [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) is reviewed
   **Then** it documents the final traversal mode boundary:
   - `pathDrivenOnly: true` when the configuration contains at least one path rule, every dynamic path rule is single-wildcard-only, there is no unsafe wildcard-depth overlap between path rules, there are no `**`, regex, or ignore path segments, there are no key or regex-key rules, there are no `stringTests`, `fuzzyKeyMatch` is false or unset, and `caseSensitiveKeyMatch` is true or unset.
   - `pathDrivenOnly: false` for every other configuration, including any substring rule.
   **And** all "left to Story 8.6" substring wording is replaced with final-state wording
   **And** the runtime-delegation distinction is preserved: `pathDrivenOnly: true` selects the rule-driven executor at compile time, while non-plain prototypes, wildcard-depth non-plain containers, and hostile accessors can still delegate a payload to the generic traversal at call time
   **And** the document cross-references the serialise output contract: runtime-value transformation and circular neutralisation are output-stage behaviour gated by `serialise: true`, not a reason to choose substring, key, or `**` rules.

**Final equivalence verification**

6. **Given** a representative substring-only config and representative mixed exact path + single-level wildcard + substring configs
   **When** public structured output is compared with `redactValue(payload, compileRedactorPlan(options))`
   **Then** outputs are identical
   **And** each proof asserts `compileRedactorPlan(options).pathDrivenOnly === false`.

7. **Given** the complete rule-driven engine after Stories 8.2-8.6
   **When** the Story 7.2 exact-path equivalence corpus, the Story 8.1 rule-driven contract tests, the Story 8.4 wildcard equivalence tests, and the Story 8.5 boundary tests run
   **Then** all tests pass
   **And** no output behaviour change is introduced by this story beyond the prior Story 8.2 / 8.3 contract changes.

**Safety limit integration**

8. **Given** `pathDrivenOnly: false` substring configurations
   **When** payload depth or visited-node count exceeds `maxDepth` or `maxNodes`
   **Then** `BudgetExceededError` is thrown with code `'BUDGET_EXCEEDED'`, matching Story 7.4's generic traversal contract
   **And** the error is not degraded to `[UNSUPPORTED]`.

9. **Given** `pathDrivenOnly: true` exact and wildcard configurations
   **When** wildcard enumeration, retained-subtree descent, or another rule-driven traversal operation that already participates in the rule-driven safety budget exceeds that budget
   **Then** `BudgetExceededError` is thrown with code `'BUDGET_EXCEEDED'`
   **And** the documented cost-model nuance is preserved: rule-driven `maxNodes` accounting follows the rule-driven cost surface (`O(P)` / `O(P + sum K)`) rather than forcing identical generic-traversal node totals.

**Scope guard**

10. **Given** this story's scope
    **When** the implementation is reviewed
    **Then** it covers substring traversal-mode routing, public-vs-generic oracle proof, final boundary documentation, final equivalence verification, and safety-limit confirmation only
    **And** no new targeting modes, output marker shapes, serialise adapter behaviour, dependency versions, generated migration/example artefacts, benchmark thresholds, recursive-wildcard trie edges, key-rule trie lookup, or broad budget redesign are introduced.

## Tasks / Subtasks

- [x] **Task 1 - Pin substring mode selection in compiler tests** (ACs: 1, 2)
  - [x] Extend the `pathDrivenOnly traversal-mode boundary` table in [test/unit/core/compiler/compile-redactor-plan.test.ts](test/unit/core/compiler/compile-redactor-plan.test.ts) with explicit substring cases: bare `RegExp`, structured `{ pattern, replacer }`, exact path + substring, safe single-level wildcard + substring, and mixed exact + wildcard + substring.
  - [x] Assert each case compiles `pathDrivenOnly: false`.
  - [x] Preserve the existing positive cases for exact paths, safe single-level `*` paths, and safe mixed exact + `*` paths. Substring coverage must not make the rule-driven-safe table less strict.
  - [x] Only edit [compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts) if a new test exposes a real classifier regression. Expected current behaviour: no source change is needed because `substringRules.length === 0` is already part of the `pathDrivenOnly` predicate.

- [x] **Task 2 - Add public-vs-generic substring oracle guards** (ACs: 3, 4, 6)
  - [x] Reuse the local `expectStructuredPublicOutputToMatchGenericTraversal` helper in [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts#L245), or move it only if that improves local clarity without broad refactoring.
  - [x] Add a Story 8.6 section covering at least:
    - substring-only bare `RegExp` config over nested object and array string leaves;
    - structured substring replacer config over nested object and array string leaves;
    - exact path + safe single-level wildcard + substring config where path/wildcard targets redact first and unrelated strings rewrite through substring;
    - a config where a substring rule disqualifies an otherwise `pathDrivenOnly: true` safe wildcard plan.
  - [x] Assert every oracle case has `pathDrivenOnly: false` and that public structured output equals `redactValue(payload, compileRedactorPlan(options))`.
  - [x] Avoid spy-based substring replacers or function censors in public-vs-generic oracle tests unless the doubled invocation count is intentional: the helper runs the public redactor and the generic oracle separately. Keep exact call-count assertions in separate single-lane tests.
  - [x] Do not call `buildPathDrivenExecutor` for substring configs. Their contract is that they never enter the trie.

- [x] **Task 3 - Preserve substring behaviour and precedence contract** (ACs: 3, 4)
  - [x] Review the existing "Substring rule redaction", "Root primitive string redaction", and "Precedence across path, key, and substring targeting" sections before adding tests. Prefer focused gaps over duplicate assertions.
  - [x] Ensure coverage still proves bare whole-value redaction/removal, structured replacer partial rewrites, first-matching-rule order, root primitive behaviour, function-censor context for bare substring rules, sparse-array hole preservation, and `RegExp.lastIndex` isolation.
  - [x] Add a focused mixed-mode regression only if needed to connect those existing behaviours to the final traversal boundary. The expected implementation should not alter `applySubstringRule`, `applyRootPrimitiveSubstringMatch`, or `transformSubstringValue` unless a test reveals a real bug.
  - [x] Keep the precedence order exact: path and inherited retain policies must suppress substring handling on the same selected value; exact key must beat regex key; regex key must beat substring.

- [x] **Task 4 - Finalise traversal boundary documentation** (ACs: 5, 10)
  - [x] Update [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md), especially "Why This Is Acceptable, And The Escape Hatch" and "Traversal Mode Boundary".
  - [x] Replace wording that says substring rules "disqualify the rule-driven mode today" or that final substring wording is "left to Story 8.6" with final-state wording.
  - [x] State the final boundary exactly: exact paths and safe single-level `*` path selectors can be rule-driven; `**`, regex path segments, ignore path segments, key rules, regex key rules, `stringTests`, fuzzy key matching, case-insensitive key matching, and unsafe wildcard-depth overlap between any path rules route to generic traversal.
  - [x] Keep the serialise adapter wording aligned with Story 8.3: transformation and circular neutralisation are output-stage concerns under `serialise: true`; substring/key/`**` rules are targeting modes, not transformation escape hatches.
  - [x] Preserve the existing compile-time-vs-runtime fallback note for non-plain prototypes, wildcard-depth non-plain containers, and hostile accessors. Do not expand it into the fuller prototype-handling contract; that remains deferred.
  - [x] Do not hand-edit or regenerate generated docs such as [precedence.md](docs/architecture/precedence.md), [one-way-redaction.md](docs/architecture/one-way-redaction.md), migration docs, README output, example docs, benchmark artefacts, or benchmark result docs. No generator run is expected for Story 8.6; if an in-scope verification step unexpectedly requires generated-output lockstep, record that explicitly before adding generated artefacts.

- [x] **Task 5 - Confirm safety-limit behaviour across both traversal modes** (ACs: 8, 9)
  - [x] Add or extend focused tests in [test/security/traversal-safety.test.ts](test/security/traversal-safety.test.ts) or [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts), choosing the least noisy location.
  - [x] Cover a substring-driven `pathDrivenOnly: false` config that exceeds `maxDepth` and another that exceeds `maxNodes`; assert `compileRedactorPlan(options).pathDrivenOnly === false` before asserting thrown errors contain `code: 'BUDGET_EXCEEDED'`.
  - [x] Cover an existing rule-driven wildcard config that exceeds `maxNodes` if the current Story 8.4 test is not sufficient, and add a rule-driven depth/retained-subtree case only if it can be precise and non-brittle.
  - [x] For every rule-driven safety case, assert `compileRedactorPlan(options).pathDrivenOnly === true` before asserting `BUDGET_EXCEEDED`.
  - [x] Any retained-subtree safety case must be a budget propagation proof only. Do not add the deferred `a.*` retain + `a.*.b` byte-identity coverage or optimise retain-above-wildcard delegation as part of this story.
  - [x] Do not attempt to force identical node-count thresholds between generic and rule-driven modes. If documentation or comments overclaim exact parity, correct the wording to the established cost-model semantics instead.
  - [x] Do not add generic `maxDepth` accounting to ordinary exact-path trie descent in this story unless a separate accepted design change requires it.
  - [x] Do not change `throwBudgetExceeded` diagnostic ordering or diagnostics-sink behaviour; the throwing diagnostic handler fragility remains unrelated baseline debt.

- [x] **Task 6 - Preserve prior-story guardrails and known deferrals** (ACs: 7, 10)
  - [x] Do not revive or address the old `fast-lane.ts` budget-enforcement deferral from Story 7.4. Story 8.6 safety work applies only to the current generic traversal and rule-driven engine in `redact-value.ts` and `navigate-exact-paths.ts`.
  - [x] Do not add `recursiveWildcardChild`, substring edges, key-rule lookup, or regex/ignore path support to the trie in [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts). Substrings are generic traversal only.
  - [x] Do not relax `containsOnlySingleWildcardDynamics` in [path-parser.ts](src/core/matching/path-parser.ts); it must continue to mean exact property/index plus single-level `*` only.
  - [x] Preserve Story 8.4's unsafe-overlap classifier. Configs such as `a.b.c` + `a.*.d` and `a.b.*` + `a.*.c` must stay `pathDrivenOnly: false`.
  - [x] Do not refine `pathDrivenOnly` eligibility for retainStructure-heavy exact-path configurations or retained-subtree wildcard delegation patterns.
  - [x] Do not address alias-aware redaction semantics, including `resolveRetainTerminal` first-wins aliasing or cross-branch alias leaks under exact-path/serialise configurations.
  - [x] Do not change serialise adapter edge cases: root collection circular-marker paths, double getter reads, root `undefined`/symbol/function output, or arbitrary custom-constructor transformer dispatch.
  - [x] Do not address unrelated items in [deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md), including baseline lint debt, stale locked worktree contamination, benchmark floor policy, and retain+wildcard extra coverage. Do not seek out copy-once identity-strengthening; if an in-scope edit already touches the existing shared-ancestor exact+wildcard test, a test-only identity assertion is allowed, but do not change navigator logic for it.

- [x] **Task 7 - Verification** (ACs: all)
  - [x] `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`
  - [x] `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts test/security/traversal-safety.test.ts --reporter=verbose`
  - [x] `source .agents/initialise-env.sh && pnpm run test`
  - [x] If the full test gate fails only on benchmark-documentation lockstep, run `source .agents/initialise-env.sh && pnpm bench:generate-doc` to regenerate [docs/benchmarks/results.md](docs/benchmarks/results.md) from committed benchmark artefacts without changing benchmark JSON or thresholds, then rerun the failing gate and record the reason.
  - [x] If the full test gate fails in the install-matrix loopback registry with sandbox `EPERM`, rerun the same command with approved escalation and record that the rerun was for loopback access only.
  - [x] `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
  - [x] Run `source .agents/initialise-env.sh && pnpm lint` where practical. If it remains red only for known baseline debt, record the exact file/rule output and run ESLint on changed files to prove this story adds no new lint errors. Known baseline examples include `src/core/replacement/serialise-output.ts`, the sparse-array `new Array` in `src/core/runtime/navigate-exact-paths.ts`, and locked worktree contamination if still present.

### Review Findings

- [x] [Review][Patch] Escape-hatch wording omits custom `serialise` functions [docs/architecture/rule-driven-traversal.md:134]
- [x] [Review][Patch] Wildcard `maxNodes` budget test does not cover the exact-limit boundary [test/contract/api/create-redactor.test.ts:5601]
- [x] [Review][Patch] Empty `stringTests` with safe paths is not asserted as rule-driven [test/unit/core/compiler/compile-redactor-plan.test.ts:403]
- [x] [Review][Patch] Non-BMAD project files contain story work-item terminology [test/contract/api/create-redactor.test.ts:3088]
- [x] [Review][Patch] Unsafe wildcard-depth overlap is named without an example in the normative contract [docs/architecture/rule-driven-traversal.md:160]

## Dev Notes

### Boundary Summary

Treat Story 8.6 as a **substring boundary and final proof** story. The two runtime lanes are already selected through `pathDrivenOnly`:

- `pathDrivenOnly: true` -> `buildPathDrivenExecutor(plan, fallback)` in [create-redactor.ts](src/core/create-redactor.ts), using the rule-driven trie in [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts).
- `pathDrivenOnly: false` -> `redactValue(value, plan)` in [create-redactor.ts](src/core/create-redactor.ts), using the generic traversal in [redact-value.ts](src/core/runtime/redact-value.ts).

Substring matching is inherently breadth-visiting: the runtime must inspect string values to know whether they match. Do not try to make substring rules cheap through trie navigation. A config with `stringTests` is generic traversal by design.

### Current Compiler Behaviour

The compiler already has the desired shape:

- `compileSubstringRules` turns bare `RegExp` entries into `kind: 'whole-value'` rules and structured entries into `kind: 'structured-replacer'` rules, cloning patterns via `cloneRegExp` ([compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts#L308)).
- `pathDrivenOnly` is true only when every dynamic path rule is single-wildcard-only, at least one path rule exists, no unsafe wildcard-depth overlap exists, no key or regex-key rules exist, no substring rules exist, and no fuzzy/case-insensitive key option disqualifies the plan ([compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts#L355-L362)).
- `containsOnlySingleWildcardDynamics` excludes `**`, ignore selectors, and regex/ignore-regex selectors from the rule-driven lane ([path-parser.ts](src/core/matching/path-parser.ts#L521)).
- `hasUnsafeWildcardOverlap` rejects shared-prefix shapes the rule-driven wildcard loop cannot resolve safely, including exact-vs-wildcard and wildcard-vs-wildcard overlap ([path-parser.ts](src/core/matching/path-parser.ts#L567)).

Expected implementation: add tests and documentation first. If the classifier tests fail, fix the smallest compiler bug necessary. Do not introduce a new plan field for substring routing.

### Current Substring Runtime Behaviour

The generic traversal's order matters:

1. `selectActivePolicy` chooses exact path, dynamic path, inherited path/key policy, exact key, or regex key before substring handling ([redact-value.ts](src/core/runtime/redact-value.ts#L508)).
2. If an active non-retain policy exists, `applyConfiguredRedaction` runs immediately and substring rules are not considered for that value ([redact-value.ts](src/core/runtime/redact-value.ts#L1236)).
3. Only non-container values reach `transformSubstringValue`; it checks strings only and returns the first matching rule's result ([redact-value.ts](src/core/runtime/redact-value.ts#L1257), [redact-value.ts](src/core/runtime/redact-value.ts#L699)).
4. Bare `RegExp` substring rules redact or remove the whole string value using normal policy handling. Structured substring rules call their replacer once with the original string and an invocation-local pattern clone ([redact-value.ts](src/core/runtime/redact-value.ts#L638)).
5. Root primitive strings use `applyRootPrimitiveSubstringMatch`; structured rules on root strings intentionally use whole-value redaction rather than calling the replacer ([redact-value.ts](src/core/runtime/redact-value.ts#L677)).

The existing tests already cover many of these behaviours. Use them as regression anchors, not as a reason to rewrite substring internals.

### Serialise Behaviour Is Output-Stage Only

Under `serialise: false` or omitted, transformable runtime values and circular references at non-redacted positions remain raw, including when the generic traversal ran for substring/key/`**` reasons after Story 8.3. Under `serialise: true` or a custom `serialise` function, `create-redactor.ts` always runs the generic traversal first and then `serialiseOutput` so the adapter can neutralise cycles and transform runtime values ([create-redactor.ts](src/core/create-redactor.ts#L24)).

Do not change transformer marker shapes, circular marker semantics, `[UNSUPPORTED]` isolation, or the user-supplied serialise sub-contract in this story.

### Safety-Limit Interpretation

Generic traversal increments `nodesVisited` for every transformed node and checks `maxDepth` while descending tracked identities ([redact-value.ts](src/core/runtime/redact-value.ts#L776), [redact-value.ts](src/core/runtime/redact-value.ts#L1231)). Rule-driven traversal creates its own budget and propagates `BudgetExceededError` rather than falling back when budget is exceeded ([navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts#L1177), [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts#L1192)). Wildcard enumeration increments `nodesVisited` per enumerated wildcard key, and retained-subtree descent increments depth/nodes inside `redactRetained` ([navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts#L435), [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts#L987)).

Story 8.4 deliberately recorded that rule-driven `maxNodes` thresholds map to the rule-driven cost model, not the generic traversal's per-node count. Story 8.6 should confirm the contract and clean up any overclaiming prose; it should not redesign the budget model unless tests reveal an actual missing `BUDGET_EXCEEDED` throw in the promised cost surface.

### Previous Story Intelligence To Carry Forward

Story 8.5 found no compiler/parser change was needed for `**` and key-rule classification; tests proved the existing boundary. Apply the same bias here: substring routing probably needs proof and documentation, not new runtime code.

Story 8.5 added `expectStructuredPublicOutputToMatchGenericTraversal` to [create-redactor.test.ts](test/contract/api/create-redactor.test.ts#L245). Reuse that helper for substring generic-oracle cases so Story 8.6 is symmetrical with Story 8.5.

Story 8.4 fixed a critical wildcard-depth overlap regression by making unsafe overlaps compile `pathDrivenOnly: false`. Preserve that behaviour for exact-vs-wildcard and wildcard-vs-wildcard shapes. Do not weaken the overlap classifier while adding substring cases.

Story 8.4 also left one safety-limit nuance for this story: full cross-mode threshold parity was not asserted because the rule-driven engine counts its own navigation cost. This story should make the final contract precise.

### Recent History

The latest relevant commit is `e7d0772 perf(rule driven engine): extend to double wildcard and key-based paths`. It touched the Story 8.5 artefact, [sprint-status.yaml](_bmad-output/implementation-artifacts/sprint-status.yaml), [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md), benchmark result artefacts/doc output, [create-redactor.test.ts](test/contract/api/create-redactor.test.ts), [rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts), and [compile-redactor-plan.test.ts](test/unit/core/compiler/compile-redactor-plan.test.ts). Story 8.6 should extend those same tests/docs rather than changing source unless a focused proof fails.

### Latest Technical Information

No new external library or API is required for this story. Use the repository-pinned toolchain and local source contracts. Do not upgrade `vitest`, `typescript`, `tsdown`, Node, `fast-redact`, or benchmark dependencies as part of finalising the traversal boundary.

## Project Structure Notes

- [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts) - MODIFY only if classification tests fail. Expected behaviour: `stringTests` makes `pathDrivenOnly: false`.
- [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts) - READ/REFERENCE as the generic traversal and substring oracle. Modify only for a verified substring or safety-limit bug.
- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts) - SHOULD NOT CHANGE for substring routing. Modify only if a Story 8.6 safety-limit test exposes a missing promised `BUDGET_EXCEEDED` throw.
- [src/core/create-redactor.ts](src/core/create-redactor.ts) - READ/REFERENCE for executor selection and serialise routing. Modify only if public routing fails the oracle proof.
- [test/unit/core/compiler/compile-redactor-plan.test.ts](test/unit/core/compiler/compile-redactor-plan.test.ts) - MODIFY with focused substring `pathDrivenOnly: false` compiler tests.
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) - MODIFY with Story 8.6 public-vs-generic substring oracle cases and any focused substring/precedence gaps.
- [test/contract/api/rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts) - MODIFY only if a final public contract case belongs better here than in create-redactor tests.
- [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts) - READ/REFERENCE only. Do not add substring cases to the exact-path or wildcard fast-lane corpora; substring equivalence belongs in public-vs-generic oracle tests.
- [test/security/traversal-safety.test.ts](test/security/traversal-safety.test.ts) - MODIFY if this is the cleanest place for substring maxDepth/maxNodes generic traversal safety tests.
- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) - MODIFY to finalise substring boundary wording.
- [docs/architecture/serialise-output.md](docs/architecture/serialise-output.md) - READ/REFERENCE only. Modify only if its cross-reference wording is stale and directly conflicts with final boundary wording.
- [docs/architecture/precedence.md](docs/architecture/precedence.md), [docs/architecture/one-way-redaction.md](docs/architecture/one-way-redaction.md), generated migration/example docs, README output - DO NOT hand-edit for this story.

## References

- Story source: [epics.md - Story 8.6](_bmad-output/planning-artifacts/epics.md)
- Epic 8 overview and serialise-only design decision: [epics.md - Epic 8](_bmad-output/planning-artifacts/epics.md)
- Runtime execution model and traversal boundary: [architecture.md - Core Architectural Decisions](_bmad-output/planning-artifacts/architecture.md)
- Performance risk and Epic 8 rationale: [prd.md - Technical Risks](_bmad-output/planning-artifacts/prd.md)
- Previous story implementation and review intelligence: [8-5 story file](_bmad-output/implementation-artifacts/8-5-extend-rule-driven-engine-for-double-wildcard-paths-and-key-based-rules.md)
- Open deferrals to avoid expanding scope: [deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md)
- Rule-driven traversal contract: [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md)
- Serialise output contract: [serialise-output.md](docs/architecture/serialise-output.md)
- Compile-time mode boundary: [compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)
- Generic traversal and substring oracle: [redact-value.ts](src/core/runtime/redact-value.ts)
- Rule-driven trie executor: [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
- Public routing: [create-redactor.ts](src/core/create-redactor.ts)
- Toolchain pins: [package.json](package.json)

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- 2026-06-05T09:37:02+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` - passed; explicit substring mode-boundary cases compile `pathDrivenOnly: false`.
- 2026-06-05T09:38:16+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` - passed; Story 8.6 public-vs-generic substring oracle cases and existing substring/precedence regressions are green.
- 2026-06-05T09:40:08+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts test/security/traversal-safety.test.ts --reporter=verbose` - passed; substring generic traversal and rule-driven wildcard budget assertions are green.
- 2026-06-05T09:40:45+0100 - `git status --short`, `git diff --name-only`, and guardrail search reviewed before final verification; changes were limited to story/sprint tracking, traversal documentation, and focused tests. No runtime source, parser, trie, serialise adapter, benchmark JSON, or deferred-work files were edited.
- 2026-06-05T09:40:59+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` - passed; 46 tests.
- 2026-06-05T09:41:04+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts test/security/traversal-safety.test.ts --reporter=verbose` - passed; 3 files, 524 tests.
- 2026-06-05T09:41:11+0100 - `source .agents/initialise-env.sh && pnpm run test` - failed only on `test/contract/benchmarks/benchmark-artefacts.test.ts` because `docs/benchmarks/results.md` was out of lockstep with generated output from committed benchmark artefacts.
- 2026-06-05T09:41:24+0100 - `source .agents/initialise-env.sh && pnpm bench:generate-doc` - regenerated `docs/benchmarks/results.md` from committed benchmark artefacts; no benchmark JSON or threshold changes were made.
- 2026-06-05T09:41:27+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-artefacts.test.ts --reporter=verbose` - passed; 5 tests.
- 2026-06-05T09:41:34+0100 - `source .agents/initialise-env.sh && pnpm run test` - passed; 17 files, 641 tests.
- 2026-06-05T09:41:45+0100 - `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` - passed.
- 2026-06-05T09:41:50+0100 - `source .agents/initialise-env.sh && pnpm lint` - failed only on known baseline debt: `src/core/replacement/serialise-output.ts` (`unicorn/prefer-string-replace-all` at 13:40 and 13:63, `unicorn/prefer-string-raw` at 13:77, `unicorn/no-typeof-undefined` at 42:38, `unicorn/no-negated-condition` at 63:29, `@typescript-eslint/no-unused-expressions` at 90:7, `unicorn/no-new-array` at 128:33) and `src/core/runtime/navigate-exact-paths.ts` (`unicorn/no-new-array` at 87:18).
- 2026-06-05T09:41:55+0100 - `source .agents/initialise-env.sh && pnpm exec eslint --no-ignore test/unit/core/compiler/compile-redactor-plan.test.ts test/contract/api/create-redactor.test.ts test/security/traversal-safety.test.ts` - passed; changed TypeScript test files add no lint errors.
- 2026-06-05T09:58:41+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` - passed; 47 tests, including the review-patched empty `stringTests` rule-driven boundary case.
- 2026-06-05T09:58:54+0100 - `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts test/security/traversal-safety.test.ts --reporter=verbose` - passed; 2 files, 505 tests, including the review-patched wildcard `maxNodes` exact-boundary assertion.
- 2026-06-05T09:59:28+0100 - `source .agents/initialise-env.sh && pnpm run test` - passed; 17 files, 641 tests.
- 2026-06-05T09:59:45+0100 - `source .agents/initialise-env.sh && pnpm exec eslint --no-ignore test/unit/core/compiler/compile-redactor-plan.test.ts test/contract/api/create-redactor.test.ts test/security/traversal-safety.test.ts` - passed; changed TypeScript test files remain lint-clean.
- 2026-06-05T09:59:55+0100 - `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` - passed.

### Completion Notes List

- Task 1 completed: compiler mode-boundary coverage now includes bare substring, structured substring, exact path plus substring, safe wildcard plus substring, and safe mixed exact/wildcard plus substring cases. No compiler source change was required.
- Tasks 2 and 3 completed: public structured output now has dedicated Story 8.6 generic-oracle coverage for substring-only, structured replacer, mixed exact/wildcard/substring, wildcard-disqualification, and custom serialise routing. Existing substring and precedence regressions remained green with no runtime changes.
- Task 4 completed: traversal contract documentation now states the final `pathDrivenOnly` boundary, removes temporary Story 8.6 substring wording, and keeps serialise output handling distinct from targeting-mode selection.
- Code-review patches completed: traversal documentation now explicitly includes custom `serialise` functions and concrete unsafe wildcard-depth overlap examples; non-BMAD test naming no longer references this story work item.
- Task 5 completed: substring-driven generic traversal now has explicit `maxDepth` and `maxNodes` `BUDGET_EXCEEDED` coverage with `pathDrivenOnly: false`, and the existing rule-driven wildcard budget case now asserts `pathDrivenOnly: true` with an exact-boundary non-throwing check.
- Task 6 completed: prior-story guardrails were preserved; no runtime source, parser, trie, serialise adapter, benchmark JSON artefacts, threshold policy, or deferred-work files were changed. The benchmark results documentation was regenerated only after the required full test gate identified generated-output lockstep drift.
- Task 7 completed: required compiler, contract, full test, TypeScript, and changed-file lint gates are green after review patches. Project-wide lint remains red only for recorded baseline issues outside this story's changed files.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-6-integrate-substring-matching-and-finalise-rule-driven-engine.md`
- `docs/architecture/rule-driven-traversal.md`
- `docs/benchmarks/results.md`
- `test/contract/api/create-redactor.test.ts`
- `test/security/traversal-safety.test.ts`
- `test/unit/core/compiler/compile-redactor-plan.test.ts`

### Change Log

- 2026-06-05 - Completed Story 8.6: finalised substring traversal boundary tests, public/generic oracle proofs, safety-limit coverage, traversal boundary documentation, and benchmark results documentation lockstep.
