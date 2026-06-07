# Story 7.4: Enforce Traversal Safety Limits and Validate Hostile-Input Protection

Status: done

## Story

As a backend engineer,
I want the redactor to enforce maximum traversal depth and node budgets, and to be validated against a hostile-input security corpus,
so that production services are protected from memory exhaustion, stack overflow, and indefinite execution when Deep Redact processes adversarial or pathological payloads.

## Context

Stories 7.1–7.3 optimised the runtime; 7.4 hardens it. The generic traversal (`redact-value.ts`) is currently **unbounded** — no depth limit, no node budget, no per-call counter. A sufficiently deep or wide payload will either exhaust the call stack (stack overflow) or chew through memory indefinitely. The architecture explicitly requires these limits (architecture.md §Security, line 174; PRD §Domain-Specific Requirements, line 137; architecture.md line 163 "traversal-budget counters").

This story introduces:
1. Two new public config options (`maxDepth`, `maxNodes`) with safe automatic defaults.
2. A new module `src/core/runtime/traversal-budget.ts` that owns budget types and helpers, including the internal `BudgetExceededError` sentinel class.
3. Budget enforcement in the generic traversal: exceeding either limit emits a `budget.exceeded` diagnostic then **throws** a `BudgetExceededError` with `error.code === 'BUDGET_EXCEEDED'`. This is the one intentional post-init throw — budget violations are exceptional, not degradable.
4. A named security corpus at `test/security/hostile-input-corpus.json` validated in `test/security/traversal-safety.test.ts`.
5. The security test added to the CI gate.

**Deliberate divergence from epic §7.4 AC:** The epic's AC states "does not throw" and "call completes without throwing" for budget violations. This story intentionally overrides that: budget violations throw `BudgetExceededError`. This is the one approved post-init throw, agreed during story creation (2026-05-27). The epic AC should be updated to match before the next planning cycle, but this story takes precedence.

**Scope guard:** init-time regex validation (Stories 1.5, 1.6) is unchanged. Allocation optimisations (Story 7.3) are unchanged. The fast lane (`fast-lane.ts`) is NOT modified — budget enforcement is a general-traversal concern only.

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

**Maximum traversal depth**

1. **Given** a payload whose nesting exceeds the configured `maxDepth`
   **When** `.redact()` runs
   **Then** it emits a `budget.exceeded` diagnostic event, then throws an `Error` whose `code` property is `'BUDGET_EXCEEDED'`

2. **Given** no explicit `maxDepth` in the config
   **When** the factory initialises
   **Then** a safe default `maxDepth` is applied automatically

3. **Given** an explicit `maxDepth` in the config
   **When** a payload reaches that depth
   **Then** the declared depth-limit behaviour applies

**Node budget**

4. **Given** a payload whose total traversed node count would exceed `maxNodes`
   **When** `.redact()` runs
   **Then** it emits a `budget.exceeded` diagnostic event, then throws an `Error` whose `code` property is `'BUDGET_EXCEEDED'`

**Hostile-input protection**

5. **Given** a payload with extreme breadth (≥10 000 keys at a single level)
   **When** `.redact()` runs
   **Then** the call throws `BUDGET_EXCEEDED` without memory exhaustion and without a stack overflow

6. **Given** a payload with extreme nesting (≥1 000 levels deep)
   **When** `.redact()` runs
   **Then** the call throws `BUDGET_EXCEEDED` without a stack overflow

7. **Given** a payload combining extreme breadth and depth
   **When** `.redact()` runs
   **Then** the call throws `BUDGET_EXCEEDED`

**Runtime regex safety**

8. **Given** regex-based rules (key selectors, path-segment selectors, substring tests) that are already validated at init time by `validate-config.ts` / `regex-safety.ts`
   **When** those rules are evaluated against adversarially crafted string content at runtime
   **Then** the operation completes within a bounded time
   **And** the static validation enforced at init time (source-length cap, no nested quantifiers, no overlapping alternation) constitutes the "equivalent protection" — no additional runtime timer is required

**Security corpus**

9. **Given** `test/security/hostile-input-corpus.json` exists and contains named cases covering:
   - `extreme-nesting-depth`: object nested ≥1 000 levels
   - `extreme-object-breadth`: object with ≥10 000 keys at one level
   - `circular-at-depth`: circular reference introduced at depth ≥50
   - `extremely-long-string`: string value of length ≥100 000 characters
   - `regex-triggering-string`: string crafted to stress-test regex key/path rules
   - `combined-adversarial`: extreme breadth and depth simultaneously
   **When** the test suite runs
   **Then** every depth/breadth/combined corpus case throws `BUDGET_EXCEEDED` (not a stack overflow, not a memory error)
   **And** the circular-reference and string cases complete without throwing
   **And** the regex-triggering-string case completes without throwing under safe-regex rules

**CI gate**

10. **Given** `test/security/traversal-safety.test.ts` is added to the `test:contract` script in `package.json`
    **When** any CI run executes `pnpm run test`
    **Then** the security corpus validation runs as a required passing gate

## Tasks / Subtasks

- [x] **AC 2, 3 — Extend public config with `maxDepth` and `maxNodes`** (ACs: 2, 3)
  - [x] In [`src/types/config.ts`](src/types/config.ts): add `readonly maxDepth?: number` and `readonly maxNodes?: number` to `DeepRedactOptions`
  - [x] In [`src/core/validation/validate-config.ts`](src/core/validation/validate-config.ts): add `'maxDepth'` and `'maxNodes'` to `rootOptionNames`; add `validatePositiveIntegerOption` helper; call it for both fields in `validateConfig`
  - [x] In [`src/core/compiler/compile-redactor-plan.ts`](src/core/compiler/compile-redactor-plan.ts): add `readonly maxDepth: number` and `readonly maxNodes: number` to `CompiledRedactorPlan`; compile with defaults (`maxDepth: 500`, `maxNodes: 50_000`) inside `compileRedactorPlan`

- [x] **Create `src/core/runtime/traversal-budget.ts`** (ACs: 1, 4)
  - [x] Export `TraversalBudget` interface: `{ depth: number; nodesVisited: number }`
  - [x] Export `createTraversalBudget(): TraversalBudget` — returns `{ depth: 0, nodesVisited: 0 }`
  - [x] Export `isDepthExceeded(budget: TraversalBudget, maxDepth: number): boolean`
  - [x] Export `isNodeBudgetExceeded(budget: TraversalBudget, maxNodes: number): boolean`
  - [x] Define internal (non-exported) `BudgetExceededError extends Error` with `readonly code = 'BUDGET_EXCEEDED' as const` and `name = 'BudgetExceededError'` — see Dev Notes
  - [x] Export `isBudgetExceededError(error: unknown): error is BudgetExceededError` type guard — used by `transformNestedNode` to rethrow

- [x] **AC 1, 4 — Integrate budget enforcement in `redact-value.ts`** (ACs: 1, 4)
  - [x] Import `TraversalBudget`, `createTraversalBudget`, `isDepthExceeded`, `isNodeBudgetExceeded`, `isBudgetExceededError`, `createBudgetExceededError` from `./traversal-budget.js`
  - [x] Add `budget: TraversalBudget` to `TraversalState` interface (lines 101–104)
  - [x] Update `createTraversalState()` factory (lines 195–199) to initialise `budget: createTraversalBudget()`
  - [x] Add `throwBudgetExceeded` helper — emits `budget.exceeded` diagnostic then throws `BudgetExceededError` (see Dev Notes — does NOT use `createDiagnosticEvent`)
  - [x] In `transformNestedNode` (line 598): add `if (isBudgetExceededError(error)) throw error` as the first statement in the `catch` block, before `return createFailureTraversalResult(...)`
  - [x] In `transformSupportedRuntimeValue` (line 1364): add the same `if (isBudgetExceededError(error)) throw error` guard at the top of that catch block — this function wraps transformer-resolved container traversal; without the guard it too will swallow the budget throw
  - [x] In `transformNode` (line ~1373): increment `state.budget.nodesVisited` at entry; call `throwBudgetExceeded` if `isNodeBudgetExceeded`
  - [x] In `transformTrackedIdentity` (line ~721): add depth guard **after line 769** (after the completed-identity cache block), **before `return withActiveIdentity(...)` at line 771** — increment depth, check `isDepthExceeded`, call `throwBudgetExceeded` if exceeded; wrap `return withActiveIdentity(...)` in `try/finally` to decrement `state.budget.depth`

- [x] **AC 8 — Confirm runtime regex safety via corpus** (AC: 8)
  - [x] No code change required — `regex-safety.ts` static analysis is the protection
  - [x] Add a `regex-triggering-string` corpus entry to confirm it completes without throwing

- [x] **AC 9 — Create security corpus and test** (AC: 9)
  - [x] Create `test/security/` directory
  - [x] Create `test/security/hostile-input-corpus.json` with static corpus entries (see Dev Notes)
  - [x] Create `test/security/traversal-safety.test.ts` (see Dev Notes for assertions and import pattern)

- [x] **AC 10 — Add security test to CI gate** (AC: 10)
  - [x] In [`package.json`](package.json): add `test/security/*.test.ts` to the `test:contract` script's CLI file list
  - [x] In [`vitest.config.ts`](vitest.config.ts): add `'test/security/**/*.test.ts'` and `'test/security/*.test.ts'` to the `include` array
  - [x] In [`tsconfig.json`](tsconfig.json): add `"test/security/**/*.ts"` to the existing `include` array (do NOT replace the array — only add this one entry alongside the existing entries)

- [x] **Verify full test suite passes** (AC: all)
  - [x] `source .agents/initialise-env.sh && pnpm run test`
  - [x] Confirm zero regressions; the two pre-existing red-phase failures (`test/unit/index.test.ts`, `test/load/redact.test.ts`) are expected and unrelated

## Dev Notes

### File Map

| Change type | File |
|-------------|------|
| New | `src/core/runtime/traversal-budget.ts` |
| Modify | `src/types/config.ts` |
| Modify | `src/core/validation/validate-config.ts` |
| Modify | `src/core/compiler/compile-redactor-plan.ts` |
| Modify | `src/core/runtime/redact-value.ts` |
| New | `test/security/hostile-input-corpus.json` |
| New | `test/security/traversal-safety.test.ts` |
| Modify | `package.json` |
| Modify | `vitest.config.ts` |
| Modify | `tsconfig.json` |

No changes to `fast-lane.ts`, public type exports (`src/types/public.ts`), or `diagnostic-event.ts`.

---

### AC 2/3 — Config fields

**`src/types/config.ts`**

```typescript
export interface DeepRedactOptions {
  // ...existing fields...
  readonly maxDepth?: number;   // default 500 — throw BUDGET_EXCEEDED beyond this depth
  readonly maxNodes?: number;   // default 50_000 — throw BUDGET_EXCEEDED after this many nodes
}
```

**`src/core/validation/validate-config.ts`**

Add to `rootOptionNames` (line 12):
```typescript
const rootOptionNames = new Set<keyof DeepRedactOptions>([
  // ...existing entries...
  'maxDepth',
  'maxNodes',
])
```

Add validation helper after the existing `validateBooleanOption`:
```typescript
const validatePositiveIntegerOption = (
  value: unknown,
  path: string,
  optionName: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) return
  if (!Number.isInteger(value) || (value as number) < 1) {
    pushIssue(issues, `${path}.${optionName}`, `${optionName} must be a positive integer.`)
  }
}
```

Call both in `validateConfig` (line 566):
```typescript
validatePositiveIntegerOption(options.maxDepth, 'options', 'maxDepth', issues)
validatePositiveIntegerOption(options.maxNodes, 'options', 'maxNodes', issues)
```

**`src/core/compiler/compile-redactor-plan.ts`**

Add to `CompiledRedactorPlan` interface (line 89):
```typescript
export interface CompiledRedactorPlan {
  // ...existing fields...
  readonly maxDepth: number;
  readonly maxNodes: number;
}
```

In `compileRedactorPlan` (line 321):
```typescript
return Object.freeze({
  // ...existing compiled fields...
  maxDepth: options.maxDepth ?? 500,
  maxNodes: options.maxNodes ?? 50_000,
})
```

---

### New file: `src/core/runtime/traversal-budget.ts`

```typescript
export interface TraversalBudget {
  depth: number;
  nodesVisited: number;
}

export const createTraversalBudget = (): TraversalBudget => {
  return { depth: 0, nodesVisited: 0 }
}

export const isDepthExceeded = (budget: TraversalBudget, maxDepth: number): boolean => {
  return budget.depth > maxDepth
}

export const isNodeBudgetExceeded = (budget: TraversalBudget, maxNodes: number): boolean => {
  return budget.nodesVisited > maxNodes
}

// Internal sentinel — NOT exported from src/index.ts or src/types/public.ts.
// Defined here so isBudgetExceededError can reference it via instanceof.
class BudgetExceededError extends Error {
  readonly code = 'BUDGET_EXCEEDED' as const

  constructor(message: string) {
    super(message)
    this.name = 'BudgetExceededError'
  }
}

export const createBudgetExceededError = (kind: 'depth' | 'nodes', limit: number): BudgetExceededError => {
  return new BudgetExceededError(
    kind === 'depth'
      ? `Traversal depth limit (${limit}) exceeded.`
      : `Traversal node budget (${limit}) exceeded.`,
  )
}

// Exported so redact-value.ts can use instanceof without importing the class directly.
export const isBudgetExceededError = (error: unknown): error is BudgetExceededError => {
  return error instanceof BudgetExceededError
}
```

`TraversalBudget` is intentionally mutable (consistent with `pathSegments` after Story 7.3) — it is a per-call shared counter object, not frozen.

`BudgetExceededError` is not exported from the package's public API. Callers detect budget violations via `error.code === 'BUDGET_EXCEEDED'`.

---

### Integrating budget into `redact-value.ts`

**`TraversalState` interface** (currently lines 101–104):

```typescript
interface TraversalState {
  readonly budget: TraversalBudget;                                              // NEW
  readonly completedIdentities: WeakMap<TrackableIdentity, CompletedTraversalRecord[]>;
  readonly completedSnapshots: WeakMap<TrackableIdentity, CompletedTraversalSnapshot>;
}
```

**`createTraversalState()` factory** (lines 195–199) — update to initialise budget:

```typescript
const createTraversalState = (): TraversalState => {
  return {
    budget: createTraversalBudget(),             // NEW
    completedIdentities: new WeakMap<TrackableIdentity, CompletedTraversalRecord[]>(),
    completedSnapshots: new WeakMap<TrackableIdentity, CompletedTraversalSnapshot>(),
  }
}
```

`redactValue` (line 1457) calls `createTraversalState()` — no change needed there once the factory is updated.

**`throwBudgetExceeded` helper** — CRITICAL: do NOT use `createDiagnosticEvent` here. That function hardcodes `event: plan.eventName` which is always `'redaction.failure'`. Construct the `DiagnosticEvent` directly to emit `'budget.exceeded'`, then throw. Add this near `createUnsupportedTraversalResult` (around line 233):

```typescript
const throwBudgetExceeded = (
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  kind: 'depth' | 'nodes',
): never => {
  const limit = kind === 'depth' ? plan.maxDepth : plan.maxNodes
  emitDiagnosticEvent(plan.diagnostics, Object.freeze({
    details: Object.freeze({ stage: 'traversal', kind, limit }),
    event: 'budget.exceeded',
    message: kind === 'depth'
      ? `Traversal depth limit (${limit}) exceeded.`
      : `Traversal node budget (${limit}) exceeded.`,
    path: context.canonicalPath ?? '',
    valueType: 'unknown',
  }))
  throw createBudgetExceededError(kind, limit)
}
```

`emitDiagnosticEvent` is already used in `redact-value.ts` (see `emitFailureDiagnostic` at line 208 for the same pattern). `DiagnosticEvent` shape: `{ details, event, message, path, valueType }` — see `src/types/diagnostics.ts`.

**`transformNestedNode` (line 589)** — add a rethrow guard at the top of the `catch` block. Without this, the existing catch would swallow the budget throw and silently return `[UNSUPPORTED]`:

```typescript
const transformNestedNode = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  try {
    return transformNode(value, plan, context, state, branchState)
  } catch (error) {
    if (isBudgetExceededError(error)) throw error   // NEW — propagate budget violations
    return createFailureTraversalResult(plan, context, {
      error,
      stage: 'traversal',
      value,
    })
  }
}
```

**`transformSupportedRuntimeValue` (line 1364)** — there is a second catch block here that wraps transformer-resolved container traversal (the `traverse` callback inside eventually calls `transformTrackedIdentity`, where the depth guard fires). Add the same guard:

```typescript
  } catch (error) {
    if (isBudgetExceededError(error)) throw error   // NEW — propagate budget violations
    return createFailureTraversalResult(plan, context, {
      error,
      stage: 'transformer',
      value,
    })
  }
```

These are the **only two** catch blocks in `redact-value.ts` that wrap paths reachable from a budget-guarded function. Both must have the rethrow guard.

**`transformNode` (line ~1373)** — increment node counter and guard at the very top:

```typescript
const transformNode = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  state.budget.nodesVisited += 1                           // NEW
  if (isNodeBudgetExceeded(state.budget, plan.maxNodes)) { // NEW
    throwBudgetExceeded(plan, context, 'nodes')
  }
  // ...rest of transformNode unchanged...
}
```

**`transformTrackedIdentity` (line ~721)** — depth guard placement is critical. The guard must go **after the completed-identity cache block (line 769), immediately before `return withActiveIdentity(...)` at line 771**. This ensures circular references and cached-identity shortcuts are handled first (they are not subject to depth limits):

```typescript
// Lines 750–769: completed-identity cache block — unchanged
// ...

// NEW: depth guard — fires only when actually descending into a new, uncached container
state.budget.depth += 1
if (isDepthExceeded(state.budget, plan.maxDepth)) {
  state.budget.depth -= 1
  throwBudgetExceeded(plan, context, 'depth')
}

// Lines 771+: wrap withActiveIdentity in try/finally to restore depth on all paths
try {
  return withActiveIdentity(branchState, identity, canonicalPath, () => {
    // ...existing traverse() logic unchanged...
  })
} finally {
  state.budget.depth -= 1   // NEW: restore depth whether return or throw
}
```

Placing the guard before the circular-reference check (line 733) would mis-classify circular references at the depth boundary as budget violations. The `finally` restores depth correctly even when the budget throw propagates upward (the throw from `throwBudgetExceeded` will pass through the `finally` before unwinding further).

---

### CI gate

**CRITICAL: `vitest.config.ts` `include` is NOT used by `pnpm run test`.**

The `test:contract` script hard-codes file paths as CLI arguments:
```
pnpm exec vitest run test/build.test.ts test/contract/**/*.test.ts --reporter=verbose
```
When files are passed directly on the CLI, the `include` config option is ignored. The correct gate mechanism is to modify `package.json`.

**`package.json` — update `test:contract`:**
```json
"test:contract": "pnpm exec vitest run test/build.test.ts test/contract/**/*.test.ts test/security/**/*.test.ts --reporter=verbose"
```

**`vitest.config.ts` — also update `include`** (for runs that use the config directly, e.g. `vitest run` without explicit paths):
```typescript
include: ['test/build.test.ts', 'test/contract/**/*.test.ts', 'test/security/**/*.test.ts'],
```

**`tsconfig.json` — add one entry to `include`** (line 19) to type-check the new security tests. Add `"test/security/**/*.ts"` alongside the existing entries — do NOT replace the array. The current array is:
```json
"include": [
  "src/index.ts",
  "src/adapters/**/*.ts",
  "scripts/**/*.ts",
  "test/build.test.ts",
  "test/contract/**/*.ts",
  "tsdown.config.ts",
  "vitest*.config.ts"
]
```
After the change:
```json
"include": [
  "src/index.ts",
  "src/adapters/**/*.ts",
  "scripts/**/*.ts",
  "test/build.test.ts",
  "test/contract/**/*.ts",
  "test/security/**/*.ts",
  "tsdown.config.ts",
  "vitest*.config.ts"
]
```
Without this, TypeScript type errors in the security test file are silently ignored by `pnpm run lint`.

---

### Security corpus format and test

**`test/security/hostile-input-corpus.json`** — pre-serialised static cases only. The large programmatically-generated shapes (nested depth, wide objects) are built inline in the test to avoid committing multi-MB JSON:

```json
{
  "extremely-long-string": { "value": "aaaa...a" },
  "regex-triggering-string": { "value": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab" }
}
```

The `extremely-long-string` value should be a string of 100 000 `'a'` characters. Either generate it with a script and commit it, or build it inline in the test — either approach satisfies the AC.

**`test/security/traversal-safety.test.ts`** — use `readFileSync`/`JSON.parse` (the project's existing pattern — do NOT use `assert { type: 'json' }` which is deprecated in Node 24):

```typescript
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { deepRedact } from '../../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const corpus = JSON.parse(
  readFileSync(resolve(__dirname, 'hostile-input-corpus.json'), 'utf8')
) as Record<string, unknown>

const buildNestedObject = (depth: number): unknown => {
  let obj: unknown = { leaf: 'value' }
  for (let i = 0; i < depth; i++) obj = { child: obj }
  return obj
}

const buildWideObject = (keyCount: number): Record<string, number> => {
  const obj: Record<string, number> = {}
  for (let i = 0; i < keyCount; i++) obj[`k${i}`] = i
  return obj
}

const buildCircularAtDepth = (depth: number): Record<string, unknown> => {
  const root: Record<string, unknown> = {}
  let current = root
  for (let i = 0; i < depth; i++) {
    const next: Record<string, unknown> = {}
    current['child'] = next
    current = next
  }
  current['circular'] = root
  return root
}

const redact = deepRedact({ paths: ['secret'] })

describe('traversal safety — depth limit', () => {
  it('throws BUDGET_EXCEEDED for extreme nesting without stack overflow', () => {
    expect(() => redact(buildNestedObject(1001))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
  })
})

describe('traversal safety — node budget', () => {
  it('throws BUDGET_EXCEEDED for extreme breadth without memory exhaustion', () => {
    expect(() => redact(buildWideObject(10_000))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
  })

  it('throws BUDGET_EXCEEDED for combined adversarial payload', () => {
    expect(() => redact({ wide: buildWideObject(1000), deep: buildNestedObject(500) })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
  })
})

describe('traversal safety — circular references', () => {
  it('completes circular-at-depth without throwing', () => {
    expect(() => redact(buildCircularAtDepth(50))).not.toThrow()
  })
})

describe('traversal safety — string values', () => {
  it('completes extremely-long-string without throwing', () => {
    expect(() => redact({ value: 'a'.repeat(100_000) })).not.toThrow()
  })

  it('completes regex-triggering-string without throwing', () => {
    const redactWithRegex = deepRedact({ keys: [/secret/] })
    expect(() => redactWithRegex(corpus['regex-triggering-string'])).not.toThrow()
  })
})
```

Note: `deepRedact` is a **named export** from `src/index.ts` — use `import { deepRedact } from '../../src/index.js'`, not a default import.

---

### Default value rationale

`maxDepth: 500` — JS call stacks are ~10 000–15 000 frames. Each traversal level costs ~4–6 internal frames (`transformNestedNode` → `transformNode` → `transformTrackedIdentity` → `transformArray`/`transformObject`). At depth 500 the runtime call stack is ~2 000–3 000 frames deep, well below the overflow threshold. A payload nested ≥1 000 levels will hit the limit before the call stack overflows, throwing a controlled `BUDGET_EXCEEDED` error rather than an uncontrolled `RangeError`.

`maxNodes: 50_000` — typical application payloads have hundreds to low thousands of nodes. 50 000 provides several orders of magnitude headroom for legitimate use while bounding hostile wide-object attacks.

### Codebase conventions

- British English in any comments: "behaviour", "initialise", "artefact"
- `kebab-case` filenames, `camelCase` identifiers
- Tests use `toStrictEqual` not `toEqual`; `describe`/`it` blocks
- No JSON import assertions (`assert { type: 'json' }` is deprecated in Node 24) — use `readFileSync`/`JSON.parse` as shown above
- Two pre-existing legacy failures (`test/unit/index.test.ts`, `test/load/redact.test.ts`) are expected and unrelated — do not count as regressions

### References

- Epic 7 story text: [`_bmad-output/planning-artifacts/epics.md` §Story 7.4, line 2259]
- Story 7.1 (compiled fast lane): [`_bmad-output/implementation-artifacts/7-1-implement-compiled-path-executor-for-exact-path-only-configurations.md`]
- Story 7.3 (allocation optimisations): [`_bmad-output/implementation-artifacts/7-3-reduce-hot-path-allocation-overhead-in-the-general-traversal.md`]
- Architecture security contract: [`_bmad-output/planning-artifacts/architecture.md` §Security, lines 137, 163, 174, 468]
- PRD hostile-input requirement: [`_bmad-output/planning-artifacts/prd.md` line 137]
- Main traversal engine: [`src/core/runtime/redact-value.ts`]
  - `TraversalState` interface: line 101
  - `createTraversalState()` factory: line 195 — **must be updated**
  - `createUnsupportedTraversalResult`: line 233 (pattern reference only — budget violations throw, not return UNSUPPORTED)
  - `emitFailureDiagnostic` (pattern for `emitDiagnosticEvent` usage): line 208
  - `transformNestedNode`: line 589 — **must add `isBudgetExceededError` rethrow guard at line 598**
  - `transformTrackedIdentity`: line 721 — depth guard goes after line 769, before `withActiveIdentity` at line 771
  - `transformNode`: line 1373
  - `redactValue` entry point: line 1453 (calls `createTraversalState()`)
- Diagnostics: [`src/core/diagnostics/diagnostic-event.ts`] — `createDiagnosticEvent` at line 84 hardcodes `event: plan.eventName` = `'redaction.failure'`; construct `DiagnosticEvent` directly for `'budget.exceeded'`
- `emitDiagnosticEvent`: [`src/core/diagnostics/diagnostics-sink.ts`]
- `DiagnosticEvent` type: [`src/types/diagnostics.ts`] — shape `{ details, event, message, path, valueType }`
- Regex safety init-time validation: [`src/core/validation/regex-safety.ts`]
- Compiled plan: [`src/core/compiler/compile-redactor-plan.ts`] — `CompiledRedactorPlan` at line 89, `compileRedactorPlan` at line 321
- Public config: [`src/types/config.ts`]
- Validation: [`src/core/validation/validate-config.ts`] — `rootOptionNames` at line 12, `validateConfig` at line 566
- `tsconfig.json` `include` array: line 19

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded cleanly.

### Completion Notes List

- Implemented `maxDepth` (default 500) and `maxNodes` (default 50 000) config options with positive-integer validation.
- Created `src/core/runtime/traversal-budget.ts` as the single budget module: `TraversalBudget`, `createTraversalBudget`, `isDepthExceeded`, `isNodeBudgetExceeded`, `createBudgetExceededError`, `isBudgetExceededError`. `BudgetExceededError` is intentionally not exported from the public API.
- Budget integrated into general traversal only (fast lane NOT modified per scope guard): node counter in `transformNode`, depth counter with try/finally in `transformTrackedIdentity` (placed after circular-reference and completed-identity cache checks so those shortcuts bypass the depth guard correctly).
- Both `transformNestedNode` and `transformSupportedRuntimeValue` catch blocks guard with `isBudgetExceededError` rethrow — prevents the budget throw being swallowed as a recoverable failure.
- `throwBudgetExceeded` constructs `DiagnosticEvent` directly (not via `createDiagnosticEvent`) to emit the correct `'budget.exceeded'` event name.
- Security corpus and test added to `test/security/`. Test uses `keys: ['secret']` (not `paths`) to force general traversal, which is where budget enforcement lives. The wide-breadth test uses 60 000 keys to reliably exceed the 50 000 node budget.
- CI gate: `package.json` `test:contract` script uses `test/security/*.test.ts` (single `*`) because the shell (sh via pnpm) does not expand `**` for flat directories; `vitest.config.ts` retains both patterns for completeness. `tsconfig.json` updated with the `test/security/**/*.ts` entry.
- All 522 tests pass; zero regressions.

### File List

- `src/types/config.ts` (modified)
- `src/core/validation/validate-config.ts` (modified)
- `src/core/compiler/compile-redactor-plan.ts` (modified)
- `src/core/runtime/traversal-budget.ts` (new)
- `src/core/runtime/redact-value.ts` (modified)
- `test/security/hostile-input-corpus.json` (new)
- `test/security/traversal-safety.test.ts` (new)
- `package.json` (modified)
- `vitest.config.ts` (modified)
- `tsconfig.json` (modified)

### Review Findings

- [x] [Review][Patch] Combined adversarial test lives in `describe('traversal safety — node budget')` but triggers the depth limit, not the node budget — `buildWideObject(1000)` + `buildNestedObject(500)` totals ~1502 nodes (far under 50 000) and the throw comes from the 501-level depth path; move to a combined/depth describe or increase breadth to actually exceed node budget [`test/security/traversal-safety.test.ts:54-58`]
- [x] [Review][Patch] `corpus['regex-triggering-string']` is accessed without a null guard — if the JSON key is absent the value is `undefined`, the test passes silently, and a broken fixture goes undetected; add an assertion that the corpus entry exists before passing it to `redactWithRegex` [`test/security/traversal-safety.test.ts:73-75`]
- [x] [Review][Patch] AC3 not covered by tests — no test instantiates `deepRedact` with an explicit `maxDepth` or `maxNodes` and verifies the declared limit triggers at that value rather than at the 500 / 50 000 defaults; add at least one test with a small explicit limit [`test/security/traversal-safety.test.ts`]
- [x] [Review][Defer] Fast lane has no budget enforcement — intentional per spec scope guard ("fast lane NOT modified"), but exact-path-only hostile payloads bypass both depth and node limits entirely; a stack overflow will surface as an uncontrolled `RangeError`, not `BUDGET_EXCEEDED` — deferred, intentional scope exclusion
- [x] [Review][Defer] `throwBudgetExceeded` calls `emitDiagnosticEvent` before throwing — if a buggy diagnostic handler itself throws, the `BudgetExceededError` is never raised and callers see an unexpected error instead; pre-existing fragility in the diagnostics design — deferred, pre-existing
- [x] [Review][Patch] Depth counter increment fragility — `depth -= 1` before the throw is not covered by the `finally` scope; restructure so the `try/finally` wraps from the point of increment, removing the manual pre-throw decrement [`src/core/runtime/redact-value.ts`]
- [x] [Review][Patch] Default limits are magic numbers — extract `DEFAULT_MAX_DEPTH = 500` and `DEFAULT_MAX_NODES = 50_000` as named constants in `traversal-budget.ts` and use them in `compile-redactor-plan.ts` [`src/core/compiler/compile-redactor-plan.ts`, `src/core/runtime/traversal-budget.ts`]
