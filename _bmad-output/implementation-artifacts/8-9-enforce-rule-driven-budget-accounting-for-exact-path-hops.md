# Story 8.9: Enforce Rule-Driven Budget Accounting for Exact-Path Hops

Status: ready-for-dev

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

## Story

As a platform engineer,
I want rule-driven exact-path navigation to honour configured traversal budgets,
so that hostile or excessively deep configured paths cannot bypass `maxDepth` or `maxNodes` limits.

## Context

The deferred-work audit records that rule-driven wildcard enumeration and retained-subtree traversal already enforce `maxNodes` and `maxDepth`, but ordinary exact-path hops still do not increment or check the traversal budget. A deeply configured exact path can therefore bypass user-configured limits that Story 7.4 made release-critical.

Story 8.6 confirmed safety-limit behaviour for known wildcard and retained-subtree cost surfaces. This story closes the remaining exact-hop gap.

## Source Audit Items Covered

- **Critical:** rule-driven exact-path budget accounting is incomplete for exact path hops.
- **Major dependency:** [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) must not overclaim safety parity until exact hops are covered.

## Acceptance Criteria

1. **Given** a `pathDrivenOnly: true` exact-path configuration whose configured path depth exceeds `maxDepth`
   **When** the redactor processes a matching payload
   **Then** it throws `BudgetExceededError` with code `'BUDGET_EXCEEDED'`
   **And** it does not delegate to generic traversal.

2. **Given** a `pathDrivenOnly: true` exact-path configuration whose configured path hops exceed `maxNodes`
   **When** the redactor processes a matching payload
   **Then** it throws `BudgetExceededError` with code `'BUDGET_EXCEEDED'`
   **And** missing paths do not inflate the budget beyond the configured rule-driven cost model.

3. **Given** wildcard enumeration and retained-subtree budget tests already exist
   **When** exact-hop budget tests are added
   **Then** the complete rule-driven safety suite covers exact path, wildcard, retained subtree, and generic traversal modes.

4. **Given** a hostile accessor or non-budget runtime error occurs during rule-driven navigation
   **When** fallback is still allowed
   **Then** only non-budget errors can delegate; `BudgetExceededError` must always propagate.

5. **Given** budget semantics are updated
   **When** architecture docs are reviewed
   **Then** they describe the rule-driven cost model accurately without claiming identical node totals to the generic traversal.

## Tasks / Subtasks

- [ ] Add focused failing tests for exact-path `maxDepth` and `maxNodes` bypasses.
- [ ] Add boundary tests for exactly-at-limit versus over-limit configured exact paths.
- [ ] Update [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts) so exact property/index hops participate in `TraversalBudget`.
- [ ] Preserve current wildcard and retained-subtree budget behaviour.
- [ ] Ensure `isBudgetExceededError` still causes propagation from `buildPathDrivenExecutor`.
- [ ] Update docs and [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md).

## Dev Notes

Avoid forcing generic and rule-driven traversal to throw at the same raw node count. The required behaviour is that configured rule-driven work is bounded and deterministic. The exact-hop counter should map to O(P) work and should not accidentally count every unconfigured sibling.

Likely files:

- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
- [src/core/runtime/traversal-budget.ts](src/core/runtime/traversal-budget.ts)
- [test/security/traversal-safety.test.ts](test/security/traversal-safety.test.ts)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)
- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md)

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/security/traversal-safety.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
