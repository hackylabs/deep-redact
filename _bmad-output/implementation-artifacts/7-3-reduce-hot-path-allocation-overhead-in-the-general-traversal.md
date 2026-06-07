# Story 7.3: Reduce Hot-Path Allocation Overhead in the General Traversal

Status: done

## Story

As a backend engineer,
I want the general traversal algorithm's per-call and per-node allocation overhead reduced,
so that configs using key rules, dynamic paths, fuzzy matching, or string tests perform closer to their theoretical minimum and the general path benefits from the same allocation discipline applied to the compiled executor in Story 7.1.

## Context

Story 7.1 introduced a compiled path executor (`buildFastLaneExecutor`) that eliminated per-call WeakMaps, frozen path arrays, `Object.defineProperty`, and canonical path string allocation from exact-path-only configs. Story 7.2 proved behavioural equivalence of that executor. Both stories left the **general traversal** (`redactValue` → `transformNode`) untouched.

The general traversal is used for any config that cannot use the fast lane: key rules (`keys`/`blacklistedKeys`), dynamic paths (`*`, `**`, ignore, regex segments), fuzzy matching, case-insensitive matching, and substring tests. These configs still pay four avoidable costs on every `.redact()` call:

1. `Object.defineProperty` for every property set on the output object
2. A new frozen array allocation (`[...pathSegments, pathSegment]`) at every depth level
3. An unconditional call to `resolveDynamicPathRule` even when no dynamic rules exist
4. An unconditional call to `resolveDirectKeyMatch` even when no key rules exist
5. An unconditional call to `buildRuleContextKey` even when `activePolicy` is `undefined`

This story eliminates all five. The changes are **purely internal** — no public API, no output behaviour, no test semantics change. All existing tests must pass unmodified.

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

1. **Given** any redactor using the general traversal path  
   **When** `.redact(payload)` is invoked  
   **Then** `setObjectEntry` uses direct property assignment (`target[key] = value`) instead of `Object.defineProperty`

2. **And** the path-segment array passed through the traversal is managed as a mutable stack (push at entry, pop at exit) rather than a new frozen spread-copy at every depth level

3. **And** `resolveDynamicPathRule` is not called when `plan.dynamicPathRules.length === 0`

4. **And** `resolveDirectKeyMatch` is not called when `plan.exactKeyRules.literalMatchers.length === 0` and `plan.regexKeyRules.matchers.length === 0`

5. **And** `buildRuleContextKey` is not called when `activePolicy` is `undefined`

6. **Given** the general traversal changes  
   **When** the full test suite is executed  
   **Then** all existing tests pass without modification  
   **And** no change in output, error behaviour, or observable semantics is introduced

## Tasks / Subtasks

- [x] AC 1 — Replace `Object.defineProperty` in `setObjectEntry` with direct assignment (AC: 1)
  - [x] Change body of `setObjectEntry` (line 142–147) from `Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true })` to `target[key] = value`

- [x] AC 2 — Convert path-segment array from frozen spread-copies to a mutable push/pop stack (AC: 2)
  - [x] Change `TraversalContext.pathSegments` type from `readonly ExactPathSegment[]` to `ExactPathSegment[]`
  - [x] Update `transformArray`, `transformObject`, `transformCompletedArray`, `transformCompletedObject` parameter signatures accordingly
  - [x] Replace each `pathSegments: Object.freeze([...pathSegments, pathSegment])` in the four traversal loops (lines 814, 949, 1056, 1134) with push-before / pop-after wrapping the `transformNestedNode` call (use `try/finally`)
  - [x] Change root call in `redactValue` (line 1439) from `pathSegments: Object.freeze([]) as readonly ExactPathSegment[]` to `pathSegments: []`
  - [x] Ensure type annotation at line 548 (`matchedPath` snapshot) still works — `.map((seg) => seg.value)` creates a copy, so it is safe against the mutable array

- [x] AC 3 — Guard `resolveDynamicPathRule` (AC: 3)
  - [x] At lines 1215 and 1362 (both calls to `resolveDynamicPathRule`), wrap with `plan.dynamicPathRules.length === 0 ? undefined : resolveDynamicPathRule(plan, context.pathSegments)`

- [x] AC 4 — Guard `resolveDirectKeyMatch` (AC: 4)
  - [x] At lines 947 and 1132 (both `directKeyMatch: resolveDirectKeyMatch(plan, key)` assignments), wrap with an early-exit guard: only call when `plan.exactKeyRules.literalMatchers.length > 0 || plan.regexKeyRules.matchers.length > 0`

- [x] AC 5 — Guard `buildRuleContextKey` (AC: 5)
  - [x] At line 746, change `const ruleContextKey = buildRuleContextKey(activePolicy)` to `const ruleContextKey = activePolicy === undefined ? 'none' : buildRuleContextKey(activePolicy)`

- [x] Verify full test suite passes (AC: 6)
  - [x] `source .agents/initialise-env.sh && pnpm run test`
  - [x] Confirm all previously-passing tests still pass; confirm zero output or semantic changes

## Dev Notes

### Key File

All changes are in **one source file only**: [`src/core/runtime/redact-value.ts`](src/core/runtime/redact-value.ts)

No changes to `src/core/runtime/fast-lane.ts`, compiler files, public API, test files, or any other source.

### AC 1 — setObjectEntry (line 137–148)

**Current:**
```typescript
const setObjectEntry = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  })
}
```

**Replacement:**
```typescript
const setObjectEntry = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void => {
  target[key] = value
}
```

**Why this is safe:** `setObjectEntry` is only ever called with `cacheValue` and `transformedValue` (both declared as `Record<string, unknown>` freshly created as `{}` at the start of each `transformObject` / `transformCompletedObject` invocation). These are plain, extensible, non-sealed objects — direct assignment is equivalent. The `Object.defineProperty` was over-engineered for this use case.

Callers: lines 971–972, 991–992, 1124–1125, 1144–1145.

### AC 2 — Mutable Path-Segment Stack

#### Why the mutable stack is safe

The traversal is **synchronous**. `transformNestedNode` never suspends. At any moment there is exactly one live execution path descending into the object graph. The mutable array always reflects the current depth level. No parent frame reads `context.pathSegments` after `transformNestedNode` returns — it only reads `propertyResult` / `itemResult`.

Specifically, after `transformNestedNode` returns for a given child:
- Only `propertyResult.value`, `propertyResult.cacheValue`, `propertyResult.pathStable`, `propertyResult.changed` are used
- `propertyContext.pathSegments` is never accessed again

#### Interface change

```typescript
// Before
interface TraversalContext {
  readonly pathSegments: readonly ExactPathSegment[];
  ...
}

// After
interface TraversalContext {
  readonly pathSegments: ExactPathSegment[];  // mutable stack shared across traversal depth
  ...
}
```

#### Loop pattern — `transformObject` (current lines 942–999)

Identify the four traversal locations where `Object.freeze([...pathSegments, pathSegment])` currently appears:

| Line | Function | Variable |
|------|----------|----------|
| 814 | `transformArray` | `itemContext` |
| 949 | `transformObject` | `propertyContext` |
| 1056 | `transformCompletedArray` | inline context |
| 1134 | `transformCompletedObject` | inline context |

**Current pattern (transformObject, representative):**
```typescript
for (const key of propertyKeys) {
  const pathSegment = createPropertyPathSegment(key)
  const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
  const propertyContext: TraversalContext = {
    canonicalPath: propertyPath,
    directKeyMatch: resolveDirectKeyMatch(plan, key),
    inheritedPolicy,
    pathSegments: Object.freeze([...pathSegments, pathSegment]),  // allocation per key
    rootInput,
    suppressDescendantRedaction,
  }
  ...
  const propertyResult = transformNestedNode(propertyValue, plan, propertyContext, state, branchState)
  ...
}
```

**New pattern (transformObject):**
```typescript
for (const key of propertyKeys) {
  const pathSegment = createPropertyPathSegment(key)
  const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
  pathSegments.push(pathSegment)
  let propertyResult: TraversalResult
  try {
    const propertyContext: TraversalContext = {
      canonicalPath: propertyPath,
      directKeyMatch: /* guarded — see AC 4 */,
      inheritedPolicy,
      pathSegments,           // shared mutable reference — no allocation
      rootInput,
      suppressDescendantRedaction,
    }
    ...
    propertyResult = transformNestedNode(propertyValue, plan, propertyContext, state, branchState)
  } finally {
    pathSegments.pop()
  }
  ...
}
```

#### Loop pattern — `transformArray` (current lines 804–865)

`transformArray` is more complex than `transformObject` because it already has a `try/catch` around the property-read accessor (lines 820–841). The push must happen **before** `itemContext` construction (so the mutable array already contains the segment when the inline context object is built), and the `finally` pop must wrap **the entire block** — including the read try/catch and the `continue` in the read-error path:

```typescript
for (let index = 0; index < value.length; index += 1) {
  if (!(index in value)) {
    continue
  }

  const pathSegment = createIndexPathSegment(index)
  const itemPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
  pathSegments.push(pathSegment)         // push BEFORE itemContext is constructed
  try {
    const itemContext: TraversalContext = {
      canonicalPath: itemPath,
      inheritedPolicy,
      pathSegments,                       // shared mutable reference
      rootInput,
      suppressDescendantRedaction,
    }
    let item: unknown

    try {
      item = value[index]
    } catch (error) {
      // ... existing read-error handling + continue
      // The finally will still fire on continue, popping the segment correctly
    }

    // ... normal path: transformNestedNode(item, plan, itemContext, ...)
  } finally {
    pathSegments.pop()                    // pop after ALL paths through the loop body
  }
}
```

The `finally` fires on both the `continue` (read-error path) and the normal return path, so the array is always restored correctly.

#### Loop pattern — inline-context functions (`transformCompletedArray` line 1056, `transformCompletedObject` line 1134)

These functions pass the context as an **inline object literal** directly to `transformNestedNode`, with no named context variable. The push/pop wraps that call:

```typescript
// transformCompletedArray (representative of inline-context style):
const pathSegment = createIndexPathSegment(index)
const itemPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
pathSegments.push(pathSegment)
let itemResult: TraversalResult
try {
  itemResult = transformNestedNode(itemSnapshot.value, plan, {
    canonicalPath: itemPath,
    inheritedPolicy,
    pathSegments,         // shared mutable reference — inline, no variable
    rootInput,
    suppressDescendantRedaction,
  }, state, branchState)
} finally {
  pathSegments.pop()
}
```

`transformCompletedObject` follows the same pattern using `createPropertyPathSegment`.

#### `replayCompletedTraversal` — do NOT modify

`replayCompletedTraversal` (line 1156) is the only caller of `transformCompletedArray` and `transformCompletedObject`. It receives a `TraversalContext` and passes `context.pathSegments` (the shared mutable array) through to those functions. It does **not** create any new path segments itself — the push/pop lives entirely inside the completed-traversal functions' inner loops. No changes are needed in `replayCompletedTraversal`.

#### Root call change (line 1436–1441)

```typescript
// Before
const result = transformNode(value, plan, {
  canonicalPath: undefined,
  inheritedPolicy: undefined,
  pathSegments: Object.freeze([]) as readonly ExactPathSegment[],
  rootInput: value,
}, state, branchState)

// After
const result = transformNode(value, plan, {
  canonicalPath: undefined,
  inheritedPolicy: undefined,
  pathSegments: [],    // single mutable array — all depth levels share it
  rootInput: value,
}, state, branchState)
```

#### Snapshot safety (line 548)

The call `Object.freeze(pathSegments.map((seg) => seg.value))` already creates a new array via `.map()`. The `.map()` call is synchronous and creates a copy. This is unaffected by the mutable stack — the copy is taken at the moment the line executes, which is always before any child traversal mutates the stack.

#### Function signature updates

Change these parameter types from `readonly ExactPathSegment[]` to `ExactPathSegment[]`:
- `transformArray` parameter `pathSegments` (line 792)
- `transformObject` parameter `pathSegments` (line 913)
- `transformCompletedArray` parameter `pathSegments` (line ~1018)
- `transformCompletedObject` parameter `pathSegments` (line ~1103)

These are internal functions. The change propagates naturally from the root call.

### AC 3 — Guard resolveDynamicPathRule

`resolveDynamicPathRule` calls `plan.dynamicPathRules.find(...)`, which iterates the dynamic rules array. When the array is empty (exact-path-only or key-only configs), this is wasted work on every node. Add an early-out at **both call sites**.

**Line 1362** (in `transformNode`):
```typescript
// Before
resolveDynamicPathRule(plan, context.pathSegments),

// After
plan.dynamicPathRules.length === 0 ? undefined : resolveDynamicPathRule(plan, context.pathSegments),
```

**Line 1215** (in `transformNestedNode` — the second call site):
Same replacement.

Verify with: `grep -n "resolveDynamicPathRule" src/core/runtime/redact-value.ts` — expect exactly 3 lines (the definition at 485 and 2 call sites).

### AC 4 — Guard resolveDirectKeyMatch

`resolveDirectKeyMatch` calls `findMatchingLiteralKey` (iterates `literalMatchers`) and `findMatchingRegexKey` (iterates `matchers`). When both arrays are empty (path-only configs), skip the call entirely.

**Line 947** (in `transformObject`):
```typescript
// Before
directKeyMatch: resolveDirectKeyMatch(plan, key),

// After
directKeyMatch: plan.exactKeyRules.literalMatchers.length === 0 && plan.regexKeyRules.matchers.length === 0
  ? undefined
  : resolveDirectKeyMatch(plan, key),
```

**Line 1132** (in `transformCompletedObject`):
Same replacement.

Verify with: `grep -n "resolveDirectKeyMatch" src/core/runtime/redact-value.ts` — expect exactly 3 lines (definition at 382, 2 call sites).

### AC 5 — Guard buildRuleContextKey

`buildRuleContextKey` is called unconditionally in `transformTrackedIdentity` (line 746). When `activePolicy` is `undefined`, the function immediately returns the constant string `'none'`. Eliminate the function call overhead by inlining the undefined check:

```typescript
// Before (line 746)
const ruleContextKey = buildRuleContextKey(activePolicy)

// After
const ruleContextKey = activePolicy === undefined ? 'none' : buildRuleContextKey(activePolicy)
```

The `buildRuleContextKey` function itself does not need to change (it remains internally safe for the cases where it is still called).

### Project Structure Notes

- All changes are in `src/core/runtime/redact-value.ts` only
- No test files need modification (AC 6 — all existing tests must pass as-is)
- No public API changes
- No changes to `src/core/runtime/fast-lane.ts`
- File is 1 444 lines — changes are surgical and isolated
- British English: "behaviour", "initialise", "artefact" in any comments

### Codebase Conventions

- `kebab-case` for file names, `camelCase` for identifiers
- Tests live under `test/`, not co-located with `src/`
- Use `toStrictEqual` (not `toEqual`) in tests — not relevant here since no test changes are made
- Two pre-existing legacy failures (`test/unit/index.test.ts`, `test/load/redact.test.ts` — retired v3 `DeepRedact` class API) are expected and unrelated; do not count them as regressions

### References

- Epic 7 story text: [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3]
- Story 7.1 (compiled path executor): [Source: _bmad-output/implementation-artifacts/7-1-implement-compiled-path-executor-for-exact-path-only-configurations.md]
- Story 7.2 (equivalence proof): [Source: _bmad-output/implementation-artifacts/7-2-prove-behavioural-equivalence-of-the-compiled-path-executor.md]
- General traversal entry point: [`src/core/runtime/redact-value.ts`](src/core/runtime/redact-value.ts) — `redactValue` at line 1430, `transformNode` at line 1350
- `setObjectEntry`: line 137
- `buildRuleContextKey`: line 294
- `resolveDirectKeyMatch`: line 382
- `resolveDynamicPathRule`: line 485
- `transformTrackedIdentity` (contains `buildRuleContextKey` call): line ~725
- `transformArray` (contains path-segment spread at line 814)
- `transformObject` (contains `resolveDirectKeyMatch` at line 947 and path-segment spread at 949)
- `transformCompletedArray` (path-segment spread at line 1056)
- `transformCompletedObject` (`resolveDirectKeyMatch` at line 1132, path-segment spread at 1134)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- AC1: Replaced `Object.defineProperty` in `setObjectEntry` with direct assignment `target[key] = value`. Safe because the target objects are always freshly created plain `{}` objects.
- AC2: Changed `TraversalContext.pathSegments` type to `ExactPathSegment[]` (mutable). Updated all four function signatures (`transformArray`, `transformObject`, `transformCompletedArray`, `transformCompletedObject`). Replaced all four frozen spread allocations with `push`/`pop` wrapped in `try/finally`. All loop exit paths (`continue`) correctly fire the `finally` block. Root call now uses `pathSegments: []`. Snapshot at line 548 is safe — `.map()` creates a copy at call time.
- AC3: Guarded both `resolveDynamicPathRule` call sites with `plan.dynamicPathRules.length === 0 ? undefined :`.
- AC4: Guarded both `resolveDirectKeyMatch` call sites in `transformObject` and `transformCompletedObject` with `plan.exactKeyRules.literalMatchers.length === 0 && plan.regexKeyRules.matchers.length === 0 ? undefined :`.
- AC5: Guarded `buildRuleContextKey` in `transformTrackedIdentity` with `activePolicy === undefined ? 'none' :`.
- AC6: Full test suite result: 1 failed / 515 passed. The single failure (`benchmark-manifest.test.ts > declares competitor as fast-redact for every path-based row`) is pre-existing and unrelated — verified by running the suite against the unmodified branch (same result). Zero regressions introduced.

### File List

- `src/core/runtime/redact-value.ts`

### Review Findings

- [x] [Review][Patch] `setObjectEntry` — direct assignment of `__proto__` key mutates prototype chain instead of creating own property [`src/core/runtime/redact-value.ts:142`]

## Change Log

- 2026-05-27: Implemented all five hot-path allocation optimisations in `src/core/runtime/redact-value.ts` (AC1–AC5). Direct property assignment replaces `Object.defineProperty`; mutable push/pop stack replaces per-node frozen array spread; three conditional guards short-circuit `resolveDynamicPathRule`, `resolveDirectKeyMatch`, and `buildRuleContextKey` when their inputs are trivially absent. All 515 previously-passing tests continue to pass.
