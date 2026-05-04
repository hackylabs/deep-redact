# Story 2.4: Redact Matching Root Primitive String Inputs

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want a matching root primitive string to be redacted as one value,
so that I can protect secrets passed directly as a root string without substring callbacks altering the root input.

## Acceptance Criteria

1. Given the root input is a primitive string and it matches any configured substring rule, when redaction runs, then the entire root string is redacted using whole-value censor behaviour.
2. Given the root input is a primitive string and it matches a structured substring rule, when redaction runs, then the structured `replacer` callback is not applied to the root input.
3. Given the root input is a primitive string and it does not match any substring rule, when redaction runs, then the original root string is returned unchanged.
4. Given a root primitive is not a string, when redaction runs, then substring targeting is not applied to that value.

## Tasks / Subtasks

- [x] Remove the root-input guard from `transformSubstringValue` and add root-primitive whole-value code path (AC: 1, 2, 3, 4)
  - [x] In `src/core/runtime/redact-value.ts`, remove the `context.pathSegments.length === 0` branch from `transformSubstringValue` that causes early return for root inputs.
  - [x] Add a private helper `applyRootPrimitiveSubstringMatch` that accepts `value: string`, `rule: CompiledSubstringRule`, `plan: CompiledRedactorPlan`, and `context: TraversalContext`. It should check `patternMatchesString`, then — regardless of rule kind — build a `FunctionCensorContext` via `buildFunctionCensorContext` and call `applyRedaction` with `plan.defaults` for structured rules or `rule.policy` for whole-value rules.
  - [x] In `transformSubstringValue`, detect `isRootInput` (`context.pathSegments.length === 0`). When true, delegate to `applyRootPrimitiveSubstringMatch`; when false, continue to use existing `applySubstringRule`. The `typeof value !== 'string'` guard at the top of `transformSubstringValue` already handles AC4.
  - [x] Verify that `buildFunctionCensorContext` called with an empty `pathSegments` array produces a context where `matchedPath` is `[]`, `terminalKey` is absent, and `rootInput` is the original root string. No changes to `buildFunctionCensorContext` should be needed — the existing logic already handles `matchedPath.length === 0` → no `terminalKey`.

- [x] Update the existing Story 2.3 test that asserts root strings are unchanged (AC: 1, 2)
  - [x] In `test/contract/api/create-redactor.test.ts`, find the test `'leaves unmatched strings, non-string values, and root primitive strings unchanged'`. Remove the `expect(redact('token=secret')).toBe('token=secret')` assertion from it (this was a Story 2.3 placeholder — Story 2.4 now owns root primitive behaviour). Rename the test to `'leaves unmatched strings and non-string values unchanged'` to keep its remaining intent clear.
  - [x] Do not delete the test entirely; it still covers the non-matching and non-string-value paths.

- [x] Add focused Story 2.4 contract coverage (AC: 1-4)
  - [x] Add a `describe('Story 2.4: root primitive string redaction')` block to `test/contract/api/create-redactor.test.ts` after the Story 2.3 block, containing:
    - Bare RegExp rule matching a root string → whole-value default censor `[REDACTED]`.
    - Bare RegExp rule with a custom global literal censor matching a root string → literal censor applied.
    - Bare RegExp rule with a global function censor matching a root string → function censor called once with correct context: `value` is the original root string, `context.matchedPath` is `[]`, `context.terminalKey` is `undefined`, `context.rootInput` is the original root string.
    - Bare RegExp rule with `replaceStringByLength: true` matching a root string → same-length replacement applied (token repeated/truncated to match original length).
    - Structured rule matching a root string → whole-value censor applied (NOT the replacer); prove replacer spy is NOT called.
    - Structured rule matching a root string with global function censor → function censor called (not replacer).
    - Root string that does not match any substring rule → original string returned unchanged.
    - Root number, root boolean, and root `null` → returned unchanged (AC4).
    - First-match-wins for root strings: two rules where first matches → first rule applies, second rule spy not called.
    - `serialise: true` receives the already-redacted string from a root-string match.
    - `serialise: false` returns the censor-replaced string directly.
  - [x] Prove that the replacer spy of a structured rule is never called on a root-string input, even when the pattern matches.

- [x] Preserve v4 boundaries and verification discipline (AC: 1-4)
  - [x] Keep all changes in `src/core/runtime/redact-value.ts` and `test/contract/api/create-redactor.test.ts`. No other files require modification.
  - [x] Do not add dependencies or Node-only APIs. Core remains zero-runtime-dependency and browser-safe.
  - [x] Do not hand-edit `dist/` files. Run generators only through project scripts.
  - [x] Run focused Vitest checks while iterating, then run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase` under Node `24.14.1`. Record retained red-phase failures separately from new Story 2.4 regressions.

## Dev Notes

### Story Intent

- Story 2.4 is a small, targeted extension of the substring targeting subsystem introduced in Story 2.3. It lifts the intentional root-input guard that was left in place in Story 2.3.
- The product requirement is: when a bare string is passed directly as the root input and it matches a configured `stringTests` rule, it should be fully redacted — not partially rewritten by a structured replacer. The caller is passing the secret as the whole value, so whole-value censor behaviour is the correct contract.
- Structured replacer callbacks are intentionally excluded from root-input processing. The replacer contract (`(value: string, pattern: RegExp) => string`) is designed for partial substring rewrites within larger strings. At root level the input IS the secret, so whole-value treatment applies regardless of rule type.

### Technical Requirements

- The only code change needed is in `src/core/runtime/redact-value.ts`.
- `transformSubstringValue` currently guards: `if (typeof value !== 'string' || context.pathSegments.length === 0) return undefined`. Remove only the `context.pathSegments.length === 0` part; keep the `typeof value !== 'string'` guard.
- Add `applyRootPrimitiveSubstringMatch(value, rule, plan, context)`: checks `patternMatchesString`, then calls `buildFunctionCensorContext` with the empty `pathSegments` (root has no path), then calls `applyRedaction` using `rule.kind === 'whole-value' ? rule.policy : plan.defaults`.
- In `transformSubstringValue`, detect `isRootInput` with `context.pathSegments.length === 0`. Use `applyRootPrimitiveSubstringMatch` for root inputs, `applySubstringRule` for nested.
- The `buildFunctionCensorContext` result at root level: `matchedPath = []`, `terminalKey = undefined` (correctly omitted — the existing code already handles `matchedPath.length === 0` → no `terminalKey`). `rootInput` = original root string.
- First-match-wins semantics apply identically to root strings as to nested strings: iterate rules in order, return on first match.
- `remove: true` on a matching root string results in `redactValue` returning `undefined` (because `applyRedaction` returns `removedValue` and `redactValue` converts that to `undefined`). This is correct and a natural consequence of using `applyRedaction`.
- `replaceStringByLength: true` with a literal censor on a matching root string produces a same-length replacement of the original root string. `applyRedaction` handles this transparently.

### Architecture Compliance

- Keep `src/index.ts` as the thin public facade. No changes there.
- Keep traversal logic in `src/core/runtime/redact-value.ts`. No new files.
- Keep whole-value output shaping in `src/core/replacement/apply-redaction.ts`. No changes needed.
- The compile-once immutable plan model is unchanged. No changes to `src/core/compiler/compile-redactor-plan.ts`.
- No changes to `src/core/validation/validate-config.ts` — no new public options.
- No changes to `src/types/config.ts`, `src/types/public.ts`, or consumer fixtures — the public surface is unchanged.
- Deep Redact is one-way only. Do not add restore metadata.

### Current Source State (post Story 2.3)

- `transformSubstringValue` in `redact-value.ts` currently has `typeof value !== 'string' || context.pathSegments.length === 0` as its early-return guard. The second clause is what Story 2.4 removes for root-primitive matching.
- `applySubstringRule` handles both bare-regex (whole-value) and structured-replacer rules for nested strings.
- `CompiledWholeValueSubstringRule` has a `policy` field set to `plan.defaults` at compile time.
- `CompiledStructuredSubstringRule` has no `policy` field — use `plan.defaults` at the point of root-primitive redaction.
- The `buildFunctionCensorContext` helper already produces correct output for empty `pathSegments`: `matchedPath = []`, `terminalKey` absent.

### Library / Framework Requirements

- Use the current repository baseline from `package.json`:
  - `pnpm@10.33.0`
  - Node engine `>=22.18.0`
  - contributor runtime from `.nvmrc`: Node `24.14.1`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Do not upgrade tool versions in this story unless a blocker is proven.
- Keep ESM-first source patterns and explicit `.js` import specifiers in TypeScript source modules.
- The core package has no runtime dependencies. Do not add any.

### File Structure Requirements

- **Modify only:** `src/core/runtime/redact-value.ts`, `test/contract/api/create-redactor.test.ts`
- **No new files** required.
- Do not modify `src/core/compiler/compile-redactor-plan.ts`, `src/core/validation/validate-config.ts`, `src/types/**`, or any consumer fixture files.

### Testing Requirements

- Add failing tests first for root primitive string redaction before implementing runtime changes (red → green discipline from previous stories).
- All new tests belong in `test/contract/api/create-redactor.test.ts` inside a dedicated `describe('Story 2.4: root primitive string redaction')` block.
- Key contract tests to add:
  - `'redacts a matching root string with the default censor for a bare RegExp rule'`
  - `'redacts a matching root string with a custom literal censor for a bare RegExp rule'`
  - `'provides function censors with correct context for a bare RegExp match on a root string'` — assert `matchedPath = []`, `terminalKey` absent, `rootInput` is the original string
  - `'applies same-length replacement to a matching root string'`
  - `'redacts a matching root string using whole-value censor for a structured rule without calling the replacer'` — use `vi.fn` for the replacer and assert `toHaveBeenCalledTimes(0)`
  - `'provides function censors with correct context for a structured rule match on a root string'`
  - `'returns root string unchanged when no substring rule matches'`
  - `'returns non-string root primitives unchanged'` — cover `number`, `boolean`, `null`
  - `'stops at the first matching rule for root string inputs'`
  - `'passes the redacted root string to a custom serialise function'`
- Update the existing Story 2.3 test `'leaves unmatched strings, non-string values, and root primitive strings unchanged'`:
  - Remove `expect(redact('token=secret')).toBe('token=secret')` from it.
  - Rename it to `'leaves unmatched strings and non-string values unchanged'`.
- Preserve all existing green suites: `test/build.test.ts`, `test/contract/exports/import.test.ts`, `test/contract/exports/require.test.ts`, and `test/contract/types/declarations.test.ts`.

### Implementation Guardrails

- Do not implement cross-target precedence for root strings. Story 2.5 owns the normative precedence matrix. For now, substring rules apply to root strings only if no path or key rule has already claimed the root — but path/key rules target properties by name and do not match the root directly, so this is not a concern in practice.
- Do not implement fuzzy or case-insensitive key matching. Story 2.6 owns those.
- Do not call structured replacers on root strings. This is the central invariant of Story 2.4.
- Do not make the root-primitive path async.
- Do not add root-primitive-specific diagnostics or `[UNSUPPORTED]` handling. Story 3.5 owns runtime failure degradation.
- Do not apply `replaceStringByLength` to a root-string match that goes through `applyRedaction` via a structured rule using `plan.defaults`. If `plan.defaults.replaceStringByLength` is true, `applyRedaction` will naturally apply it — this is correct and consistent.
- Do not add new public options or change the public API surface. No `PathEntry`, `KeySelector`, or `StringTest` type changes are required.
- Do not hand-edit generated files. If public type exports require generated artefact updates, run `pnpm run generate`. (None should be required for this story.)

### Previous Story Intelligence

- Story 2.3 added `stringTests` to `DeepRedactOptions`, introduced `CompiledSubstringRule` (whole-value and structured-replacer variants), and added the nested string leaf hook in `redact-value.ts`. It intentionally left the `context.pathSegments.length === 0` guard in place.
- Story 2.3 established that `applySubstringRule` handles both rule kinds for nested strings, with `applyRedaction` for bare-regex and direct replacer invocation for structured rules. Story 2.4 adds a parallel root-primitive path that always uses `applyRedaction`.
- Story 2.3 established `buildSubstringRulePath` as the function that creates the `rulePath` for bare-regex substring contexts (a cloned RegExp in a frozen array). Reuse it for root-primitive whole-value contexts.
- Story 2.3 confirmed that `patternMatchesString` resets `lastIndex` before and after each test. Reuse it in the new `applyRootPrimitiveSubstringMatch` helper.
- Story 2.3 added a `cloneRegExp` import from `regex-safety.ts`. The new helper does NOT need to clone the pattern for calling `patternMatchesString` (it already resets `lastIndex` internally) or for `buildSubstringRulePath` (it already clones). No additional cloning is required.
- Story 2.2 established `FunctionCensorContext` shape: `{ matchedPath, rulePath, rootInput, terminalKey? }`. For root inputs, `terminalKey` must be absent (not `undefined` as a value). `buildFunctionCensorContext` already handles this correctly when `pathSegments` is empty.
- Story 2.2 confirmed that `replaceStringByLength: true` is handled inside `applyRedaction` for literal censors and is skipped for function censor returns. This applies to root-string matches too without any additional code.
- Story 2.1 established `removedValue` sentinel and the pattern that `redactValue` converts it to `undefined`. A root-string match with `remove: true` will return `undefined` from `redactValue`.
- Sprint status shows story `1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads` is still `review`, but all other Epic 1 and Epic 2 stories up to 2.3 are `done`. Treat the current source tree and green tests as authoritative.

### Recent Git Intelligence

- `2d0d6df feat(API): react matched substrings in nested string values` is the Story 2.3 implementation commit. The core files it touched (`redact-value.ts`, `compile-redactor-plan.ts`, `validate-config.ts`, `create-redactor.test.ts`) are the same files that Story 2.4 touches, though Story 2.4 only modifies `redact-value.ts` and the test file.
- The commit history shows a consistent pattern: implementation story commits precede test-focused review commits. Follow the same discipline for Story 2.4.
- `5e7b3f8 feat(API): support function censors and same length string replacement` shows that `buildFunctionCensorContext` and `applyRedaction` were the key integration points for the function-censor pipeline. Story 2.4 reuses both unchanged.

### Project Structure Notes

- All implementation work stays within `src/core/runtime/redact-value.ts` — the most surgical change in Epic 2.
- All test work stays within `test/contract/api/create-redactor.test.ts`.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`.

### References

- Local planning artefacts
  - `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.4
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` — current development status
- Previous implementation context
  - `_bmad-output/implementation-artifacts/2-3-redact-matched-substrings-in-nested-string-values.md`
  - `_bmad-output/implementation-artifacts/2-2-support-function-censors-and-same-length-string-replacement.md`
  - `_bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md`
- Current repo files (primary)
  - `src/core/runtime/redact-value.ts`
  - `test/contract/api/create-redactor.test.ts`
- Current repo files (reference only — no changes needed)
  - `src/core/compiler/compile-redactor-plan.ts`
  - `src/core/replacement/apply-redaction.ts`
  - `src/core/validation/regex-safety.ts`
  - `src/types/config.ts`
  - `src/types/public.ts`

## Story Completion Status

Context analysis completed; story is ready for implementation.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward, no debugging required.

### Completion Notes List

- Added `applyRootPrimitiveSubstringMatch` private helper in `redact-value.ts`. Checks pattern match, builds `FunctionCensorContext` via `buildFunctionCensorContext` (empty `pathSegments` → `matchedPath: []`, `terminalKey` absent), then calls `applyRedaction` with `rule.policy` for whole-value rules or `plan.defaults` for structured rules. Replacer is intentionally never invoked for root inputs.
- Updated `transformSubstringValue` guard: removed `context.pathSegments.length === 0` from the early-return condition (kept `typeof value !== 'string'`). Added `isRootInput` detection to route to `applyRootPrimitiveSubstringMatch` vs existing `applySubstringRule`.
- Renamed Story 2.3 test and removed the root-string placeholder assertion from it.
- Added 11 contract tests in `describe('Story 2.4: root primitive string redaction')` covering all ACs.
- Ran `pnpm run build` to regenerate `dist/index.js` after source changes.
- All 172 tests pass; lint clean. Red-phase failures are pre-existing v3 API tests, not Story 2.4 regressions.

### File List

- `src/core/runtime/redact-value.ts`
- `test/contract/api/create-redactor.test.ts`
- `dist/index.js`
