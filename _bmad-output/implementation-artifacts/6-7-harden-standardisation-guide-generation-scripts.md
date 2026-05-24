# Story 6.7: Harden Standardisation Guide Generation Scripts

Status: done

## Story

As a platform or security evaluator,
I want the standardisation guide generation scripts to validate their inputs, handle errors gracefully, and produce structurally correct output under all manifest states,
so that guide generation fails visibly rather than silently and the rendered Markdown is always well-formed.

## Acceptance Criteria

1. **Given** the `CAPABILITY_EXAMPLES` ID list used in `scripts/standardisation-guide.ts:31-37`, **when** the guide generation script runs, **then** each ID is validated against the loaded example manifest before generation proceeds, and any ID absent from the manifest causes an immediate error identifying the missing ID.
2. **Given** the standardisation guide contract test resolves `repoRoot`, **when** `buildGeneratedStandardisationGuide` is tested, **then** the contract test derives `repoRoot` by importing `repositoryRoot` from `scripts/generated-files.ts` rather than computing an independent path — so that both sides of the lockstep assertion use the same root.
3. **Given** `buildGeneratedStandardisationGuide()` throws during generation, **when** `scripts/verify-generated-files.ts` calls it as part of the lockstep check, **then** the error is caught and added to the mismatches array with a descriptive context message, rather than propagating uncaught and discarding already-accumulated mismatches.
4. **Given** a fast-redact migration matrix row classified as `intentional-divergence`, **when** `row.v4Action` or one of its required sub-fields is `undefined` or missing, **then** `scripts/standardisation-guide.ts` emits a diagnostic warning identifying the row ID and the missing field rather than silently rendering `"undefined"` strings in the guide.
5. **Given** the `writeFileSync` call in `scripts/generate-standardisation-guide.ts` fails (or `buildGeneratedStandardisationGuide()` throws), **when** the error is caught, **then** a descriptive message including the target file path is emitted to `stderr` before the process exits with a non-zero code.
6. **Given** the fast-redact migration matrix has zero intentional-divergence rows, **when** the guide divergences section is rendered by `scripts/standardisation-guide.ts`, **then** no double blank lines appear in the output — the section either omits the divergence block entirely or renders a single blank line as the separator.
7. **Given** the standardisation guide contract test, **when** it validates the rendered guide, **then** it includes an explicit assertion that the divergence list is non-empty, so an accidental removal of all intentional-divergence rows from the matrix causes a test failure rather than a silent rendering change.

## Tasks / Subtasks

- [x] Add upfront manifest ID validation loop for each `CAPABILITY_EXAMPLES` entry before the `.map()` call in `scripts/standardisation-guide.ts` (AC: 1)
- [x] Replace the independently computed `repoRoot` in `test/contract/platform/standardisation-guide.test.ts` with the imported `repositoryRoot` from `scripts/generated-files.ts` (AC: 2)
- [x] Wrap the `buildGeneratedStandardisationGuide()` call and its diff check in `scripts/verify-generated-files.ts` with a try/catch that appends a descriptive mismatch entry (AC: 3)
- [x] Add null-safety guards for `row.v4Action` and its sub-fields in the `divergences.map()` call in `scripts/standardisation-guide.ts`, emitting a `console.warn` for missing fields (AC: 4)
- [x] Wrap the entire generation block in `scripts/generate-standardisation-guide.ts` with a try/catch that writes to `stderr` and calls `process.exit(1)` (AC: 5)
- [x] Fix the zero-divergence double-blank-line rendering in `scripts/standardisation-guide.ts` by making the intro sentence and divergence lines conditional on `divergences.length > 0` (AC: 6)
- [x] Add a contract test assertion in `test/contract/platform/standardisation-guide.test.ts` that the rendered guide's divergence list is non-empty (AC: 7)
- [x] Run `source .agents/initialise-env.sh && pnpm run test && pnpm run verify-generated-files` to confirm all tests pass and no generated files changed (All ACs)

## Dev Agent Record

### Completion Notes

All 7 ACs implemented and verified. 471/471 tests pass; `verify-generated-files` exits clean.

- **AC 1**: Added upfront `for...of` validation loop over `CAPABILITY_EXAMPLES` before the `.map()` call. Removed the now-redundant inline `if (manifestRow === undefined) throw` guard, replacing `.find()` result with a non-null assertion.
- **AC 2**: Removed independent `path`/`fileURLToPath`/`url` imports and the `repoRoot` const from the contract test. Now imports `repositoryRoot` directly from `scripts/generated-files.ts`.
- **AC 3**: Wrapped the `buildGeneratedStandardisationGuide()` call and its diff check in a try/catch that pushes a descriptive message to `mismatches` rather than propagating.
- **AC 4**: Added `warnMissing` module-level helper; `divergences.map()` now uses optional chaining + nullish coalescing for all three `v4Action` sub-fields.
- **AC 5**: Wrapped entire generation block in `scripts/generate-standardisation-guide.ts` with try/catch that writes to `stderr` and calls `process.exit(1)`.
- **AC 6**: Replaced the unconditional intro-sentence + blank-line + spread with a conditional spread `...(divergences.length > 0 ? [...] : [])` to prevent double blank lines when the divergence list is empty.
- **AC 7**: Added `it('guide divergence list is non-empty', ...)` contract test using a section-scoped regex match.

### File List

- `scripts/standardisation-guide.ts` — modified (AC 1, AC 4, AC 6)
- `scripts/generate-standardisation-guide.ts` — modified (AC 5)
- `scripts/verify-generated-files.ts` — modified (AC 3)
- `test/contract/platform/standardisation-guide.test.ts` — modified (AC 2, AC 7)

### Change Log

- 2026-05-24: Story 6.7 implemented — hardened standardisation guide generation scripts across all 7 ACs

## Dev Notes

**Deferred from:** Code review of Story 5.11 (2026-05-23).

**Environment bootstrap (required before any test or verify command):**
```bash
source .agents/initialise-env.sh
```

---

### Primary Files

| File | Change type |
|------|-------------|
| `scripts/standardisation-guide.ts` | Modify — AC 1: upfront validation loop; AC 4: null guards; AC 6: conditional divergence block |
| `scripts/generate-standardisation-guide.ts` | Modify — AC 5: try/catch with stderr and non-zero exit |
| `scripts/verify-generated-files.ts` | Modify — AC 3: try/catch around `buildGeneratedStandardisationGuide()` |
| `test/contract/platform/standardisation-guide.test.ts` | Modify — AC 2: import `repositoryRoot`; AC 7: divergence non-empty assertion |

No `src/` production files are modified. No fixture files are created.

---

### Codebase Context

**`scripts/standardisation-guide.ts`** (114 lines, ESM)

The file exports `buildStandardisationGuide(repoRoot: string): string` and the module-level constant `standardisationGuideDocPath`.

- **`CAPABILITY_EXAMPLES`** (lines 10–21): a `const` array of `{ label, exampleId }` pairs with 10 entries.

- **Divergence rendering** (lines 26–29): accesses `row.v4Action.*` without null guards:
  ```typescript
  const divergences = matrix.rows.filter(row => row.classification === 'intentional-divergence')
  const divergenceLines = divergences.map(row =>
    `- **${row.id}**: ${row.v4Action.fastRedactBehaviour} → ${row.v4Action.v4Behaviour} (${row.v4Action.reason})`
  )
  ```
  If a matrix row has a missing or undefined `v4Action`, this produces a runtime TypeError or renders literal `"undefined"` strings.

- **Capability lines** (lines 31–37): already has an inline validation guard inside `.map()`:
  ```typescript
  const capabilityLines = CAPABILITY_EXAMPLES.map(({ label, exampleId }) => {
    const manifestRow = manifest.rows.find(r => r.id === exampleId)
    if (manifestRow === undefined) {
      throw new Error(`standardisation-guide: example ID '${exampleId}' not found in example manifest`)
    }
    return `- [${label}](${manifestRow.docTarget})`
  })
  ```
  The task (AC 1) is to move this to an explicit **upfront validation pass** before the `.map()`, so all missing IDs are caught as a batch before any rendering begins. The inline guard is not wrong, but the upfront pass is the required pattern.

- **Zero-divergence blank lines** (lines ~70–74 inside the returned array template):
  ```typescript
  'The following intentional behavioural divergences from `fast-redact` have been validated for Deep Redact v4:',
  '',
  ...divergenceLines,
  '',
  'For the complete migration matrix...',
  ```
  When `divergenceLines` is empty, the spread contributes nothing, producing two consecutive `''` entries (the one before and the one after the spread). Joined with `\n`, this renders as three consecutive newlines (a double blank line) in the output.

**`scripts/generate-standardisation-guide.ts`** (7 lines, ESM):
```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })
writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())
console.log(`Wrote standardisation guide: ${generatedFilePaths.standardisationGuideDocPath}`)
```
No error handling. Both `buildGeneratedStandardisationGuide()` and `writeFileSync` can throw. AC 5 requires wrapping both in a try/catch with a descriptive `stderr` message and `process.exit(1)`.

**`scripts/verify-generated-files.ts`** (92 lines, ESM, relevant section lines 77–91):
```typescript
let currentStandardisationGuide: string
try {
  currentStandardisationGuide = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
} catch {
  mismatches.push('docs/platform/standardisation-guide.md is missing')
  currentStandardisationGuide = ''
}
const expectedStandardisationGuide = buildGeneratedStandardisationGuide()   // ← line 84, UNGUARDED
if (currentStandardisationGuide !== expectedStandardisationGuide) {
  mismatches.push('docs/platform/standardisation-guide.md is out of date')
}

if (mismatches.length > 0) {
  throw new Error(mismatches.join('\n'))
}
```
The call to `buildGeneratedStandardisationGuide()` at line 84 is not guarded. If it throws (e.g., a CAPABILITY_EXAMPLES ID absent from the manifest), the exception propagates immediately and discards all previously accumulated mismatches. AC 3 requires wrapping it.

**`test/contract/platform/standardisation-guide.test.ts`** (80 lines):
- Line 7 currently derives `repoRoot` independently:
  ```typescript
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  ```
  This produces the correct path in practice (3 levels up from `test/contract/platform/`), but it is computed independently of the module under test. AC 2 requires replacing this with the `repositoryRoot` export from `scripts/generated-files.ts`:
  ```typescript
  import { buildGeneratedStandardisationGuide, generatedFilePaths, repositoryRoot } from '../../../scripts/generated-files.ts'
  ```
  Then use `repositoryRoot` where `repoRoot` was used (line 15). Remove the now-unneeded `path`, `fileURLToPath`, and `url` imports if they are no longer used.
- The test suite has no assertion checking that the guide's divergence list is non-empty (AC 7).

---

### Fix 1 — Upfront CAPABILITY_EXAMPLES validation (AC 1)

**File:** `scripts/standardisation-guide.ts`

Add a validation pass at the start of `buildStandardisationGuide`, before the `divergences` filter and the `capabilityLines` map:

```typescript
export const buildStandardisationGuide = (repoRoot: string): string => {
  const manifest = loadExampleManifest(repoRoot)
  const matrix = loadFastRedactMigrationMatrix(repoRoot)

  // AC 1 — validate all CAPABILITY_EXAMPLES IDs upfront
  for (const { exampleId } of CAPABILITY_EXAMPLES) {
    if (!manifest.rows.some(r => r.id === exampleId)) {
      throw new Error(`standardisation-guide: CAPABILITY_EXAMPLES references unknown example ID: "${exampleId}"`)
    }
  }

  const divergences = matrix.rows.filter(row => row.classification === 'intentional-divergence')
  // ...
```

Then remove the redundant inline `if (manifestRow === undefined) throw` check from the `.map()`, since the upfront loop now guarantees all IDs are present:

```typescript
const capabilityLines = CAPABILITY_EXAMPLES.map(({ label, exampleId }) => {
  const manifestRow = manifest.rows.find(r => r.id === exampleId)!
  return `- [${label}](${manifestRow.docTarget})`
})
```

---

### Fix 2 — repoRoot alignment in contract test (AC 2)

**File:** `test/contract/platform/standardisation-guide.test.ts`

Replace the independent path computation with the canonical import:

```typescript
// Before (line 7):
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

// After — import repositoryRoot from the module under test:
import { buildGeneratedStandardisationGuide, generatedFilePaths, repositoryRoot } from '../../../scripts/generated-files.ts'
```

Then replace `repoRoot` with `repositoryRoot` on line 15:
```typescript
const expected = buildGeneratedStandardisationGuide(repositoryRoot)
```

Remove `import path from 'node:path'`, `import { fileURLToPath } from 'node:url'`, and the `repoRoot` const declaration if they are no longer needed elsewhere in the file.

---

### Fix 3 — Verify script error propagation (AC 3)

**File:** `scripts/verify-generated-files.ts` — lines 84–87.

**Current:**
```typescript
const expectedStandardisationGuide = buildGeneratedStandardisationGuide()
if (currentStandardisationGuide !== expectedStandardisationGuide) {
  mismatches.push('docs/platform/standardisation-guide.md is out of date')
}
```

**Replace with:**
```typescript
try {
  const expectedStandardisationGuide = buildGeneratedStandardisationGuide()
  if (currentStandardisationGuide !== expectedStandardisationGuide) {
    mismatches.push('docs/platform/standardisation-guide.md is out of date')
  }
} catch (err) {
  mismatches.push(`standardisation guide generation failed: ${err instanceof Error ? err.message : String(err)}`)
}
```

---

### Fix 4 — Null-safety guards for divergence rows (AC 4)

**File:** `scripts/standardisation-guide.ts` — the `divergences.map()` at lines 27–29.

Add optional chaining and a helper that emits a warning and returns a fallback string:

```typescript
const warnMissing = (rowId: string, field: string): string => {
  console.warn(`standardisation-guide: row "${rowId}" is missing v4Action.${field}`)
  return `[missing: ${field}]`
}

const divergenceLines = divergences.map(row => {
  const fastRedactBehaviour = row.v4Action?.fastRedactBehaviour ?? warnMissing(row.id, 'fastRedactBehaviour')
  const v4Behaviour = row.v4Action?.v4Behaviour ?? warnMissing(row.id, 'v4Behaviour')
  const reason = row.v4Action?.reason ?? warnMissing(row.id, 'reason')
  return `- **${row.id}**: ${fastRedactBehaviour} → ${v4Behaviour} (${reason})`
})
```

Place `warnMissing` immediately before `buildStandardisationGuide` (module-level helper, not exported).

---

### Fix 5 — writeFileSync error handling (AC 5)

**File:** `scripts/generate-standardisation-guide.ts`

**Current:**
```typescript
mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })
writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())
console.log(`Wrote standardisation guide: ${generatedFilePaths.standardisationGuideDocPath}`)
```

**Replace with:**
```typescript
try {
  mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })
  writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())
  console.log(`Wrote standardisation guide: ${generatedFilePaths.standardisationGuideDocPath}`)
} catch (err) {
  process.stderr.write(
    `Error writing standardisation guide to ${generatedFilePaths.standardisationGuideDocPath}: ${err instanceof Error ? err.message : String(err)}\n`,
  )
  process.exit(1)
}
```

---

### Fix 6 — Zero-divergence double blank lines (AC 6)

**File:** `scripts/standardisation-guide.ts` — inside the returned array template, around the `...divergenceLines` spread.

**Current (relevant excerpt of the returned array):**
```typescript
'The following intentional behavioural divergences from `fast-redact` have been validated for Deep Redact v4:',
'',
...divergenceLines,
'',
'For the complete migration matrix and fixture-verified examples, see ...',
```

**Replace with a conditional block:**
```typescript
...(divergences.length > 0
  ? [
      'The following intentional behavioural divergences from `fast-redact` have been validated for Deep Redact v4:',
      '',
      ...divergenceLines,
      '',
    ]
  : []),
'For the complete migration matrix and fixture-verified examples, see ...',
```

This ensures that when `divergences` is empty, the intro sentence, the blank line before the list, and the blank line after the list are all omitted, leaving only a single blank line before `'For the complete...'` (the one that precedes this entire block in the template).

---

### Fix 7 — Contract test: divergence list non-empty assertion (AC 7)

**File:** `test/contract/platform/standardisation-guide.test.ts`

Add a new `it` block after the existing capability links test:

```typescript
it('guide divergence list is non-empty', () => {
  const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
  const migrationSection = content.slice(content.indexOf('### fast-redact migration'))
  const hasDivergenceLine = /^- \*\*/.test(migrationSection.split('\n').find(l => l.startsWith('- **')) ?? '')
  expect(hasDivergenceLine, 'Expected at least one intentional-divergence entry in the guide').toBe(true)
})
```

Alternatively, a simpler form that checks for the bullet pattern directly in the migration section:

```typescript
it('guide divergence list is non-empty', () => {
  const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
  const sectionStart = content.indexOf('### fast-redact migration')
  const sectionEnd = content.indexOf('\n### ', sectionStart + 1)
  const section = sectionEnd === -1 ? content.slice(sectionStart) : content.slice(sectionStart, sectionEnd)
  expect(section, 'Expected at least one intentional-divergence bullet in fast-redact migration section').toMatch(/^- \*\*/m)
})
```

Use whichever form is most consistent with the existing assertion style in the test file.

---

### Defects Identified During Story Repair (2026-05-24)

The following were found by cross-referencing the story against the actual source files and are corrected in the tasks and dev notes above:

1. **AC 1 current-state description was wrong** — the original story stated "The current script calls `manifest.rows.find(r => r.id === id)` inside a template expression with no prior validation." The actual code already throws an explicit error inline when `manifestRow === undefined`. The task is still valid (an upfront validation pass is the required pattern), but the false premise would mislead the dev agent into thinking there is no guard at all.

2. **AC 4 line number was wrong** — the original story cited `scripts/standardisation-guide.ts:30`. Line 30 is `) as const` (the close of `CAPABILITY_EXAMPLES`). The actual divergence rendering needing null guards is lines 27–29 (inside `divergences.map()`).

3. **AC 5 scope was too narrow** — the original story said "the `writeFileSync` call … fails". In the actual file, `buildGeneratedStandardisationGuide()` is called as an argument to `writeFileSync` on the same expression. If the generation step throws, there is no `writeFileSync` failure — the error comes from the builder. The try/catch must cover both; the corrected fix above wraps the entire block.

4. **AC 6 fix was vague and referenced a non-existent function** — the original story suggested `divergences.length > 0 ? renderDivergences(divergences) : ''` but there is no `renderDivergences` function in the codebase. The actual fix (shown above) uses a conditional spread of `[intro, '', ...divergenceLines, '']` within the existing array template.

5. **AC 2 alignment approach was unspecified** — the original story said "derives `repoRoot` using the same method as the verify script's default resolution" without stating what that method is. The correct fix is to import the `repositoryRoot` export from `scripts/generated-files.ts` so the contract test and module under test share a single source of truth for the root path.

6. **No Primary Files table, no Codebase Context, no verification command** — all three are added above.

---

### Review Findings (2026-05-24)

- [x] [Review][Patch] Replace `warnMissing` warn+sentinel with explicit `throw` for missing `v4Action` sub-fields — patched, decision resolved as throw [`scripts/standardisation-guide.ts:39-44`]

- [x] [Review][Patch] Double mismatch entry when standardisation guide is missing and generation succeeds — patched, skip lockstep comparison when file is missing [`scripts/verify-generated-files.ts:77-91`]
- [x] [Review][Patch] `buildGeneratedStandardisationGuide` parameter vs module-load-time `repositoryRoot` inconsistency — patched, removed `repoRoot` parameter; wrapper always uses module-level `repositoryRoot` [`scripts/generated-files.ts:160-162`]
