# Story 4.1: Return Deterministic Structured Output Across Repeated Runs

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want structured redaction output to be stable across repeated runs on equivalent inputs,
so that I can trust regression tests and production behaviour when `serialise` is disabled.

## Acceptance Criteria

1. Given a named structured determinism fixture set and one compiled redactor with `serialise: false`, when equivalent fresh copies of the same named fixture are redacted repeatedly with the same configuration, then the returned structured output is deeply equal to the fixture’s golden expected output on every run.
2. Given the same compiled redactor has already processed different payloads, when the same named structured fixture is redacted again, then the returned output is still deeply equal to that fixture’s golden expected output.
3. Given a named `alias-same-context` fixture where two branches reach the same input identity under equivalent effective rule context, when redaction runs with structured output, then the returned output preserves the expected shared-identity relationship defined by that fixture’s golden assertion on every run.
4. Given a named `alias-different-context` fixture where two branches reach the same input identity under different effective rule context, when redaction runs with structured output, then the returned output preserves the expected path-correct separation defined by that fixture’s golden assertion on every run.
5. Given this story’s scope, when the implementation is reviewed, then serialised-output determinism remains deferred to Story `4.2`, traversal-lane equivalence remains deferred to Story `4.3`, precedence explanation remains deferred to Story `4.4`, restore exclusion remains deferred to Story `4.5`, and console adapter behaviour remains deferred to Story `4.6`.

## Tasks / Subtasks

- [x] Formalise Story `4.1` around a named structured-determinism fixture corpus instead of duplicating the current runtime logic (AC: 1, 2, 3, 4, 5)
  - [x] Start from the existing repeated-run and alias/revisit coverage in the canonical mixed-payload helpers and assertions at [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1149), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1221), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1290), and [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1341), together with the live alias fixture builders and revisit proofs at [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3726), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3752), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3778), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3804), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3816), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3885), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3912), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3939), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3964), and [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3979).
  - [x] Introduce the minimum reusable harness needed for named fixtures, fresh-payload builders, golden structured outputs, and alias-specific assertion hooks, preferably under `test/contract/support/` or a small new `test/fixtures/` subtree.
  - [x] Reuse current high-value fixture shapes such as the overlapping-rule payload, the cyclic/revisited payload, `alias-same-context`, and `alias-different-context` rather than inventing unrelated scenarios.
  - [x] Carry forward the live `matched-after-unmatched` revisit regression as a named corpus case so an earlier unmatched visit cannot poison a later retained-path revisit for the same identity.
  - [x] Keep `serialise: false` explicit in the structured determinism harness even though omitted `serialise` already returns structured output, so Story `4.1` stays clearly separated from Story `4.2`.
  - [x] Keep any new helper names, fixture names, comments, and committed artefacts in British English.

- [x] Change the runtime only if the named corpus exposes a real determinism gap or cross-invocation state leak (AC: 1, 2, 3, 4)
  - [x] Treat [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:102) as the existing identity-tracking seam for `completedIdentities`, `completedSnapshots`, rule-context keys, replay behaviour, and per-call traversal state.
  - [x] Preserve the current replay pipeline around [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:323), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:717), and [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1151). Do not bolt on a second cache or a parallel alias-resolution mechanism.
  - [x] Preserve compile-once, call-many behaviour through [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:11), [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:25), and [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:319). Repeated calls must reset traversal state while reusing the already compiled plan.
  - [x] Do not widen this story into serialisation changes in [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:11), fast-lane/generic-lane controls, precedence publication, restore denial, or console adapter work. Those belong to Stories `4.2` to `4.6`.
  - [x] If a fix is required, prefer the smallest targeted adjustment within the current rule-context and completed-snapshot machinery over any broad refactor of traversal, transformers, or diagnostics.

- [x] Add executable structured determinism proof that matches the story wording exactly (AC: 1, 2, 3, 4, 5)
  - [x] Prove each named fixture produces a structured result deeply equal to its golden expected output across repeated runs on equivalent fresh copies.
  - [x] Prove one compiled redactor can process different named fixtures before re-running the target fixture without contaminating the later output.
  - [x] Prove `alias-same-context` preserves the fixture’s intended shared-identity contract on every run.
  - [x] Prove `alias-different-context` preserves path-correct separation and does not incorrectly reuse an earlier cached branch result from a different effective rule context.
  - [x] Prove a later matched retained revisit still applies path-correct redaction after an earlier unmatched visit to the same identity, without re-entering the completed identity or reusing the wrong completed snapshot.
  - [x] Prove a cyclic or revisited fixture remains deterministic across repeated invocations while original inputs remain unchanged, so the per-call traversal-state reset in the architecture is exercised directly.
  - [x] Use explicit assertions or fixture-provided assertion functions for identity-sensitive cases. Do not reduce alias proof to JSON snapshots, because snapshots cannot express shared identity versus separated output objects.

- [x] Keep the repository layout aligned with the live codebase while laying groundwork for Stories `4.2` and `4.3` (AC: 1, 2, 3, 4, 5)
  - [x] Keep public-behaviour proof in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1) unless a small helper under [test/contract/support/package-fixture.ts](/Users/ben/Code/deep-redact/test/contract/support/package-fixture.ts:1) or a new neighbouring support file materially reduces duplication.
  - [x] If a new `test/fixtures/` corpus is introduced, organise it so Story `4.2` can add serialised golden strings and Story `4.3` can reuse the same named inputs for fast-lane versus generic-lane equivalence.
  - [x] Do not create public exports, consumer fixtures, adapter entrypoints, or security-test directories for this story unless a concrete failing case forces that work.
  - [x] Treat README runtime-status clean-up as out of scope here unless the implementation necessarily changes documented public behaviour.

### Review Findings

- [x] [Review][Patch] Story `4.1` now carries forward the live `matched-after-unmatched` revisit regression instead of only the same-context and different-context alias cases.
- [x] [Review][Patch] Story `4.1` now clarifies that fixture corpora may be organised around small shared-redactor scenario groups and must create fresh identities per run to avoid false-positive determinism coverage.
- [x] [Review][Patch] Restore the unmatched-only warm-up proof for the `matched-after-unmatched` fixtures [test/fixtures/structured-determinism/index.ts:563]
- [x] [Review][Patch] Keep golden deep-equality assertions active when fixtures add custom identity checks [test/contract/api/create-redactor.test.ts:93]

## Dev Notes

### Technical Requirements

- Story `4.1` implements FR19’s structured-output branch only. The epic and PRD explicitly split structured determinism from serialised determinism. Keep that split intact. [Source: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1023), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:416)]
- Determinism is a security and trust contract, not just a convenience for tests. The architecture requires the same input and configuration to produce the same observable output regardless of execution-path details, matching strategy, transformer choice, or graceful-degradation path. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:138)]
- Each call to `redact` must start with fresh traversal state while reusing the compiled configuration already held by the callable redactor. That is the core guardrail against cross-invocation contamination. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:135), [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:25), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425)]
- When structured output is returned, alias preservation is conditional. Equivalent effective rule context may preserve shared identity, while different effective rule context must favour path-correct output over alias preservation. Story `4.1` must prove both cases explicitly. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:194)]
- The live repository already contains direct tests for repeated runs, same-context alias replay, different-context alias replay, matched-after-unmatched revisits, and repeated cyclic invocations. Story `4.1` should consolidate and formalise that behaviour into the named fixture contract rather than re-implementing it from scratch. [Source: [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1341), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3885), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3912), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3939), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3979)]
- The named corpus may be organised into small scenario groups that each compile one shared redactor and then run several named fixture payloads through it. Do not contort the canonical mixed-payload, alias-context, and revisit cases into one global mega-configuration if that would hide the behaviour under test.
- Fresh-payload builders must allocate new object identities on every call. Determinism proof should not rely on reusing an already-redacted payload instance as the primary oracle for cross-invocation independence.

### Architecture Compliance

- Keep the current function-first API untouched. `deepRedact(options)` / `createRedactor(options)` compile configuration once and return a callable redactor. Story `4.1` is proof and determinism hardening, not public API design. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:132), [src/index.ts](/Users/ben/Code/deep-redact/src/index.ts:1), [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:29)]
- Keep determinism work inside the current runtime seam rather than scattering behaviour across adapters or legacy modules. The active v4 implementation lives under `src/core/`, `src/transformers/`, `src/types/`, and `test/`. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:471), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:949)]
- The architecture sketches a broader future test corpus with `test/fixtures/inputs` and `test/fixtures/golden`, but the live repository currently keeps most v4 behavioural proof inline in [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1) and only uses [test/contract/support/package-fixture.ts](/Users/ben/Code/deep-redact/test/contract/support/package-fixture.ts:1) for package-consumer support. Any new fixture corpus should respect that current shape. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:603), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:949)]
- Story `4.1` should create reusable structured fixtures in a way that Story `4.2` can add serialised golden strings and Story `4.3` can run the same named fixtures through forced lanes. [Source: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1060), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1099), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:395)]

### File Structure Requirements

- Primary runtime seams:
  - [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:11)
  - [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:91)
  - [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:717)
- Existing contract-test seams to reuse:
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1149)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1221)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1290)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1341)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3726)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3752)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3778)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3939)
  - [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3979)
- Existing support seam to extend only if helpful:
  - [test/contract/support/package-fixture.ts](/Users/ben/Code/deep-redact/test/contract/support/package-fixture.ts:1)
- Avoid touching legacy v3-oriented surfaces such as `src/types.ts`, `src/utils/`, or the retained red-phase suites unless a concrete regression proves Story `4.1` genuinely depends on them.

### Testing Requirements

- Add or refactor contract coverage so each named structured fixture provides:
  - a fresh-payload builder
  - one stable golden expected structured output
  - any extra assertion needed for alias identity or path-correct separation
- Ensure fixture builders return fresh identities on every call and, where helpful, preserve an untouched original or `structuredClone(...)` baseline so repeated-run assertions cannot pass accidentally by reusing already-traversed objects.
- Keep structured determinism assertions in the contract suite, and run at least the focused slice already mapped to this story:
  - `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "repeated runs|same-context|different-context|later matched retained|repeated invocations"`
- Run the normal contract gate after implementation:
  - `pnpm run test:contract`
- If runtime code changes, run the broader project gate because `package.json` wires `pnpm run test` through build verification first:
  - `pnpm run test`
- Do not add snapshot-only proof for alias cases. Identity-sensitive expectations need direct assertions.
- Do not add serialised determinism assertions here beyond preserving existing behaviour. Story `4.2` owns byte-for-byte string proof.

### Previous Story Intelligence

- Story `3.2` established active-path tracking, completed-identity tracking, and replay behaviour for circular references and revisited identities. Story `4.1` should extend those guarantees, not replace them. [Source: [3-2-handle-circular-references-and-revisited-identities-safely.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-2-handle-circular-references-and-revisited-identities-safely.md)]
- Story `3.3` established deterministic built-in and custom transformer resolution. Structured determinism must continue to hold when supported runtime values pass through that pipeline. [Source: [3-3-resolve-built-in-and-custom-transformers-deterministically.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-3-resolve-built-in-and-custom-transformers-deterministically.md)]
- Story `3.4` fixed ignored-value behaviour inside transformed runtime values. Story `4.1` must keep repeated-run determinism intact when ignored branches appear inside the fixture corpus. [Source: [3-4-exclude-ignored-value-types-from-descendant-redaction-while-preserving-safe-output.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-4-exclude-ignored-value-types-from-descendant-redaction-while-preserving-safe-output.md)]
- Story `3.5` fixed local `[UNSUPPORTED]` degradation with sanitised diagnostics. Structured determinism fixtures may include `[UNSUPPORTED]` paths later, but serialised placeholder rendering stays out of scope until Story `4.2`. [Source: [3-5-degrade-nested-runtime-failures-to-unsupported-with-deterministic-diagnostics.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/3-5-degrade-nested-runtime-failures-to-unsupported-with-deterministic-diagnostics.md)]
- Story `2.5` already fixed the precedence ladder across exact path, structured path, exact key, regex property, and substring rules. Story `4.1` should use those scenarios as determinism fixtures, not reopen precedence design. [Source: [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md)]

### Recent Git Intelligence

- `4a96971 feat(error handling): gracefully degrade runtime failure to UNSUPPORTED nested values with diagnostics` touched [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:717), diagnostics helpers, and the main contract suite. Story `4.1` should avoid bypassing that mature runtime seam.
- `4f46e0d feat(intenals): exclude ignored value types from descendant redaction` touched the same runtime seam plus transformer and compiler wiring. Determinism work should remain compatible with those recent contracts.
- The working tree was clean during story creation, so there is no unrelated source churn to account for before implementation.
- On `2026-05-07`, the focused determinism slice `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "repeated runs|same-context|different-context|repeated invocations"` passed with `5` tests, confirming that the repository already exhibits much of Story `4.1`’s target behaviour and that the remaining work is primarily corpus formalisation, gap-closing, and scope tightening rather than wholesale runtime invention. The follow-up validation in this story widens the recommended focused filter so the matched-after-unmatched revisit case is covered explicitly during implementation.

### Latest Technical Information

- Checked on **7 May 2026** against the live repository baseline.
- The contributor runtime remains pinned by [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1) to Node `24.14.1`.
- The current package-manager and toolchain pins live in [package.json](/Users/ben/Code/deep-redact/package.json:10), [package.json](/Users/ben/Code/deep-redact/package.json:56), [package.json](/Users/ben/Code/deep-redact/package.json:61), [package.json](/Users/ben/Code/deep-redact/package.json:62), [package.json](/Users/ben/Code/deep-redact/package.json:63), and [package.json](/Users/ben/Code/deep-redact/package.json:78):
  - `pnpm@10.33.0`
  - `tsdown@0.21.7`
  - `typescript@6.0.2`
  - `vitest@4.1.4`
  - `xo@2.0.2`
- The architecture document still mentions the older contributor examples `Vitest 4.1.2` and `xo 1.2.2`; implementation should follow the live pins in `package.json`, not the older narrative versions in the architecture text. [Source: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:367)]
- The public README still describes the v4 runtime as placeholder-only, but the live source tree and passing determinism tests show the runtime now exists. Treat README status reconciliation as separate documentation work unless Story `4.1` necessarily changes public behaviour. [Source: [README.md](/Users/ben/Code/deep-redact/README.md:3)]

### Open Questions / Assumptions

- Assume the remaining Story `4.1` work is to formalise and complete the structured determinism fixture corpus around already-present runtime behaviour, not to replace the current traversal and replay design wholesale.
- Assume a “named fixture set” may be code-backed rather than pure JSON files, provided each fixture has a stable name, a fresh-payload factory, a golden expected structured output, and any executable assertion required for alias identity semantics.
- Assume `alias-same-context` may need an assertion callback rather than a plain deep-equality object because shared identity cannot be expressed by serialised snapshots.
- Assume `serialise: false` remains explicit in the Story `4.1` harness even though omitted `serialise` already returns structured output, because the epic wording distinguishes structured proof from serialised proof.
- Assume README/runtime-status clean-up and any public explanation of deterministic serialised output remain out of scope until the later Epic `4` documentation work lands.

### Project Context Reference

- All code, comments, tests, and documentation for this story must use British English outside quoted identifiers and third-party API names. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:3).
- Planning artefacts remain under `_bmad-output/**`, not `docs/`. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:16).
- Outside BMAD-owned directories, avoid BMAD planning terminology in public-facing code or documentation. See [project-context.md](/Users/ben/Code/deep-redact/project-context.md:22).

### Project Structure Notes

- The active implementation surface is flatter than the aspirational architecture tree. The live runtime centres on [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425), with compiler, validation, and transformer seams beside it rather than a many-file runtime subsystem.
- `test/fixtures/` currently contains consumer-package fixtures only; there is no existing structured determinism corpus yet. Story `4.1` is the right place to introduce the minimum reusable version of that corpus if it helps Stories `4.2` and `4.3`.
- No dedicated UX artefact was found for this story. The work is runtime-contract proof, fixture-corpus design, and possible small runtime hardening only.

### References

- Story definition: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1023), [prd.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:416)
- Epic 4 scope boundaries: [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1060), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1085), [epics.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1134)
- Architecture contract: [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:135), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:138), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:191), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:194), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:395), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:402), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:603), [architecture.md](/Users/ben/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:949)
- Current runtime seams: [src/core/create-redactor.ts](/Users/ben/Code/deep-redact/src/core/create-redactor.ts:11), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:91), [src/core/compiler/compile-redactor-plan.ts](/Users/ben/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:319), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:294), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:323), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:717), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1151), [src/core/runtime/redact-value.ts](/Users/ben/Code/deep-redact/src/core/runtime/redact-value.ts:1425)
- Current contract-test seams: [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1149), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1221), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1290), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:1341), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3726), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3752), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3778), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3885), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3912), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3939), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3964), [test/contract/api/create-redactor.test.ts](/Users/ben/Code/deep-redact/test/contract/api/create-redactor.test.ts:3979)
- Toolchain and scripts: [.nvmrc](/Users/ben/Code/deep-redact/.nvmrc:1), [package.json](/Users/ben/Code/deep-redact/package.json:10), [package.json](/Users/ben/Code/deep-redact/package.json:56), [package.json](/Users/ben/Code/deep-redact/package.json:61), [package.json](/Users/ben/Code/deep-redact/package.json:62), [package.json](/Users/ben/Code/deep-redact/package.json:63), [package.json](/Users/ben/Code/deep-redact/package.json:78)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Manual `validate-create-story` review on `2026-05-07` used [.agents/skills/bmad-create-story/checklist.md](/Users/ben/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md:1) as the local quality baseline.
- `2026-05-07`: `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "repeated runs|same-context|different-context|repeated invocations"` passed with `5` matching tests, confirming that the live runtime already satisfies a substantial portion of Story `4.1` and that the main gap is formalised named-fixture coverage plus any residual hardening.
- Story validation tightened this artefact by explicitly steering implementation towards the existing identity-tracking and replay seams, by separating structured determinism from serialised determinism, and by treating alias identity as an assertion-based contract instead of a snapshot-only one.
- Follow-up validation on `2026-05-07` carried forward the live `matched-after-unmatched` revisit regression and clarified that the named corpus may be organised around small shared-redactor scenario groups with fresh-identity payload builders, preventing false-positive determinism coverage.
- `2026-05-07`: added a reusable structured determinism corpus at `test/fixtures/structured-determinism/index.ts` and refactored `test/contract/api/create-redactor.test.ts` to drive repeated-run, cross-invocation, and fixture-specific replay proof from named fixtures.
- `2026-05-07`: `pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "repeated runs|same-context|different-context|later matched retained|repeated invocations"` passed with `18` matching tests after the corpus refactor.
- `2026-05-07`: `pnpm run test:contract` passed.
- `2026-05-07`: `pnpm exec tsc --noEmit` passed.
- `2026-05-07`: `pnpm exec xo test/contract/api/create-redactor.test.ts test/fixtures/structured-determinism/index.ts` crashed inside `@typescript-eslint/promise-function-async` while linting an unchanged helper near the top of `test/contract/api/create-redactor.test.ts`, so lint could not be used as a validation signal for this story.

### Completion Notes List

- Created the Story `4.1` implementation artefact with acceptance criteria, scoped tasks, architecture guardrails, and current-runtime references.
- Marked Epic `4` as `in-progress` and Story `4.1` as `ready-for-dev` in the sprint status tracker.
- Captured that the current repository already has passing determinism and alias-behaviour tests, so implementation should formalise and extend those fixtures before attempting broader runtime changes.
- Recorded the live toolchain pins from `.nvmrc` and `package.json`, including the fact that the architecture narrative lags the current `Vitest` and `xo` versions.
- Validation tightened the story by retaining the matched-after-unmatched revisit case and by clarifying fresh-identity fixture builders plus small shared-redactor scenario grouping for the future corpus.
- Added a reusable `test/fixtures/structured-determinism/` corpus with grouped compiled-redactor scenarios for overlapping rules, canonical mixed payloads, alias replays, retained revisits, and cyclic revisits.
- Replaced the duplicated structured determinism assertions in `test/contract/api/create-redactor.test.ts` with a shared harness that proves repeated-run determinism, cross-invocation independence, and the fixture-specific same-context and different-context warm-up replay paths.
- Kept the runtime unchanged because the named corpus did not expose any determinism defect or cross-invocation state leak in `src/core/runtime/redact-value.ts`.
- Validated the story with the focused determinism slice, the full contract gate, and a standalone TypeScript no-emit check.

### File List

- _bmad-output/implementation-artifacts/4-1-return-deterministic-structured-output-across-repeated-runs.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- test/contract/api/create-redactor.test.ts
- test/fixtures/structured-determinism/index.ts

## Change Log

- 2026-05-07: Formalised structured determinism around a named fixture corpus, refactored the contract suite to use the shared harness, and validated the contract and typecheck gates.
