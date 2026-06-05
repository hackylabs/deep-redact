# Story 8.12: Reduce Retain-Structure Debt and Complete Coverage

Status: ready-for-dev

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

## Story

As a maintainer of the rule-driven traversal engine,
I want retained-structure traversal debt reduced and its coverage completed,
so that retain-heavy configurations are correct, bounded, and not misleadingly classified as fast path work when they mostly delegate.

## Context

Several open audit items cluster around retained-structure handling in [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts):

- Object retain traversal uses `for...in`, which can materialise inherited properties under prototype pollution plus `retainStructure: true`.
- `descendRetain` spreads matched paths on every recursive step, creating O(n squared) allocation behaviour for deeply nested retained structures.
- `pathDrivenOnly` eligibility remains broad for retain-heavy configurations that delegate heavily.
- Retain terminals above wildcard segments delegate to the generic traversal.
- AC-5 copy-once coverage is indirect.
- Retain+wildcard delegation has focused byte-identity coverage for only one of two named shapes.

The two required named coverage cases are:

- `retained-parent-with-wildcard-descendant`: a retained parent container with a wildcard descendant rule, such as `users.*.email`.
- `shared-ancestor-exact-and-wildcard`: an exact path and a wildcard path below the same ancestor, proving the shared ancestor is copied once and both redactions are applied.

## Source Audit Items Covered

- **Major:** inherited object traversal divergence under retained structure.
- **Major:** O(n squared) matched-path allocation in `descendRetain`.
- **Major:** retain-heavy `pathDrivenOnly` eligibility can add setup cost with little benefit.
- **Major:** retain/wildcard delegation and copy-once proof coverage are incomplete.
- **Major documentation gap:** non-plain-prototype configured-path delegation should explicitly state when the configured terminal remains unredacted.

## Acceptance Criteria

1. **Given** a retained plain object has inherited enumerable properties
   **When** retained traversal runs
   **Then** inherited properties are not materialised as own redacted properties
   **And** sparse arrays still preserve holes.

2. **Given** a deeply nested retained subtree
   **When** function-censor context paths are produced
   **Then** matched-path construction avoids O(n squared) array copying while preserving exact context values.

3. **Given** retain-heavy configurations mostly delegate under current rules
   **When** `pathDrivenOnly` eligibility is compiled
   **Then** the current eligibility trade-off is documented and pinned by classifier tests
   **And** any future exclusion of unprofitable retain-heavy patterns is recorded as separate follow-up work rather than added implicitly to this story.

4. **Given** the named case `shared-ancestor-exact-and-wildcard` where an exact path and wildcard path redact below the same ancestor
   **When** both rules redact within that ancestor
   **Then** tests directly assert the shared ancestor is copied once, not just that merged output is correct
   **And** both redactions are applied.

5. **Given** the named case `retained-parent-with-wildcard-descendant` where a retained parent container has a wildcard descendant rule such as `users.*.email`
   **When** redaction runs
   **Then** focused byte-identity tests prove delegation remains correct
   **And** the retained parent container is not misleadingly classified as fully path-driven work.

6. **Given** non-plain prototypes trigger configured-path delegation
   **When** architecture docs are reviewed
   **Then** they explicitly state whether the configured terminal remains unredacted after delegation and why that is the intended prototype guard.

## Tasks / Subtasks

- [ ] Add a failing inherited-property regression for retained object traversal.
- [ ] Replace `for...in` in retained object traversal with an own-key iteration strategy that keeps benchmark overhead within accepted limits, or document measured evidence if no safe change is possible.
- [ ] Refactor retain matched-path construction to avoid per-level spread allocation.
- [ ] Add focused tests for copy-once identity using the named case `shared-ancestor-exact-and-wildcard`.
- [ ] Add focused tests for retain/wildcard delegation using the named case `retained-parent-with-wildcard-descendant`.
- [ ] Add focused tests for non-plain-prototype terminal behaviour.
- [ ] Add classifier tests and documentation for the current `pathDrivenOnly` retain-heavy eligibility trade-off.
- [ ] Record any future exclusion of unprofitable retain-heavy patterns as separate follow-up work if the evidence supports it.
- [ ] Update [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) and the deferred-work audit.

## Dev Notes

This story may need benchmark evidence. The audit records that an earlier `Object.keys` replacement measured 168% overhead against a 150% limit, but that measurement was taken under an older engine. Re-measure before preserving the deferral.

Likely files:

- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
- [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)
- [test/unit/core/compiler/compile-redactor-plan.test.ts](test/unit/core/compiler/compile-redactor-plan.test.ts)
- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md)
- [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts) or benchmark fixtures only if re-measurement requires it.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm lint`
- If benchmark thresholds or eligibility rules change: `source .agents/initialise-env.sh && pnpm run verify:benchmarks`
