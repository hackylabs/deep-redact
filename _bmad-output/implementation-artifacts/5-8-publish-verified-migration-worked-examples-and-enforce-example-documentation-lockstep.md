# Story 5.8: Publish Verified Migration Worked Examples and Enforce Example Documentation Lockstep

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want migration worked examples and published example documentation to stay locked to the same canonical artefacts,
so that release examples remain both executable and trustworthy across migration tracks.

## Acceptance Criteria

1. Given the canonical example manifest, when the admitted migration example set is reviewed before release, then it includes at least one `migration-fast-redact` row and at least one `migration-v3` row.
2. Given migration example rows in the canonical example manifest, when they are reviewed, then `migration-fast-redact` rows reuse the canonical migration fixtures from Story `5.4` and `migration-v3` rows reuse the canonical migration fixtures from Story `5.5`.
3. Given a migration row in the canonical example manifest, when validation completes, then the produced result matches the row's `expectedResultFile` exactly under that row's assertion mode.
4. Given a published worked example in release documentation, when it is rendered to its `docTarget`, then it is generated from or validated directly against the same manifest row, source file, fixture directory, and expected result used by example validation.
5. Given the published examples and the example validation suite, when they are maintained over time, then documentation drift causes the same validation workflow to fail.
6. Given this story's scope, when the implementation is reviewed, then benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Extend `validateFixturePath` in `scripts/example-validation.ts` to accept migration category fixture dirs (AC: 2, 3)
  - [x] For rows with `category === 'migration-fast-redact'`: accept `fixtureDir` values starting with `test/migration/fast-redact/fixtures/` with no `..` traversal
  - [x] For rows with `category === 'migration-v3'`: accept `fixtureDir` values starting with `test/migration/v3/fixtures/` with no `..` traversal
  - [x] All other rows: retain existing enforcement (`fixtureDir === docs/examples/fixtures/${row.id}`)

- [x] Add 2 migration rows to `docs/examples/manifest.json` (AC: 1, 2)
  - [x] Row `migration-fast-redact-dot-path-structured-output`: category `migration-fast-redact`, `assertionMode` `structured-output`, `docTarget` `docs/examples/migration-fast-redact-dot-path-structured-output.md`, `sourceFile` `docs/examples/examples/migration-fast-redact-dot-path-structured-output.ts`, `fixtureDir` `test/migration/fast-redact/fixtures/dot-path-structured-output`, `expectedResultFile` `expected-v4.json`
  - [x] Row `migration-v3-class-instantiation-to-factory`: category `migration-v3`, `assertionMode` `structured-output`, `docTarget` `docs/examples/migration-v3-class-instantiation-to-factory.md`, `sourceFile` `docs/examples/examples/migration-v3-class-instantiation-to-factory.ts`, `fixtureDir` `test/migration/v3/fixtures/class-instantiation-to-factory`, `expectedResultFile` `expected-v4.json`

- [x] Create 2 migration example source files under `docs/examples/examples/` (AC: 3)
  - [x] `migration-fast-redact-dot-path-structured-output.ts` — see Example Source Specifications below
  - [x] `migration-v3-class-instantiation-to-factory.ts` — see Example Source Specifications below

- [x] Create example documentation generator in `scripts/generated-files.ts` (AC: 4, 5)
  - [x] Import `loadExampleManifest` and `ExampleRow` from `./example-validation.ts`
  - [x] Add `buildGeneratedExampleDoc(row, repositoryRoot): string` — renders one manifest row to markdown using the row's source file and fixture files
  - [x] Add `buildAllGeneratedExampleDocs(repoRoot?: string): Record<string, string>` — loads the manifest and returns a map of absolute `docPath → content` for every row

- [x] Create `scripts/generate-example-docs.ts` standalone script (AC: 4)
  - [x] Calls `buildAllGeneratedExampleDocs()`, writes each file, reports what was written
  - [x] Add `"generate:example-docs": "node --experimental-strip-types ./scripts/generate-example-docs.ts"` to `package.json` scripts

- [x] Wire example docs into `scripts/verify-generated-files.ts` (AC: 5)
  - [x] Import `buildAllGeneratedExampleDocs` from `./generated-files.ts`
  - [x] For each entry in `buildAllGeneratedExampleDocs()`: read the committed file and compare; record mismatch if the file is missing or differs from the generated content

- [x] Generate all example documentation files (AC: 4)
  - [x] Run `source .agents/initialise-env.sh && pnpm run generate:example-docs` to produce all `docs/examples/*.md` files (17 total: 15 non-migration from Story `5.7` + 2 migration from this story)

- [x] Update the contract test at `test/contract/examples/example-manifest.test.ts` (AC: 1, 2, 3)
  - [x] Update the `verifyExampleManifest` test: change `toHaveLength(15)` to `toHaveLength(17)` and add the 2 migration row ids to the ordered id list
  - [x] Update the non-migration row-count test: change the unfiltered `toHaveLength(15)` to filter non-migration rows first, then assert `toHaveLength(15)` on the filtered array, and drop the `.every()` assertion
  - [x] Update the `'keeps fixtureDir confined to docs/examples/fixtures/'` test: it currently iterates ALL rows and checks `docs/examples/fixtures/${row.id}` for every row — this will fail for migration rows; replace with category-aware assertions (see Contract Test Updates below)
  - [x] Add a migration coverage test: assert at least 1 row has `category === 'migration-fast-redact'` and at least 1 row has `category === 'migration-v3'`

- [x] Maintain scope boundaries (AC: 6)
  - [x] Do not add more than the 2 specified migration rows
  - [x] Do not touch `scripts/verify-examples.ts` — it requires no changes
  - [x] Do not touch migration infrastructure: `scripts/v3-migration.ts`, `scripts/verify-v3-migration.ts`, `scripts/fast-redact-migration.ts`, `scripts/verify-fast-redact-migration.ts`, `test/migration/`
  - [x] Do not create new fixture dirs under `docs/examples/fixtures/` for migration rows — they reuse `test/migration/` dirs directly
  - [x] Do not touch benchmark or platform-adoption files

- [x] Verify the story implementation (AC: 1–6)
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:examples` — must report 17 verified rows with no failures
  - [x] Run `source .agents/initialise-env.sh && pnpm run build` — must pass including `verify-generated-files` gate (which now also checks example docs lockstep)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract` — all contract tests must pass including the updated `example-manifest.test.ts`
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`

## Dev Notes

### Story Intent

Story `5.8` has two parallel responsibilities:

1. **Migration example coverage** — add `migration-fast-redact` and `migration-v3` rows to the example manifest so the manifest covers all FR31 example categories. These rows reuse the existing migration fixture dirs (`test/migration/fast-redact/fixtures/` and `test/migration/v3/fixtures/`) directly rather than duplicating fixture data.

2. **Documentation lockstep** — introduce a documentation generator that produces `docs/examples/*.md` files from the manifest, and wire it into `verify-generated-files.ts` so that any drift between the manifest/fixtures and committed docs causes the build to fail. This generator applies to ALL manifest rows (all 17), not just migration rows — the 15 non-migration docs are also produced by this machinery.

Story `5.7` deliberately left `docs/examples/*.md` files uncreated. Story `5.8` creates the generation machinery and generates all of them.

### Source Document Summary

- FR31 requires worked examples covering `fast-redact` migration and v3 migration. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:434)]
- `docs/examples/` is the declared location for worked examples. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:889)]

### Current Repository State

- `docs/examples/manifest.json` has `schemaVersion: 1` and 15 non-migration rows from Story `5.7`. No `docs/examples/*.md` files exist yet.
- `scripts/example-validation.ts` is the harness; `scripts/verify-examples.ts` is the entrypoint.
- `scripts/generated-files.ts` is the pattern to extend for documentation generation.
- `scripts/verify-generated-files.ts` is the pattern to extend for documentation lockstep checking.
- The `build` script is `pnpm run verify-generated-files && pnpm exec tsdown`. Extending `verify-generated-files.ts` to check example docs puts them on the same release gate as the migration guides.
- The `verify:examples` script is `pnpm run build && node --experimental-strip-types ./scripts/verify-examples.ts`.

### Package and Execution

- Package: `@hackylabs/deep-redact`, Node engine floor `>=22.18.0`.
- All scripts use `node --experimental-strip-types` for direct TypeScript execution — no compilation step for scripts.
- Scripts live in `scripts/`, imports use `./module.ts` with extension, repo-root-relative paths resolved via `import.meta.url`.

### Manifest Row Specifications for Migration Rows

Add these two rows to the `rows` array in `docs/examples/manifest.json` after the existing 15 rows:

```json
{
  "id": "migration-fast-redact-dot-path-structured-output",
  "category": "migration-fast-redact",
  "docTarget": "docs/examples/migration-fast-redact-dot-path-structured-output.md",
  "sourceFile": "docs/examples/examples/migration-fast-redact-dot-path-structured-output.ts",
  "fixtureDir": "test/migration/fast-redact/fixtures/dot-path-structured-output",
  "assertionMode": "structured-output",
  "expectedResultFile": "expected-v4.json"
}
```

```json
{
  "id": "migration-v3-class-instantiation-to-factory",
  "category": "migration-v3",
  "docTarget": "docs/examples/migration-v3-class-instantiation-to-factory.md",
  "sourceFile": "docs/examples/examples/migration-v3-class-instantiation-to-factory.ts",
  "fixtureDir": "test/migration/v3/fixtures/class-instantiation-to-factory",
  "assertionMode": "structured-output",
  "expectedResultFile": "expected-v4.json"
}
```

**Why these two rows:**
- `dot-path-structured-output` is a `direct-equivalent` fast-redact row — the simplest possible migration case, pedagogically clear.
- `class-instantiation-to-factory` is the canonical v3→v4 entry-point row — covers the `new DeepRedact → deepRedact` rename plus the `blacklistedKeys → keys` and `replacement → censor` option renames.

### Example Source Specifications

**`docs/examples/examples/migration-fast-redact-dot-path-structured-output.ts`:**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.password'] })

export const runExample = (input: unknown): unknown => redactor(input)
```
Note: The v4 config is taken directly from `v4Action.config` in `test/migration/fast-redact/matrix.json` row `dot-path-structured-output`. The fixture input is `{ "user": { "name": "Ada", "password": "secret" }, "requestId": "req-1" }` and expected output is `{ "user": { "name": "Ada", "password": "[REDACTED]" }, "requestId": "req-1" }` — both in `test/migration/fast-redact/fixtures/dot-path-structured-output/`.

**`docs/examples/examples/migration-v3-class-instantiation-to-factory.ts`:**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password', 'token'], censor: '[REDACTED]' })

export const runExample = (input: unknown): unknown => redactor(input)
```
Note: The v4 config is taken from `v4Usage.config` in `test/migration/v3/matrix.json` row `class-instantiation-to-factory`. The fixture input is `{ "user": { "password": "secret123" }, "token": "abc", "email": "user@example.com" }` and expected output is `{ "user": { "password": "[REDACTED]" }, "token": "[REDACTED]", "email": "user@example.com" }` — both in `test/migration/v3/fixtures/class-instantiation-to-factory/`.

### validateFixturePath Change

`scripts/example-validation.ts` currently enforces `fixtureDir === docs/examples/fixtures/${row.id}` for all rows. Change only `validateFixturePath` (do not touch anything else in this file):

```typescript
// Before (applies to all rows):
if (row.fixtureDir !== `docs/examples/fixtures/${row.id}`) { /* throw */ }

// After (category-aware):
if (row.category === 'migration-fast-redact') {
  if (!row.fixtureDir.startsWith('test/migration/fast-redact/fixtures/') || row.fixtureDir.includes('..')) {
    throw new ExampleVerificationError(/* ... */)
  }
} else if (row.category === 'migration-v3') {
  if (!row.fixtureDir.startsWith('test/migration/v3/fixtures/') || row.fixtureDir.includes('..')) {
    throw new ExampleVerificationError(/* ... */)
  }
} else {
  if (row.fixtureDir !== `docs/examples/fixtures/${row.id}`) {
    throw new ExampleVerificationError(/* ... */)
  }
}
```

Use whatever error type `validateFixturePath` currently uses (likely `ExampleVerificationError` or a plain `Error` — match the existing pattern). The validation phase is `'fixture'` for fixture path errors.

### Documentation Generator Pattern

Add to `scripts/generated-files.ts` following the existing imports and builder pattern:

```typescript
import { loadExampleManifest } from './example-validation.ts'
import type { ExampleRow } from './example-validation.ts'
```

Add these two exported functions:

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

export const buildAllGeneratedExampleDocs = (repoRoot: string = repositoryRoot): Record<string, string> => {
  const manifest = loadExampleManifest(repoRoot)
  const result: Record<string, string> = {}
  for (const row of manifest.rows) {
    result[path.join(repoRoot, row.docTarget)] = buildGeneratedExampleDoc(row, repoRoot)
  }
  return result
}
```

Note: `repositoryRoot` is the existing module-level constant in `generated-files.ts` (the repo root resolved via `import.meta.url`). Re-use it as the default.

### verify-generated-files.ts Extension

Two separate edits are required to `scripts/verify-generated-files.ts`:

**Step 1 — add imports at the TOP of the file, alongside the existing imports:**
```typescript
import { buildAllGeneratedExampleDocs } from './generated-files.ts'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
```
Check the existing import block first — `path` and `fileURLToPath` are not currently present; add them. Do not duplicate any import that is already there.

**Step 2 — append this runtime code at the BOTTOM of the file, after the final existing mismatch check:**
```typescript
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repositoryRootForDocs = path.resolve(scriptDir, '..')

const exampleDocs = buildAllGeneratedExampleDocs(repositoryRootForDocs)
for (const [docPath, expectedContent] of Object.entries(exampleDocs)) {
  const relativePath = path.relative(repositoryRootForDocs, docPath)
  try {
    const currentContent = readFileSync(docPath, 'utf8')
    if (currentContent !== expectedContent) {
      mismatches.push(`${relativePath} is out of date`)
    }
  } catch {
    mismatches.push(`${relativePath} is missing`)
  }
}
```

If `repositoryRoot` is exported from `generated-files.ts` (after you export it there), you may import and reuse it directly instead of recomputing via `import.meta.url`.

### generate-example-docs.ts Script

Create `scripts/generate-example-docs.ts`:

```typescript
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAllGeneratedExampleDocs } from './generated-files.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docs = buildAllGeneratedExampleDocs(repositoryRoot)

for (const [docPath, content] of Object.entries(docs)) {
  mkdirSync(path.dirname(docPath), { recursive: true })
  writeFileSync(docPath, content, 'utf8')
  console.log(`Generated ${path.relative(repositoryRoot, docPath)}`)
}
```

Add to `package.json` scripts:
```json
"generate:example-docs": "node --experimental-strip-types ./scripts/generate-example-docs.ts"
```

### Contract Test Updates

The test file is `test/contract/examples/example-manifest.test.ts`.

**Update 1 — `verifyExampleManifest` integration test (currently expects 15 rows):**
```typescript
// Change toHaveLength(15) to toHaveLength(17)
expect(result).toHaveLength(17)
// Add the 2 migration ids to the ordered id list (appended after 'console-redaction'):
expect(result.map(r => r.id)).toStrictEqual([
  'singleton-setup',
  'key-targeting',
  'regex-property-matching',
  'path-targeting',
  'regex-path-segment-matching',
  'substring-targeting',
  'root-primitive-redaction',
  'replacement-and-removal',
  'retain-structure',
  'same-length-replacement',
  'serialised-output',
  'ignored-value-types',
  'custom-transformer',
  'graceful-error-replacement',
  'console-redaction',
  'migration-fast-redact-dot-path-structured-output',
  'migration-v3-class-instantiation-to-factory',
])
```

**Update 2 — non-migration row-count test (currently checks unfiltered `toHaveLength(15)`):**
The test currently reads: `expect(manifest.rows).toHaveLength(15)` and `expect(manifest.rows.every(r => !r.category.startsWith('migration-'))).toBe(true)`. The manifest now has 17 total rows, so the unfiltered assertion must change to filter first. Drop the `.every()` assertion — it is redundant on a filtered array. Update the full test body to:
```typescript
it('contains exactly 15 non-migration example rows', () => {
  const manifest = loadExampleManifest(repoRoot)
  const nonMigrationRows = manifest.rows.filter(r => !r.category.startsWith('migration-'))
  expect(nonMigrationRows).toHaveLength(15)
})
```

**Update 3 — new migration coverage test:**
```typescript
it('contains at least one migration-fast-redact row and at least one migration-v3 row', () => {
  const manifest = loadExampleManifest(repoRoot)
  const hasFastRedact = manifest.rows.some(r => r.category === 'migration-fast-redact')
  const hasV3 = manifest.rows.some(r => r.category === 'migration-v3')
  expect(hasFastRedact).toBe(true)
  expect(hasV3).toBe(true)
})
```

**Update 4 — `'keeps fixtureDir confined to docs/examples/fixtures/'` test (currently iterates all rows):**
This test at line 88–92 checks `expectRepositoryPath(row.fixtureDir, \`${fixtureRoot}/${row.id}\`)` for every row without exception. Once migration rows are added their `fixtureDir` values start with `test/migration/...`, which fails the prefix check. Replace the test body with category-aware assertions:
```typescript
it('keeps fixtureDir within expected fixture directories for every row', () => {
  const manifest = loadExampleManifest(repoRoot)
  for (const row of manifest.rows) {
    if (row.category === 'migration-fast-redact') {
      expectRepositoryPath(row.fixtureDir, 'test/migration/fast-redact/fixtures')
    } else if (row.category === 'migration-v3') {
      expectRepositoryPath(row.fixtureDir, 'test/migration/v3/fixtures')
    } else {
      expectRepositoryPath(row.fixtureDir, `${fixtureRoot}/${row.id}`)
    }
  }
})
```

Follow the `describe` block structure and import pattern of the existing test file exactly.

### Architecture Compliance

- British English in all code, comments, tests, docs, and commit messages. Use `serialise` (not `serialize`), `artefacts` (not `artifacts` in prose).
- `docs/examples/` — generated docs go here at `docs/examples/<id>.md`.
- Do not call `new DeepRedact` anywhere in example source files — use `deepRedact` factory.
- All verify scripts run with `pnpm run build` first. The `verify:examples` script already runs build — do not skip it.
- The `build` script calls `verify-generated-files` first, which after this story also checks example docs. Committed docs must match generated output or `pnpm run build` will fail.

### Order of Operations for the Developer

1. Extend `validateFixturePath` in `scripts/example-validation.ts`.
2. Add migration rows to `docs/examples/manifest.json`.
3. Create 2 migration source files in `docs/examples/examples/`.
4. Extend `scripts/generated-files.ts` with `buildGeneratedExampleDoc` and `buildAllGeneratedExampleDocs`.
5. Create `scripts/generate-example-docs.ts`.
6. Add `generate:example-docs` script to `package.json`.
7. Extend `scripts/verify-generated-files.ts` to check example docs.
8. Run `source .agents/initialise-env.sh && pnpm run generate:example-docs` to generate all 17 docs.
9. Update `test/contract/examples/example-manifest.test.ts`.
10. Run `source .agents/initialise-env.sh && pnpm run verify:examples` — must report 17 rows.
11. Run `source .agents/initialise-env.sh && pnpm run build` — must pass (including example docs lockstep).
12. Run `source .agents/initialise-env.sh && pnpm run test:contract` — all tests pass.
13. Run `source .agents/initialise-env.sh && pnpm run lint`.

### Known Gotchas

**`ExampleRow` import form:** `scripts/example-validation.ts` declares `export interface ExampleRow`. Use the inline `type` modifier form consistent with the existing test file pattern: `import { loadExampleManifest, type ExampleRow } from './example-validation.ts'`. Do not use a separate `import type` statement — the combined form keeps the import block concise.

**`loadExampleManifest` signature:** `loadExampleManifest(repositoryRoot)` takes the repository root as a string. Confirm the exact signature in `scripts/example-validation.ts` before calling it from `generated-files.ts`.

**`repositoryRoot` in `generated-files.ts`:** It is a module-level constant, not exported. To allow `buildAllGeneratedExampleDocs` to default to it, either export it (adding `export const repositoryRoot = ...`) or define the default inline. Do not import it from `verify-generated-files.ts`.

**Migration fixture `expected-v4.json` vs `expected.json`:** Migration fixtures use `expected-v4.json`, not `expected.json`. The manifest rows for migration examples set `expectedResultFile: "expected-v4.json"` explicitly. Do not confuse with the non-migration fixture convention.

**`verify-generated-files.ts` imports:** The existing script imports `readFileSync` from `node:fs`. If `path` is not already imported, add it. Check the existing import block before modifying.

**`buildAllGeneratedExampleDocs` is called during `verify-generated-files` which is called during `pnpm run build`:** This means `loadExampleManifest` must succeed at build time. The manifest is always present in the repo so this is safe. The script also reads fixture files and source files — these too must be present at build time (they are, since they are committed).

**Row order in `manifest.json`:** Migration rows are appended after the existing 15 rows. The contract test's ordered id list must match exactly.

**`generate:example-docs` must be run before `pnpm run build` passes:** After adding example docs to `verify-generated-files`, `build` will fail until all docs are generated and committed. Run `generate:example-docs` to create them, then verify `build` passes.

### Previous Story Intelligence (5.7)

- Story `5.7` established all 15 non-migration rows. Files are in place: `docs/examples/examples/*.ts`, `docs/examples/fixtures/*/`, `docs/examples/manifest.json`.
- `validateFixturePath` currently enforces `docs/examples/fixtures/${row.id}` for all rows — this is the only gating check that must change for migration support.
- `fixtureDir === fixtureRoot` alone is rejected — confirmed by 5.7 review. Migration `fixtureDir` must still include the specific fixture id subdirectory (e.g., `test/migration/fast-redact/fixtures/dot-path-structured-output`, not just `test/migration/fast-redact/fixtures`).
- `runFn` result is awaited: `const actual = await Promise.resolve(runFn(input))`. Sync `runExample` exports work fine.
- `process.cwd()` in contract tests is environment-sensitive — the test uses `import.meta.url`-based `repoRoot` resolution. Follow this pattern for new tests.
- The `custom-transformer` dev note: `TransformersByConstructor` only admits specific constructor names. The migration example source files do not use custom transformers, so this does not apply.

### Project Context Reference

- British English in all code, comments, tests, docs, and commit messages. Use `serialise` (not `serialize`), `recognised` (not `recognized`), `artefacts` (not `artifacts` in prose). [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:430)]
- Node, package-manager, build, lint, test, and verify commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: project-context.md]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: project-context.md]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: project-context.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Extended `validateFixturePath` in `scripts/example-validation.ts` with category-aware logic: migration-fast-redact rows accept `test/migration/fast-redact/fixtures/` prefix, migration-v3 rows accept `test/migration/v3/fixtures/` prefix, all other rows retain the existing `docs/examples/fixtures/${row.id}` enforcement.
- Added 2 migration rows to `docs/examples/manifest.json` (17 total): `migration-fast-redact-dot-path-structured-output` and `migration-v3-class-instantiation-to-factory`, reusing existing migration fixture directories.
- Created 2 migration example source files under `docs/examples/examples/` using the `deepRedact` factory (not `new DeepRedact`).
- Added `buildGeneratedExampleDoc` and `buildAllGeneratedExampleDocs` to `scripts/generated-files.ts`; exported `repositoryRoot` constant.
- Created `scripts/generate-example-docs.ts` standalone script and added `generate:example-docs` script to `package.json`.
- Extended `scripts/verify-generated-files.ts` to check all 17 example docs are in lockstep with their manifest/fixture sources.
- Generated all 17 `docs/examples/*.md` files via `pnpm run generate:example-docs`.
- Updated `test/contract/examples/example-manifest.test.ts`: 17-row integration test, filtered non-migration row count, category-aware fixtureDir test, migration coverage test.
- All verification gates pass: `verify:examples` (17 rows), `build` (including generated-files lockstep), `test:contract` (437 tests), `lint` (clean).

### File List

- `scripts/example-validation.ts` — extended `validateFixturePath` with category-aware migration path logic
- `docs/examples/manifest.json` — added 2 migration rows (17 total)
- `docs/examples/examples/migration-fast-redact-dot-path-structured-output.ts` — new migration source file
- `docs/examples/examples/migration-v3-class-instantiation-to-factory.ts` — new migration source file
- `scripts/generated-files.ts` — added `buildGeneratedExampleDoc`, `buildAllGeneratedExampleDocs`; exported `repositoryRoot`; added `loadExampleManifest`/`ExampleRow` import
- `scripts/generate-example-docs.ts` — new standalone generation script
- `package.json` — added `generate:example-docs` script
- `scripts/verify-generated-files.ts` — wired example docs lockstep check
- `docs/examples/singleton-setup.md` — generated
- `docs/examples/key-targeting.md` — generated
- `docs/examples/regex-property-matching.md` — generated
- `docs/examples/path-targeting.md` — generated
- `docs/examples/regex-path-segment-matching.md` — generated
- `docs/examples/substring-targeting.md` — generated
- `docs/examples/root-primitive-redaction.md` — generated
- `docs/examples/replacement-and-removal.md` — generated
- `docs/examples/retain-structure.md` — generated
- `docs/examples/same-length-replacement.md` — generated
- `docs/examples/serialised-output.md` — generated
- `docs/examples/ignored-value-types.md` — generated
- `docs/examples/custom-transformer.md` — generated
- `docs/examples/graceful-error-replacement.md` — generated
- `docs/examples/console-redaction.md` — generated
- `docs/examples/migration-fast-redact-dot-path-structured-output.md` — generated
- `docs/examples/migration-v3-class-instantiation-to-factory.md` — generated
- `test/contract/examples/example-manifest.test.ts` — updated for 17 rows, migration coverage, category-aware fixtureDir assertions
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated story status to review

### Review Findings

- [x] [Review][Decision] `generate:example-docs` renamed to `generate-example-docs` and added to composite `generate` script — fixed
- [x] [Review][Patch] Migration `fixtureDir` guard uses `includes('..')` instead of proper bounded-segment regex + missing normalize check [scripts/example-validation.ts:217,228] — fixed
- [x] [Review][Patch] No test covering traversal rejection for migration-category `fixtureDir` values [test/contract/examples/example-manifest.test.ts] — fixed
- [x] [Review][Patch] `generate-example-docs` script existence not asserted by any contract test (unlike `verify:examples`) [test/contract/examples/example-manifest.test.ts] — fixed
- [x] [Review][Defer] `buildAllGeneratedExampleDocs` calls `loadExampleManifest` without prior `validateExampleManifest` — theoretical in trusted build-script context, pre-existing pattern across `generated-files.ts` [scripts/generated-files.ts:125]
- [x] [Review][Defer] No backtick-fence escaping in `buildGeneratedExampleDoc` — theoretical for the specific fixture content used; pre-existing conceptual gap [scripts/generated-files.ts:103]
- [x] [Review][Defer] Contract test `expectRepositoryPath` accepts base fixtures dir (`test/migration/.../fixtures`) that runtime `validateFixturePath` rejects (no trailing-slash subdirectory) — theoretical gap, current manifest unaffected [test/contract/examples/example-manifest.test.ts:95]
