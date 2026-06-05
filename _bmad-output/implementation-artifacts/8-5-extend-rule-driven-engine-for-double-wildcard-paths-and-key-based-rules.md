# Story 8.5: Extend Rule-Driven Engine for Double Wildcard (`**`) Paths and Key-Based Rules

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want double wildcard (`**`) paths and key-based rules to integrate with the rule-driven engine through a clearly defined traversal mode boundary,
so that all targeting modes are supported and configurations are classified into the correct traversal mode at compile time.

## Context

Epic 8 replaces the old full-payload walk for path-driven configurations with a rule-driven engine. Stories 8.2 and 8.4 already implemented the efficient lane for exact paths and single-level wildcard (`*`) paths; Story 8.3 moved runtime-value transformation and circular-reference neutralisation into the serialise-only output adapter. This story does **not** add an optimised recursive wildcard navigator. It pins the mode boundary: configurations containing recursive wildcard (`**`) paths or key-based targeting are classified as `pathDrivenOnly: false` and use the existing `O(N)` generic traversal.

The current compiler already expresses most of the intended boundary. `compileRedactorPlan` sets `pathDrivenOnly` only when every dynamic path rule is single-wildcard-only, at least one path rule exists, no unsafe exact/wildcard overlap exists, no exact-key or regex-key rules exist, no substring rules exist, `fuzzyKeyMatch` is false, and `caseSensitiveKeyMatch` is not false ([compile-redactor-plan.ts:337-363](src/core/compiler/compile-redactor-plan.ts#L337-L363)). `containsOnlySingleWildcardDynamics` explicitly excludes `**`, ignore selectors, and regex selectors from the rule-driven lane ([path-parser.ts:517-523](src/core/matching/path-parser.ts#L517-L523)).

`**` path selectors are already valid path selectors and compile as dynamic rules. The string parser creates a `recursive-wildcard` segment for `**` and rejects multiple recursive wildcards in one selector ([path-parser.ts:368-412](src/core/matching/path-parser.ts#L368-L412)). The generic traversal resolves recursive wildcards via `matchesDynamicRule`, where a `recursive-wildcard` segment may match zero or more concrete path segments ([redact-value.ts:471-506](src/core/runtime/redact-value.ts#L471-L506)). Key selector strings containing `*` or `**` are not valid key selectors; key-based scope here means valid `keys` entries: literal keys, regex keys, and literal key rules using fuzzy or case-insensitive matching ([validate-config.ts:198-259](src/core/validation/validate-config.ts#L198-L259)).

The public redactor selection is straightforward: if `plan.pathDrivenOnly` is true, `create-redactor.ts` builds `buildPathDrivenExecutor`; otherwise it calls `redactValue` directly ([create-redactor.ts:16-23](src/core/create-redactor.ts#L16-L23)). Under `serialise: true` the public redactor intentionally uses the generic traversal regardless of plan shape so the serialise adapter receives full cycle-registration context ([create-redactor.ts:24-37](src/core/create-redactor.ts#L24-L37)). Do not change that in this story.

**Environment bootstrap:** before any Node.js, package-manager, build, lint, test, generation, benchmark, or release command, run `source .agents/initialise-env.sh` from the repository root. Treat a bootstrap failure as a blocker. The repository pins Node `24.14.1` and `pnpm@10.33.0`.

**Pinned toolchain:** use the project pins in [package.json](package.json): Node `24.14.1`, `pnpm@10.33.0`, `vitest 4.1.4`, `typescript 6.0.2`, and `tsdown 0.21.7`. Do not mix dependency upgrades into traversal-mode work.

**British English** throughout prose, comments, and documentation. Keep API identifiers unchanged (`pathDrivenOnly`, `caseSensitiveKeyMatch`, `fuzzyKeyMatch`, `serialise`, etc.). Use `.js` import extensions in TypeScript source.

## Acceptance Criteria

**Traversal mode selection**

1. **Given** a configuration the existing Story 8.4 classifier considers safe for the rule-driven lane, containing only exact paths and/or single-level `*` selectors, with no `**`, no key rules, no substring tests, no fuzzy key matching, and case-sensitive matching enabled
   **When** the plan is compiled
   **Then** `pathDrivenOnly: true` is set and the rule-driven engine is used for qualifying `serialise: false` / omitted payloads
   **And** `serialise: true` and custom `serialise` functions still route through the generic traversal before the serialise adapter.

2. **Given** a configuration containing any `**` segment, key-based rule, regex key rule, regex/ignore path segment, substring test, fuzzy key match option, case-insensitive key match option, or unsafe exact/`*` shared-prefix overlap
   **When** the plan is compiled
   **Then** `pathDrivenOnly: false` is set and the `O(N)` traversal is used for all payloads under that configuration.

**Double wildcard traversal**

3. **Given** a configuration containing a `**` segment and `pathDrivenOnly: false`
   **When** the `O(N)` traversal processes a payload
   **Then** `**` matches resolve through recursive descent, consistent with the semantics established by Epic 1 Story 1.4
   **And** zero, one, and many intermediate segments are all covered
   **And** the output is behaviourally identical to the post-Story-8.3 general traversal: transformable runtime values are left raw under `serialise: false`, and transformation/circular neutralisation occur only in the serialise adapter under `serialise: true`.

**Key-based rule integration**

4. **Given** a configuration containing key-based rules alongside path-based rules and `pathDrivenOnly: false`
   **When** the `O(N)` traversal runs
   **Then** both path-based and key-based rules are applied in one traversal pass
   **And** precedence remains unchanged: exact path > structured dynamic path > inherited path/key policy > exact key > regex key > substring
   **And** literal key rules honour their configured exact, canonical-exact, fuzzy contains, and canonical-contains modes
   **And** regex key rules keep cloned non-stateful matcher behaviour and do not use global or sticky regexes.

**Boundary documentation**

5. **Given** the rule-driven traversal contract
   **When** this story is complete
   **Then** [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) marks the Story 8.5 proof as complete for `**` and key-rule routing: recursive wildcard (`**`) paths and key rules are intentionally outside the rule-driven engine and route to the `O(N)` generic traversal
   **And** the document leaves full traversal-boundary finalisation, including substring wording, to Story 8.6
   **And** the document makes clear that `**` and key rules are not an escape hatch for runtime-value transformation; `serialise: true` is the transformation/circular-neutralisation mechanism.

**Scope guard**

6. **Given** this story's scope
   **When** the implementation is reviewed
   **Then** it covers the `pathDrivenOnly` compile-time flag, `**` traversal mode routing, key-based rule integration in `O(N)` mode, documentation, and equivalence/regression tests only
   **And** no recursive-wildcard edge is added to the rule-driven trie in [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
   **And** no attempt is made to optimise key rules with the rule-driven engine
   **And** substring matching integration remains deferred to Story 8.6
   **And** no change is made to transformer marker shapes, the serialise adapter, benchmark thresholds, dependency versions, or generated migration/example artefacts.

## Tasks / Subtasks

- [x] **Task 1 — Pin traversal-mode compilation with focused compiler tests** (ACs: 1, 2)
  - [x] Add a table-driven section to [test/unit/core/compiler/compile-redactor-plan.test.ts](test/unit/core/compiler/compile-redactor-plan.test.ts) that asserts `pathDrivenOnly: true` for safe path-driven configurations: exact paths only, single-level `*` paths only, and safe mixed exact + `*` paths already allowed by the Story 8.4 overlap classifier.
  - [x] Add negative cases asserting `pathDrivenOnly: false` for: a `**` path (`account.**.token`), a mixed exact + `**` path config, a regex path segment, an ignore path segment, an exact key rule, a regex key rule, `fuzzyKeyMatch: true`, `caseSensitiveKeyMatch: false`, a `stringTests` entry, and the Story 8.4 unsafe-overlap case `a.b.c` + `a.*.d`.
  - [x] Keep key wildcard strings out of this table: `keys: ['*']` and `keys: ['**']` are invalid selectors, not valid key-rule routing cases.
  - [x] Only touch [compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts) or [path-parser.ts](src/core/matching/path-parser.ts) if the tests reveal a real classification bug. The expected implementation is a tightening/proof pass, not a new compiler design.

- [x] **Task 2 — Prove `**` path routing and recursive-match semantics through the public API** (ACs: 2, 3)
  - [x] Extend [test/contract/api/rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts) with a Story 8.5 section covering `**` boundary behaviour.
  - [x] Assert `compileRedactorPlan({ paths: ['account.**.token'] }).pathDrivenOnly` is `false`.
  - [x] Add a public `deepRedact({ paths: ['account.**.token'] })` test that redacts `account.token` (zero segments), `account.session.token` (one segment), and `account.audit.session.token` (many segments), while leaving non-matching siblings unchanged.
  - [x] Add a function-censor test for the same selector that captures every match context and asserts all three concrete `matchedPath` values: `['account', 'token']`, `['account', 'session', 'token']`, and `['account', 'audit', 'session', 'token']`, with `rulePath` equal to `['account', { anyDepth: true }, 'token']`.
  - [x] Add a `serialise: false` runtime-value sibling assertion for a `**` config: a non-redacted `Date`/`Map`/circular sibling remains raw under the post-Story-8.3 traversal contract.

- [x] **Task 3 — Prove key-based rules integrate with path rules in the generic traversal** (ACs: 2, 4)
  - [x] Add or extend tests in [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) for a mixed path + key config, for example exact path + single-level wildcard path + literal key + regex key, and assert `compileRedactorPlan(options).pathDrivenOnly` is `false`.
  - [x] Assert all matching modes fire in one call: path targets are redacted, literal key targets are redacted, regex key targets are redacted, and unrelated values remain unchanged.
  - [x] Add the core overlap case: `paths: [{ path: 'account.**.token', censor: '[PATH]' }]` plus a valid key rule such as `keys: ['token']` or `keys: [/token$/i]`. Assert the recursive dynamic path wins on matching leaves while unrelated key matches outside the recursive path still redact under the key rule.
  - [x] Include at least one fuzzy or case-insensitive literal key case that sets the global option and proves the config routes to `pathDrivenOnly: false` even when a key rule would not match a particular payload key.
  - [x] Keep the existing precedence contract intact: path rules must still beat key rules on the same leaf and exact key must beat regex key. Preserve existing substring precedence regression coverage only; do not add new substring integration behaviour in Story 8.5.

- [x] **Task 4 — Add generic-traversal oracle guards for `pathDrivenOnly: false` configs** (ACs: 2, 3, 4)
  - [x] Add a small helper or local assertion that compares `deepRedact(options)(payloadFactory())` with `redactValue(payloadFactory(), compileRedactorPlan(options))` for structured-output (`serialise` omitted or `false`) `pathDrivenOnly: false` boundary cases. This proves public output matches the generic traversal oracle; executor routing is proved by `compileRedactorPlan(...).pathDrivenOnly === false` and the public routing in [create-redactor.ts](src/core/create-redactor.ts).
  - [x] Cover at minimum one `**` path-only config and one mixed path + key config.
  - [x] If a `serialise: true` boundary case is added, mirror the serialise adapter explicitly instead of comparing directly against bare `redactValue`.
  - [x] Do **not** drive `pathDrivenOnly: false` configs through `buildPathDrivenExecutor`; the whole point is that they never enter the rule-driven trie.
  - [x] Preserve the existing exact/wildcard equivalence harness. Do not convert `**` rules into the `wildcardEquivalenceCorpus`; `**` is intentionally outside the fast lane.

- [x] **Task 5 — Update the traversal-boundary documentation** (ACs: 5, 6)
  - [x] Update [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md), especially the "Traversal Mode Boundary" section, to mark the Story 8.5 boundary as pinned for `**` and key rules.
  - [x] Replace stale wording that says recursive wildcard handling is "not yet implemented" or that `**`/key rules are merely "addressed in Stories 8.5-8.6" with: `**` and key rules are intentionally outside the rule-driven engine and route to the `O(N)` generic traversal; only substring finalisation remains Story 8.6.
  - [x] State that exact paths and safe single-level `*` paths may be rule-driven; `**`, key rules, regex-key rules, regex/ignore path segments, fuzzy key matching, and case-insensitive key matching use the `O(N)` traversal. Leave full substring boundary finalisation to Story 8.6.
  - [x] Keep the serialise adapter wording aligned with Story 8.3: runtime transformation and circular neutralisation are output-stage concerns, not reasons to choose `**` or key rules.
  - [x] Add only a short boundary note that non-plain root/intermediate container handling remains governed by the existing prototype-pollution guard; a full prototype-handling contract remains deferred.
  - [x] Do not hand-edit generated docs such as [precedence.md](docs/architecture/precedence.md) or [one-way-redaction.md](docs/architecture/one-way-redaction.md).

- [x] **Task 6 — Preserve prior-story guardrails and known deferrals** (ACs: 1, 2, 4, 6)
  - [x] Do not add `recursiveWildcardChild`, recursive trie descent, or key-rule lookup logic to [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts). If a test tempts that change, the test is probably asserting the wrong boundary.
  - [x] Do not relax `containsOnlySingleWildcardDynamics`; it should continue to mean exact segments plus single-level `*` only.
  - [x] Do not undo the Story 8.4 unsafe-overlap classifier (`hasUnsafeWildcardOverlap`). Mixed exact + `*` configs that currently route to the generic traversal must keep doing so.
  - [x] Do not refine `pathDrivenOnly` eligibility for retainStructure-heavy exact-path configurations or retained-subtree wildcard delegation patterns; those optimisation and coverage deferrals remain outside Story 8.5 unless a `**` or key-rule boundary test exposes a correctness regression.
  - [x] Do not add budget-limit assertions or change `throwBudgetExceeded` diagnostic ordering; fast-lane budget parity and diagnostic-handler fragility remain deferred.
  - [x] Do not address alias-aware redaction semantics, including `resolveRetainTerminal` first-wins aliasing or cross-branch alias leaks under exact-path/serialise configurations.
  - [x] Do not change serialise adapter edge cases: root collection circular-marker paths, double getter reads, root `undefined`/symbol/function output, or arbitrary custom-constructor transformer dispatch.
  - [x] If editing the existing shared-ancestor exact+wildcard test in [create-redactor.test.ts](test/contract/api/create-redactor.test.ts), add a test-only copy-once identity assertion if practical; do not change navigator logic for this story.
  - [x] Do not address unrelated deferred work in [deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md), including wildcard benchmark floor policy or the extra retain+wildcard delegation test, unless the new tests expose a direct regression in this story's scope.

- [x] **Task 7 — Verification** (ACs: all)
  - [x] `source .agents/initialise-env.sh && pnpm exec vitest run test/unit/core/compiler/compile-redactor-plan.test.ts test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts --reporter=verbose`
  - [x] `source .agents/initialise-env.sh && pnpm run test`
  - [x] `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
  - [x] Run `source .agents/initialise-env.sh && pnpm lint` where practical. If it remains red only for known baseline debt, record the exact file/rule output and run ESLint on changed files to prove no new errors. Known baseline examples include `src/core/replacement/serialise-output.ts`, the sparse-array `new Array` in `src/core/runtime/navigate-exact-paths.ts`, and the locked worktree path `.claude/worktrees/agent-a0021c6aff5315d6e`.

## Dev Notes

### Boundary Summary

Treat Story 8.5 as a **classification and proof** story. The current runtime already has two executors:

- `pathDrivenOnly: true` → `buildPathDrivenExecutor(plan, fallback)` in [create-redactor.ts](src/core/create-redactor.ts), using the rule-driven trie in [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts).
- `pathDrivenOnly: false` → `redactValue(value, plan)` in [create-redactor.ts](src/core/create-redactor.ts), using the generic traversal in [redact-value.ts](src/core/runtime/redact-value.ts).

This story makes the `pathDrivenOnly: false` side explicit for `**` and key rules. Do not try to make `**` cheap through direct navigation. Recursive wildcard and key-based matching require visiting payload breadth by design.

### `**` Path Semantics Already Exist In The Generic Traversal

The path parser turns a bare `**` path segment into `kind: 'recursive-wildcard'` ([path-parser.ts:368-379](src/core/matching/path-parser.ts#L368-L379)). It also rejects more than one `**` segment in one selector ([path-parser.ts:408-412](src/core/matching/path-parser.ts#L408-L412)). The compiler converts that segment into `{ anyDepth: true }` for public `rulePath` contexts ([compile-redactor-plan.ts:118-131](src/core/compiler/compile-redactor-plan.ts#L118-L131)); [path-normaliser.ts](src/core/matching/path-normaliser.ts) renders selector signatures only.

`redactValue` resolves dynamic path rules by checking every concrete path against each dynamic selector. For `recursive-wildcard`, `matchesDynamicRule` recursively advances the concrete path index from the current position through the end of the path, so `account.**.token` matches:

- `account.token`
- `account.session.token`
- `account.audit.session.token`

Use the existing implementation as the behavioural oracle. The story's job is to assert that public redaction routes there when a `**` selector is present.

### Key Rules Are Valid Only Through `keys`

Do not confuse path wildcards with key selectors. Path selectors may contain `*` and one `**`; key selector strings containing `*`, `**`, `!`, or regex-like text are invalid and must still fail validation ([validate-config.ts:198-237](src/core/validation/validate-config.ts#L198-L237)). Valid key-based cases for this story are:

- `keys: ['password']` for exact literal key matching
- `keys: [/token$/i]` for regex key matching
- `keys: [{ key: 'pass', fuzzyKeyMatch: true }]` for fuzzy literal matching
- `keys: [{ key: 'ApiKey', caseSensitiveKeyMatch: false }]` or global `caseSensitiveKeyMatch: false` for canonical case-insensitive matching

Any valid `keys` entry should make `pathDrivenOnly` false, even when path entries are otherwise exact or safe single-level wildcard paths.

### Precedence Must Not Move

The generic traversal's precedence model is already load-bearing:

1. exact string-path
2. structured dynamic path
3. inherited path/key policy
4. exact key
5. regex key
6. substring

`selectActivePolicy` embodies the path/key part of that order ([redact-value.ts:508-556](src/core/runtime/redact-value.ts#L508-L556)), and substring handling runs after path/key selection. Story 8.5 tests should prove the mixed `pathDrivenOnly: false` configs preserve this order, not restate it with a new implementation.

### Serialise Behaviour Is Output-Stage Only

The post-Story-8.3 baseline matters for every equivalence assertion:

- Under `serialise: false` (default), transformable runtime values and circular references at non-redacted positions remain raw.
- Under `serialise: true`, [serialise-output.ts](src/core/replacement/serialise-output.ts) walks the redacted result and applies transformer markers/circular neutralisation.
- Public `create-redactor.ts` always uses the generic traversal before serialisation so the serialise adapter receives cycle-registration context ([create-redactor.ts:24-37](src/core/create-redactor.ts#L24-L37)).

Do not change the serialise adapter or transformer marker shapes. If a test fails because a `serialise: true` expectation was written against pre-Story-8.3 inline-transform behaviour, fix the test expectation.

### Previous Story Intelligence To Carry Forward

Story 8.4 completed the single-level wildcard fast lane and then fixed a critical review finding: exact/wildcard shared-prefix overlaps such as `a.b.c` + `a.*.d` now compile `pathDrivenOnly: false`, because the rule-driven wildcard loop cannot resolve that per-leaf precedence safely. Preserve that behaviour. It is relevant here because those configs are also valid `pathDrivenOnly: false` examples, but they are not `**`/key-rule examples.

Story 8.4 also recorded a deliberate `maxNodes` nuance: wildcard enumeration counts the rule-driven engine's `O(P + ΣK)` cost, not the generic traversal's full per-node count. Full cross-mode safety-limit parity is Story 8.6 scope. Do not expand this story into budget semantics unless a `**` or key-rule boundary test exposes an immediate regression.

### Recent History

The latest relevant commit is `fd79334 perf(rule driven engine): extend to handle single-level wildcard`. It touched [compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts), [path-parser.ts](src/core/matching/path-parser.ts), [navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts), [create-redactor.test.ts](test/contract/api/create-redactor.test.ts), [rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts), the wildcard equivalence corpus in [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts), and [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md). Story 8.5 should preserve those patterns and avoid trie changes.

### Latest Technical Information

Node `24.14.1` is the repository-pinned development runtime and was a Node.js security release. Keep using the bootstrap rather than ambient Node. The npm registry has patch-level newer dev-tool versions than the local pins; do not upgrade them in this story.

## Project Structure Notes

- [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts) — MODIFY only if classification tests fail. Expected current behaviour: `**`, keys, regex keys, fuzzy/case-insensitive key options, regex/ignore path segments, unsafe exact/`*` overlaps, and substring rules compile `pathDrivenOnly: false`.
- [src/core/matching/path-parser.ts](src/core/matching/path-parser.ts) — MODIFY only if the single-wildcard classifier or recursive-wildcard parsing proves incorrect. Do not broaden `containsOnlySingleWildcardDynamics`.
- [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts) — READ/REFERENCE as the generic traversal oracle. Modify only for a verified generic traversal bug.
- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts) — SHOULD NOT CHANGE for this story; `**` and key rules must not enter the trie.
- [src/core/create-redactor.ts](src/core/create-redactor.ts) — READ/REFERENCE for executor selection. Modify only if public routing does not honour `pathDrivenOnly`.
- [test/unit/core/compiler/compile-redactor-plan.test.ts](test/unit/core/compiler/compile-redactor-plan.test.ts) — MODIFY with mode-selection tests.
- [test/contract/api/rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts) — MODIFY with Story 8.5 `**` boundary and contract tests.
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) — MODIFY with mixed path/key integration and precedence tests.
- [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts) — DO NOT expand the wildcard fast-lane corpus to include `**`; add a separate helper only if it makes `pathDrivenOnly: false` public-vs-generic assertions cleaner.
- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) — MODIFY the traversal-mode boundary section.
- [docs/architecture/precedence.md](docs/architecture/precedence.md), [docs/architecture/one-way-redaction.md](docs/architecture/one-way-redaction.md) — DO NOT hand-edit generated docs.

## References

- Story source: [epics.md §Story 8.5](_bmad-output/planning-artifacts/epics.md)
- Epic 8 overview and serialise-only design decision: [epics.md §Epic 8](_bmad-output/planning-artifacts/epics.md)
- Runtime execution model and traversal boundary: [architecture.md §Core Architectural Decisions](_bmad-output/planning-artifacts/architecture.md)
- Toolchain and testing expectations: [architecture.md §Technical Stack / Testing](_bmad-output/planning-artifacts/architecture.md)
- Previous story implementation and review intelligence: [8-4 story file](_bmad-output/implementation-artifacts/8-4-extend-rule-driven-engine-for-single-level-wildcard-paths.md)
- Open deferrals to avoid expanding scope: [deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md)
- Rule-driven traversal contract: [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md)
- Serialise output contract: [serialise-output.md](docs/architecture/serialise-output.md)
- Recursive wildcard parsing and classification: [path-parser.ts](src/core/matching/path-parser.ts)
- Compile-time mode boundary: [compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)
- Generic traversal oracle: [redact-value.ts](src/core/runtime/redact-value.ts)
- Public routing: [create-redactor.ts](src/core/create-redactor.ts)
- Node.js `24.14.1` security release: <https://nodejs.org/en/blog/release/v24.14.1>
- npm registry package pages for latest-version check: <https://www.npmjs.com/package/vitest>, <https://www.npmjs.com/package/typescript>, <https://www.npmjs.com/package/tsdown>

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Task 1 compiler proof: `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose` → 42 tests pass.
- Task 2 public `**` contract proof: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts --reporter=verbose` → 19 tests pass.
- Tasks 3–4 path/key integration and generic-oracle proof: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` → 490 tests pass.
- Focused Story 8.5 suite: the story's combined Vitest command is split because repository config excludes `test/unit/**` from the default Vitest include. Equivalent verification passed with `source .agents/initialise-env.sh && pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts --reporter=verbose` → unit 42 tests pass; contract 509 tests pass.
- Full gate: first `source .agents/initialise-env.sh && pnpm run test` run exposed stale `docs/benchmarks/results.md` lockstep against committed benchmark artefacts. Ran `source .agents/initialise-env.sh && pnpm bench:generate-doc`, then reran `source .agents/initialise-env.sh && pnpm run test` → 17 files / 634 tests pass.
- Final completion check: sandboxed `source .agents/initialise-env.sh && pnpm run test` hit `listen EPERM: operation not permitted 127.0.0.1` in the install-matrix verifier loopback-registry test; reran the same command outside the sandbox with approval → 17 files / 634 tests pass.
- Type check: `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` → clean.
- Changed-file lint/type completion check: `source .agents/initialise-env.sh && pnpm exec tsc --noEmit && pnpm exec eslint --no-ignore test/unit/core/compiler/compile-redactor-plan.test.ts test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts` → exit 0.
- Lint: `source .agents/initialise-env.sh && pnpm lint` remains red on known baseline source lint debt only: `src/core/replacement/serialise-output.ts` (`unicorn/prefer-string-replace-all`, `unicorn/prefer-string-raw`, `unicorn/no-typeof-undefined`, `unicorn/no-negated-condition`, `@typescript-eslint/no-unused-expressions`, `unicorn/no-new-array`) and `src/core/runtime/navigate-exact-paths.ts` (`unicorn/no-new-array`). Changed TypeScript files pass with `source .agents/initialise-env.sh && pnpm exec eslint --no-ignore test/unit/core/compiler/compile-redactor-plan.test.ts test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts`.

### Completion Notes List

- **Task 1** — Added focused `pathDrivenOnly` boundary tests for safe exact/`*` configurations and false-boundary cases (`**`, regex/ignore path segments, exact/regex key rules, fuzzy/case-insensitive key options, substring rules, and unsafe exact/`*` overlap). No compiler or parser code change was required because the existing classifier already matched the Story 8.5 boundary.
- **Task 2** — Added Story 8.5 public API contract coverage for `account.**.token`: compile-time `pathDrivenOnly: false`, zero/one/many recursive wildcard matches, concrete function-censor `matchedPath` values with `{ anyDepth: true }` rule path, and raw `Date`/`Map`/circular siblings under `serialise: false`.
- **Tasks 3–4** — Added a local generic-traversal oracle helper in [create-redactor.test.ts](test/contract/api/create-redactor.test.ts) that asserts `pathDrivenOnly: false` and compares public structured output with `redactValue`. Covered a `**` path-only config, a mixed exact path + single-level wildcard path + literal key + regex key config, a recursive dynamic path + exact key precedence overlap, and a case-insensitive literal key configuration with no key hit. The tests prove path/key rules apply in one generic traversal pass, dynamic path rules beat key rules on the same leaf, exact key beats regex key for `token`, unrelated values remain unchanged, and `**` never enters the wildcard fast-lane corpus.
- **Task 5** — Updated [rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) to pin recursive wildcard (`**`) and key-rule routing outside the rule-driven engine, remove stale "not yet implemented" Story 8.5 wording, leave substring boundary finalisation to Story 8.6, align transformation/circular wording with the serialise adapter, and add the short prototype-pollution guard note. Generated architecture docs were not hand-edited.
- **Task 6** — Verified the diff stays within Story 8.5 proof/documentation scope. No source/runtime changes were made to the trie, compiler/parser, public routing, serialise adapter, benchmark artefacts, generated architecture docs, exact/wildcard equivalence corpus, or deferred-work audit.
- **Task 7** — Completed focused tests, full project test gate, type check, and lint verification. Regenerated [docs/benchmarks/results.md](docs/benchmarks/results.md) from committed artefacts to satisfy the full test gate's benchmark-doc lockstep check; no benchmark artefacts or thresholds were changed. Repository-wide lint remains red only on pre-existing source lint debt, while all changed TypeScript files pass ESLint with `--no-ignore`.

### Change Log

- 2026-06-05 — Started Story 8.5 implementation; added compiler traversal-mode boundary proof tests for `pathDrivenOnly` true/false routing cases.
- 2026-06-05 — Added public `**` routing and recursive-match contract tests.
- 2026-06-05 — Added mixed path/key generic traversal tests and public-vs-generic oracle guards for `pathDrivenOnly: false` configs.
- 2026-06-05 — Updated traversal-boundary documentation for Story 8.5 `**` and key-rule routing.
- 2026-06-05 — Completed verification and marked Story 8.5 ready for review.

### File List

- `test/unit/core/compiler/compile-redactor-plan.test.ts` — MODIFIED (Story 8.5 traversal-mode boundary tests)
- `test/contract/api/rule-driven-traversal-contract.test.ts` — MODIFIED (Story 8.5 `**` boundary contract tests)
- `test/contract/api/create-redactor.test.ts` — MODIFIED (Story 8.5 path/key integration and generic traversal oracle tests)
- `docs/architecture/rule-driven-traversal.md` — MODIFIED (Story 8.5 traversal boundary documentation)
- `docs/benchmarks/results.md` — REGENERATED (benchmark results doc lockstep with committed artefacts)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (status transition to `review`)

## Story Completion Status

Implementation complete and ready for review.
