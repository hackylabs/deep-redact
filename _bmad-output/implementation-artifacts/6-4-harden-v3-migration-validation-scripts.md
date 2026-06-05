# Story 6.4: Harden v3 Migration Validation Scripts

Status: done

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

- [x] Add at least one `v4-initialisation-error` row to `test/migration/v3/matrix.json` and create the required fixture directory with `input.json`, `notes.md`, and `initialisation-error.json` (AC: 1)
- [x] Improve `Object.keys().join()` key-order error reporting at `scripts/v3-migration.ts:277` to include actual vs expected key sequence (AC: 2)
- [x] Update `readFixtureText` at `scripts/v3-migration.ts:161` to strip both `\r\n` and standalone `\r` endings (AC: 3)
- [x] Wrap `readFixtureJson` in `scripts/v3-migration.ts:148` with a try/catch that re-throws with row ID and fixture path context (AC: 4)
- [x] Add `KNOWN_V4_OPTIONS` constant and validate `v4Usage.config` keys against it during `validateV3MigrationMatrix` (AC: 5)
- [x] Update `renderV3MigrationGuide` summary section at `scripts/v3-migration.ts:602` to include a count of `v4-initialisation-error` rows (AC: 6)
- [x] Tighten `isHelperReference` at `scripts/v3-migration.ts:110` with a non-empty `helperId` guard (AC: 7)
- [x] Regenerate `docs/migration/from-v3.md` after all changes by running `pnpm run generate-v3-migration-doc` (AC: 1, 6)

## Dev Notes

**Deferred from:** Code review of Story 5.5 (2026-05-22).

**Environment bootstrap (required before any test, generate, or verify command):**
```bash
source .agents/initialise-env.sh
```

---

### Files Modified by This Story

| File | Change type |
|------|-------------|
| `scripts/v3-migration.ts` | Modify (7 targeted edits — see fixes below) |
| `test/migration/v3/matrix.json` | Modify (append one `v4-initialisation-error` row) |
| `test/migration/v3/fixtures/v3-unsupported-option/input.json` | Create |
| `test/migration/v3/fixtures/v3-unsupported-option/notes.md` | Create |
| `test/migration/v3/fixtures/v3-unsupported-option/initialisation-error.json` | Create |
| `docs/migration/from-v3.md` | Regenerate (do not hand-edit) |

No production source files (`src/`) are modified.

---

### Codebase Context

The primary file is `scripts/v3-migration.ts` (649 lines). It:
- Defines types for the v3 migration manifest schema
- Exports `loadV3MigrationMatrix` / `validateV3MigrationMatrix` / `verifyV3MigrationMatrix`
- Exports `renderV3MigrationGuide` (renders `docs/migration/from-v3.md`)
- Is called by `scripts/verify-v3-migration.ts` (via `pnpm run verify:migration:v3`) and `scripts/generate-v3-migration-doc.ts`

The v4 option names that are valid at the **root config** level come from `src/core/validation/validate-config.ts` (`rootOptionNames` set, lines 12–26). **Do not import from `src/` in the migration script** — the script runs against the built CJS artefact. Define the set inline.

The `verifyInitialisationErrorRow` function at line 451 already implements the `v4-initialisation-error` assertion path fully — it just needs a manifest row to exercise it.

---

### Fix 1 — Add `v4-initialisation-error` manifest row and fixture (AC 1)

**Step 1a — Create fixture directory and files**

Create directory `test/migration/v3/fixtures/v3-unsupported-option/`.

`test/migration/v3/fixtures/v3-unsupported-option/input.json`:
```json
{
  "username": "alice",
  "password": "s3cr3t"
}
```

`test/migration/v3/fixtures/v3-unsupported-option/notes.md`:
```
Using a v3-only option name (`blacklistedKeys`) in a v4 configuration causes Deep Redact to throw at initialisation. Rename `blacklistedKeys` to `keys` before calling `deepRedact(options)`.
```

`test/migration/v3/fixtures/v3-unsupported-option/initialisation-error.json`:
```json
{
  "unsupportedOption": "blacklistedKeys",
  "expectedErrorFragment": "Unsupported option \"blacklistedKeys\".",
  "description": "Deep Redact v4 rejects the v3 option name blacklistedKeys. Rename it to keys."
}
```

**Step 1b — Append row to `test/migration/v3/matrix.json`**

Add the following as the **last entry in the `rows` array** (after the `combined-migration` row):

```json
{
  "id": "v3-unsupported-option",
  "fixtureDir": "test/migration/v3/fixtures/v3-unsupported-option",
  "v3Usage": {
    "import": "DeepRedact",
    "instantiation": "new DeepRedact({ blacklistedKeys: ['password'] })",
    "invocation": "redactor.redact(payload)"
  },
  "v4Usage": {
    "import": "deepRedact",
    "factory": "deepRedact({ blacklistedKeys: ['password'] })",
    "invocation": "not applicable — factory throws before any redaction call",
    "config": {
      "blacklistedKeys": ["password"]
    },
    "unsupportedOption": "blacklistedKeys"
  },
  "migrationSteps": [
    "Rename `blacklistedKeys` to `keys`. Deep Redact v4 does not accept the v3 option name — passing it causes an initialisation error.",
    "Replace `new DeepRedact(options)` with `deepRedact(options)`.",
    "Replace `redactor.redact(payload)` with `redactor(payload)`."
  ],
  "assertionMode": "v4-initialisation-error",
  "expectedResult": {
    "kind": "initialisation-error",
    "file": "initialisation-error.json"
  }
}
```

**Important:** `assertionMode: "v4-initialisation-error"` rows require `v4Usage.unsupportedOption` to be present (validated at `scripts/v3-migration.ts:296–301`). The `verifyInitialisationErrorRow` function will call `deepRedact({ blacklistedKeys: ['password'] })` and assert it throws with an error containing `"blacklistedKeys"`.

**Important:** The `v4Usage.config` for this row contains `blacklistedKeys`, which is **not** in `KNOWN_V4_OPTIONS` (Fix 5). Therefore Fix 5 must skip validation for `v4-initialisation-error` rows, because the whole point is that the config is intentionally invalid. See the KNOWN_V4_OPTIONS note in Fix 5.

---

### Fix 2 — Key-order error message (AC 2)

**File:** `scripts/v3-migration.ts:277`

**Current code:**
```typescript
if (Object.keys(candidateRow).join('\n') !== rowKeys.join('\n')) {
  fail(candidateRow, 'fixture', `row keys must be exactly ${rowKeys.join(', ')}`)
}
```

**Replacement:**
```typescript
if (Object.keys(candidateRow).join('\n') !== rowKeys.join('\n')) {
  const actualKeys = Object.keys(candidateRow).join(', ')
  const expectedKeys = rowKeys.join(', ')
  fail(candidateRow, 'fixture', `row keys must be [${expectedKeys}] but got [${actualKeys}]`)
}
```

The `fail()` function already prepends the row ID via `V3MigrationVerificationError`, so the final message will read:
> `v3 migration row <id> (...) failed during fixture ...: row keys must be [...] but got [...]`

---

### Fix 3 — CRLF line ending normalisation (AC 3)

**File:** `scripts/v3-migration.ts:161`

**Current code (line 161):**
```typescript
return readFileSync(path.join(repositoryRoot, row.fixtureDir, fileName), 'utf8').replace(/\r?\n$/, '')
```

The current regex `/\r?\n$/` strips a trailing `\r\n` or `\n`. But a file with CR-only line endings (`\r`) ends with `\r` after stripping the final `\n`, and a CRLF file with internal `\r\n` pairs retains those pairs intact.

**Replacement:**
```typescript
return readFileSync(path.join(repositoryRoot, row.fixtureDir, fileName), 'utf8')
  .replace(/\r\n|\r/g, '\n')
  .replace(/\n$/, '')
```

This normalises all line endings to `\n` first, then strips the trailing `\n`. The result matches its LF-only counterpart exactly.

---

### Fix 4 — JSON parse error context (AC 4)

**File:** `scripts/v3-migration.ts:148–154`

`readJsonFile` at line 144 does not have row context. The fix belongs in `readFixtureJson` which has both `row` and `fileName`.

**Current `readFixtureJson` (lines 148–154):**
```typescript
const readFixtureJson = <T>(
  repositoryRoot: string,
  row: V3MigrationRow,
  fileName: string,
): T => {
  return readJsonFile<T>(path.join(repositoryRoot, row.fixtureDir, fileName))
}
```

**Replacement:**
```typescript
const readFixtureJson = <T>(
  repositoryRoot: string,
  row: V3MigrationRow,
  fileName: string,
): T => {
  const fixturePath = path.join(repositoryRoot, row.fixtureDir, fileName)

  try {
    return readJsonFile<T>(fixturePath)
  } catch (err) {
    throw new Error(
      `Row "${row.id}": failed to parse ${fixturePath}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
```

`readJsonFile` itself (line 144) is unchanged — it is also called for the matrix file (line 249) where no row context exists, so leave it as-is.

---

### Fix 5 — v4 config key validation (AC 5)

**File:** `scripts/v3-migration.ts` — two additions

**Step 5a — Add the `KNOWN_V4_OPTIONS` constant** near the top of the file, after the `assertionModeValues` and `expectedResultKindValues` constants (around line 100):

```typescript
const KNOWN_V4_OPTIONS = new Set([
  'caseSensitiveKeyMatch',
  'censor',
  'diagnostics',
  'fuzzyKeyMatch',
  'keys',
  'paths',
  'remove',
  'replaceStringByLength',
  'retainStructure',
  'ignoredValueTypes',
  'serialise',
  'stringTests',
  'transformers',
])
```

This mirrors `rootOptionNames` in `src/core/validation/validate-config.ts` (lines 12–26). Do not import from `src/` — the migration script runs against the built CJS artefact only.

**Step 5b — Add config key validation inside `validateV3MigrationMatrix`**, immediately after the existing `v4Usage.config` check at line 323 (`if (!isRecord(candidateRow.v4Usage.config))`):

```typescript
if (!isRecord(candidateRow.v4Usage.config)) {
  fail(candidateRow, 'fixture', 'v4Usage.config must be an object')
}

// NEW: skip unknown-key check for v4-initialisation-error rows — their config is intentionally invalid
if (candidateRow.assertionMode !== 'v4-initialisation-error') {
  for (const key of Object.keys(candidateRow.v4Usage.config)) {
    if (!KNOWN_V4_OPTIONS.has(key)) {
      fail(candidateRow, 'fixture', `v4Usage.config contains unknown v4 option key "${key}"`)
    }
  }
}
```

**Why skip for `v4-initialisation-error`:** The `v3-unsupported-option` row (Fix 1) intentionally uses `blacklistedKeys` in its config to demonstrate the rejection. Validating that row's config against `KNOWN_V4_OPTIONS` would fail during manifest validation rather than during verification, which defeats the purpose.

---

### Fix 6 — Initialisation-error row count in guide summary (AC 6)

**File:** `scripts/v3-migration.ts:602–603`

**Current code:**
```typescript
const structuredCount = matrix.rows.filter((row) => row.assertionMode === 'v4-structured-output').length
const serialisedCount = matrix.rows.filter((row) => row.assertionMode === 'v4-serialised-output').length
```

**Replacement:**
```typescript
const structuredCount = matrix.rows.filter((row) => row.assertionMode === 'v4-structured-output').length
const serialisedCount = matrix.rows.filter((row) => row.assertionMode === 'v4-serialised-output').length
const initialisationErrorCount = matrix.rows.filter((row) => row.assertionMode === 'v4-initialisation-error').length
```

Then in the summary string array (locate the two existing count lines around line 620):

**Current:**
```typescript
`- Structured output rows: ${structuredCount}`,
`- Serialised output rows: ${serialisedCount}`,
```

**Replacement:**
```typescript
`- Structured output rows: ${structuredCount}`,
`- Serialised output rows: ${serialisedCount}`,
`- Initialisation error rows: ${initialisationErrorCount}`,
```

**After this fix**, the rendered guide will differ from the committed `docs/migration/from-v3.md`. Regenerate it (see Running Tests).

---

### Fix 7 — `isHelperReference` predicate tightening (AC 7)

**File:** `scripts/v3-migration.ts:110–114`

**Current code:**
```typescript
const isHelperReference = (value: unknown): value is HelperReference => {
  return isRecord(value)
    && Object.keys(value).length === 1
    && typeof value.helperId === 'string'
}
```

**Replacement:**
```typescript
const isHelperReference = (value: unknown): value is HelperReference => {
  return isRecord(value)
    && Object.keys(value).length === 1
    && typeof value.helperId === 'string'
    && value.helperId.length > 0
}
```

Adding `&& value.helperId.length > 0` ensures that `{ helperId: '' }` — which could hypothetically appear as a v4 option value — is not misidentified as a helper reference. Any valid manifest helper reference must name a non-empty helper ID.

---

### Running Tests

**Apply all code changes and fixtures first, then:**

**1. Regenerate `docs/migration/from-v3.md`** (required after Fix 1 adds a new row and Fix 6 changes the summary):
```bash
source .agents/initialise-env.sh && pnpm run generate-v3-migration-doc
```

**2. Verify the migration matrix** (requires a built dist — `pnpm run build` is invoked internally):
```bash
source .agents/initialise-env.sh && pnpm run verify:migration:v3
```

Expected output: `Verified 10 v3 migration rows.` (was 9; one `v4-initialisation-error` row added).

**3. Run the contract test suite:**
```bash
source .agents/initialise-env.sh && pnpm run test -- --reporter=verbose test/contract/migration/v3-migration.test.ts
```

**4. Run the full test suite:**
```bash
source .agents/initialise-env.sh && pnpm run test
```

**5. Verify generated files are in sync:**
```bash
source .agents/initialise-env.sh && pnpm run verify-generated-files
```

This will fail if `docs/migration/from-v3.md` was not regenerated after the changes.

---

### Order of Implementation

Recommended implementation order to avoid mid-way verification failures:

1. Apply all 7 code fixes to `scripts/v3-migration.ts`
2. Append the `v3-unsupported-option` row to `test/migration/v3/matrix.json`
3. Create the three fixture files under `test/migration/v3/fixtures/v3-unsupported-option/`
4. Run `pnpm run generate-v3-migration-doc` to regenerate `docs/migration/from-v3.md`
5. Run the full verification chain (steps 2–5 in Running Tests above)

---

### Deferred-Work Cleanup on Completion

When this story is marked `done` during code review, the reviewer must remove all seven bullet items under the `## Deferred from: code review of 5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path (2026-05-22)` section from `_bmad-output/implementation-artifacts/deferred-work-audit.md`. This is enforced by the project-context hard rule on deferred-item cleanup.

## File List

- `scripts/v3-migration.ts` — 7 edits: `isHelperReference` (AC 7), `readFixtureJson` try/catch (AC 4), `KNOWN_V4_OPTIONS` constant (AC 5), `readFixtureText` CRLF normalisation (AC 3), key-order error message (AC 2), unknown config key validation (AC 5), `renderV3MigrationGuide` initialisation-error count (AC 6)
- `test/migration/v3/matrix.json` — append one `v4-initialisation-error` row (AC 1)
- `test/migration/v3/fixtures/v3-unsupported-option/input.json` — create (AC 1)
- `test/migration/v3/fixtures/v3-unsupported-option/notes.md` — create (AC 1)
- `test/migration/v3/fixtures/v3-unsupported-option/initialisation-error.json` — create (AC 1)
- `docs/migration/from-v3.md` — regenerate via `pnpm run generate-v3-migration-doc` (AC 1, 6)
- `test/contract/migration/v3-migration.test.ts` — add `v3-unsupported-option` to `expectedRowIds`

## Change Log

| Date | Change |
|------|--------|
| 2026-05-24 | Story created with comprehensive implementation guide |
| 2026-05-24 | All 7 fixes implemented; v3-unsupported-option fixture and matrix row added; docs regenerated; 468/468 tests pass |

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes

All 7 ACs satisfied in a single pass:
- AC 1: `v3-unsupported-option` fixture dir and matrix row added; `verify:migration:v3` now reports "Verified 10 v3 migration rows."
- AC 2: Key-order error message now shows `[expected] but got [actual]` instead of a raw join string.
- AC 3: `readFixtureText` now normalises `\r\n` and `\r` to `\n` before stripping the trailing newline.
- AC 4: `readFixtureJson` wraps `readJsonFile` in try/catch, re-throwing with row ID and full fixture path.
- AC 5: `KNOWN_V4_OPTIONS` constant added; config keys validated against it for all non-`v4-initialisation-error` rows.
- AC 6: `renderV3MigrationGuide` summary now includes an "Initialisation error rows" count line.
- AC 7: `isHelperReference` tightened with `&& value.helperId.length > 0` guard.

`test/contract/migration/v3-migration.test.ts` updated to include `v3-unsupported-option` in `expectedRowIds`. All 468 tests pass; `verify-generated-files` passes; `verify:migration:v3` passes.

### Debug Log

Contract tests failed initially because `expectedRowIds` in `v3-migration.test.ts` hardcoded only 9 IDs. Added `v3-unsupported-option` to the list — tests then passed.

## Review Findings

### Decision Needed

- [x] [Review][Decision→Patch] `expectedErrorFragment` in `initialisation-error.json` is never asserted during verification — resolved by loading the fixture in `verifyInitialisationErrorRow` and asserting `message.includes(expectedErrorFragment)` in addition to the existing `unsupportedOption` check. [`scripts/v3-migration.ts:488-527`]

### Deferred

- [x] [Review][Defer] `KNOWN_V4_OPTIONS` is a manually-maintained duplicate of `rootOptionNames` with no shared source of truth [`scripts/v3-migration.ts:102-116`] — deferred, accepted design constraint (spec mandates inline definition; no `src/` imports allowed in migration script)
- [x] [Review][Defer] `v4-initialisation-error` rows' `v4Usage.config` is entirely exempt from unknown-key validation, so accidental misspellings of real v4 option names in those rows' configs go undetected [`scripts/v3-migration.ts:356-363`] — deferred, accepted design trade-off (spec requires exemption; only one such row exists)
- [x] [Review][Defer] v3 usage strings (`instantiation`, `invocation`) in matrix rows are documentation-only and never executed or validated by the harness [`test/migration/v3/matrix.json`] — deferred, structural limitation of the matrix design (pre-existing for all rows)
- [x] [Review][Defer] `v4Usage.invocation` is a prose description (`"not applicable — factory throws before any redaction call"`) rather than a structured sentinel or `null` [`test/migration/v3/matrix.json`] — deferred, schema design limitation (validator only requires non-empty string; changing schema is out of scope)
- [x] [Review][Defer] `initialisationErrorCount` in the rendered guide is not cross-validated against `expectedRowIds` in the contract test, so they can drift silently [`scripts/v3-migration.ts:638`, `test/contract/migration/v3-migration.test.ts`] — deferred, pre-existing pattern for all row-type counts
- [x] [Review][Defer] Generated `docs/migration/from-v3.md` ends with a trailing double blank line after the last section [`docs/migration/from-v3.md`] — deferred, pre-existing generator behaviour (cosmetic)
