# Story 9.2: Restore Full `KeyRule` Parity with the v3 `BlacklistKeyConfig`

Status: done

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

- [x] Extend `KeyRule` in [src/types/config.ts](src/types/config.ts): widen `key` to `string | RegExp`; add `censor`, `remove`, `retainStructure`, `replaceStringByLength`. Keep `KeySelector = string | RegExp | KeyRule`.
- [x] Extend `keyRuleOptionNames` and validation in [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts): validate the new per-key fields (reuse the `PathRule` field validators), accept a regex `key`, reject unsupported keys, and reject `remove + censor` / `remove + retainStructure` at the key-rule level.
- [x] Add an optional `policy?: CompiledRedactionPolicy` to `CompiledLiteralKeyRule`; in `toLiteralKeyRule`, when a key rule specifies overrides, compute `mergePolicy(defaults, overrides)`, else leave `policy` unset. Thread `defaults` through `compileExactKeyRules` ([src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)).
- [x] Route a `KeyRule` whose `key` is a `RegExp` to the regex matcher, not the literal matcher. `isKeyRule` currently returns true for `{ key, ... }` objects, so `compileExactKeyRules` would otherwise capture a regex-keyed rule into the literal path — split the routing on `key instanceof RegExp`. Allow `compileRegexKeyRules` to accept such a rule, carrying a per-rule `policy` from `mergePolicy` when overrides are present; keep the shared regex policy as the fallback.
- [x] Carry the matched rule's per-rule `policy` through `DirectKeyMatchResult` and `resolveDirectKeyMatch`; at the resolution site, use `directKeyMatch.policy ?? plan.exactKeyRules.policy` (and the regex equivalent) in [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts). Confirm retain-structure descent at the key-rule policy site honours the per-key policy.
- [x] Re-export any new/changed public types through [src/types/public.ts](src/types/public.ts) and [src/index.ts](src/index.ts). _(No new public type introduced; the widened `KeyRule` already flows through both barrels unchanged.)_
- [x] Add contract tests in [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts): per-key censor (string), per-key censor function with context, per-key `remove`, per-key `retainStructure` (nested), per-key `replaceStringByLength`, override-beats-global-default, regex key with overrides, no-override parity (string and regex), invalid-combination rejection, first-match-wins precedence.
- [x] Run `pnpm run bench` and `pnpm run verify:benchmarks`; confirm no `maxOverheadPct` threshold changed and existing rows pass (AC 10).
- [x] Record the per-key-parity gap as addressed in [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md).

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

- Initial RED run of the new `v3 BlacklistKeyConfig parity: per-key overrides` suite: 23 of 24 cases failed (config rejected with `Unsupported option "censor"` etc.) before implementation — confirming the tests exercise unbuilt behaviour.
- After implementation, two pre-existing v4.0.0 tests failed as expected because they pinned the now-reversed narrowing (`remove` rejected as unsupported; regex `key` rejected). Both were updated to assert the new contract while keeping their intent (reject a genuinely unsupported option name / a non-string, non-RegExp key).
- `pnpm run bench` regenerated the six canonical benchmark artefacts with this machine's timings (all rows pass thresholds); `verify:benchmarks` then flagged `docs/benchmarks/results.md` out of date, resolved by the established lockstep step `pnpm run bench:generate-doc`. `test/bench/manifest.json` (the `maxOverheadPct` source of truth) is byte-identical before and after (md5 `55483bf8c58ab638d8db4277183b2828`).

### Completion Notes

Restored full `KeyRule` parity with the v3 `BlacklistKeyConfig`, reusing the existing path-rule policy machinery rather than inventing a parallel per-key path:

- **Types** — `KeyRule.key` widened to `string | RegExp`; added `censor`, `remove`, `retainStructure`, `replaceStringByLength` (AC 1). `KeySelector = string | RegExp | KeyRule` unchanged. `KeyRule` is already re-exported via `src/types/public.ts` and `src/index.ts`, so no new public type was added.
- **Compile** — `CompiledLiteralKeyRule` and the new `CompiledRegexKeyRule` (`{ matcher, policy? }`) each carry an optional per-rule `policy`; `CompiledRegexKeyRules.matchers` is now `readonly CompiledRegexKeyRule[]`. `compileKeyRulePolicy` computes `mergePolicy(defaults, overrides)` only when a rule specifies an override, else leaves `policy` unset (AC 7 — no-override rules keep the shared `exactKeyRules.policy`/`regexKeyRules.policy`). Routing splits on `key instanceof RegExp` so a regex-keyed `KeyRule` is compiled by `compileRegexKeyRules` (AC 6), not captured into the literal path.
- **Runtime** — `DirectKeyMatchResult` carries the matched rule's `policy`; `resolveDirectKeyMatch` threads it through, and `selectActivePolicy` resolves `directKeyMatch.policy ?? plan.exactKeyRules.policy` (and the regex equivalent). Retain-structure descent inherits the per-key policy, so descendants of a per-key `retainStructure` container are redacted under the inherited per-key censor (AC 4). Per-key `censor`/`retainStructure` still passes through the Story 9.1 value-type allowlist at the shared leaf-replacement boundary (verified: numeric value vetoed under the default string-only `types`, redacted once `types` includes `number`).
- **Validation** — `keyRuleOptionNames` extended; `validateKeyRule` accepts a regex `key` (validated via the shared regex-safety check), validates the new fields with the same validators `PathRule` uses, and rejects `remove + censor` / `remove + retainStructure` at initialisation with the per-path defaults-merge semantics (AC 8). Root defaults are now built once and shared by `validatePaths` and `validateKeys`.
- **Precedence** unchanged (AC 9): path rules outrank key rules, exact key rules outrank regex key rules, first-match-wins among literal key rules — all pinned by tests.
- **Performance** (AC 10): compile-time merge plus at most one policy selection per key match, off the per-node hot path. The path-driven fast lane requires zero key rules and is unaffected. No `maxOverheadPct` threshold changed; all six benchmark rows pass.

Verification: `pnpm run test` (736 passed), `pnpm exec vitest run --config vitest.red-phase.config.ts` (89 passed), `pnpm exec tsc --noEmit` (clean), `pnpm lint` (exit 0), `pnpm run bench && pnpm run verify:benchmarks` (all six rows passed, no threshold changed).

### File List

- `src/types/config.ts` — widened `KeyRule.key` and added per-key override fields.
- `src/core/validation/validate-config.ts` — extended `keyRuleOptionNames`, regex-key acceptance, per-key field validation and invalid-combination rejection; shared root defaults across `validatePaths`/`validateKeys`.
- `src/core/compiler/compile-redactor-plan.ts` — per-rule `policy` on `CompiledLiteralKeyRule` and new `CompiledRegexKeyRule`; `compileKeyRulePolicy`; regex-key routing; reshaped `CompiledRegexKeyRules.matchers`.
- `src/core/runtime/redact-value.ts` — `DirectKeyMatchResult.policy`; per-rule policy threaded through `findMatchingRegexKey`/`resolveDirectKeyMatch`/`selectActivePolicy`.
- `test/contract/api/create-redactor.test.ts` — new `v3 BlacklistKeyConfig parity: per-key overrides` suite; updated two v4.0.0 narrowing tests to the new contract.
- `test/unit/core/compiler/compile-redactor-plan.test.ts` — updated regex-matcher assertions for the `{ matcher, policy }` shape.
- `dist/index.js` — regenerated by the build (reflects this change; also picked up Story 9.1's `compileValueTypes`, previously stale in the committed artefact).
- `docs/benchmarks/results.md`, `test/artefacts/benchmarks/*.json` (6 files) — regenerated by the mandated `pnpm run bench` + `bench:generate-doc` lockstep; thresholds unchanged.
- `_bmad-output/implementation-artifacts/deferred-work-audit.md` — recorded the per-key-parity gap as addressed.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status `ready-for-dev` → `in-progress` → `review`.

### Change Log

- 2026-06-06 — Restored full `KeyRule` parity with the v3 `BlacklistKeyConfig`: widened `key` to `string | RegExp` and added per-key `censor`/`remove`/`retainStructure`/`replaceStringByLength`, reusing `CompiledRedactionPolicy`/`mergePolicy`. Performance-neutral; all ACs satisfied; status set to `review`.

### Review Findings

Adversarial code review (Blind Hunter, Edge-Case Hunter, Acceptance Auditor) on 2026-06-06. Outcome: all 10 ACs satisfied and the Story 9.1 value-type gate constraint upheld, confirmed independently (contract suite green — 572 passed; per-key precedence, retain-structure inheritance, and the `remove`/`censor` parity verified empirically). No `decision-needed` or `patch` findings. 3 deferred (all pre-existing or parity-faithful); the rest dismissed as false positives (`isRegExp` _is_ `instanceof RegExp`; non-string/non-regex keys are rejected by validation before compile), cosmetics, or by-design behaviour (first-match-wins is mandated by AC 9 and tested).

- [x] [Review][Defer] `remove` + inherited global `censor` rejected at init [src/core/validation/validate-config.ts:206,312] — deferred, pre-existing. `validateConflictingOptions` is fed `value.censor ?? defaults.censor`, so a rule with `remove: true` is rejected whenever a global `censor` string is configured, even though at runtime `remove` wins. Verified identical for `paths`, so this is faithful per-path parity (AC 8), not a 9.2 regression. Recommend relaxing for both paths and keys in a follow-up (only conflict when censor is set on the same rule).
- [x] [Review][Defer] Regex key rules silently accept-but-ignore `fuzzyKeyMatch`/`caseSensitiveKeyMatch` [src/core/compiler/compile-redactor-plan.ts:341-345] — deferred, parity-faithful. Validation accepts both flags on `{ key: /re/, ... }`, but `compileRegexKeyRules` builds the matcher from `source`/`flags` only, so they are inert (verified: `caseSensitiveKeyMatch: false` on `/PASS/` does not match `password`). Regex case-sensitivity belongs in the `i` flag; consider rejecting these flags on regex keys to avoid false confidence.
- [x] [Review][Defer] `replaceStringByLength` + function censor neither rejected nor applied [src/core/replacement/apply-redaction.ts; src/core/validation/validate-config.ts:218] — deferred, pre-existing (shared with `PathRule`). A rule combining a function censor with `replaceStringByLength: true` passes validation, but `applyRedaction` returns the function result before the length branch, so `replaceStringByLength` is silently inert.
