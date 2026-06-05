# Story 5.12: Add Worked Examples for Fuzzy Key Matching, Case-Insensitive Key Matching, and Path-Segment Ignore Selectors

Status: done

Readiness correction: Story 5.12 absorbs the former Epic 9 worked-example gap so FR31 remains in the rollout and documentation epic. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:192)]

## Story

As a backend engineer,
I want verified worked examples for fuzzy key matching, case-insensitive key matching, and path-segment ignore selectors,
so that these three implemented and tested features are documented with the same rigour as the rest of the Deep Redact feature surface.

## Context

All three features are implemented in source and covered by unit and contract tests, but they do not yet appear in the `docs/examples/` worked-example system. Story 5.7's required coverage matrix did not list them, so the gap was not caught by that story. This story closes that gap with three separate manifest rows, example source files, fixture directories, expected output files, and generated doc files. It implements FR31 and provides example evidence for FR6, FR7, and FR13. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:1845)]

FR31 now explicitly requires examples for `fuzzy key matching`, `case-insensitive key matching`, and `path-segment ignore selectors`; do not treat these as optional ecosystem extras. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:437)]

## Acceptance Criteria

1. **Given** the canonical example manifest at `docs/examples/manifest.json`
   **When** Story 5.12 is complete
   **Then** a row with `id: "fuzzy-key-matching"` and `category: "targeting"` is present in the manifest
   **And** `docs/examples/examples/fuzzy-key-matching.ts` demonstrates a redactor configured with `fuzzyKeyMatch: true` and a literal key rule
   **And** `docs/examples/fixtures/fuzzy-key-matching/` contains an input payload where a payload key contains the configured literal as a substring, not an exact match
   **And** `expected.json` asserts that the matched value is redacted
   **And** `docs/examples/fuzzy-key-matching.md` is generated from or validated against the same fixture and source.

2. **Given** the canonical example manifest at `docs/examples/manifest.json`
   **When** Story 5.12 is complete
   **Then** a row with `id: "case-insensitive-key-matching"` and `category: "targeting"` is present in the manifest
   **And** `docs/examples/examples/case-insensitive-key-matching.ts` demonstrates a redactor configured with `caseSensitiveKeyMatch: false` and a literal key rule
   **And** `docs/examples/fixtures/case-insensitive-key-matching/` contains an input payload where the payload key differs in case from the configured key
   **And** `expected.json` asserts that the matched value is redacted
   **And** `docs/examples/case-insensitive-key-matching.md` is generated from or validated against the same fixture and source.

3. **Given** the canonical example manifest at `docs/examples/manifest.json`
   **When** Story 5.12 is complete
   **Then** a row with `id: "path-segment-ignore"` and `category: "targeting"` is present in the manifest
   **And** `docs/examples/examples/path-segment-ignore.ts` demonstrates a redactor configured with a structured path selector containing an `{ ignore: '<key>' }` segment, such as `['users', { ignore: 'admin' }, 'email']`
   **And** `docs/examples/fixtures/path-segment-ignore/` contains an input payload with sibling branches where the ignored branch value is not redacted and a non-ignored sibling is redacted
   **And** `expected.json` asserts this difference
   **And** `docs/examples/path-segment-ignore.md` is generated from or validated against the same fixture and source.

4. **Given** the three new manifest rows
   **When** the example validation harness from Story 5.6 runs
   **Then** all three rows pass schema validation, fixture resolution, example execution, and expected-result comparison
   **And** no existing manifest row is broken by the additions.

5. **Given** the generated example documentation lockstep from Story 5.8
   **When** the generated-files verification runs
   **Then** the three new `docs/examples/*.md` files match the output generated from their manifest rows, source files, fixtures, and expected results
   **And** the existing generated example docs remain unchanged unless their own source inputs changed.

6. **Given** the example manifest contract tests
   **When** Story 5.12 is complete
   **Then** `test/contract/examples/example-manifest.test.ts` expects 20 verified rows in the canonical manifest order
   **And** its non-migration row-count assertion expects 18 non-migration rows.

7. **Given** the platform standardisation guide lists validated worked examples
   **When** Story 5.12 is complete
   **Then** `scripts/standardisation-guide.ts` includes capability-example mappings for `fuzzy-key-matching`, `case-insensitive-key-matching`, and `path-segment-ignore`
   **And** `test/contract/platform/standardisation-guide.test.ts` asserts the three generated example links are present
   **And** `docs/platform/standardisation-guide.md` is regenerated from the updated capability list.

8. **Given** this story's scope
   **When** the implementation is reviewed
   **Then** it covers the three new manifest rows, source files, fixture directories, expected output files, generated example doc files, standardisation-guide link coverage, and required contract test expectation updates only
   **And** no changes to the example validation harness, manifest schema, runtime redaction behaviour, public API, migration fixtures, or existing example behaviour are required.

## Tasks / Subtasks

- [x] Add the `fuzzy-key-matching` worked example. (AC: 1, 4, 5)
  - [x] Add a manifest row with `id`, `category`, `docTarget`, `sourceFile`, `fixtureDir`, `assertionMode`, and `expectedResultFile` exactly matching the existing row schema.
  - [x] Add `docs/examples/examples/fuzzy-key-matching.ts`.
  - [x] Add `docs/examples/fixtures/fuzzy-key-matching/input.json`.
  - [x] Add `docs/examples/fixtures/fuzzy-key-matching/expected.json`.
  - [x] Generate `docs/examples/fuzzy-key-matching.md` via the existing example-doc generator.

- [x] Add the `case-insensitive-key-matching` worked example. (AC: 2, 4, 5)
  - [x] Add the manifest row.
  - [x] Add `docs/examples/examples/case-insensitive-key-matching.ts`.
  - [x] Add `docs/examples/fixtures/case-insensitive-key-matching/input.json`.
  - [x] Add `docs/examples/fixtures/case-insensitive-key-matching/expected.json`.
  - [x] Generate `docs/examples/case-insensitive-key-matching.md`.

- [x] Add the `path-segment-ignore` worked example. (AC: 3, 4, 5)
  - [x] Add the manifest row.
  - [x] Add `docs/examples/examples/path-segment-ignore.ts`.
  - [x] Add `docs/examples/fixtures/path-segment-ignore/input.json`.
  - [x] Add `docs/examples/fixtures/path-segment-ignore/expected.json`.
  - [x] Generate `docs/examples/path-segment-ignore.md`.

- [x] Update the existing example manifest contract test expectations. (AC: 6)
  - [x] Change the verified-row count from `17` to `20`.
  - [x] Add the three new row ids to the ordered `result.map(r => r.id)` expectation.
  - [x] Change the non-migration row count from `15` to `18`.

- [x] Update standardisation-guide coverage for the three newly validated examples. (AC: 7)
  - [x] Add `fuzzy-key-matching`, `case-insensitive-key-matching`, and `path-segment-ignore` to `CAPABILITY_EXAMPLES` in `scripts/standardisation-guide.ts`.
  - [x] Add the three generated example links to the required-link assertions in `test/contract/platform/standardisation-guide.test.ts`.
  - [x] Generate `docs/platform/standardisation-guide.md` via the existing standardisation-guide generator.

- [x] Run the existing generation and verification commands. (AC: 4, 5, 6, 7)
  - [x] Run `source .agents/initialise-env.sh && pnpm run generate-example-docs`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run generate:standardisation-guide`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:examples`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run build`.
  - [x] Run targeted lint/static checks for touched TypeScript files; keep unrelated global lint cleanup in Story 8.10.

### Review Findings

- [x] [Review][Decision] Standardisation-guide example links use repo-root paths that may not resolve from `docs/platform/standardisation-guide.md` — resolved by patching the generator to emit Markdown-relative links from the guide location, adding a contract assertion that local Markdown links resolve to real files, and regenerating `docs/platform/standardisation-guide.md`.

## Dev Notes

### Current Worked-Example System

- `docs/examples/manifest.json` is the canonical example manifest. Each row must have exactly these keys in order: `id`, `category`, `docTarget`, `sourceFile`, `fixtureDir`, `assertionMode`, `expectedResultFile`. [Source: [scripts/example-validation.ts](scripts/example-validation.ts:48)]
- Non-migration rows must use fixture directories exactly equal to `docs/examples/fixtures/<id>`. The validator enforces this by comparing `fixtureDir` to the row id. [Source: [scripts/example-validation.ts](scripts/example-validation.ts:221)]
- Example source files must export a named `runExample` function or a default function. The verifier imports the source file, calls it with `input.json`, and compares the returned value with the expected result. [Source: [scripts/example-validation.ts](scripts/example-validation.ts:242)]
- `structured-output` rows compare JSON values with `isDeepStrictEqual`; these three examples should all use `assertionMode: "structured-output"` and `expectedResultFile: "expected.json"`. [Source: [scripts/example-validation.ts](scripts/example-validation.ts:259)]
- Generated example docs are produced from the manifest row, source code, `input.json`, and expected result by `buildGeneratedExampleDoc`. Do not hand-author their final markdown content. [Source: [scripts/generated-files.ts](scripts/generated-files.ts:88)]
- `scripts/generate-example-docs.ts` writes all generated docs returned by `buildAllGeneratedExampleDocs`. Use it after adding the new rows, sources, and fixtures. [Source: [scripts/generate-example-docs.ts](scripts/generate-example-docs.ts:1)]
- `verify:examples` runs `pnpm run build` before `scripts/verify-examples.ts`, so generated docs must already be in lockstep before the example verifier can pass. [Source: [package.json](package.json:81)]

### Required Manifest Rows

Insert the new rows among the existing `targeting` examples, preserving the relative order of all existing rows. Recommended order:

1. Keep `singleton-setup`.
2. Keep `key-targeting`.
3. Add `fuzzy-key-matching`.
4. Add `case-insensitive-key-matching`.
5. Keep `regex-property-matching`.
6. Keep `path-targeting`.
7. Keep `regex-path-segment-matching`.
8. Add `path-segment-ignore`.
9. Keep all remaining existing rows in their current order.

Use these exact row shapes:

```json
{
  "id": "fuzzy-key-matching",
  "category": "targeting",
  "docTarget": "docs/examples/fuzzy-key-matching.md",
  "sourceFile": "docs/examples/examples/fuzzy-key-matching.ts",
  "fixtureDir": "docs/examples/fixtures/fuzzy-key-matching",
  "assertionMode": "structured-output",
  "expectedResultFile": "expected.json"
}
```

```json
{
  "id": "case-insensitive-key-matching",
  "category": "targeting",
  "docTarget": "docs/examples/case-insensitive-key-matching.md",
  "sourceFile": "docs/examples/examples/case-insensitive-key-matching.ts",
  "fixtureDir": "docs/examples/fixtures/case-insensitive-key-matching",
  "assertionMode": "structured-output",
  "expectedResultFile": "expected.json"
}
```

```json
{
  "id": "path-segment-ignore",
  "category": "targeting",
  "docTarget": "docs/examples/path-segment-ignore.md",
  "sourceFile": "docs/examples/examples/path-segment-ignore.ts",
  "fixtureDir": "docs/examples/fixtures/path-segment-ignore",
  "assertionMode": "structured-output",
  "expectedResultFile": "expected.json"
}
```

### Example Source Guidance

- Follow the existing minimal source pattern in `docs/examples/examples/key-targeting.ts` and `docs/examples/examples/regex-path-segment-matching.ts`: import `deepRedact` from `@hackylabs/deep-redact`, initialise one redactor at module scope, and export `runExample`. [Source: [docs/examples/examples/key-targeting.ts](docs/examples/examples/key-targeting.ts:1)]
- Keep example source files comment-free; Story 5.7 intentionally made the code itself the documentation. [Source: [_bmad-output/implementation-artifacts/5-7-publish-verified-worked-examples-for-setup-targeting-replacement-output-runtime-and-console-behaviour.md](_bmad-output/implementation-artifacts/5-7-publish-verified-worked-examples-for-setup-targeting-replacement-output-runtime-and-console-behaviour.md:274)]
- Use public API option names exactly as implemented: `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, and structured path segments with `{ ignore: ... }`. These identifiers are API names, so do not convert them to British spelling. [Sources: [src/types.ts](src/types.ts:54), [src/types.ts](src/types.ts:62), [src/types/paths.ts](src/types/paths.ts:21)]

Suggested source shapes:

```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password'], fuzzyKeyMatch: true })

export const runExample = (input: unknown): unknown => redactor(input)
```

```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password'], caseSensitiveKeyMatch: false })

export const runExample = (input: unknown): unknown => redactor(input)
```

```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: [['users', { ignore: 'admin' }, 'email']] })

export const runExample = (input: unknown): unknown => redactor(input)
```

### Fixture Guidance

- Fuzzy key matching: the input should contain a key that contains the configured literal but is not exactly equal to it, for example `passwordHash` with `keys: ['password']`. Include at least one sibling field that must remain unchanged.
- Case-insensitive key matching: the input should contain a key that differs only by case from the configured literal, for example `PASSWORD` with `keys: ['password']`. Include a non-matching sibling such as `passwordHint` to prove this is not fuzzy matching.
- Path-segment ignore: use sibling branches under `users`, for example `admin` and `customer`. The `admin.email` value must remain unchanged and `customer.email` must be redacted.
- Keep expected outputs formatted consistently with existing one-line JSON fixture files unless the generated diff becomes unreadable.

### Contract Test Updates

`test/contract/examples/example-manifest.test.ts` currently asserts 17 verified rows and 15 non-migration rows. Update those exact assertions to 20 and 18. The ordered id list should include the three new ids in the same order used in `docs/examples/manifest.json`. [Source: [test/contract/examples/example-manifest.test.ts](test/contract/examples/example-manifest.test.ts:242)]

No new validator tests are required unless the implementation changes validator behaviour, which this story should avoid.

### Standardisation Guide Updates

Story 5.11's generated standardisation guide currently hard-codes 10 capability example links. After Story 5.12 adds the missing FR31 examples, leaving the guide unchanged would allow release guidance to omit newly validated capabilities without failing generated-file checks. [Sources: [scripts/standardisation-guide.ts](scripts/standardisation-guide.ts:10), [test/contract/platform/standardisation-guide.test.ts](test/contract/platform/standardisation-guide.test.ts:31)]

Update only the capability-example mapping and required-link assertions needed for:

- `docs/examples/fuzzy-key-matching.md`
- `docs/examples/case-insensitive-key-matching.md`
- `docs/examples/path-segment-ignore.md`

Then run `source .agents/initialise-env.sh && pnpm run generate:standardisation-guide` so `docs/platform/standardisation-guide.md` stays generated from canonical artefacts.

### Architecture Compliance

- `docs/examples/` is the declared home for worked examples and example documentation. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:889)]
- Generated documentation and release artefacts must be derived from source data rather than treated as primary source. For this story, manifest rows, source files, fixture inputs, and expected results are the maintained inputs; `docs/examples/*.md` files are generated outputs committed for release evidence. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:482)]
- The structured selector form is the correct public form for ignore segments. String selectors do not support ignore segments. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:266)]
- `{ ignore: ... }` matches any single segment except the ignored matcher, and a terminal ignore segment means all direct children except the ignored matcher. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:304)]
- Plain string key matching defaults to exact and case-sensitive. `fuzzyKeyMatch: true` makes string key matching contain the configured literal; `caseSensitiveKeyMatch: false` enables canonical case-insensitive matching. [Source: [src/core/compiler/compile-redactor-plan.ts](src/core/compiler/compile-redactor-plan.ts:243)]

### Latest Technical Specifics

No new external library, package-manager behaviour, browser API, or dependency version is introduced by this story. Use the repository-pinned toolchain and the implemented local public API. The relevant current technical specifics are already in-repo: Node `24.14.1`, `pnpm@10.33.0`, `deepRedact`, `fuzzyKeyMatch`, `caseSensitiveKeyMatch`, structured path selectors, and the existing example generation/verification scripts. [Sources: [project-context.md](project-context.md:18), [project-context.md](project-context.md:30)]

### Scope Boundaries

Do not change:

- `scripts/example-validation.ts`, unless an existing validator defect blocks the story and is recorded separately.
- `scripts/verify-examples.ts`.
- `scripts/generated-files.ts` or `scripts/generate-example-docs.ts`.
- Runtime source under `src/`.
- Existing example fixtures, source files, generated docs, or migration fixtures except for generated-doc rewrites that are byte-for-byte identical.
- Standardisation-guide content beyond adding the three newly validated example links and regenerating the guide from canonical artefacts.

### Deferred Work Register Check

The central deferred work register is `_bmad-output/implementation-artifacts/deferred-work-audit.md`. At story creation, it contains no open Story 5.12-specific item and no open standardisation-guide item for the three missing FR31 examples. It does contain the known global lint baseline failure, which is relevant only as a scope guard: Story 5.12 should run targeted lint/static checks for touched files, but it should not absorb repository-wide lint cleanup. [Source: [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md:46)]

### Previous Story Intelligence

- Story 5.6 established the manifest schema and validator. Its review patches hardened strict row keys, path traversal checks, async example execution, serialised-output type checks, and fixture-path scoping. Reuse those protections; do not weaken them. [Source: [_bmad-output/implementation-artifacts/5-6-establish-the-worked-example-manifest-and-validation-harness.md](_bmad-output/implementation-artifacts/5-6-establish-the-worked-example-manifest-and-validation-harness.md:81)]
- Story 5.7 added the 15 non-migration rows and updated the contract test from empty rows to real verified rows. Story 5.12 must repeat that pattern by updating the fixed row-count and ordered-id assertions. [Source: [_bmad-output/implementation-artifacts/5-7-publish-verified-worked-examples-for-setup-targeting-replacement-output-runtime-and-console-behaviour.md](_bmad-output/implementation-artifacts/5-7-publish-verified-worked-examples-for-setup-targeting-replacement-output-runtime-and-console-behaviour.md:73)]
- Story 5.8 added generated example docs and lockstep checking. After adding rows, run `generate-example-docs` before `build` or `verify:examples`; otherwise generated-file verification will fail because the new docs are missing. [Source: [_bmad-output/implementation-artifacts/5-8-publish-verified-migration-worked-examples-and-enforce-example-documentation-lockstep.md](_bmad-output/implementation-artifacts/5-8-publish-verified-migration-worked-examples-and-enforce-example-documentation-lockstep.md:405)]
- Story 5.11 reinforced that generated release documentation must be derived from canonical artefacts and checked by `verify-generated-files`; this story follows the same lockstep pattern for example docs. [Source: [_bmad-output/implementation-artifacts/5-11-publish-platform-adoption-guidance-through-a-canonical-standardisation-guide.md](_bmad-output/implementation-artifacts/5-11-publish-platform-adoption-guidance-through-a-canonical-standardisation-guide.md:95)]
- Story 8.10 owns the known global lint baseline failure surfaced by the deferred work audit. Story 5.12 should not absorb that cleanup, but it should still run targeted lint/static checks for its touched TypeScript files so new example or contract-test issues do not hide behind the existing baseline. [Sources: [_bmad-output/implementation-artifacts/deferred-work-audit.md](_bmad-output/implementation-artifacts/deferred-work-audit.md:46), [_bmad-output/implementation-artifacts/8-10-restore-lint-and-benchmark-guardrail-hygiene.md](_bmad-output/implementation-artifacts/8-10-restore-lint-and-benchmark-guardrail-hygiene.md:15)]

### Recent Git Intelligence

Recent local git history at story creation:

- `36240f8 fix(course correction): address deferred work`
- `06bfb2e fix(deferred work): incorrect statuses`
- `5f51d78 perf(rule driven engine): integrate substring matching and finalise`
- `e7d0772 perf(rule driven engine): extend to double wildcard and key-based paths`
- `fd79334 perf(rule driven engine): extend to handle single-level wildcard`

The recent rule-driven engine commits matter because fuzzy matching, case-insensitive matching, key rules, and ignore path segments all affect path-driven versus generic traversal routing. Story 5.12 must not change runtime routing or performance behaviour; it should document only already implemented behaviour through executable examples and generated release guidance.

### Project Structure Notes

- Implementation touches documentation/example artefacts, standardisation-guide generated output, the standardisation-guide generator mapping, and two contract tests only.
- New maintained files:
  - `docs/examples/examples/fuzzy-key-matching.ts`
  - `docs/examples/examples/case-insensitive-key-matching.ts`
  - `docs/examples/examples/path-segment-ignore.ts`
  - `docs/examples/fixtures/fuzzy-key-matching/input.json`
  - `docs/examples/fixtures/fuzzy-key-matching/expected.json`
  - `docs/examples/fixtures/case-insensitive-key-matching/input.json`
  - `docs/examples/fixtures/case-insensitive-key-matching/expected.json`
  - `docs/examples/fixtures/path-segment-ignore/input.json`
  - `docs/examples/fixtures/path-segment-ignore/expected.json`
- New generated files:
  - `docs/examples/fuzzy-key-matching.md`
  - `docs/examples/case-insensitive-key-matching.md`
  - `docs/examples/path-segment-ignore.md`
- Modified files:
  - `docs/examples/manifest.json`
  - `scripts/standardisation-guide.ts`
  - `docs/platform/standardisation-guide.md`
  - `test/contract/examples/example-manifest.test.ts`
  - `test/contract/platform/standardisation-guide.test.ts`

### Verification

Run commands from the repository root with the required environment bootstrap:

```bash
source .agents/initialise-env.sh && pnpm run generate-example-docs
source .agents/initialise-env.sh && pnpm run generate:standardisation-guide
source .agents/initialise-env.sh && pnpm run verify:examples
source .agents/initialise-env.sh && pnpm run test:contract
source .agents/initialise-env.sh && pnpm run build
source .agents/initialise-env.sh && pnpm exec eslint docs/examples/examples/fuzzy-key-matching.ts docs/examples/examples/case-insensitive-key-matching.ts docs/examples/examples/path-segment-ignore.ts scripts/standardisation-guide.ts test/contract/examples/example-manifest.test.ts test/contract/platform/standardisation-guide.test.ts
source .agents/initialise-env.sh && pnpm exec tsc --noEmit
```

`verify:examples` is the primary evidence gate because it executes every manifest row against its fixture and expected result. `build` is also required because it proves generated example docs and standardisation-guide output are in lockstep. If full `pnpm lint` is run and still reports the known Story 8.10 baseline failures outside these touched files, record that as pre-existing and do not fix unrelated lint in this story.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-05: Red phase for example manifest contract: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/examples/example-manifest.test.ts --reporter=verbose` failed as expected with 17 rows versus the required 20 and 15 non-migration rows versus the required 18.
- 2026-06-05: Green phase for example manifest contract: the same targeted command passed after adding the three manifest rows, source files, fixtures, and generated example docs.
- 2026-06-05: Red phase for standardisation guide contract: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/platform/standardisation-guide.test.ts --reporter=verbose` failed as expected because `docs/examples/fuzzy-key-matching.md` was not yet linked.
- 2026-06-05: Green phase for standardisation guide contract: the same targeted command passed after updating `CAPABILITY_EXAMPLES` and regenerating the guide.
- 2026-06-05: Review red phase for standardisation-guide link resolution: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/platform/standardisation-guide.test.ts --reporter=verbose` failed because `docs/examples/key-targeting.md` resolved under `docs/platform/docs/examples/`.
- 2026-06-05: Review green phase for standardisation-guide link resolution: the same targeted command passed after rendering Markdown-relative guide links and regenerating the guide.
- 2026-06-05: Required verification passed: `source .agents/initialise-env.sh && pnpm run generate-example-docs`.
- 2026-06-05: Required verification passed: `source .agents/initialise-env.sh && pnpm run generate:standardisation-guide`.
- 2026-06-05: Required verification passed: `source .agents/initialise-env.sh && pnpm run verify:examples` verified 20 example rows.
- 2026-06-05: Required verification passed: `source .agents/initialise-env.sh && pnpm run test:contract` passed 17 files and 642 tests.
- 2026-06-05: Required verification passed: `source .agents/initialise-env.sh && pnpm run build`.
- 2026-06-05: Targeted static checks passed: `source .agents/initialise-env.sh && pnpm exec eslint docs/examples/examples/fuzzy-key-matching.ts docs/examples/examples/case-insensitive-key-matching.ts docs/examples/examples/path-segment-ignore.ts scripts/standardisation-guide.ts test/contract/examples/example-manifest.test.ts test/contract/platform/standardisation-guide.test.ts`.
- 2026-06-05: TypeScript static check passed: `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`.

### Completion Notes List

- Added verified worked examples for fuzzy key matching, case-insensitive key matching, and path-segment ignore selectors, with canonical manifest rows, executable source files, one-line JSON fixtures, expected outputs, and generated markdown docs.
- Updated the example manifest contract to expect 20 verified rows in canonical order and 18 non-migration rows.
- Updated the generated standardisation guide capability list and contract assertions to include the three newly validated example links, with Markdown-relative local links verified from the guide location.
- Confirmed the story stayed within documentation, example artefact, generator mapping, and contract-test scope; no runtime redaction behaviour, public API, validation harness, migration fixture, or existing example behaviour changes were made.

### File List

- `_bmad-output/implementation-artifacts/5-12-add-worked-examples-for-fuzzy-key-matching-case-insensitive-key-matching-and-path-segment-ignore-selectors.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/examples/manifest.json`
- `docs/examples/examples/fuzzy-key-matching.ts`
- `docs/examples/examples/case-insensitive-key-matching.ts`
- `docs/examples/examples/path-segment-ignore.ts`
- `docs/examples/fixtures/fuzzy-key-matching/input.json`
- `docs/examples/fixtures/fuzzy-key-matching/expected.json`
- `docs/examples/fixtures/case-insensitive-key-matching/input.json`
- `docs/examples/fixtures/case-insensitive-key-matching/expected.json`
- `docs/examples/fixtures/path-segment-ignore/input.json`
- `docs/examples/fixtures/path-segment-ignore/expected.json`
- `docs/examples/fuzzy-key-matching.md`
- `docs/examples/case-insensitive-key-matching.md`
- `docs/examples/path-segment-ignore.md`
- `scripts/standardisation-guide.ts`
- `docs/platform/standardisation-guide.md`
- `test/contract/examples/example-manifest.test.ts`
- `test/contract/platform/standardisation-guide.test.ts`

### Change Log

- 2026-06-05: Added worked examples and standardisation-guide coverage for fuzzy key matching, case-insensitive key matching, and path-segment ignore selectors.
