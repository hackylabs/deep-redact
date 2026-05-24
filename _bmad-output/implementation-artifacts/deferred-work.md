## Deferred from: code review of 5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path (2026-05-22)

- **No `v4-initialisation-error` manifest rows** — declared mode never exercised via `verify:migration:v3`; rejection proofs exist only as direct contract-test calls. Deferred: contract-test coverage accepted as sufficient. `scripts/v3-migration.ts`, `test/migration/v3/matrix.json`.
- **Row key order enforced via `Object.keys().join()` comparison** — Any contributor whose JSON formatter reorders keys will hit a cryptic validation failure. Pre-existing pattern from fast-redact migration infrastructure. `scripts/v3-migration.ts`.
- **`readFixtureText` strips only the final line ending** — CRLF-throughout fixture files (Windows `core.autocrlf=true`) would cause spurious assertion failures. Pre-existing pattern; CI runs Linux. `scripts/v3-migration.ts:161`.
- **JSON parse errors in `readJsonFile` not wrapped with row/fixture context** — Malformed fixture JSON surfaces as a raw parse error without row ID or path context. Pre-existing pattern. `scripts/v3-migration.ts:145`.
- **`v4Usage.config` keys not validated against known v4 option names** — A config typo passes schema validation and fails only at runtime during `verify:migration:v3`. `scripts/v3-migration.ts`.
- **`renderV3MigrationGuide` summary omits `v4-initialisation-error` row count** — Adding an error row would silently undercount the total. No such rows exist yet. `scripts/v3-migration.ts:604`.
- **`isHelperReference` collision risk on `helperId` config key** — Any future v4 option named `helperId` would be misidentified as a helper function. Theoretical. `scripts/v3-migration.ts:110`.

## Deferred from: code review of 5-6-establish-the-worked-example-manifest-and-validation-harness (2026-05-22)

- **`loadExampleManifest` surfaces a raw `SyntaxError` on invalid JSON** — no filename context in the error message. Consistent with existing `loadV3MigrationMatrix` pattern; CI runs committed files. `scripts/example-validation.ts:88–90`.
- **Contract tests do not assert `ExampleVerificationError` property fields** — `rowId`, `fixtureDir`, `assertionMode`, `phase` not exercised. Stories 5.7/5.8 complete but these remain unasserted. `test/contract/examples/example-manifest.test.ts`.
- **`verify:examples` triggers a full rebuild on every CI run** — consistent with all other `verify:*` scripts; not worth changing in isolation. `package.json`, `.github/workflows/npmPublish.yml`.

## Deferred from: code review of 5-8-publish-verified-migration-worked-examples-and-enforce-example-documentation-lockstep (2026-05-23)

- **`buildAllGeneratedExampleDocs` calls `loadExampleManifest` without prior `validateExampleManifest`** — In the build-script context, the manifest is a trusted committed file, so the risk is theoretical. Pre-existing pattern across `generated-files.ts` functions. Revisit if the generator is ever called with untrusted manifest paths. `scripts/generated-files.ts:125`.
- **No backtick-fence escaping in `buildGeneratedExampleDoc`** — If any source file or fixture ever contains a line starting with three backticks, the generated Markdown doc will have its fence closed prematurely. Theoretical for the specific content currently generated. Revisit if example source files become more complex. `scripts/generated-files.ts:103`.
- **Contract test `expectRepositoryPath` is less strict than runtime `validateFixturePath` for migration rows** — `expectRepositoryPath(row.fixtureDir, 'test/migration/.../fixtures')` accepts the bare base directory, while the runtime guard requires a trailing-slash subdirectory. Theoretical gap; the current manifest is not affected. Revisit if migration row fixture dir validation is tightened. `test/contract/examples/example-manifest.test.ts:95`.

## Deferred from: code review of 5-9-produce-canonical-benchmark-runs-and-publish-benchmark-artefacts (2026-05-23)

- **`--id` flag: missing value silently runs all rows; unmatched ID silently exits with no output** — `process.argv[idFlag + 1]` is never bounds-checked; an unknown id produces an empty rows array with no error. Low severity for a dev-only script. Revisit if this script is ever used in CI or given to users. `scripts/run-benchmarks.ts:8-9`.
- **Division by zero when `comparatorStats.median === 0`** — `((s - c) / c) * 100` produces `Infinity` or `NaN` if the comparator median is exactly zero. Practically impossible on modern Node.js. Revisit if ever running on coarse-grained timing environments. `scripts/benchmark-runner.ts:132-134`.
- **`competitor` field not used to resolve CJS module — `require('fast-redact')` hardcoded** — Any future manifest row naming a different competitor silently runs fast-redact and labels the artefact with the wrong competitor. Revisit when a second competitor row is added to the manifest. `scripts/benchmark-runner.ts:122-123`.
- **`overheadPct` always uses `.median` regardless of `thresholdPolicy.comparatorMetric`** — Works correctly for the current manifest (all rows use `"median"`). Revisit when adding a row with a non-median comparatorMetric. `scripts/benchmark-runner.ts:132`.
- **Contract test: `row.thresholdPolicy` accessed directly before existence check** — Produces a confusing `TypeError` on malformed rows rather than a clear assertion message. Low severity. `test/contract/benchmarks/benchmark-manifest.test.ts:53-57`.

## Deferred from: code review of 5-10-enforce-the-release-benchmark-gate-and-benchmark-documentation-lockstep (2026-05-23)

- **`benchmarkResultsDocPath` anchored to module-level `repositoryRoot` rather than `repoRoot` parameter** — latent inconsistency; works correctly in all current call sites; would be a correctness trap if `buildBenchmarkResultsDoc` were ever called with a different `repoRoot` (e.g. a temp dir in tests). Revisit if the function is ever tested with an isolated repo root. `scripts/benchmark-runner.ts:180`.
- **Artefact generated on darwin/arm64 but CI runs ubuntu-latest/x86-64** — the gate reads `thresholdDecision.passed` from the committed artefact rather than re-running the benchmark, so CI never reflects actual CI-machine performance. A passing arm64 artefact could mask a threshold failure on x86-64. Architectural decision out of scope for story 5-10; revisit if cross-platform benchmark accuracy becomes a requirement.
- **`build` → `verify-generated-files` coupling** — `verify:benchmarks` calls `pnpm run build`, which runs `verify-generated-files` first; a stale generated file causes a confusing build failure before any benchmark logic runs. Pre-existing coupling not introduced by this story.

## Deferred from: code review of 5-11-publish-platform-adoption-guidance-through-a-canonical-standardisation-guide (2026-05-23)

- **No static guarantee that CAPABILITY_EXAMPLES IDs exist in manifest** — runtime throw is adequate for a build-time script; revisit if a CI-time static check is desired. `scripts/standardisation-guide.ts:31-37`.
- **Test re-derives `repoRoot` independently from verify script's default** — both resolve to the same directory in practice; revisit if `buildGeneratedStandardisationGuide` is ever tested with an isolated repo root. `test/contract/platform/standardisation-guide.test.ts:7`.
- **`buildGeneratedStandardisationGuide()` throws not caught in verify script** — pre-existing pattern across all generators; an unhandled throw here would discard any already-accumulated mismatches. `scripts/verify-generated-files.ts`.
- **No null-safety on `row.v4Action` sub-fields for intentional-divergence rows** — if a matrix row has a missing `v4Action` or sub-field, the guide would emit `undefined` strings silently; pre-existing matrix schema concern. `scripts/standardisation-guide.ts:30`.
- **No error handling in generate script's `writeFileSync`** — pre-existing project-wide pattern; a write failure exits with a raw FS stack trace and no cleanup. `scripts/generate-standardisation-guide.ts:6`.
- **Zero divergence rows would produce double blank lines in guide output** — cosmetic rendering gap; current matrix has divergences so no current impact. `scripts/standardisation-guide.ts:26`.
- **No test asserting divergence list is non-empty** — acceptable for current matrix state; revisit if the matrix is ever cleaned to remove all intentional-divergence rows. `test/contract/platform/standardisation-guide.test.ts`.
