# Story 7.5: Extend the Fast Lane to Support Single-Level Wildcard Path Segments

Status: cancelled

> **Cancelled 2026-05-28:** This story is superseded by Epic 8 (Rule-Driven Traversal Engine). The trie-extension approach extended the fast lane as a workaround over an O(N) general traversal. The correct structural fix is to invert the outer loop in the general traversal itself — iterating configured rules and navigating directly to targets — which eliminates the need for a separate fast lane entirely. Since v4 has not been publicly released, no backwards-compatibility bridge is required. See Epic 8 in `_bmad-output/planning-artifacts/epics.md`.

## Story

As a backend engineer,
I want the compiled fast lane to handle configurations that combine exact path segments with single-level wildcard (`*`) path segments,
so that the most common real-world path policies — such as `user.password` alongside `*.email` — remain in the low-allocation fast lane rather than falling back to the general traversal, and the benchmark overhead versus `fast-redact` for these workloads approaches the aspirational 25–50% band.

## Acceptance Criteria

**Trie node extension**

1. **Given** the `PathTreeNode` interface used by the fast-lane trie builder
   **When** this story is complete
   **Then** the interface includes a `wildcardChild?: PathTreeNode` field alongside the existing `propertyChildren` and `indexChildren` maps
   **And** the trie builder populates `wildcardChild` for any `*` segment encountered in a compiled path rule
   **And** existing exact-segment and index-segment construction is unchanged

**Single-pass wildcard traversal**

2. **Given** the fast-lane traversal logic
   **When** a trie node has **no** `wildcardChild`
   **Then** the traversal navigates directly to known child keys via the node's `propertyChildren` and `indexChildren` maps — no full key iteration occurs, and values at non-configured sibling keys are not visited during navigation
   **And** when a container is about to be shallow-copied (because a configured descendant is being redacted), its own properties are scanned for transformable runtime values (Date, BigInt, Map, Set, Symbol, etc.) at non-configured positions; if any are found, the call is delegated — because the shallow copy would otherwise propagate untransformed values that the general traversal would have transformed
   **When** a trie node **has** a `wildcardChild`
   **Then** for each property or array index encountered at that depth, the traversal follows the `wildcardChild` branch in addition to any matching exact child, and this check adds one null-guard per depth level with no heap allocation
   **And** in both cases: at positions where a rule matches and the censor is applied, transformable value types do not trigger delegation — the censor replaces the value wholesale; at non-configured, non-matched positions, transformable runtime values trigger delegation; non-plain prototypes at any traversed intermediate node trigger delegation (prototype pollution guard); circular references do not trigger delegation

**Broadened fast-lane candidacy**

3. **Given** the `isExactPathOnly` compile-time flag (renamed to `isFastLaneEligible`)
   **When** a configuration contains only exact path segments and/or single-level `*` path segments, with no `**` recursive wildcards, no regex path segments, no ignore rules on paths, no key rules, no substring tests, no fuzzy key matching, and case-sensitive matching enabled
   **Then** the candidacy flag is `true` and the fast lane is selected
4. **Given** a configuration that includes any `**` segment, regex path segment, key rule, substring test, fuzzy match option, or case-insensitive match option
   **When** the candidacy flag is evaluated
   **Then** it is `false` and the general traversal is selected, unchanged from current behaviour

**Behavioural equivalence**

5. **Given** a configuration containing a mix of exact and `*.field` paths
   **When** the fast lane processes a payload
   **Then** the redacted output is byte-for-byte identical to the output produced by the general traversal for the same input and configuration
   **And** this equivalence is covered by an automated test that runs both lanes against the same fixtures and asserts output equality

**Benchmark regression**

6. **Given** the `wildcard-single-object-*` benchmark rows in the manifest
   **When** this story is complete and benchmarks are re-run
   **Then** the recorded overhead for the wildcard workload versus `fast-redact` is materially lower than the pre-story baseline (986.43%)
   **And** the threshold policy for `wildcard-single-object-fast-redact-node24` in `test/bench/manifest.json` is tightened to reflect the new achievable overhead
   **And** the `wildcard-single-object-v3-node24` and `wildcard-single-object-json-stringify-regex-node24` thresholds are reviewed and tightened accordingly

## Tasks / Subtasks

- [ ] **AC 1 — Add `wildcardChild` to `PathTreeNode` and update `insertRule`** (ACs: 1)
  - [ ] In [`src/core/runtime/fast-lane.ts`](src/core/runtime/fast-lane.ts): add `wildcardChild?: PathTreeNode` to the `PathTreeNode` interface (line ~31)
  - [ ] Update `insertRule` signature to accept `readonly (ExactPathSegment | WildcardPathSegment)[]` instead of `readonly ExactPathSegment[]`
  - [ ] In `insertRule`: when `segment.kind === 'wildcard'`, use `level.wildcardChild ??= {}` as the next node instead of `propertyChildren`/`indexChildren`
  - [ ] Import `WildcardPathSegment` from `'../matching/path-parser.js'`

- [ ] **AC 1/3 — Update `buildPrefixTree` to include wildcard-eligible dynamic rules** (ACs: 1, 3)
  - [ ] Define a `TrieRule` type compatible with both `CompiledExactPathRule` and wildcard-eligible `CompiledDynamicPathRule`: needs `policy`, `rulePath`, and `canonicalPath` (use `signature` for dynamic rules)
  - [ ] Update `buildPrefixTree` to accept `readonly TrieRule[]` covering both exact and wildcard-eligible rules
  - [ ] Update `PathTreeNode.rule` to use `TrieRule` instead of `CompiledExactPathRule`
  - [ ] Update `applyTerminalRule`, `applyInheritedLeaf`, and `enterRetain` to accept `TrieRule` — the logic is unchanged as all three only access `policy`, `rulePath`, and `canonicalPath`
  - [ ] In `buildFastLaneExecutor`: pass `[...Object.values(plan.exactPathRules), ...plan.dynamicPathRules]` (using `signature` as `canonicalPath`) to `buildPrefixTree` — note: `buildFastLaneExecutor` is only called when `plan.isFastLaneEligible` is `true`, which guarantees every `dynamicPathRule` passes `isWildcardEligibleRule`; passing ineligible rules would produce silently wrong trie behaviour

- [ ] **AC 2 — Split `applyNodes` into exact-only and wildcard paths** (ACs: 2, 5)
  - [ ] Add `wildcardBranch: PathTreeNode | undefined` as a NEW second parameter to `applyNodes`
  - [ ] At the top of `applyNodes` (after the array/object split), add a branch: when both `wildcardBranch === undefined` and `level.wildcardChild === undefined`, delegate to a new `applyExactNodes` helper and return early — no full key iteration occurs at exact-only levels
  - [ ] Implement `applyExactNodes(container, level, inherited, plan, rootInput)`: iterates only `level.propertyChildren` / `level.indexChildren` map entries; applies `requiresDelegation` only to values at those configured positions; mirrors the terminal/container/inherited-retain logic of `applyNodes` but visits no unconfigured sibling keys (see Dev Notes for full shape)
  - [ ] **Wildcard-level array branch** (when `wildcardBranch !== undefined || level.wildcardChild !== undefined`) — for each index `i`:
    - Resolve `exactNode = level.indexChildren?.get(i)`
    - Resolve `wildcardTerminal = wildcardBranch?.indexChildren?.get(i)`
    - For terminal (non-retainStructure rule at `exactNode`): unchanged (exact wins)
    - For container recursion: `if (exactNode !== undefined && wildcardTerminal !== undefined) return delegate` (see Dev Notes — correctness guard); otherwise recurse with `applyNodes(value, exactNode ?? wildcardTerminal ?? emptyLevel, level.wildcardChild, ...)`
    - For leaf with no exact node: check `wildcardTerminal?.rule` as the fallback terminal; apply `requiresDelegation` to every value encountered
  - [ ] **Wildcard-level object branch** — mirror the same logic using `propertyChildren` instead of `indexChildren`
  - [ ] `level.wildcardChild` serves as the new `wildcardBranch` for every child container — one null-guard per depth level, no allocation
  - [ ] Update `resolveChildInherited` calls to forward the wildcard-derived `inherited` correctly (see Dev Notes)
  - [ ] Update the three existing `applyNodes` call sites to pass `undefined` as the new `wildcardBranch` second parameter: line ~305 (array branch recursive call), line ~381 (object branch recursive call), and line ~451 (initial call in `buildFastLaneExecutor`)

- [ ] **AC 3 — Rename `isExactPathOnly` to `isFastLaneEligible` and broaden the condition** (ACs: 3, 4)
  - [ ] In [`src/core/compiler/compile-redactor-plan.ts`](src/core/compiler/compile-redactor-plan.ts):
    - Rename `isExactPathOnly` to `isFastLaneEligible` in the `CompiledRedactorPlan` interface (line 100) and in `compileRedactorPlan` (line 336)
    - Change the condition: `true` when `(Object.keys(exactPathRules).length > 0 || dynamicPathRules.length > 0)` AND `dynamicPathRules.every(r => isWildcardEligible(r))` AND no key rules AND no substring rules AND no fuzzyKeyMatch AND caseSensitiveKeyMatch !== false
    - Add `isWildcardEligible(rule: CompiledDynamicPathRule): boolean` — returns `true` when every segment is `kind === 'property'`, `kind === 'index'`, or `kind === 'wildcard'` (no recursive-wildcard, no regex, no ignore) AND `typeof rule.policy.censor !== 'function'` (see Dev Notes — function censors need matched path tracking)
  - [ ] In [`src/core/create-redactor.ts`](src/core/create-redactor.ts) (line 31): update `plan.isExactPathOnly` → `plan.isFastLaneEligible`
  - [ ] In [`test/contract/api/create-redactor.test.ts`](test/contract/api/create-redactor.test.ts) (line ~4813): rename `isExactPathOnly` → `isFastLaneEligible` — this contract test directly asserts the flag and is not covered by the fast-lane unit test rename

- [ ] **AC 5 — Update tests** (ACs: 3, 5)
  - [ ] In [`test/unit/core/fast-lane.test.ts`](test/unit/core/fast-lane.test.ts):
    - Update `crossValidate` helper: change `expect(plan.isExactPathOnly).toBe(true)` → `expect(plan.isFastLaneEligible).toBe(true)`
    - Rename all remaining references to `isExactPathOnly` throughout the file (global find/replace)
    - Rename `toEqual` → `toStrictEqual` throughout the file — project convention; applies to all equivalence assertions including those in `crossValidate` and any `describe` blocks
    - Update `describe('fast-lane eligibility flag')`: rename tests and update assertions:
      - `paths: ['user.*']` should now return `isFastLaneEligible: true`
      - `paths: ['**.password']` should still return `false`
      - Add: `paths: ['user.password', '*.email']` → `true`; `paths: ['user.*.id']` → `true`
      - Add: `paths: ['*.email']` (wildcard-only, no exact paths) → `true` — this is newly eligible; no exact paths are required
      - Add: `{ paths: [{ path: '*.password', censor: () => '[REDACTED]' }] }` → `false` — function censors require `matchedPath` tracking which the fast lane does not provide
  - [ ] Add a new `describe('fast-lane wildcard traversal')` block covering:
    - Pure-wildcard config `['*.password', '*.email']` — cross-validate against general traversal
    - Mixed exact + wildcard `['user.password', '*.email']` — cross-validate
    - Wildcard at a deeper level `['user.*.id']` — cross-validate
    - Wildcard with missing keys (wildcard path not in payload) — no crash, no change
    - Multiple sibling wildcards redacting different keys at the same depth
    - Multiple wildcard segments in one path (`['a.*.b.*']`) — cross-validate; exercises two `wildcardChild` hops on the same path
    - Wildcard matching array index children (e.g., `['data.*.0']` against `{ data: { x: [42, 99], y: [1, 2] } }`) — exercises `wildcardBranch?.indexChildren?.get(i)`
    - Wildcard with remove policy
    - Wildcard with literal censor override
    - Wildcard with `retainStructure: true` on a container matched by `*`
    - Wildcard config delegates for Date/BigInt/Map/circular (same `assertDelegatesAndMatches` pattern)
    - Correctness guard: a config where both exact AND wildcard would otherwise both need to continue into the same container sub-tree causes delegation, and the public output still matches general traversal

- [ ] **AC 6 — Run benchmarks, update thresholds, commit artefacts** (AC: 6)
  - [ ] Run: `source .agents/initialise-env.sh && node --experimental-strip-types ./scripts/run-benchmarks.ts --id wildcard-single-object-fast-redact-node24`
  - [ ] Tighten `maxOverheadPct` in `test/bench/manifest.json` for `wildcard-single-object-fast-redact-node24` to match the new achievable overhead (current: 2500 — the new value should be the measured overhead × ~1.2 safety margin, rounded up to nearest 50)
  - [ ] Run remaining wildcard rows and review: `wildcard-single-object-v3-node24`, `wildcard-single-object-json-stringify-regex-node24`
  - [ ] Tighten those thresholds too if the measured overhead has improved
  - [ ] Commit updated artefacts under `test/artefacts/benchmarks/wildcard-*.json`
  - [ ] If the measured overhead has NOT materially improved (still >500%), verify the fast lane is actually being selected: add a temporary `console.log(plan.isFastLaneEligible)` in `create-redactor.ts` and re-run, or add a debug assertion. The most likely cause of unexpectedly high overhead is a delegation triggered by the benchmark fixture itself (e.g., a Date or transformable value in the payload) — check the fixture at `test/bench/fixtures/wildcard-single-object/` to confirm all values are plain primitives

- [ ] **Verify full test suite passes** (AC: all)
  - [ ] `source .agents/initialise-env.sh && pnpm run test`
  - [ ] Confirm zero regressions; the two pre-existing red-phase failures (`test/unit/index.test.ts`, `test/load/redact.test.ts`) are expected and unrelated
  - [ ] `pnpm run test:contract` must also pass (benchmark artefact contract checks every manifest row has a committed artefact)

## Dev Notes

### Motivation and Scope

The wildcard benchmark (`["*.password", "*.email", "*.firstName", "*.ip"]`) currently shows 986% overhead vs fast-redact because all wildcard configs fall through to the general traversal. The fast lane's prefix trie already handles exact paths in O(P); adding a `wildcardChild` branch lets the same single-pass trie handle `*` segments with one extra null-guard per depth level and no per-call heap allocation.

**Scope guard:** `**` (recursive wildcard) remains out of scope. Only single-level `*` segments are extended into the fast lane.

### File Map

| Change type | File |
|-------------|------|
| Modify | `src/core/runtime/fast-lane.ts` |
| Modify | `src/core/compiler/compile-redactor-plan.ts` |
| Modify | `src/core/create-redactor.ts` |
| Modify | `test/unit/core/fast-lane.test.ts` |
| Modify | `test/bench/manifest.json` |
| Modify | `test/artefacts/benchmarks/wildcard-*.json` (after benchmark run) |

---

### AC 1 — `PathTreeNode` and `insertRule`

**`PathTreeNode` interface** (line 31):
```typescript
interface PathTreeNode {
  rule?: TrieRule;  // see TrieRule below
  propertyChildren?: Map<string, PathTreeNode>;
  indexChildren?: Map<number, PathTreeNode>;
  wildcardChild?: PathTreeNode;  // NEW: follows ANY key at this depth (for `*`)
}
```

**`TrieRule` type** — unifies `CompiledExactPathRule` and wildcard-eligible `CompiledDynamicPathRule` for use in trie nodes:
```typescript
interface TrieRule {
  readonly canonicalPath: string;  // exact rule's canonicalPath, or dynamic rule's signature
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
}
```
`CompiledExactPathRule` satisfies this interface directly. For `CompiledDynamicPathRule`, adapt at insertion time: `{ canonicalPath: rule.signature, policy: rule.policy, rulePath: rule.rulePath }`. No new class or wrapper needed — an inline object literal during `insertRule` is fine.

**`insertRule`** (line 76) — change segment-type signature and add wildcard branch:
```typescript
const insertRule = (
  root: PathTreeNode,
  segments: readonly (ExactPathSegment | WildcardPathSegment)[],
  rule: TrieRule,
): void => {
  let level = root
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    let node: PathTreeNode | undefined

    if (segment.kind === 'wildcard') {
      node = level.wildcardChild ??= {}
    } else if (segment.kind === 'index') {
      const map = level.indexChildren ??= new Map<number, PathTreeNode>()
      node = map.get(segment.value)
      if (node === undefined) { node = {}; map.set(segment.value, node) }
    } else {
      const map = level.propertyChildren ??= new Map<string, PathTreeNode>()
      node = map.get(segment.value)
      if (node === undefined) { node = {}; map.set(segment.value, node) }
    }

    if (index === segments.length - 1) { node.rule = rule }
    level = node
  }
}
```

Import `WildcardPathSegment` from `'../matching/path-parser.js'` (already imported via `ExactPathSegment`).

**`buildPrefixTree`** — accept both exact and wildcard-eligible dynamic rules:
```typescript
const buildPrefixTree = (rules: readonly TrieRule[]): PathTreeNode => {
  const root: PathTreeNode = {}
  for (const rule of rules) {
    insertRule(root, rule.segments as readonly (ExactPathSegment | WildcardPathSegment)[], rule)
  }
  return root
}
```

Wait — `TrieRule` doesn't carry `segments`. Add `segments` to `TrieRule`:
```typescript
interface TrieRule {
  readonly canonicalPath: string;
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
  readonly segments: readonly (ExactPathSegment | WildcardPathSegment)[];
}
```

For exact rules, `rule.segments` is already `readonly ExactPathSegment[]` which satisfies the union. For dynamic rules, the adaptation inline becomes:
```typescript
{
  canonicalPath: rule.signature,
  policy: rule.policy,
  rulePath: rule.rulePath,
  segments: rule.segments as readonly (ExactPathSegment | WildcardPathSegment)[],
}
```
(All dynamic rules passing `isWildcardEligible` only contain property, index, or wildcard segments, so this cast is safe.)

**`buildFastLaneExecutor`** — include wildcard-eligible dynamic rules in the trie:
```typescript
export const buildFastLaneExecutor = (
  plan: CompiledRedactorPlan,
  fallback: FastLaneExecutor,
): FastLaneExecutor => {
  const wildcardRules = plan.dynamicPathRules.map((r) => ({
    canonicalPath: r.signature,
    policy: r.policy,
    rulePath: r.rulePath,
    segments: r.segments as readonly (ExactPathSegment | WildcardPathSegment)[],
  }))

  const root = buildPrefixTree([
    ...Object.values(plan.exactPathRules),
    ...wildcardRules,
  ])

  return function fastLane(input: unknown): unknown {
    // ...existing guard logic unchanged...
    let result: unknown
    try {
      result = applyNodes(input, root, undefined, undefined, plan, input)  // new wildcardBranch param
    } catch {
      return fallback(input)
    }
    return result === delegate ? fallback(input) : result
  }
}
```

---

### AC 2 — `applyNodes` wildcard traversal

**New parameter**: `wildcardBranch: PathTreeNode | undefined` added as second parameter (between `level` and `inherited`).

**Semantics of `wildcardBranch`**: this is the trie node reached by a `*` segment that matched the **parent**'s key. At the root call it is `undefined`. When recursing into a child container, `level.wildcardChild` becomes the `wildcardBranch` for that child — because `*` would match any key at the current level, and the node reached by `*` at this level is the correct context for the next level's wildcard resolution.

**Top-level branch on `wildcardBranch`**: the first decision in `applyNodes` (after the array/object split) is whether full key iteration is required:

```typescript
if (wildcardBranch === undefined && level.wildcardChild === undefined) {
  // Exact-only level: navigate directly to configured keys only.
  // Censor applied at matched terminals regardless of value type.
  // Non-configured positions are not visited during navigation, but a pre-copy scan
  // checks for transformable values in containers about to be shallow-copied — delegates
  // if any are found so the output matches the general traversal.
  // Non-plain prototypes at intermediate nodes also trigger delegation (pollution guard).
  return applyExactNodes(container, level, inherited, plan, rootInput)
}
// Wildcard level: must iterate all keys to find wildcard matches.
// Censor applied directly at matched terminals regardless of value type.
// Transformable values at non-configured, non-matched positions trigger delegation.
// Non-plain prototypes at intermediate nodes trigger delegation (pollution guard).
```

`applyExactNodes` iterates only the keys present in `level.propertyChildren` / `level.indexChildren` — no `for...in`, no visiting of unconfigured siblings. A `Date` at `user.createdAt` is irrelevant and invisible to the fast lane if only `user.password` is configured. At terminal positions the configured censor is applied regardless of value type — there is no `requiresDelegation` check at terminals, because the censor replaces the value wholesale and the general traversal's transformer path is never reached. The only delegation trigger is a non-plain prototype detected at an intermediate node via `isPlainObject` (prototype pollution guard).

**`applyExactNodes` shape** (object branch; mirror for arrays using `indexChildren`):
```typescript
const applyExactNodes = (
  container: Record<string, unknown> | unknown[],
  level: PathTreeNode,
  inherited: InheritedRetain | undefined,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
): unknown => {
  let copy: Record<string | number, unknown> | undefined

  if (level.propertyChildren !== undefined) {
    for (const [key, node] of level.propertyChildren) {
      if (!Object.prototype.hasOwnProperty.call(container, key)) continue  // missing or prototype-only

      let value: unknown
      try {
        value = (container as Record<string, unknown>)[key]
      } catch {
        // Throwing getter — treat as missing, emit [UNSUPPORTED] if a rule applies.
        if (node.rule !== undefined) {
          copy ??= shallowCopyContainer(container) as Record<string | number, unknown>
          copy[key] = unsupportedValue
        }
        continue
      }

      if (node.rule !== undefined && !node.rule.policy.retainStructure) {
        // Terminal: censor applied regardless of value type — no delegation check.
        // Before making the first copy of this container, scan its remaining own properties
        // for transformable values at non-configured positions. A shallow copy would propagate
        // them unchanged, diverging from the general traversal which would transform them.
        if (copy === undefined) {
          for (const sibling of Object.keys(container as object)) {
            if (level.propertyChildren?.has(sibling)) continue  // configured — handled by trie
            const siblingValue = (container as Record<string, unknown>)[sibling]
            if (requiresDelegation(siblingValue)) return delegate
          }
        }
        const redacted = applyTerminalRule(value, node.rule, plan, rootInput)
        copy ??= shallowCopyContainer(container) as Record<string | number, unknown>
        if (isRemovedValue(redacted)) { delete copy[key] } else { copy[key] = redacted }
        continue
      }

      if (Array.isArray(value) || isPlainObject(value)) {
        // Plain container: descend. isPlainObject already excludes non-plain prototypes.
        const childInherited = resolveChildInherited(node, inherited, 'property', key)
        const child = applyNodes(value, node, undefined, childInherited, plan, rootInput)
        if (child === delegate) return delegate
        if (child !== value) {
          (copy ??= shallowCopyContainer(container) as Record<string | number, unknown>)[key] = child
        }
        continue
      }

      if (requiresDelegation(value)) {
        // Non-plain object (Date, Map, BigInt, etc.) at an intermediate or retain-structure
        // position — either a prototype pollution risk or a value the general traversal would
        // transform. Delegate so the output matches the general traversal exactly.
        return delegate
      }

      if (node.rule !== undefined || inherited !== undefined) {
        // Plain primitive terminal (null, string, number, boolean).
        // Censor applied directly — transformable values already delegated above.
        const redacted = node.rule === undefined
          ? applyInheritedLeaf(value, inherited as InheritedRetain, buildSegment('property', key), key, plan, rootInput)
          : applyTerminalRule(value, node.rule, plan, rootInput)
        copy ??= shallowCopyContainer(container) as Record<string | number, unknown>
        if (isRemovedValue(redacted)) { delete copy[key] } else { copy[key] = redacted }
      }
      // No rule, no inherited retain, not a container: value is not visited.
    }
  }

  return copy ?? container
}
```

**Wildcard-level per-key logic** (full iteration, applies in both the array and object branches of `applyNodes` when `wildcardBranch !== undefined || level.wildcardChild !== undefined`):

For each key `k` (or index `i`) in the container:
1. `exactNode = level.propertyChildren?.get(k)` (unchanged)
2. `wildcardTerminal = wildcardBranch?.propertyChildren?.get(k)` (NEW null-guard)

Terminal rule (leaf value — not a traversable container):
- If `exactNode?.rule !== undefined && !exactNode.rule.policy.retainStructure`: apply exact rule — censor applied regardless of value type, no delegation check (NEW: drop `requiresDelegation` at terminals)
- Else if `wildcardTerminal?.rule !== undefined && !wildcardTerminal.rule.policy.retainStructure`: apply wildcard rule — same, censor applied directly (NEW)
- Else if `exactNode?.rule !== undefined` (retainStructure): enter inherited-retain for exact path (unchanged)
- Else if `wildcardTerminal?.rule !== undefined` (retainStructure): enter inherited-retain for wildcard path (NEW)
- Otherwise (no rule, no inherited retain): delegate if `requiresDelegation(value)` — this restores the original check for non-configured, non-matched positions where the shallow copy would propagate a transformable value unchanged; plain primitives (string, number, boolean, null) are left as-is

Container recursion:
```typescript
// Correctness guard: when both branches have active children for this key,
// the fast lane cannot merge them in a single non-allocating pass — delegate.
if (exactNode !== undefined && wildcardTerminal !== undefined) {
  return delegate
}

const childLevel = exactNode ?? wildcardTerminal ?? emptyLevel
const childInherited = resolveChildInherited(childLevel, inherited, kind, key)
const child = applyNodes(value, childLevel, level.wildcardChild, childInherited, plan, rootInput)
//                                                         ↑ wildcardBranch for child
```

**Why `level.wildcardChild` and not `wildcardBranch?.propertyChildren?.get(k)`?**

`level.wildcardChild` is the node to follow for ANY key at the current level. When we recurse into the container at key `k`, the `*` in the NEXT level's parent (i.e., the current `level`) is `level.wildcardChild`. The `wildcardBranch` passed to the child is how the child looks up its own wildcard-continuation rules.

For the benchmark fixture `["*.password", "*.email", "*.firstName", "*.ip"]`:
- Root: `level = root` (has `wildcardChild = starNode`), `wildcardBranch = undefined`
- Root has `wildcardChild` → full iteration path
- Key "user" (container): `exactNode = undefined`, `wildcardTerminal = undefined`
  - `childLevel = emptyLevel`, `level.wildcardChild = starNode`
  - Recurse: `applyNodes(user, emptyLevel, starNode, ...)`
  - Inside user: `wildcardBranch = starNode` → full iteration path
  - Key "password": `wildcardTerminal = starNode.propertyChildren.get('password') = {rule}` → terminal ✓
  - Key "email": `wildcardTerminal = starNode.propertyChildren.get('email') = {rule}` → terminal ✓

For the mixed `["user.password", "*.email"]` case:
- Root: `wildcardChild = starNode` → full iteration path
- Key "user": `exactNode = userNode`, `wildcardTerminal = undefined`
  - `childLevel = userNode`, recurse with `wildcardBranch = starNode`
  - Inside user: `level = userNode` (no `wildcardChild`), `wildcardBranch = starNode` → full iteration path (wildcardBranch is set)
  - Key "password": `exactNode = {rule}` → terminal ✓
  - Key "email": `exactNode = undefined`, `wildcardTerminal = starNode.email = {rule}` → terminal ✓

For an exact-only config `["user.password", "user.email"]`:
- Root: no `wildcardChild`, no `wildcardBranch` → `applyExactNodes` path
- Only "user" key is visited at root level; all other root properties are skipped entirely
- Inside user: no `wildcardChild`, no `wildcardBranch` → `applyExactNodes` path
- Only "password" and "email" keys are visited; all other user properties are skipped

**`resolveChildInherited` and `enterRetain` under `retainStructure`** — when building the `InheritedRetain` context for a child that will be entered (i.e., the container recursion path, after the correctness guard), the node to pass to `resolveChildInherited` is determined as follows:

```typescript
// After the correctness guard (both cannot be non-undefined simultaneously):
const childLevel = exactNode ?? wildcardTerminal ?? emptyLevel
// Pass whichever node is live; resolveChildInherited already handles node?.rule
const childInherited = resolveChildInherited(childLevel, inherited, kind, key)
```

`enterRetain` is called inside `resolveChildInherited` when `node.rule?.policy.retainStructure` is true. Since `PathTreeNode.rule` is now typed as `TrieRule`, and `enterRetain` must be updated to accept `TrieRule` (see AC 1/3 task), this path will work for both exact-path and wildcard-adapted `TrieRule` values — both carry `canonicalPath` (exact rule's own, or `signature` for dynamic rules) and `rulePath`.

**`emptyLevel`** (line 239) — unchanged sentinel `const emptyLevel: PathTreeNode = {}`.

---

### AC 3 — Candidacy flag rename and condition broadening

**`compile-redactor-plan.ts`** (line 100 interface, line 336 computation):

```typescript
// In CompiledRedactorPlan interface — rename isExactPathOnly → isFastLaneEligible
readonly isFastLaneEligible: boolean;
```

```typescript
// Helper — purely a segment-shape predicate
const isWildcardEligibleRule = (rule: CompiledDynamicPathRule): boolean => {
  if (typeof rule.policy.censor === 'function') return false  // function censors need matched-path tracking
  return rule.segments.every(
    (s) => s.kind === 'property' || s.kind === 'index' || s.kind === 'wildcard',
  )
}

// Updated condition in compileRedactorPlan (replaces the existing isExactPathOnly block)
const hasAnyPaths =
  Object.keys(compiledPathRules.exactPathRules).length > 0 ||
  compiledPathRules.dynamicPathRules.length > 0

const isFastLaneEligible =
  hasAnyPaths &&
  compiledPathRules.dynamicPathRules.every(isWildcardEligibleRule) &&
  exactKeyRules.literalMatchers.length === 0 &&
  regexKeyRules.matchers.length === 0 &&
  substringRules.length === 0 &&
  !options.fuzzyKeyMatch &&
  options.caseSensitiveKeyMatch !== false
```

**Why exclude function censors on wildcard rules?** The `FunctionCensorContext.matchedPath` must be the ACTUAL matched path (`['user', 'password']`), not the rule path (`['*', 'password']`). The fast lane does not track the actual traversal path (to stay allocation-free). Adding path tracking would negate the performance benefit. Excluding configs where wildcard rules use function censors is conservative and correct; those configs fall back to the general traversal which computes `matchedPath` correctly.

**`create-redactor.ts`** (line 31):
```typescript
const executor = plan.isFastLaneEligible
  ? buildFastLaneExecutor(plan, generalTraversal)
  : generalTraversal
```

---

### Test update patterns

**Eligibility flag rename** — global find/replace `isExactPathOnly` → `isFastLaneEligible` throughout `test/unit/core/fast-lane.test.ts`.

**Updated eligibility assertions:**
```typescript
// Now true — `*` is a wildcard segment, eligible
expect(compileRedactorPlan({ paths: ['user.*'] }).isFastLaneEligible).toBe(true)
// Still false — `**` is recursive-wildcard
expect(compileRedactorPlan({ paths: ['**.password'] }).isFastLaneEligible).toBe(false)
// New: mixed exact + wildcard
expect(compileRedactorPlan({ paths: ['user.password', '*.email'] }).isFastLaneEligible).toBe(true)
```

**`crossValidate` helper** — update the flag check and use it for wildcard configs (the existing helper asserts equivalence between fast lane and general traversal, which is exactly what AC 5 requires):
```typescript
const crossValidate = (options: DeepRedactOptions, payload: unknown): unknown => {
  const plan = compileRedactorPlan(options)
  expect(plan.isFastLaneEligible).toBe(true)
  const general = redactValue(payload, plan)
  const fast = fastLaneOf(plan)(payload)
  expect(fast).toStrictEqual(general)
  return fast
}
```

**New wildcard test examples:**
```typescript
describe('fast-lane wildcard traversal', () => {
  it('redacts all matching properties via root wildcard', () => {
    crossValidate(
      { paths: ['*.password', '*.email', '*.firstName', '*.ip'] },
      { user: { id: 1, firstName: 'Emily', email: 'e@x.com', password: 'pw', ip: '1.2.3.4' } },
    )
  })

  it('handles mixed exact + wildcard in one pass', () => {
    crossValidate(
      { paths: ['user.password', '*.email'] },
      { user: { password: 'pw', email: 'u@x.com' }, account: { email: 'a@x.com', id: 99 } },
    )
  })

  it('handles wildcard at a deeper level', () => {
    crossValidate(
      { paths: ['user.*.id'] },
      { user: { profile: { id: 1, name: 'Alice' }, settings: { id: 2, theme: 'dark' } } },
    )
  })

  it('skips wildcards with no match gracefully', () => {
    crossValidate(
      { paths: ['*.secret'] },
      { user: { name: 'Bob' } },  // no 'secret' property
    )
  })

  it('delegates a wildcard-config payload with transformable value', () => {
    assertDelegatesAndMatches(
      { paths: ['*.password'] },
      { user: { password: 'pw' }, meta: { created: new Date() } },
    )
  })
})
```

Use `toStrictEqual` not `toEqual` — project convention.

---

### Benchmark threshold tightening

Current baseline in `test/artefacts/benchmarks/`:
- `wildcard-single-object-fast-redact-node24.json`: `overheadPct: 986.43`, threshold `maxOverheadPct: 2500`

After implementing the fast lane for wildcards, run the benchmark and tighten the threshold. Suggested formula: `Math.ceil(measuredOverhead * 1.3 / 50) * 50` (30% headroom, rounded to nearest 50). If the measured result is, say, 80%, the threshold should be set to ~110 (80 × 1.3 ≈ 104 → 150).

The `thresholdDecision.passed` must be `true` in the committed artefact.

Also run and review:
- `wildcard-single-object-v3-node24` (current maxOverheadPct: 200 — may tighten or leave unchanged if the wildcard path already beats v3)
- `wildcard-single-object-json-stringify-regex-node24` (current maxOverheadPct: 700)

The benchmark fixture config is at `test/bench/fixtures/wildcard-single-object/deep-redact-config.json`: `{"paths": ["*.password", "*.email", "*.firstName", "*.ip"]}` — all root-level wildcards, the primary use case.

---

### Codebase conventions

- British English in comments: "behaviour", "initialise", "artefact"
- `kebab-case` filenames, `camelCase` identifiers
- Tests use `toStrictEqual` not `toEqual`; `describe`/`it` blocks
- No inline comments unless the WHY is non-obvious
- `source .agents/initialise-env.sh` before any `pnpm run` command
- Two pre-existing legacy failures (`test/unit/index.test.ts`, `test/load/redact.test.ts`) are expected and unrelated — do not count as regressions

### Deferred Work — Re-evaluate in This Story

**`for...in` vs `Object.keys` in object traversal (`fast-lane.ts:362`)**

This was deferred from story 7.1 because `Object.keys` produced 168% overhead (gate limit: 150%) against the then-current baseline. The deferred note explicitly says: "Revisit if the benchmark gate is re-baselined or if the hot path is otherwise optimised to create headroom."

Story 7.5 modifies the object branch of `applyNodes` and re-baselines the wildcard benchmark. **After** tightening the wildcard threshold (AC 6), re-measure the `Object.keys` swap cost:

```bash
# Measure with Object.keys at the object branch
source .agents/initialise-env.sh && node --experimental-strip-types ./scripts/run-benchmarks.ts --id wildcard-single-object-fast-redact-node24
```

If the new baseline leaves the overhead below 150%, make the swap (`for (const key of Object.keys(container))` at line ~362). If it still fails the gate, leave it deferred and note the measured value in the Completion Notes. This is a one-line change if the headroom exists.

---

### References

- Epic 7 story text: [`_bmad-output/planning-artifacts/epics.md`](_bmad-output/planning-artifacts/epics.md) §Story 7.5, line 2325
- Architecture fast-lane spec: [`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md) lines 165, 187 (fast-lane-eligibility definition, `wildcardChild` trie design)
- Story 7.1 (compiled fast lane): [`_bmad-output/implementation-artifacts/7-1-implement-compiled-path-executor-for-exact-path-only-configurations.md`](_bmad-output/implementation-artifacts/7-1-implement-compiled-path-executor-for-exact-path-only-configurations.md)
- Story 7.2 (equivalence proof): [`_bmad-output/implementation-artifacts/7-2-prove-behavioural-equivalence-of-the-compiled-path-executor.md`](_bmad-output/implementation-artifacts/7-2-prove-behavioural-equivalence-of-the-compiled-path-executor.md)
- Story 7.4 (traversal budget): [`_bmad-output/implementation-artifacts/7-4-enforce-traversal-safety-limits-and-validate-hostile-input-protection.md`](_bmad-output/implementation-artifacts/7-4-enforce-traversal-safety-limits-and-validate-hostile-input-protection.md) — fast lane is NOT subject to budget enforcement (scope guard)
- Fast lane implementation: [`src/core/runtime/fast-lane.ts`](src/core/runtime/fast-lane.ts) — `PathTreeNode` at line 31, `insertRule` at line 76, `buildPrefixTree` at line 113, `applyNodes` at line 268, `buildFastLaneExecutor` at line 424
- Compiler plan: [`src/core/compiler/compile-redactor-plan.ts`](src/core/compiler/compile-redactor-plan.ts) — `CompiledRedactorPlan.isExactPathOnly` at line 100, candidacy condition at line 336
- Create-redactor wiring: [`src/core/create-redactor.ts`](src/core/create-redactor.ts) — lane selection at line 31
- Fast-lane unit tests: [`test/unit/core/fast-lane.test.ts`](test/unit/core/fast-lane.test.ts) — eligibility assertions at line 32, `crossValidate` helper at line 20
- Benchmark manifest: [`test/bench/manifest.json`](test/bench/manifest.json) — wildcard rows start at the `wildcard-single-object-fast-redact-node24` entry
- Wildcard benchmark fixture config: [`test/bench/fixtures/wildcard-single-object/deep-redact-config.json`](test/bench/fixtures/wildcard-single-object/deep-redact-config.json)
- `WildcardPathSegment` / `ExactPathSegment` types: [`src/core/matching/path-parser.ts`](src/core/matching/path-parser.ts) — `WildcardPathSegment` at line 18, `ExactPathSegment` type alias at line 46
- `CompiledDynamicPathRule`: [`src/core/compiler/compile-redactor-plan.ts`](src/core/compiler/compile-redactor-plan.ts) line 49

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
