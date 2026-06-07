# Story 4.4: Publish and Prove a Normative Precedence Matrix for Overlapping Targeting Rules

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want Deep Redact to publish one normative precedence matrix with fixture-backed examples and matching contract tests,
so that I can predict overlap resolution before trusting the output in production.

## Acceptance Criteria

1. Given the public precedence contract for Deep Redact, when it is published, then it defines one total precedence order using canonical terms only: `exact string-path`, `structured path`, `exact key`, `regex property`, `substring`.
2. Given the published precedence matrix, when the total order is stated, then it defines this ordered ladder: `exact string-path` outranks `structured path`; `structured path` outranks `exact key`; `exact key` outranks `regex property`; `regex property` outranks `substring`.
3. Given the published precedence matrix, when exact string-path rules overlap within the same layer, then it states that more specific canonical exact paths outrank less specific canonical exact paths.
4. Given the published precedence matrix, when duplicate selectors collapse to the same canonical path within the same precedence layer, then it states that initialisation fails rather than resolving that collision at runtime.
5. Given the published precedence matrix, when whole-value and partial-string overlap is defined, then it states that whole-value censor or removal outranks substring replacement.
6. Given the published precedence matrix, when retained-container behaviour is defined, then it states that `retainStructure: true` preserves the matched container and allows descendant targeting to continue unless a higher-precedence whole-value rule has already claimed that descendant.
7. Given the published precedence contract, when worked examples are provided, then the fixture set includes at least `path-versus-key`, `exact-key-versus-regex-property`, `whole-value-versus-substring`, `retain-structure-descendant-targeting`, and `duplicate-canonical-path-init-failure`.
8. Given a worked precedence example is published, when developers inspect it, then it includes the input fixture, the relevant configuration, and the final expected output or initialisation error outcome.
9. Given the precedence contract test suite, when it is executed, then each rule in the normative precedence matrix is covered by explicit automated contract tests.
10. Given the fixture-backed examples and the contract test suite, when they are maintained over time, then both documentation examples and automated tests use the same canonical fixture set so they cannot drift silently apart.

## Tasks / Subtasks

- [x] Create one canonical precedence fixture set and renderer (AC: 7, 8, 10)
  - [x] Add `test/fixtures/precedence-matrix/index.ts` as the source of truth for the normative order, example metadata, input payloads, `DeepRedactOptions`, expected outputs, and expected initialisation failures.
  - [x] Include at minimum the required fixture names: `path-versus-key`, `exact-key-versus-regex-property`, `whole-value-versus-substring`, `retain-structure-descendant-targeting`, and `duplicate-canonical-path-init-failure`.
  - [x] Add explicit edge-coverage fixtures for every precedence claim not fully covered by the minimum names: `exact-string-path-specificity`, `exact-string-path-versus-structured-path`, `structured-path-versus-exact-key`, `regex-property-versus-substring`, and `whole-value-removal-versus-substring`.
  - [x] For `exact-string-path-specificity`, make the less-specific parent exact path use `retainStructure: true` so the more-specific descendant exact path remains reachable and can prove it wins; also assert the retained parent still applies to a sibling descendant.
  - [x] For `duplicate-canonical-path-init-failure`, use differently written selectors that collapse to the same canonical exact path, such as `account.secret` and `['account', 'secret']`, so the example proves canonical collision handling rather than only a literal duplicate.
  - [x] Add explicit winner markers such as `[EXACT-STRING-PATH]`, `[STRUCTURED-PATH]`, `[EXACT-KEY]`, `[REGEX-PROPERTY]`, and `[SUBSTRING]` so a failed assertion reveals which layer won.
  - [x] Represent the public term as `regex property` in fixture metadata and documentation, while mapping it to the internal runtime source `regex-key` only in implementation-facing notes or assertions.
  - [x] If a fixture needs a function censor to distinguish exact-key from regex-property wins, include a stable documentation rendering field or named placeholder for that function so the generated Markdown shows a readable configuration instead of serialising executable code.
  - [x] Provide a renderer or serialiser helper that turns each fixture into stable Markdown snippets for the published document. Do not duplicate hand-written example payloads in docs and tests.

- [x] Publish the normative precedence contract (AC: 1-8, 10)
  - [x] Create `docs/architecture/precedence.md` from the canonical fixture set. This is product/runtime documentation, not a BMAD planning artefact.
  - [x] State exactly one total order using canonical public terms only: `exact string-path` > `structured path` > `exact key` > `regex property` > `substring`.
  - [x] Include a compact matrix explaining what wins for each overlap pair, plus short notes for same-layer exact string-path specificity, duplicate canonical-path initialisation failure, whole-value versus substring, and `retainStructure: true`.
  - [x] Include each worked example with the fixture name, input, configuration, and final output or expected initialisation error.
  - [x] Keep the document free of BMAD terminology and avoid exposing internal module names unless a developer-facing note genuinely needs them.

- [x] Add documentation drift protection (AC: 8, 10)
  - [x] Add a script such as `scripts/generate-precedence-doc.ts` or extend `scripts/generated-files.ts` so the precedence Markdown is derived from the same fixture source as the tests.
  - [x] Wire precedence generation into the default generated-file workflow: `pnpm run generate` should update `docs/architecture/precedence.md`, and `pnpm run verify-generated-files` should fail when the committed document no longer matches the rendered fixture set.
  - [x] If a dedicated `verify-precedence-doc` script is added, call it from `verify-generated-files` or another default gate used by `pnpm run build`; do not leave drift protection as an optional manual command only.
  - [x] If `package.json` scripts change, keep generated export metadata intact and run the existing generated-file verification.
  - [x] Do not hand-edit generated Markdown after the renderer is in place.

- [x] Prove the matrix with contract tests (AC: 1-10)
  - [x] Add a dedicated `describe('Normative precedence matrix', ...)` block in `test/contract/api/create-redactor.test.ts`, following the current contract-test pattern.
  - [x] For each successful fixture, create the redactor through `deepRedact` and assert the output with `toStrictEqual`.
  - [x] For `duplicate-canonical-path-init-failure`, assert that `deepRedact` throws during initialisation with the existing duplicate canonical selector wording.
  - [x] Add a contract assertion that the published order metadata is exactly `['exact string-path', 'structured path', 'exact key', 'regex property', 'substring']`.
  - [x] Add one assertion per precedence edge: exact string-path beats structured path, structured path beats exact key, exact key beats regex property, and regex property beats substring.
  - [x] Add one assertion for same-layer exact string-path specificity using a retained parent and a more-specific descendant path.
  - [x] Add contract or generated-file verification that compares the complete rendered Markdown with `docs/architecture/precedence.md`; a weaker assertion that only checks fixture names or selected markers is not enough for drift protection.
  - [x] Use the same fixture array for runtime assertions and documentation rendering. Do not copy fixtures into the test body.

- [x] Preserve existing runtime boundaries (AC: 1-6, 9)
  - [x] Start by writing contract tests against the current runtime. Story `2.5` already proved the ladder at runtime, so expect documentation, fixture, and verification work first.
  - [x] Only edit `src/core/runtime/redact-value.ts` if a new `4.4` contract case exposes a real mismatch in `selectActivePolicy(...)`, direct-key resolution, or substring gating.
  - [x] Do not add a public `precedence` option, public enum, or new runtime configuration surface.
  - [x] Do not create a second precedence engine in docs, fixtures, or scripts. The fixture set describes expectations; the runtime remains the source of behavioural execution.

- [x] Verify the story implementation (AC: 1-10)
  - [x] Run the focused precedence slice while iterating: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "Normative precedence matrix"`.
  - [x] Regenerate the precedence document after fixture or renderer changes: `source .agents/initialise-env.sh && pnpm run generate`.
  - [x] Run generated-file verification after adding the documentation renderer: `source .agents/initialise-env.sh && pnpm run verify-generated-files`.
  - [x] Run the contract gate: `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run lint after TypeScript, script, package, or Markdown-generation changes: `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run the full default test gate if any `src/` files change: `source .agents/initialise-env.sh && pnpm run test`.

### Review Findings

- [x] [Review][Patch] Guard documentation examples against runtime-case drift [test/fixtures/precedence-matrix/index.ts:176]
- [x] [Review][Patch] Prove every published matrix overlap row with explicit fixture-backed assertions [test/fixtures/precedence-matrix/index.ts:23]
- [x] [Review][Patch] Add an input fixture to the duplicate canonical-path initialisation example [test/fixtures/precedence-matrix/index.ts:386]
- [x] [Review][Patch] Tighten documentation outcome types so required worked-example fields cannot be omitted [test/fixtures/precedence-matrix/index.ts:64]

## Dev Notes

### Story Intent

- Story `4.4` turns the already-tested precedence behaviour into the public, normative contract for FR20. It should produce a published matrix, fixture-backed examples, and contract tests that prove the matrix cannot drift.
- This is not a new targeting mode and should not become a runtime rewrite by default. Story `2.5` already established explicit contract coverage for exact path, structured path, exact key, regex property, substring, retained-container traversal, and repeated-run determinism. [Source: [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md:52)]
- The key new value is publication and drift prevention: docs and automated tests must use the same canonical fixture set. Hand-copying examples into docs and tests separately does not satisfy this story.

### Technical Requirements

- The public precedence order must use these exact public terms and no alternatives in the normative matrix: `exact string-path`, `structured path`, `exact key`, `regex property`, `substring`. [Source: [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1139)]
- Runtime implementation currently names the regex-property layer `regex-key`. Use `regex-key` only when referencing internal source or test implementation details; the published contract must say `regex property`. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:41)]
- The runtime whole-value precedence source is `selectActivePolicy(...)`: exact path first, dynamic path next, retained inherited path policy, exact key, regex key, then any inherited fallback. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:492)]
- Substring replacement only runs after no higher-precedence whole-value policy has claimed the leaf. Preserve this ordering in tests and docs. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:1209)]
- Duplicate exact canonical selectors already fail validation in `validatePathSelectors(...)`. The example should assert initialisation failure, not runtime winner selection. [Source: [src/core/validation/validate-paths.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-paths.ts:39)]
- Exact path compilation stores static canonical rules in `exactPathRules`; dynamic path rules remain in `dynamicPathRules`. This distinction maps to the public `exact string-path` versus `structured path` layers. [Source: [src/core/compiler/compile-redactor-plan.ts](/Users/ben.green/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:199)]
- Same-layer exact string-path specificity is only observable for descendants that remain reachable. The fixture should use a retained parent path such as `account` and a more-specific descendant path such as `account.secret`; otherwise a terminal parent whole-value redaction stops traversal before the descendant can be considered.
- Whole-value versus substring coverage must include both a censor winner and a removal winner. The existing runtime applies whole-value policy before substring processing, so use a substring replacer spy to prove the replacer is not called for either claimed leaf.
- `retainStructure: true` keeps a matched container traversable, but descendants already claimed by higher-precedence whole-value rules must not receive substring replacement as a second pass. [Source: [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md:62)]

### Architecture Compliance

- The architecture explicitly requires clear precedence rules for overlapping targeting modes and treats the precedence contract as part of the product trust surface. [Source: [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:34)]
- Rule precedence is already defined architecturally: more specific exact string-path rules outrank less specific exact string-path rules; exact string-path outranks structured dynamic path; path rules outrank key rules; exact key outranks regex property; whole-value censor or removal outranks substring replacement. [Source: [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:196)]
- Duplicate same-layer canonical path collisions fail initialisation unless a future documented merge rule exists. Story `4.4` should document the current failure rule, not invent a merge rule. [Source: [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:198)]
- The architecture reserves `docs/architecture/precedence.md` for the precedence contract. The repository does not currently have a `docs/` directory, so this story may create that directory as runtime/product documentation. [Source: [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:632)]
- Keep optional console redaction out of this story. It belongs to Story `4.6`, and console work must stay in adapter entry points rather than the core runtime. [Source: [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1233)]

### Library and Framework Requirements

- Use the live pinned repository baseline: Node `24.14.1`, `pnpm@10.33.0`, TypeScript `6.0.2`, Vitest `4.1.4`, `tsdown@0.21.7`, and ESLint `9.39.4`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10)]
- The README and older planning artefacts still mention `xo`, but the active lint gate is `pnpm run lint`, which runs ESLint and `tsc --noEmit`. Follow the live scripts rather than older `xo` wording. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:64)]
- Every Node, package-manager, build, lint, test, generation, benchmark, or release command must be prefixed with `source .agents/initialise-env.sh` from the repository root. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:9)]
- Do not add runtime dependencies. The package is currently zero-runtime-dependency, with all listed dependencies under `devDependencies`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:73)]
- Keep ESM TypeScript imports consistent with the repo's NodeNext setup and explicit `.js` specifiers for source/test imports. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:4)]

### File Structure Requirements

- Expected new fixture source: `test/fixtures/precedence-matrix/index.ts`
- Expected new public documentation: `docs/architecture/precedence.md`
- Expected documentation generation or verification script: `scripts/generate-precedence-doc.ts`, `scripts/verify-precedence-doc.ts`, or an extension to `scripts/generated-files.ts` and `scripts/verify-generated-files.ts`
- Expected contract test target: `test/contract/api/create-redactor.test.ts`
- Conditional runtime target only if tests expose a real gap: `src/core/runtime/redact-value.ts`
- Conditional validation target only if duplicate-canonical failure behaviour is not currently expressible: `src/core/validation/validate-paths.ts`
- Avoid adding `test/contract/precedence/` unless there is a strong reason. The active contract pattern keeps public API behaviour in `test/contract/api/create-redactor.test.ts`.

### Testing Requirements

- Prefer `toStrictEqual` for structured output so missing keys, `undefined`, arrays, and object shape differences are not blurred.
- Use `toThrow` for the duplicate canonical selector fixture because the expected outcome is initialisation failure.
- Use `vi.fn()` spies when a fixture must prove a layer ran exactly once, especially for whole-value versus substring overlap.
- For regex-property fixtures, prefer one named helper function in the fixture source for the test-time censor and a separate renderer-friendly configuration snippet for docs. Do not attempt to JSON-stringify function bodies into public documentation.
- Include at least one documentation-rendering test or verification script that reads `docs/architecture/precedence.md` and compares it with the same rendered fixture source. A test that only checks fixture names is weaker than the acceptance criterion.
- If docs are generated, run both the generator and verifier before finalising. If docs are manually rendered from the helper, the verifier must still catch drift.

### Previous Story Intelligence

- Story `2.5` is the direct behavioural predecessor. It added a dedicated precedence contract block and confirmed the current runtime already satisfies the five-layer ladder without production changes. Reuse its runtime understanding; do not reopen the broader redaction engine unless a new fixture fails. [Source: [2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/2-5-deterministic-precedence-across-exact-path-structured-path-exact-key-regex-property-and-substring-rules.md:195)]
- Story `4.1` created the structured determinism corpus and Story `4.2` created the serialised determinism corpus in `test/fixtures/structured-determinism/index.ts`. Story `4.4` should create a separate precedence matrix fixture instead of extending determinism fixtures. [Source: [4-1-return-deterministic-structured-output-across-repeated-runs.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-1-return-deterministic-structured-output-across-repeated-runs.md:1)]
- Story `4.3` created a separate `test/fixtures/exact-path-equivalence/index.ts` corpus and appended contract coverage to the API contract file. Mirror that separation for precedence publication. [Source: [4-3-prove-exact-path-fast-lane-and-generic-traversal-are-behaviourally-equivalent.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-3-prove-exact-path-fast-lane-and-generic-traversal-are-behaviourally-equivalent.md:1)]
- Story `4.3` also proved that the current pattern allows test fixtures to import internal compiler/runtime seams when the test purpose requires it. Story `4.4` should not need internal imports for normal redaction examples; use public `deepRedact` unless proving a compile-plan detail is unavoidable. [Source: [test/fixtures/exact-path-equivalence/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/exact-path-equivalence/index.ts:1)]

### Recent Git Intelligence

- `3a1e672 tests(exact path fast lane redaction): add coverage` is the most recent commit and corresponds to Story `4.3` test-only work. Continue the pattern of fixture-backed API contract coverage.
- `68aa0cb fix(story 1.3): incorrect status` touched story tracking, so check `sprint-status.yaml` after this story file is created.
- `7dbc5ca tests(output): deterministic structured output across repeated runs` and earlier Epic 4 commits established fixture corpus plus contract-test patterns.
- `a3e37c1 chore(agents): optimise agent initialisation with correct environment toolchain` reinforces that every toolchain command must source `.agents/initialise-env.sh`.
- `b4213be chore(linting): use eslint in place of XO` means new story guidance must reference ESLint, not `xo`, despite older planning text.

### Latest Technical Information

- Checked on 2026-05-22 against the local repository pins and official documentation.
- No dependency upgrade is required for this story. The existing Vitest `4.1.4` and Node `24.14.1` baseline is compatible with the planned contract tests; Vitest 4 requires Node `>=20.0.0`, so the repo's pinned Node version is safely above that floor. [Source: [Vitest migration guide](https://vitest.dev/guide/migration)]
- TypeScript `6.0` is a stable transition release with a `--stableTypeOrdering` flag for declaration-order comparisons, but this story should not depend on that flag. Runtime precedence examples are about redaction output, not declaration-emission ordering. [Source: [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)]
- Keep the implementation on local pins from `package.json`; do not chase latest registry versions during story work.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:3)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`. The new story file belongs under `_bmad-output/implementation-artifacts/`; the precedence docs belong under `docs/architecture/` because they are public product documentation, not planning material. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:16)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:22)]

### Project Structure Notes

- The repository currently has no `docs/` directory. Creating `docs/architecture/precedence.md` is expected for this story and aligns with the architecture sketch.
- `README.md` is generated from `scripts/templates/README.md.template`; do not hand-edit README for this story unless the generated template and verification logic are updated together.
- The current contract suite is concentrated in `test/contract/api/create-redactor.test.ts`; keep the new `describe` block close to other precedence or Epic 4 contract blocks.
- The active implementation surface should be `test/`, `docs/`, and `scripts/`. Runtime source changes are conditional, not expected.

### Open Questions / Assumptions

- Assume `docs/architecture/precedence.md` is the publication target for this story because it is named in the architecture document and no more specific public-doc location exists yet.
- Assume docs generated from `test/fixtures/precedence-matrix/index.ts` is acceptable because the acceptance criteria require one canonical fixture set shared by docs and tests.
- Assume public examples should use the `deepRedact` factory, not internal compiler/runtime modules.
- Assume root primitive string precedence remains out of scope unless a specific overlap fixture requires it; nested overlap was the scope of Story `2.5`.

### References

- Story definition: [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1139)
- Epic 4 scope: [epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1023)
- PRD precedence risk: [prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:274)
- Architecture precedence contract: [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:196)
- Architecture docs target: [architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:632)
- Existing duplicate canonical selector validation: [src/core/validation/validate-paths.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-paths.ts:39)
- Existing precedence runtime source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:492)
- Existing substring gate: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:1209)
- Existing path compilation split: [src/core/compiler/compile-redactor-plan.ts](/Users/ben.green/Code/deep-redact/src/core/compiler/compile-redactor-plan.ts:199)
- Current package and scripts: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)
- Project context: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)

## Story Completion Status

Story context validated against the local create-story checklist and ready for development.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add a single canonical precedence fixture module that owns public order metadata, runtime cases, documentation-facing placeholders, expected outputs, and the Markdown renderer.
- Generate `docs/architecture/precedence.md` from that fixture source and include it in the existing generated-file workflow and build-gated drift verification.
- Add API contract tests that exercise the fixture array through `deepRedact`, assert the required precedence edges, assert duplicate canonical selector initialisation failure, and compare the full generated Markdown with the committed document.
- Preserve the existing runtime surface; no `src/` runtime or validation changes were required.

### Debug Log References

- 2026-05-22: Manual `validate-create-story` review used [.agents/skills/bmad-create-story/checklist.md](/Users/ben.green/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md:1) because the older `_bmad/core/tasks/validate-workflow.xml` path is not present in this repository snapshot.
- Validation checked Story `4.4` against the source Epic `4` acceptance criteria, the architecture precedence contract, Story `2.5` runtime precedence coverage, Story `4.3` fixture-corpus pattern, live package scripts, and current source seams.
- 2026-05-22: Red phase confirmed the focused normative matrix suite failed because `test/fixtures/precedence-matrix/index.js` did not exist.
- 2026-05-22: Focused normative matrix suite passed with 17 tests after adding the fixture renderer, generated document, and contract assertions.
- 2026-05-22: `pnpm run lint`, `pnpm run verify-generated-files`, `pnpm run test:contract`, and `pnpm run test` all passed after implementation.
- 2026-05-22: Code review found four patch findings for documentation/runtime drift protection, complete matrix-row proof, duplicate example input coverage, and stricter documentation outcome typing; all were fixed and reverified.

### Completion Notes List

- Tightened drift-protection guidance so the precedence document must be regenerated by the default generated-file workflow and verified by `pnpm run verify-generated-files` or another build-gated path.
- Added fixture guardrails for canonical duplicate selectors, exact string-path specificity, function-censor documentation rendering, and whole-value removal versus substring replacement.
- Created `test/fixtures/precedence-matrix/index.ts` as the canonical source for the public precedence order, worked examples, runtime options, expected outputs, initialisation failure, call-count instrumentation, and Markdown rendering.
- Published generated runtime documentation at `docs/architecture/precedence.md` with the total order, overlap matrix, additional rules, and fixture-backed examples.
- Added generated-file workflow support so `pnpm run generate` updates the precedence document and `pnpm run verify-generated-files` fails on documentation drift.
- Added `describe('Normative precedence matrix', ...)` contract coverage for the public order, every successful fixture, duplicate canonical selector failure, every required precedence edge, same-layer exact string-path specificity, and full rendered Markdown parity.
- Added review follow-up coverage that asserts every published matrix row has exercised fixture metadata and that documentation fields stay aligned with runtime cases.
- Confirmed the existing runtime already satisfies the matrix; no `src/` runtime, validation, or public API changes were needed.

### File List

- `_bmad-output/implementation-artifacts/4-4-publish-and-prove-a-normative-precedence-matrix-for-overlapping-targeting-rules.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/architecture/precedence.md`
- `package.json`
- `scripts/generated-files.ts`
- `scripts/generate-precedence-doc.ts`
- `scripts/verify-generated-files.ts`
- `test/contract/api/create-redactor.test.ts`
- `test/fixtures/precedence-matrix/index.ts`

## Change Log

- 2026-05-22: Validated Story `4.4` against the local create-story checklist and tightened documentation drift, fixture rendering, duplicate-canonical, exact specificity, and whole-value removal guidance while keeping status `ready-for-dev`.
- 2026-05-22: Implemented the normative precedence fixture set, generated public precedence contract, drift protection, and contract tests; moved story to review.
- 2026-05-22: Resolved code review patch findings and moved story to done.
