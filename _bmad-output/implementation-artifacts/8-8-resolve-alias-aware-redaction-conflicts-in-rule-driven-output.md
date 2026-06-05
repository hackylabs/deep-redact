# Story 8.8: Resolve Alias-Aware Redaction Conflicts in Rule-Driven Output

Status: ready-for-dev

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

## Story

As a security-conscious backend engineer,
I want alias-aware redaction conflicts to be detected, documented, and resolved consistently,
so that rule-driven output cannot silently apply the wrong retain policy or leak a sensitive value through another branch of the same object graph.

## Context

The deferred-work audit records two critical alias issues:

- `resolveRetainTerminal` first-wins alias behaviour: two configured paths can resolve to the same runtime object identity and the first retained copy is reused before the second rule's policy is applied.
- Cross-branch alias leak: with `paths: ['a.secret']` and a payload where `b.ref` points at `a`, `b.ref.secret` can remain raw because the rule-driven path only visits configured positions.

Both issues are tied to object identity and the rule-driven engine's deliberate choice not to visit unconfigured branches. The selected release contract is path-correct structured output, not identity-wide secrecy. Runtime redaction should remain non-throwing except for `BudgetExceededError`; release-facing documentation must make clear that identity-wide secrecy requires key-based rules or explicit coverage for every alias path.

## Source Audit Items Covered

- **Critical:** `resolveRetainTerminal` first-wins alias behaviour.
- **Critical:** cross-branch alias leaks an unconfigured-path value under exact-path configuration.
- **Major contract dependency:** structured output path-correctness versus identity-wide redaction must be made explicit before v4 release.

## Acceptance Criteria

1. **Given** two configured retain paths resolve to the same object identity at runtime
   **When** the payload is processed under structured output
   **Then** each configured path is resolved path-correctly and applies its own configured policy
   **And** the second rule's policy is not silently dropped
   **And** if preserving both configured policies requires breaking source identity sharing in the returned structure, the release-facing contract documents that structured output is path-correct rather than identity-preserving
   **And** the observed result is pinned by a named regression test using distinct censors such as `FIRST` and `SECOND`.

2. **Given** a configured exact path redacts `a.secret` and another branch aliases `a`
   **When** the payload is redacted under structured output
   **Then** the configured path `a.secret` is redacted
   **And** unconfigured alias paths are not silently relied upon for identity-wide secrecy
   **And** release-facing documentation states that identity-wide secrecy requires key-based rules or explicit coverage for every alias path
   **And** focused tests pin both the configured path and the unconfigured alias path.

3. **Given** alias semantics are resolved under the path-correct contract
   **When** docs and tests are reviewed
   **Then** [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) describes the structured-output alias boundary
   **And** runtime redaction still throws only `BudgetExceededError`.

4. **Given** the implementation introduces a runtime fallback for a path-correct alias case
   **When** that fallback is triggered
   **Then** tests prove the fallback does not leak configured source values, does not mutate input, and remains bounded by traversal budgets.

## Tasks / Subtasks

- [ ] Add failing tests for the exact reproductions recorded in the audit:
  - two retain rules resolving to one object identity and using different censors;
  - `paths: ['a.secret']` with `b.ref` aliasing `a`.
- [ ] Document the supported structured-output alias contract as path-correct rather than identity-wide.
- [ ] Implement the smallest source change that satisfies the path-correct configured-path contract.
- [ ] Add release-facing documentation that identity-wide secrecy requires key-based rules or explicit alias-path coverage.
- [ ] If runtime fallback is used for a path-correct alias case, add tests that `BudgetExceededError` still propagates rather than being converted to fallback output.
- [ ] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) when both alias entries are addressed or consciously reclassified.

## Dev Notes

Likely files:

- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts) for `resolveRetainTerminal`, `resolveRetainTerminalWildcard`, ancestor copy handling, and fallback decisions.
- [src/core/create-redactor.ts](src/core/create-redactor.ts) for public routing constraints.
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) for observable API regressions.
- [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md) for the final contract.

Do not treat this as a pure performance problem. If the fix requires trading some path-driven speed for correctness in alias-risk cases, correctness wins for v4 release readiness.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/security/traversal-safety.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
