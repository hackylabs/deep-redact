# Story 3.5: Degrade Nested Runtime Failures to `[UNSUPPORTED]` with Deterministic Diagnostics

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want one failing nested value to degrade locally to `[UNSUPPORTED]` with deterministic sanitised diagnostics,
so that the rest of the payload remains usable and safely redacted without runtime throws.

## Acceptance Criteria

1. Given a redactor has been successfully initialised, when runtime processing for one nested value throws during transformer execution, function censor execution, substring replacer execution, or traversal of that value, then redaction does not throw and only that nested value is replaced with `[UNSUPPORTED]`.
2. Given a failing nested value occupies an object property position, when redaction completes, then that property remains present with the value `[UNSUPPORTED]` and the parent object and all surviving ancestors remain present.
3. Given a failing nested value occupies an array element position, when redaction completes, then that element position contains `[UNSUPPORTED]` and array length and surrounding element order are preserved.
4. Given a nested runtime failure occurs in one branch while other branches include transformed runtime values, circular references, or revisited identities, when redaction completes, then only the failing branch degrades to `[UNSUPPORTED]` and non-failing branches continue to follow the contracts already defined by Stories `3.2`, `3.3`, and `3.4`.
5. Given more than one nested value fails during the same redaction call, when redaction completes, then each failing node degrades independently and one failing node does not cause sibling or ancestor branches to be dropped or rethrown.
6. Given one nested runtime failure is degraded to `[UNSUPPORTED]`, when diagnostics are emitted, then exactly one structured diagnostic event is produced for that failing node.
7. Given a diagnostic event is produced for a nested runtime failure, when the event is inspected, then it follows `DiagnosticEvent = { event, path, valueType, message, details? }`.
8. Given a diagnostic event is produced for a nested runtime failure, when the event fields are populated, then `event` uses `dot.case` naming with `redaction.failure` as the default failure event, `path` uses canonical dot-path syntax, and `valueType` is descriptive but sanitised.
9. Given failure-specific metadata is included in `details`, when diagnostics are inspected, then `details` remains machine-readable and non-leaking, may include sanitised error metadata, and must not include raw source values, partially redacted originals, or unsafe snippets from the failing value.
10. Given multiple nested failures occur in one redaction call, when diagnostics are emitted, then each failing node produces its own structured diagnostic event and non-failing nodes do not emit failure events.
11. Given initialisation-time validation failures or optional `console.*` transport behaviour, when this story is implemented, then initialisation failures remain out of scope and console transport behaviour remains deferred to Epic `4`.

## Tasks / Subtasks

- [x] Add Story `3.5` contract coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2980) (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
  - [x] Add a dedicated `describe(...)` block immediately after the existing Story `3.4` ignored-value block so failure-isolation coverage reuses the same runtime fixtures, helper builders, and circular-marker expectations already established for Stories `3.2` to `3.4`.
  - [x] Add one nested custom-transformer failure case on a supported runtime value such as `Map`, `Error`, or `URL`, proving the failing branch becomes `[UNSUPPORTED]` while non-failing transformed branches still follow the current Story `3.3` and Story `3.4` contracts.
  - [x] Add one function-censor failure case for an object-property leaf and one for an array-element leaf, proving object properties remain present, array indexes remain occupied, and sibling order is preserved.
  - [x] Add one structured substring replacer failure case proving a throwing `replacer(...)` degrades only the matching string node and does not stop unrelated redaction in the same payload.
  - [x] Add one traversal-read failure case using a nested getter or equivalent hostile property access that throws during descent, proving the failing property path degrades to `[UNSUPPORTED]` instead of collapsing the parent object or the full payload.
  - [x] Add one mixed-payload regression where a failing branch sits alongside circular references, revisited identities, and ignored-value-type branches, proving the existing Story `3.2` to `3.4` behaviours continue unchanged for non-failing branches.
  - [x] Add one multi-failure case in a single redaction call, proving each failing node degrades independently and each failure produces exactly one structured diagnostic event.
  - [x] Assert the emitted event shape directly through a typed sink spy: `event`, `path`, `valueType`, `message`, and optional `details`.
  - [x] Add at least one sanitisation regression where the thrown error message itself contains sensitive text such as `token=secret` or `password=...`, and prove that neither `message` nor `details` leak that raw content.
  - [x] Keep console transport assertions out of this story. Observe diagnostics through the configured sink only; Epic `4` owns `console.*` transport and recursion-guard behaviour.

- [x] Introduce the minimum viable diagnostics public surface and typed event contract (AC: 6, 7, 8, 9, 10, 11)
  - [x] Add a focused public diagnostics type module such as `src/types/diagnostics.ts` defining the structured event shape required by the architecture.
  - [x] Extend [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:20) with a narrow root-level `diagnostics?: { sink?: (event: DiagnosticEvent) => void }` option that can receive emitted structured events without introducing host-specific transport coupling.
  - [x] Re-export any new public diagnostics types through [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:1) and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:1) only if they form part of the intended v4 public TypeScript contract.
  - [x] Keep the public surface conservative. This story needs one optional typed sink callback and a stable event shape, not sink arrays, not a public event-name override, not a full transport-adapter API, and not `console.*` convenience helpers.
  - [x] Do not revive legacy v3 naming or American-English aliases for new v4 diagnostics options.

- [x] Compile and validate diagnostics configuration once at initialisation (AC: 6, 7, 8, 9, 10, 11)
  - [x] Extend [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts:12) so the new diagnostics option is recognised, malformed containers fail fast, unsupported fields are rejected explicitly, and `diagnostics.sink` must be a function when provided.
  - [x] Extend [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:87) with an immutable compiled diagnostics plan alongside the existing defaults, substring rules, ignored-value plan, and transformer plan.
  - [x] If the compiler becomes clearer with a helper, introduce a small private module such as `src/core/compiler/compile-diagnostics.ts`. Keep it inside the existing dependency order and avoid speculative configuration sprawl.
  - [x] Treat `redaction.failure` as the fixed compiled default failure event name for this story. Do not add a public event-name override unless a later planning artefact requires it explicitly.

- [x] Add runtime-local failure isolation and sanitised emission at the orchestration seam (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] Introduce the minimum viable `src/core/diagnostics/` boundary expected by the architecture, for example `diagnostic-event.ts`, `diagnostics-sink.ts`, and `sanitise-diagnostics.ts`, keeping diagnostics concerns out of `replacement/` and `transformers/`.
  - [x] Keep [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:659) as the failure-isolation orchestration seam. Catch nested failures around transformer resolution, function censor execution, substring replacer execution, and branch traversal without creating a second traversal engine.
  - [x] Guard transformer execution at or immediately around [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:86) so a throwing custom or built-in transformer degrades only the current nested branch.
  - [x] Guard function-censor execution around [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts:31) from the runtime side rather than pushing diagnostics responsibilities into `replacement/`.
  - [x] Guard structured substring replacers in the `rule.replacer(...)` path at [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:494) so the failing string node becomes `[UNSUPPORTED]` while unrelated branches continue.
  - [x] Replace or wrap the current `Object.entries(...)` descent in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:763) with key-first safe reads if necessary, so a throwing getter can be isolated to `parent.key` rather than collapsing the whole object traversal without a canonical failing path.
  - [x] Preserve array shape by degrading failing element positions in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:659) to `[UNSUPPORTED]` rather than treating them like removals or compaction events.
  - [x] Emit exactly one sanitised structured event per failing node, with canonical path, descriptive value type, a generic non-leaking message, and machine-readable safe details such as stage, error name, or constructor hint when available.
  - [x] Preserve current precedence, ignored-value behaviour, and circular/revisit handling. Failure recovery must not reopen ignored branches for descendant targeting, must not outrank winning terminal rules, and must not create a second identity-tracking path.

- [x] Extend unit and declaration coverage for diagnostics compilation, sanitisation, and public typing (AC: 6, 7, 8, 9, 10, 11)
  - [x] Add focused compiler assertions in [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts:530) proving the compiled diagnostics plan is immutable, defaults predictably, and does not share caller-owned mutable containers after initialisation.
  - [x] If new diagnostics helpers are introduced, add narrow unit coverage under `test/unit/core/diagnostics/` for event sanitisation, stable event naming, and no-leak detail shaping.
  - [x] Extend [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1) and [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts:1) so the diagnostics option and event types are exercised by real ESM and CJS TypeScript consumer compilation.
  - [x] Keep [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12) as the declaration-contract harness.

- [x] Keep Story `3.5` scope tight and defer later transport work explicitly (AC: 11)
  - [x] Do not implement initialisation-time validation diagnostics, console recursion guards, or `console.*` adapter exports in this story. Epic `4` owns host-specific transport and recursion-blocking behaviour.
  - [x] Do not widen `[UNSUPPORTED]` degradation to unsupported configuration, selector parsing, or serialisation-adapter failures; Story `3.5` is about nested runtime failures after successful initialisation.
  - [x] Do not hand-edit generated artefacts such as package metadata, README content, or `dist/*`. If public-source changes require regenerated output, use the existing scripts.

- [x] Verify within the current contributor baseline (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
  - [x] Run a focused contract slice around the transformer, ignored-value, and new failure-isolation block in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2666) while iterating.
  - [x] Run the relevant compiler, diagnostics-unit, and declaration tests explicitly. [package.json](/Users/ben/Code/deep-redact/package.json:61) still makes `pnpm run test` a build-plus-contract-suite check only.
  - [x] Run `pnpm run lint`, `pnpm run test`, `pnpm run test:red-phase`, and `pnpm run build` once focused checks pass.
  - [x] If `pnpm run test:red-phase` still fails only in the legacy `DeepRedact` and `blacklistedKeys` suites at [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts:1) or [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts:1), record that separately as pre-existing legacy coverage rather than widening Story `3.5` to restore the old API.

### Review Findings

- [x] [Review] Nested runtime failure sites are currently unguarded, so thrown function censors, substring replacers, transformer callbacks, getters, or per-branch traversal failures can still escape the public no-throw contract. See [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:677), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:780), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1088), and [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts:31).
- [x] [Review] The architecture requires a typed diagnostics sink boundary, but the live source tree still stops at `src/core/compiler/`, `src/core/replacement/`, `src/core/runtime/`, and `src/core/validation/` with no `src/core/diagnostics/` layer yet. See [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:791) and [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:816).
- [x] [Review][Patch] The diagnostics configuration shape was under-specified because the story mixed a single typed sink callback with plural “sink entries”. The story now fixes the minimum v4 shape to `diagnostics?: { sink?: (event: DiagnosticEvent) => void }` and keeps event-name overrides out of scope for this story.
- [x] [Review][Patch] Verification guidance did not carry forward the known `test:red-phase` legacy baseline from Story `3.4`, so the story now tells implementers to record unchanged failures in [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts:1) and [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts:1) separately instead of broadening Story `3.5`.
- [x] [Review][Patch] Replayed failed identities lose per-path diagnostics, so revisited object or array branches that already degraded to `[UNSUPPORTED]` emit an event only for the first failing path instead of every failing node [src/core/runtime/redact-value.ts:1010]
- [x] [Review][Patch] Diagnostic event construction can throw while handling a nested failure, so hostile values with throwing `constructor` accessors still escape the public no-throw contract instead of degrading locally to `[UNSUPPORTED]` [src/core/diagnostics/diagnostic-event.ts:25]

## Dev Notes

### Story Intent

- Story `3.5` is the local failure-isolation layer that completes Epic `3`’s runtime-resilience contract.
- The behavioural sequence that matters is:
  - current-branch whole-value policy selection still happens first
  - supported runtime-value detection and ignored-type matching still follow Stories `3.3` and `3.4`
  - any nested runtime failure inside the current branch degrades only that branch to `[UNSUPPORTED]`
  - exactly one sanitised diagnostic event is emitted for that failing node
  - non-failing siblings and ancestors continue through the existing traversal contract
- The story is intentionally runtime-focused. It is not the console transport story and it is not a broader determinism or benchmark story.

### Current Runtime Intelligence

- [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:29) currently validates options, compiles the plan once, and returns a callable redactor, but it compiles no diagnostics configuration yet.
- [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:87) currently carries defaults, path rules, key rules, substring rules, ignored-value types, serialisation, and transformers, but no diagnostics sink or event metadata.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:659) currently reads array elements and [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:763) currently reads object properties directly during traversal, so hostile getters can currently throw out of the runtime.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:494) currently executes substring replacers directly, and [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts:37) currently executes function censors directly, with no local recovery path yet.
- [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1074) currently resolves supported runtime values through [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:86), but a throwing transformer can still escape because there is no diagnostics-aware guard around that seam.
- The live source tree currently has no `src/core/diagnostics/` directory even though the architecture expects one. See [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:791).
- Existing behavioural coverage in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2666) proves transformer, ignored-value, and circular contracts, but it does not yet prove local `[UNSUPPORTED]` recovery or sanitised failure-event emission.

### Technical Requirements

- After successful initialisation, nested runtime failures for supported inputs must never bubble to the caller. The failing node degrades to `[UNSUPPORTED]`, while the rest of the payload continues redaction.
- Failure isolation in this story must cover at least:
  - custom or built-in transformer execution
  - function censor execution
  - structured substring replacer execution
  - nested traversal reads or descent of the failing node
- When a failing node is an object property, keep the property key present and set its value to `[UNSUPPORTED]`.
- When a failing node is an array element, keep the slot occupied by `[UNSUPPORTED]`; do not drop the element and do not compact the array.
- Diagnostics must use one stable structured shape:
  - `event`
  - `path`
  - `valueType`
  - `message`
  - `details?`
- The minimum public configuration surface for this story is `diagnostics?: { sink?: (event: DiagnosticEvent) => void }`.
- `event` should default to `redaction.failure`.
- `path` must use canonical dot-path syntax consistent with the current matcher and path-normalisation rules.
- `valueType` should describe the failing value or branch kind without leaking raw content, for example `Map`, `Error`, `array`, `object`, or `string`.
- `message` must stay generic and non-leaking. If thrown errors contain secrets in `error.message`, that raw text must not pass through unchanged.
- `details` may include safe machine-readable metadata such as stage, error name, or constructor hint, but must not include raw payload values, partially redacted originals, or unsafe snippets from the failure.
- Diagnostics emission must remain orthogonal to serialisation. Structured events are internal runtime artefacts, not serialised payload output.

### Architecture Compliance

- Respect the compile-once model from [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:134): diagnostics configuration belongs in the immutable compiled plan, not in per-call mutable setup.
- Keep runtime behaviour aligned with [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:135) and [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:138): no optimisation path may change observable `[UNSUPPORTED]` placement, diagnostics shape, or leakage risk.
- Implement the security, resilience, and diagnostics contract from [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:136): failures isolate to the problematic nested value, the rest of the payload continues, and diagnostics remain sanitised.
- Introduce the typed sink abstraction expected by [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:201) without pulling in the deferred Node `console.error` fallback or recursion guard from Epic `4`.
- Keep the dependency order from [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:785): `diagnostics/` must sit below `runtime/` as a consumed boundary, not the other way round.
- Follow the diagnostic payload and naming rules in [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:503) and [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:531): structured events first, transport second, and `dot.case` event names.

### Library / Framework Requirements

- Follow the pinned repository baseline rather than external registry drift:
  - Node `24.14.1` from [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1)
  - package engine floor Node `>=22.18.0` from [package.json](/Users/ben/Code/deep-redact/package.json:11)
  - `pnpm@10.33.0`, `tsdown@0.21.7`, `typescript@6.0.2`, `vitest@4.1.4`, and `xo@2.0.2` from [package.json](/Users/ben/Code/deep-redact/package.json:10)
- [package.json](/Users/ben/Code/deep-redact/package.json:61) currently defines `pnpm run test` as build plus contract tests only, so any new diagnostics-unit coverage must be invoked explicitly unless it is added to the contract suite.
- Keep the core implementation browser-safe and zero-runtime-dependency. Do not add Node-only diagnostics dependencies or logging packages.
- Keep ESM source conventions and explicit `.js` import specifiers in TypeScript modules.

### File and Boundary Guidance

- Primary public and compilation seams:
  - [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:20)
  - [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:1)
  - [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:1)
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:29)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:87)
  - [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts:12)
- Primary runtime seams:
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:659)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:763)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:995)
  - [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts:31)
  - [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:86)
- Strongly preferred new boundaries if clarity warrants them:
  - `src/types/diagnostics.ts`
  - `src/core/compiler/compile-diagnostics.ts`
  - `src/core/diagnostics/diagnostic-event.ts`
  - `src/core/diagnostics/diagnostics-sink.ts`
  - `src/core/diagnostics/sanitise-diagnostics.ts`
- Test seams most likely to change:
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:2980)
  - [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts:530)
  - [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12)
  - [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1)
  - [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts:1)
- Generated outputs only via build if public source changes require regeneration:
  - `dist/index.js`
  - `dist/index.cjs`
  - `dist/index.d.ts`
- Do not edit:
  - legacy public root [src/types.ts](/Users/ben/Code/deep-redact/src/types.ts:1)
  - legacy utility runtime entry points under `src/utils/`
  - README or package export artefacts by hand

### Testing Requirements

- Prove local recovery for a throwing transformer on a nested supported runtime value.
- Prove local recovery for a throwing function censor on an object-property leaf.
- Prove local recovery for a throwing function censor on an array-element leaf while preserving length and order.
- Prove local recovery for a throwing structured substring replacer.
- Prove local recovery for a traversal-read failure caused by a throwing getter or equivalent hostile nested property access.
- Prove one failing branch can coexist with non-failing circular references, revisited identities, ignored-value branches, and normal transformed branches in the same payload.
- Prove multiple failures in one call yield multiple `[UNSUPPORTED]` nodes and exactly one structured event per failing node.
- Prove sanitised diagnostics never leak thrown secret-bearing messages or raw branch values.
- If a diagnostics sink is optional, prove that omitting it still preserves the no-throw runtime behaviour and local `[UNSUPPORTED]` substitution.
- Extend declaration fixtures so the diagnostics option compiles for both ESM and CJS consumers.
- Keep structured assertions as the primary oracle. Do not turn this into snapshot-driven testing, because the critical contract is branch-local degradation and non-leaking event content.

### Previous Story Intelligence

- Story `3.4` explicitly deferred transformer failure and local `[UNSUPPORTED]` degradation to Story `3.5`. This story should now close that gap without reworking the raw-value ignore contract.
- Story `3.3` established the supported runtime-value set and deterministic transformer precedence. Story `3.5` must preserve that seam and only add guarded recovery around it.
- Story `3.2` introduced active and completed identity tracking. Failure recovery must not create a second circular or revisit mechanism for supported object values.
- Story `2.5` and Story `2.6` fixed the targeting precedence ladder and literal-key defaults. Local failure recovery must sit underneath that precedence model, not replace it.
- Story `2.1` and Story `2.2` fixed whole-value replacement, removal, function-censor, and same-length replacement semantics. When those behaviours throw, only the current node should degrade.
- Story `3.4` also confirmed that `pnpm run test:red-phase` still reaches legacy `DeepRedact` and `blacklistedKeys` suites in [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts:1) and [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts:1), so unchanged failures there should be recorded as pre-existing unless Story `3.5` intentionally touches that legacy surface.

### Recent Git Intelligence

- `4f46e0d feat(intenals): exclude ignored value types from descendant redaction` is the direct parent implementation pattern. Story `3.5` should extend the same runtime, validation, compiler, and contract-test seams rather than creating a parallel recovery layer.
- `82e67a0 feat(API): resolve built-in and custom transformers deterministically` is still the primary transformer seam for supported runtime values. Failure isolation should wrap that seam, not bypass it.
- The working tree was clean before this story creation, so there is no unrelated source churn that should force merge-recovery work before implementation begins.

### Latest Technical Information

- Checked on **7 May 2026** against the local repository baseline.
- The current contributor toolchain is pinned locally by [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1) and [package.json](/Users/ben/Code/deep-redact/package.json:10), so this story should follow the repo’s fixed Node and package-manager baseline rather than chasing external version changes.
- The current live source tree has no `src/core/diagnostics/` boundary and no `test/security/diagnostics/` split yet, so Story `3.5` should introduce only the minimum viable diagnostics structure needed by the runtime contract.
- [package.json](/Users/ben/Code/deep-redact/package.json:61) still makes `pnpm run test` a build-plus-contract check only. Diagnostics-unit coverage and declaration checks must therefore be run explicitly during development.
- The current `test:red-phase` script in [package.json](/Users/ben/Code/deep-redact/package.json:63) still runs legacy suites that import `DeepRedact`, `blacklistedKeys`, and related v3-only surfaces in [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts:1) and [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts:1).

### Open Questions / Assumptions

- Assume the minimum viable public diagnostics surface is `diagnostics?: { sink?: (event: DiagnosticEvent) => void }`. Do not rename it or widen it in this story unless a later planning artefact explicitly requires that change.
- Assume root serialisation-adapter failures, user `serialise` callback failures, and initialisation-time validation failures remain out of scope for Story `3.5`.
- Assume `[UNSUPPORTED]` remains the fixed local runtime placeholder in this story rather than a user-configurable token.
- Assume the default failure event name is the fixed internal value `redaction.failure` with no transport-level behaviour attached yet.
- Assume safe details may include stage, error name, or constructor information, but any raw `error.message` text that embeds secrets must be redacted, stripped, or replaced before emission.

### Project Context Reference

- All code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:3).
- Planning artefacts remain under `_bmad-output/**`, not `docs/`. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:16).
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:22).

### Project Structure Notes

- The active v4 implementation surface remains `src/core/`, `src/transformers/`, `src/types/`, `src/index.ts`, and `test/`.
- The architecture expects `src/core/diagnostics/`, but the live repo does not yet contain that boundary. Introduce the minimum viable version only as needed for this story.
- The architecture also sketches `test/security/diagnostics/`, but the current repository keeps most v4 behavioural proof in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1) and narrow implementation proof in `test/unit/`. Follow the existing layout unless a small dedicated diagnostics unit suite materially improves clarity.
- No dedicated UX artefact was found for this story. The work is runtime-contract, type-surface, and diagnostics-boundary shaping only.

### References

- Story definition: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:963), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:424), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:425), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:427), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:474)
- Architecture contract: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:134), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:136), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:139), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:201), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:503), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:791), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:816)
- Previous implementation context: [3-3-resolve-built-in-and-custom-transformers-deterministically.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-3-resolve-built-in-and-custom-transformers-deterministically.md), [3-4-exclude-ignored-value-types-from-descendant-redaction-while-preserving-safe-output.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-4-exclude-ignored-value-types-from-descendant-redaction-while-preserving-safe-output.md)
- Current runtime seams: [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:29), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:87), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:659), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:763), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:995), [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts:31), [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:86)
- Public type and declaration seams: [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:20), [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:1), [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:1), [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1), [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts:1), [test/contract/types/declarations.test.ts](/Users/ben/Code/deep-redact/test/contract/types/declarations.test.ts:12)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add the Story `3.5` behavioural proof first in the existing contract suite so each failure seam is pinned before runtime work begins.
- Introduce the smallest public diagnostics surface and immutable compiled diagnostics plan next, keeping transport behaviour limited to one optional typed sink callback.
- Contain the runtime work to `src/core/runtime/redact-value.ts` plus a minimal `src/core/diagnostics/` helper boundary so nested failures degrade locally to `[UNSUPPORTED]` without reopening traversal or precedence decisions.

### Debug Log References

- Manual `validate-create-story` review on `2026-05-07` used [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md) because the older `_bmad/core/tasks/validate-workflow.xml` path referenced in some earlier story files is not present in this repository snapshot.
- Current runtime inspection confirmed that the main unguarded nested-failure sites are the array/object traversal loops in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:659), the substring replacer path in [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:494), the supported-runtime transformer seam in [src/transformers/resolve-transformer.ts](/Users/ben/Code/deep-redact/src/transformers/resolve-transformer.ts:86), and function-censor execution in [src/core/replacement/apply-redaction.ts](/Users/ben/Code/deep-redact/src/core/replacement/apply-redaction.ts:31).
- Local repository inspection on `2026-05-07` confirmed that the architecture’s planned `src/core/diagnostics/` boundary has not yet been materialised in source, so Story `3.5` must introduce the minimum viable diagnostics layer itself rather than wiring console behaviour directly into runtime orchestration.
- Follow-up validation on `2026-05-07` fixed the story’s diagnostics-shape ambiguity by pinning the minimum public surface to `diagnostics?: { sink?: (event: DiagnosticEvent) => void }` and by keeping event-name overrides out of scope for Story `3.5`.
- Follow-up validation on `2026-05-07` also carried forward the known `test:red-phase` legacy baseline so unchanged failures in [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts:1) and [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts:1) are recorded separately rather than treated as new Story `3.5` regressions.
- 2026-05-07: Implemented the public diagnostics types, compiled diagnostics plan, diagnostics sink boundary, and runtime-local `[UNSUPPORTED]` degradation across transformer, function-censor, substring-replacer, and traversal-read failure seams.
- 2026-05-07: Verified the new contract block with `pnpm exec vitest run test/contract/api/create-redactor.test.ts`, the diagnostics/compiler unit coverage with `pnpm exec vitest run --config vitest.red-phase.config.ts test/unit/core/compiler/compile-redactor-plan.test.ts test/unit/core/diagnostics/diagnostic-event.test.ts`, and the declaration fixtures with `pnpm exec vitest run test/contract/types/declarations.test.ts`.
- 2026-05-07: Repo-level validation passed with `pnpm run lint`, `pnpm run test`, and `pnpm run build`; `pnpm run test:red-phase` still fails only in the retained legacy `DeepRedact` constructor suites in [test/unit/index.test.ts](/Users/ben/Code/deep-redact/test/unit/index.test.ts:1) and [test/load/redact.test.ts](/Users/ben/Code/deep-redact/test/load/redact.test.ts:1), alongside the existing hoisted `vi.mock` warning.

### Completion Notes List

- Added a narrow public diagnostics surface with [src/types/diagnostics.ts](/Users/ben/Code/deep-redact/src/types/diagnostics.ts:1), `diagnostics?: { sink?: ... }` in [src/types/config.ts](/Users/ben/Code/deep-redact/src/types/config.ts:1), and public re-exports through [src/types/public.ts](/Users/ben/Code/deep-redact/src/types/public.ts:1) and [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:1).
- Compiled and validated diagnostics once at initialisation via [src/core/compiler/compile-diagnostics.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-diagnostics.ts:1), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:1), and [src/core/validation/validate-config.ts](/Users/ben/Code/deep-redact/src/core/validation/validate-config.ts:1).
- Introduced the `src/core/diagnostics/` boundary and kept [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1) as the orchestration seam so nested transformer, censor, substring, and traversal failures now degrade locally to `[UNSUPPORTED]` and emit one sanitised `redaction.failure` event per failing node.
- Added contract coverage for mixed transformed/circular/revisited payloads, function-censor failures, structured substring replacer failures, getter traversal failures, multi-failure calls, and sanitised event assertions in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1).
- Added diagnostics compiler and sanitisation unit coverage plus ESM/CJS declaration fixture coverage in [test/unit/core/compiler/compile-redactor-plan.test.ts](/Users/ben/Code/deep-redact/test/unit/core/compiler/compile-redactor-plan.test.ts:1), [test/unit/core/diagnostics/diagnostic-event.test.ts](/Users/ben/Code/deep-redact/test/unit/core/diagnostics/diagnostic-event.test.ts:1), [test/fixtures/consumers/types/index.ts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types/index.ts:1), and [test/fixtures/consumers/types-cjs/index.cts](/Users/ben/Code/deep-redact/test/fixtures/consumers/types-cjs/index.cts:1).
- Regenerated the published build output with `pnpm run build` and recorded the unchanged legacy `test:red-phase` failures separately instead of widening Story `3.5` back into the removed class API.

### File List

- _bmad-output/implementation-artifacts/3-5-degrade-nested-runtime-failures-to-unsupported-with-deterministic-diagnostics.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- dist/index.js
- src/core/compiler/compile-diagnostics.ts
- src/core/compiler/compile-redactor-plan.ts
- src/core/diagnostics/diagnostic-event.ts
- src/core/diagnostics/diagnostics-sink.ts
- src/core/diagnostics/sanitise-diagnostics.ts
- src/core/runtime/redact-value.ts
- src/core/validation/validate-config.ts
- src/index.ts
- src/types/config.ts
- src/types/diagnostics.ts
- src/types/public.ts
- test/contract/api/create-redactor.test.ts
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/unit/core/compiler/compile-redactor-plan.test.ts
- test/unit/core/diagnostics/diagnostic-event.test.ts

## Change Log

- 2026-05-07: Created Story `3.5`, validated it manually against the local create-story checklist, and moved sprint tracking from `backlog` to `ready-for-dev`.
- 2026-05-07: Tightened Story `3.5` validation by fixing the minimum diagnostics option shape to one optional typed sink callback and by carrying forward the pre-existing `test:red-phase` legacy baseline guidance.
- 2026-05-07: Implemented Story `3.5` across public diagnostics types, config validation, diagnostics compilation, runtime failure isolation, contract and unit coverage, declaration fixtures, and generated build output; marked the story `review` while recording unchanged legacy `DeepRedact` red-phase failures separately.
