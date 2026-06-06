# Story 9.2: Restore Full `KeyRule` Parity with the v3 `BlacklistKeyConfig`

Status: ready-for-dev

## Story

As a backend engineer,
I want per-key redaction overrides and string-or-regex key selectors on key rules,
so that individual keys can override global replacement and structure behaviour exactly as the v3 `BlacklistKeyConfig` allowed.

## Context

Deep Redact v3's `BlacklistKeyConfig` let each blacklisted key carry its own `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, `retainStructure`, `remove`, `replacement`, and `replaceStringByLength`, with `key: string | RegExp`. v4.0.0's `KeyRule` narrowed this to `{ key: string, fuzzyKeyMatch?, caseSensitiveKeyMatch? }` — per-key replacement/structure overrides moved to `paths`/`PathRule`, and regex keys lost any per-rule object form. This story restores full parity.

**Design decisions (see architecture "v3 Capability Parity Restoration"):**

- `KeyRule` gains `censor`, `remove`, `retainStructure`, and `replaceStringByLength`, and `key` widens to `string | RegExp`, reaching full parity with `BlacklistKeyConfig`.
- Per-key overrides **reuse** the existing `CompiledRedactionPolicy` and `mergePolicy(defaults, overrides)` mechanism already used by `PathRule`. A key rule that specifies overrides compiles a per-rule policy merged over the compiled global defaults; a key rule with no overrides carries no per-rule policy and keeps using the shared key-rule policy, preserving current behaviour exactly. No new redaction semantics are introduced.
- The widened `key` lets regex key rules carry the same overrides as literal key rules.
- The change must be **performance-neutral**: compile-time merge plus, at most, one policy selection per key match — off the per-node hot path and outside the path-driven fast lane (which contains no key rules). No benchmark overhead threshold may change.

## Acceptance Criteria

1. **Given** the public `KeyRule` type
   **When** reviewed
   **Then** it accepts `key: string | RegExp` plus `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, `censor`, `remove`, `retainStructure`, and `replaceStringByLength`, reaching parity with the v3 `BlacklistKeyConfig`.

2. **Given** a key rule with a per-key `censor`
   **When** a matching key is redacted
   **Then** that key uses the per-key censor
   **And** keys matched by rules without an override use the global default censor.

3. **Given** a key rule with `remove: true`
   **When** a matching key is redacted
   **Then** the matched key is removed from the output.

4. **Given** a key rule with `retainStructure: true` matching a container value
   **When** redaction runs
   **Then** the container's structure is retained and its descendants are redacted under the inherited policy.

5. **Given** a key rule with `replaceStringByLength: true`
   **When** a matching string value is redacted
   **Then** it is replaced with a same-length censor.

6. **Given** a regex key rule (`key: /.../`) carrying per-key overrides
   **When** a matching key is redacted
   **Then** the regex key rule's per-key overrides apply (regex keys reach the same parity as literal keys).

7. **Given** a key rule (string or regex) with no overrides
   **When** redaction runs
   **Then** it behaves exactly as before, using the shared key-rule policy, with no change to existing output.

8. **Given** `remove + censor` or `remove + retainStructure` on a key rule
   **When** the redactor is created
   **Then** initialisation fails, matching the per-path invalid-combination rules.

9. **Given** overlapping path and key rules, and multiple literal key rules matching the same key
   **When** redaction runs
   **Then** existing precedence holds (path rules outrank key rules; exact key rules outrank regex key rules)
   **And** first-match-wins among literal key rules is pinned by test.

10. **Given** the benchmark suite
    **When** benchmarks run
    **Then** no benchmark overhead threshold is changed
    **And** the path-driven fast lane is unaffected (it contains no key rules)
    **And** per-key overrides compile through the existing `CompiledRedactionPolicy` and `mergePolicy` path-rule machinery.

## Tasks / Subtasks

- [ ] Extend `KeyRule` in [src/types/config.ts](src/types/config.ts): widen `key` to `string | RegExp`; add `censor`, `remove`, `retainStructure`, `replaceStringByLength`. Keep `KeySelector = string | RegExp | KeyRule`.
- [ ] Extend `keyRuleOptionNames` and validation in [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts): validate the new per-key fields (reuse the `PathRule` field validators), accept a regex `key`, reject unsupported keys, and reject `remove + censor` / `remove + retainStructure` at the key-rule level.
- [ ] Add an optional `policy?: CompiledRedactionPolicy` to `CompiledLiteralKeyRule`; in `toLiteralKeyRule`, when a key rule specifies overrides, compute `mergePolicy(defaults, overrides)`, else leave `policy` unset. Thread `defaults` through `compileExactKeyRules` ([src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)).
- [ ] Route a `KeyRule` whose `key` is a `RegExp` to the regex matcher, not the literal matcher. `isKeyRule` currently returns true for `{ key, ... }` objects, so `compileExactKeyRules` would otherwise capture a regex-keyed rule into the literal path — split the routing on `key instanceof RegExp`. Allow `compileRegexKeyRules` to accept such a rule, carrying a per-rule `policy` from `mergePolicy` when overrides are present; keep the shared regex policy as the fallback.
- [ ] Carry the matched rule's per-rule `policy` through `DirectKeyMatchResult` and `resolveDirectKeyMatch`; at the resolution site, use `directKeyMatch.policy ?? plan.exactKeyRules.policy` (and the regex equivalent) in [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts). Confirm retain-structure descent at the key-rule policy site honours the per-key policy.
- [ ] Re-export any new/changed public types through [src/types/public.ts](src/types/public.ts) and [src/index.ts](src/index.ts).
- [ ] Add contract tests in [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts): per-key censor (string), per-key censor function with context, per-key `remove`, per-key `retainStructure` (nested), per-key `replaceStringByLength`, override-beats-global-default, regex key with overrides, no-override parity (string and regex), invalid-combination rejection, first-match-wins precedence.
- [ ] Run `pnpm run bench` and `pnpm run verify:benchmarks`; confirm no `maxOverheadPct` threshold changed and existing rows pass (AC 10).
- [ ] Record the per-key-parity gap as addressed in [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md).

## Dev Notes

Likely files:

- [src/types/config.ts](src/types/config.ts)
- [src/types/public.ts](src/types/public.ts)
- [src/index.ts](src/index.ts)
- [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts)
- [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)
- [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts)
- [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)

Reuse `mergePolicy` and `CompiledRedactionPolicy` — do not invent a parallel per-key policy path. A key rule with no overrides must keep using the shared `exactKeyRules.policy`/`regexKeyRules.policy` so existing output and the hot path are unchanged. Per-key overrides change only the policy applied once a key rule wins; they do not change rule precedence. `applyRedaction` already evaluates `remove` before `censor`, so `remove` wins where both are present at runtime, but the invalid-combination check must still reject `remove + censor` at initialisation for parity with the per-path rules. The path-driven fast lane requires zero key rules, so it is unaffected.

Coordinate with Story 9.1: a per-key `censor`/`retainStructure` still passes through the value-type allowlist at the shared leaf-replacement boundary — a per-key override does not bypass the `types` gate.

## Verification

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
- `source .agents/initialise-env.sh && pnpm lint`
- `source .agents/initialise-env.sh && pnpm run bench && pnpm run verify:benchmarks`

## Dev Agent Record

### Debug Log

### Completion Notes

### File List

### Change Log
