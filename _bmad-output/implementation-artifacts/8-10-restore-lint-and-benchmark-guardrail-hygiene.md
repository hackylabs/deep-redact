# Story 8.10: Restore Lint and Benchmark Guardrail Hygiene

Status: ready-for-dev

Completion note: Correct-course context analysis completed - comprehensive developer guide created.

## Story

As a release maintainer,
I want lint and benchmark guardrails to be green and meaningful,
so that Epic 8 performance claims and release gates can be trusted before v4 ships.

## Context

The deferred-work audit records that `pnpm lint` remains red at baseline: seven errors in [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts) and one `unicorn/no-new-array` error in [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts). It also records two benchmark-governance issues:

- [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts) pre-allocates 500 clones simultaneously, which can inflate cache-miss cost versus real single-call behaviour.
- Several benchmark rows use `minOverheadPct: -100`, disabling the lower regression guard that catches suspiciously fast "work elided" results.

## Source Audit Items Covered

- **Major:** `pnpm lint` baseline is red.
- **Major:** benchmark batch cache behaviour can overstate the optimised lane's cache advantage.
- **Major:** benchmark lower-overhead floors set to `-100` weaken guardrail quality.

## Acceptance Criteria

1. **Given** the repository is bootstrapped with the pinned Node and pnpm versions
   **When** `pnpm lint` runs
   **Then** it exits successfully
   **And** any intentional sparse-array exception is documented with a narrow code-local suppression rather than a broad lint disable.

2. **Given** benchmark rows compare Deep Redact with `fast-redact`, Deep Redact v3, or JSON-stringify-regex competitors
   **When** lower-overhead threshold policies are reviewed
   **Then** every `minOverheadPct` value is either meaningful for that row or explicitly justified in test-covered metadata.

3. **Given** benchmark batch execution is measured
   **When** [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts) prepares payload clones
   **Then** it avoids unrealistic simultaneous clone pre-allocation unless a focused benchmark-methodology test proves the bias is acceptable.

4. **Given** benchmark policy changes are made
   **When** verification runs
   **Then** benchmark manifest tests, benchmark artefact tests, and generated benchmark docs remain in lockstep.

5. **Given** source changes are lint-only or methodology-only
   **When** implementation is reviewed
   **Then** no redaction output behaviour changes are introduced.

## Tasks / Subtasks

- [ ] Reproduce the current lint failures with `source .agents/initialise-env.sh && pnpm lint`.
- [ ] Fix `serialise-output.ts` lint issues without changing marker semantics, getter behaviour, or custom transformer behaviour unless a lint rule exposes a real bug.
- [ ] Handle sparse-array `new Array(length)` rules with precise rationale. Do not replace it with an implementation that materialises sparse holes.
- [ ] Add or update tests for benchmark manifest threshold policy.
- [ ] Rework benchmark clone preparation or document and test why the current batch model is retained.
- [ ] Regenerate benchmark docs only if committed benchmark metadata or artefacts require lockstep.
- [ ] Update [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md).

## Dev Notes

Expected files:

- [src/core/replacement/serialise-output.ts](src/core/replacement/serialise-output.ts)
- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
- [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts)
- [test/bench/manifest.json](test/bench/manifest.json)
- [test/contract/benchmarks/benchmark-manifest.test.ts](test/contract/benchmarks/benchmark-manifest.test.ts)
- [test/contract/benchmarks/benchmark-artefacts.test.ts](test/contract/benchmarks/benchmark-artefacts.test.ts)

This story should not hide failures by weakening lint broadly or widening benchmark thresholds without evidence.

## Verification

- `source .agents/initialise-env.sh && pnpm lint`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/benchmarks/benchmark-manifest.test.ts test/contract/benchmarks/benchmark-artefacts.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
