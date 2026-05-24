# Story 6.5: Harden Example Validation and Documentation Generation Scripts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want example validation and documentation generation scripts to handle malformed manifests, untested error fields, and unsafe Markdown output robustly,
so that failures surface with clear context and generated documentation remains structurally sound regardless of source content.

## Acceptance Criteria

1. **Given** a malformed `docs/examples/manifest.json`, **when** `loadExampleManifest` is called, **then** the resulting error message includes the manifest file path as context rather than surfacing a raw `SyntaxError`.
2. **Given** an `ExampleVerificationError` is thrown during example validation, **when** the contract test suite inspects it, **then** the `rowId`, `fixtureDir`, `assertionMode`, and `phase` property fields are all explicitly asserted by at least one test.
3. **Given** `buildAllGeneratedExampleDocs` is called during doc generation, **when** it runs, **then** it calls `validateExampleManifest` before proceeding so invalid manifests are rejected with a clear validation error before generation proceeds.
4. **Given** a source file used by an example doc generator contains a line beginning with three consecutive backticks, **when** `buildGeneratedExampleDoc` renders the Markdown fence, **then** the fence is not prematurely closed — the inner backticks are escaped or the fence delimiter is lengthened.
5. **Given** a migration row in the example manifest, **when** `expectRepositoryPath` validates `row.fixtureDir`, **then** it enforces the same trailing-slash subdirectory constraint as the runtime `validateFixturePath` guard so the two validators cannot silently diverge.

## Tasks / Subtasks

- [x] Wrap `JSON.parse` in `loadExampleManifest` with a try/catch that includes the manifest file path in the error message (`scripts/example-validation.ts`) (AC: 1)
- [x] Add contract test assertions for `rowId`, `fixtureDir`, `assertionMode`, and `phase` fields on `ExampleVerificationError` instances (`test/contract/examples/example-manifest.test.ts`) (AC: 2)
- [x] Import `validateExampleManifest` in `scripts/generated-files.ts` and call it inside `buildAllGeneratedExampleDocs` after loading the manifest (AC: 3)
- [x] Add backtick-fence escaping to `buildGeneratedExampleDoc`: detect max consecutive-backtick run in source content and use `max + 1` as fence delimiter length (`scripts/generated-files.ts`) (AC: 4)
- [x] Tighten `expectRepositoryPath` and the migration call sites to require a trailing-slash subdirectory, matching the runtime `validateFixturePath` constraint (`test/contract/examples/example-manifest.test.ts`) (AC: 5)
- [x] Run `pnpm run test` and `pnpm run verify-generated-files` to confirm all tests pass and no generated files changed (All ACs)

## Dev Notes

**Deferred from:** Code reviews of Stories 5.6 (2026-05-22) and 5.8 (2026-05-23).

**Environment bootstrap (required before any test or generate command):**
```bash
source .agents/initialise-env.sh
```

---

### Primary Files

| File | Change type |
|------|-------------|
| `scripts/example-validation.ts` | Modify — Fix 1: `loadExampleManifest` try/catch |
| `scripts/generated-files.ts` | Modify — Fix 3: add `validateExampleManifest` call; Fix 4: backtick-fence escaping |
| `test/contract/examples/example-manifest.test.ts` | Modify — Fix 2: `ExampleVerificationError` assertions; Fix 5: `expectRepositoryPath` tightening |

No production source files (`src/`) are modified. No fixture files are created.

---

### Codebase Context

**`scripts/example-validation.ts`** (386 lines) defines:
- `ExampleVerificationError` — typed error class with `rowId`, `assertionMode`, `phase`, `fixtureDir` properties (lines 96–120)
- `loadExampleManifest` — reads and JSON-parses `docs/examples/manifest.json` via `readJsonFile` (lines 130–134)
- `validateExampleManifest` — validates schema, keys, enum values, uniqueness, path safety (lines 140–211)
- `validateFixturePath` — enforces `fixtureDir` constraints per category (lines 213–263):
  - `migration-fast-redact`: must `startsWith('test/migration/fast-redact/fixtures/')`
  - `migration-v3`: must `startsWith('test/migration/v3/fixtures/')`
  - others: must be `${fixtureRoot}/${row.id}` exactly

**`scripts/generated-files.ts`** (148 lines):
- Currently imports `loadExampleManifest` but NOT `validateExampleManifest` (line 4)
- `buildGeneratedExampleDoc` (lines 97–124): renders a Markdown doc with hard-coded triple-backtick fences — no escaping for content that contains backticks
- `buildAllGeneratedExampleDocs` (lines 126–133): calls `loadExampleManifest` but not `validateExampleManifest`

**`test/contract/examples/example-manifest.test.ts`** (262 lines):
- `expectRepositoryPath` helper (lines 39–48): validates a path has no traversal and starts with expected prefix — currently uses `=== prefix || startsWith(prefix + '/')` which accepts the bare base directory
- Migration call sites (lines 92–99): pass bare `'test/migration/fast-redact/fixtures'` and `'test/migration/v3/fixtures'` — these accept the bare dir itself, diverging from runtime which requires a trailing-slash subdirectory

---

### Fix 1 — `loadExampleManifest` SyntaxError context (AC 1)

**File:** `scripts/example-validation.ts` — the `loadExampleManifest` function (lines 130–134)

**Current code:**
```typescript
export const loadExampleManifest = (
  repositoryRoot = defaultRepositoryRoot,
): ExampleManifest => {
  return readJsonFile<ExampleManifest>(path.join(repositoryRoot, manifestPath))
}
```

**Replacement:**
```typescript
export const loadExampleManifest = (
  repositoryRoot = defaultRepositoryRoot,
): ExampleManifest => {
  const fullPath = path.join(repositoryRoot, manifestPath)
  try {
    return readJsonFile<ExampleManifest>(fullPath)
  } catch (err) {
    throw new Error(
      `Failed to parse example manifest at ${fullPath}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
```

The `readJsonFile` helper (line 88) is unchanged — it is also called in `verifyStructuredOutputRow` and `verifySerialisedOutputRow` where row-level error handling already wraps it. Do not add a try/catch to `readJsonFile` itself.

---

### Fix 2 — `ExampleVerificationError` property assertions in contract tests (AC 2)

**File:** `test/contract/examples/example-manifest.test.ts`

**Step 2a — Add `ExampleVerificationError` to the import** (line 10):

Current import:
```typescript
import {
  loadExampleManifest,
  validateExampleManifest,
  verifyExampleManifest,
  type ExampleManifest,
} from '../../../scripts/example-validation.ts'
```

Replacement:
```typescript
import {
  ExampleVerificationError,
  loadExampleManifest,
  validateExampleManifest,
  verifyExampleManifest,
  type ExampleManifest,
} from '../../../scripts/example-validation.ts'
```

**Step 2b — Add a new `it` block** inside `describe('example manifest contract', ...)`, after the existing `'rejects a migration-v3 row whose fixtureDir contains .. traversal'` test (around line 205):

```typescript
it('throws ExampleVerificationError with rowId, fixtureDir, assertionMode, and phase when a migration row has an invalid fixtureDir', () => {
  const manifest = loadExampleManifest(repoRoot)

  const badRow = {
    id: 'migration-test-row',
    category: 'migration-fast-redact' as const,
    docTarget: 'docs/examples/migration-test-row.md',
    sourceFile: 'docs/examples/examples/migration-test-row.ts',
    fixtureDir: 'test/migration/fast-redact/fixtures/dot-path-structured-output/../../../escape',
    assertionMode: 'structured-output' as const,
    expectedResultFile: 'expected-v4.json',
  }

  const invalidManifest: ExampleManifest = { ...manifest, rows: [badRow] }

  let caughtError: unknown
  try {
    validateExampleManifest(invalidManifest)
  } catch (err) {
    caughtError = err
  }

  expect(caughtError).toBeInstanceOf(ExampleVerificationError)
  const verificationError = caughtError as ExampleVerificationError
  expect(verificationError.rowId).toBe('migration-test-row')
  expect(verificationError.fixtureDir).toBe('test/migration/fast-redact/fixtures/dot-path-structured-output/../../../escape')
  expect(verificationError.assertionMode).toBe('structured-output')
  expect(verificationError.phase).toBe('fixture')
})
```

**Why this approach:** `validateFixturePath` (called from `validateExampleManifest`) throws `ExampleVerificationError` — not plain `Error` — for `migration-fast-redact` and `migration-v3` rows with invalid `fixtureDir`. Using a migration row with `..` traversal is the most direct trigger. The four properties are asserted individually.

---

### Fix 3 — `validateExampleManifest` guard in `buildAllGeneratedExampleDocs` (AC 3)

**File:** `scripts/generated-files.ts`

**Step 3a — Update the import** (line 4):

Current:
```typescript
import { loadExampleManifest, type ExampleRow } from './example-validation.ts'
```

Replacement:
```typescript
import { loadExampleManifest, validateExampleManifest, type ExampleRow } from './example-validation.ts'
```

**Step 3b — Add the validation call** inside `buildAllGeneratedExampleDocs` (lines 126–133):

Current:
```typescript
export const buildAllGeneratedExampleDocs = (repoRoot: string = repositoryRoot): Record<string, string> => {
  const manifest = loadExampleManifest(repoRoot)
  const result: Record<string, string> = {}
  for (const row of manifest.rows) {
    result[path.join(repoRoot, row.docTarget)] = buildGeneratedExampleDoc(row, repoRoot)
  }
  return result
}
```

Replacement:
```typescript
export const buildAllGeneratedExampleDocs = (repoRoot: string = repositoryRoot): Record<string, string> => {
  const manifest = loadExampleManifest(repoRoot)
  validateExampleManifest(manifest)
  const result: Record<string, string> = {}
  for (const row of manifest.rows) {
    result[path.join(repoRoot, row.docTarget)] = buildGeneratedExampleDoc(row, repoRoot)
  }
  return result
}
```

This follows the same guard pattern as `verifyExampleManifest` in `example-validation.ts` (line 356), which already calls `validateExampleManifest(manifest)` before processing rows.

---

### Fix 4 — Backtick-fence escaping in `buildGeneratedExampleDoc` (AC 4)

**File:** `scripts/generated-files.ts`

The CommonMark spec allows a fenced code block delimiter of N or more backticks if N > the maximum consecutive-backtick run in the content. The fix adds two private helpers and updates `buildGeneratedExampleDoc` to use them.

**Step 4a — Add helpers** immediately before `buildGeneratedExampleDoc` (before line 97):

```typescript
const countMaxBacktickRun = (text: string): number => {
  let max = 0
  let current = 0
  for (const char of text) {
    if (char === '`') {
      current++
      if (current > max) max = current
    } else {
      current = 0
    }
  }
  return max
}

const makeFence = (content: string, lang = ''): string => {
  const delimLength = Math.max(3, countMaxBacktickRun(content) + 1)
  const delim = '`'.repeat(delimLength)
  return `${delim}${lang}\n${content}\n${delim}`
}
```

**Step 4b — Update `buildGeneratedExampleDoc`** to use `makeFence`:

Current (lines 97–124):
```typescript
export const buildGeneratedExampleDoc = (row: ExampleRow, repoRoot: string): string => {
  const sourceCode = readFileSync(path.join(repoRoot, row.sourceFile), 'utf8').trimEnd()
  const inputJson = readFileSync(path.join(repoRoot, row.fixtureDir, 'input.json'), 'utf8').trimEnd()
  const expectedResult = readFileSync(path.join(repoRoot, row.fixtureDir, row.expectedResultFile), 'utf8').trimEnd()
  const title = row.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const outputLabel = row.assertionMode === 'serialised-output' ? 'Serialised output' : 'Output'
  const outputFence = row.assertionMode === 'serialised-output' ? 'text' : 'json'
  return [
    `# ${title}`,
    '',
    '```typescript',
    sourceCode,
    '```',
    '',
    '## Input',
    '',
    '```json',
    inputJson,
    '```',
    '',
    `## ${outputLabel}`,
    '',
    `\`\`\`${outputFence}`,
    expectedResult,
    '```',
    '',
  ].join('\n')
}
```

Replacement:
```typescript
export const buildGeneratedExampleDoc = (row: ExampleRow, repoRoot: string): string => {
  const sourceCode = readFileSync(path.join(repoRoot, row.sourceFile), 'utf8').trimEnd()
  const inputJson = readFileSync(path.join(repoRoot, row.fixtureDir, 'input.json'), 'utf8').trimEnd()
  const expectedResult = readFileSync(path.join(repoRoot, row.fixtureDir, row.expectedResultFile), 'utf8').trimEnd()
  const title = row.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const outputLabel = row.assertionMode === 'serialised-output' ? 'Serialised output' : 'Output'
  const outputFence = row.assertionMode === 'serialised-output' ? 'text' : 'json'
  return [
    `# ${title}`,
    '',
    makeFence(sourceCode, 'typescript'),
    '',
    '## Input',
    '',
    makeFence(inputJson, 'json'),
    '',
    `## ${outputLabel}`,
    '',
    makeFence(expectedResult, outputFence),
    '',
  ].join('\n')
}
```

**Important — no generated file regeneration needed:** `countMaxBacktickRun` returns 0 for all current example source files and fixtures (none contain backtick sequences), so `makeFence` produces a delimiter of length 3 — identical to the hard-coded `\`\`\``. The `verify-generated-files` check will pass without any regeneration.

---

### Fix 5 — `expectRepositoryPath` trailing-slash subdirectory constraint (AC 5)

**File:** `test/contract/examples/example-manifest.test.ts`

The runtime `validateFixturePath` requires `fixtureDir.startsWith('test/migration/fast-redact/fixtures/')` — the trailing slash enforces that the path names a subdirectory, not the base itself. The current contract test passes the bare base directory to `expectRepositoryPath`, which accepts it via `candidatePath === expectedPrefix`.

**Step 5a — Update `expectRepositoryPath`** (lines 39–48) to handle trailing-slash prefixes:

Current:
```typescript
const expectRepositoryPath = (candidatePath: string, expectedPrefix: string): void => {
  expect(posix.isAbsolute(candidatePath)).toBe(false)
  expect(candidatePath).not.toContain('\\')
  expect(candidatePath).not.toMatch(/(^|\/)\.\.(\/|$)/)
  expect(posix.normalize(candidatePath)).toBe(candidatePath)
  expect(candidatePath === expectedPrefix || candidatePath.startsWith(`${expectedPrefix}/`)).toBe(true)

  const resolvedPath = resolve(repoRoot, candidatePath)
  expect(relative(repoRoot, resolvedPath)).not.toMatch(/^\.\.(?:\/|\\|$)/)
}
```

Replacement:
```typescript
const expectRepositoryPath = (candidatePath: string, expectedPrefix: string): void => {
  expect(posix.isAbsolute(candidatePath)).toBe(false)
  expect(candidatePath).not.toContain('\\')
  expect(candidatePath).not.toMatch(/(^|\/)\.\.(\/|$)/)
  expect(posix.normalize(candidatePath)).toBe(candidatePath)
  const normalizedPrefix = expectedPrefix.endsWith('/') ? expectedPrefix : `${expectedPrefix}/`
  expect(candidatePath === expectedPrefix || candidatePath.startsWith(normalizedPrefix)).toBe(true)

  const resolvedPath = resolve(repoRoot, candidatePath)
  expect(relative(repoRoot, resolvedPath)).not.toMatch(/^\.\.(?:\/|\\|$)/)
}
```

**Step 5b — Update the migration call sites** (lines 92–99) to pass trailing-slash prefixes:

Current:
```typescript
if (row.category === 'migration-fast-redact') {
  expectRepositoryPath(row.fixtureDir, 'test/migration/fast-redact/fixtures')
} else if (row.category === 'migration-v3') {
  expectRepositoryPath(row.fixtureDir, 'test/migration/v3/fixtures')
} else {
  expectRepositoryPath(row.fixtureDir, `${fixtureRoot}/${row.id}`)
}
```

Replacement:
```typescript
if (row.category === 'migration-fast-redact') {
  expectRepositoryPath(row.fixtureDir, 'test/migration/fast-redact/fixtures/')
} else if (row.category === 'migration-v3') {
  expectRepositoryPath(row.fixtureDir, 'test/migration/v3/fixtures/')
} else {
  expectRepositoryPath(row.fixtureDir, `${fixtureRoot}/${row.id}`)
}
```

**Effect:** With `expectedPrefix = 'test/migration/fast-redact/fixtures/'` and `normalizedPrefix = 'test/migration/fast-redact/fixtures/'`:
- `candidatePath === expectedPrefix` → false for any real fixture path (good — bare base dir no longer passes)
- `candidatePath.startsWith(normalizedPrefix)` → true for e.g. `'test/migration/fast-redact/fixtures/dot-path-structured-output'` ✓

The non-migration else-branch is unaffected: `expectedPrefix = '${fixtureRoot}/${row.id}'` (no trailing slash), `normalizedPrefix = '${fixtureRoot}/${row.id}/'`, and the `=== expectedPrefix` branch handles the exact match case that applies to all real non-migration rows. ✓

---

### Order of Implementation

1. Apply Fix 1 to `scripts/example-validation.ts`
2. Apply Fix 3 (step 3a import) and Fix 4 (steps 4a + 4b) to `scripts/generated-files.ts`
3. Apply Fix 2 (steps 2a + 2b) and Fix 5 (steps 5a + 5b) to `test/contract/examples/example-manifest.test.ts`
4. Run tests and verify generated files (see Running Tests)

---

### Running Tests

**1. Run the contract test suite in verbose mode:**
```bash
source .agents/initialise-env.sh && pnpm run test -- --reporter=verbose test/contract/examples/example-manifest.test.ts
```

Expected: all existing tests pass, plus the new `ExampleVerificationError` property test (Fix 2).

**2. Run the full test suite:**
```bash
source .agents/initialise-env.sh && pnpm run test
```

**3. Verify generated files are unchanged:**
```bash
source .agents/initialise-env.sh && pnpm run verify-generated-files
```

This must pass without any file regeneration because `buildGeneratedExampleDoc`'s output is identical for the current examples (no source file contains backtick sequences).

---

### Deferred-Work Cleanup on Completion

When this story is marked `done` during code review, the reviewer must remove all five bullet items from `_bmad-output/implementation-artifacts/deferred-work.md` under:
- `## Deferred from: code review of 5-6-establish-the-worked-example-manifest-and-validation-harness (2026-05-22)` — the two items that are addressed here:
  - `loadExampleManifest surfaces a raw SyntaxError...`
  - `Contract tests do not assert ExampleVerificationError property fields...`
  - (The third item in that section — `verify:examples triggers a full rebuild on every CI run` — is NOT addressed by this story; leave it in place)
- `## Deferred from: code review of 5-8-publish-verified-migration-worked-examples-and-enforce-example-documentation-lockstep (2026-05-23)` — all three items:
  - `buildAllGeneratedExampleDocs calls loadExampleManifest without prior validateExampleManifest...`
  - `No backtick-fence escaping in buildGeneratedExampleDoc...`
  - `Contract test expectRepositoryPath is less strict than runtime validateFixturePath for migration rows...`

This is enforced by the project-context hard rule on deferred-item cleanup.

## File List

- `scripts/example-validation.ts` — Fix 1: wrap `loadExampleManifest` with try/catch including file path context
- `scripts/generated-files.ts` — Fix 3: import + call `validateExampleManifest` in `buildAllGeneratedExampleDocs`; Fix 4: `countMaxBacktickRun` + `makeFence` helpers, update `buildGeneratedExampleDoc`
- `test/contract/examples/example-manifest.test.ts` — Fix 2: import `ExampleVerificationError`, add property assertion test; Fix 5: `expectRepositoryPath` trailing-slash support, update migration call sites
- `_bmad-output/implementation-artifacts/6-5-harden-example-validation-and-documentation-generation-scripts.md` — story status, tasks, Dev Agent Record updated

## Change Log

| Date | Change |
|------|--------|
| 2026-05-24 | Story created with comprehensive implementation guide |
| 2026-05-24 | All five fixes implemented; 470 tests pass; verify-generated-files clean; status → review |

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all five fixes applied cleanly on first attempt; 470 tests passed; `verify-generated-files` clean.

### Completion Notes List

- Fix 1: `loadExampleManifest` in `scripts/example-validation.ts` now catches `readJsonFile` errors and re-throws with the full manifest path in the message.
- Fix 2: `ExampleVerificationError` imported and a new `it` block added to `test/contract/examples/example-manifest.test.ts` asserting all four properties (`rowId`, `fixtureDir`, `assertionMode`, `phase`) individually.
- Fix 3: `validateExampleManifest` imported and called in `buildAllGeneratedExampleDocs` in `scripts/generated-files.ts`, mirroring the guard pattern already used in `verifyExampleManifest`.
- Fix 4: `countMaxBacktickRun` and `makeFence` helpers added before `buildGeneratedExampleDoc`; all three fences in that function now use `makeFence`. Current examples contain no backtick sequences so generated output is byte-for-byte identical (verified).
- Fix 5: `expectRepositoryPath` in the contract test now normalises `expectedPrefix` to a trailing-slash form before the `startsWith` check; migration call sites updated to pass `'test/migration/fast-redact/fixtures/'` and `'test/migration/v3/fixtures/'` directly, matching the runtime `validateFixturePath` constraint.

### Review Findings

- [x] [Review][Patch] Error message prefix "parse" is misleading for IO/filesystem errors — changed to "Failed to load" [`scripts/example-validation.ts:136`]
- [x] [Review][Patch] `loadExampleManifest` discards original error's stack trace — added `{ cause: err }` to preserve it [`scripts/example-validation.ts:137`]
- [x] [Review][Patch] New `ExampleVerificationError` test uses try/catch without `expect.assertions(5)` — added guard [`test/contract/examples/example-manifest.test.ts:209`]
- [x] [Review][Patch] `phase` property asserted via hard-coded string literal — patched with `typeof verificationError.phase` type annotation for compile-time safety [`test/contract/examples/example-manifest.test.ts:237`]
- [x] [Review][Patch] Non-migration rows fall through to `else` without explicit category guard — added `expect(row.category).not.toMatch(/^migration-/)` guard [`test/contract/examples/example-manifest.test.ts:99`]
