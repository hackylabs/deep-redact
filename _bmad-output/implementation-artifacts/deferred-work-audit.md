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

## Deferred from: code review of 7-2-prove-behavioural-equivalence-of-the-compiled-path-executor (2026-05-26)

- ~~**Pre-existing `expect(fastResult).toBe(fastResult)` self-comparison tautology**~~ — dismissed: HEAD already has `toBe(genericResult)`; false positive from stale diff context in review tooling.
- ~~**Single-segment absent terminal key not covered in corpus**~~ — patched: `single-segment-absent-key` corpus entry added in review; 515 tests pass.
- ~~**Path-is-prefix-of-sibling trie edge case not covered**~~ — patched: `parent-and-child-paths` corpus entry added in review; 515 tests pass.
