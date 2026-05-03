# Story 2.1: Apply Literal Replacement, Removal, and Retain-Structure Handling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want matched targets to support literal replacement, removal, and structure retention with explicit fallback rules,
so that redacted output preserves only the safe context I still need for logs and diagnostics.

## Acceptance Criteria

1. Given a matched scalar target with no local override and no explicit global `censor` configured, when redaction runs, then the library default censor fallback is applied, and the matched value is replaced with `[REDACTED]`.
2. Given a matched target with a global literal `censor` configured and no local override, when redaction runs, then the global censor value is applied to that matched target.
3. Given a matched target with a local literal `censor` override, when redaction runs, then the matched value is replaced with that literal override, only the matched value is altered, and sibling values remain unchanged.
4. Given a matched object-property target with `remove: true`, when redaction runs, then the targeted property is omitted from the returned result, no placeholder value is emitted for that property, and sibling values remain unchanged.
5. Given a matched array-item target with `remove: true`, when redaction runs, then the targeted item is omitted from the returned array, remaining item order is preserved, and unrelated sparse holes continue to behave like Story `1.4`.
6. Given a matched container target with `retainStructure: true`, when redaction runs, then the matched container remains present in the returned result, descendants inside that retained subtree are redacted according to the resolved policy unless a more-specific child path rule applies, and the surrounding parent shape is preserved.
7. Given an exact-key or regex-key target with a global `censor`, `remove`, or `retainStructure` policy configured, when redaction runs, then that compiled global policy applies to the matched key because key rules have no local override surface in the current public API.
8. Given a local matched-rule override and a broader global default both apply to the same target, when redaction runs, then the local override takes precedence for that matched rule only, any unset local option falls back first to the compiled global default, and any still-unset option then falls back to the library default.
9. Given a configuration combines `remove` with `censor` or `retainStructure` at the global level or within a per-path rule, when the factory initialises, then initialisation fails immediately with a validation error, and no redactor is created.
10. Given a payload containing both targeted and non-targeted branches, when redaction runs, then only the targeted value or branch is altered, and unrelated siblings and branches remain unchanged.
11. Given the wider Epic `2` feature set, when this story is implemented, then function-censor context, same-length replacement, substring targeting, root-primitive targeting, fuzzy matching, and case-insensitive key matching remain out of scope for Story `2.1`.

## Tasks / Subtasks

- [x] Formalise whole-value literal redaction semantics without changing the public surface (AC: 1, 2, 3, 7, 8, 10, 11)
  - [x] Keep `censor`, `remove`, and `retainStructure` as the only v4 replacement controls on [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts), [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts), and [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts).
  - [x] Preserve the current `Censor` union in [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts). Do not narrow away existing function support, but do not expand its runtime contract in this story.
  - [x] Keep [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) as the single whole-value redaction seam unless a refactor is proven necessary by failing tests.
  - [x] Extend [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts) only as needed to prove global defaults are compiled once and local path overrides shadow only the matched rule.

- [x] Prove positive literal `censor` behaviour in the green contract suite (AC: 1, 2, 3, 7, 8, 10)
  - [x] Add contract tests in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) showing the library default `[REDACTED]` fallback applies when no explicit global `censor` is configured.
  - [x] Add contract tests showing a global literal `censor` applies to exact-key, regex-key, exact-path, and dynamic-path matches that do not define a local override.
  - [x] Add contract tests showing a local path-rule `censor` override beats a broader global literal default and alters only the matched target.
  - [x] Add at least one retained-parent plus more-specific-child case that proves a child path-rule override still wins at the deeper matched leaf while the inherited retained parent policy continues to redact the rest of that matched subtree.

- [x] Preserve explicit removal semantics for objects and arrays without relying on serialiser quirks (AC: 4, 5, 8, 9, 10)
  - [x] Keep removal represented internally by `removedValue` in [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) or a functionally equivalent sentinel. Do not reimplement removal by setting `undefined` and depending on `JSON.stringify`.
  - [x] Preserve object-property omission in `transformObject` and array compaction in `transformArray` inside [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts).
  - [x] Add contract coverage for object-property removal through exact-key, regex-key, exact-path, and dynamic-path matches, proving siblings remain unchanged and the caller-owned payload is not mutated.
  - [x] Add contract coverage for array-item removal through exact and dynamic path rules, proving removed items are compacted out of the returned array, remaining item order is preserved, and non-targeted sparse holes still behave like Story `1.4`.

- [x] Formalise `retainStructure` traversal behaviour without broadening scope (AC: 6, 7, 8, 10, 11)
  - [x] Add contract coverage showing a matched container with `retainStructure: true` stays present while descendant values in the retained subtree are redacted with the resolved literal censor policy.
  - [x] Add contract coverage for both path-driven and key-driven retained-structure entry points already supported by the current v4 runtime, proving exact-key and regex-key matches inherit the compiled global policy with no local override surface.
  - [x] Prove non-targeted siblings and ancestor shape remain unchanged.
  - [x] Keep this story within the out-of-scope boundary in AC `11`.

- [x] Keep validation, precedence, and brownfield boundaries intact (AC: 7, 8, 9, 10, 11)
  - [x] Preserve initialisation failures for `remove + censor` and `remove + retainStructure` in [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts), including inherited-default cases where the conflict only appears after global defaults are merged into a path rule.
  - [x] Preserve the existing precedence ladder in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts): exact path > dynamic path > inherited path policy > exact key > regex key.
  - [x] Do not start the later Story `2.5` cross-target precedence work for substring rules in this story.
  - [x] Keep v4 implementation work in `src/core/**`, `src/types/**`, and `test/**`. Do not revive `DeepRedact`, `blacklistedKeys`, `replacement`, or `serialize` through the retained legacy modules under `src/utils/**` and [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts).

- [x] Verify within the current contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] Run `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose` while iterating on the story.
  - [x] If unit coverage changes outside the default green suite, run the affected Vitest files explicitly and record the command in the implementation notes.
  - [x] Run `pnpm run generate` if public type exports, generated README inputs, or generated export metadata change.
  - [x] Run `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase` under Node `24.14.1`, and record any retained red-phase failures separately from the green contract status.

### Review Findings

- [x] [Review][Patch] Removal assertions allow `undefined` object-property placeholders [test/contract/api/create-redactor.test.ts:672]
- [x] [Review][Patch] Retained-structure tests do not prove caller-owned payloads remain unchanged [test/contract/api/create-redactor.test.ts:805]

## Dev Notes

### Story Intent

- Story `2.1` opens Epic `2` by formalising precise replacement behaviour across the selector surface already established in Epic `1`.
- The current v4 codebase already contains compile-time defaults, per-path policy merging, a removal sentinel, and retained-structure traversal branches. The intent here is to tighten the public contract and close behavioural test gaps, not to redesign the runtime.
- This story is limited to whole-value literal replacement, omission, and retained-structure traversal. Later Epic `2` capabilities remain out of scope here.
- Epic `1` already established exact and dynamic path matching, regex key matching, and the current precedence ladder. Story `2.1` must preserve those contracts while extending the positive behavioural coverage for replacement semantics.

### Technical Requirements

- The library default censor fallback remains `[REDACTED]` when neither a local path-rule override nor a compiled global `censor` is present.
- Path rules may override global defaults with literal `censor`, `remove`, and `retainStructure` settings.
- Exact-key and regex-key matches have no per-key override surface in the current public API. They always use the compiled global policy for `censor`, `remove`, and `retainStructure`.
- Removal semantics must omit object properties and compact removed array elements in the returned structured output.
- `retainStructure: true` on a matched container keeps that container in the returned value and redacts descendants throughout the retained subtree using the resolved policy unless a more specific child path rule applies.
- Only targeted branches may change. Non-targeted siblings, unrelated branches, prototype-named key handling, and caller-owned input values must remain intact.
- Existing function-censor support may continue to work as implemented today, but this story must not add a second-argument context object or same-length handling. Story `2.2` owns that contract.
- `serialise` defaults to structured output. Replacement and removal behaviour must therefore be correct before any serialisation step and must not depend on `JSON.stringify` quirks.
- Sparse-array-hole behaviour from Story `1.4` remains a regression guardrail.

### Architecture Compliance

- Keep [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts) as the thin public facade over [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts).
- Keep validation in [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts), immutable plan construction in [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts), whole-value output shaping in [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts), and traversal/orchestration in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts).
- Use the current repository structure, not the architecture document’s fuller future split. The brownfield source of truth is the code that exists today.
- Keep the core browser-safe and free of Node-only APIs.
- Generated artefacts are not the source of truth. Do not hand-edit `dist/`, generated exports, or generated README output.

### Current Brownfield Constraints

- [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts) already exposes `Censor = string | ((value: unknown) => unknown)`. Do not break that public type while implementing literal-censor behaviour.
- [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts) already rejects `remove + censor` and `remove + retainStructure`, including inherited-default conflicts for path rules. Preserve this logic and extend it only if a missing edge case is proven.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts) already freezes the compiled default policy and merged path policies. Reuse this once-at-initialisation pattern rather than resolving defaults repeatedly at runtime.
- [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) already uses the `removedValue` symbol sentinel for removal. Preserve sentinel-based omission semantics rather than replacing them with `undefined`.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts) already deletes object properties and compacts removed array indexes manually. If you refactor that path, preserve non-mutation, current precedence, and sparse-array-hole safety.
- The green contract suite already covers invalid option combinations, selector parsing, and precedence stories from Epic `1`, but it does not yet prove the full positive contract for literal replacement, removal, and retained-structure handling.
- There is no `test/security/` tree in the working copy today. Story-critical behavioural coverage belongs primarily in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts), with targeted unit coverage added only where it clarifies plan compilation or replacement internals.
- The architecture doc sketches a future `src/core/replacement/` split into more files. Do not create that split in this story unless a concrete failing test makes it necessary.
- [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) and `src/utils/**` still carry retained v3 concepts such as `DeepRedact`, `blacklistedKeys`, `replacement`, and `serialize`. Do not import those modules to shortcut v4 work.
- [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc) pins the contributor baseline to Node `24.14.1`.

### Library / Framework Requirements

- Use the current repository baseline from [package.json](/Users/ben/Code/deep-redact/package.json), not older planning examples:
  - `pnpm@10.33.0`
  - Node engine `>=22.18.0`, with contributor verification under `.nvmrc` Node `24.14.1`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- Keep ESM-first source patterns and explicit `.js` import specifiers in TypeScript source modules.
- Do not spend this story changing tool versions unless a blocker is proven. The story is about runtime semantics and contract coverage, not toolchain churn.
- If public type comments, exports, or generated README inputs change, run the generator scripts before claiming completion.

### Testing Requirements

- Add green contract coverage for the library default `[REDACTED]` fallback when no explicit global `censor` exists.
- Add green contract coverage for a global literal `censor` applied through exact-key, regex-key, exact-path, and dynamic-path matches.
- Add green contract coverage for a local path-rule `censor` override beating a broader global literal default while affecting only the matched target.
- Add green contract coverage for `remove: true` on matched object properties through exact-key, regex-key, exact-path, and dynamic-path entry points, and on matched array elements through exact and dynamic path rules, proving omission, compaction, sibling preservation, and non-mutation.
- Add green contract coverage for `retainStructure: true` on matched containers through path and key entry points already supported by the runtime, proving parent-shape preservation and descendant redaction across the retained subtree with the resolved policy.
- Add coverage for merged-default fallback where a local path rule sets only one of `censor`, `remove`, or `retainStructure`, and the remaining unset options still resolve from the compiled global defaults.
- Preserve existing invalid-combination tests and add any missing inherited-default permutation only if a genuine gap is discovered.
- Preserve exact-path, dynamic-path, exact-key, and regex-key precedence expectations from Epic `1`.
- Keep [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts), [test/contract/exports/import.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/import.test.ts), [test/contract/exports/require.test.ts](/Users/ben/Code/deep-redact/test/contract/exports/require.test.ts), and [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts) green.

### Implementation Guardrails

- Do not add legacy `replacement` or `serialize` aliases to the v4 public surface.
- Do not implement later Epic `2` scope in this story: function-censor context objects, same-length replacement, substring rules, root-primitive matching, fuzzy matching, or case-insensitive matching.
- Do not couple `remove` to `JSON.stringify`, and do not use `undefined` as the primary internal representation of a removed value.
- Do not use `delete` on array indexes as the removal strategy, because that would leave sparse holes in the wrong places.
- Do not use `Array.prototype.toSpliced()` in the removal compaction path, because it densifies sparse arrays and would regress the Story `1.4` sparse-hole contract.
- Do not change the existing precedence ladder among exact paths, dynamic paths, inherited retained path policy, exact keys, and regex keys.
- Do not import from retained legacy modules such as [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts) or `src/utils/**` to implement v4 behaviour.
- Do not hand-edit generated files.
- Do not introduce restore metadata, reversible redaction, or caller-payload mutation.

### Previous Story Intelligence

- Story `1.6` confirmed the current v4 codebase already has a clear compiler/runtime/test slice split under `src/core/**` and uses green contract tests as the primary behavioural gate. Continue that pattern instead of introducing a parallel architecture.
- Story `1.6` also reinforced the current precedence ladder: exact path > dynamic path > inherited path policy > exact key > regex key. Story `2.1` must preserve that order while layering replacement semantics on top.
- Story `1.5` established conservative regex safety validation, cloned regex matchers at initialisation, and kept regex key rules on the compiled global policy only. That same “compile once, reuse safely” approach applies to replacement defaults and overrides here.
- Story `1.4` established dynamic path rules, sparse-array-hole preservation, and duplicate dynamic-selector rejection. `remove` must not regress the sparse-array contract.
- Story `1.3` established canonical exact-path matching, prototype-key safety, and non-mutating traversal. Replacement, removal, and retained-structure work must not weaken those guarantees.
- Story `1.2` established start-up validation and immutable compiled policy as the mechanism for rejecting invalid configuration before runtime.
- Sprint status still records Story `1.3` as `review` while later Epic `1` stories are marked `done`. Treat the current source tree and green tests as authoritative unless a failing check proves otherwise.

### Recent Git Intelligence

- `ccbd1b3 feat: match sensitive fields by regex-based path segments` shows the current development pattern for feature work across compiler, runtime, validation, contract tests, and unit tests.
- `07510e9 fix(epic 1): set status to done` updated the planning state after Epic `1`, so Story `2.1` is the first Epic `2` context hand-off.
- `aa1b7bc fix(Node runtime): types should be same major as dev runtime` and `6d83cf3 fix(version): bump to 4.0.0` indicate the package/tooling baseline has just stabilised. This story should build on that baseline rather than churning tool versions or public packaging.

### Latest Technical Information

- Reviewed on **3 May 2026**.
- MDN’s current `delete` documentation notes that deleting an array element does not change the array length and leaves an empty slot. That is a direct reason to keep explicit array compaction instead of deleting array indexes in place. Source: [MDN delete operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete).
- MDN’s current `JSON.stringify()` documentation notes that `undefined` is omitted from objects but serialised as `null` in arrays. That means `undefined` is the wrong primary mechanism for Deep Redact removal semantics when structured output is the default. Source: [MDN JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).
- MDN’s current `Array.prototype.toSpliced()` documentation notes that it never produces a sparse array and replaces empty slots with `undefined`. Avoid it in removal compaction because Story `1.4` already fixed sparse-array-hole behaviour as a contract. Source: [MDN Array.prototype.toSpliced()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced).
- The current `fast-redact` README documents `remove: true` as serialiser-coupled behaviour based on `JSON.stringify` and `undefined`. Deep Redact must not copy that implementation detail because v4 defaults to structured output and this story requires omission in the returned result itself. Source: [fast-redact README](https://github.com/davidmarkclements/fast-redact).

### Resolved Scope Decisions

- The existing single-argument function-censor support remains tolerated for backwards continuity within the v4 rewrite, but its richer public contract stays deferred to Story `2.2`.
- `retainStructure` means “keep the matched container and redact descendants throughout that retained subtree using the resolved policy unless a more-specific child path rule applies”.
- Array-element removal is explicit in scope for this story as brownfield behaviour that must remain correct alongside object-property removal.
- No public API rename from `censor` back to `replacement` is allowed in v4.

### Project Structure Notes

- The real v4 implementation surface is currently `src/core/**`, `src/types/**`, and `test/**`. Prefer extending that structure over creating new top-level modules or future-architecture folders.
- [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts) is the current output-shaping seam for whole-value redaction and removal signalling.
- [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts) is the main green behavioural suite. `test/unit/**` is not covered by default `pnpm run test` unless called explicitly or through the red-phase config.
- Planning artefacts remain under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`.

### References

- Local planning artefacts
  - [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md) - `Epic 2`, `Story 2.1`
  - [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md) - `What Makes This Special`, `MVP - Minimum Viable Product`, `Journey Requirements Summary`, `FR5`
  - [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md) - `Core Architectural Decisions`, `API & Communication Patterns`, `Project Structure & Boundaries`, `Quality Gates`
  - [sprint-status.yaml](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/sprint-status.yaml) - current development status
- Previous implementation context
  - [1-6-match-sensitive-fields-by-regex-based-path-segments.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-6-match-sensitive-fields-by-regex-based-path-segments.md)
  - [1-5-match-sensitive-fields-by-regex-based-property-names.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-5-match-sensitive-fields-by-regex-based-property-names.md)
  - [1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-4-support-wildcard-and-exclusion-selectors-for-repeated-nested-structures.md)
  - [1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-3-redact-exact-keys-and-canonical-exact-paths-in-nested-payloads.md)
  - [1-2-create-and-validate-a-reusable-service-redactor.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/1-2-create-and-validate-a-reusable-service-redactor.md)
- Current repo files
  - [package.json](/Users/ben/Code/deep-redact/package.json)
  - [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc)
  - [project-context.md](/Users/ben/Code/deep-redact/project-context.md)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts)
  - [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts)
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts)
  - [src/types/paths.ts](/Users/ben/Code/deep-redact/src/types/paths.ts)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts)
  - [test/build.test.ts](/Users/ben/Code/deep-redact/test/build.test.ts)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts)
  - [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts)
  - [src/utils/index.ts](/Users/ben/Code/deep-redact/src/utils/index.ts)
- External technical references
  - [MDN delete operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete)
  - [MDN JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
  - [MDN Array.prototype.toSpliced()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced)
  - [fast-redact README](https://github.com/davidmarkclements/fast-redact)

## Story Completion Status

Context analysis completed and the story is ready for implementation.

## Dev Agent Record

### Implementation Plan

- Add contract coverage for Story `2.1` literal replacement, removal, retained-structure traversal, and global/local fallback semantics.
- Add targeted compiler-plan coverage to prove compiled defaults remain stable while local path overrides apply only to the matched rule.
- Verify the new coverage first in focused Vitest runs, then run the repository verification commands required by the story under Node `24.14.1`.

### Debug Log

- 2026-05-03: Added focused contract and compiler tests before changing any production code to validate the current runtime against Story `2.1`.
- 2026-05-03: A red-phase contract test initially used `['services', '*', 'accessToken']`; corrected it to the supported dynamic selector form `services.*.accessToken` after confirming structured string segments are literal property keys in the current API.
- 2026-05-03: Confirmed the new Story `2.1` coverage passed without production-code changes because the existing `src/core/**` implementation already satisfied the required behaviour.
- 2026-05-03: `pnpm run test:red-phase` still reports legacy failures in `test/load/redact.test.ts` and `test/unit/index.test.ts` because those suites expect the removed `DeepRedact` constructor surface. Kept those failures recorded as retained baseline red-phase debt rather than expanding Story `2.1` to revive legacy APIs.

### Completion Notes

- Added contract coverage for the library default censor fallback, global literal censor application across exact-key, regex-key, exact-path, and dynamic-path selectors, and local path-rule literal override precedence.
- Added contract coverage for object-property removal, array-item removal with sparse-hole preservation, and retained-structure traversal for both path-driven and key-driven matches.
- Added compiler-plan coverage proving compiled defaults remain intact while local path overrides affect only the matched rule and unset options still resolve from the compiled global defaults.
- No production-code change was required in `src/core/**` or `src/types/**`; the current implementation already met the Story `2.1` contract once the missing behavioural proofs were added.
- Verification completed with `pnpm exec vitest run test/contract/api/create-redactor.test.ts --reporter=verbose`, `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts --reporter=verbose`, `pnpm run lint`, `pnpm run test`, and `pnpm run test:red-phase`.
- `pnpm run test:red-phase` remains red only in the legacy `DeepRedact` constructor suites (`test/load/redact.test.ts` and `test/unit/index.test.ts`), plus a non-failing `vi.mock` hoist warning in `test/unit/index.test.ts`.

## File List

- _bmad-output/implementation-artifacts/2-1-apply-literal-replacement-removal-and-retain-structure-handling.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- test/contract/api/create-redactor.test.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts

## Change Log

- 2026-05-03: Added Story `2.1` contract and compiler coverage for literal censor fallback, removal semantics, retained-structure traversal, and global/local policy fallback; updated story tracking to `review`.
