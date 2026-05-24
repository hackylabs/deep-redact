## Deferred from: code review of 5-6-establish-the-worked-example-manifest-and-validation-harness (2026-05-22)

- **`verify:examples` triggers a full rebuild on every CI run** — consistent with all other `verify:*` scripts; not worth changing in isolation. `package.json`, `.github/workflows/npmPublish.yml`.

## Deferred from: code review of 5-10-enforce-the-release-benchmark-gate-and-benchmark-documentation-lockstep (2026-05-23)

- **Artefact generated on darwin/arm64 but CI runs ubuntu-latest/x86-64** — the gate reads `thresholdDecision.passed` from the committed artefact rather than re-running the benchmark, so CI never reflects actual CI-machine performance. A passing arm64 artefact could mask a threshold failure on x86-64. Architectural decision out of scope for story 5-10; revisit if cross-platform benchmark accuracy becomes a requirement.
- **`build` → `verify-generated-files` coupling** — `verify:benchmarks` calls `pnpm run build`, which runs `verify-generated-files` first; a stale generated file causes a confusing build failure before any benchmark logic runs. Pre-existing coupling not introduced by this story.
