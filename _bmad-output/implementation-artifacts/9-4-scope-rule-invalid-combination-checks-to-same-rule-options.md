# Story 9.4: Scope Rule Invalid-Combination Checks to Same-Rule Options

Status: cancelled

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Cancelled 2026-06-06.** Created from defer #1 of the Story 9.2 code review, then `validate-create-story` discovered that the `remove` + inherited-global-`censor` rejection is a **deliberate, test-codified v4 contract** — pinned by four explicit tests at [test/contract/api/create-redactor.test.ts:520-538](test/contract/api/create-redactor.test.ts#L520-L538) that assert each inherited-conflict combination throws, kept separate from the same-rule rows ([L510-518](test/contract/api/create-redactor.test.ts#L510-L518)). Maintainer decision (Ben) is to **keep the strict contract**: a rule must not specify or inherit contradictory options. This story is retained as a record of the analysis but will not be implemented. Defer #1 is reclassified as resolved-by-design in the deferred-work audit. The remaining content below is the original (corrected) draft, kept for context only.

## Story

As a backend engineer,
I want a path or key rule's invalid-combination checks (`remove + censor`, `remove + retainStructure`, `remove + replaceStringByLength`, `replaceStringByLength + empty censor`) to consider only the options set **on that rule**,
so that a rule with `remove: true` is not rejected at initialisation merely because a compatible option (e.g. `censor`) is configured at the **global** level, which `remove` would override at runtime anyway.

## Context

This story addresses defer #1 from the Story 9.2 code review (recorded in [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md) under "Deferred from: code review of 9-2-restore-full-keyrule-parity-with-the-v3-blacklistkeyconfig").

`validateConflictingOptions` in [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts) is currently fed the **inheritance-merged** effective options, not the rule's own options. In both `validatePathRule` and `validateKeyRule` the call passes `censor: value.censor ?? defaults.censor`, `remove: value.remove ?? defaults.remove`, `retainStructure: value.retainStructure ?? defaults.retainStructure`, and an `effectiveReplaceStringByLength` that falls back to `defaults.replaceStringByLength`. Here `defaults` is the **root** options (`rootDefaults`).

The consequence: a rule with `remove: true` and **no** own `censor` inherits the global `censor`, so the merged object has `remove === true && censor !== undefined` and initialisation throws `remove cannot be combined with censor`. For example:

```ts
createRedactor({ censor: '[X]', keys: [{ key: 'p', remove: true }] }) // throws today
createRedactor({ censor: '[X]', paths: [{ path: 'p', remove: true }] }) // throws today (pre-existing)
```

This is over-strict. `{ censor: '[X]', keys/paths: [{ ..., remove: true }] }` is a legitimate "redact everything with `[X]`, but remove this one field entirely" intent. At runtime there is **no ambiguity**: `applyRedaction` ([src/core/replacement/apply-redaction.ts](src/core/replacement/apply-redaction.ts)) evaluates `if (policy.remove) return removedValue` **before** any censor branch, so `remove` always wins and the inherited censor is moot. The rejection is purely an initialisation-time false positive.

**⚠️ This is a deliberate contract change, not a pure bug fix.** The current inherited-rejection behaviour is **pinned by four explicit existing tests** in [test/contract/api/create-redactor.test.ts:520-538](test/contract/api/create-redactor.test.ts#L520-L538) — `global remove inherited by path censor`, `global censor inherited by path remove`, `global remove inherited by path retainStructure`, and `global retainStructure inherited by path remove` — each asserting the inherited combination **throws**. The author deliberately separated these inherited rows from the same-rule rows ([L510-518](test/contract/api/create-redactor.test.ts#L510-L518)) and asserted both throw. So relaxing this is **reversing an intended, test-codified contract**, and this story is only valid if the product decision is to relax it (confirmed with the maintainer before dev).

**Design decision (if relaxing):** the per-rule invalid-combination checks fire only when **both** conflicting options are set **on the same rule**. The check evaluates the rule's own explicitly-set fields, not the global-inherited effective values. The **root-level** conflict check (`validateConflictingOptions(rootDefaults, 'options', issues)`) is unchanged — global options conflicting with each other (e.g. global `remove: true` + global `censor`) remain a genuine same-level conflict and stay rejected. The change is **validation-only**; no runtime, engine, type, or public-surface change. It applies **symmetrically** to `PathRule` and `KeyRule`, and it must not relax any genuine **same-rule** footgun protection.

This is the `release/v4.0.0` branch; the rejection is release-relevant because a custom global `censor` plus a per-field `remove` is a plausible configuration shape that is currently impossible to express.

## Acceptance Criteria

1. **Given** a **key** rule with `remove: true` and no own `censor`, and a redactor configured with a global `censor` string
   **When** the redactor is created
   **Then** initialisation succeeds
   **And** a matching key is removed from the output at runtime (`remove` wins over the inherited global censor).

2. **Given** a **path** rule with `remove: true` and no own `censor`, and a redactor configured with a global `censor` string
   **When** the redactor is created
   **Then** initialisation succeeds
   **And** the matching path is removed from the output at runtime.

3. **Given** a single rule (key **or** path) that sets **both** `remove: true` and its own `censor`
   **When** the redactor is created
   **Then** initialisation still fails with `remove cannot be combined with censor` (same-rule conflict is preserved).

4. Each of these **same-rule** combinations on a single rule (key **or** path) still fails at initialisation (no existing same-rule footgun protection is lost) — these map 1:1 to the predicates at [validate-config.ts:206-219](src/core/validation/validate-config.ts#L206-L219):
   - **4a.** own `remove: true` + own `retainStructure: true` → fails.
   - **4b.** own `remove: true` + own `replaceStringByLength: true` → fails.
   - **4c.** own `replaceStringByLength: true` + own `censor: ''` → fails.

5. **Given** a rule with `remove: true` and no own `retainStructure`/`replaceStringByLength`, and a redactor configured with global `retainStructure: true` and/or global `replaceStringByLength: true`
   **When** the redactor is created
   **Then** initialisation succeeds (an inherited-only option is not treated as a same-rule conflict).

6. **Given** a redactor configured with **global** `remove: true` and a **global** `censor` string (both at the root level)
   **When** the redactor is created
   **Then** initialisation still fails (the root-level same-level conflict check is unchanged).

7. **Given** the new behaviour
   **When** reviewed
   **Then** it is implemented purely in validation (`validate-config.ts`); no runtime, engine, type, or public-export change is introduced, and the change applies identically to `PathRule` and `KeyRule`.

8. **Given** the benchmark suite
   **When** benchmarks run
   **Then** no `maxOverheadPct` threshold in `test/bench/manifest.json` is changed
   **And** the existing rows still pass (the change is initialisation-only and off every hot path).

## Tasks / Subtasks

- [ ] In [src/core/validation/validate-config.ts](src/core/validation/validate-config.ts), change `validatePathRule` and `validateKeyRule` so the per-rule `validateConflictingOptions` call receives the rule's **own** explicitly-set fields (`value.censor`, `value.remove`, `value.retainStructure`, `value.replaceStringByLength`) instead of the `?? defaults`-merged values. The conflict predicates (`remove === true && censor !== undefined`, etc.) then only fire on same-rule combinations. (AC: 1, 2, 3, 4, 5)
- [ ] Keep the root-level `validateConflictingOptions(rootDefaults, 'options', issues)` call exactly as-is so global-vs-global conflicts remain rejected. (AC: 6)
- [ ] Remove the now-unused `defaults`-based merge for the conflict check (and the `effectiveReplaceStringByLength` fallback) from the two per-rule validators if it becomes dead after the change. If `defaults`/`EffectiveRuleDefaults` is no longer needed by `validatePathRule`/`validateKeyRule`, simplify their signatures accordingly; do not change the still-shared `validateConflictingOptions` helper's logic. Keep `validateBooleanOption`/`validateCensorOption` field-type checks untouched. (AC: 7)
- [ ] Decide and document the inherited-empty-censor edge: a rule with own `replaceStringByLength: true` while the **global** `censor` is `''`. With same-rule scoping this is no longer rejected (the empty censor is not on the rule). Confirm the runtime outcome is acceptable (`buildSameLengthReplacement('', len)` returns `''`) and note the decision in the story Dev Agent Record. Do not special-case it unless a test reveals a real footgun. (AC: 4, 7)
- [ ] **Invert/remove the four now-contradicting test rows** in the `rejects conflicting options for %s` `it.each` at [test/contract/api/create-redactor.test.ts:520-538](test/contract/api/create-redactor.test.ts#L520-L538). All four inherited rows (`global remove inherited by path censor`, `global censor inherited by path remove`, `global remove inherited by path retainStructure`, `global retainStructure inherited by path remove`) currently assert a throw and will fail after the change — they must become **accept** cases (and, for the two `remove` cases, assert runtime removal). **Keep** the same-rule rows ([L510-518](test/contract/api/create-redactor.test.ts#L510-L518)) and the root rows ([L499-509](test/contract/api/create-redactor.test.ts#L499-L509)) asserting a throw. Do NOT "fix" the source to restore throwing — red here is expected and is the point of the story. (AC: 1, 2, 5)
- [ ] Add contract tests in [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts): global censor + `remove` **key** rule accepted and the key is **absent** from output at runtime; global censor + `remove` **path** rule accepted and the path is absent; same-rule `remove + censor` (key and path) still rejected; same-rule `remove + retainStructure` and `remove + replaceStringByLength` still rejected; global `retainStructure`/`replaceStringByLength` + `remove` rule accepted; root global `remove + censor` still rejected; rule `replaceStringByLength: true` + global `censor: ''` accepted (pins the inherited-empty-censor decision). Assert genuine removal by key **absence** (`expect('password' in output).toBe(false)`), mirroring the precedents at [create-redactor.test.ts:2106-2114](test/contract/api/create-redactor.test.ts#L2106-L2114) and the sparse-array hole guard at [:970-983](test/contract/api/create-redactor.test.ts#L970-L983) — not by checking for a censor token. (AC: 1–6)
- [ ] Run `pnpm run verify:benchmarks` (builds + verifies against committed artefacts). Only re-run `pnpm run bench` if a threshold actually fails — this is a validation-only change off every hot path, so a re-measure would only churn the `test/artefacts/benchmarks/*.json` timings. Confirm no `maxOverheadPct`/`minOverheadPct` threshold in `test/bench/manifest.json` changes (the manifest must stay byte-identical; the artefact JSONs may legitimately differ if re-benched). (AC: 8)
- [ ] In [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md), change the leading `[Open]` token to `[Addressed]` on the `remove + inherited global censor rejected at initialisation` bullet (first bullet under "Deferred from: code review of 9-2-restore-full-keyrule-parity-with-the-v3-blacklistkeyconfig"), appending the landing evidence. Use a targeted Edit — that file is hook-protected against wholesale overwrite.

## Dev Notes

**Root cause is localised.** Only the two per-rule validators pass merged effective values into the conflict check:

- `validatePathRule` ([src/core/validation/validate-config.ts:709-718](src/core/validation/validate-config.ts#L709-L718))
- `validateKeyRule` ([src/core/validation/validate-config.ts:310-319](src/core/validation/validate-config.ts#L310-L319))

Both build `{ censor: value.censor ?? defaults.censor, remove: value.remove ?? defaults.remove, retainStructure: value.retainStructure ?? defaults.retainStructure, replaceStringByLength: effectiveReplaceStringByLength }`. Change these to pass the rule's own fields (raw `value.*`), so the predicates in `validateConflictingOptions` ([validate-config.ts:196-221](src/core/validation/validate-config.ts#L196-L221)) only see same-rule options. `validateConflictingOptions` itself does **not** change — its predicates are already correct; they were just being fed the wrong (merged) input.

**Do not touch the root call.** `validateConfig` calls `validateConflictingOptions(rootDefaults, 'options', issues)` ([validate-config.ts:793](src/core/validation/validate-config.ts#L793)) where `rootDefaults` are the global options themselves — a same-level check that must stay (AC 6).

**No runtime change is needed.** `applyRedaction` ([src/core/replacement/apply-redaction.ts](src/core/replacement/apply-redaction.ts), the `if (policy.remove) return removedValue` guard precedes every censor/replaceStringByLength branch) already makes `remove` win at runtime regardless of an inherited censor. The compile-time merge `remove: overrides.remove ?? defaults.remove` ([src/core/compiler/compile-redactor-plan.ts:177-182](src/core/compiler/compile-redactor-plan.ts#L177-L182)) already produces `{ remove: true, censor: '[X]' }` for the accept case, so the runtime removal is already correct with no compile change. This story does **not** alter `compile-redactor-plan.ts`, `redact-value.ts`, or any type. The compile-time `mergePolicy(defaults, overrides)` is **separate** from `validateConflictingOptions` and stays as-is — it correctly merges inherited defaults for the runtime policy; only the *validation* check was wrongly inheriting. Do not touch the compile merge.

**Reuse, do not reinvent.** Keep using the existing `validateBooleanOption`, `validateCensorOption`, and `validateConflictingOptions` helpers. This is a small input-scoping change plus tests, not a new validation path. Mirror whatever shape you choose for `validatePathRule` identically in `validateKeyRule` (and vice versa) so paths and keys stay symmetric — this symmetry is itself an AC (7) and the original asymmetry-free design from Story 9.2.

**Regression guard.** The Story 9.2 contract suite (`v3 BlacklistKeyConfig parity: per-key overrides`) and the Story 9.1 value-type suite must remain green. In the `rejects conflicting options for %s` `it.each` ([create-redactor.test.ts:499-542](test/contract/api/create-redactor.test.ts#L499-L542)): the **same-rule** rows ([L510-518](test/contract/api/create-redactor.test.ts#L510-L518)) and the **root** rows ([L499-509](test/contract/api/create-redactor.test.ts#L499-L509)) must keep throwing; the four **inherited** rows ([L520-538](test/contract/api/create-redactor.test.ts#L520-L538)) must flip from throw to accept (see the invert task). Do not preserve the inherited rows — they encode the exact behaviour this story removes.

### Project Structure Notes

- Single-file change under `src/core/validation/` plus tests under `test/contract/api/`. No new files, no public-surface change, no new dependency. Matches the existing validation module organisation.
- The `dist/index.js` artefact is regenerated by the build; benchmark artefacts/doc regenerate only if `pnpm run bench` is run (thresholds must not change).

### References

- [Source: _bmad-output/implementation-artifacts/deferred-work-audit.md#Deferred from: code review of 9-2-restore-full-keyrule-parity-with-the-v3-blacklistkeyconfig (2026-06-06)] — defer #1 origin and recommended fix.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9: Restore v3 Capability Parity Before Public Release] — performance-neutral, no-threshold-change constraint shared across Epic 9.
- [Source: src/core/validation/validate-config.ts] — `validateConflictingOptions`, `validatePathRule`, `validateKeyRule`, root `validateConfig`.
- [Source: src/core/replacement/apply-redaction.ts] — runtime `remove`-before-`censor` ordering proving no runtime ambiguity.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
