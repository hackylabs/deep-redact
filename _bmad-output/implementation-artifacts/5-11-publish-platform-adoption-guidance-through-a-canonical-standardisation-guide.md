# Story 5.11: Publish Platform-Adoption Guidance Through a Canonical Standardisation Guide

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform or security evaluator,
I want one canonical Deep Redact standardisation guide covering supported capabilities, targeting semantics, migration expectations, and release evidence,
so that I can decide whether to standardise the library at service root before rollout.

## Acceptance Criteria

1. **Given** the platform-adoption guidance source of truth **When** it is reviewed **Then** it is defined by one canonical document at `docs/platform/standardisation-guide.md`
2. **Given** the canonical standardisation guide **When** documentation validation runs **Then** it contains these required section headings exactly once: `Supported capabilities`, `Targeting semantics`, `Migration expectations`, `Verification evidence`, `Adoption decision scope`
3. **Given** the `Supported capabilities` section **When** it is validated **Then** it uses only canonical public capability terms from validated release artefacts **And** explicitly includes links to validated worked examples covering: key targeting, path targeting, regex property matching, substring targeting, replacement behaviour, structured versus serialised output, transformer support, ignored-value-type behaviour, graceful `[UNSUPPORTED]` degradation, optional `console.*` redaction
4. **Given** the `Supported capabilities` section **When** it is validated **Then** it explicitly states that Deep Redact is one-way only **And** that no `restore` or `unredact` capability is supported
5. **Given** the `Targeting semantics` section **When** it is validated **Then** it uses exactly these precedence terms in this order: `exact string-path`, `structured path`, `exact key`, `regex property`, `substring` **And** states the effect of `retainStructure: true` on descendant targeting **And** links to canonical precedence contract artefacts validated by Story `4.4`
6. **Given** the `Migration expectations` section **When** it is validated **Then** it contains distinct subsections for `fast-redact` migration and Deep Redact v3 migration **And** each subsection links to canonical migration artefacts from Stories `5.4` and `5.5` respectively
7. **Given** the `Migration expectations` section **When** it is validated **Then** it explicitly states the intentional `fast-redact` divergences already validated for v4 **And** does not introduce migration claims not backed by those canonical artefacts
8. **Given** the `Verification evidence` section **When** it is validated **Then** it links to the canonical installation verification matrix, worked-example manifest, and benchmark artefacts produced by Stories `5.1`–`5.3`, `5.6`–`5.8`, and `5.9`–`5.10` **And** states supported installation environments and benchmark evidence using only claims proven by those linked artefacts
9. **Given** the published standardisation guide **When** release documentation validation runs **Then** validation fails if any required section is missing, duplicated, missing required links, uses non-canonical precedence terms, or introduces unsupported capability or migration claims
10. **Given** the published standardisation guide and the canonical release artefacts **When** they are maintained over time **Then** the guide is generated from those same artefacts **And** guidance drift causes documentation verification to fail

## Tasks / Subtasks

- [x] Create `scripts/standardisation-guide.ts` — library with `buildStandardisationGuide(repoRoot)` and `standardisationGuideDocPath` (AC: 1–10)
  - [x] Export `const standardisationGuideDocPath = path.join(repositoryRoot, 'docs', 'platform', 'standardisation-guide.md')`
  - [x] Export `function buildStandardisationGuide(repoRoot: string): string` — see Dev Notes for exact render logic
  - [x] Load example manifest via `loadExampleManifest(repoRoot)` from `./example-validation.ts`
  - [x] Load fast-redact migration matrix via `loadFastRedactMigrationMatrix(repoRoot)` from `./fast-redact-migration.ts`
  - [x] Filter matrix rows for `classification === 'intentional-divergence'` to produce the divergences list
  - [x] Return the complete guide string — use `Array.join('\n')` (same pattern as `buildBenchmarkResultsDoc`)

- [x] Modify `scripts/generated-files.ts` — register standardisation guide as a generated file (AC: 9, 10)
  - [x] Add `import { buildStandardisationGuide, standardisationGuideDocPath } from './standardisation-guide.ts'`
  - [x] Add to `generatedFilePaths`: `standardisationGuideDocPath` (re-export the constant from `standardisation-guide.ts`)
  - [x] Export `function buildGeneratedStandardisationGuide(repoRoot: string = repositoryRoot): string` that calls `buildStandardisationGuide(repoRoot)`

- [x] Modify `scripts/verify-generated-files.ts` — add lockstep check (AC: 9, 10)
  - [x] Import `buildGeneratedStandardisationGuide` and `generatedFilePaths.standardisationGuideDocPath` from `./generated-files.ts`
  - [x] Add lockstep check: read committed `standardisationGuideDocPath`, generate expected via `buildGeneratedStandardisationGuide()`, push `'docs/platform/standardisation-guide.md is out of date'` on mismatch (same pattern as other checks in this file)
  - [x] Handle missing file: push `'docs/platform/standardisation-guide.md is missing'` if `readFileSync` throws

- [x] Create `scripts/generate-standardisation-guide.ts` — thin entry point (AC: 1)
  - [x] Follow the entry-point pattern of `scripts/generate-benchmark-doc.ts` and `scripts/generate-fast-redact-migration-doc.ts`
  - [x] Import `buildGeneratedStandardisationGuide` and `generatedFilePaths` from `./generated-files.ts`
  - [x] `mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })`
  - [x] `writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())`
  - [x] Use `writeFileSync` (not streams — matches project convention)

- [x] Add `generate:standardisation-guide` to `package.json` (AC: 1)
  - [x] `"generate:standardisation-guide": "node --experimental-strip-types ./scripts/generate-standardisation-guide.ts"`
  - [x] Place alphabetically among the `generate:*` scripts

- [x] Generate `docs/platform/standardisation-guide.md` and commit it (AC: 1)
  - [x] Run `source .agents/initialise-env.sh && pnpm run generate:standardisation-guide`
  - [x] Verify file written to `docs/platform/standardisation-guide.md`
  - [ ] Commit the generated file — deferred to post-review commit by user

- [x] Create `test/contract/platform/standardisation-guide.test.ts` — contract tests (AC: 2–10)
  - [x] Follow the pattern from `test/contract/benchmarks/benchmark-artefacts.test.ts` (same `repoRoot` resolution, same `describe`/`it` structure)
  - [x] Test: `docs/platform/standardisation-guide.md` exists on disk
  - [x] Test: content of `docs/platform/standardisation-guide.md` matches `buildGeneratedStandardisationGuide(repoRoot)` exactly (lockstep contract)
  - [x] Test: each required section heading appears exactly once in the committed guide (check for `## Supported capabilities`, `## Targeting semantics`, `## Migration expectations`, `## Verification evidence`, `## Adoption decision scope`)
  - [x] Test: all 10 required capability example links are present (check for `docs/examples/key-targeting.md`, `docs/examples/path-targeting.md`, `docs/examples/regex-property-matching.md`, `docs/examples/substring-targeting.md`, `docs/examples/replacement-and-removal.md`, `docs/examples/serialised-output.md`, `docs/examples/custom-transformer.md`, `docs/examples/ignored-value-types.md`, `docs/examples/graceful-error-replacement.md`, `docs/examples/console-redaction.md`)
  - [x] Test: canonical precedence terms appear in order — guide contains `exact string-path` before `structured path` before `exact key` before `regex property` before `substring`
  - [x] Test: guide contains one-way-only statement (check for `unredact` and `restore` in a negative context — simplest: check guide contains both strings and they are preceded by `no `)

- [x] Verify the story implementation (AC: 1–10)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract` — all tests must pass including new `standardisation-guide.test.ts`
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint` — must pass with no errors
  - [x] Run `source .agents/initialise-env.sh && pnpm run build` — must pass (verify-generated-files lockstep check must pass)

### Review Findings

- [x] [Review][Decision] Empty committed file silently passes verification — The guard condition `if (currentStandardisationGuide !== '' && currentStandardisationGuide !== expectedStandardisationGuide)` means a committed file containing an empty string passes both the "missing" check and the "out of date" check. The spec prescribes this exact condition, so this may be intentional. Decide: should an empty committed file be treated as "out of date" rather than silently accepted? [`scripts/verify-generated-files.ts:85`]
- [x] [Review][Patch] Remove unused `export` from `repositoryRoot` in `standardisation-guide.ts` — The module-level `repositoryRoot` constant is needed internally to derive `standardisationGuideDocPath`, but it is exported without being imported anywhere in this diff. This creates a second public `repositoryRoot` alongside the one in `generated-files.ts`, which is misleading. Drop the `export` keyword; keep the `const`. [`scripts/standardisation-guide.ts:7`]
- [x] [Review][Patch] Add contract test assertion for `docs/architecture/precedence.md` link — AC5 requires the `Targeting semantics` section to link to canonical precedence contract artefacts validated by Story 4.4. The existing precedence-order test checks terms appear in order but does not assert the link itself is present. Add a `expect(content).toContain('docs/architecture/precedence.md')` assertion. [`test/contract/platform/standardisation-guide.test.ts`]
- [x] [Review][Defer] No static guarantee that CAPABILITY_EXAMPLES IDs exist in manifest — runtime throw is adequate for a build-time script [`scripts/standardisation-guide.ts:31-37`] — deferred, pre-existing
- [x] [Review][Defer] Test re-derives `repoRoot` independently from verify script's default — resolves to same directory in practice [`test/contract/platform/standardisation-guide.test.ts:7`] — deferred, pre-existing
- [x] [Review][Defer] `buildGeneratedStandardisationGuide()` throws are not caught in verify script — pre-existing pattern across all generators [`scripts/verify-generated-files.ts`] — deferred, pre-existing
- [x] [Review][Defer] No null-safety on `row.v4Action` sub-fields for intentional-divergence rows — pre-existing matrix schema concern [`scripts/standardisation-guide.ts:30`] — deferred, pre-existing
- [x] [Review][Defer] No error handling in generate script's `writeFileSync` — pre-existing project-wide pattern [`scripts/generate-standardisation-guide.ts:6`] — deferred, pre-existing
- [x] [Review][Defer] Zero divergence rows would produce double blank lines in guide output — cosmetic; current matrix has divergences [`scripts/standardisation-guide.ts:26`] — deferred, no current impact
- [x] [Review][Defer] No test asserting divergence list is non-empty — current matrix has divergences; out of scope for this story [`test/contract/platform/standardisation-guide.test.ts`] — deferred, out of scope

## Dev Notes

### Story Intent

Story `5.11` closes Epic 5 by publishing a canonical standardisation guide that aggregates evidence already produced by Stories `5.1`–`5.10`. It implements FR38.

The guide is **fully generated** from canonical artefacts (example manifest, fast-redact migration matrix). Any manual edit to the committed file, or any artefact change that produces different output, will be caught by the `verify-generated-files` lockstep check that runs on every `pnpm run build` (and therefore on every `pnpm run test`). This satisfies the "drift causes documentation verification to fail" requirement without a dedicated CI step.

### `scripts/standardisation-guide.ts` — Exact Render Logic

Use `Array.join('\n')` to build sections (same as `buildBenchmarkResultsDoc`). The function must produce exactly this structure:

```typescript
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadExampleManifest } from './example-validation.ts'
import { loadFastRedactMigrationMatrix } from './fast-redact-migration.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = path.resolve(scriptDirectory, '..')
export const standardisationGuideDocPath = path.join(repositoryRoot, 'docs', 'platform', 'standardisation-guide.md')
```

**Capability → example ID mapping** (hardcoded, in this order):
```typescript
const CAPABILITY_EXAMPLES = [
  { label: 'key targeting',                           exampleId: 'key-targeting' },
  { label: 'path targeting',                          exampleId: 'path-targeting' },
  { label: 'regex property matching',                 exampleId: 'regex-property-matching' },
  { label: 'substring targeting',                     exampleId: 'substring-targeting' },
  { label: 'replacement behaviour',                   exampleId: 'replacement-and-removal' },
  { label: 'structured versus serialised output',     exampleId: 'serialised-output' },
  { label: 'transformer support',                     exampleId: 'custom-transformer' },
  { label: 'ignored-value-type behaviour',            exampleId: 'ignored-value-types' },
  { label: 'graceful [UNSUPPORTED] degradation',      exampleId: 'graceful-error-replacement' },
  { label: 'optional console.* redaction',            exampleId: 'console-redaction' },
] as const
```

For each capability, look up the `docTarget` from the manifest row by `id`. Throw a clear error if any `exampleId` is not found in the manifest rows.

**Document structure** (use these exact heading levels):

```
# Deep Redact Standardisation Guide

This guide is generated from canonical release artefacts. It covers supported capabilities, targeting semantics, migration expectations, verification evidence, and adoption decision scope for platform and security evaluators.

## Supported capabilities

Deep Redact is a one-way redaction library. There is no `restore` or `unredact` capability.

The following capabilities are supported and covered by validated worked examples:

- [key targeting](docs/examples/key-targeting.md) — redact by exact property name
- [path targeting](docs/examples/path-targeting.md) — redact by exact dot-notation path
- [regex property matching](docs/examples/regex-property-matching.md) — redact by regular-expression property name match
- [substring targeting](docs/examples/substring-targeting.md) — redact matched substrings within string values
- [replacement behaviour](docs/examples/replacement-and-removal.md) — configurable replacement, removal, and same-length masking
- [structured versus serialised output](docs/examples/serialised-output.md) — deep object output or serialised string output
- [transformer support](docs/examples/custom-transformer.md) — custom value transformers
- [ignored-value-type behaviour](docs/examples/ignored-value-types.md) — skip known-safe value types
- [graceful [UNSUPPORTED] degradation](docs/examples/graceful-error-replacement.md) — safe localised fallback on unexpected values
- [optional console.* redaction](docs/examples/console-redaction.md) — explicit console adapter for log-level redaction

## Targeting semantics

Rules are evaluated in precedence order. When multiple rules match a node, the higher-precedence rule wins:

1. **exact string-path** — full dot-notation path, literal match
2. **structured path** — compiled path segments with wildcard and exclusion support
3. **exact key** — literal property name, no path context
4. **regex property** — regular-expression match against the property name
5. **substring** — match against string value content

When `retainStructure: true` is set on a matched rule, descendant nodes remain traversable for lower-precedence rules. Without it, the matched node and all descendants are replaced as a unit.

For the canonical precedence contract and full matrix, see [docs/architecture/precedence.md](docs/architecture/precedence.md).

## Migration expectations

### fast-redact migration

The following intentional behavioural divergences from `fast-redact` have been validated for Deep Redact v4:

<list from matrix: for each intentional-divergence row, render:
  "- **<row.id>**: <row.v4Action.fastRedactBehaviour> → <row.v4Action.v4Behaviour> (<row.v4Action.reason>)">

For the complete migration matrix and fixture-verified examples, see [docs/migration/from-fast-redact.md](docs/migration/from-fast-redact.md).

### Deep Redact v3 migration

Deep Redact v4 introduces a factory API (`deepRedact(config)`) to replace the v3 class instantiation pattern (`new DeepRedact(config)`). The redaction method is unchanged.

For the complete v3 migration matrix and fixture-verified examples, see [docs/migration/from-v3.md](docs/migration/from-v3.md).

## Verification evidence

The following artefacts have been produced and committed as part of the v4 release verification:

- **Installation verification matrix** — verified across Node.js 22/24, npm, pnpm, yarn, bun, and deno: `test/artefacts/install-matrix/`
- **Worked-example manifest** — all examples validated against fixture inputs and expected outputs: `docs/examples/manifest.json`
- **Benchmark artefacts** — performance comparison against fast-redact: `test/artefacts/benchmarks/`
- **Benchmark results document** — rendered from committed artefacts: `docs/benchmarks/results.md`

Supported installation environments: Node.js 22 LTS and 24 LTS (npm, pnpm, yarn, bun); Deno 2.x.

Performance: Deep Redact v4 has been benchmarked against `fast-redact` on comparable path-based workloads. Benchmark artefacts are committed and gate release candidates.

## Adoption decision scope

Deep Redact v4 is a single-library, one-way redaction engine. Guidance on what is in and out of scope:

**In scope:**
- Service-root singleton initialisation for log and payload redaction
- Flexible targeting of sensitive fields by key, path, regex, or substring
- Structured and serialised output formats
- Optional `console.*` redaction via an explicit adapter

**Out of scope:**
- AI or ML-based PII discovery
- Remote or dynamic policy management
- Reversible redaction, restore, or unredact operations
- Broader platform work beyond this library

For the canonical one-way redaction contract, see [docs/architecture/one-way-redaction.md](docs/architecture/one-way-redaction.md).
```

Note: the links in the guide use **relative paths** from the repo root, matching the style of other generated docs (e.g., `docs/migration/from-fast-redact.md` in `docs/migration/from-v3.md`). Check existing generated docs for the exact link style used.

**Building the intentional divergences list:**
```typescript
const matrix = loadFastRedactMigrationMatrix(repoRoot)
const divergences = matrix.rows.filter(row => row.classification === 'intentional-divergence')
const divergenceLines = divergences.map(row =>
  `- **${row.id}**: ${row.v4Action.fastRedactBehaviour} → ${row.v4Action.v4Behaviour} (${row.v4Action.reason})`
)
```

### `scripts/generated-files.ts` — Required Additions

Import at the top of the imports block:
```typescript
import { buildStandardisationGuide, standardisationGuideDocPath } from './standardisation-guide.ts'
```

Add to `generatedFilePaths`:
```typescript
standardisationGuideDocPath,
```

Add the wrapper function:
```typescript
export const buildGeneratedStandardisationGuide = (repoRoot: string = repositoryRoot): string => {
  return buildStandardisationGuide(repoRoot)
}
```

### `scripts/verify-generated-files.ts` — Required Addition

Add the standardisation guide lockstep check in the same style as the existing checks (before the final `if (mismatches.length > 0)` block):

```typescript
let currentStandardisationGuide: string
try {
  currentStandardisationGuide = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
} catch {
  mismatches.push('docs/platform/standardisation-guide.md is missing')
  currentStandardisationGuide = ''
}
const expectedStandardisationGuide = buildGeneratedStandardisationGuide()
if (currentStandardisationGuide !== '' && currentStandardisationGuide !== expectedStandardisationGuide) {
  mismatches.push('docs/platform/standardisation-guide.md is out of date')
}
```

Import at the top: add `buildGeneratedStandardisationGuide` to the existing import from `./generated-files.ts`.

### `scripts/generate-standardisation-guide.ts` — Entry Point

```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from './generated-files.ts'

mkdirSync(path.dirname(generatedFilePaths.standardisationGuideDocPath), { recursive: true })
writeFileSync(generatedFilePaths.standardisationGuideDocPath, buildGeneratedStandardisationGuide())
console.log(`Wrote standardisation guide: ${generatedFilePaths.standardisationGuideDocPath}`)
```

Note: **do NOT use** the `import.meta.url`-based `repoRoot` pattern for the entry point — import from `generated-files.ts` instead (same as `generate-fast-redact-migration-doc.ts`).

### Contract Test Pattern

```typescript
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { buildGeneratedStandardisationGuide, generatedFilePaths } from '../../../scripts/generated-files.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
// File: test/contract/platform/standardisation-guide.test.ts
// Target: scripts/generated-files.ts
// Path: ../../../scripts/generated-files.ts ✓

describe('standardisation guide', () => {
  it('docs/platform/standardisation-guide.md exists', () => {
    expect(existsSync(generatedFilePaths.standardisationGuideDocPath)).toBe(true)
  })

  it('docs/platform/standardisation-guide.md matches generated guide (lockstep)', () => {
    const expected = buildGeneratedStandardisationGuide(repoRoot)
    const current = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    expect(current).toBe(expected)
  })

  it('guide contains all required section headings exactly once', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const requiredHeadings = [
      '## Supported capabilities',
      '## Targeting semantics',
      '## Migration expectations',
      '## Verification evidence',
      '## Adoption decision scope',
    ]
    for (const heading of requiredHeadings) {
      const occurrences = content.split(heading).length - 1
      expect(occurrences, `Expected heading "${heading}" exactly once`).toBe(1)
    }
  })

  it('guide contains all 10 required capability example links', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const requiredLinks = [
      'docs/examples/key-targeting.md',
      'docs/examples/path-targeting.md',
      'docs/examples/regex-property-matching.md',
      'docs/examples/substring-targeting.md',
      'docs/examples/replacement-and-removal.md',
      'docs/examples/serialised-output.md',
      'docs/examples/custom-transformer.md',
      'docs/examples/ignored-value-types.md',
      'docs/examples/graceful-error-replacement.md',
      'docs/examples/console-redaction.md',
    ]
    for (const link of requiredLinks) {
      expect(content, `Expected link to "${link}"`).toContain(link)
    }
  })

  it('guide uses canonical precedence terms in correct order', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    const terms = ['exact string-path', 'structured path', 'exact key', 'regex property', 'substring']
    let lastIndex = -1
    for (const term of terms) {
      const idx = content.indexOf(term)
      expect(idx, `Expected term "${term}" to appear`).toBeGreaterThan(-1)
      expect(idx, `Expected "${term}" to appear after previous term`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })

  it('guide states one-way-only constraint', () => {
    const content = readFileSync(generatedFilePaths.standardisationGuideDocPath, 'utf8')
    expect(content).toContain('one-way')
    expect(content).toContain('no `restore`')
    expect(content).toContain('unredact')
  })
})
```

### Architecture Compliance

- British English in all code, comments, tests, docs, and commit messages. `artefacts` not `artifacts` in prose, `initialise` not `initialize`.
- `docs/platform/standardisation-guide.md` — new directory under `docs/`; create parent with `mkdirSync({ recursive: true })`.
- `scripts/standardisation-guide.ts` follows the library pattern of `scripts/benchmark-runner.ts` and `scripts/fast-redact-migration.ts`.
- `scripts/generate-standardisation-guide.ts` follows the thin entry-point pattern of `scripts/generate-fast-redact-migration-doc.ts`.
- `test/contract/platform/standardisation-guide.test.ts` is picked up automatically by `pnpm run test:contract` (`vitest run test/contract/**/*.test.ts`).
- All commands must be prefixed `source .agents/initialise-env.sh &&`.
- Use `readFileSync` (not `fs.promises`).
- Use `.ts` extension in imports.
- `import.meta.url`-based `repositoryRoot` in `scripts/standardisation-guide.ts` for the module-level `standardisationGuideDocPath` constant.
- Do NOT call `new DeepRedact` — this story does not use the redactor; it reads artefact files only.

### Scope Guard

Do NOT modify `scripts/benchmark-runner.ts`, `scripts/run-benchmarks.ts`, `scripts/verify-benchmarks.ts`, the example manifest, the migration matrices, or any existing migration scripts. Do NOT add new example rows. Do NOT change existing docs in `docs/examples/`, `docs/migration/`, or `docs/architecture/`. Do NOT add performance optimisation (the benchmark artefact has `thresholdDecision.passed: false` — that is known and out of scope for this story).

### Previous Story Intelligence (5.10)

- `scripts/verify-generated-files.ts` ends with `throw new Error(mismatches.join('\n'))` — no explicit try/catch or `process.exitCode` pattern; it just throws. Match this pattern for the missing-file handling in the new lockstep check.
- `scripts/generated-files.ts` exports `generatedFilePaths` as an object; add `standardisationGuideDocPath` as a new key (imported from `standardisation-guide.ts`).
- `generate-fast-redact-migration-doc.ts` imports from `generated-files.ts`, not from the underlying library — follow this pattern for `generate-standardisation-guide.ts`.
- `pnpm run test:contract` runs `vitest run test/build.test.ts test/contract/**/*.test.ts` — the new `standardisation-guide.test.ts` is picked up automatically via `test/contract/**/*.test.ts`.
- Review feedback from 5.10: committed file (`docs/benchmarks/results.md`) was untracked and not committed at story completion — **commit `docs/platform/standardisation-guide.md` as a task step, not just generate it**.

### Source Document Summary

- FR38: Platform and security teams can review published guidance on supported capabilities, targeting semantics, and migration expectations before standardising the library. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:57)]
- Epic 5 goal: Teams can migrate existing usage, verify cross-environment support, evaluate performance, and standardise Deep Redact with strong examples and guidance. [Source: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md:167)]
- Architecture Trust & Standardisation Support FRs: `docs/examples/`, `docs/architecture/`. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:888)]

### Project Context Reference

- British English in all code, comments, tests, docs, and commit messages. [Source: project-context.md]
- All Node.js/build/test commands require `source .agents/initialise-env.sh &&` prefix. [Source: project-context.md]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: project-context.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `scripts/standardisation-guide.ts` — new library exporting `buildStandardisationGuide(repoRoot)` and `standardisationGuideDocPath`. Loads the example manifest and fast-redact migration matrix; filters intentional divergences; renders the guide using `Array.join('\n')`.
- `scripts/generated-files.ts` — extended with import from `standardisation-guide.ts`, `standardisationGuideDocPath` added to `generatedFilePaths`, and `buildGeneratedStandardisationGuide` wrapper function exported.
- `scripts/verify-generated-files.ts` — lockstep check added for `docs/platform/standardisation-guide.md`; missing file pushes `'docs/platform/standardisation-guide.md is missing'`; mismatch pushes `'docs/platform/standardisation-guide.md is out of date'`.
- `scripts/generate-standardisation-guide.ts` — thin entry point following `generate-fast-redact-migration-doc.ts` pattern.
- `docs/platform/standardisation-guide.md` — generated and written; pending user commit after code review.
- `test/contract/platform/standardisation-guide.test.ts` — 6 contract tests all passing. Precedence-order test scopes to the `## Targeting semantics` section to avoid a false conflict with "regex property matching" in the capabilities list.
- Build, lint, and contract tests all pass. The pre-existing `agent-environment.test.ts` failure (Deno env identifier on Ben's machine) is unrelated to this story.

### File List

- `scripts/standardisation-guide.ts` (new)
- `scripts/generate-standardisation-guide.ts` (new)
- `docs/platform/standardisation-guide.md` (new, generated)
- `test/contract/platform/standardisation-guide.test.ts` (new)
- `scripts/generated-files.ts` (modified)
- `scripts/verify-generated-files.ts` (modified)
- `package.json` (modified)
