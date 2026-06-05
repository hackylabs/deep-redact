# Story 5.12: Add Worked Examples for Fuzzy Key Matching, Case-Insensitive Key Matching, and Path-Segment Ignore Selectors

Status: ready-for-dev

Readiness correction: this story was moved from the former Epic 9 deferred-work bucket into Epic 5 so FR31 remains owned by rollout, migration, and release documentation evidence.

## Story

As a backend engineer,
I want verified worked examples for fuzzy key matching, case-insensitive key matching, and path-segment ignore selectors,
so that these three implemented and tested features are documented with the same rigour as the rest of the Deep Redact feature surface.

## Context

All three features are implemented in source and covered by unit and contract tests, but they do not yet appear in the `docs/examples/` worked-example system. Story 5.7's required coverage matrix did not list them, so the gap was not caught by that story.

This story closes the gap with three separate manifest rows, example source files, fixture directories, expected output files, and generated or validated doc files. It implements FR31 and provides example evidence for FR6, FR7, and FR13.

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

5. **Given** this story's scope
   **When** the implementation is reviewed
   **Then** it covers the three new manifest rows, source files, fixture directories, expected output files, and doc files only
   **And** no changes to the example validation harness, manifest schema, or existing examples are required.

## Tasks / Subtasks

- [ ] Add the `fuzzy-key-matching` example source, fixture, expected output, manifest row, and doc file.
- [ ] Add the `case-insensitive-key-matching` example source, fixture, expected output, manifest row, and doc file.
- [ ] Add the `path-segment-ignore` example source, fixture, expected output, manifest row, and doc file.
- [ ] Run the existing example validation harness and update only artefacts required by the three new examples.
- [ ] Check that the canonical examples documentation links remain stable after generation or validation.

## Dev Notes

Likely files:

- [docs/examples/manifest.json](docs/examples/manifest.json)
- [docs/examples/examples/](docs/examples/examples/)
- [docs/examples/fixtures/](docs/examples/fixtures/)
- [docs/examples/](docs/examples/)

Keep this story documentation-only plus example-fixture work. Do not change feature runtime behaviour or the example validation harness unless existing validation is already broken and the blocker is recorded separately.

## Verification

- `source .agents/initialise-env.sh && pnpm run verify:examples`
- `source .agents/initialise-env.sh && pnpm run test`
- `source .agents/initialise-env.sh && pnpm exec tsc --noEmit`
