# Story 8.1: Establish Rule-Driven Traversal Contract and Document Behaviour Changes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the rule-driven traversal contract to be defined and the relevant behaviour changes to be explicitly documented and test-covered before implementation begins,
so that the design decision is intentional and verifiable, not incidental.

## Context

Epic 8 replaces the O(N) payload-walk with a **rule-driven engine** that navigates directly to configured targets: O(P) for exact paths (P = total path segments across all rules), O(P + Σ K_at_wildcard_levels) for single-wildcard paths. The Story 7.1 compiled path executor (the current fast lane, `src/core/runtime/fast-lane.ts`) is superseded and will be removed in Story 8.2.

**This is the first story of Epic 8 and is deliberately implementation-free.** It establishes the *contract* (a normative doc), pins it down with *named contract tests*, and *documents the behaviour change* that the rule-driven engine introduces — all **before** any runtime engine is written. The runtime engine arrives in Stories 8.2 (exact-path navigation), 8.4 (`*`), 8.5 (`**` + key rules), and 8.6 (substring + finalisation); Story 8.3 moves transformer/circular handling into a serialise-only output adapter.

**The behaviour change — and why it matters for this story:**

The rule-driven engine inverts the outer loop. Instead of visiting every node and asking "which rule matches?", it iterates rules and navigates to what each targets. **Non-configured positions are never visited.** A consequence: a transformable runtime value (`Date`, `BigInt`, `Map`, `Set`, `Error`, `RegExp`, `URL`) sitting at a position no rule targets is left **unchanged** in the output.

This differs from **today's observable behaviour**. For an exact-path-only config (`paths: [...]`, no keys/stringTests/fuzzy), `deepRedact` currently selects the fast lane (`plan.isExactPathOnly === true`, [src/core/create-redactor.ts:31](src/core/create-redactor.ts#L31)). The current fast lane *visits every plain object/array, even unmatched ones* ([fast-lane.ts:256-267](src/core/runtime/fast-lane.ts#L256-L267)). When it encounters a stray transformable value at a non-configured position, `requiresDelegation()` returns `true` and it returns the `delegate` sentinel ([fast-lane.ts:339-342, 415-418](src/core/runtime/fast-lane.ts#L339-L342)), causing the **whole call to fall back to the general traversal** — which transforms *every* transformable value it meets, regardless of targeting. So **today a non-configured `Date` is transformed; under the rule-driven engine it will pass through untouched.**

Because v4 has not been publicly released, this is an acceptable, intentional design decision (epics.md §Epic 8 "Key design decision", line 2399). The point of this story is to make it **explicit and verifiable** rather than letting it slip in silently as a side effect of 8.2.

**Implication for the contract tests (read carefully — this is the core design subtlety):**

The 8 enumerated contract-test cases split into two groups against the **current** engine:

- **Invariant cases (6) — green now, locked baseline.** Cases that the current fast lane *and* the future rule-driven engine produce identically: exact path exists, intermediate-key-absent, terminal-key-absent, non-plain root prototype (delegates), non-plain intermediate prototype (delegates), circular reference at a configured terminal (censor wins, no descent). These assert the observable output of public `deepRedact(...)` and **pass today**. They become the regression baseline that Stories 8.2–8.6 must preserve.
- **Behaviour-change cases (2) — pending, activated by 8.2.** Cases whose *current* output differs from the *target* rule-driven contract: (a) a transformable value at a non-configured sibling position (today: transformed via delegation; target: passes through unchanged), and (b) a circular reference at a non-configured position (today: fast lane recurses → stack overflow → delegates → general traversal emits a circular marker; target: never visited → raw reference preserved in output). These are written as **skipped tests carrying the full target assertion**, each named to state the contract and tagged with `// Activated by Story 8.2` so the contract is recorded in test form without a runtime change in this story.

This split — green invariants vs. skipped behaviour-change tests — is the deliverable. Do **not** make the behaviour-change tests pass by editing runtime code; that work belongs to Story 8.2.

**Environment bootstrap:** `source .agents/initialise-env.sh` before any `pnpm run` command.

## Acceptance Criteria

**Traversal contract document**

1. **Given** a new normative document `docs/architecture/rule-driven-traversal.md`
   **When** it is reviewed
   **Then** it states that the engine's outer loop iterates **configured rules**, not payload nodes, navigating to targeted positions via each rule's path segments
   **And** it states that positions not covered by any rule are not visited during navigation (only during key iteration at wildcard levels)
   **And** it records the cost model: O(P) for an exact-path-only configuration (P = total path segments across all configured paths), and O(P + Σ K_at_wildcard_levels) for configurations containing single-level `*` segments
   **And** it identifies that the rule-driven engine supersedes the Story 7.1 compiled path executor (removed in Story 8.2)
   **And** the document is hand-authored prose (it is NOT one of the generated docs guarded by [scripts/verify-generated-files.ts](scripts/verify-generated-files.ts) — do not add a generation script or a verify entry for it)

**Non-configured position behaviour (documented behaviour change)**

2. **Given** the same document
   **When** the behaviour-change section is reviewed
   **Then** it explicitly documents that a transformable runtime value (`Date`, `BigInt`, `Map`, `Set`, `Error`, `RegExp`, `URL`) at a position **not** covered by any configured rule appears **unchanged** in the returned output — neither transformed, redacted, nor delegated
   **And** it states this is a behaviour change from the current general traversal, which transforms every transformable value it encounters regardless of targeting configuration
   **And** it explains the equivalent change for circular references at non-configured positions (raw reference preserved, not replaced by a circular marker)
   **And** it states that a configuration which genuinely needs all transformable values transformed can express that via key-based or wildcard-path rules, which route to the O(N) traversal mode

**Contract test coverage**

3. **Given** a new contract test file `test/contract/api/rule-driven-traversal-contract.test.ts`
   **When** the suite is executed
   **Then** it covers all of the following cases, each as a named `it(...)`/`it.skip(...)`:
   - an exact path that exists in the payload → terminal redacted (**active, green**)
   - an exact path whose intermediate key is absent → path silently skipped, remainder unaffected (**active, green**)
   - an exact path whose terminal key is absent → path silently skipped, remainder unaffected (**active, green**)
   - a transformable value at a non-configured sibling position → **target**: value passes through unchanged (**skipped, `// Activated by Story 8.2`**)
   - a root container with a non-plain prototype → delegates; output equals input unchanged (prototype pollution guard) (**active, green**)
   - an intermediate container in a configured path with a non-plain prototype → delegates; configured terminal not redacted (prototype pollution guard) (**active, green**)
   - a circular reference at a configured terminal position → censor applied, no descent, no throw (**active, green**)
   - a circular reference at a non-configured position → **target**: never visited, raw reference preserved in output (**skipped, `// Activated by Story 8.2`**)

4. **Given** the two skipped behaviour-change tests
   **When** they are inspected
   **Then** each contains the **complete target assertion body** (asserting the rule-driven contract, e.g. `expect(output.when).toBeInstanceOf(Date)` and `expect(output.when).toBe(payload.when)`), not an empty `it.todo`
   **And** each is named to state the contract it pins (e.g. `'leaves a non-configured Date unchanged in the output (rule-driven contract)'`)
   **And** a sibling **active** test documents the *current* observable behaviour for the same fixture (e.g. asserts the non-configured `Date` is currently transformed: `expect(output.when).not.toBeInstanceOf(Date)`), so the intentional flip in Story 8.2 is captured as a baseline rather than an undocumented change

**No runtime change / scope guard**

5. **Given** this story's diff
   **When** it is reviewed
   **Then** it touches only: the new contract document, the new contract test file, and (if needed) a docs index/reference — **no changes to any file under `src/`**
   **And** `src/core/runtime/fast-lane.ts`, `src/core/runtime/redact-value.ts`, `src/core/create-redactor.ts`, and `src/core/compiler/compile-redactor-plan.ts` are unchanged
   **And** exact-path navigation implementation remains deferred to Story 8.2; `*` to 8.4; `**`/key rules to 8.5; substring to 8.6 (the serialise-only output adapter is Story 8.3)

**Suite integrity**

6. **Given** the full test suite
   **When** `source .agents/initialise-env.sh && pnpm run test` runs
   **Then** all previously passing tests still pass (zero regressions)
   **And** the 6 active rule-driven contract tests pass
   **And** the 2 behaviour-change tests are reported as skipped (not failing, not silently absent)

## Tasks / Subtasks

- [x] **Task 1 — Author the normative contract document** (AC: 1, 2)
  - [x] Create `docs/architecture/rule-driven-traversal.md` as hand-authored prose. Do NOT add a header comment claiming it is generated, do NOT add a generation script, and do NOT add an entry to [scripts/verify-generated-files.ts](scripts/verify-generated-files.ts). That script guards a fixed set of *generated* artifacts (`package.json`, `README.md`, both migration guides, the example docs, the standardisation guide, and — within `docs/architecture/` — only `precedence.md` and `one-way-redaction.md`); `rule-driven-traversal.md` is deliberately hand-authored and must stay outside that set. Adding it there would create a phantom lockstep target with no generator and break the build.
  - [x] Match the tone of the existing normative contracts ([docs/architecture/precedence.md](docs/architecture/precedence.md), [docs/architecture/one-way-redaction.md](docs/architecture/one-way-redaction.md)): formal, declarative, `##`/`###` headings, invariants stated plainly, worked examples where useful. British English ("behaviour", "initialise", "artefact").
  - [x] Section: **Traversal contract** — outer loop iterates rules not nodes; navigation via path segments; non-configured positions not visited; cost model O(P) and O(P + Σ K_at_wildcard_levels); supersedes the Story 7.1 compiled path executor (removed in 8.2).
  - [x] Section: **Documented behaviour change** — non-configured transformable values pass through unchanged (list `Date`, `BigInt`, `Map`, `Set`, `Error`, `RegExp`, `URL`); contrast with current general traversal; the circular-reference-at-non-configured-position consequence (raw reference, not circular marker); escape hatch (use key/wildcard rules to force O(N) transformation).
  - [x] Section: **Traversal mode boundary (forward reference)** — note that `pathDrivenOnly` will gate rule-driven vs O(N) (finalised in Stories 8.5/8.6); this story documents the contract, not the flag.

- [x] **Task 2 — Create the contract test file with the 6 invariant (green) cases** (AC: 3, 6)
  - [x] Create `test/contract/api/rule-driven-traversal-contract.test.ts`. It is auto-included by the `test:contract` glob (`test/contract/**/*.test.ts`) — no `package.json`, `vitest.config.ts`, or `tsconfig.json` change is needed.
  - [x] Use the project test idiom: `import { describe, expect, it } from 'vitest'`, `import { deepRedact } from '../../../src/index.js'` (note the `.js` extension; `deepRedact` is a named export). Assert via `toStrictEqual` for structure and `toBe` for identity/string equality.
  - [x] Construct redactors with the **public API** only (`deepRedact({ paths: [...] })`) so the tests pin observable behaviour, not internal lane wiring.
  - [x] Implement the 6 active cases listed in AC 3 / AC 4. For the non-plain root case, redact a payload that *is* a non-plain container (e.g. `Object.create({ poisoned: true })` with own enumerable data) and assert output equals input unchanged. For the non-plain intermediate case, build `{ a: <non-plain object> }` (e.g. `a = Object.assign(Object.create({ proto: 1 }), { b: 'secret' })`) with config `paths: ['a.b']` and assert `a.b` is NOT redacted (the path delegates and the non-plain `a` is not traversed). For the circular-terminal case build `const o = {}; o.self = o;` with config `paths: ['self']` — the **default** redaction already applies the censor at the terminal before any descent, so no custom censor function is required; assert `output.self` is the censor string and the call does not throw.

- [x] **Task 3 — Add the 2 behaviour-change cases as skipped + current-behaviour baseline** (AC: 3, 4, 6)
  - [x] Case (a) non-configured transformable: fixture `{ user: { password: 'x' }, when: new Date('2020-01-01T00:00:00.000Z') }`, config `{ paths: ['user.password'] }`.
    - [x] Active test: documents **current** behaviour — `expect(output.when).not.toBeInstanceOf(Date)` (today the fast lane delegates and the general traversal transforms it). Keep the assertion robust to the exact transformer shape (assert "is no longer a Date instance" rather than a specific serialised form).
    - [x] Skipped test (`it.skip(...)`, `// Activated by Story 8.2`): asserts **target** contract — `expect(output.when).toBeInstanceOf(Date)` and `expect(output.when).toBe(payload.when)`; assert `user.password` is still redacted.
  - [x] Case (b) non-configured circular reference: use a **flat top-level** non-configured sibling so the identity assertion is unambiguous. Fixture: `const loop = {}; loop.self = loop; const payload = { user: { password: 'x' }, loop };`, config `{ paths: ['user.password'] }`.
    - [x] Active test: documents **current** behaviour — the call completes (the fast lane recurses into `loop`, overflows, is caught, and delegates; the general traversal replaces the circular position with a circular marker). Assert `expect(() => redact(payload)).not.toThrow()`, that `user.password` is redacted, and that `output.loop` is NOT the raw reference (`expect(output.loop).not.toBe(payload.loop)`).
    - [x] Skipped test (`it.skip(...)`, `// Activated by Story 8.2`): asserts **target** contract — the non-configured `loop` is copied by reference into the new root, so `expect(output.loop).toBe(payload.loop)`, and `user.password` is redacted.
  - [x] Confirm both skipped tests appear as `skipped` in the verbose reporter output (not `todo`, not absent).

- [x] **Task 4 — Verify scope and suite** (AC: 5, 6)
  - [x] Confirm `git status` shows changes only under `docs/` and `test/` — nothing under `src/`.
  - [x] `source .agents/initialise-env.sh && pnpm run test` — confirm zero regressions, the 6 active tests pass, the 2 behaviour-change tests are skipped.
  - [x] If a docs index exists that enumerates `docs/architecture/*`, add a reference to the new doc; if none exists, do not create one.

## Dev Notes

### What this story is — and is NOT

- **IS:** a normative contract document + named contract tests + behaviour-change documentation. Zero `src/` changes.
- **IS NOT:** the rule-driven engine. No navigation code, no `pathDrivenOnly` flag, no fast-lane removal. Those are Stories 8.2–8.6. Resist any urge to "just make the skipped tests pass" — flipping that behaviour is Story 8.2's defining deliverable and its benchmark/equivalence gates depend on doing it there.

### Current engine wiring (for accurate documentation and baseline assertions)

- Lane selection: [src/core/create-redactor.ts:31-33](src/core/create-redactor.ts#L31-L33) — `plan.isExactPathOnly ? buildFastLaneExecutor(plan, generalTraversal) : generalTraversal`.
- Candidacy flag computation: [src/core/compiler/compile-redactor-plan.ts:336-342](src/core/compiler/compile-redactor-plan.ts#L336-L342) — true only when paths are all exact, with no dynamic path rules, no key/regex-key/substring rules, no `fuzzyKeyMatch`, and `caseSensitiveKeyMatch !== false`.
- Fast lane visits **all** plain containers and delegates on stray transformables: [fast-lane.ts:256-267](src/core/runtime/fast-lane.ts#L256-L267), `requiresDelegation` [fast-lane.ts:252-254](src/core/runtime/fast-lane.ts#L252-L254), delegation sites [fast-lane.ts:339-342](src/core/runtime/fast-lane.ts#L339-L342) and [fast-lane.ts:415-418](src/core/runtime/fast-lane.ts#L415-L418), root delegation [fast-lane.ts:431-456](src/core/runtime/fast-lane.ts#L431-L456).
- General traversal (the delegation target) transforms every supported value it meets: see `transformSupportedRuntimeValue` / `transformNode` in [src/core/runtime/redact-value.ts:1337-1494](src/core/runtime/redact-value.ts#L1337-L1494). Circular references become a marker `{ _transformer: 'circular', path, value }` ([redact-value.ts:339-348](src/core/runtime/redact-value.ts#L339-L348)).

> Keep baseline assertions **shape-agnostic** where possible (assert "not a Date instance" / "did not throw" / "terminal redacted") rather than asserting the exact transformer payload — the transformer output shape is owned by Epic 3 and must not be coupled to this contract test.

### Why the two behaviour-change tests cannot pass today

| Case | Current engine (fast lane → delegates → general traversal) | Rule-driven target (Story 8.2+) |
|------|------------------------------------------------------------|--------------------------------|
| Non-configured `Date`/`BigInt`/… | Detected by `requiresDelegation`, whole call delegates, general traversal **transforms** it | Position never visited → value **unchanged** |
| Non-configured circular ref | Fast lane recurses → stack overflow → `catch` delegates → general traversal emits **circular marker** | Position never visited → **raw reference** preserved |

Making either pass requires the rule-driven navigation engine, which is Story 8.2. Hence: skipped tests with full target assertions, plus active baseline tests documenting today's output.

### File conventions

- British English in prose/comments. `kebab-case` filenames, `camelCase` identifiers.
- Tests: `vitest`; `describe`/`it`; `toStrictEqual` (not `toEqual`); `.js` import extensions; `deepRedact` is a **named** export from `src/index.ts`.
- The repo has two pre-existing legacy red tests (`test/unit/index.test.ts`, `test/load/redact.test.ts`) noted in prior stories — they are expected and unrelated; do not count them as regressions (run the `test:contract` gate, which is the authoritative suite).

### Project Structure Notes

- New doc lives beside existing contracts: `docs/architecture/rule-driven-traversal.md`. Existing peers: `precedence.md`, `one-way-redaction.md`.
- New test lives in the api contract group: `test/contract/api/rule-driven-traversal-contract.test.ts` (the only existing file there is `create-redactor.test.ts`).
- No conflict with the generated-docs lockstep: within `docs/architecture/`, [scripts/verify-generated-files.ts](scripts/verify-generated-files.ts) guards only the generated `precedence.md` and `one-way-redaction.md` (it also guards generated files elsewhere — migration guides, example docs, standardisation guide — none in this directory). This doc is intentionally hand-authored and outside that set.

### References

- Epic 8 overview & "Key design decision": [_bmad-output/planning-artifacts/epics.md §Epic 8, lines 2393-2399]
- Story 8.1 acceptance criteria: [_bmad-output/planning-artifacts/epics.md §Story 8.1, lines 2401-2444]
- Story 8.2 (exact-path navigation; fast-lane deprecation; activates the skipped tests): [_bmad-output/planning-artifacts/epics.md §Story 8.2, lines 2446-2512]
- Epic 7 audit note (7.1 superseded by 8.2): [_bmad-output/planning-artifacts/epics.md lines 2154-2162]
- PRD performance status & Epic 8 rationale: [_bmad-output/planning-artifacts/prd.md lines 384, 463]
- Path grammar & selector contract: [_bmad-output/planning-artifacts/architecture.md §Path Grammar & Selector Contract, lines 205-345]
- Current fast lane: [src/core/runtime/fast-lane.ts]
- Current general traversal: [src/core/runtime/redact-value.ts]
- Lane selection: [src/core/create-redactor.ts]
- Compiled plan & candidacy flag: [src/core/compiler/compile-redactor-plan.ts]
- Existing normative contract docs (tone reference): [docs/architecture/precedence.md], [docs/architecture/one-way-redaction.md]
- Equivalence corpus / lane-forcing helpers (for 8.2, not required here): [test/fixtures/exact-path-equivalence/index.ts]
- Generated-docs lockstep (do not extend): [scripts/verify-generated-files.ts]
- Prior story patterns (security corpus / test idiom): [_bmad-output/implementation-artifacts/7-4-enforce-traversal-safety-limits-and-validate-hostile-input-protection.md]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8, 1M context)

### Debug Log References

- Empirically probed all six tricky current-engine behaviours with a throwaway
  `test/contract/api/_scratch-probe.test.ts` (since removed) before committing
  any assertions. Observed outcomes:
  - Non-plain root → `output === payload` (same reference), configured terminal
    NOT redacted (`secret` stayed `'value'`). Drives the `toBe(payload)` assertion.
  - Non-plain intermediate (`paths: ['a.b']`) → `a.b` stayed `'secret'`
    (unredacted); whole payload returned by reference.
  - Circular terminal (`paths: ['self']`) → `output.self === '[REDACTED]'`, no throw.
  - Non-configured `Date` → transformed to a `{ _transformer: 'date', … }` marker
    (no longer a `Date` instance); configured `user.password` still redacted.
  - Non-configured circular ref → `output.loop !== payload.loop` (circular marker);
    `user.password` redacted; no throw.
- New file alone: `vitest run … rule-driven-traversal-contract.test.ts` →
  **8 passed | 2 skipped (10)**; both target tests reported with `↓` (skipped),
  not `todo`, not absent.
- Full authoritative gate `pnpm run test` (build + `test:contract`) →
  **531 passed | 2 skipped**, with a single failure in
  `test/contract/benchmarks/benchmark-artefacts.test.ts`. That test re-runs live
  timing benchmarks and diffs rendered overhead numbers against a committed doc;
  re-running it twice in a row produced different numbers each time
  (e.g. overhead 123.42% → 110.99%, 986.43% → 2057.92%). It references nothing in
  this story's additive doc/test files and is a pre-existing environmental timing
  flake, not a regression introduced here.

### Completion Notes List

- Implementation-free story as specified: **zero `src/` changes**. Added one
  hand-authored normative doc and one contract test file only.
- `docs/architecture/rule-driven-traversal.md` authored as hand-authored prose
  (no generated-file header, no generation script, no `verify-generated-files.ts`
  entry) — kept deliberately outside the generated-docs lockstep set.
- 6 invariant (green) contract cases pass against the current engine and form the
  regression baseline for Stories 8.2–8.6.
- 2 behaviour-change cases each carry: an **active** test pinning today's
  observable behaviour, plus a **skipped** (`it.skip`, `// Activated by Story 8.2`)
  test carrying the complete target rule-driven assertion. The intentional flip is
  thus recorded in test form without any runtime change.
- Baseline assertions kept shape-agnostic (e.g. "no longer a `Date` instance",
  "did not throw", "not the raw reference") so they are not coupled to the
  Epic 3-owned transformer output shape.
- No docs index enumerating `docs/architecture/*` exists, so none was created
  (per Task 4).

### File List

- `docs/architecture/rule-driven-traversal.md` (new — normative contract document)
- `test/contract/api/rule-driven-traversal-contract.test.ts` (new — contract tests:
  6 active invariant cases + 2 active current-behaviour baselines + 2 skipped
  target-contract tests)

### Change Log

- 2026-05-30 — Story 8.1 implemented: added the rule-driven traversal normative
  contract document and the named contract test file (6 invariant green cases,
  2 behaviour-change baselines, 2 skipped target tests activated by Story 8.2).
  No `src/` changes. Status: ready-for-dev → review.

## Review Findings

_Code review 2026-05-30 (adversarial three-layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor). All 6 ACs audited as PASS; findings below are doc-accuracy/consistency and test-strength items, no AC failures and no `src/` regressions._

- [x] [Review][Patch] **(fixed in review)** Wildcard mode-ownership contradiction in `rule-driven-traversal.md` — The **Traversal Contract** + **Cost Model** sections present single-level `*` as handled *by the rule-driven engine* (`O(P + Σ K_at_wildcard_levels)`), while the **Escape Hatch** and **Traversal Mode Boundary** sections wrongly lump `*`/`**` into "route to the `O(N)` general traversal". **Resolved (party-mode review 2026-05-30, Option 1):** single-level `*` IS rule-driven (`O(P + Σ K)`); only **key-based, substring, and `**` (pending Story 8.4)** rules route to the O(N) breadth-visiting mode. Grounded in [epics.md:2395](_bmad-output/planning-artifacts/epics.md#L2395) (`*` is O(P + Σ K)), [epics.md:2397](_bmad-output/planning-artifacts/epics.md#L2397) (O(N) reserved for key/substring), [epics.md:2514](_bmad-output/planning-artifacts/epics.md#L2514) (Story 8.3 extends the *rule-driven engine* for `*`), and this story's AC 1. Routing `*` to O(N) was rejected as a pessimisation (walks all N to avoid enumerating Σ K ⊆ N). **Fix:** correct the Escape Hatch / Mode Boundary wording so single-`*` reads as rule-driven and only key/substring/`**` route to O(N); the Cost Model and Traversal Contract sections are already correct. [docs/architecture/rule-driven-traversal.md:104-118] (source: edge)
- [x] [Review][Patch] **(fixed in review)** Circular-marker prose imprecise — doc says the general traversal "replaced **the offending position** with a circular marker" but verified runtime output for `loop={self:loop}` is `output.loop === { self: { _transformer:'circular', path:'loop.self', value:'loop' } }`: `loop` is rebuilt as a fresh object and the marker sits one level deeper at the back-edge child `loop.self`, not at `loop` itself. Reword to be accurate. [docs/architecture/rule-driven-traversal.md:82-88] (source: edge)
- [x] [Review][Patch] **(fixed in review)** Strengthen intermediate-prototype test — `it('delegates an intermediate container with a non-plain prototype …')` asserts only `output.a.b === 'secret'`, which passes both for the intended reason (delegated, `a` left intact) and for an unrelated "redaction never targeted `a.b`" reason. Add an identity assertion `expect(output.a).toBe(a)` to prove the non-plain container was passed through untraversed. [test/contract/api/rule-driven-traversal-contract.test.ts:65-75] (source: edge)
- [x] [Review][Defer] Preserved cycles risk downstream `JSON.stringify` throws [docs/architecture/rule-driven-traversal.md:86-88] — deferred, 8.2 design consideration (the target contract preserves raw circular refs by identity; a common next step `JSON.stringify(output)` will now throw where the old engine neutralised the cycle). Intentional v4 pre-release decision; flag for Story 8.2's design/migration notes, not actionable in this contract-only story. (source: blind)
- [x] [Review][Defer] Non-plain-prototype delegation silently leaves a configured terminal unredacted, undocumented [docs/architecture/rule-driven-traversal.md] — deferred, out of scope. Two active tests pin that a non-plain root/intermediate container delegates and the configured `secret`/`a.b` is NOT redacted (prototype-pollution guard). This is correct, intended behaviour but the new contract doc does not mention the delegation path. Reasonable doc enhancement for a future prototype-handling contract; not required by Story 8.1's ACs. (source: blind+edge)
