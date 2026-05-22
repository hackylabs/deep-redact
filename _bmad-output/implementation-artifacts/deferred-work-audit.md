## Deferred from: code review of 5-5-publish-a-dedicated-deep-redact-v3-to-v4-migration-path (2026-05-22)

- **No `v4-initialisation-error` manifest rows** — declared mode never exercised via `verify:migration:v3`; rejection proofs exist only as direct contract-test calls. Deferred: contract-test coverage accepted as sufficient. `scripts/v3-migration.ts`, `test/migration/v3/matrix.json`.
- **Row key order enforced via `Object.keys().join()` comparison** — Any contributor whose JSON formatter reorders keys will hit a cryptic validation failure. Pre-existing pattern from fast-redact migration infrastructure. `scripts/v3-migration.ts`.
- **`readFixtureText` strips only the final line ending** — CRLF-throughout fixture files (Windows `core.autocrlf=true`) would cause spurious assertion failures. Pre-existing pattern; CI runs Linux. `scripts/v3-migration.ts:161`.
- **JSON parse errors in `readJsonFile` not wrapped with row/fixture context** — Malformed fixture JSON surfaces as a raw parse error without row ID or path context. Pre-existing pattern. `scripts/v3-migration.ts:145`.
- **`v4Usage.config` keys not validated against known v4 option names** — A config typo passes schema validation and fails only at runtime during `verify:migration:v3`. `scripts/v3-migration.ts`.
- **`renderV3MigrationGuide` summary omits `v4-initialisation-error` row count** — Adding an error row would silently undercount the total. No such rows exist yet. `scripts/v3-migration.ts:604`.
- **`isHelperReference` collision risk on `helperId` config key** — Any future v4 option named `helperId` would be misidentified as a helper function. Theoretical. `scripts/v3-migration.ts:110`.

## Deferred from: code review of 4-3-prove-exact-path-fast-lane-and-generic-traversal-are-behaviourally-equivalent (2026-05-14)

- `signature` field on converted dynamic rule uses `canonicalPath` string rather than a `renderSelectorSignature`-produced value — semantically imprecise but no runtime impact for current corpus (`test/fixtures/exact-path-equivalence/index.ts`)
- No corpus entry for bracket-quoted or special-character property keys — equivalence proof incomplete for paths whose canonical representation differs from dot-notation
- `retainStructure` alias-replay caching behaviour not exercised across lanes — `createPayload` creates fresh objects so no shared-identity alias is ever replayed
- No corpus entry for non-string primitive leaf values (number, boolean, null) under an exact path
- No corpus entry for a path that is absent from the payload — silent no-op divergence between lanes would go undetected
- No corpus entry for `replaceStringByLength: true` policy
- Converted-rule ordering in `createGenericisedPlan` appends after pre-existing `dynamicPathRules`; relies on the `dynamicPathRules.length === 0` invariant enforced by the control assertion (`test/fixtures/exact-path-equivalence/index.ts`)
