# Story 9.1: Restore the Value-Type Allowlist (`types`) with String-Only Default

Status: ready-for-dev

## Story

As a backend engineer,
I want to restrict redaction to specified value types, defaulting to strings only,
so that I can control which runtime value types are eligible for redaction exactly as I could in v3, without a configured rule forcing redaction of an ineligible type.

## Context

Deep Redact v3 exposed a `types` option (default `['string']`) that gated whether a value was eligible for redaction. The guard sat inside v3's `redactValue` ahead of the per-key config, so a matched key holding a non-string value was left untouched under the default. v4.0.0 dropped the option: it is absent from `rootOptionNames`, and `applyRedaction` redacts a matched value regardless of `typeof`. The inverse-polarity `ignoredValueTypes` is not a substitute — it only toggles structured constructors at the serialise stage, not a general `typeof` allowlist.

This story restores `types` with strict v3 parity. Because v4 has not been publicly released, restoring the v3 string-only default is not a breaking change.

**Design decisions (see architecture "v3 Capability Parity Restoration"):**

- The allowlist is **authoritative over every redaction source** — exact-key, regex-key, exact-path, dynamic-path, and whole-value substring rules — and is enforced at the single leaf-replacement boundary shared by both engines. Type eligibility outranks rule match; a path or key rule cannot override it.
- A type-vetoed value is **returned raw and routed as if unmatched**. Scalars (including transformable runtime values such as `Date`/`BigInt`/`Map`) pass through untouched; a vetoed container is traversed normally so descendant rules and descendant transformables are still handled.
- **Transformation is unchanged and serialise-gated.** Because transformation is an output-stage concern owned by the serialise adapter (Story 8.3), a type-vetoed value is transformed when `serialise: true` and returned raw otherwise — identical to a non-configured value of the same type. The allowlist suppresses redaction only, never transformation.
- The change must be **performance-neutral**: a single O(1) lookup at points where a rule has already matched a value, off the per-node hot path and outside the path-driven navigation. No benchmark overhead threshold may change.

## Acceptance Criteria

1. **Given** a redactor created with no `types` option
   **When** a configured key or path targets a non-string value
   **Then** string values at configured targets are redacted
   **And** non-string values at configured targets are left unchanged (string-only default, matching v3).

2. **Given** `types: ['string', 'number']`
   **When** redaction runs
   **Then** string and number values at configured targets are redacted
   **And** values of other types at configured targets are left unchanged.

3. **Given** any targeting mode — exact key, regex key, exact path, dynamic path, or whole-value substring rule — targeting a value whose type is not permitted by `types`
   **When** redaction runs
   **Then** the value is not redacted by that rule (type eligibility outranks rule match)
   **And** no path or key rule can override the type allowlist.

4. **Given** an identical `types`-filtered configuration expressed once as a path-driven-eligible shape and once as a generic-traversal shape
   **When** each redacts the same payload
   **Then** the output is identical (both engines enforce the allowlist at the shared boundary).

5. **Given** `types` that excludes `object`/`Date` and a configured path targeting a `Date`
   **When** `serialise: true`
   **Then** the `Date` is not redacted but is transformed into its documented serialised marker
   **And** when `serialise: false` the `Date` is returned raw, byte-identical to an unmatched `Date`.

6. **Given** `types` that excludes `object` and a key rule matching a plain-object value
   **When** redaction runs
   **Then** the object is not wholesale-redacted
   **And** it is traversed so descendant string leaves are still redacted per their rules.

7. **Given** a `types` value that is not an array of supported type-name strings
   **When** the redactor is created
   **Then** initialisation fails with a structured validation error.

8. **Given** the benchmark suite at the default `types`
   **When** benchmarks run
   **Then** no benchmark overhead threshold is changed
   **And** the existing `maxOverheadPct` rows still pass
   **And** `types` is compiled once into an immutable `typeof`-keyed O(1) lookup with no runtime array scan.

## Tasks / Subtasks

- [ ] Add a `ValueTypeName` union (`'string' | 'number' | 'bigint' | 'boolean' | 'object' | 'function' | 'symbol' | 'undefined'`) and `readonly types?: readonly ValueTypeName[]` to `DeepRedactOptions` in [src/types/config.ts](src/types/config.ts); re-export the type through [src/types/public.ts](src/types/public.ts) and [src/index.ts](src/index.ts).
- [ ] Add `types` to `rootOptionNames` and validate it is an array of supported type-name strings, rejecting unknown names, in [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts).
- [ ] Create `src/core/compiler/compile-value-types.ts`, mirroring [src/core/compiler/compile-ignored-value-types.ts](src/core/compiler/compile-ignored-value-types.ts): an unset option compiles the string-only default; the output is an immutable `typeof`-keyed boolean lookup (`CompiledValueTypesPlan`).
- [ ] Add a non-optional `valueTypes: CompiledValueTypesPlan` to `CompiledRedactorPlan` and wire `compileValueTypes(options.types)` in `compileRedactorPlan` ([src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)).
- [ ] Add an exported `isRedactableType(value, valueTypes)` predicate in [src/core/replacement/apply-redaction.ts](src/core/replacement/apply-redaction.ts).
- [ ] Gate the generic engine: fold the predicate into the wholesale-redaction-vs-traverse guard in `transformNode`/`applyConfiguredRedaction` ([src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts)). A scalar veto returns the raw value with `changed: false`; a container veto falls through to normal traversal. Gate before `buildFunctionCensorContext` so a veto skips context allocation.
- [ ] Gate the rule-driven engine: apply the predicate in the three terminal apply helpers in [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts) (exact-terminal, wildcard-terminal, inherited-retain). A veto returns the raw value, never a redaction.
- [ ] Add contract tests in [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts): string-only default; multi-type allowlist; authority across all targeting modes; cross-engine parity (AC 4); `Date` veto transformed under `serialise: true` and raw under `serialise: false` (AC 5); container veto descends (AC 6); validation failure (AC 7); the matched-but-vetoed ≡ unmatched invariant across `Date`/`Map`/`BigInt`.
- [ ] Add a unit test for `compile-value-types` under [test/unit/core/compiler/](test/unit/core/compiler/) (run it explicitly — `test/unit/**` is not part of `pnpm run test`).
- [ ] **Sweep existing v4 tests and fixtures** for assertions that redact a non-string value at a matched key/path: under the string-only default these now leave the value unchanged, so regenerate the expected outputs. A contract test that still passes only because it never exercised a non-string target is a coverage gap to close, not evidence of correctness.
- [ ] Run `pnpm run bench` and `pnpm run verify:benchmarks`; confirm no `maxOverheadPct` threshold changed and existing rows pass (AC 8).
- [ ] Update capability documentation and record the value-type-allowlist gap as addressed in [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md).

## Dev Notes

Likely files:

- [src/types/config.ts](src/types/config.ts)
- [src/types/public.ts](src/types/public.ts)
- [src/index.ts](src/index.ts)
- [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts)
- [src/core/compiler/compile-value-types.ts](src/core/compiler/compile-value-types.ts) (new)
- [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)
- [src/core/replacement/apply-redaction.ts](src/core/replacement/apply-redaction.ts)
- [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts)
- [src/core/runtime/navigate-exact-paths.ts](src/core/runtime/navigate-exact-paths.ts)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)

Enforce the gate at the **single shared leaf-replacement boundary** so both engines behave identically; do not implement it only in the generic engine, or path-driven and generic configs for the same logical rule would diverge. The veto must return the pristine original value and must never substitute a placeholder or mark the value redacted — the serialise adapter relies on finding the raw value to transform it. Do not relax any benchmark threshold to absorb the gate; if a path-driven row creeps toward its ceiling, hoist the predicate rather than raising the ceiling.

`types` and `ignoredValueTypes` are orthogonal: `types` decides redaction eligibility during traversal; `ignoredValueTypes` and transformer dispatch act later at the serialise stage. They never override each other.

**Dominant risk:** flipping the default to `['string']` changes the expected output of every existing test and fixture that currently redacts a non-string value. Sweep exhaustively and regenerate expected outputs rather than relaxing assertions.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm exec vitest run test/unit/core/compiler/ --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm lint`
- `source .agents/initialise-env.sh && pnpm run bench && pnpm run verify:benchmarks`

## Dev Agent Record

### Debug Log

### Completion Notes

### File List

### Change Log
