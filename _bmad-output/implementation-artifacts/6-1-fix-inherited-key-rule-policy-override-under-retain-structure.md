# Story 6.1: Fix Inherited Key-Rule Policy Override Under retainStructure

Status: done

## Story

As a backend engineer,
I want a `retainStructure: true` key rule to preserve its inherited policy for all descendants,
so that a descendant whose key independently matches a different key rule does not silently displace the parent's intended policy.

## Acceptance Criteria

1. **Given** a key rule configured with `retainStructure: true`, **when** a descendant's key independently matches a different key rule with an `exact-key` or `regex-key` source, **then** the inherited policy from the parent `retainStructure` rule is not displaced by that descendant match.
2. **Given** `selectActivePolicy` is called with an inherited `exact-key` or `regex-key` source policy alongside a candidate `directKeyMatch`, **when** the candidate would displace the inherited policy, **then** the inherited policy is preserved — applying the same guard already in place for inherited `exact-path` and `dynamic-path` source policies.
3. **Given** a payload redacted with a key rule using `retainStructure: true` where a descendant key matches a separate key rule, **when** redaction runs, **then** the output reflects the `retainStructure` parent's policy and the descendant is not independently censored as if the parent rule were absent.
4. **Given** the fix is applied, **when** the existing test suite runs, **then** no previously-passing tests regress.

## Tasks / Subtasks

- [x] Extend the inherited-policy guard in `selectActivePolicy` (`src/core/runtime/redact-value.ts:515`) to cover `exact-key` and `regex-key` source types alongside the existing `exact-path`/`dynamic-path` guard (AC: 1, 2)
- [x] Add a contract test in `test/contract/api/create-redactor.test.ts` that reproduces the pre-fix override: a payload with a `keys` rule using `retainStructure: true` where a descendant key independently matches a different `keys` entry (AC: 3)
- [x] Confirm the new test fails without the fix and passes after it (AC: 3)
- [x] Run the full test suite and confirm no regressions (AC: 4)

## Dev Notes

**Deferred from:** Code review of Story 2.2 (2026-05-03).

**Environment bootstrap (required before any test or pnpm command):**
```bash
source .agents/initialise-env.sh
```

---

### Root cause

`selectActivePolicy` in `src/core/runtime/redact-value.ts` guards inherited `exact-path`/`dynamic-path` source policies against displacement by a child `directKeyMatch`, but `exact-key`/`regex-key` source policies have no equivalent guard. A key rule using `retainStructure: true` therefore has its inherited policy silently replaced for any descendant whose key independently matches a different key rule.

### Precise fix — `src/core/runtime/redact-value.ts:515`

Current guard (line 515):
```typescript
if (inheritedPolicy?.source === 'exact-path' || inheritedPolicy?.source === 'dynamic-path') {
  return inheritedPolicy
}
```

Extended guard (the complete fix):
```typescript
if (
  inheritedPolicy?.source === 'exact-path'
  || inheritedPolicy?.source === 'dynamic-path'
  || inheritedPolicy?.source === 'exact-key'
  || inheritedPolicy?.source === 'regex-key'
) {
  return inheritedPolicy
}
```

This makes inherited key-rule policies take precedence over a direct key match on a descendant, mirroring the behaviour already in place for path-based inherited policies. The lines that follow (519–535) handle the `directKeyMatch` cases only when no inherited policy exists.

---

### Contract test — `test/contract/api/create-redactor.test.ts`

Add the new test immediately after the existing `'retains exact-key and regex-key matched containers using the compiled global policy'` test (currently at line 2459). Use `deepRedact` — already imported at the top of the file.

**Test scenario:** two separate `keys` entries — one (`'parent'`) with `retainStructure: true` and a distinct censor, and one (`'password'`) with its own censor. The descendant key `password` appears inside a `parent` container. Without the fix the descendant is censored by the `password` rule; with the fix it is censored by the inherited `parent` policy.

```typescript
it('preserves the inherited key-rule policy when a descendant key independently matches a different key rule', () => {
  const redact = deepRedact({
    retainStructure: true,
    censor: (_value: unknown, ctx) => `[rule:${String(ctx.rulePath[0])}]`,
    keys: ['parent', 'password'],
  })
  const payload = {
    parent: {
      username: 'alice',
      password: 'secret',
    },
    other: {
      password: 'other-secret',
    },
  }
  const originalPayload = structuredClone(payload)

  expect(redact(payload)).toEqual({
    parent: {
      username: '[rule:parent]',   // inherited policy from parent key rule
      password: '[rule:parent]',   // inherited policy, NOT [rule:password]
    },
    other: {
      password: '[rule:password]', // direct key match — no inherited policy
    },
  })
  expect(payload).toStrictEqual(originalPayload)
})
```

**Pre-fix failure mode:** `parent.password` will be `'[rule:password]'` instead of `'[rule:parent]'` — the direct `password` key match displaces the inherited parent policy. Verify the test fails before patching, then passes after.

**Note on API design:** The story spec originally used per-key `censor` and `retainStructure` options, which are not valid in the v4 `KeyRule` type (only `key`, `fuzzyKeyMatch`, `caseSensitiveKeyMatch` are allowed per-key). The test was redesigned to use a function censor that inspects `ctx.rulePath[0]`, which is the field that diverges between the bugged and fixed behaviour.

---

### Scope

Only `src/core/runtime/redact-value.ts` (one guard extension) and `test/contract/api/create-redactor.test.ts` (one new test) are touched by this story. No other files require changes. Run `pnpm run test` to execute the full suite after the fix.

## Dev Agent Record

### Implementation Plan

Extended the `selectActivePolicy` guard at `src/core/runtime/redact-value.ts:515` to include `exact-key` and `regex-key` source types. This mirrors the existing protection for `exact-path`/`dynamic-path` inherited policies.

The contract test was redesigned from the story spec: the spec assumed per-key `censor`/`retainStructure` options that are not part of the v4 `KeyRule` API. Instead, a global function censor was used — it returns a string encoding `ctx.rulePath[0]`, making the rule path observable in test output. Pre-fix, `parent.password` receives `rulePath: ['password']` (direct match displaces inherited); post-fix it receives `rulePath: ['parent']` (inherited preserved).

### Completion Notes

- **Fix:** Extended guard in `selectActivePolicy` (`src/core/runtime/redact-value.ts`) — 4 lines added.
- **Test:** Added 1 contract test after line 2502 in `test/contract/api/create-redactor.test.ts`. Test failed before fix (`parent.password` got `[rule:password]`) and passes after.
- **Regressions:** None — 458/458 tests pass.

## File List

- `src/core/runtime/redact-value.ts` — extended `selectActivePolicy` guard (lines 515–520)
- `test/contract/api/create-redactor.test.ts` — added contract test for inherited key-rule policy preservation

## Change Log

- 2026-05-24: Extended `selectActivePolicy` guard to cover `exact-key`/`regex-key` inherited policies; added contract test reproducing pre-fix override behaviour.

### Review Findings

- [x] [Review][Patch] No regression test re-exercising pre-existing exact-path/dynamic-path guard arms after the guard was extended [test/contract/api/create-redactor.test.ts]
- [x] [Review][Patch] `rulePath` in censor context reflects ancestor's rule, not the matching descendant key — documented in FunctionCensorContext JSDoc [src/types/paths.ts]
- [x] [Review][Patch] No contract test for 3+ levels of nesting with competing key-rule matches [test/contract/api/create-redactor.test.ts]
- [x] [Review][Patch] No contract test for regex-key–sourced inherited policy specifically [test/contract/api/create-redactor.test.ts]
- [x] [Review][Patch] `selectActivePolicy` guard is now exhaustive — simplified final fallthrough to `return undefined` [src/core/runtime/redact-value.ts:540]
- [x] [Review][Patch] No contract test asserting that an exact-path descendant rule overrides an inherited key-rule policy [test/contract/api/create-redactor.test.ts]
