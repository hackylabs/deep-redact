# Story 4.5: Enforce a One-Way Redaction Deny-List Across Public Surface and Outputs

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want Deep Redact to enforce an explicit one-way deny-list across its public surface and returned outputs,
so that redacted data cannot be reversed through supported API or output artefacts.

## Acceptance Criteria

1. Given the shipped public package surface, including all public factory exports, named aliases, compatibility aliases, and adapter entrypoints, when that surface is enumerated, then it exposes no public export, method, option, or adapter entry whose purpose is to `restore`, `unredact`, `reveal`, `decode`, or otherwise reverse redaction output.
2. Given the public package surface is inspected, when names and exported entrypoints are reviewed, then no restore-oriented alias or compatibility shim is present under any supported public name.
3. Given a representative structured-output fixture set covering ordinary redacted values, circular markers, transformed values, ignored branches, and `[UNSUPPORTED]` placeholders, when structured outputs are inspected after redaction, then no enumerable property, non-enumerable property, symbol-keyed property, or attached metadata field contains the original sensitive value or a reversible handle to it.
4. Given a structured output fixture is inspected, when object graph metadata is reviewed, then no lookup table, hidden original, restore token, encoded original payload, or reversible envelope is present anywhere in the returned output.
5. Given a representative serialised-output fixture set covering the same output families, when serialised outputs are inspected after redaction, then no restore token, reversible envelope, encoded original payload, or recoverable original-value field is present in the returned string.
6. Given transformed outputs such as circular markers, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, `URL`, or `[UNSUPPORTED]` placeholders appear in structured or serialised output, when they are inspected, then they expose only the documented operational representation and no supported reverse path from that representation is documented or exposed through the public surface.
7. Given migration-facing or capability documentation describes divergences from `fast-redact` or prior Deep Redact versions, when restore-related expectations are documented, then the documentation states explicitly that Deep Redact does not support restore or unredact capability.
8. Given the one-way redaction contract suite, when it is executed, then it covers the deny-list against the public surface, structured outputs, and serialised outputs using explicit automated tests.

## Tasks / Subtasks

- [x] Create one canonical one-way deny-list fixture and scanner module (AC: 1-6, 8)
  - [x] Add `test/fixtures/one-way-deny-list/index.ts` as the source of truth for denied public terms, fixture payload builders, expected outputs, encoded sentinel variants, surface enumeration helpers, graph scanners, and documentation rendering if documentation is generated from the fixture.
  - [x] Include the exact denied intent terms from the story: `restore`, `unredact`, `reveal`, and `decode`; include related term forms only when they cannot false-positive against normal library words.
  - [x] Use unique sentinel source values for data expected to be redacted, for example `story-4-5-secret-value`, and derive raw, base64, URI-encoded, and hex variants so serialised-output checks prove the original was not hidden in an obvious reversible encoding.
  - [x] Keep deliberately ignored branches distinct from sensitive branches. Ignored output may legitimately preserve an ignored value by policy, so do not use the sensitive sentinel inside the ignored branch unless the fixture explicitly documents and excludes it from the redaction-denial assertion.
  - [x] Implement output graph inspection with `Reflect.ownKeys(...)` and property descriptors so enumerable properties, non-enumerable properties, symbol keys, and attached metadata are all checked without accidentally invoking getters.
  - [x] Track source object identities that contained sensitive values and assert the returned structured graph does not expose those original objects as handles.
  - [x] Make scanner failure messages name the offending path, denied value, key, descriptor, or identity handle so failures are actionable.

- [x] Prove the public surface has no restore-like API (AC: 1, 2, 8)
  - [x] Extend package-surface tests to enumerate ESM and CommonJS root exports from the built package and assert the public value exports remain exactly `createRedactor` and `deepRedact`.
  - [x] Assert the returned redactor function has no own restore-like methods or attached properties by checking `Reflect.ownKeys(redact)`.
  - [x] Assert `package.json` exposes only `.` and `./package.json`; no adapter, compatibility, or subpath export may contain a denied term.
  - [x] Assert generated declarations expose no denied public type, value, method, or option names. Prefer inspecting the generated declaration export surface and consumer fixture type checks rather than scanning unrelated comments.
  - [x] Add explicit validation cases that root options such as `restore`, `unredact`, `reveal`, and `decode` fail initialisation as unsupported options.
  - [x] Add path-rule validation cases where restore-like nested options fail under `paths: [{ path: 'account.secret', ... }]`; these prove denied capability cannot be smuggled into per-rule configuration.
  - [x] If any compatibility alias or adapter entrypoint is added while implementing this story, it must be covered by the same deny-list helper. Do not create a `src/compat/` or `src/adapters/` entrypoint solely for this story.

- [x] Prove structured outputs contain no reversible data or handles (AC: 3, 4, 6, 8)
  - [x] Build a representative fixture that includes ordinary redacted object properties, circular references, repeated identities, transformed `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, `URL` values, an ignored branch with safe non-sensitive data, and one branch that degrades to `[UNSUPPORTED]`.
  - [x] Redact the fixture with `serialise: false` through the public `deepRedact` factory, not internal runtime imports.
  - [x] Assert the returned output matches the expected operational representation before running the denial scanner.
  - [x] Inspect the whole returned graph, including descriptors and symbol keys, for the sensitive sentinel, encoded sentinel variants, restore tokens, lookup-table shapes, hidden original fields, reversible envelopes, and original sensitive object identities.
  - [x] Include at least one non-enumerable source property and one symbol-keyed source property carrying sensitive sentinel data; the output must not expose either as copied metadata.
  - [x] Treat circular markers as operational metadata only: `_transformer: 'circular'`, `path`, and `value` may describe paths, but must not carry source payload values or object handles.
  - [x] Keep diagnostics assertions out of scope unless a failing branch requires a sink to prove output behaviour. Diagnostics leakage was already covered by Story `3.5`; this story is about public surface and returned output artefacts.

- [x] Prove serialised outputs contain no reversible data or handles (AC: 5, 6, 8)
  - [x] Reuse the same representative fixture with `serialise: true` and assert the returned string equals a committed golden string.
  - [x] Run the deny-list string scanner against the returned string for raw and encoded sentinel values plus restore-token and reversible-envelope field names.
  - [x] Add a custom `serialise` function case that records the value passed into the function, asserts that value is already redacted, and returns a stable JSON wrapper. This proves Deep Redact passes only the redacted structure to user serialisation.
  - [x] Do not claim Deep Redact can control arbitrary user-provided serialiser code after it receives the redacted value. The contract is that the supported runtime never passes original source data or reversible handles into `serialise`.

- [x] Document the one-way contract and protect it from drift (AC: 7, 8)
  - [x] Publish a concise product/runtime document such as `docs/architecture/one-way-redaction.md`, or update the generated README template if that is the chosen capability surface. The document must explicitly state that Deep Redact supports no restore or unredact capability.
  - [x] State the relevant divergence from `fast-redact` and earlier Deep Redact versions: no `restore`, no `unredact`, no restore token, no reversible metadata envelope, and no public compatibility shim for reversing output.
  - [x] If the document includes examples or public surface listings, generate them from `test/fixtures/one-way-deny-list/index.ts` or another single source of truth and wire them into `pnpm run generate` plus `pnpm run verify-generated-files`.
  - [x] Do not hand-edit generated Markdown after the renderer exists.
  - [x] Keep public documentation free of BMAD planning terminology.

- [x] Verify the story implementation (AC: 1-8)
  - [x] Start with a focused red phase such as `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts test/build.test.ts test/contract/exports/import.test.ts test/contract/exports/require.test.ts -t "one-way|restore|public surface"` once the failing tests are added.
  - [x] If documentation generation changes, run `source .agents/initialise-env.sh && pnpm run generate`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify-generated-files`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if any `src/`, generated-file, build-surface, or output-shaping code changes.

### Review Findings

- [x] [Review][Patch] Root package surface checks miss non-enumerable public names [test/build.test.ts:41]
- [x] [Review][Patch] Declaration deny-list scanner misses public method and mutable option forms [test/fixtures/one-way-deny-list/index.ts:214]
- [x] [Review][Patch] Structured graph scanner can miss opaque lookup handles and accessor leaks [test/fixtures/one-way-deny-list/index.ts:144]
- [x] [Review][Patch] Serialised-output scanner misses common reversible encodings [test/fixtures/one-way-deny-list/index.ts:112]
- [x] [Review][Patch] Returned redactor prototype is not checked for restore-like members [test/contract/api/create-redactor.test.ts:473]
- [x] [Review][Patch] One-way documentation overstates caller-controlled policy guarantees [docs/architecture/one-way-redaction.md:4]

## Dev Notes

### Story Intent

- Story `4.5` closes FR21 by proving Deep Redact remains one-way at the package surface and in returned output artefacts. It should produce a reusable deny-list contract and representative output scans, not a new redaction mode.
- This story is a negative security proof. Avoid adding public options, compatibility aliases, adapters, restore helpers, decode helpers, reversible metadata, or side-channel lookup tables.
- The current implementation already compiles configuration once and uses per-invocation `WeakMap` runtime state. The expected implementation is mostly tests, fixtures, and documentation. Runtime changes should be narrowly targeted if a new denial test exposes a real leak. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:161)]

### Technical Requirements

- The public package facade is `src/index.ts`. It currently exports `deepRedact` and `createRedactor` as the same factory, plus public types only. Do not add a new value export for this story. [Source: [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts:34)]
- `DeepRedactOptions` currently exposes `caseSensitiveKeyMatch`, `censor`, `diagnostics`, `fuzzyKeyMatch`, `keys`, `paths`, `remove`, `retainStructure`, `serialise`, `stringTests`, `transformers`, `ignoredValueTypes`, and `replaceStringByLength`. Restore-like names are not part of the type surface. [Source: [src/types/config.ts](/Users/ben.green/Code/deep-redact/src/types/config.ts:21)]
- Runtime validation rejects unsupported root option names through `validateAllowedOptions(...)`, so explicit denial tests should assert restore-like options fail initialisation rather than introducing special-case validation branches. [Source: [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:12)]
- Per-path rule validation already rejects unsupported path-rule option names. Use this path for nested restore-like option tests. [Source: [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:39)]
- Serialisation is a final adapter step: `createRedactor(...)` calls `redactValue(...)` first and then `JSON.stringify(...)` or the configured serialiser. Custom-serialiser tests should assert the serialiser receives the redacted structure, not original source data. [Source: [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts:11)]
- Runtime output construction uses `setObjectEntry(...)` to define enumerable values on new plain objects. The denial scanner still needs `Reflect.ownKeys(...)` and descriptors because the acceptance criteria explicitly include non-enumerable and symbol-keyed metadata. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:137)]
- Runtime state uses `WeakMap` identity tracking and should remain internal to one invocation. The returned output must never expose those maps or original source object identities as restore handles. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:102)]
- Built-in transformed representations are operational output only: `_transformer: 'bigint'`, `_transformer: 'date'`, `_transformer: 'error'`, `_transformer: 'map'`, `_transformer: 'regex'`, `_transformer: 'set'`, and `_transformer: 'url'`. They must not grow restore tokens or hidden originals. [Source: [src/transformers/built-ins.ts](/Users/ben.green/Code/deep-redact/src/transformers/built-ins.ts:9)]
- `[UNSUPPORTED]` is the local degradation placeholder and must remain non-reversible. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:110)]

### Architecture Compliance

- The PRD excludes reversible redaction, restore, or unredact behaviour from scope. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:152)]
- FR21 states that developers must be able to use the library without any capability to restore or unredact original values. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:418)]
- NFR6 requires one-way redaction only and no restore or unredact capability. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:464)]
- The architecture says no restore, unredact, or reversible metadata is stored or exposed. This story should prove that contract at the public package surface and output artefact level. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:171)]
- `fast-redact` parity is deliberate and limited; lack of restore behaviour is an intentional divergence that must be documented. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:146)]
- Optional console integration is deferred to Story `4.6`. This story may define a reusable deny-list helper for future adapters, but it must not implement console redaction. [Source: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1233)]

### Library and Framework Requirements

- Use the live pinned repository baseline: Node `24.14.1`, `pnpm@10.33.0`, TypeScript `6.0.2`, Vitest `4.1.4`, `tsdown@0.21.7`, and ESLint `9.39.4`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10)]
- Every Node, package-manager, build, lint, test, generation, benchmark, or release command must be prefixed with `source .agents/initialise-env.sh` from the repository root. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:9)]
- Do not add runtime dependencies. The package is currently zero-runtime-dependency, with all listed dependencies under `devDependencies`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:73)]
- Keep ESM TypeScript imports consistent with the repo's NodeNext setup and explicit `.js` specifiers for source and test imports. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:4)]
- No external version research or dependency upgrade is required for this story. The work relies on the local public API, built package output, and Vitest assertions.

### File Structure Requirements

- Expected new fixture source: `test/fixtures/one-way-deny-list/index.ts`
- Expected contract test target for runtime and option denial: `test/contract/api/create-redactor.test.ts`
- Expected package-surface targets: `test/build.test.ts`, `test/contract/exports/import.test.ts`, `test/contract/exports/require.test.ts`, `test/fixtures/consumers/esm/index.mjs`, and `test/fixtures/consumers/cjs/index.cjs`
- Expected type-surface targets if declarations are extended: `test/contract/types/declarations.test.ts`, `test/fixtures/consumers/types/index.ts`, and `test/fixtures/consumers/types-cjs/index.cts`
- Expected documentation target if generated: `docs/architecture/one-way-redaction.md`
- Expected generated-file targets if documentation is generated: `scripts/generated-files.ts`, `scripts/generate-one-way-redaction-doc.ts`, `scripts/verify-generated-files.ts`, and `package.json`
- Conditional runtime targets only if a leak is proven: `src/core/runtime/redact-value.ts`, `src/core/create-redactor.ts`, or `src/transformers/built-ins.ts`
- Avoid editing legacy-looking `src/utils/` and `src/types.ts` for this story. They are not part of the current primary package facade or TypeScript include set. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:17)]

### Testing Requirements

- Prefer public API tests through `deepRedact` and built-package tests through ESM/CommonJS consumer fixtures. Only inspect internals when the test is explicitly about generated declarations or build artefacts.
- Use `toStrictEqual` for expected structured output before running the graph scanner.
- Use `Reflect.ownKeys(...)`, `Object.getOwnPropertyDescriptor(...)`, and a `WeakSet` in the scanner to avoid infinite recursion and to cover non-enumerable and symbol-keyed metadata.
- Avoid false positives from Vitest APIs such as `vi.restoreAllMocks()` by scanning only the public package surface, generated declaration exports, configured options, and returned outputs.
- Include both structured and serialised paths for the same representative payload so the two assertions cannot drift in coverage.
- Keep committed serialised strings as canaries where property order matters, following the structured-determinism fixture pattern. [Source: [test/fixtures/structured-determinism/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/structured-determinism/index.ts:59)]

### Previous Story Intelligence

- Story `4.4` established the current pattern for fixture-backed public contracts plus generated documentation drift protection. Reuse that approach for one-way documentation instead of hand-copying examples into docs and tests. [Source: [_bmad-output/implementation-artifacts/4-4-publish-and-prove-a-normative-precedence-matrix-for-overlapping-targeting-rules.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-4-publish-and-prove-a-normative-precedence-matrix-for-overlapping-targeting-rules.md:225)]
- Story `4.4` review found gaps when published rows were not each fixture-backed and when documentation outcome types were too loose. Apply that lesson here: every documented deny-list claim should map to an executable assertion, and fixture types should make required fields impossible to omit. [Source: [_bmad-output/implementation-artifacts/4-4-publish-and-prove-a-normative-precedence-matrix-for-overlapping-targeting-rules.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-4-publish-and-prove-a-normative-precedence-matrix-for-overlapping-targeting-rules.md:77)]
- Story `4.1` and Story `4.2` created `test/fixtures/structured-determinism/index.ts` for structured and serialised fixture families covering transformed, circular, ignored, and unsupported outputs. Reuse those coverage ideas, but create a focused one-way fixture because this story needs descriptor, symbol, encoded-sentinel, and identity-handle checks. [Source: [test/fixtures/structured-determinism/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/structured-determinism/index.ts:1037)]
- Story `4.3` proved that special test harnesses belong in `test/fixtures/` and should not become public runtime controls. Keep one-way scanning helpers in tests, not in `src/`. [Source: [test/fixtures/exact-path-equivalence/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/exact-path-equivalence/index.ts:1)]

### Recent Git Intelligence

- `e416d91 chore(rules): publish and prove normative precedence matrix for overlapping rules` completed Story `4.4`; follow its fixture-backed documentation and contract-test style.
- `3a1e672 tests(exact path fast lane redaction): add coverage` reinforces the current pattern of adding focused fixtures under `test/fixtures/` and appending public API contract coverage.
- `68aa0cb fix(story 1.3): incorrect status` touched tracking, so check `sprint-status.yaml` after this story file is created.
- `7dbc5ca tests(output): deterministic structured output across repeated runs` and earlier Epic 4 commits established structured/serialised canaries that this story can build on.
- `a3e37c1 chore(agents): optimise agent initialisation with correct environment toolchain` reinforces the environment bootstrap requirement.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:3)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`. This story file belongs under `_bmad-output/implementation-artifacts/`; public product/runtime docs belong under `docs/`. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:16)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:22)]

### Project Structure Notes

- `docs/architecture/precedence.md` already exists and is generated. A new one-way document should follow the same generated-file discipline if examples or exported surface listings are included.
- `README.md` is generated from `scripts/templates/README.md.template`; do not hand-edit README. If README is the chosen documentation surface for AC7, update the template and generated-file verification together.
- The active package export map is generated and limited to the root entrypoint plus `./package.json`. Do not hand-edit package export outputs outside the generation scripts.
- `test/load/` and `test/bench/` import `fast-redact` for comparison only. They are not public package-surface evidence.

### Open Questions / Assumptions

- Assume the one-way denial fixture should be new rather than extending structured determinism fixtures, because it needs metadata and encoded-sentinel scanning that would make determinism fixtures harder to read.
- Assume `docs/architecture/one-way-redaction.md` is an acceptable documentation target if the implementer chooses a dedicated document; no migration docs exist yet in the repository.
- Assume no runtime source change is needed unless the new scanner discovers a hidden original value, encoded original, source object identity, or restore-like property in returned output.
- Assume user-provided `censor` functions are caller-controlled and intentionally receive the matched value as part of the public API; this story must not pretend otherwise. The one-way guarantee applies to supported public restore surfaces and returned output artefacts.
- Assume user-provided `serialise` functions are caller-controlled after Deep Redact passes them a value. The supported contract is that Deep Redact passes only the redacted structure to `serialise`, not original source data or reversible handles.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1190)
- FR21: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:418)
- NFR6: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:464)
- One-way architecture contract: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:171)
- Public API facade: [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts:34)
- Public options type: [src/types/config.ts](/Users/ben.green/Code/deep-redact/src/types/config.ts:21)
- Unsupported-option validation: [src/core/validation/validate-config.ts](/Users/ben.green/Code/deep-redact/src/core/validation/validate-config.ts:12)
- Serialisation boundary: [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts:11)
- Runtime identity tracking: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:102)
- Built-in transformer outputs: [src/transformers/built-ins.ts](/Users/ben.green/Code/deep-redact/src/transformers/built-ins.ts:9)
- Structured and serialised fixture precedent: [test/fixtures/structured-determinism/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/structured-determinism/index.ts:1037)
- Generated-file helper precedent: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:58)
- Current package and scripts: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)
- Project context: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Keep the one-way proof in test fixtures and contract tests, with no runtime source changes unless a scanner exposed a real returned-output leak.
- Use `test/fixtures/one-way-deny-list/index.ts` as the single source of truth for denied terms, sentinel variants, expected output, public-surface scanners, declaration scanners, output graph scanners, and generated documentation text.
- Exercise the public package surface through built ESM/CommonJS artefacts, consumer fixtures, generated declarations, unsupported option validation, and returned redactor own-key inspection.
- Prove returned artefacts through public `deepRedact` calls for structured, serialised, and custom-serialiser paths.

### Debug Log References

- 2026-05-22: Created from local `.agents/skills/bmad-create-story/workflow.md` for requested Story `4.5`.
- 2026-05-22: Loaded `_bmad/bmm/config.yaml`, sprint status, PRD, architecture, epics, project context, Story `4.4`, live package scripts, public API files, validation code, runtime output code, transformer outputs, structured/serialised fixtures, package-surface tests, and recent git history.
- 2026-05-22: Manual create-story checklist pass checked for reinvention risks, wrong public surface, missing output metadata scanning, generated-document drift risks, false positives from test-only `restore` names, and scope bleed into Story `4.6`.
- 2026-05-22: Confirmed red phase with the focused restore/public-surface command failing on the missing `test/fixtures/one-way-deny-list/index.ts` module.
- 2026-05-22: Ran focused one-way contract tests after fixture implementation: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/api/create-redactor.test.ts -t "One-way"` passed.
- 2026-05-22: Ran export and declaration slices: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/exports/import.test.ts test/contract/exports/require.test.ts test/contract/types/declarations.test.ts` passed.
- 2026-05-22: Ran documentation generation and drift checks: `source .agents/initialise-env.sh && pnpm run generate` and `source .agents/initialise-env.sh && pnpm run verify-generated-files` passed.
- 2026-05-22: Ran required regression checks: `source .agents/initialise-env.sh && pnpm run test:contract`, `source .agents/initialise-env.sh && pnpm run lint`, and `source .agents/initialise-env.sh && pnpm run test` all passed.
- 2026-05-22: Code review patch pass tightened public surface enumeration, declaration scanning, output graph scanning, serialised encoding checks, redactor prototype checks, and one-way documentation caveats.
- 2026-05-22: Review verification passed: `source .agents/initialise-env.sh && pnpm run verify-generated-files`, `source .agents/initialise-env.sh && pnpm run test:contract`, `source .agents/initialise-env.sh && pnpm run lint`, and `source .agents/initialise-env.sh && pnpm run test`.

### Completion Notes List

- Created Story `4.5` with explicit tasks for a canonical deny-list fixture, public surface enumeration, structured output graph scanning, serialised output scanning, one-way documentation, and verification commands.
- Added guardrails to avoid extending the public API, reviving legacy utilities, creating console adapters early, or relying on broad string scans that false-positive on test-only helper names.
- Captured previous Epic 4 fixture and generated-document patterns so implementation can reuse proven repository conventions.
- Added the canonical one-way deny-list fixture and scanners covering denied terms, sentinel encodings, public names, generated declaration names, structured graph descriptors, symbol keys, non-enumerable properties, and source identity handles.
- Added public API contract coverage proving unsupported restore-like root and path-rule options fail initialisation, built ESM/CommonJS root exports remain exactly `createRedactor` and `deepRedact`, the package export map remains limited, and returned redactors expose no restore-like own keys.
- Added structured and serialised output contract coverage through public `deepRedact`, including ordinary redaction, circular markers, repeated identities, built-in transformed values, an ignored safe branch, an `[UNSUPPORTED]` branch, non-enumerable/symbol source sensitive values, and a custom serialiser receiving only the redacted structure.
- Added generated one-way redaction documentation and wired it into `pnpm run generate` plus `pnpm run verify-generated-files`.
- No runtime source changes or new dependencies were required.
- Addressed code review findings by extending deny-list coverage across non-enumerable package keys, redactor prototypes, broader declaration shapes, built-in object slots, JSON-escaped serialised output, and caller-controlled policy documentation boundaries.

### Change Log

- 2026-05-22: Implemented fixture-backed one-way redaction contract tests, generated documentation, generated-file verification wiring, and story/sprint tracking updates.
- 2026-05-22: Resolved review findings and marked the story done.

### File List

- `_bmad-output/implementation-artifacts/4-5-enforce-a-one-way-redaction-deny-list-across-public-surface-and-outputs.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/architecture/one-way-redaction.md`
- `package.json`
- `scripts/generate-one-way-redaction-doc.ts`
- `scripts/generated-files.ts`
- `scripts/verify-generated-files.ts`
- `test/build.test.ts`
- `test/contract/api/create-redactor.test.ts`
- `test/contract/exports/import.test.ts`
- `test/contract/exports/require.test.ts`
- `test/contract/types/declarations.test.ts`
- `test/fixtures/consumers/cjs/index.cjs`
- `test/fixtures/consumers/esm/index.mjs`
- `test/fixtures/consumers/types-cjs/index.cts`
- `test/fixtures/consumers/types/index.ts`
- `test/fixtures/one-way-deny-list/index.ts`
