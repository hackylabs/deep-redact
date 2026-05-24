## Deferred from: code review of 5-6-establish-the-worked-example-manifest-and-validation-harness (2026-05-22)

- **`verify:examples` triggers a full rebuild on every CI run** — consistent with all other `verify:*` scripts; not worth changing in isolation. `package.json`, `.github/workflows/npmPublish.yml`.

## Deferred from: code review of 5-10-enforce-the-release-benchmark-gate-and-benchmark-documentation-lockstep (2026-05-23)

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
