# Story 8.9: Enforce Rule-Driven Budget Accounting for Exact-Path Hops

Status: done

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

## Derived Follow-up

- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) must describe rule-driven budget accounting accurately once exact hops are covered. This is derived documentation work for the exact-hop budget fix, not a separate deferred-work audit item.

## Non-Goals

- Do not resolve the non-plain-prototype configured-terminal documentation gap from [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md); leave that item open unless a separate story explicitly owns it.
- Do not resolve unrelated retained-subtree enumeration, retain/wildcard delegation, copy-once identity-proof, benchmark threshold-policy, serialise-output, or lint-baseline deferred items.
- Do not relax benchmark thresholds or widen benchmark tolerance to make this story pass. If exact-hop budget accounting changes a benchmark result enough to fail the existing benchmark gate, investigate and either optimise the change or re-baseline with recorded evidence.

## Required Cost Model

Exact property/index hops must debit the shared `TraversalBudget` for every concrete runtime hop reached by the rule-driven trie:

- The root container does not count as an exact hop.
- Each existing exact property or index edge followed from one value to the next counts as one exact hop.
- Terminal exact segments count; an implementation that only debits recursive `navigateNode` calls is incomplete.
- Exact segments before and after a single-level `*` count in the same budget as wildcard enumeration.
- Equality is allowed and over-limit throws: a budget of `1` allows exactly one counted exact hop and rejects the second.
- For missing paths, charge only the concrete prefix reached before the first missing segment. Do not charge unobserved configured suffixes, and do not enumerate or charge unconfigured siblings.
- For multiple configured paths, charge the concrete trie edges actually followed during the single rule-driven call. Shared prefixes are charged when followed as runtime work, not once per rule string, and not for missing suffixes.

## Acceptance Criteria

1. **Given** a `pathDrivenOnly: true` exact-path configuration whose concrete exact-hop depth exceeds `maxDepth`
   **When** the redactor processes a matching payload
   **Then** it throws `BudgetExceededError` with code `'BUDGET_EXCEEDED'`
   **And** exactly-at-limit payloads complete without throwing
   **And** the assertion proves the rule-driven executor did not delegate to generic traversal.

2. **Given** a `pathDrivenOnly: true` exact-path configuration whose concrete exact hops exceed `maxNodes`
   **When** the redactor processes a matching payload
   **Then** it throws `BudgetExceededError` with code `'BUDGET_EXCEEDED'`
   **And** exactly-at-limit payloads complete without throwing
   **And** the assertion proves the rule-driven executor did not delegate to generic traversal.

3. **Given** a `pathDrivenOnly: true` rule-driven path containing exact segments before or after a single-level wildcard, such as `users.*.profile.secret`
   **When** the redactor processes matching payloads under tight `maxDepth` and `maxNodes` limits
   **Then** exact property/index hops around the wildcard debit the same `TraversalBudget` as wildcard enumeration
   **And** over-limit exact suffix/prefix work throws `BudgetExceededError` without delegation.

4. **Given** configured exact paths are absent at an intermediate or terminal segment
   **When** the redactor processes the payload under a tight traversal budget
   **Then** only the reached concrete prefix is charged
   **And** unobserved suffixes after the first missing segment do not cause a false `BudgetExceededError`
   **And** the payload still skips silently according to the existing missing-path contract.

5. **Given** multiple exact paths share prefixes or contain many shallow configured branches
   **When** the redactor processes a matching payload under a tight `maxNodes` limit
   **Then** the budget reflects concrete rule-driven work performed by the trie walk
   **And** shared prefixes, repeated branches, and terminal hops cannot bypass `maxNodes`.

6. **Given** a hostile accessor or non-budget runtime error occurs during rule-driven navigation
   **When** fallback is still allowed
   **Then** only non-budget errors can delegate; `BudgetExceededError` must always propagate.

7. **Given** retained-subtree budget behaviour is referenced by this story
   **When** verification is completed
   **Then** the story either adds focused retained-subtree `maxDepth` and `maxNodes` propagation tests
   **Or** narrows any coverage claim so retained-subtree budget tests are not overstated as already complete.

8. **Given** budget semantics are updated
   **When** architecture docs and the deferred-work audit are updated
   **Then** they describe the rule-driven cost model accurately without claiming identical node totals to the generic traversal.
   **And** the exact-path budget audit item is marked addressed with validation evidence.

9. **Given** this story changes rule-driven hot-path accounting
   **When** implementation is complete
   **Then** all benchmark contract tests, benchmark production commands, and benchmark verification commands pass for every benchmark manifest row
   **And** no benchmark threshold is relaxed without recorded measurement evidence and reviewer-visible rationale.

## Tasks / Subtasks

- [x] Add focused failing tests for exact-path `maxDepth` and `maxNodes` bypasses using `buildPathDrivenExecutor(plan, failOnDelegation)` or an equivalent fallback spy.
- [x] Assert `compileRedactorPlan(options).pathDrivenOnly === true` in all rule-driven budget tests.
- [x] Keep `serialise` absent or false in rule-driven executor budget tests; `serialise: true` intentionally uses generic traversal.
- [x] Add boundary tests for exactly-at-limit versus over-limit exact paths. Include examples that isolate depth from node failures by setting the non-targeted limit high.
- [x] Add tests proving terminal exact segments count, for example `paths: ['a']` with `maxDepth: 1` / `maxNodes: 1` succeeds and `paths: ['a.b']` with the same targeted limit fails.
- [x] Add tests for exact segments around single-level wildcard paths, for example `users.*.profile.secret`, proving exact suffix/prefix hops debit budget in addition to wildcard enumeration.
- [x] Add missing-path tests for absent intermediate and absent terminal segments, proving unobserved configured suffixes do not inflate the budget.
- [x] Add aggregate `maxNodes` tests for multiple exact paths, including shared-prefix paths and many shallow configured branches.
- [x] Add retained-subtree budget tests if retaining the claim that retained-subtree budget coverage exists; otherwise narrow the story and docs wording to avoid overclaiming.
- [x] Update [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts) so exact property/index hops participate in `TraversalBudget`.
- [x] Preserve current wildcard and retained-subtree budget behaviour.
- [x] Ensure `isBudgetExceededError` still causes propagation from `buildPathDrivenExecutor`.
- [x] Update [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) with the rule-driven cost model. Do not claim identical node totals to generic traversal.
- [x] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md): mark the exact-path budget item addressed, remove stale "revisit if exact-path budget parity becomes required" wording, and leave unrelated deferred items unchanged unless this story explicitly resolved them.
- [x] Run the benchmark contract tests, production gate, and verification gate for every manifest row without relaxing thresholds.

### Review Findings

- [x] [Review][Patch] Retained object exact overrides can bypass `maxNodes` [src/core/runtime/navigate-exact-paths.ts:639]
- [x] [Review][Patch] Exact index-hop budget coverage is missing [test/security/traversal-safety.test.ts:142]
- [x] [Review][Patch] Missing-path tests do not prove reached prefixes are charged [test/security/traversal-safety.test.ts:251]
- [x] [Review][Patch] Missing-path documentation overstates isolation from other rules [docs/architecture/rule-driven-traversal.md:16]

## Dev Notes

Avoid forcing generic and rule-driven traversal to throw at the same raw node count. The required behaviour is that configured rule-driven work is bounded and deterministic. The exact-hop counter should map to `O(P + ΣK)` rule-driven work, where `P` is concrete configured property/index hops reached and `ΣK` is existing wildcard enumeration work. It must not accidentally count every unconfigured sibling.

Use direct executor tests for non-delegation assertions. Public `deepRedact` calls alone can mask a broken rule-driven path if fallback delegates to generic traversal and the generic traversal throws the same `BudgetExceededError`.

The current budget helper permits equality and throws only after the count is greater than the configured limit. Preserve that boundary unless a wider safety-limit story explicitly changes it.

Likely files:

- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
- [src/core/runtime/traversal-budget.ts](src/core/runtime/traversal-budget.ts)
- [test/security/traversal-safety.test.ts](test/security/traversal-safety.test.ts)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)
- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md)
- [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md)

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/security/traversal-safety.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-manifest.test.ts test/contract/benchmarks/benchmark-artefacts.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm run bench:produce`
- `source .agents/initialise-env.sh && pnpm run verify:benchmarks`

## Dev Agent Record

### Implementation Plan

- Add focused direct-executor budget tests that prove exact hops charge `maxDepth` and `maxNodes` without delegating.
- Add exact-hop accounting around concrete trie property/index edges while preserving wildcard enumeration and retained-subtree traversal.
- Update the rule-driven traversal contract and deferred-work audit to describe concrete reached-work accounting rather than generic traversal parity.
- Regenerate benchmark artefacts and benchmark results documentation after the hot-path accounting change.

### Debug Log

- RED: `source .agents/initialise-env.sh && pnpm exec vitest run test/security/traversal-safety.test.ts --reporter=verbose` failed on the new exact-hop over-limit assertions before implementation.
- GREEN: exact-hop budget guard added to property and index trie edges; targeted security tests then passed.
- Broader contract run exposed a stale wildcard budget boundary in `test/contract/api/create-redactor.test.ts`; updated it so `*.x` counts wildcard enumeration plus the exact suffix hop.
- `pnpm exec tsc --noEmit` initially failed because a Vitest fallback spy inferred a zero-argument tuple; typed the fallback callback parameter as `unknown`.
- `pnpm run verify:benchmarks` initially failed because `docs/benchmarks/results.md` was out of date after `bench:produce`; regenerated it with `pnpm run bench:generate-doc` and reran verification successfully.
- REVIEW RED: `source .agents/initialise-env.sh && pnpm exec vitest run test/security/traversal-safety.test.ts --reporter=verbose` failed on retained-subtree exact override `maxNodes` accounting.
- REVIEW GREEN: retained object keys now debit `maxNodes` before exact override handling; index-hop and missing-prefix charge coverage were added; focused security, rule-driven contract, build, type-check, and benchmark contract checks passed.

### Completion Notes

- Rule-driven exact property/index hops now debit the shared traversal budget before reading the reached value, incrementing path-scoped depth and aggregate node work.
- Missing exact paths skip without charging unobserved suffixes, while shared prefixes and multiple shallow configured branches aggregate concrete trie work.
- Retained-subtree exact overrides now charge `maxNodes` consistently with inherited retained leaves and retained array entries.
- `BudgetExceededError` propagates out of the rule-driven executor without fallback; hostile non-budget accessor errors can still delegate.
- Retained-subtree budget propagation is covered by focused `maxDepth` and `maxNodes` tests.
- Architecture docs and the deferred-work audit now describe the exact-hop cost model and the addressed audit item with validation evidence.
- Benchmark thresholds were not relaxed; benchmark artefacts and results documentation were regenerated from the production benchmark command.

## File List

- `_bmad-output/implementation-artifacts/8-9-enforce-rule-driven-budget-accounting-for-exact-path-hops.md`
- `_bmad-output/implementation-artifacts/deferred-work-audit.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `dist/index.js`
- `docs/architecture/rule-driven-traversal.md`
- `docs/benchmarks/results.md`
- `src/core/runtime/navigate-exact-paths.ts`
- `test/artefacts/benchmarks/path-based-single-object-json-stringify-regex-node24.json`
- `test/artefacts/benchmarks/path-based-single-object-serialised-fast-redact-node24.json`
- `test/artefacts/benchmarks/path-based-single-object-v3-node24.json`
- `test/artefacts/benchmarks/wildcard-single-object-fast-redact-node24.json`
- `test/artefacts/benchmarks/wildcard-single-object-json-stringify-regex-node24.json`
- `test/artefacts/benchmarks/wildcard-single-object-v3-node24.json`
- `test/contract/api/create-redactor.test.ts`
- `test/security/traversal-safety.test.ts`

## Change Log

- 2026-06-05: Implemented rule-driven exact-hop budget accounting, added focused traversal safety coverage, updated cost-model documentation and audit status, regenerated benchmark artefacts/results, resolved review findings, and moved story to done.
