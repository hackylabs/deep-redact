# Story 6.1: Fix Inherited Key-Rule Policy Override Under retainStructure

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

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

- [ ] Locate `selectActivePolicy` in `src/core/runtime/redact-value.ts` and extend the inherited-policy guard to cover `exact-key` and `regex-key` source types in addition to the existing `exact-path`/`dynamic-path` guard (AC: 1, 2)
- [ ] Add a contract test fixture that reproduces the pre-existing override: a payload with a key rule (`retainStructure: true`) where a descendant key independently matches a different key rule (AC: 3)
- [ ] Verify the fixture produces the correct `retainStructure`-governed output after the fix, and that the test fails without the fix (AC: 3)
- [ ] Run the full test suite and confirm no regressions (AC: 4)

## Dev Notes

**Deferred from:** Code review of Story 2.2 (2026-05-03).

**Root cause:** `selectActivePolicy` in `src/core/runtime/redact-value.ts` guards inherited `exact-path`/`dynamic-path` source policies against displacement by a child `directKeyMatch`, but `exact-key`/`regex-key` source policies have no equivalent guard. A key rule using `retainStructure: true` therefore has its inherited policy silently replaced for any descendant whose key independently matches a different key rule. This is pre-existing precedence behaviour predating Story 2.2.

**Key file:** `src/core/runtime/redact-value.ts` — search for `selectActivePolicy` to locate the relevant guard logic.

**Pattern:** The fix mirrors the existing guard for `exact-path`/`dynamic-path` inherited policies. Extend the same condition to include `exact-key` and `regex-key` sources.
