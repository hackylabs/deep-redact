# Story 8.10: Restore Lint and Benchmark Guardrail Hygiene

Status: done

Completion note: Lint and benchmark guardrail hygiene restored, review findings patched, and verification completed under the pinned toolchain.

## Story

As a release maintainer,
I want lint and benchmark guardrails to be green and meaningful,
so that Epic 8 performance claims and release gates can be trusted before v4 ships.

## Context

The deferred-work audit still records `pnpm lint` as red, but validation on 2026-06-05 found the current repository baseline is already green with `source .agents/initialise-env.sh && pnpm lint`. Story 8.10 must therefore verify and preserve that green lint gate, then update the audit so stale lint debt is no longer reported as open.

The same validation confirmed the benchmark-governance issues remain open:

- [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts) pre-allocates 500 clones simultaneously, which can inflate cache-miss cost versus real single-call behaviour.
- Every current benchmark row uses `minOverheadPct: -100`, disabling the lower regression guard that catches suspiciously fast "work elided" results unless a separate, explicit safety signal is recorded and tested.

The review also found two guardrail gaps that must be handled in this story because they affect whether benchmark gates are meaningful:

- [scripts/verify-benchmarks.ts](scripts/verify-benchmarks.ts) only enforces threshold failures when `DEEP_REDACT_BENCH_RUN_SCOPE` is `protected-branch` or `release-candidate`, but [.github/workflows/benchmark.yml](.github/workflows/benchmark.yml) currently runs `pnpm run verify:benchmarks` without that environment variable.
- Threshold policy values are copied into committed benchmark artefacts, but the existing benchmark artefact tests do not assert manifest-threshold-to-artefact parity. A stale artefact can therefore keep old threshold decisions while generated docs still match that stale artefact.

## Source Audit Items Covered

- **Major:** deferred lint baseline entry is stale and must be revalidated, preserved green, and marked addressed in the audit if it remains green.
- **Major:** benchmark batch cache behaviour can overstate the optimised lane's cache advantage.
- **Major:** benchmark lower-overhead floors set to `-100` weaken guardrail quality.
- **Major:** benchmark threshold failures are not enforced in PR CI without a run-scope environment variable.
- **Major:** benchmark artefact tests do not prove committed threshold decisions match the current manifest.

## Explicitly Out Of Scope

The following open deferred-work items remain outside Story 8.10 unless an in-scope edit directly touches their tests or runtime paths:

- AC-5 copy-once identity-strengthening for shared exact+wildcard ancestors.
- Extra retain+wildcard delegation coverage for the second named config shape.
- Plain-object getter double-read behaviour under `serialise: true`.
- Retained-subtree `for...in` versus `Object.keys` traversal and related hot-path performance work.

## Acceptance Criteria

1. **Given** the repository is bootstrapped with the pinned Node and pnpm versions
   **When** `pnpm lint` runs
   **Then** it exits successfully
   **And** [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) no longer reports the stale red-lint baseline as open when the gate is green
   **And** any intentional sparse-array exception is documented with a narrow code-local suppression rather than a broad lint disable.

2. **Given** benchmark rows compare Deep Redact with `fast-redact`, Deep Redact v3, or JSON-stringify-regex competitors
   **When** lower-overhead threshold policies are reviewed
   **Then** every `minOverheadPct` value is either a meaningful lower bound for that row or explicitly justified with test-covered metadata, such as a required `thresholdPolicy.minOverheadRationale` field for rows that retain `-100`
   **And** the rationale names the separate safety signal that catches work-elision risk, such as output-equivalence contract coverage.

3. **Given** benchmark batch execution is measured
   **When** [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts) prepares payload clones
   **Then** it avoids unrealistic simultaneous clone pre-allocation unless a focused benchmark-methodology test proves the bias is acceptable.

4. **Given** benchmark policy changes are made
   **When** verification runs
   **Then** benchmark manifest tests, benchmark artefact tests, committed benchmark artefacts, and generated benchmark docs remain in lockstep
   **And** benchmark artefact tests fail if an artefact's `thresholdDecision` no longer matches the manifest row's current threshold policy and rationale metadata.

5. **Given** benchmark verification runs in CI
   **When** the pull-request benchmark workflow runs
   **Then** `pnpm run verify:benchmarks` executes with `DEEP_REDACT_BENCH_RUN_SCOPE=protected-branch`
   **And** the release-candidate verification command is documented and run locally with `DEEP_REDACT_BENCH_RUN_SCOPE=release-candidate`.

6. **Given** source changes are lint-only or methodology-only
   **When** implementation is reviewed
   **Then** no redaction output behaviour changes are introduced.

## Tasks / Subtasks

- [x] Revalidate the current lint baseline with `source .agents/initialise-env.sh && pnpm lint`.
- [x] If lint is green, update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) so the stale red-lint item is marked addressed with the new evidence.
- [x] If lint is unexpectedly red, fix only the current source lint failures. Preserve marker semantics, getter behaviour, custom transformer behaviour, and sparse-array hole behaviour; do not materialise holes to satisfy `unicorn/no-new-array`.
- [x] Add or update benchmark manifest tests so lower-bound policies are either meaningful or backed by required rationale metadata.
- [x] Add or update benchmark artefact tests so each committed artefact's `thresholdDecision` matches the current manifest threshold policy and any threshold-rationale metadata.
- [x] Rework benchmark clone preparation to avoid simultaneous `BATCH_SIZE` clone pre-allocation, or add a focused benchmark-methodology test and rationale proving the current batch model is acceptable.
- [x] Update [.github/workflows/benchmark.yml](.github/workflows/benchmark.yml) so PR benchmark verification sets `DEEP_REDACT_BENCH_RUN_SCOPE=protected-branch`.
- [x] Regenerate committed benchmark artefacts and [docs/benchmarks/results.md](docs/benchmarks/results.md) only when manifest metadata, threshold policy, or measured artefacts change and lockstep requires it.
- [x] If any `minOverheadPct: -100` floor remains, explicitly verify the output-equivalence contract gate that justifies relying on a separate work-elision safety signal.
- [x] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) for the benchmark batch and threshold-floor items, and leave the explicitly out-of-scope deferred items open with no status churn.

### Review Findings

- [x] [Review][Patch] Recompute artefact `thresholdDecision.passed` from current thresholds [test/contract/benchmarks/benchmark-artefacts.test.ts:76]
- [x] [Review][Patch] Reject non-positive timed benchmark samples instead of clamping to zero [scripts/benchmark-runner.ts:118]

## Dev Notes

Expected files:

- [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts)
- [scripts/verify-benchmarks.ts](scripts/verify-benchmarks.ts)
- [.github/workflows/benchmark.yml](.github/workflows/benchmark.yml)
- [test/bench/manifest.json](test/bench/manifest.json)
- [test/contract/benchmarks/benchmark-manifest.test.ts](test/contract/benchmarks/benchmark-manifest.test.ts)
- [test/contract/benchmarks/benchmark-artefacts.test.ts](test/contract/benchmarks/benchmark-artefacts.test.ts)
- [test/artefacts/benchmarks/](test/artefacts/benchmarks/)
- [docs/benchmarks/results.md](docs/benchmarks/results.md)
- [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md)

Files to avoid unless the fresh lint baseline proves they are necessary:

- [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts)
- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)

This story should not hide failures by weakening lint broadly, widening benchmark thresholds without evidence, or accepting stale committed artefacts. If threshold floors remain broad because equivalence tests catch work-elision, that dependency must be explicit in metadata and verification evidence.

## Verification

- `source .agents/initialise-env.sh && pnpm lint`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-manifest.test.ts test/contract/benchmarks/benchmark-artefacts.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && DEEP_REDACT_BENCH_RUN_SCOPE=release-candidate pnpm run verify:benchmarks`
- `source .agents/initialise-env.sh && DEEP_REDACT_BENCH_RUN_SCOPE=protected-branch pnpm run verify:benchmarks`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`

## Dev Agent Record

### Implementation Plan

- Revalidated the lint baseline first and updated the stale deferred-work audit entry only after the green run was confirmed.
- Added benchmark contract tests before implementation for lower-floor rationale metadata, manifest-to-artefact threshold parity, benchmark output equivalence, clone-preparation methodology, and PR workflow run-scope wiring.
- Updated benchmark sampling to avoid simultaneous batch clone pre-allocation while keeping clone-preparation time outside the measured redaction window.
- Regenerated benchmark artefacts and docs after manifest/threshold metadata changed.

### Debug Log

- `source .agents/initialise-env.sh && pnpm lint` passed initially on 2026-06-05.
- RED: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-manifest.test.ts test/contract/benchmarks/benchmark-artefacts.test.ts test/contract/benchmarks/benchmark-output-equivalence.test.ts --reporter=verbose` failed because `minOverheadRationale` metadata was missing from rows with `minOverheadPct: -100`.
- RED: the same focused suite then failed because committed benchmark artefacts lacked the new threshold-rationale metadata.
- RED: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-runner-methodology.test.ts --reporter=verbose` failed before runner changes because `collectSamples` was not exported.
- RED: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-workflow.test.ts --reporter=verbose` failed because the PR benchmark workflow did not set `DEEP_REDACT_BENCH_RUN_SCOPE`.
- Lint found two new test-file convention issues; fixed them with an `interface` and `structuredClone`.
- Review RED: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-artefacts.test.ts test/contract/benchmarks/benchmark-runner-methodology.test.ts --reporter=verbose` failed because `collectSamples` accepted a non-positive measured redaction window after clone-time subtraction.

### Completion Notes

- Lint remains green under Node 24.14.1 and pnpm 10.33.0; no sparse-array or source lint workaround was required.
- Benchmark rows retaining `minOverheadPct: -100` now carry `thresholdPolicy.minOverheadRationale` metadata naming the `benchmark-output-equivalence-contract` safety signal.
- Committed benchmark artefacts now include matching threshold-rationale metadata, and artefact tests assert parity with the current manifest threshold policy, including the recomputed `thresholdDecision.passed` value.
- `scripts/benchmark-runner.ts` now prepares one cloned payload at a time during timed batches, subtracts clone-preparation time from the measured window, and rejects non-positive post-subtraction samples instead of clamping them to zero.
- `scripts/verify-benchmarks.ts` now recomputes pass/fail status from the committed overhead and current manifest threshold policy before enforcing gate failures.
- The PR benchmark workflow now runs `pnpm run verify:benchmarks` with `DEEP_REDACT_BENCH_RUN_SCOPE=protected-branch`.
- In-scope deferred-work audit entries for stale lint, benchmark batch clone behaviour, and broad lower-overhead floors were marked addressed; explicitly out-of-scope deferred items were left open.

### Verification Evidence

- `source .agents/initialise-env.sh && pnpm lint` — passed.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-manifest.test.ts test/contract/benchmarks/benchmark-artefacts.test.ts --reporter=verbose` — passed.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-manifest.test.ts test/contract/benchmarks/benchmark-artefacts.test.ts test/contract/benchmarks/benchmark-output-equivalence.test.ts test/contract/benchmarks/benchmark-runner-methodology.test.ts test/contract/benchmarks/benchmark-workflow.test.ts --reporter=verbose` — passed.
- `source .agents/initialise-env.sh && DEEP_REDACT_BENCH_RUN_SCOPE=release-candidate pnpm run verify:benchmarks` — passed.
- `source .agents/initialise-env.sh && DEEP_REDACT_BENCH_RUN_SCOPE=protected-branch pnpm run verify:benchmarks` — passed.
- `source .agents/initialise-env.sh && pnpm run test` — passed: 20 test files, 666 tests.
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit` — passed.

## File List

- `.github/workflows/benchmark.yml`
- `_bmad-output/implementation-artifacts/8-10-restore-lint-and-benchmark-guardrail-hygiene.md`
- `_bmad-output/implementation-artifacts/deferred-work-audit.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/benchmarks/results.md`
- `scripts/benchmark-runner.ts`
- `scripts/verify-benchmarks.ts`
- `test/artefacts/benchmarks/path-based-single-object-json-stringify-regex-node24.json`
- `test/artefacts/benchmarks/path-based-single-object-serialised-fast-redact-node24.json`
- `test/artefacts/benchmarks/path-based-single-object-v3-node24.json`
- `test/artefacts/benchmarks/wildcard-single-object-fast-redact-node24.json`
- `test/artefacts/benchmarks/wildcard-single-object-json-stringify-regex-node24.json`
- `test/artefacts/benchmarks/wildcard-single-object-v3-node24.json`
- `test/bench/manifest.json`
- `test/contract/benchmarks/benchmark-artefacts.test.ts`
- `test/contract/benchmarks/benchmark-manifest.test.ts`
- `test/contract/benchmarks/benchmark-output-equivalence.test.ts`
- `test/contract/benchmarks/benchmark-runner-methodology.test.ts`
- `test/contract/benchmarks/benchmark-workflow.test.ts`

## Change Log

- 2026-06-05: Restored lint and benchmark guardrail hygiene, added benchmark policy/methodology/workflow contract coverage, regenerated benchmark artefacts/docs, and marked story ready for review.
- 2026-06-05: Patched review findings for stale benchmark pass/fail decisions and non-positive timed benchmark samples, then marked story done.
