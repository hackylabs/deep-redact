# Story 8.2: Implement Rule-Driven Exact-Path Navigation and Deprecate the Compiled Path Executor

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want path-based configurations with only exact path segments to use rule-driven direct navigation,
so that exact-path redaction costs O(P) rather than O(N) and the compiled path executor fast lane from Story 7.1 is superseded by a cleaner, more general architecture.

## Context

Epic 8 replaces the O(N) payload-walk with a **rule-driven engine** that iterates configured rules and navigates directly to what each targets, instead of visiting every node and asking "which rule matches?". **This story is the first runtime implementation of that engine** — exact-path-only configurations. Stories 8.4 (`*`), 8.5 (`**` + key rules), and 8.6 (substring + finalisation) extend the same primitive; Story 8.3 moves transformer and circular-reference handling into a serialise-only output adapter.

**What ships in 8.2:**
1. A new rule-driven engine that, for exact-path-only configs, navigates `root → root[seg0] → root[seg0][seg1] → …` to each terminal — **no `for...in` / `Object.keys` at any level**.
2. A `Map<object, shallowCopy>` identity-keyed ancestor map so containers shared by multiple paths (e.g. `user.password` + `user.email`) are shallow-copied **exactly once** and both redactions land on the same copy.
3. **Removal** of the Story 7.1 compiled path executor (`src/core/runtime/fast-lane.ts`) and its wiring.
4. **Rename** of the compile-time `isExactPathOnly` flag to `pathDrivenOnly` — same eligibility predicate for now; it now selects the rule-driven engine instead of the fast lane.
5. **Activation** of the two behaviour-change contract tests Story 8.1 left skipped — and retirement of the two "current behaviour" baseline tests they sit beside.

**The behaviour change this story makes real (Story 8.1 documented and test-pinned it; 8.2 flips it):**

The rule-driven engine **never visits non-configured positions**. Therefore a transformable runtime value (`Date`, `BigInt`, `Map`, `Set`, `Error`, `RegExp`, `URL`) sitting where no rule targets is **left unchanged** in the output — copied by reference, neither transformed nor redacted nor delegated. A circular reference at a non-configured position is likewise **preserved raw by identity**, not replaced with a circular marker. This differs from today's general traversal, which transforms every transformable value it meets. This is the **intentional, pre-release** v4 design decision recorded in the normative contract — see [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md). Configs that genuinely need every transformable value processed express that via key/substring/`**` rules, which route to the O(N) mode (unchanged in this story).

**The critical correctness boundary — delegation:** When the rule-driven engine meets a container in a configured path whose prototype is **non-plain** (prototype pollution guard), it must **delegate the entire payload** to the O(N) general traversal (`redactValue`), which already produces the correct output (transformer resolution, failure handling). Exact-path navigation must reproduce the general traversal's observable output **bit-for-bit** for all plain-object/array/primitive payloads — that is the equivalence gate.

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command (activates Node `24.14.1`, `pnpm@10.33.0`). Treat a bootstrap failure as a blocker; do not fall back to ambient Node.

**British English** throughout prose, comments, and identifiers ("behaviour", "initialise", "artefact"). `kebab-case` filenames, `camelCase` identifiers.

## Acceptance Criteria

**Direct navigation**

1. **Given** a configuration containing only exact path segments
   **When** the rule-driven engine processes a payload
   **Then** it navigates to each configured terminal using direct property access along the path segments (`root → root[seg0] → root[seg0][seg1] → …`)
   **And** no full-key iteration (`for...in`, `Object.keys`, `Object.entries`) occurs at any intermediate level
   **And** the traversal cost is O(P), where P is the total number of path segments across all configured rules (independent of payload breadth)

**Shared ancestor copies**

2. **Given** two configured paths that share a common ancestor container — e.g. `user.password` and `user.email`
   **When** the engine processes a payload where both paths exist and at least one terminal is redacted
   **Then** the shared ancestor container is shallow-copied **exactly once**
   **And** both redactions are applied to that single shallow copy
   **And** a `Map<object, shallowCopy>` identity-keyed ancestor map prevents any duplicate copy of the same source container

**Prototype pollution guard**

3. **Given** a payload where the root, or any intermediate container in a configured path, has a non-plain prototype (prototype other than `Object.prototype` or `null`)
   **When** the engine navigates that path
   **Then** the engine delegates the whole payload to the O(N) general traversal (`redactValue`)
   **And** the general traversal's output (including transformer resolution and failure handling) is returned unchanged
   **And** the configured terminal behind the non-plain container is **not** redacted by the rule-driven engine (it inherits the general traversal's outcome)

**Missing and null paths**

4. **Given** a configured path whose intermediate or terminal key is absent (or whose intermediate value is `null`/a primitive that cannot be descended)
   **When** the engine navigates that path
   **Then** the missing path is silently skipped (no throw)
   **And** the remainder of the output is unaffected

**Circular references at configured terminals**

5. **Given** a configured path whose terminal value is a circular reference
   **When** the engine navigates that path
   **Then** the censor is applied to that terminal value (censor wins)
   **And** the engine does **not** descend into the circular reference

**Non-configured position behaviour (activates Story 8.1 contract)**

6. **Given** the contract suite `test/contract/api/rule-driven-traversal-contract.test.ts`
   **When** it is executed under the rule-driven engine
   **Then** the two tests tagged `// Activated by Story 8.2` are **un-skipped** and pass:
   - a non-configured `Date` is returned unchanged: `expect(output.when).toBeInstanceOf(Date)` and `expect(output.when).toBe(payload.when)`, with `user.password` still `'[REDACTED]'`
   - a non-configured circular reference is preserved by identity: `expect(output.loop).toBe(payload.loop)`, with `user.password` still `'[REDACTED]'`
   **And** the two sibling "current observable behaviour" baseline tests (`currently transforms a non-configured Date…`, `currently completes and replaces a non-configured circular reference…`) are removed or rewritten so the suite asserts only the new contract (no test asserts the old, now-invalid behaviour)
   **And** the six invariant (green) contract cases continue to pass

**Behavioural equivalence**

7. **Given** an exact-path-only configuration and a payload of only plain objects, arrays, and primitives
   **When** the engine processes it
   **Then** the output is behaviourally identical to the current general traversal output for the same input and config
   **And** the Story 7.2 equivalence corpus ([test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts)) passes against the rule-driven engine
   **And** the corpus is extended with at least one explicit **shared-ancestor-copy** case (two paths under one ancestor; assert structured + serialised output) proving AC 2 end-to-end through the public API

**Fast lane deprecation**

8. **Given** the rule-driven engine is complete for exact-path-only configurations
   **When** the implementation is reviewed
   **Then** `src/core/runtime/fast-lane.ts` is **removed** from the runtime and no `src/` file imports `buildFastLaneExecutor`
   **And** the `isExactPathOnly` compile-time flag is **renamed** to `pathDrivenOnly` (same eligibility predicate), and it now selects the rule-driven engine over the O(N) traversal in [src/core/create-redactor.ts](src/core/create-redactor.ts)
   **And** every test and fixture referencing the fast lane (`buildFastLaneExecutor`, `isExactPathOnly`, the `'fast'` lane-forcing mode) is updated to the rule-driven engine; `test/unit/core/fast-lane.test.ts` is removed or rewritten against the new engine
   **And** no external-facing behaviour change occurs for any previously supported input **except** the documented non-configured-transformable / non-configured-circular change (AC 6)

**Benchmark gate**

9. **Given** the `path-based-single-object-node24` benchmark row
   **When** the benchmark is produced with the rule-driven engine (`pnpm bench:produce`) and verified (`pnpm verify:benchmarks`)
   **Then** `thresholdDecision.passed` is `true`
   **And** `overheadPct` is ≤ 60 (release ceiling; ≤ 50 is the aspirational target)
   **And** the committed benchmark artefact (`test/artefacts/benchmarks/path-based-single-object-node24.json`) and the generated `docs/benchmarks/results.md` are regenerated together (lockstep preserved)

**Scope guard**

10. **Given** this story's scope
    **When** the implementation is reviewed
    **Then** it covers exact-path navigation, the shared-ancestor copy map, the prototype-pollution delegation guard, missing-path handling, circular-terminal handling, fast-lane removal, the flag rename, contract activation, equivalence, and the benchmark gate **only**
    **And** single-level wildcard (`*`) support remains deferred to Story 8.4; `**`, key-based, and substring rules remain deferred to Stories 8.5/8.6; serialise-only transformer/circular handling is introduced in Story 8.3
    **And** no change is made to transformer output shape (Epic 3-owned), the censor/replacement model, or the precedence contract

## Tasks / Subtasks

- [ ] **Task 1 — Build the rule-driven exact-path navigation engine** (AC: 1, 2, 4, 5)
  - [ ] Create the engine module (suggested: `src/core/runtime/rule-driven/navigate-exact-paths.ts`, or a sibling of `redact-value.ts` — match existing folder conventions). Export a builder with the same call shape as the current lane wiring, e.g. `buildPathDrivenExecutor(plan: CompiledRedactorPlan, fallback: (value: unknown) => unknown): (value: unknown) => unknown`, mirroring `buildFastLaneExecutor`'s `(plan, fallback)` contract so [src/core/create-redactor.ts:31-33](src/core/create-redactor.ts#L31-L33) wiring stays minimal.
  - [ ] Outer loop iterates `plan.exactPathRules` (a `Readonly<Record<string, CompiledExactPathRule>>`, keyed by canonical path), **not** payload nodes. For each rule, read its `segments: readonly ExactPathSegment[]` (`{ kind: 'property', value: string } | { kind: 'index', value: number }`) and navigate from the root via `container[segment.value]`.
  - [ ] **Copy-on-write with a shared-ancestor map.** Maintain `const ancestorCopies = new Map<object, object>()` keyed by **source container identity**. The first time a path needs to mutate a container, shallow-copy it once (`{ ...obj }` for plain objects; sparse-hole-preserving `new Array(len)` copy for arrays — reuse the exact pattern from the removed `shallowCopyContainer` at `fast-lane.ts:58-74`), store `source → copy`, and rewire the parent copy's slot to point at it. Subsequent rules touching the same source reuse the stored copy. Return the original root unchanged if no rule redacted anything (copy-on-change — see the general traversal's `changed` discipline in [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts) `transformObject`/`transformArray`).
  - [ ] **Terminal redaction — reuse, do not reinvent.** At each resolved terminal apply the rule's policy via the existing `applyRedaction(value, policy, context)` ([src/core/replacement/apply-redaction.ts:31-51](src/core/replacement/apply-redaction.ts#L31-L51)) and build the function-censor context with `buildFunctionCensorContext(pathSegments, rulePath, rootInput)` ([src/core/runtime/redact-value.ts:570-584](src/core/runtime/redact-value.ts#L570-L584)) so function-censor `matchedPath`/`rulePath`/`rootInput`/`terminalKey` are **identical** to the general traversal (the corpus pins this — see `create-redactor.test.ts` FunctionCensorContext equivalence test). Handle the `removedValue` sentinel ([apply-redaction.ts:6-12](src/core/replacement/apply-redaction.ts#L6-L12)) by deleting the property / compacting the array exactly as the general traversal does. Use `setObjectEntry` ([redact-value.ts:146-156](src/core/runtime/redact-value.ts#L146-L156)) for `__proto__`-safe writes.
  - [ ] **Missing / null paths (AC 4):** if any segment lookup yields `undefined`, `null`, or a non-descendable primitive before the terminal, silently abandon that rule and continue — never throw.
  - [ ] **Circular terminal (AC 5):** the terminal policy is applied to the terminal value *before* any descent, so a circular reference at a configured terminal is simply censored with no descent. Confirm `paths: ['self']` over `const o = {}; o.self = o` yields `output.self === '[REDACTED]'` and no throw (matches Story 8.1 invariant case).
  - [ ] **Non-configured positions are copied by reference (AC 6):** when shallow-copying an ancestor, all non-targeted sibling slots are carried over by reference (spread / index copy) — never visited, never transformed. This is what makes the non-configured `Date`/circular-ref pass through unchanged.
  - [ ] Enforce the traversal budget consistently: increment/check depth and node budget using the existing helpers if the rule-driven path can be made to honour `plan.maxDepth`/`plan.maxNodes`; at minimum, navigation depth is bounded by P (finite path segments) so it cannot run away. Confirm budget behaviour does not regress the security suite. (See memory: **budget exceeded throws `BudgetExceededError` / `code: 'BUDGET_EXCEEDED'`, never degrades.**)

- [ ] **Task 2 — Prototype-pollution delegation guard** (AC: 3)
  - [ ] Reuse `isPlainObject` ([redact-value.ts:121-129](src/core/runtime/redact-value.ts#L121-L129)) / `isTraversableContainer` ([redact-value.ts:131-133](src/core/runtime/redact-value.ts#L131-L133)) — `prototype === Object.prototype || prototype === null`. Do **not** duplicate the check; import it (the now-removed `fast-lane.ts:48-56` had its own copy — do not recreate that duplication).
  - [ ] **Whole-payload delegation:** if the root, or any container reached while navigating a configured path, is non-plain (and not an array), abandon the rule-driven result entirely and `return fallback(input)` (the general traversal) for the **whole** call — matching the current fast-lane root/intermediate delegation semantics ([fast-lane.ts:430-459](src/core/runtime/fast-lane.ts#L430-L459)). The configured terminal behind a non-plain container must therefore reflect the general traversal's output, not a rule-driven redaction (Story 8.1's two active invariant tests pin: non-plain root → `output === payload`, configured terminal NOT redacted; non-plain intermediate `paths:['a.b']` → `a.b` stays `'secret'`).

- [ ] **Task 3 — Wire the engine and rename the flag** (AC: 8)
  - [ ] In [src/core/compiler/compile-redactor-plan.ts:336-358](src/core/compiler/compile-redactor-plan.ts#L336-L358): rename `isExactPathOnly` → `pathDrivenOnly` (keep the **same** eligibility predicate at lines 336-342 and the frozen-plan field at line 351). Update the `CompiledRedactorPlan` type field (lines ~90-107). Update the explanatory comment (lines 332-335) to describe rule-driven selection rather than "fast-lane candidate".
  - [ ] In [src/core/create-redactor.ts](src/core/create-redactor.ts): replace the `import { buildFastLaneExecutor } from './runtime/fast-lane.js'` (line 8) with the new engine import; replace `plan.isExactPathOnly ? buildFastLaneExecutor(plan, generalTraversal) : generalTraversal` (lines 31-33) with `plan.pathDrivenOnly ? buildPathDrivenExecutor(plan, generalTraversal) : generalTraversal`; update the comment (lines 27-30).
  - [ ] **Delete** `src/core/runtime/fast-lane.ts`.
  - [ ] Grep the whole repo for `isExactPathOnly`, `buildFastLaneExecutor`, `fast-lane`, `FastLaneExecutor`, and `fast lane` and fix every site (see References for the known importer list). Known functional importers: `src/core/create-redactor.ts`, `test/unit/core/fast-lane.test.ts`, `test/contract/api/create-redactor.test.ts`. Expect one **stale comment** hit at [test/security/traversal-safety.test.ts:36](test/security/traversal-safety.test.ts#L36) ("…not fast lane…") — update the wording; it is not a functional dependency.

- [ ] **Task 4 — Activate the Story 8.1 contract tests** (AC: 6)
  - [ ] In [test/contract/api/rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts): change the two `it.skip(...)` calls tagged `// Activated by Story 8.2` to `it(...)` (remove the now-stale tag or update it to `// Active from Story 8.2`). They must pass as written (Date preserved by reference; circular `loop` preserved by reference).
  - [ ] Remove (or rewrite) the two sibling "current observable behaviour" baseline tests — `currently transforms a non-configured Date via delegation …` and `currently completes and replaces a non-configured circular reference with a marker …` — because they assert behaviour this story intentionally removes. Leaving them in would make the suite self-contradictory and red. Prefer **deleting** them; if you keep a baseline note, it must not assert the old behaviour.
  - [ ] Confirm the six invariant cases still pass and the suite has **zero** skipped rule-driven-contract tests afterwards.

- [ ] **Task 5 — Equivalence corpus & fast-lane test migration** (AC: 7, 8)
  - [ ] Extend [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts) (32 existing entries) with at least one explicit **shared-ancestor-copy** entry (the corpus `interface ExactPathEquivalenceCorpusEntry` requires `name`, `title`, `exactPathEligibilityReason`, `options`, `createPayload`, `expectedStructured`, `expectedSerialised`). Example: `options: { paths: ['user.password', 'user.email'] }`, payload `{ user: { password: 'secret1', email: 'a@b.com' } }`, expecting both terminals `'[REDACTED]'`. (The existing `common-prefix-paths` and `same-terminal-key-different-parents` cases already exercise sharing; add an explicit identity-of-copy assertion if the harness supports it.)
  - [ ] Rewire the lane-forcing helper `createLaneForcedRedactorFromPlan(plan, lane: 'fast' | 'generic')` ([test/fixtures/exact-path-equivalence/index.ts:45-57](test/fixtures/exact-path-equivalence/index.ts#L45-L57)). **Current state (verify before changing):** it does **not** use `buildFastLaneExecutor` at all — both lanes call `redactValue`; `'fast'` runs the unmodified plan through the general traversal, `'generic'` runs `createGenericisedPlan(plan)` (exact → dynamic rules → O(N)) first. So today the `'fast'` branch is `redactValue(exactPlan)`, i.e. a `redactValue`-vs-`redactValue` comparison that does **not** exercise any fast path. **Change required:** make the `'fast'` branch invoke the new `buildPathDrivenExecutor(plan, (v) => redactValue(v, plan))` so the equivalence test genuinely compares the **rule-driven engine** against the generic traversal. Keep `createGenericisedPlan` / the `'generic'` branch unchanged.
  - [ ] Update [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts): remove the `import { buildFastLaneExecutor }` (**line 21**) and migrate the fast-lane-specific assertions inside `describe('Compiled path executor vs. general traversal equivalence', …)` (block starts **line 4804**): `expect(plan.isExactPathOnly).toBe(true)` (**line 4813**) → `expect(plan.pathDrivenOnly).toBe(true)`, and `buildFastLaneExecutor(plan, failOnDelegation)(…)` (**line 4819**) → `buildPathDrivenExecutor(plan, …)(…)`. Rename any other `isExactPathOnly` assertion to `pathDrivenOnly`. Keep the corpus-driven equivalence `it.each(exactPathEquivalenceCorpus)` tests green.
  - [ ] Remove or rewrite [test/unit/core/fast-lane.test.ts](test/unit/core/fast-lane.test.ts) entirely (it asserts fast-lane internals and the `isExactPathOnly` flag across ~34 `it` blocks). If the engine's internals warrant unit coverage, add a focused `rule-driven` unit test in its place; otherwise rely on the contract + equivalence suites.

- [ ] **Task 6 — Benchmark gate** (AC: 9)
  - [ ] `source .agents/initialise-env.sh && pnpm bench:produce` to regenerate `test/artefacts/benchmarks/*.json`, then `pnpm verify:benchmarks`. Confirm `path-based-single-object-node24.json` has `thresholdDecision.passed === true` and `overheadPct ≤ 60` (baseline before this story was ~123%, within the manifest's 0–150 window; the rule-driven engine must bring the *real* overhead down — do not relax the manifest threshold to pass).
  - [ ] Regenerate the lockstep `docs/benchmarks/results.md` from the artefacts so `test/contract/benchmarks/benchmark-artefacts.test.ts` (the doc-vs-artefact diff) stays green. Note this benchmark-artefacts test re-runs live timing and is a known environmental flake (Story 8.1 dev notes); judge the gate on `pnpm verify:benchmarks` + the committed artefact, and re-run if a single timing diff flickers.

- [ ] **Task 7 — Verify scope and full suite** (AC: 10, all)
  - [ ] `source .agents/initialise-env.sh && pnpm run test` (build + `test:contract`) — zero regressions across contract, security, and equivalence suites; the two activated contract tests pass; no rule-driven-contract test is skipped.
  - [ ] `git status` / diff review: changes confined to the engine module, `create-redactor.ts`, `compile-redactor-plan.ts`, the deleted `fast-lane.ts`, the contract test, the equivalence fixture + consumers, the removed/rewritten `fast-lane.test.ts`, and the benchmark artefacts/doc. No transformer-shape, censor-model, or precedence changes.
  - [ ] Confirm the two known-legacy red tests (`test/unit/index.test.ts`, `test/load/redact.test.ts`) are **not** part of `test:contract` and are not counted as regressions.

## Dev Notes

### What this story IS — and is NOT

- **IS:** the first rule-driven runtime engine (exact paths), the shared-ancestor copy map, removal of the Story 7.1 fast lane, the `isExactPathOnly → pathDrivenOnly` rename, activation of the two behaviour-change contract tests, equivalence-corpus extension, and the benchmark gate.
- **IS NOT:** wildcards. **No `*` (8.4), no `**` or key rules (8.5), no substring (8.6).** A config containing any of those keeps `pathDrivenOnly === false` and continues to use the unchanged O(N) `redactValue`. Do not touch transformer output shape (Epic 3), the censor/replacement model, or `precedence.md`/`one-way-redaction.md` (both **generated** — never hand-edit; regenerate via their scripts only if their *inputs* change, which they should not here).

### The behaviour flip, stated precisely (the heart of this story)

| Case | Current engine (fast lane → delegates → general traversal) | Rule-driven target (this story) |
|------|------------------------------------------------------------|---------------------------------|
| Non-configured `Date`/`BigInt`/`Map`/`Set`/`Error`/`RegExp`/`URL` | `requiresDelegation` trips → whole call delegates → general traversal **transforms** it into its `_transformer` marker | Position **never visited** → value **unchanged**, copied by reference |
| Non-configured circular ref | fast lane recurses → stack overflow → `catch` delegates → general traversal emits `{ _transformer: 'circular', … }` marker | Position **never visited** → **raw reference** preserved by identity |
| Configured terminal that is a transformable/circular value | redacted/censored at terminal | redacted/censored at terminal (**unchanged**) |
| Non-plain prototype anywhere on a configured path | delegates whole call to general traversal | delegates whole call to general traversal (**unchanged**) |

The first two rows are exactly the two `it.skip` tests Story 8.1 wrote. Activating them (Task 4) is the contract proof.

> **Downstream caveat (flagged by Story 8.1 review):** preserving raw circular references by identity means a caller's subsequent `JSON.stringify(output)` will throw on a cycle under **`serialise: false`** (structured output), where the old engine had neutralised it. This is the intentional contract for structured output. Re-neutralisation — circular circuit-breaking plus transformer markers — is reintroduced for **`serialise: true`** by the serialise-only output adapter in **Story 8.3**; do not add a re-neutralisation step to the redaction traversal itself in this story.

### Current engine wiring (the exact code you are replacing)

- Lane selection: [src/core/create-redactor.ts:24-38](src/core/create-redactor.ts#L24-L38) — `generalTraversal = (v) => redactValue(v, plan)`; `executor = plan.isExactPathOnly ? buildFastLaneExecutor(plan, generalTraversal) : generalTraversal`.
- Flag computation: [src/core/compiler/compile-redactor-plan.ts:336-342](src/core/compiler/compile-redactor-plan.ts#L336-L342) — true iff: no dynamic path rules, ≥1 exact path rule, no literal key matchers, no regex key matchers, no substring rules, no `fuzzyKeyMatch`, `caseSensitiveKeyMatch !== false`. Field frozen into the plan at line 351; the `CompiledRedactorPlan` type carries it (~lines 90-107).
- Fast lane to be deleted: [src/core/runtime/fast-lane.ts](src/core/runtime/fast-lane.ts) — `buildFastLaneExecutor(plan, fallback)` (lines 424-460), `FastLaneExecutor` type (line 16), prefix-trie build (`buildPrefixTree`/`insertRule`, lines 76-121), `shallowCopyContainer` (lines 58-74, **port this pattern**), delegation (`requiresDelegation` line 252-254, `delegate` sentinel line 246, sites 307/320/339/383/396/415, root 430-459), terminal application (`applyTerminalRule` 142-163).

### Helpers to REUSE (do not reinvent — the equivalence gate depends on identical behaviour)

| Helper | Location | Use for |
|--------|----------|---------|
| `applyRedaction(value, policy, context)` | [apply-redaction.ts:31-51](src/core/replacement/apply-redaction.ts#L31-L51) | terminal censor/remove/replace-by-length |
| `buildFunctionCensorContext(segs, rulePath, rootInput)` | [redact-value.ts:570-584](src/core/runtime/redact-value.ts#L570-L584) | identical function-censor context |
| `removedValue` / `isRemovedValue` | [apply-redaction.ts:6-12](src/core/replacement/apply-redaction.ts#L6-L12) | property delete / array compaction |
| `isPlainObject` | [redact-value.ts:121-129](src/core/runtime/redact-value.ts#L121-L129) | prototype-pollution delegation guard |
| `isTraversableContainer` | [redact-value.ts:131-133](src/core/runtime/redact-value.ts#L131-L133) | array-or-plain-object classification |
| `setObjectEntry(target, key, value)` | [redact-value.ts:146-156](src/core/runtime/redact-value.ts#L146-L156) | `__proto__`-safe writes |
| `redactValue(value, plan)` | [redact-value.ts:1496-1510](src/core/runtime/redact-value.ts#L1496-L1510) | the delegation fallback (general traversal) |

Some of these helpers are currently module-private to `redact-value.ts`. Export the ones you need (or lift them into a shared `runtime` util) rather than copy-pasting — duplication is what produced the two divergent `isPlainObject` definitions in the first place.

### Shared-ancestor copy semantics (AC 2) — the design subtlety

When `user.password` and `user.email` are both configured: navigate the first path, shallow-copy `user` once into `ancestorCopies` and rewrite the root copy's `user` slot to the new copy, redact `password` on it; navigate the second path — `user` is already in `ancestorCopies`, so **reuse the same copy** and redact `email` on it. Result: one `user` copy, both fields redacted, all other `user` siblings carried by reference. Keying the map on **source identity** (the original `user` object) is what makes this work and is mandated by the architecture: *"A `Map<object, shallowCopy>` ancestor map ensures shared containers are shallow-copied exactly once when multiple rules target the same subtree"* ([architecture.md:187](_bmad-output/planning-artifacts/architecture.md#L187)). Mirror the general traversal's copy-on-change discipline: if a rule redacts nothing (missing path), do not allocate a copy for it.

### Equivalence corpus (AC 7)

- Corpus + entry shape: [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts) (`ExactPathEquivalenceCorpusEntry`, 32 existing entries). Already covers single/two/deep segments, common-prefix, multiple paths, absent terminal/intermediate, null intermediate, primitive/empty-string leaves, nested-object & array terminals (wholesale), same-terminal-key-different-parents, parent-and-child paths.
- Consumers: [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts) (`it.each(exactPathEquivalenceCorpus)` equivalence + FunctionCensorContext equivalence + the `Compiled path executor vs. general traversal equivalence` block at line 4804 that *does* call `buildFastLaneExecutor`). Lane-forcing helpers `createGenericisedPlan`, `createLaneForcedRedactorFromPlan(plan, 'fast'|'generic')`, `createLaneForcedRedactor` live in the corpus file — note its `'fast'` branch currently runs `redactValue` on the unmodified plan (it does **not** call `buildFastLaneExecutor`); rewire it to `buildPathDrivenExecutor` (Task 5).

### Project structure & conventions

- Engine module beside the existing runtime (`src/core/runtime/`). Tests: `vitest`; `describe`/`it`; `toStrictEqual` for structure, `toBe` for identity/string; **`.js` import extensions**; `deepRedact` is a **named** export from `src/index.ts`.
- Authoritative gate is `pnpm run test` (build + `test:contract` = `vitest run test/build.test.ts test/contract/**/*.test.ts test/security/*.test.ts`). The two legacy red tests are isolated in `vitest.red-phase.config.ts` (`pnpm test:red-phase`) — not regressions.
- `docs/architecture/rule-driven-traversal.md` is **hand-authored** (outside `scripts/verify-generated-files.ts`); it already documents this story's contract — read it as the spec, edit only if a wording gap surfaces. `precedence.md` and `one-way-redaction.md` are **generated** — do not hand-edit.

### References

- Story 8.2 acceptance criteria: [_bmad-output/planning-artifacts/epics.md §Story 8.2, lines 2446-2512](_bmad-output/planning-artifacts/epics.md)
- Epic 8 overview & "Key design decision": [_bmad-output/planning-artifacts/epics.md §Epic 8, lines 2393-2399](_bmad-output/planning-artifacts/epics.md)
- Story 8.1 (contract + skipped tests this story activates): [_bmad-output/implementation-artifacts/8-1-establish-rule-driven-traversal-contract-and-document-behaviour-changes.md](_bmad-output/implementation-artifacts/8-1-establish-rule-driven-traversal-contract-and-document-behaviour-changes.md)
- Normative contract to implement: [docs/architecture/rule-driven-traversal.md](docs/architecture/rule-driven-traversal.md)
- Traversal/runtime architecture, cost model, ancestor map: [_bmad-output/planning-artifacts/architecture.md §Traversal & Runtime, lines 186-200](_bmad-output/planning-artifacts/architecture.md); Path Grammar & Selector Contract, lines 205-345
- Precedence (must preserve): [docs/architecture/precedence.md](docs/architecture/precedence.md); One-way redaction (must preserve): [docs/architecture/one-way-redaction.md](docs/architecture/one-way-redaction.md)
- Lane selection: [src/core/create-redactor.ts](src/core/create-redactor.ts)
- Flag & plan shape: [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts)
- Fast lane (to remove): [src/core/runtime/fast-lane.ts](src/core/runtime/fast-lane.ts)
- General traversal (delegation target + helpers): [src/core/runtime/redact-value.ts](src/core/runtime/redact-value.ts)
- Censor application: [src/core/replacement/apply-redaction.ts](src/core/replacement/apply-redaction.ts)
- Contract tests to activate: [test/contract/api/rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts)
- Equivalence corpus + lane-forcing helpers: [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts)
- Equivalence consumer / fast-lane assertions to migrate: [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts)
- Fast-lane unit test (remove/rewrite): [test/unit/core/fast-lane.test.ts](test/unit/core/fast-lane.test.ts)
- Benchmark manifest row & runner: [test/bench/manifest.json](test/bench/manifest.json), [scripts/benchmark-runner.ts](scripts/benchmark-runner.ts); artefact: [test/artefacts/benchmarks/path-based-single-object-node24.json](test/artefacts/benchmarks/path-based-single-object-node24.json); lockstep doc test: [test/contract/benchmarks/benchmark-artefacts.test.ts](test/contract/benchmarks/benchmark-artefacts.test.ts)
- Prior story patterns (test idiom / security corpus): [_bmad-output/implementation-artifacts/7-4-enforce-traversal-safety-limits-and-validate-hostile-input-protection.md](_bmad-output/implementation-artifacts/7-4-enforce-traversal-safety-limits-and-validate-hostile-input-protection.md)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log
