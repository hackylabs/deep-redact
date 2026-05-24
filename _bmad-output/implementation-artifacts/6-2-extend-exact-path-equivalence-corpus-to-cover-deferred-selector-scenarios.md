# Story 6.2: Extend Exact-Path Equivalence Corpus to Cover Deferred Selector Scenarios

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the exact-path equivalence corpus to cover all deferred selector scenarios,
so that the behavioural equivalence proof between the fast lane and generic traversal lane is complete.

## Acceptance Criteria

1. **Given** the exact-path equivalence corpus, **when** bracket-quoted or special-character property key paths are reviewed, **then** at least one corpus entry exercises lane equivalence for those key forms.
2. **Given** the exact-path equivalence corpus, **when** non-string primitive leaf value types are reviewed, **then** at least one corpus entry covers number, boolean, and null leaf values under an exact path.
3. **Given** the exact-path equivalence corpus, **when** absent-path behaviour is reviewed, **then** at least one corpus entry asserts that a path absent from the payload produces identical silent no-op output across both lanes.
4. **Given** the exact-path equivalence corpus, **when** `replaceStringByLength: true` policy is reviewed, **then** at least one corpus entry exercises this policy under an exact path and confirms output is lane-equivalent.
5. **Given** the exact-path equivalence corpus, **when** `retainStructure` alias-replay caching behaviour is reviewed, **then** at least one corpus entry exercises shared-identity alias payloads and confirms caching behaviour is consistent across both lanes.
6. **Given** the `createGenericisedPlan` conversion function in `test/fixtures/exact-path-equivalence/index.ts`, **when** a converted `ExactPathRule` is appended as a `DynamicPathRule`, **then** the `signature` field is produced using `renderSelectorSignature` rather than the raw `canonicalPath` string.
7. **Given** the `createGenericisedPlan` conversion logic, **when** it is invoked, **then** a control assertion enforces `dynamicPathRules.length === 0` before conversion is attempted, making the invariant explicit rather than implicit.

## Tasks / Subtasks

- [x] Fix `signature` field assignment in `createGenericisedPlan` to use `renderSelectorSignature` (`test/fixtures/exact-path-equivalence/index.ts`) (AC: 6)
- [x] Make `dynamicPathRules.length === 0` invariant explicit as a control assertion in `createGenericisedPlan` (`test/fixtures/exact-path-equivalence/index.ts`) (AC: 7)
- [x] Add corpus entry: bracket-quoted and special-character property keys (e.g. `users["first.name"].email`) — verify both lanes produce identical output (AC: 1)
- [x] Add corpus entry: non-string primitive leaf values — one fixture covering `number`, `boolean`, and `null` leaves under an exact path (AC: 2)
- [x] Add corpus entry: absent path — exact path selector targeting a key not present in the payload; both lanes must produce the unchanged input (AC: 3)
- [x] Add corpus entry: `replaceStringByLength: true` policy under an exact path selector (AC: 4)
- [x] Add corpus entry: `retainStructure` alias-replay — payload where the same object identity is reached via two branches with identical effective rule context; verify caching behaviour is lane-equivalent (AC: 5)
- [x] Run the full equivalence test suite and confirm all new corpus entries pass

## Dev Notes

**Deferred from:** Code review of Story 4.3 (2026-05-14).

**Environment bootstrap (required before any test or pnpm command):**
```bash
source .agents/initialise-env.sh
```

---

### Key File

All work for this story lives in one file:

**`test/fixtures/exact-path-equivalence/index.ts`**

The test runner that consumes the corpus is in `test/contract/api/create-redactor.test.ts` at line 4693 — do not modify it. Each `it.each(exactPathEquivalenceCorpus)` iteration:

1. **Control assertion** — compiles the plan and verifies `exactPathRules.length === paths.length` and `dynamicPathRules.length === 0`.
2. **Fast-lane run** — calls `createLaneForcedRedactorFromPlan(plan, 'fast')` and asserts structural and serialised equality against corpus entry golden values.
3. **Generic-lane run** — calls `createLaneForcedRedactorFromPlan(plan, 'generic')` (which internally calls `createGenericisedPlan`) and asserts the same golden values, plus cross-lane equality.

---

### Fix 1 — `signature` field in `createGenericisedPlan` (AC 6)

**File:** `test/fixtures/exact-path-equivalence/index.ts:22`

**Problem:** The converted `DynamicPathRule` sets `signature: canonicalPath` (the map key, a raw string), but `CompiledDynamicPathRule.signature` is semantically the output of `renderSelectorSignature`. Although both happen to be identical for the simple property/index paths in the current corpus, using the raw string bypasses the canonical production function.

**Fix:** Replace the `signature` assignment with a call to `renderSelectorSignature`:

```typescript
// Before
signature: canonicalPath,

// After
signature: renderSelectorSignature(exactRule.segments as readonly PathSegment[]),
```

**Cast required:** `exactRule.segments` is typed as `readonly ExactPathSegment[]`. The existing code in the same function already does `exactRule.segments as readonly PathSegment[]` when assigning the `segments` field, for the same reason — TypeScript does not automatically widen the discriminated-union subtype. Use the same cast here.

**Import required** — add `renderSelectorSignature` to the imports at the top of the file:

```typescript
import { renderSelectorSignature } from '../../../src/core/matching/path-normaliser.js'
```

`renderSelectorSignature` is already exported from `src/core/matching/path-normaliser.ts:80`. It accepts `readonly PathSegment[]` and returns a string.

---

### Fix 2 — Explicit invariant assertion in `createGenericisedPlan` (AC 7)

**File:** `test/fixtures/exact-path-equivalence/index.ts:16`

**Problem:** `createGenericisedPlan` spreads `plan.dynamicPathRules` into the result, appending converted rules after any pre-existing ones. The test control assertion at line 4699 enforces that `plan.dynamicPathRules.length === 0` before the corpus test runs, but `createGenericisedPlan` itself has no guard — if called with a plan that already has dynamic rules, the converted rules are silently appended.

**Fix:** Add an explicit guard at the top of `createGenericisedPlan`:

```typescript
export const createGenericisedPlan = (plan: CompiledRedactorPlan): CompiledRedactorPlan => {
  if (plan.dynamicPathRules.length !== 0) {
    throw new Error('createGenericisedPlan: plan must have no pre-existing dynamicPathRules')
  }
  // ... rest of function
```

---

### New Corpus Entries

**Where to insert in `test/fixtures/exact-path-equivalence/index.ts`:**
- **Canary constants** — append after `CUSTOM_SERIALISED_SINGLE_EXACT_PATH_CANARY` at line 98, before the closing comment and corpus declaration.
- **Corpus entries** — append after the `exact-path-multiple-policies` entry at line 205, before the closing `]` of `exactPathEquivalenceCorpus`.

Each entry follows the `ExactPathEquivalenceCorpusEntry` interface.

---

#### Entry: Bracket-Quoted Property Key (AC 1)

Tests lane equivalence for a path whose middle segment contains a dot — requiring bracket-quoted notation in the canonical form.

```typescript
{
  name: 'exact-path-bracket-quoted-key',
  title: 'exact path with bracket-quoted property key — users["first.name"].email',
  exactPathEligibilityReason: 'all segments are exact static properties; the middle segment uses bracket-quoted notation because its key contains a dot',
  options: { paths: ['users["first.name"].email'] },
  createPayload: () => ({ users: { 'first.name': { email: 'user@example.com' } } }),
  expectedStructured: { users: { 'first.name': { email: '[REDACTED]' } } },
  expectedSerialised: SERIALISED_BRACKET_QUOTED_KEY_CANARY,
},
```

Canary string: `'{"users":{"first.name":{"email":"[REDACTED]"}}}'`

**Eligibility note:** The path `users["first.name"].email` is parsed by `parsePathSelector` into three `property`-kind segments — all are `ExactPathSegment` instances, so `compileRedactorPlan` places the rule in `exactPathRules` (fast lane eligible). The canonical path key will be `users["first.name"].email` (bracket form, because `first.name` fails the bare-property regex in `renderPropertySegment`).

---

#### Entry: Non-String Primitive Leaf Values (AC 2)

Tests that numeric, boolean, and null leaf values are all redacted identically across lanes.

```typescript
{
  name: 'exact-path-primitive-leaf-values',
  title: 'exact paths targeting number, boolean, and null leaf values',
  exactPathEligibilityReason: 'three exact static absolute paths; leaf values are non-string primitives',
  options: { paths: ['data.count', 'data.active', 'data.extra'] },
  createPayload: () => ({ data: { count: 42, active: true, extra: null } }),
  expectedStructured: { data: { count: '[REDACTED]', active: '[REDACTED]', extra: '[REDACTED]' } },
  expectedSerialised: SERIALISED_PRIMITIVE_LEAF_VALUES_CANARY,
},
```

Canary string: `'{"data":{"count":"[REDACTED]","active":"[REDACTED]","extra":"[REDACTED]"}}'`

**Behaviour note:** `applyRedaction` in `src/core/replacement/apply-redaction.ts:50` returns the `literalCensor` (default `'[REDACTED]'`) for non-string primitives when `replaceStringByLength` is false, replacing the original numeric/boolean/null value with the string censor. Both lanes must produce identical output.

---

#### Entry: Absent Path (AC 3)

Tests that a path selector targeting a key not present in the payload results in identical no-op output from both lanes.

```typescript
{
  name: 'exact-path-absent-key',
  title: 'exact path targeting a key absent from the payload — no-op',
  exactPathEligibilityReason: 'one exact static absolute path; the targeted key does not exist in the payload',
  options: { paths: ['user.missing'] },
  createPayload: () => ({ user: { name: 'alice' } }),
  expectedStructured: { user: { name: 'alice' } },
  expectedSerialised: SERIALISED_ABSENT_PATH_CANARY,
},
```

Canary string: `'{"user":{"name":"alice"}}'`

---

#### Entry: `replaceStringByLength: true` Policy (AC 4)

Tests that `replaceStringByLength: true` under an exact path produces identical lane output. The replacement length is determined by the original string value's length.

```typescript
{
  name: 'exact-path-replace-string-by-length',
  title: 'exact path with replaceStringByLength: true — user.password',
  exactPathEligibilityReason: 'one exact static absolute path with replaceStringByLength: true per-path override',
  options: { paths: [{ path: 'user.password', replaceStringByLength: true }] },
  createPayload: () => ({ user: { password: 'secret', safe: 'keep' } }),
  expectedStructured: { user: { password: '[REDAC', safe: 'keep' } },
  expectedSerialised: SERIALISED_REPLACE_STRING_BY_LENGTH_CANARY,
},
```

**Length computation:** The value `'secret'` has 6 characters. `buildSameLengthReplacement('[REDACTED]', 6)` in `src/core/replacement/apply-redaction.ts:14` computes: `Math.floor(6/10) = 0`, `6 % 10 = 6` → `'' + '[REDACTED]'.slice(0, 6)` = `'[REDAC'`.

Canary string: `'{"user":{"password":"[REDAC","safe":"keep"}}'`

---

#### Entry: `retainStructure` Alias-Replay Caching (AC 5)

Tests that when the same object identity is reached via two branches in the same payload, both lanes handle the alias replay consistently. The `retainStructure` path with a shared-identity object exercises the alias cache.

```typescript
{
  name: 'exact-path-retain-structure-alias-replay',
  title: 'retainStructure alias-replay — same object identity reached via two branches',
  exactPathEligibilityReason: 'two exact static absolute paths with retainStructure: true; the payload uses shared object identity across both branches',
  options: {
    paths: [
      { path: 'primary', retainStructure: true },
      { path: 'secondary', retainStructure: true },
    ],
  },
  createPayload: () => {
    const sharedProfile = { secret: 'hidden', name: 'alice' }
    return { primary: sharedProfile, secondary: sharedProfile }
  },
  expectedStructured: {
    primary: { secret: '[REDACTED]', name: '[REDACTED]' },
    secondary: { secret: '[REDACTED]', name: '[REDACTED]' },
  },
  expectedSerialised: SERIALISED_RETAIN_STRUCTURE_ALIAS_REPLAY_CANARY,
},
```

Canary string: `'{"primary":{"secret":"[REDACTED]","name":"[REDACTED]"},"secondary":{"secret":"[REDACTED]","name":"[REDACTED]"}}'`

**How the alias-replay mechanism works (important for understanding the expected output):**

The runtime in `src/core/runtime/redact-value.ts` maintains a `completedIdentities` WeakMap keyed by object identity. When `sharedProfile` is first traversed under `primary`:
1. It is processed and stored in `completedIdentities` with `ruleContextKey = 'exact-path:primary'` (fast lane) or `'dynamic-path:primary'` (generic lane).
2. A `completedSnapshots` entry is also stored, capturing each property's **original** (pre-redaction) value — i.e. `{ secret: 'hidden', name: 'alice' }`.

When `secondary` is traversed and the runtime encounters the same `sharedProfile` object identity:
1. `completedIdentities.get(sharedProfile)` finds the record from `primary`, but `ruleContextKey` differs (`secondary` vs `primary`), so `resolveCompletedTraversal` returns no match.
2. The snapshot exists → `replayCompletedTraversal` is called.
3. `replayCompletedTraversal` re-applies all rules to the **original** property values from the snapshot (not the cached redacted output), using the `secondary` rule's context.
4. Since both rules are `retainStructure: true` with the default censor, the result is identical: `{ secret: '[REDACTED]', name: '[REDACTED]' }`.

The test verifies that both lanes reach this result through the same replay path — confirming lane equivalence of the alias-replay mechanism. Both `expectedStructured` values (`primary` and `secondary`) should therefore be fully redacted, as given above.

---

### Running Tests

```bash
source .agents/initialise-env.sh && pnpm run test -- --reporter=verbose test/contract/api/create-redactor.test.ts
```

The equivalence corpus test block begins at line 4693 in `test/contract/api/create-redactor.test.ts` — all new entries will be exercised automatically by the `it.each` loop.

---

### Project Structure Notes

- All changes are confined to `test/fixtures/exact-path-equivalence/index.ts`.
- No production source files are modified.
- The new import (`renderSelectorSignature`) is from `src/core/matching/path-normaliser.ts`, which already exports it.
- `CompiledDynamicPathRule` and `CompiledExactPathRule` types are imported from `src/core/compiler/compile-redactor-plan.ts` — no new type imports needed.

### References

- Key fixture file: [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts)
- Test runner (read-only): [test/contract/api/create-redactor.test.ts:4693](test/contract/api/create-redactor.test.ts#L4693)
- `renderSelectorSignature`: [src/core/matching/path-normaliser.ts:80](src/core/matching/path-normaliser.ts#L80)
- `buildSameLengthReplacement` (length logic): [src/core/replacement/apply-redaction.ts:14](src/core/replacement/apply-redaction.ts#L14)
- `CompiledDynamicPathRule` type: [src/core/compiler/compile-redactor-plan.ts:48](src/core/compiler/compile-redactor-plan.ts#L48)
- Deferred items source: `_bmad-output/implementation-artifacts/deferred-work.md` lines 6–14

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Fixed `signature` field in `createGenericisedPlan` to use `renderSelectorSignature(exactRule.segments as readonly PathSegment[])` instead of the raw `canonicalPath` string, ensuring the canonical production function is always used.
- Added explicit `if (plan.dynamicPathRules.length !== 0) throw` guard at the top of `createGenericisedPlan`, making the invariant enforceable at the call site rather than relying solely on the test control assertion.
- Added import for `renderSelectorSignature` from `src/core/matching/path-normaliser.js`.
- Added 5 canary constants and 5 new corpus entries covering: bracket-quoted key paths, non-string primitive leaf values (number/boolean/null), absent path (no-op), `replaceStringByLength: true`, and `retainStructure` alias-replay with shared object identity.
- All 467 tests pass with no regressions; all 13 equivalence corpus entries (8 existing + 5 new) pass both fast-lane and generic-lane assertions.

### File List

- `test/fixtures/exact-path-equivalence/index.ts`

### Review Findings

- [x] [Review][Patch] `SERIALISED_ABSENT_PATH_CANARY` duplicates `SERIALISED_REMOVE_CANARY` byte-for-byte — added `age: 30` to absent-path payload; canary updated to `'{"user":{"name":"alice","age":30}}'` [`test/fixtures/exact-path-equivalence/index.ts:111`]
- [x] [Review][Patch] `createGenericisedPlan` guard does not assert conversion invariant — added post-loop `convertedRules.length === Object.keys(plan.exactPathRules).length` assertion [`test/fixtures/exact-path-equivalence/index.ts:15`]
- [x] [Review][Patch] Absent-path corpus entry mutation concern — resolved by P1: payload now has a non-targeted `age` field; for an absent-path case no values are written back, so mutation is structurally impossible [`test/fixtures/exact-path-equivalence/index.ts:249`]
- [x] [Review][Dismiss] Alias-replay entry exercises snapshot-replay path only — `resolveCompletedTraversal` fast path is not achievable with exact-path rules (different `rulePath` → always different `ruleContextKey`); dismissed as not patchable within this corpus
- [x] [Review][Patch] `replaceStringByLength` canary does not cover non-default `censor` — added `exact-path-replace-string-by-length-custom-censor` corpus entry with `censor: '*'` exercising the `quotient > 0` repeat branch [`test/fixtures/exact-path-equivalence/index.ts`]
