# Deferred Work

## Deferred from: code review of 7-1-implement-compiled-path-executor-for-exact-path-only-configurations (2026-05-25)

- **`for...in` vs `Object.keys` in fast-lane object traversal** (`fast-lane.ts:362`) — `Object.keys` replacement measured at **168% overhead** (hard limit 150%), gate fails. Divergence only affects prototype-polluted payloads under `retainStructure: true`: inherited primitive values get materialised as own properties in the redacted copy (extra keys, not missing redaction). No security impact. Revisit if the benchmark gate is re-baselined or if the hot path is otherwise optimised to create headroom.
- **Benchmark batch cache behaviour** (`scripts/benchmark-runner.ts:106`) — Pre-allocating 500 clones simultaneously inflates cache-miss cost vs. the real single-call pattern; the comparator/subject ratio remains directionally valid but overstates the fast-lane's cache advantage. Deliberate design trade-off documented in Completion Notes.
- **`isExactPathOnly` eligibility too broad for retainStructure-heavy configs** (`compile-redactor-plan.ts`) — Configs with `retainStructure: true` and transformable leaf values will almost always delegate, adding prefix-tree setup cost with no benefit. Not a correctness issue; a future eligibility refinement could exclude configs where the delegation rate is near 100%.
- **O(n\u00b2) array copies in `descendRetain`** (`fast-lane.ts:207`) — `[...inherited.matchedPath, key]` allocates a new array on every recursive step under `retainStructure` policies. Affects deeply nested retained structures only; not the primary benchmark scenario. Could be replaced with a length-tracked index approach.
- **Dev Notes wiring snippet references removed `isFastLaneSafePayload`** (story artefact) — The pseudocode in the Dev Notes section of story 7-1 still shows `import { buildFastLaneExecutor, isFastLaneSafePayload }`. The function was eliminated in favour of the fused executor. No code impact; update the story artefact if it will be referenced by future stories.

## Deferred from: code review of 7-4-enforce-traversal-safety-limits-and-validate-hostile-input-protection (2026-05-27)

- **Fast lane has no budget enforcement** (`fast-lane.ts`) — Intentional per spec scope guard. Exact-path-only hostile payloads bypass both depth and node limits; a stack overflow surfaces as an uncontrolled `RangeError` rather than `BUDGET_EXCEEDED`. Known limitation; revisit if the scope guard is ever lifted.
- **`throwBudgetExceeded` emits diagnostic before throwing** (`src/core/runtime/redact-value.ts`) — If a buggy diagnostic handler itself throws, `BudgetExceededError` is never raised and callers see an unexpected error. Pre-existing fragility in the diagnostics design.

## Deferred from: code review of 8-1-establish-rule-driven-traversal-contract-and-document-behaviour-changes (2026-05-30)

- **Non-plain-prototype delegation silently leaves a configured terminal unredacted, undocumented** (`docs/architecture/rule-driven-traversal.md`) — Pinned by two active invariant tests: a non-plain root/intermediate container delegates and the configured `secret` / `a.b` is NOT redacted (prototype-pollution guard). Correct, intended behaviour, but the new contract doc does not describe the delegation path. Candidate for a future prototype-handling contract doc; outside Story 8.1's ACs.

## Deferred from: code review of 8-2-implement-rule-driven-exact-path-navigation-and-deprecate-the-compiled-path-executor (2026-05-31)

- **`resolveRetainTerminal` first-wins alias behaviour** — When two configured paths resolve to the same container object identity at runtime (payload aliasing), `resolveRetainTerminal` returns the first rule's result and silently discards the second rule's policy. The long-term fix is to identify conflicting configuration patterns (this case plus others where runtime aliasing could produce silent divergence) and throw at `createRedactor` initialisation time rather than silently dropping rules. Runtime must remain error-free except for `BudgetExceededError`. Until this is implemented, callers with two different `retainStructure` rules targeting an aliased container will see only the first rule applied with no warning.

## Deferred from: code review of 7-2-prove-behavioural-equivalence-of-the-compiled-path-executor (2026-05-26)

- ~~**Pre-existing `expect(fastResult).toBe(fastResult)` self-comparison tautology**~~ — dismissed: HEAD already has `toBe(genericResult)`; false positive from stale diff context in review tooling.
- ~~**Single-segment absent terminal key not covered in corpus**~~ — patched: `single-segment-absent-key` corpus entry added in review; 515 tests pass.
- ~~**Path-is-prefix-of-sibling trie edge case not covered**~~ — patched: `parent-and-child-paths` corpus entry added in review; 515 tests pass.

## Deferred from: code review of 8-3-move-transformer-and-circular-handling-into-a-serialise-only-output-adapter (2026-05-31)

- **Cross-branch alias leaks an unconfigured-path value under exact-path config** — with `paths: ['a.secret']` and `{a, b:{ref:a}}`, `serialise: true` emits `b.ref.secret` raw. Pre-existing exact-path first-wins semantics (identical under `serialise: false`); not introduced by Story 8.3. Revisit if/when alias-aware redaction is in scope.
- **Root array/Set/Map self-cycle circular-marker `path` semantics inconsistency** — bare-root Set/Map self-cycles express the marker `path` relative to the transformed shape (`value.0` / `value.me`) while `value` uses the pre-transform canonical path; the root array case loses the distinction. Output remains valid JSON; cosmetic/correctness only.
- **Plain-object getters are read twice under `serialise: true`** — once in the phase-1 redaction traversal and again during the phase-2 safe-graph build (`serialise-output.ts:145`). Side-effecting or non-idempotent getters observe double evaluation. Document or memoise if it becomes a problem.
- **`serialise: true` returns `undefined` (not a string) for a root `undefined`/symbol/function value** — matches native `JSON.stringify` semantics but breaks the "always a string" expectation for those three root inputs. Minor contract wrinkle.
- **Per-constructor custom transformers for arbitrary (non-built-in) types are not dispatched** — `resolveTransformedValue` only dispatches for the six built-in constructors (`Date`/`Error`/`Map`/`RegExp`/`Set`/`URL`) plus `bigint`. Under `serialise: true`, a non-plain object that is none of these (e.g. a class instance) is offered to the generic `fallback` transformers; if none handle it, it becomes `[UNSUPPORTED]` (code-review fix, 2026-05-31, approved by Ben). Registering a transformer keyed by an arbitrary constructor name is not supported by the `byConstructor` type. Revisit if first-class custom-constructor transformers are wanted.
