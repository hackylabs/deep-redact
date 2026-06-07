# Story 8.8: Resolve Alias-Aware Redaction Conflicts in Rule-Driven Output

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Story

As a security-conscious backend engineer,
I want alias-aware redaction conflicts to be detected, documented, and resolved consistently,
so that rule-driven output cannot silently apply the wrong retain policy or leak a sensitive value through another branch of the same object graph.

## Context

Epic 8 replaces the full payload walk for path-driven configurations with a rule-driven engine that follows configured paths only. That design is intentional and performant, but aliasing exposes two unresolved release risks:

- Two configured `retainStructure: true` paths can resolve to the same source object identity. The current `ancestorCopies` reuse in [src/core/runtime/navigate-exact-paths.ts](../../src/core/runtime/navigate-exact-paths.ts) can replay the first retained copy before the second rule's policy has been applied.
- A configured exact path such as `a.secret` does not make every runtime alias of `a` secret by implication. With `{ a: shared, b: { ref: shared } }`, an unconfigured branch such as `b.ref.secret` is outside the path-driven target set unless the caller also configures that alias path or uses breadth-visiting targeting such as key rules.

The release contract remains path-correct structured output, not identity-wide secrecy. This story must make that contract executable and explicit: configured paths must apply their own policy even when source identities are shared, while unconfigured alias branches must be documented and tested as a caller policy boundary rather than left as a silent assumption.

## Source Audit Items Covered

- **Critical:** `resolveRetainTerminal` first-wins alias behaviour in [src/core/runtime/navigate-exact-paths.ts](../../src/core/runtime/navigate-exact-paths.ts).
- **Critical:** `resolveRetainTerminalWildcard` has the same source-identity reuse risk for concrete wildcard retain terminals.
- **Critical:** cross-branch alias under exact-path configuration can expose an unconfigured alias value unless the caller uses explicit alias-path coverage or key-based targeting.
- **Contract reconciliation:** [_bmad-output/implementation-artifacts/deferred-work-audit.md](deferred-work-audit.md) currently describes the retain conflict as an initialisation-time throw candidate. Reconcile that entry with the Epic 8.8 acceptance criteria: runtime redaction must remain non-throwing except for `BudgetExceededError`, and payload-dependent aliases cannot generally be known at `createRedactor` initialisation.

## Acceptance Criteria

1. **Given** two configured exact retain paths resolve to the same object identity at runtime
   **When** the payload is processed under structured output
   **Then** each configured path is resolved path-correctly and applies its own configured policy
   **And** the second rule's policy is not silently dropped
   **And** if preserving both configured policies requires breaking source identity sharing in the returned structure, the release-facing contract documents that structured output is path-correct rather than identity-preserving
   **And** the observed result is pinned by a named regression test using distinct censors such as `FIRST` and `SECOND`.

2. **Given** two configured wildcard retain terminals resolve to the same object identity at runtime through different concrete matched paths
   **When** the payload is processed under structured output
   **Then** each concrete wildcard match applies the policy and function-censor context for its own matched path
   **And** source-identity copy reuse cannot cause the first concrete retained output to be replayed for the second concrete path
   **And** tests cover both literal censors and at least one function censor whose output depends on `ctx.matchedPath`.

3. **Given** a configured exact path redacts `a.secret` and another branch aliases `a`
   **When** the payload is redacted under structured output
   **Then** the configured path `a.secret` is redacted
   **And** the unconfigured alias path is not silently treated as covered by `a.secret`
   **And** release-facing documentation states that identity-wide secrecy requires key-based rules or explicit coverage for every alias path
   **And** focused tests pin the configured path, the unconfigured alias-path boundary, and the recommended key-rule or explicit-alias-path configuration.

4. **Given** alias semantics are resolved under the path-correct contract
   **When** docs and tests are reviewed
   **Then** [docs/architecture/rule-driven-traversal.md](../../docs/architecture/rule-driven-traversal.md) describes the structured-output alias boundary
   **And** [docs/architecture/serialise-output.md](../../docs/architecture/serialise-output.md) remains consistent with that boundary for `serialise: true`
   **And** generated or release-facing docs are updated from their source templates if the public guidance is added there.

5. **Given** the implementation introduces delegation or another runtime fallback for an alias-risk case
   **When** that fallback is triggered
   **Then** tests prove the fallback does not leak configured source values, does not mutate input, and does not convert `BudgetExceededError` into fallback output
   **And** exact-hop budget accounting remains owned by Story 8.9 rather than being expanded here.

6. **Given** alias handling has changed
   **When** [_bmad-output/implementation-artifacts/deferred-work-audit.md](deferred-work-audit.md) is reviewed
   **Then** both alias entries are updated to addressed or explicitly reclassified with the final contract
   **And** no unrelated open audit item is removed.

## Tasks / Subtasks

- [x] Add failing exact-retain alias tests in [test/contract/api/create-redactor.test.ts](../../test/contract/api/create-redactor.test.ts):
  - [x] Use a shared source object, for example `{ first: shared, second: shared }`.
  - [x] Configure two retain rules with distinct censors, for example `{ path: 'first', retainStructure: true, censor: 'FIRST' }` and `{ path: 'second', retainStructure: true, censor: 'SECOND' }`.
  - [x] Assert `first` and `second` each contain their own censored leaves, the second rule does not receive the first rule's output, and the input object is unchanged.
- [x] Add wildcard-retain alias tests:
  - [x] Use aliases reached through different concrete wildcard matches.
  - [x] Include a function censor that returns from `ctx.matchedPath` so incorrect copy replay is observable.
  - [x] Prove concrete `matchedPath`, `rulePath`, and `terminalKey` remain equivalent to the generic traversal.
- [x] Add cross-branch alias-boundary tests:
  - [x] `paths: ['a.secret']` redacts `a.secret` and pins the documented status of `b.ref.secret` when `b.ref` aliases `a`.
  - [x] `paths: ['a.secret', 'b.ref.secret']` redacts both configured alias paths.
  - [x] `keys: ['secret']` redacts both branches through the generic traversal and is documented as the identity-wide secrecy route.
  - [x] Include `serialise: true` coverage where relevant so the serialise adapter contract and docs stay aligned.
- [x] Implement the smallest runtime change that satisfies configured-path correctness:
  - [x] Start in `resolveRetainTerminal` and `resolveRetainTerminalWildcard`.
  - [x] Treat `ancestorCopies` as an ancestor-copy mechanism, not as a blanket completed-output cache across different effective retain contexts.
  - [x] Preserve hot-path behaviour for non-aliased exact and wildcard configurations.
  - [x] Do not add a new public API, new dependency, or hidden restore/metadata mechanism.
- [x] Update documentation:
  - [x] Add a structured-output alias boundary section to [docs/architecture/rule-driven-traversal.md](../../docs/architecture/rule-driven-traversal.md).
  - [x] Cross-check [docs/architecture/serialise-output.md](../../docs/architecture/serialise-output.md) for any contradictory alias wording.
  - [x] If README or generated guidance changes, edit the source template and run generated-file verification.
- [x] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](deferred-work-audit.md) for the two alias items when complete.

### Review Findings

- [x] [Review][Patch] Wildcard retained-copy cache key can collide for legal concrete paths [src/core/runtime/navigate-exact-paths.ts:138]

## Dev Notes

### Architecture Guardrails

- The public API is `deepRedact(options)` with `createRedactor(options)` as the named alias. Do not introduce a new alias option or runtime mode for this story. [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- `pathDrivenOnly: true` applies only to exact paths and safe single-level `*` paths, with no `**`, key rules, substring rules, fuzzy matching, or case-insensitive key matching. Compile-time routing lives in [src/core/compiler/compile-redactor-plan.ts](../../src/core/compiler/compile-redactor-plan.ts). [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- Runtime state is per invocation only. Do not cache user payloads or alias decisions across calls. [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Structured output may break source identity sharing when the same input identity is reached through different effective rule contexts. Path-correct output takes priority over alias preservation. [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- Runtime redaction must remain non-throwing after successful initialisation except for `BudgetExceededError`; function-censor failures degrade to `[UNSUPPORTED]` with sanitised diagnostics. [Source: _bmad-output/planning-artifacts/architecture.md#Security & Runtime Contract]
- The hot path must avoid `structuredClone`, full-graph cloning, per-call rule recompilation, and public metadata handles. [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]

### Implementation Hotspots

- [src/core/runtime/navigate-exact-paths.ts](../../src/core/runtime/navigate-exact-paths.ts)
  - `resolveRetainTerminal` and `resolveRetainTerminalWildcard` currently return an existing `ancestorCopies` entry for a reused source identity before applying the later retain policy.
  - `navigateNode` uses `ancestorCopies` for copy-on-change across shared ancestors. Preserve that useful ancestor-copy behaviour for same effective context; do not let it replay stale retained output across different retain policies or concrete wildcard contexts.
  - `buildPathDrivenExecutor` already rethrows `BudgetExceededError` and delegates other runtime failures. If this story adds fallback paths, keep that distinction.
- [src/core/runtime/redact-value.ts](../../src/core/runtime/redact-value.ts)
  - Generic traversal has completed-identity records keyed by effective rule context. Reuse the idea if needed, but avoid copying the whole generic traversal into the rule-driven engine.
  - Check `buildRuleContextKey`, `resolveCompletedTraversal`, and `storeCompletedTraversal` before inventing a second concept for effective rule context.
- [src/core/create-redactor.ts](../../src/core/create-redactor.ts)
  - `serialise: true` intentionally routes through the general traversal before `serialiseOutput` so the adapter receives cycle information. Do not undo that for performance in this story.
- [test/fixtures/exact-path-equivalence/index.ts](../../test/fixtures/exact-path-equivalence/index.ts)
  - Existing exact-path canaries include retain-structure alias replay. Add focused alias-conflict coverage where it provides clearer expected output, but preserve existing canary intent.

### Documentation Guardrails

- [docs/architecture/rule-driven-traversal.md](../../docs/architecture/rule-driven-traversal.md) already says non-configured positions are not visited. Add the alias boundary there rather than scattering the contract across unrelated docs.
- [docs/architecture/one-way-redaction.md](../../docs/architecture/one-way-redaction.md) covers values selected by the configured redaction policy. Do not imply Deep Redact can prove identity-wide secrecy for paths the caller did not configure.
- [docs/platform/standardisation-guide.md](../../docs/platform/standardisation-guide.md) and generated README content are release-facing only if the guidance is added to their source artefacts and generated outputs stay locked.

### Previous Story Intelligence

- Story 8.7 removed stale compiled-executor and v3-era references. Use "rule-driven" or "path-driven executor" terminology only; do not reintroduce old execution-mode names in live source, tests, or docs.
- Story 8.7 confirmed baseline `pnpm lint` remains red before Story 8.10 because of existing lint violations in `src/core/replacement/serialise-output.ts` and `src/core/runtime/navigate-exact-paths.ts`. Run focused ESLint on changed files where practical, but do not claim full lint is green unless it actually is.
- Story 8.9 owns exact-path hop budget accounting. This story may add regression assertions that `BudgetExceededError` is not swallowed by alias fallback, but it must not broaden into the exact-hop budget implementation.

### Recent Git Intelligence

- Recent work completed rule-driven cleanup and removed dead v3 utility/test roots (`c2ea83c chore(cleanup): remove dead code`). Current tests and docs should not point at deleted files such as `test/unit/standardTransformers.test.ts` or `src/utils/**`.
- Recent course-correction commits updated deferred-work status and completed rule-driven substring integration. Treat [_bmad-output/implementation-artifacts/deferred-work-audit.md](deferred-work-audit.md) as the live follow-up register.

### Latest Technical Information

No external library or API research is needed for this story. The implementation is confined to the local runtime, tests, and documentation. Use the pinned project toolchain from the repository:

- Node `24.14.1`, initialised via `source .agents/initialise-env.sh`
- `pnpm@10.33.0`
- Vitest `4.1.4`
- ESLint `9.39.4` with project config

## Project Structure Notes

- Planning artefacts stay under [_bmad-output/planning-artifacts](../planning-artifacts); do not move PRD, architecture, or epic material into `docs/`.
- Implementation story artefacts stay under [_bmad-output/implementation-artifacts](.).
- Runtime changes belong in `src/core/runtime/`; output serialisation changes belong in `src/core/replacement/`; public type/API changes are out of scope.
- Tests for observable API and cross-mode equivalence belong in [test/contract/api/create-redactor.test.ts](../../test/contract/api/create-redactor.test.ts) unless a smaller existing fixture file is a clearer fit.
- Security budget tests belong in [test/security/traversal-safety.test.ts](../../test/security/traversal-safety.test.ts), but only add alias-fallback budget propagation there if the runtime change touches fallback.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts --reporter=verbose`
- If alias fallback touches budget handling: `source .agents/initialise-env.sh && pnpm exec vitest run test/security/traversal-safety.test.ts --reporter=verbose`
- If generated docs or README outputs change: `source .agents/initialise-env.sh && pnpm run verify-generated-files`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm run test`
- Focused lint on changed files where practical. Full `pnpm lint` is expected to remain baseline-red until Story 8.10 unless the implementation also fixes those existing violations.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "applies each exact retain policy"` failed before the runtime fix, proving the exact retain alias regression (`second` received `FIRST` output).
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "wildcard retain"` failed before the runtime fix, proving wildcard literal and function-censor alias replay.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "unconfigured alias branches|every exact alias path|identity-wide"` passed, pinning the documented alias boundary and the explicit/key-rule routes.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "applies each exact retain policy|wildcard retain|concrete wildcard retain matched path"` passed after the runtime fix.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "distinguishes wildcard retain concrete paths whose keys contain cache delimiters"` failed during review, proving the wildcard matched-path cache key collision (`users.a["b\nstring:c"].secret` received the first alias path output).
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose -t "distinguishes wildcard retain concrete paths whose keys contain cache delimiters"` passed after switching the cache key to JSON-encoded typed path segments.
- `source .agents/initialise-env.sh && pnpm run build` passed after the review patch, regenerating tracked build output.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` passed: 502 tests.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/rule-driven-traversal-contract.test.ts --reporter=verbose` passed: 19 tests.
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` passed.
- `source .agents/initialise-env.sh && pnpm run test` passed: build, generated-file verification, and 649 contract/security tests.
- `source .agents/initialise-env.sh && pnpm exec eslint src/core/runtime/navigate-exact-paths.ts test/contract/api/create-redactor.test.ts` remains red only on the known baseline `unicorn/no-new-array` sparse-array copy rule in `src/core/runtime/navigate-exact-paths.ts`.

### Completion Notes List

- Added exact retain alias regression coverage with distinct `FIRST`/`SECOND` censors and confirmed the failing behaviour before implementation.
- Added wildcard retain alias coverage for both literal censors and function censors that depend on concrete `ctx.matchedPath`, with context equivalence checked against the generic traversal.
- Added review-found collision coverage for wildcard retain matches whose concrete keys contain delimiter-like text, and changed the ancestor-copy matched-path key to preserve segment boundaries and segment types.
- Added cross-branch alias-boundary tests for unconfigured alias paths, explicit alias-path coverage, key-based identity-wide targeting, and `serialise: true` alignment.
- Reworked rule-driven `ancestorCopies` into context-aware per-call records keyed by source identity plus trie context and concrete wildcard path, so retained aliases can break identity sharing when path correctness requires it.
- Documented the path-correct alias boundary and tightened serialised-output wording so the adapter does not imply broader redaction coverage than the configured policy.
- Reclassified the two alias entries in the deferred work register without removing unrelated open items.

### File List

- _bmad-output/implementation-artifacts/8-8-resolve-alias-aware-redaction-conflicts-in-rule-driven-output.md
- _bmad-output/implementation-artifacts/deferred-work-audit.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- docs/architecture/rule-driven-traversal.md
- docs/architecture/serialise-output.md
- src/core/runtime/navigate-exact-paths.ts
- test/contract/api/create-redactor.test.ts

### Change Log

- 2026-06-05: Added alias conflict tests, context-aware rule-driven ancestor copy reuse, alias boundary documentation, deferred audit reclassification, review-found wildcard cache-key collision fix, and verification notes.
