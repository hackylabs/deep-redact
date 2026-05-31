# Story 8.2: Implement Rule-Driven Exact-Path Navigation and Deprecate the Compiled Path Executor

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want path-based configurations with only exact path segments to use rule-driven direct navigation,
so that exact-path redaction costs O(P) rather than O(N) and the compiled path executor fast lane from Story 7.1 is superseded by a cleaner, more general architecture.

## Context

Epic 8 replaces the O(N) payload-walk with a **rule-driven engine** that iterates configured rules and navigates directly to what each targets, instead of visiting every node and asking "which rule matches?". **This story is the first runtime implementation of that engine** — exact-path-only configurations. Stories 8.4 (`*`), 8.5 (`**` + key rules), and 8.6 (substring + finalisation) extend the same primitive; Story 8.3 moves transformer and circular-reference handling into a serialise-only output adapter.

**What ships in 8.2:**
1. A new rule-driven engine that, for exact-path-only configs, performs a **trie-guided single traversal** — the compile-time prefix trie is walked top-down against the live payload, following only branches the trie has edges for, so shared prefixes are visited exactly once and non-configured positions are never touched — applying each rule at its terminal trie node (`root → root[seg0] → root[seg0][seg1] → …`). **No `for...in` / `Object.keys` at any intermediate level**, with the single exception of a `retainStructure: true` exact path, whose retained subtree is walked leaf-by-leaf (see AC 10).
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
   **And** no full-key iteration (`for...in`, `Object.keys`, `Object.entries`) occurs at any intermediate level — **except** beneath a `retainStructure: true` terminal, whose retained subtree is necessarily walked leaf-by-leaf (AC 10)
   **And** the traversal cost is O(P) for non-retain rules, where P is the total number of path segments across all configured rules (independent of payload breadth); a `retainStructure` rule additionally costs O(K) in the size K of its retained subtree

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

9. **Given** the `path-based-single-object-v3-node24` benchmark row (deep-redact v3 comparator; fast-redact row retired per implementation decision)
   **When** the benchmark is produced with the rule-driven engine (`pnpm bench:produce`) and verified (`pnpm verify:benchmarks`)
   **Then** `thresholdDecision.passed` is `true`
   **And** `overheadPct` is within the threshold window `-100%–0%` (v4 must not regress against deep-redact v3; v4 running ~96% faster than v3 is the baseline)
   **And** the committed benchmark artefact (`test/artefacts/benchmarks/path-based-single-object-v3-node24.json`) and the generated `docs/benchmarks/results.md` are regenerated together (lockstep preserved)

**`retainStructure` exact paths**

10. **Given** an exact-path-only configuration containing a `retainStructure: true` path (eligible for `pathDrivenOnly`; the predicate does not exclude it)
    **When** the engine resolves that path's terminal container
    **Then** the engine descends the retained subtree and applies the rule's policy to **every leaf**, preserving the container structure (no wholesale redaction of the container value)
    **And** the function-censor context, canonical paths, and failure diagnostics for each retained leaf are identical to the general traversal (port the `InheritedRetain` / `applyInheritedLeaf` machinery from the fast lane rather than reinventing it)
    **And** the corpus entries `exact-path-retain-structure` and `retainStructure alias-replay` ([test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts)) remain green, including the shared-identity (alias-replay) case
    **And** this leaf walk is the sole sanctioned exception to AC 1's "no full-key iteration" rule

**Serialise-mode interim contract**

11. **Given** a `pathDrivenOnly` configuration with `serialise: true` and a payload containing a **non-configured circular reference or transformable value**
    **When** the redactor runs under the rule-driven engine
    **Then** the documented structured-output behaviour (raw cycle / value preserved by identity) is applied **before** `applySerialisation` ([src/core/create-redactor.ts:12-22](src/core/create-redactor.ts#L12-L22)), which means `JSON.stringify` will **throw** on a preserved cycle
    **And** this interim `serialise: true` change is **explicitly acknowledged** in the story, the contract doc, and the PR/Change Log as a known, accepted consequence of deferring re-neutralisation to Story 8.3 — it is **not** silently absorbed under AC 8's "no external-facing behaviour change"
    **And** no re-neutralisation or transformer step is added to the redaction traversal in this story (that adapter is Story 8.3); because Story 8.3 is not yet written, this serialise-mode regression is called out as a release-sequencing dependency, not shipped unannounced

**Traversal budget & security**

12. **Given** a `pathDrivenOnly` configuration and a hostile payload (deep nesting / wide breadth) at **non-configured** positions
    **When** the rule-driven engine runs
    **Then** the security suite (`test/security/*.test.ts`, Story 7.4) passes with no regression
    **And** the decision is made explicit: because the engine visits only configured paths (depth bounded by P, breadth never enumerated), hostile **non-configured** breadth/depth is never traversed and therefore never trips `maxNodes`/`maxDepth` — documented as intended, not an accidental security gap
    **And** any container actually reached on a configured path still honours `plan.maxDepth`/`plan.maxNodes` and throws `BudgetExceededError` (`code: 'BUDGET_EXCEEDED'`) rather than degrading, exactly as the general traversal does

**Scope guard**

13. **Given** this story's scope
    **When** the implementation is reviewed
    **Then** it covers exact-path navigation (trie-guided), the shared-ancestor copy map, `retainStructure` leaf descent, the prototype-pollution delegation guard, missing-path handling, circular-terminal handling, the serialise-mode interim contract, the traversal-budget decision, fast-lane removal, the flag rename, contract activation, equivalence, and the benchmark gate **only**
    **And** single-level wildcard (`*`) support remains deferred to Story 8.4; `**`, key-based, and substring rules remain deferred to Stories 8.5/8.6; serialise-only transformer/circular handling is introduced in Story 8.3
    **And** no change is made to transformer output shape (Epic 3-owned), the censor/replacement model, or the precedence contract

## Tasks / Subtasks

- [x] **Task 1 — Build the rule-driven exact-path navigation engine** (AC: 1, 2, 4, 5, 10, 12)
  - [x] Create the engine module (suggested: `src/core/runtime/rule-driven/navigate-exact-paths.ts`, or a sibling of `redact-value.ts` — match existing folder conventions). Export a builder with the same call shape as the current lane wiring, e.g. `buildPathDrivenExecutor(plan: CompiledRedactorPlan, fallback: (value: unknown) => unknown): (value: unknown) => unknown`, mirroring `buildFastLaneExecutor`'s `(plan, fallback)` contract so [src/core/create-redactor.ts:31-33](src/core/create-redactor.ts#L31-L33) wiring stays minimal.
  - [x] **Build the navigation structure as a prefix trie, not a per-rule loop.** The architecture mandates a *trie-guided single traversal* — "the compile-time prefix trie is walked top-down against the live payload … shared prefixes are visited exactly once" ([architecture.md:186-200](_bmad-output/planning-artifacts/architecture.md)). **Port** the fast lane's existing trie (`PathTreeNode`, `buildPrefixTree`, `insertRule` at [fast-lane.ts:28-121](src/core/runtime/fast-lane.ts#L28-L121)) rather than deleting it and re-walking each rule independently — a per-rule loop re-reads shared prefixes once per rule (failing the architecture's "visited exactly once" property) and does not compose with the `*`/`**` walks in Stories 8.4/8.5. Walk the trie top-down against the payload: at each node, for each trie edge `{ kind: 'property' | 'index', value }`, read `container[value]` and follow **only** edges the trie has, so non-configured siblings are never enumerated. Apply a rule at its terminal trie node. `plan.exactPathRules` is a `Readonly<Record<string, CompiledExactPathRule>>` keyed by canonical path — feed `Object.values(...)` into `buildPrefixTree` exactly as the fast lane does.
  - [x] **Copy-on-change with a shared-source map for aliases.** Shallow-copy a container only when a descendant actually changes (`{ ...obj }` for plain objects; sparse-hole-preserving `new Array(len)` copy for arrays — **port** the `shallowCopyContainer` pattern at [fast-lane.ts:58-74](src/core/runtime/fast-lane.ts#L58-L74), do not delete it), and signal "unchanged" by returning the same reference, mirroring the fast lane's `applyNodes` copy discipline and the general traversal's `changed` flag in [redact-value.ts](src/core/runtime/redact-value.ts) (`transformObject`/`transformArray`). A single top-down trie walk visits each *structural* container once, so the only duplicate-copy risk is **aliasing** — the same source object reached via two trie branches (e.g. the `retainStructure alias-replay` corpus case). Guard that with `const ancestorCopies = new Map<object, object>()` keyed by **source container identity** (architecture: "*a `Map<object, shallowCopy>` ancestor map ensures shared containers are shallow-copied exactly once*", [architecture.md:187](_bmad-output/planning-artifacts/architecture.md#L187)): before copying, check the map; reuse the stored copy if present; otherwise copy, store `source → copy`, and rewire the parent slot. Allocate nothing when a rule redacts nothing.
  - [x] **Terminal redaction — reuse, do not reinvent.** At each resolved terminal apply the rule's policy via the existing `applyRedaction(value, policy, context)` ([src/core/replacement/apply-redaction.ts:31-51](src/core/replacement/apply-redaction.ts#L31-L51)) and build the function-censor context with `buildFunctionCensorContext(pathSegments, rulePath, rootInput)` ([src/core/runtime/redact-value.ts:570-584](src/core/runtime/redact-value.ts#L570-L584)) so function-censor `matchedPath`/`rulePath`/`rootInput`/`terminalKey` are **identical** to the general traversal (the corpus pins this — see `create-redactor.test.ts` FunctionCensorContext equivalence test). Handle the `removedValue` sentinel ([apply-redaction.ts:6-12](src/core/replacement/apply-redaction.ts#L6-L12)) by deleting the property / compacting the array exactly as the general traversal does. Use `setObjectEntry` ([redact-value.ts:146-156](src/core/runtime/redact-value.ts#L146-L156)) for `__proto__`-safe writes.
  - [x] **`retainStructure: true` terminals (AC 10) — port the retain machinery, do not collapse to a wholesale redaction.** When a terminal trie node's rule has `policy.retainStructure`, do **not** apply the policy to the container value as a whole; instead descend the matched container and apply the policy to **every leaf**, preserving structure. Port `InheritedRetain`, `enterRetain`, `descendRetain`, `resolveChildInherited`, and `applyInheritedLeaf` from the fast lane ([fast-lane.ts:37-237](src/core/runtime/fast-lane.ts#L37-L237)) so canonical paths, function-censor contexts, and failure diagnostics for each retained leaf match the general traversal bit-for-bit. This leaf walk is the **only** sanctioned full-key iteration (AC 1) and the only place the engine's cost exceeds O(P). A retained subtree reached via an alias must reuse the same copy via `ancestorCopies` (the `retainStructure alias-replay` corpus case pins this).
  - [x] **Missing / null paths (AC 4):** if any segment lookup yields `undefined`, `null`, or a non-descendable primitive before the terminal, silently abandon that rule and continue — never throw.
  - [x] **Circular terminal (AC 5):** the terminal policy is applied to the terminal value *before* any descent, so a circular reference at a configured terminal is simply censored with no descent. Confirm `paths: ['self']` over `const o = {}; o.self = o` yields `output.self === '[REDACTED]'` and no throw (matches Story 8.1 invariant case).
  - [x] **Non-configured positions are copied by reference (AC 6):** when shallow-copying an ancestor, all non-targeted sibling slots are carried over by reference (spread / index copy) — never visited, never transformed. This is what makes the non-configured `Date`/circular-ref pass through unchanged.
  - [x] Enforce the traversal budget consistently: increment/check depth and node budget using the existing helpers if the rule-driven path can be made to honour `plan.maxDepth`/`plan.maxNodes`; at minimum, navigation depth is bounded by P (finite path segments) so it cannot run away. Confirm budget behaviour does not regress the security suite. (See memory: **budget exceeded throws `BudgetExceededError` / `code: 'BUDGET_EXCEEDED'`, never degrades.**)

- [x] **Task 2 — Prototype-pollution delegation guard** (AC: 3)
  - [x] Reuse `isPlainObject` ([redact-value.ts:121-129](src/core/runtime/redact-value.ts#L121-L129)) / `isTraversableContainer` ([redact-value.ts:131-133](src/core/runtime/redact-value.ts#L131-L133)) — `prototype === Object.prototype || prototype === null`. Do **not** duplicate the check; import it (the now-removed `fast-lane.ts:48-56` had its own copy — do not recreate that duplication).
  - [x] **Whole-payload delegation:** if the root, or any container reached while navigating a configured path, is non-plain (and not an array), abandon the rule-driven result entirely and `return fallback(input)` (the general traversal) for the **whole** call — matching the current fast-lane root/intermediate delegation semantics ([fast-lane.ts:430-459](src/core/runtime/fast-lane.ts#L430-L459)). The configured terminal behind a non-plain container must therefore reflect the general traversal's output, not a rule-driven redaction (Story 8.1's two active invariant tests pin: non-plain root → `output === payload`, configured terminal NOT redacted; non-plain intermediate `paths:['a.b']` → `a.b` stays `'secret'`).

- [x] **Task 3 — Wire the engine and rename the flag** (AC: 8)
  - [x] In [src/core/compiler/compile-redactor-plan.ts:336-358](src/core/compiler/compile-redactor-plan.ts#L336-L358): rename `isExactPathOnly` → `pathDrivenOnly` (keep the **same** eligibility predicate at lines 336-342 and the frozen-plan field at line 351). Update the `CompiledRedactorPlan` type field ([compile-redactor-plan.ts:100](src/core/compiler/compile-redactor-plan.ts#L100)). Update the explanatory comment (lines 332-335) to describe rule-driven selection rather than "fast-lane candidate". **Naming caveat:** the architecture defines `pathDrivenOnly` as *exact paths **and/or** single-level `*`* ([architecture.md:187](_bmad-output/planning-artifacts/architecture.md#L187)), but this story keeps the narrower exact-only predicate (no `*` until Story 8.4). The flag is therefore temporarily narrower than its published definition — say so in the comment so the Story 8.4 author knows to **widen the predicate**, not merely consume the flag.
  - [x] In [src/core/create-redactor.ts](src/core/create-redactor.ts): replace the `import { buildFastLaneExecutor } from './runtime/fast-lane.js'` (line 8) with the new engine import; replace `plan.isExactPathOnly ? buildFastLaneExecutor(plan, generalTraversal) : generalTraversal` (lines 31-33) with `plan.pathDrivenOnly ? buildPathDrivenExecutor(plan, generalTraversal) : generalTraversal`; update the comment (lines 27-30).
  - [x] **Delete** `src/core/runtime/fast-lane.ts`.
  - [x] Grep the whole repo for `isExactPathOnly`, `buildFastLaneExecutor`, `fast-lane`, `FastLaneExecutor`, and `fast lane` and fix every site. Known functional importers: `src/core/create-redactor.ts`, `test/unit/core/fast-lane.test.ts`, `test/contract/api/create-redactor.test.ts`. **Stale-comment / prose hits** (not functional dependencies): [test/security/traversal-safety.test.ts:36](test/security/traversal-safety.test.ts#L36) ("…not fast lane…"); the "Today the fast lane recurses…" comment at [test/contract/api/rule-driven-traversal-contract.test.ts:141](test/contract/api/rule-driven-traversal-contract.test.ts#L141) (inside a baseline test removed in Task 4 — confirm it goes with that test); and [docs/architecture/rule-driven-traversal.md:50](docs/architecture/rule-driven-traversal.md#L50) (a historical "fast lane" reference — leave the history, but confirm no live `isExactPathOnly` naming remains. The doc already uses `pathDrivenOnly` at [line 123](docs/architecture/rule-driven-traversal.md#L123), so the code rename brings the code into line with the already-updated spec — not the other way round).

- [x] **Task 4 — Activate the Story 8.1 contract tests** (AC: 6)
  - [x] In [test/contract/api/rule-driven-traversal-contract.test.ts](test/contract/api/rule-driven-traversal-contract.test.ts): change the two `it.skip(...)` calls tagged `// Activated by Story 8.2` to `it(...)` (remove the now-stale tag or update it to `// Active from Story 8.2`). They must pass as written (Date preserved by reference; circular `loop` preserved by reference).
  - [x] Remove (or rewrite) the two sibling "current observable behaviour" baseline tests — `currently transforms a non-configured Date via delegation …` and `currently completes and replaces a non-configured circular reference with a marker …` — because they assert behaviour this story intentionally removes. Leaving them in would make the suite self-contradictory and red. Prefer **deleting** them; if you keep a baseline note, it must not assert the old behaviour.
  - [x] Confirm the six invariant cases still pass and the suite has **zero** skipped rule-driven-contract tests afterwards.

- [x] **Task 5 — Equivalence corpus & fast-lane test migration** (AC: 7, 8)
  - [x] Extend [test/fixtures/exact-path-equivalence/index.ts](test/fixtures/exact-path-equivalence/index.ts) (32 existing entries) with at least one explicit **shared-ancestor-copy** entry (the corpus `interface ExactPathEquivalenceCorpusEntry` requires `name`, `title`, `exactPathEligibilityReason`, `options`, `createPayload`, `expectedStructured`, `expectedSerialised`). Example: `options: { paths: ['user.password', 'user.email'] }`, payload `{ user: { password: 'secret1', email: 'a@b.com' } }`, expecting both terminals `'[REDACTED]'`. (The existing `common-prefix-paths` and `same-terminal-key-different-parents` cases already exercise sharing; add an explicit identity-of-copy assertion if the harness supports it.) **Note:** the 32 entries already include `exact-path-retain-structure` and `retainStructure alias-replay` ([index.ts:249,326](test/fixtures/exact-path-equivalence/index.ts)) — these exercise AC 10 and **must stay green**; if they fail, the retain machinery was not ported (Task 1), it is not a corpus problem.
  - [x] Rewire the lane-forcing helper `createLaneForcedRedactorFromPlan(plan, lane: 'fast' | 'generic')` ([test/fixtures/exact-path-equivalence/index.ts:45-57](test/fixtures/exact-path-equivalence/index.ts#L45-L57)). **Current state (verify before changing):** it does **not** use `buildFastLaneExecutor` at all — both lanes call `redactValue`; `'fast'` runs the unmodified plan through the general traversal, `'generic'` runs `createGenericisedPlan(plan)` (exact → dynamic rules → O(N)) first. So today the `'fast'` branch is `redactValue(exactPlan)`, i.e. a `redactValue`-vs-`redactValue` comparison that does **not** exercise any fast path. **Change required:** make the `'fast'` branch invoke the new `buildPathDrivenExecutor(plan, (v) => redactValue(v, plan))` so the equivalence test genuinely compares the **rule-driven engine** against the generic traversal. Keep `createGenericisedPlan` / the `'generic'` branch unchanged.
  - [x] Update [test/contract/api/create-redactor.test.ts](test/contract/api/create-redactor.test.ts): remove the `import { buildFastLaneExecutor }` (**line 21**) and migrate the fast-lane-specific assertions inside `describe('Compiled path executor vs. general traversal equivalence', …)` (block starts **line 4804**): `expect(plan.isExactPathOnly).toBe(true)` (**line 4813**) → `expect(plan.pathDrivenOnly).toBe(true)`, and `buildFastLaneExecutor(plan, failOnDelegation)(…)` (**line 4819**) → `buildPathDrivenExecutor(plan, …)(…)`. Rename any other `isExactPathOnly` assertion to `pathDrivenOnly`. Keep the corpus-driven equivalence `it.each(exactPathEquivalenceCorpus)` tests green.
  - [x] Remove or rewrite [test/unit/core/fast-lane.test.ts](test/unit/core/fast-lane.test.ts) entirely (it asserts fast-lane internals and the `isExactPathOnly` flag across ~34 `it` blocks). If the engine's internals warrant unit coverage, add a focused `rule-driven` unit test in its place; otherwise rely on the contract + equivalence suites.

- [x] **Task 6 — Benchmark gate** (AC: 9)
  - [x] `source .agents/initialise-env.sh && pnpm bench:produce` to regenerate `test/artefacts/benchmarks/*.json`, then `pnpm verify:benchmarks`. Confirm `path-based-single-object-node24.json` has `thresholdDecision.passed === true` and `overheadPct ≤ 60` (baseline before this story was ~123%, within the manifest's 0–150 window; the rule-driven engine must bring the *real* overhead down — do not relax the manifest threshold to pass).
  - [x] Regenerate the lockstep `docs/benchmarks/results.md` from the artefacts so `test/contract/benchmarks/benchmark-artefacts.test.ts` (the doc-vs-artefact diff) stays green. Note this benchmark-artefacts test re-runs live timing and is a known environmental flake (Story 8.1 dev notes); judge the gate on `pnpm verify:benchmarks` + the committed artefact, and re-run if a single timing diff flickers.

- [x] **Task 7 — Verify scope and full suite** (AC: 13, all)
  - [x] **Serialise-mode acknowledgement (AC 11):** confirm no re-neutralisation was added to the traversal, and that the `serialise: true` + non-configured-cycle throw is recorded in the PR description / Change Log as an accepted interim consequence pending Story 8.3 — not silently absorbed under AC 8.
  - [x] `source .agents/initialise-env.sh && pnpm run test` (build + `test:contract`) — zero regressions across contract, security, and equivalence suites; the two activated contract tests pass; no rule-driven-contract test is skipped.
  - [x] `git status` / diff review: changes confined to the engine module, `create-redactor.ts`, `compile-redactor-plan.ts`, the deleted `fast-lane.ts`, the contract test, the equivalence fixture + consumers, the removed/rewritten `fast-lane.test.ts`, and the benchmark artefacts/doc. No transformer-shape, censor-model, or precedence changes.
  - [x] Confirm the two known-legacy red tests (`test/unit/index.test.ts`, `test/load/redact.test.ts`) are **not** part of `test:contract` and are not counted as regressions.

## Dev Notes

### What this story IS — and is NOT

- **IS:** the first rule-driven runtime engine (exact paths, **trie-guided** per the architecture — porting the fast lane's trie, not replacing it with a per-rule loop), `retainStructure` leaf descent (porting the fast lane's retain machinery), the shared-ancestor/alias copy map, removal of the Story 7.1 fast-lane *module and its full-payload scan + stray-value delegation*, the `isExactPathOnly → pathDrivenOnly` rename, activation of the two behaviour-change contract tests, equivalence-corpus extension, the serialise-mode interim contract (AC 11), the budget decision (AC 12), and the benchmark gate.
- **IS NOT:** wildcards. **No `*` (8.4), no `**` or key rules (8.5), no substring (8.6).** A config containing any of those keeps `pathDrivenOnly === false` and continues to use the unchanged O(N) `redactValue`. Do not touch transformer output shape (Epic 3), the censor/replacement model, or `precedence.md`/`one-way-redaction.md` (both **generated** — never hand-edit; regenerate via their scripts only if their *inputs* change, which they should not here).

### The behaviour flip, stated precisely (the heart of this story)

| Case | Current engine (fast lane → delegates → general traversal) | Rule-driven target (this story) |
|------|------------------------------------------------------------|---------------------------------|
| Non-configured `Date`/`BigInt`/`Map`/`Set`/`Error`/`RegExp`/`URL` | `requiresDelegation` trips → whole call delegates → general traversal **transforms** it into its `_transformer` marker | Position **never visited** → value **unchanged**, copied by reference |
| Non-configured circular ref | fast lane recurses → stack overflow → `catch` delegates → general traversal emits `{ _transformer: 'circular', … }` marker | Position **never visited** → **raw reference** preserved by identity |
| Configured terminal that is a transformable/circular value | redacted/censored at terminal | redacted/censored at terminal (**unchanged**) |
| Configured `retainStructure` exact path | descends retained subtree, redacts every leaf | descends retained subtree, redacts every leaf (**unchanged** — port the retain machinery, AC 10) |
| Non-plain prototype anywhere on a configured path | delegates whole call to general traversal | delegates whole call to general traversal (**unchanged**) |

The first two rows are exactly the two `it.skip` tests Story 8.1 wrote. Activating them (Task 4) is the contract proof.

> **Downstream caveat (flagged by Story 8.1 review):** preserving raw circular references by identity means a caller's subsequent `JSON.stringify(output)` will throw on a cycle under **`serialise: false`** (structured output), where the old engine had neutralised it. This is the intentional contract for structured output. Re-neutralisation — circular circuit-breaking plus transformer markers — is reintroduced for **`serialise: true`** by the serialise-only output adapter in **Story 8.3**; do not add a re-neutralisation step to the redaction traversal itself in this story. **Sequencing dependency (AC 11):** Story 8.3 does not yet exist as an implementation artifact. Until it merges, a `pathDrivenOnly` + `serialise: true` config that meets a non-configured cycle will **throw** at `JSON.stringify` where it previously produced a marker. This is a real interim `serialise: true` regression — surface it in the PR/release notes as a blocking dependency on 8.3; do not let it ship silently under AC 8.

### Current engine wiring (the exact code you are replacing)

- Lane selection: [src/core/create-redactor.ts:24-38](src/core/create-redactor.ts#L24-L38) — `generalTraversal = (v) => redactValue(v, plan)`; `executor = plan.isExactPathOnly ? buildFastLaneExecutor(plan, generalTraversal) : generalTraversal`.
- Flag computation: [src/core/compiler/compile-redactor-plan.ts:336-342](src/core/compiler/compile-redactor-plan.ts#L336-L342) — true iff: no dynamic path rules, ≥1 exact path rule, no literal key matchers, no regex key matchers, no substring rules, no `fuzzyKeyMatch`, `caseSensitiveKeyMatch !== false`. Field frozen into the plan at line 351; the `CompiledRedactorPlan` type carries it (~lines 90-107).
- Fast lane ([src/core/runtime/fast-lane.ts](src/core/runtime/fast-lane.ts)) — the module file is **deleted**, but several pieces are **ported into the new engine, not discarded**:
  - **Port:** the prefix trie (`PathTreeNode`/`buildPrefixTree`/`insertRule`, lines 28-121) — this *is* the architecture-mandated trie; do not replace it with a per-rule loop. `shallowCopyContainer` (lines 58-74). Terminal application `applyTerminalRule` (142-163). **The entire `retainStructure` subsystem:** `InheritedRetain` (41-46), `applyInheritedLeaf` (166-189), `enterRetain` (191-198), `descendRetain` (200-211), `buildSegment` (213-217), `resolveChildInherited` (222-237) — required by AC 10 and the retain corpus entries.
  - **Drop:** `buildFastLaneExecutor` (424-460) and `FastLaneExecutor` type (16) wiring; the full-payload `for…in`/index scan in `applyNodes` (which visited *every* node); and the stray-value **delegation** path (`requiresDelegation` 252-254, `delegate` sentinel 246, sites 307/320/339/383/396/415, root 430-459) — the rule-driven engine visits only configured paths, so it never "discovers" a stray transformable to delegate on. (Prototype-pollution delegation on a *configured* path is re-implemented per Task 2.)

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

claude-opus-4-8 (Amelia, dev-story workflow)

### Debug Log References

- `pnpm run test` (build + `test:contract`): **534 passed / 534** (zero regressions); the two activated rule-driven contract tests pass; no rule-driven-contract test is skipped.
- `pnpm verify:benchmarks`: passed. New path-based gate `path-based-single-object-v3-node24` at **-96.42%** (v4 ~96% faster than deep-redact v3). The pre-existing `wildcard-single-object-v3-node24` floor breach (`passed:false` on HEAD) is unrelated to this story (wildcards use the unchanged general traversal) and was restored untouched.

### Completion Notes List

- **Engine (Task 1/2):** New `src/core/runtime/navigate-exact-paths.ts` implements `buildPathDrivenExecutor(plan, fallback)` — a trie-guided single traversal that walks only configured edges (no `for…in`/`Object.keys` at intermediate levels), shallow-copies on change via a source-identity `Map<object, copy>` ancestor map (AC 2 / alias-replay), descends `retainStructure` terminals leaf-by-leaf via the ported retain machinery (`redactRetained`, `InheritedRetain`, `applyInheritedLeaf`, `enterRetain`/`descendRetain`/`resolveChildInherited`), and delegates the whole payload on a non-plain prototype reached on a configured path (AC 3). The hot path allocates no per-call closures (the index/property branches are inlined) — the initial closure-based draft measured ~120% over the v3 gate; the inlined version brings the gate to ~-96%.
- **Helpers reused, not duplicated:** `isPlainObject`, `isTraversableContainer`, `setObjectEntry` are now exported from `redact-value.ts` and imported by the engine; `applyRedaction`/`isRemovedValue` reused from `apply-redaction.ts`. The fast lane's duplicate `isPlainObject` was not recreated.
- **Flag rename (Task 3):** `isExactPathOnly → pathDrivenOnly` (same exact-only predicate). Comment flags that Story 8.4 must **widen** the predicate to include single-level `*`, not merely consume the flag. `src/core/runtime/fast-lane.ts` deleted; no `src/` file imports `buildFastLaneExecutor`.
- **Contract activation (Task 4):** the two `it.skip` behaviour-change tests are un-skipped and pass; the two "current observable behaviour" baseline tests were deleted; the six invariant cases stay green; zero skipped rule-driven-contract tests.
- **Equivalence (Task 5):** corpus extended with an explicit `shared-ancestor-copy` entry; the `'fast'` lane-forcing helper now invokes `buildPathDrivenExecutor` (previously a `redactValue`-vs-`redactValue` comparison that exercised no fast path); `create-redactor.test.ts` migrated to `pathDrivenOnly`/`buildPathDrivenExecutor`; `test/unit/core/fast-lane.test.ts` removed (covered by contract + equivalence suites).
- **AC 11 — serialise-mode interim regression (ACKNOWLEDGED, not silently absorbed):** under `pathDrivenOnly` + `serialise: true`, a **non-configured circular reference** is now preserved by identity in the structured output, so `JSON.stringify` will **throw** where the old engine emitted a marker. No re-neutralisation was added to the redaction traversal; re-neutralisation for serialise output is deferred to **Story 8.3** (which does not yet exist as an implementation artifact) — this is a release-sequencing dependency and must be surfaced in the PR/release notes. Recorded in the contract doc (`docs/architecture/rule-driven-traversal.md` → "Serialise Mode Is An Interim Exception").
- **Additional documented consequences of "non-configured positions are never visited":** (a) a throwing getter / hostile proxy at a **non-configured** position is now preserved by reference rather than degraded to `[UNSUPPORTED]` (three `create-redactor.test.ts` diagnostics tests rewritten to the new contract); (b) structured **diagnostic event order** now follows rule-configuration order rather than payload-key order (event *content* unchanged) — both added to the contract doc. A non-configured hostile breadth/depth is never traversed and so never trips `maxNodes`/`maxDepth`, consistent with AC 12 (the security suite uses key rules → unchanged general traversal → no regression).
- **Benchmark gate change (per Ben's instruction):** the path-based AC-9 gate was switched from the fast-redact competitor to deep-redact v3. The fast-redact `path-based-single-object-node24` manifest row and its artefact were retired; the existing `path-based-single-object-v3-node24` row now serves as the path-based gate (threshold -100%–0%, i.e. v4 must not regress against v3). `benchmark-manifest.test.ts` updated to require a deep-redact-v3 path-based gate row.

### File List

- `src/core/runtime/navigate-exact-paths.ts` (new — rule-driven engine)
- `src/core/runtime/fast-lane.ts` (deleted)
- `src/core/runtime/redact-value.ts` (export `isPlainObject`, `isTraversableContainer`, `setObjectEntry`)
- `src/core/create-redactor.ts` (wire `buildPathDrivenExecutor`; `pathDrivenOnly` selection)
- `src/core/compiler/compile-redactor-plan.ts` (`isExactPathOnly → pathDrivenOnly` rename + comment)
- `dist/index.js` (rebuilt artefact)
- `test/contract/api/rule-driven-traversal-contract.test.ts` (activate two contract tests; remove two baselines)
- `test/contract/api/create-redactor.test.ts` (migrate to `pathDrivenOnly`/`buildPathDrivenExecutor`; rewrite delegation-proof + non-configured diagnostics tests to new contract)
- `test/fixtures/exact-path-equivalence/index.ts` (rewire `'fast'` lane to the engine; add `shared-ancestor-copy` entry)
- `test/unit/core/fast-lane.test.ts` (deleted)
- `test/security/traversal-safety.test.ts` (stale comment)
- `test/bench/manifest.json` (retire fast-redact path-based row; v3 row is the path-based gate)
- `test/contract/benchmarks/benchmark-manifest.test.ts` (require deep-redact-v3 path-based gate row)
- `test/artefacts/benchmarks/path-based-single-object-v3-node24.json`, `…-json-stringify-regex-node24.json` (regenerated); `…-node24.json` (deleted, fast-redact row retired)
- `docs/benchmarks/results.md` (regenerated, lockstep)
- `docs/architecture/rule-driven-traversal.md` (add serialise-mode interim exception + diagnostic-ordering notes)

### Change Log

- Implemented the rule-driven exact-path navigation engine (trie-guided O(P) traversal, shared-ancestor copy map, `retainStructure` leaf descent, prototype-pollution delegation) and wired it via the renamed `pathDrivenOnly` flag.
- Removed the Story 7.1 compiled path executor (`fast-lane.ts`) and migrated all consumers/tests to the rule-driven engine.
- Activated the two Story 8.1 behaviour-change contract tests (non-configured `Date`/circular preserved by identity) and retired their baseline counterparts.
- **Known interim consequence (AC 11):** `pathDrivenOnly` + `serialise: true` over a non-configured circular reference now throws at `JSON.stringify`; re-neutralisation is deferred to Story 8.3 — flagged as a release-sequencing dependency, not silently absorbed under AC 8.
- Switched the path-based benchmark gate from fast-redact to deep-redact v3 (per request); v4 runs ~96% faster than v3 on the path-based workload.

### Review Findings

- [x] [Review][Defer] `resolveRetainTerminal` first-wins alias behaviour [src/core/runtime/navigate-exact-paths.ts:421] — deferred; fix is to detect conflicting configuration patterns (incl. this case and others where runtime aliasing could silently discard rules) and throw at `createRedactor` initialisation. Runtime must remain error-free except for `BudgetExceededError`. Tracked in deferred-work.md.
- [x] [Review][Dismiss] BigInt root returns unchanged — intentional under the "non-configured positions are never visited" contract. A BigInt root has no addressable properties; no path rule can target it. The old delegation was a fast-lane implementation artefact, not a product contract. Story 8.3 will handle BigInt transformation for `serialise: true` via the serialise-only output adapter; `serialise: false` leaves it raw by identity per the Epic 8 contract. Pinning test added as a patch item below.
- [x] [Review][Patch] AC 9 benchmark gate spec updated to reflect v3 gate — AC 9 rewritten to reference `path-based-single-object-v3-node24` (deep-redact v3 comparator, threshold `-100%–0%`). Spec now matches the artefacts and manifest actually shipped.
- [x] [Review][Patch] Add pinning test for BigInt root under path-driven executor [test/contract/api/rule-driven-traversal-contract.test.ts] — Added contract test: `redact(42n)` with path rules returns `42n` unchanged. 535 tests pass.
- [x] [Review][Patch] Aliased array compaction applies original-source indices to an already-compacted copy [src/core/runtime/navigate-exact-paths.ts:665] — Fixed: added `compactedArrayCopies: Set<object>` threaded through `navigateNode`. Compaction is guarded with `!compactedArrayCopies.has(copy)`; after compaction the copy is added to the set. A second trie branch reaching the same aliased array skips re-compaction.
- [x] [Review][Patch] AC 12 — traversal budget enforced in `redactRetained` retain subtree walk [src/core/runtime/navigate-exact-paths.ts] — Fixed: `redactRetained` now accepts a `TraversalBudget`, increments `depth` on entry (try/finally decrement) and `nodesVisited` per value, throwing `BudgetExceededError` when either limit is exceeded. `buildPathDrivenExecutor` re-throws budget errors instead of delegating to fallback.
