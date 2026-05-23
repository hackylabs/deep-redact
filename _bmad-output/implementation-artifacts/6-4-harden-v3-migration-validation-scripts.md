# Story 6.4: Harden v3 Migration Validation Scripts

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the v3 migration validation scripts to handle edge cases, CRLF line endings, malformed JSON, config typos, and reporting gaps robustly,
so that contributors receive clear error messages and validation failures are never silently swallowed.

## Acceptance Criteria

1. **Given** the v3 migration manifest contains no `v4-initialisation-error` rows, **when** `verify:migration:v3` runs, **then** at least one such row exists in `test/migration/v3/matrix.json` and is exercised by the verification script, proving the code path is covered.
2. **Given** a manifest row has keys in the wrong order, **when** row key order is checked via `Object.keys().join()` comparison in `scripts/v3-migration.ts`, **then** the resulting validation error identifies the offending row ID and lists the actual versus expected key order rather than producing a raw cryptic comparison string.
3. **Given** a fixture file with CRLF line endings (Windows `core.autocrlf=true`), **when** `readFixtureText` processes it, **then** both `\r\n` and standalone `\r` endings are stripped so the file content matches its LF-only counterpart.
4. **Given** a malformed JSON fixture file, **when** `readJsonFile` parses it and throws, **then** the resulting error message includes the row ID and the fixture file path as context.
5. **Given** a v4 usage config object in a manifest row, **when** the row is validated, **then** any config key that is not in the known v4 public option name set is flagged as a validation error before the row is executed at runtime.
6. **Given** the v3 migration guide summary rendered by `renderV3MigrationGuide`, **when** `v4-initialisation-error` rows are present in the manifest, **then** the summary accurately counts and reports those rows alongside other row-type counts.
7. **Given** the `isHelperReference` function checks a config key named `helperId`, **when** a future v4 option coincidentally shares that name, **then** `isHelperReference` does not misidentify it — the predicate is tightened so its trigger condition is more specific than a bare key name check.

## Tasks / Subtasks

- [ ] Add at least one `v4-initialisation-error` row to `test/migration/v3/matrix.json` and exercise it through the `verify:migration:v3` script (`scripts/v3-migration.ts`) (AC: 1)
- [ ] Improve `Object.keys().join()` key-order error reporting to include the row ID and actual vs expected key sequence (`scripts/v3-migration.ts`) (AC: 2)
- [ ] Update `readFixtureText` to strip both `\r\n` and `\r` trailing endings, not only the final `\n` (`scripts/v3-migration.ts:161`) (AC: 3)
- [ ] Wrap the `JSON.parse` call in `readJsonFile` to include row ID and fixture path in the thrown error (`scripts/v3-migration.ts:145`) (AC: 4)
- [ ] Add v4 public option name validation for `v4Usage.config` keys before row execution (`scripts/v3-migration.ts`) (AC: 5)
- [ ] Update `renderV3MigrationGuide` summary section to include a count of `v4-initialisation-error` rows (`scripts/v3-migration.ts:604`) (AC: 6)
- [ ] Tighten `isHelperReference` to use a more specific structural predicate rather than relying solely on the presence of a `helperId` key (`scripts/v3-migration.ts:110`) (AC: 7)

## Dev Notes

**Deferred from:** Code review of Story 5.5 (2026-05-22).

**Item 1 — v4-initialisation-error manifest coverage:** The `v4-initialisation-error` mode exists in the manifest schema and in contract tests as direct calls, but is never exercised via the `verify:migration:v3` script path. Adding one row exercises the full validation pipeline for this mode.

**Item 2 — key order error:** The current check computes `Object.keys(row).join(',')` vs the expected key order string. When they differ, the raw joined strings are unhelpful. Include `rowId` and a diff-style message.

**Item 3 — CRLF:** `readFixtureText` currently calls `.replace(/\n$/, '')` (or equivalent). Replace with `.replace(/\r?\n$/, '')` to handle CRLF. If the function strips all trailing whitespace, also handle `\r` after the final content character.

**Item 4 — JSON parse context:** Wrap `JSON.parse(fs.readFileSync(fixturePath, 'utf8'))` in `readJsonFile` with a try/catch that re-throws as `new Error(\`Row "${rowId}": failed to parse ${fixturePath}: ${err.message}\`)`.

**Item 5 — v4 config key validation:** Maintain a `const KNOWN_V4_OPTIONS = new Set([...])` containing all public option names, and check each key in `v4Usage.config` against it during row validation. Unknown keys should produce a clear validation error rather than silently being passed to the runtime.

**Item 7 — isHelperReference:** The current predicate checks `typeof value === 'object' && 'helperId' in value`. A tighter check might inspect the shape of the value object (e.g. also requiring `typeof value.helperId === 'string'`) or rename the detection key in the manifest schema to something less collision-prone.
