# Story 7.2: Prove Behavioural Equivalence of the Compiled Path Executor

Status: done

## Story

As a backend engineer,
I want guaranteed identical redaction output regardless of which internal execution path processes my call,
so that the performance optimisation introduced by Story 7.1 cannot silently change my redaction results as the codebase evolves.

## Context

Story 4.3 established a behavioural equivalence proof between the then-current fast lane and the general traversal, implemented via the `exactPathEquivalenceCorpus` in `test/fixtures/exact-path-equivalence/index.ts` and the "Exact-path fast-lane and generic traversal equivalence" describe block in `test/contract/api/create-redactor.test.ts`.

Story 7.1 introduced a completely new compiled path executor (`buildFastLaneExecutor` in `src/core/runtime/fast-lane.ts`) that generates direct property-accessor closures at init time using a prefix trie. This executor is wired into `create-redactor.ts` via `isExactPathOnly` candidacy + a per-call safety guard that delegates unsafe payloads to `redactValue`.

**Important distinction:** The existing Story 4.3 corpus tests call `redactValue` for BOTH lanes (the `createLaneForcedRedactorFromPlan` fixture converts exact rules to dynamic rules for the 'generic' lane). They prove the general traversal is consistent across plan representations. They do **not** exercise `buildFastLaneExecutor`. Story 7.2 extends coverage to prove the compiled path executor itself is behaviourally equivalent to the general traversal.

**Per the 2026-05-25 course-correction**, the corpus must also cover payloads that are NOT fast-lane-safe (supported-transformable runtime values, circular references, throwing accessors) and prove that the wired redactor's per-call guard delegates correctly, producing identical output to the general traversal.

**No source code changes are required.** This is a pure test/proof story. Environment bootstrap: `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

1. **Structural equivalence corpus — compiled executor vs. general traversal:** For each of the following cases, `buildFastLaneExecutor(plan, failOnDelegation)(payload)` produces deeply equal output to `redactValue(payload, plan)` (verified by contract tests):
   - A single-segment path (root-level key, e.g. `paths: ['password']`)
   - A two-segment path (one level of nesting, e.g. `paths: ['user.password']`) — already in corpus as `single-exact-path`
   - A three-or-more-segment path (deep nesting, e.g. `paths: ['a.b.c.secret']`)
   - Multiple paths sharing a common prefix segment (e.g. `paths: ['user.password', 'user.email']`)
   - Multiple paths sharing no common prefix (e.g. `paths: ['user.password', 'session.token']`) — already in corpus as `multiple-exact-paths`
   - A path whose terminal key is absent from the input — already in corpus as `exact-path-absent-key`
   - A path whose intermediate key is absent from the input (e.g. `paths: ['user.profile.email']` where `user.profile` does not exist)
   - A path whose value is `null`, a number, a boolean, or an empty string — already in corpus as `exact-path-primitive-leaf-values`
   - A path whose value is a nested object (non-`retainStructure`, wholesale-redacted)
   - A path whose value is an array (wholesale-redacted by default censor)
   - Two paths pointing to the same terminal key name under different parent paths (e.g. `paths: ['a.secret', 'b.secret']`)

2. **Corpus coverage gate:** A comment in the corpus file lists each AC-1 case and cross-references the corpus entry name that covers it. Any new path added to the compiled path executor's code path has a corresponding corpus entry.

3. **Divergence detection:** When the compiled path executor produces output differing from the general traversal for any corpus case, the test fails with a diff identifying the diverging key and value (achieved via `toStrictEqual`).

4. **Delegation equivalence — unsafe payloads:** For each of the following unsafe payload types, the wired redactor (`createRedactor(options)(payload)`) produces output deeply equal to the general traversal (`redactValue(payload, plan)`) for an exact-path-only config. Coverage required:
   - `Date`
   - `Map`
   - `BigInt`
   - `Error`
   - `Set`
   - `RegExp`
   - `URL`
   - Circular reference
   - Payload with a throwing property accessor (getter that throws)
   These cases are proven at the **contract test level** (in the equivalence describe block in `test/contract/api/create-redactor.test.ts`), complementing the existing unit-level delegation tests in `test/unit/core/fast-lane.test.ts`.

5. **Existing tests pass:** All existing tests continue to pass without modification. No corpus entry already present in `exactPathEquivalenceCorpus` is removed or altered.

## Tasks / Subtasks

- [x] Add missing structural corpus entries to `test/fixtures/exact-path-equivalence/index.ts` (AC: 1, 2)
  - [x] Add `single-segment-path` entry: `paths: ['password']`, payload `{password: 'secret', safe: 'keep'}`, expected `{password: '[REDACTED]', safe: 'keep'}`
  - [x] Add `deep-nested-path` entry: `paths: ['a.b.c.secret']`, payload `{a: {b: {c: {secret: 'hidden', safe: 'keep'}}}}`, expected `{a: {b: {c: {secret: '[REDACTED]', safe: 'keep'}}}}`
  - [x] Add `common-prefix-paths` entry: `paths: ['user.password', 'user.email']`, payload `{user: {password: 'pw', email: 'user@example.com', safe: 'keep'}}`, expected `{user: {password: '[REDACTED]', email: '[REDACTED]', safe: 'keep'}}`
  - [x] Add `absent-intermediate-key` entry: `paths: ['user.profile.email']`, payload `{user: {name: 'alice'}}`, expected unchanged `{user: {name: 'alice'}}`
  - [x] Add `array-terminal-value` entry: `paths: ['user.items']`, payload `{user: {items: [1, 2, 3], name: 'alice'}}`, expected `{user: {items: '[REDACTED]', name: 'alice'}}`
  - [x] Add `same-terminal-key-different-parents` entry: `paths: ['a.secret', 'b.secret']`, payload `{a: {secret: 'x', safe: 'keep-a'}, b: {secret: 'y', safe: 'keep-b'}}`, expected `{a: {secret: '[REDACTED]', safe: 'keep-a'}, b: {secret: '[REDACTED]', safe: 'keep-b'}}`
  - [x] Add `nested-object-terminal` entry: `paths: ['user.address']`, payload `{user: {id: 1, address: {city: 'Springfield', postalCode: '62701'}}}`, expected `{user: {id: 1, address: '[REDACTED]'}}` — covers AC-1i wholesale-redact code path
  - [x] Add `exact-path-empty-string-value` entry: `paths: ['data.tag']`, payload `{data: {tag: '', safe: 'keep'}}`, expected `{data: {tag: '[REDACTED]', safe: 'keep'}}` — covers AC-1h empty-string case (absent from existing `exact-path-primitive-leaf-values` entry)
  - [x] Add serialised canary string constants for each new entry (8 total: the 6 listed in the Dev Notes canary block plus `nested-object-terminal` and `exact-path-empty-string-value`)
  - [x] Add coverage comment listing all AC-1 cases and their corpus entry names
  - [x] Export `delegationProofCorpus` (new array) and `DelegationProofEntry` type from the same file, covering the AC-4 unsafe payload types

- [x] Extend `test/contract/api/create-redactor.test.ts` with compiled-executor equivalence tests (AC: 1, 3)
  - [x] Import `buildFastLaneExecutor` from `../../../src/core/runtime/fast-lane.js` in the equivalence section
  - [x] Add `describe('Compiled path executor vs. general traversal equivalence')` block (sibling to the existing "Exact-path fast-lane and generic traversal equivalence" describe)
  - [x] Add `it.each(exactPathEquivalenceCorpus)` test that: (a) builds `buildFastLaneExecutor(plan, failOnDelegation)`, (b) runs `redactValue(payload, plan)`, (c) asserts deep equality and byte-for-byte serialised equality — using `failOnDelegation` to prove the executor handled the payload itself
  - [x] Add delegation proof tests iterating `delegationProofCorpus`: `createRedactor(entry.options)(entry.createPayload())` deeply equals `redactValue(entry.createPayload(), plan)` (AC: 4)
  - [x] Add individual `it` tests for circular reference and throwing getter (these cannot be cleanly expressed as `createPayload: () => unknown` in a shared corpus because the fixture depends on mutable state or a getter) (AC: 4)

- [x] Run the full test suite and verify all tests pass (AC: 5)
  - [x] `source .agents/initialise-env.sh && pnpm run test` — confirm all existing tests pass and new tests pass

### Review Findings

- [x] [Review][Patch] `deep-nested-path` title says "three-segment" but path `a.b.c.secret` has four segments — fixed: title updated to "four-segment deep-nested path" [`test/fixtures/exact-path-equivalence/index.ts`]
- [x] [Review][Patch] AC coverage map comment lacks blank line before `export const exactPathEquivalenceCorpus` — fixed: blank line added [`test/fixtures/exact-path-equivalence/index.ts`]
- [x] [Review][Patch] `deep-nested-path` corpus entry closing `},` indented at 4 spaces instead of 2 — **dismissed**: file already has 2-space indent; false positive from diff formatting in Blind Hunter prompt [`test/fixtures/exact-path-equivalence/index.ts`]
- [x] [Review][Patch] `absent-intermediate-key` corpus entry only tests a missing object key, not `null` at the intermediate position — fixed: added `null-intermediate-key` corpus entry + canary + coverage comment update; 511 tests pass [`test/fixtures/exact-path-equivalence/index.ts`]
- [x] [Review][Patch] Single-segment absent terminal key not covered — added `single-segment-absent-key` corpus entry (`paths: ['missing']`, payload `{safe: 'keep'}`); 515 tests pass [`test/fixtures/exact-path-equivalence/index.ts`]
- [x] [Review][Patch] Path-is-prefix-of-sibling edge case not covered — added `parent-and-child-paths` corpus entry (`paths: ['user', 'user.password']`); proves terminal rule short-circuits descendant traversal, expected `{user: '[REDACTED]'}`; 515 tests pass [`test/fixtures/exact-path-equivalence/index.ts`]
- [x] [Review][Dismiss] Pre-existing `expect(fastResult).toBe(fastResult)` self-comparison tautology — **dismissed**: HEAD already has `expect(fastResult).toBe(genericResult)`; false positive from stale context line in Blind Hunter prompt [`test/contract/api/create-redactor.test.ts`]

## Dev Notes

### Environment Bootstrap

```bash
source .agents/initialise-env.sh
```

Required before any `pnpm run` command. The dev environment initialises Node version, pnpm, and environment variables needed for the test runner.

---

### Key File Locations

| File | Change type |
|------|-------------|
| `test/fixtures/exact-path-equivalence/index.ts` | Modify — add corpus entries, `DelegationProofEntry` type, `delegationProofCorpus` |
| `test/contract/api/create-redactor.test.ts` | Modify — add compiled-executor equivalence describe block, delegation proof tests |

No source code changes. No `src/` changes.

---

### Corpus Entry Shape

Each new structural entry must conform to `ExactPathEquivalenceCorpusEntry` (already exported from `test/fixtures/exact-path-equivalence/index.ts`):

```typescript
export interface ExactPathEquivalenceCorpusEntry {
  readonly name: string;
  readonly title: string;
  readonly exactPathEligibilityReason: string;
  readonly options: DeepRedactOptions;
  readonly createPayload: () => unknown;
  readonly expectedStructured: unknown;
  readonly expectedSerialised: string;
  readonly expectedCustomSerialised?: string;
}
```

Follow the established pattern: define a `const SERIALISED_<NAME>_CANARY = '...' as const` string at the top of the canary block, then reference it in the corpus entry. The canary string commits the exact byte sequence; if property order regresses the canary fails before the corpus tests run.

Example canary block to add (after existing canaries):

```typescript
const SERIALISED_SINGLE_SEGMENT_PATH_CANARY =
  '{"password":"[REDACTED]","safe":"keep"}' as const

const SERIALISED_DEEP_NESTED_PATH_CANARY =
  '{"a":{"b":{"c":{"secret":"[REDACTED]","safe":"keep"}}}}' as const

const SERIALISED_COMMON_PREFIX_PATHS_CANARY =
  '{"user":{"password":"[REDACTED]","email":"[REDACTED]","safe":"keep"}}' as const

const SERIALISED_ABSENT_INTERMEDIATE_KEY_CANARY =
  '{"user":{"name":"alice"}}' as const

const SERIALISED_ARRAY_TERMINAL_VALUE_CANARY =
  '{"user":{"items":"[REDACTED]","name":"alice"}}' as const

const SERIALISED_SAME_TERMINAL_KEY_DIFFERENT_PARENTS_CANARY =
  '{"a":{"secret":"[REDACTED]","safe":"keep-a"},"b":{"secret":"[REDACTED]","safe":"keep-b"}}' as const

const SERIALISED_NESTED_OBJECT_TERMINAL_CANARY =
  '{"user":{"id":1,"address":"[REDACTED]"}}' as const

const SERIALISED_EMPTY_STRING_VALUE_CANARY =
  '{"data":{"tag":"[REDACTED]","safe":"keep"}}' as const
```

### New corpus entry shapes (add after existing entries, before the coverage comment)

The six entries spec'd in the task list plus these two new ones:

```typescript
// AC-1i — wholesale-redact case (no retainStructure). The existing exact-path-retain-structure
// entry covers retainStructure: true; this entry covers the default wholesale-redact code path.
{
  name: 'nested-object-terminal',
  title: 'exact path targeting a nested object terminal — wholesale redact (no retainStructure)',
  exactPathEligibilityReason: 'one exact static absolute path; the terminal value is a nested object, censored wholesale by default policy',
  options: { paths: ['user.address'] },
  createPayload: () => ({ user: { id: 1, address: { city: 'Springfield', postalCode: '62701' } } }),
  expectedStructured: { user: { id: 1, address: '[REDACTED]' } },
  expectedSerialised: SERIALISED_NESTED_OBJECT_TERMINAL_CANARY,
},

// AC-1h — empty string. The existing exact-path-primitive-leaf-values entry covers null, number,
// and boolean but does NOT contain an empty string. This entry closes that gap.
{
  name: 'exact-path-empty-string-value',
  title: 'exact path targeting an empty string terminal value',
  exactPathEligibilityReason: 'one exact static absolute path; the terminal value is an empty string',
  options: { paths: ['data.tag'] },
  createPayload: () => ({ data: { tag: '', safe: 'keep' } }),
  expectedStructured: { data: { tag: '[REDACTED]', safe: 'keep' } },
  expectedSerialised: SERIALISED_EMPTY_STRING_VALUE_CANARY,
},
```

---

### Delegation Proof Corpus Type and Array

Add after the structural corpus:

```typescript
export interface DelegationProofEntry {
  readonly name: string;
  readonly title: string;
  readonly unsafeReason: string;
  readonly options: DeepRedactOptions;
  readonly createPayload: () => unknown;
}

export const delegationProofCorpus: readonly DelegationProofEntry[] = [
  {
    name: 'delegate-date',
    title: 'delegates payload containing a Date',
    unsafeReason: 'Date is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, meta: { created: new Date('2020-01-01T00:00:00.000Z') } }),
  },
  {
    name: 'delegate-map',
    title: 'delegates payload containing a Map',
    unsafeReason: 'Map is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, lookup: new Map([['k', 'v']]) }),
  },
  {
    name: 'delegate-bigint',
    title: 'delegates payload containing a BigInt',
    unsafeReason: 'BigInt is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, count: 10n }),
  },
  {
    name: 'delegate-error',
    title: 'delegates payload containing an Error',
    unsafeReason: 'Error is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, failure: new Error('boom') }),
  },
  {
    name: 'delegate-set',
    title: 'delegates payload containing a Set',
    unsafeReason: 'Set is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, tags: new Set(['a', 'b']) }),
  },
  {
    name: 'delegate-regexp',
    title: 'delegates payload containing a RegExp',
    unsafeReason: 'RegExp is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, pattern: /secret/i }),
  },
  {
    name: 'delegate-url',
    title: 'delegates payload containing a URL',
    unsafeReason: 'URL is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, endpoint: new URL('https://example.com') }),
  },
]
```

Circular references and throwing getters are handled as individual `it` blocks in the contract test (not as corpus entries) because they use mutable object state that cannot be cleanly expressed as a pure `createPayload: () => unknown` factory.

---

### Contract Test — Compiled Executor Equivalence Block

Import additions needed at the top of the equivalence test block:

```typescript
import { buildFastLaneExecutor } from '../../../src/core/runtime/fast-lane.js'
import { redactValue } from '../../../src/core/runtime/redact-value.js'
import { delegationProofCorpus } from '../../fixtures/exact-path-equivalence/index.js'
```

Note: `redactValue` is **not** currently imported in `test/contract/api/create-redactor.test.ts` — add it as a new import. `delegationProofCorpus` should be added to the existing destructure that imports `exactPathEquivalenceCorpus` (not as a separate import statement). See the Import Map section for full details.

The `failOnDelegation` helper (same pattern as in `test/unit/core/fast-lane.test.ts`):

```typescript
const failOnDelegation = (): never => {
  throw new Error('fast lane unexpectedly delegated to the general traversal')
}
```

Structural equivalence describe block:

```typescript
describe('Compiled path executor vs. general traversal equivalence', () => {
  it.each(exactPathEquivalenceCorpus)(
    'compiled executor and general traversal produce identical output for: $title',
    (entry) => {
      const plan = compileRedactorPlan(entry.options)
      expect(plan.isExactPathOnly).toBe(true)

      const payload = entry.createPayload()

      // General traversal reference
      const general = redactValue(payload, plan)

      // Compiled executor — failOnDelegation proves the executor handled it directly
      const fast = buildFastLaneExecutor(plan, failOnDelegation)(entry.createPayload())

      expect(fast).toStrictEqual(general)
      expect(fast).toStrictEqual(entry.expectedStructured)
      expect(JSON.stringify(fast)).toBe(entry.expectedSerialised)
      expect(JSON.stringify(general)).toBe(entry.expectedSerialised)
    },
  )

  describe('delegation proof — unsafe payloads produce identical output via wired redactor', () => {
    it.each(delegationProofCorpus)(
      'wired redactor delegates and matches general traversal: $title',
      (entry) => {
        const plan = compileRedactorPlan(entry.options)
        const payload = entry.createPayload()

        const wiredResult = createRedactor(entry.options)(payload)
        const generalResult = redactValue(entry.createPayload(), plan)

        expect(wiredResult).toStrictEqual(generalResult)
      },
    )

    it('wired redactor matches general traversal for circular-reference payload', () => {
      const options = { paths: ['user.password'] }
      const plan = compileRedactorPlan(options)

      const buildPayload = (): Record<string, unknown> => {
        const payload: Record<string, unknown> = { user: { password: 'pw', name: 'alice' } }
        payload.self = payload
        return payload
      }

      expect(createRedactor(options)(buildPayload())).toStrictEqual(
        redactValue(buildPayload(), plan),
      )
    })

    it('wired redactor matches general traversal for payload with throwing getter', () => {
      const options = { paths: ['user.password'] }
      const plan = compileRedactorPlan(options)

      const buildPayload = (): Record<string, unknown> => ({
        user: { password: 'pw' },
        get danger(): never {
          throw new Error('nope')
        },
      })

      expect(createRedactor(options)(buildPayload())).toStrictEqual(
        redactValue(buildPayload(), plan),
      )
    })
  })
})
```

---

### Coverage Comment in Corpus File

Add a comment block immediately before the `exactPathEquivalenceCorpus` export to satisfy AC 2:

```typescript
// AC coverage map — Story 7.2 requires the following cases to be represented in this corpus:
//   AC-1a  single-segment path (root-level key)           → 'single-segment-path'
//   AC-1b  two-segment path (one level of nesting)        → 'single-exact-path'
//   AC-1c  three-or-more-segment path (deep nesting)      → 'deep-nested-path'
//   AC-1d  common prefix paths                            → 'common-prefix-paths'
//   AC-1e  no common prefix paths                         → 'multiple-exact-paths'
//   AC-1f  absent terminal key                            → 'exact-path-absent-key'
//   AC-1g  absent intermediate key                        → 'absent-intermediate-key'
//   AC-1h  null / number / boolean / empty-string values  → 'exact-path-primitive-leaf-values' (null/number/boolean) + 'exact-path-empty-string-value'
//   AC-1i  nested object terminal (wholesale redact)      → 'exact-path-retain-structure' (retainStructure: true) + 'nested-object-terminal' (default wholesale)
//   AC-1j  array terminal value (wholesale redact)        → 'array-terminal-value'
//   AC-1k  same terminal key under different parents      → 'same-terminal-key-different-parents'
```

Notes:
- **AC-1h**: The existing `exact-path-primitive-leaf-values` entry covers `null`, `number`, and `boolean` but does **not** contain an empty string. A new `exact-path-empty-string-value` entry is required to close this gap. Full entry shape is in the "New corpus entry shapes" section above.
- **AC-1i**: Requires two corpus entries — `exact-path-retain-structure` covers the `retainStructure: true` branch; `nested-object-terminal` covers the default wholesale-redact code path. Full entry shape is in the "New corpus entry shapes" section above.

---

### Existing Corpus Infrastructure

The existing `it.each(exactPathEquivalenceCorpus)` test in the "Exact-path fast-lane and generic traversal equivalence" describe block (line 4697 of `test/contract/api/create-redactor.test.ts`) will **automatically run the new corpus entries** via `createLaneForcedRedactorFromPlan` (which calls `redactValue` for both lanes). No modification to that block is needed — just adding entries to `exactPathEquivalenceCorpus` is sufficient to extend that proof.

The new "Compiled path executor vs. general traversal equivalence" describe block tests `buildFastLaneExecutor` directly, which is what the Story 7.2 AC mandates.

---

### Import Map for Contract Test

Confirmed present in `test/contract/api/create-redactor.test.ts` — no action needed:
- `compileRedactorPlan` from `../../../src/core/compiler/compile-redactor-plan.js`
- `createRedactor` from `../../../src/index.js` (exported from the public index alongside `deepRedact`, `DeepRedactOptions`, etc.)
- `exactPathEquivalenceCorpus`, `createLaneForcedRedactor`, `createLaneForcedRedactorFromPlan` from `../../fixtures/exact-path-equivalence/index.js`
- `FunctionCensorContext` from `../../../src/index.js` (same destructure as `createRedactor`)

New imports to add — confirmed NOT currently present:
- `buildFastLaneExecutor` from `'../../../src/core/runtime/fast-lane.js'` (new import)
- `redactValue` from `'../../../src/core/runtime/redact-value.js'` (new import — not yet imported in this file)
- `delegationProofCorpus` from `'../../fixtures/exact-path-equivalence/index.js'` (add to the existing destructure that imports `exactPathEquivalenceCorpus`)

---

### Codebase Conventions

- **British English** in all comments and identifiers.
- **`kebab-case`** for file names, **`camelCase`** for functions, variables, properties.
- Tests live under `test/`, not co-located with `src/`.
- No new test files need to be created — all changes go into the two existing files above.
- Use `toStrictEqual` for deep equality (not `toEqual`) to catch prototype and undefined-property differences.
- Canary serialised strings must be written as `'...' as const` to ensure literal typing.
- `it.each` titles use `$title` or `$name` interpolation to surface the corpus entry being tested.

---

### Wiring Reminder

`buildFastLaneExecutor(plan, fallback)` signature (from `src/core/runtime/fast-lane.ts`):
```typescript
export function buildFastLaneExecutor(
  plan: CompiledRedactorPlan,
  fallback: (value: unknown) => unknown,
): FastLaneExecutor
```

The `fallback` is called when the payload is not fast-lane-safe (contains a Date, Map, circular ref, etc.). In corpus structural tests, pass `failOnDelegation` as the fallback — this proves the compiled executor handled the payload without delegating (corpus entries are plain-data payloads, so delegation should never happen). In delegation proof tests, use `createRedactor(options)` which internally wires `redactValue` as the fallback.

---

### Previous Story Context

Story 7.1 (most recent completed) delivered the compiled path executor. Key outcomes relevant to this story:
- `isExactPathOnly: boolean` flag on `CompiledRedactorPlan` signals candidacy
- `buildFastLaneExecutor(plan, fallback)` builds a fused single-pass executor with inline safety detection
- The executor returns a `delegate` sentinel when a payload is unsafe, causing the wired `redactValue` fallback to handle the call
- 471 contract tests + 34 fast-lane unit tests pass on the clean tree
- Two pre-existing legacy failures (`test/unit/index.test.ts`, `test/load/redact.test.ts` — the retired v3 `DeepRedact` constructor API) are unrelated and expected

### Open Review Item from Story 7.1

Story 7.1's review left this open: `fuzzyKeyMatch: true` / `caseSensitiveKeyMatch: false` not explicitly excluded from `isExactPathOnly`. The review accepted the Dev Notes' implicit-coverage reasoning (no explicit guard needed, because these options only affect key rules and there are no key rules in `isExactPathOnly` configs). No action required for Story 7.2, but note that a test for `fuzzyKeyMatch: true` eligibility rejection exists in `test/unit/core/fast-lane.test.ts` at line 54.

---

### Change Log

- 2026-05-26: Story 7.2 created — behavioural equivalence proof for the compiled path executor; extends exact-path equivalence corpus with missing structural cases and adds delegation proof contract tests
- 2026-05-26: Story 7.2 implemented — 8 corpus entries + coverage comment + DelegationProofEntry/delegationProofCorpus added to fixtures; compiled-executor equivalence describe block (22 structural + 7 delegation + 2 individual tests) added to contract test; 509 contract tests pass

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Added 8 new canary string constants and 8 structural corpus entries to `test/fixtures/exact-path-equivalence/index.ts`: `single-segment-path`, `deep-nested-path`, `common-prefix-paths`, `absent-intermediate-key`, `array-terminal-value`, `same-terminal-key-different-parents`, `nested-object-terminal`, `exact-path-empty-string-value`.
- Added AC coverage map comment to the corpus file documenting all AC-1 cases and their corpus entry names.
- Exported `DelegationProofEntry` interface and `delegationProofCorpus` (7 entries: Date, Map, BigInt, Error, Set, RegExp, URL) from the fixtures file.
- Added new imports (`buildFastLaneExecutor`, `redactValue`, `delegationProofCorpus`) to `test/contract/api/create-redactor.test.ts`.
- Added `describe('Compiled path executor vs. general traversal equivalence')` block with: `it.each(exactPathEquivalenceCorpus)` using `failOnDelegation` to prove direct executor handling; `it.each(delegationProofCorpus)` for unsafe-payload delegation; and individual `it` tests for circular reference and throwing getter.
- Fixed delegation proof test to use the same payload instance for both `wiredResult` and `generalResult` — avoids Error stack-trace divergence from separate instantiation.
- Total: 509 contract tests pass (up from 471), pre-existing benchmark-manifest failure is unrelated and was present before this story.

### File List

- `test/fixtures/exact-path-equivalence/index.ts`
- `test/contract/api/create-redactor.test.ts`
