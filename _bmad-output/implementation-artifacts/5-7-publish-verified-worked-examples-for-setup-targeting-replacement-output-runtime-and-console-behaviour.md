# Story 5.7: Publish Verified Worked Examples for Setup, Targeting, Replacement, Output, Runtime, and Console Behaviour

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want verified worked examples for the core Deep Redact feature surface,
so that evaluators can prove setup and runtime capability from executable examples before consulting migration guidance.

## Acceptance Criteria

1. Given the canonical example manifest, when the admitted non-migration example set is reviewed before release, then it includes at least one distinct row covering each of these behaviours: singleton setup, key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, substring targeting, root-primitive redaction, replacement and removal behaviour, retain-structure handling, same-length string replacement, structured versus serialised output, ignored-value-type configuration, custom transformer configuration, graceful error replacement, and optional `console.*` redaction.
2. Given the admitted non-migration example rows, when they are reviewed, then they use only the categories `setup`, `targeting`, `replacement`, `output`, `runtime`, or `console`.
3. Given a non-migration row in the canonical example manifest, when validation completes, then the produced result matches the row's `expectedResultFile` exactly under that assertion mode.
4. Given this story's scope, when the implementation is reviewed, then migration worked examples and example-documentation lockstep remain deferred to Story `5.8`, and benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Add 15 manifest rows to `docs/examples/manifest.json` (AC: 1, 2)
  - [x] Row `singleton-setup`: category `setup`, `assertionMode` `structured-output`, `docTarget` `docs/examples/singleton-setup.md`, `sourceFile` `docs/examples/examples/singleton-setup.ts`, `fixtureDir` `docs/examples/fixtures/singleton-setup`, `expectedResultFile` `expected.json`
  - [x] Row `key-targeting`: category `targeting`, `assertionMode` `structured-output`, `docTarget` `docs/examples/key-targeting.md`, `sourceFile` `docs/examples/examples/key-targeting.ts`, `fixtureDir` `docs/examples/fixtures/key-targeting`, `expectedResultFile` `expected.json`
  - [x] Row `regex-property-matching`: category `targeting`, `assertionMode` `structured-output`, `docTarget` `docs/examples/regex-property-matching.md`, `sourceFile` `docs/examples/examples/regex-property-matching.ts`, `fixtureDir` `docs/examples/fixtures/regex-property-matching`, `expectedResultFile` `expected.json`
  - [x] Row `path-targeting`: category `targeting`, `assertionMode` `structured-output`, `docTarget` `docs/examples/path-targeting.md`, `sourceFile` `docs/examples/examples/path-targeting.ts`, `fixtureDir` `docs/examples/fixtures/path-targeting`, `expectedResultFile` `expected.json`
  - [x] Row `regex-path-segment-matching`: category `targeting`, `assertionMode` `structured-output`, `docTarget` `docs/examples/regex-path-segment-matching.md`, `sourceFile` `docs/examples/examples/regex-path-segment-matching.ts`, `fixtureDir` `docs/examples/fixtures/regex-path-segment-matching`, `expectedResultFile` `expected.json`
  - [x] Row `substring-targeting`: category `targeting`, `assertionMode` `structured-output`, `docTarget` `docs/examples/substring-targeting.md`, `sourceFile` `docs/examples/examples/substring-targeting.ts`, `fixtureDir` `docs/examples/fixtures/substring-targeting`, `expectedResultFile` `expected.json`
  - [x] Row `root-primitive-redaction`: category `targeting`, `assertionMode` `structured-output`, `docTarget` `docs/examples/root-primitive-redaction.md`, `sourceFile` `docs/examples/examples/root-primitive-redaction.ts`, `fixtureDir` `docs/examples/fixtures/root-primitive-redaction`, `expectedResultFile` `expected.json`
  - [x] Row `replacement-and-removal`: category `replacement`, `assertionMode` `structured-output`, `docTarget` `docs/examples/replacement-and-removal.md`, `sourceFile` `docs/examples/examples/replacement-and-removal.ts`, `fixtureDir` `docs/examples/fixtures/replacement-and-removal`, `expectedResultFile` `expected.json`
  - [x] Row `retain-structure`: category `replacement`, `assertionMode` `structured-output`, `docTarget` `docs/examples/retain-structure.md`, `sourceFile` `docs/examples/examples/retain-structure.ts`, `fixtureDir` `docs/examples/fixtures/retain-structure`, `expectedResultFile` `expected.json`
  - [x] Row `same-length-replacement`: category `replacement`, `assertionMode` `structured-output`, `docTarget` `docs/examples/same-length-replacement.md`, `sourceFile` `docs/examples/examples/same-length-replacement.ts`, `fixtureDir` `docs/examples/fixtures/same-length-replacement`, `expectedResultFile` `expected.json`
  - [x] Row `serialised-output`: category `output`, `assertionMode` `serialised-output`, `docTarget` `docs/examples/serialised-output.md`, `sourceFile` `docs/examples/examples/serialised-output.ts`, `fixtureDir` `docs/examples/fixtures/serialised-output`, `expectedResultFile` `expected.txt`
  - [x] Row `ignored-value-types`: category `runtime`, `assertionMode` `structured-output`, `docTarget` `docs/examples/ignored-value-types.md`, `sourceFile` `docs/examples/examples/ignored-value-types.ts`, `fixtureDir` `docs/examples/fixtures/ignored-value-types`, `expectedResultFile` `expected.json`
  - [x] Row `custom-transformer`: category `runtime`, `assertionMode` `structured-output`, `docTarget` `docs/examples/custom-transformer.md`, `sourceFile` `docs/examples/examples/custom-transformer.ts`, `fixtureDir` `docs/examples/fixtures/custom-transformer`, `expectedResultFile` `expected.json`
  - [x] Row `graceful-error-replacement`: category `runtime`, `assertionMode` `structured-output`, `docTarget` `docs/examples/graceful-error-replacement.md`, `sourceFile` `docs/examples/examples/graceful-error-replacement.ts`, `fixtureDir` `docs/examples/fixtures/graceful-error-replacement`, `expectedResultFile` `expected.json`
  - [x] Row `console-redaction`: category `console`, `assertionMode` `structured-output`, `docTarget` `docs/examples/console-redaction.md`, `sourceFile` `docs/examples/examples/console-redaction.ts`, `fixtureDir` `docs/examples/fixtures/console-redaction`, `expectedResultFile` `expected.json`

- [x] Create fixture directories and files for all 15 rows (AC: 3)
  - [x] `docs/examples/fixtures/singleton-setup/input.json` and `expected.json` — see Fixture Specifications below
  - [x] `docs/examples/fixtures/key-targeting/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/regex-property-matching/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/path-targeting/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/regex-path-segment-matching/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/substring-targeting/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/root-primitive-redaction/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/replacement-and-removal/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/retain-structure/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/same-length-replacement/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/serialised-output/input.json` and `expected.txt`
  - [x] `docs/examples/fixtures/ignored-value-types/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/custom-transformer/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/graceful-error-replacement/input.json` and `expected.json`
  - [x] `docs/examples/fixtures/console-redaction/input.json` and `expected.json`

- [x] Create 15 example source files under `docs/examples/examples/` (AC: 3)
  - [x] `singleton-setup.ts` — see Example Source Specifications below
  - [x] `key-targeting.ts`
  - [x] `regex-property-matching.ts`
  - [x] `path-targeting.ts`
  - [x] `regex-path-segment-matching.ts`
  - [x] `substring-targeting.ts`
  - [x] `root-primitive-redaction.ts`
  - [x] `replacement-and-removal.ts`
  - [x] `retain-structure.ts`
  - [x] `same-length-replacement.ts`
  - [x] `serialised-output.ts`
  - [x] `ignored-value-types.ts`
  - [x] `custom-transformer.ts`
  - [x] `graceful-error-replacement.ts`
  - [x] `console-redaction.ts`

- [x] Update the contract test at `test/contract/examples/example-manifest.test.ts` (AC: 3)
  - [x] Replace the `expect(result).toStrictEqual([])` assertion in the `verifyExampleManifest` test with an assertion that the result has 15 entries and every entry has `id`, `assertionMode`, and `fixtureDir` with the expected values — see the deferred note from Story 5.6 review at `test/contract/examples/example-manifest.test.ts`
  - [x] Add a test asserting that the manifest rows array has exactly 15 entries

- [x] Maintain scope boundaries (AC: 4)
  - [x] Do not add `migration-fast-redact` or `migration-v3` rows to the manifest — those belong to Story `5.8`
  - [x] Do not create `docs/examples/<id>.md` documentation files — Story `5.8` owns the documentation lockstep
  - [x] Do not touch `scripts/generated-files.ts` or `scripts/verify-generated-files.ts`
  - [x] Do not touch migration infrastructure: `scripts/v3-migration.ts`, `scripts/verify-v3-migration.ts`, `scripts/verify-fast-redact-migration.ts`, `test/migration/`
  - [x] Do not change `scripts/example-validation.ts` or `scripts/verify-examples.ts` — they are complete from Story `5.6`
  - [x] Do not change benchmark or platform-adoption files

- [x] Verify the story implementation (AC: 1–4)
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:examples` — must report 15 verified rows with no failures
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract` — all contract tests must pass including the updated `example-manifest.test.ts`
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if `package.json` or shared test infrastructure changed

## Dev Notes

### Story Intent

Story `5.7` populates the example manifest with 15 verified non-migration rows covering every required feature surface. Story `5.6` delivered the manifest schema, the harness, and an empty rows array — this story proves the harness works end-to-end by adding real examples that execute cleanly. Story `5.8` owns migration examples and example-documentation lockstep.

The key deliverable is not the source files themselves — it is the verified manifest. Every row must pass `verifyExampleManifest` cleanly before this story is done.

### Source Document Summary

- FR31 requires worked examples covering: singleton setup, key targeting, regex-based object property matching, object-path targeting, regex-based path segment matching, substring targeting, root-primitive redaction, replacement and removal, retain-structure, same-length string replacement, structured vs serialised output, ignored-value-type configuration, custom transformer configuration, graceful error replacement, and optional `console.*` redaction. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:434)]
- Examples must be practical, minimal, and representative of real service usage. [Source: [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md:351)]
- `docs/examples/` is the declared location for worked examples. [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:889)]

### Current Repository State

- `docs/examples/manifest.json` exists with `schemaVersion: 1`, empty `rows: []`, and metadata declaring `fixtureRoot: "docs/examples/fixtures"`. Story `5.7` fills the rows array.
- `scripts/example-validation.ts` is complete. Do not modify it.
- `scripts/verify-examples.ts` is complete. Do not modify it.
- The `verify:examples` script is `pnpm run build && node --experimental-strip-types ./scripts/verify-examples.ts`.
- Package is `@hackylabs/deep-redact`, exports: `.` (main), `./adapters/console`, `./package.json`.
- Node engine floor: `>=22.18.0`. All source files use TypeScript with `--experimental-strip-types` for direct execution.

### Source File Execution Contract

Every source file in `docs/examples/examples/` must export a named `runExample` function or a default function:

```ts
export const runExample = (input: unknown): unknown => { ... }
// or
export default (input: unknown): unknown => { ... }
```

The harness (`scripts/example-validation.ts`):
1. Reads `<fixtureDir>/input.json` and JSON-parses it → `input`
2. Dynamic-imports the `sourceFile` TypeScript file
3. Calls `runExample(input)` (awaits if async)
4. For `structured-output`: compares result via `isDeepStrictEqual` against parsed `expected.json`
5. For `serialised-output`: compares result (must be `string`) against text content of `expectedResultFile`

Import paths in source files:
- Main package: `import { deepRedact } from '@hackylabs/deep-redact'`
- Console adapter: `import { createRedactedConsole } from '@hackylabs/deep-redact/adapters/console'`
- Both resolve via the built `dist/` after `pnpm run build`.

### Architecture Compliance

- `docs/examples/examples/` — new directory for example source files; name it `examples` (a sub-directory within `docs/examples/`).
- `docs/examples/fixtures/<id>/` — fixture directories, one per row, named exactly after the row `id`.
- Do not call `new DeepRedact` anywhere — use the `deepRedact` factory from `src/index.ts`.
- `validateFixturePath` in `scripts/example-validation.ts` enforces that `fixtureDir` is exactly `docs/examples/fixtures/<id>` — the row `id` and the last fixture directory segment must match.
- British English in all code, comments, and commit messages. Use `serialise` not `serialize`, `artefacts` not `artifacts` in prose.
- All verify scripts run with `pnpm run build` first. Do not skip the build step.

### Fixture Specifications

All `input.json` files are JSON-parsed by the harness. The `runExample` function receives the parsed value. Design fixtures to be minimal and illustrative.

**singleton-setup**
```json
// input.json
{ "user": { "password": "s3cret" }, "token": "abc123", "ok": true }
// expected.json
{ "user": { "password": "[REDACTED]" }, "token": "[REDACTED]", "ok": true }
```

**key-targeting**
```json
// input.json
{ "user": { "password": "pass1", "name": "Alice" }, "config": { "secret": "sec1", "timeout": 30 } }
// expected.json
{ "user": { "password": "[REDACTED]", "name": "Alice" }, "config": { "secret": "[REDACTED]", "timeout": 30 } }
```

**regex-property-matching**
```json
// input.json
{ "apiKey": "key1", "nested": { "apiToken": "tok1" }, "name": "app" }
// expected.json
{ "apiKey": "[REDACTED]", "nested": { "apiToken": "[REDACTED]" }, "name": "app" }
```

**path-targeting**
```json
// input.json
{ "user": { "profile": { "ssn": "123-45-6789", "name": "Alice" }, "credentials": { "token": "tok1", "type": "bearer" } } }
// expected.json
{ "user": { "profile": { "ssn": "[REDACTED]", "name": "Alice" }, "credentials": { "token": "[REDACTED]", "type": "bearer" } } }
```

**regex-path-segment-matching**
```json
// input.json
{ "config": { "db_password": "pass1", "db_host": "localhost", "app_secret": "sec1" }, "name": "app" }
// expected.json
{ "config": { "db_password": "[REDACTED]", "db_host": "localhost", "app_secret": "[REDACTED]" }, "name": "app" }
```

**substring-targeting**
```json
// input.json
{ "message": "Call 555-867-5309 for info", "subject": "Contact request" }
// expected.json
{ "message": "Call [REDACTED] for info", "subject": "Contact request" }
```

**root-primitive-redaction**
```json
// input.json  — root is a JSON string, not an object
"api-key=sk-1234567890"
// expected.json
"[REDACTED]"
```

**replacement-and-removal**
```json
// input.json
{ "user": { "password": "secret", "token": "tok1", "name": "Alice" } }
// expected.json  — password removed (not present), token replaced
{ "user": { "token": "[REDACTED]", "name": "Alice" } }
```

**retain-structure**
```json
// input.json
{ "credentials": { "apiKey": "key1", "secret": "sec1" }, "name": "app" }
// expected.json  — credentials object preserved, leaf values censored
{ "credentials": { "apiKey": "[REDACTED]", "secret": "[REDACTED]" }, "name": "app" }
```

**same-length-replacement**
```json
// input.json
{ "user": { "token": "abc123", "name": "Alice" } }
// expected.json  — "abc123" is 6 chars → 6 stars
{ "user": { "token": "******", "name": "Alice" } }
```

**serialised-output**
```json
// input.json
{ "user": { "password": "secret", "name": "Alice" } }
```
```text
// expected.txt  — exact JSON string returned by deepRedact with serialise: true
{"user":{"password":"[REDACTED]","name":"Alice"}}
```
Note: `expected.txt` must contain no trailing newline. The harness calls `readTextFile` which strips one trailing newline.

**ignored-value-types**
```json
// input.json  — isoDate string is converted to a Date object in the source file
{ "isoDate": "2026-01-01T12:00:00.000Z", "name": "app-service" }
// expected.json  — Date is transformed but its datetime property is NOT redacted (ignoredValueTypes: { Date: true })
{ "event": { "_transformer": "date", "datetime": "2026-01-01T12:00:00.000Z" }, "name": "app-service" }
```

**custom-transformer**
```json
// input.json
{ "status": 200, "body": { "token": "tok-1234", "data": "user-data" } }
// expected.json
{ "status": 200, "body": { "token": "[REDACTED]", "data": "user-data" } }
```

**graceful-error-replacement**
```json
// input.json
{ "user": { "password": "safe-password", "name": "Alice" }, "config": { "apiKey": "will-fail" } }
// expected.json
{ "user": { "password": "[REDACTED]", "name": "Alice" }, "config": { "apiKey": "[UNSUPPORTED]" } }
```

**console-redaction**
```json
// input.json
{ "user": { "password": "s3cret", "name": "Alice" }, "token": "abc123" }
// expected.json
{ "user": { "password": "[REDACTED]", "name": "Alice" }, "token": "[REDACTED]" }
```

### Example Source Specifications

Each source file lives in `docs/examples/examples/<id>.ts`. Comments are intentionally omitted — the code is the documentation.

**singleton-setup.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.password', 'token'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

**key-targeting.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password', 'secret'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

**regex-property-matching.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: [/api/i] })

export const runExample = (input: unknown): unknown => redactor(input)
```

**path-targeting.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.profile.ssn', 'user.credentials.token'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

**regex-path-segment-matching.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: [['config', /password|secret/i]] })

export const runExample = (input: unknown): unknown => redactor(input)
```

**substring-targeting.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  stringTests: [{
    pattern: /\d{3}-\d{3}-\d{4}/g,
    replacer: (value, pattern) => value.replace(pattern, '[REDACTED]'),
  }],
})

export const runExample = (input: unknown): unknown => redactor(input)
```

**root-primitive-redaction.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ stringTests: [/api-key=[^\s&]+/] })

export const runExample = (input: unknown): unknown => redactor(input)
```
Note: Input is the string `"api-key=sk-1234567890"`. A bare RegExp in `stringTests` replaces a matched root string with the default censor. See `test/contract/api/create-redactor.test.ts` — "redacts a matching root string with the default censor for a bare RegExp rule".

**replacement-and-removal.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: [
    { path: 'user.password', remove: true },
    'user.token',
  ],
})

export const runExample = (input: unknown): unknown => redactor(input)
```

**retain-structure.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: [{ path: 'credentials', retainStructure: true }],
})

export const runExample = (input: unknown): unknown => redactor(input)
```

**same-length-replacement.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.token'],
  censor: '*',
  replaceStringByLength: true,
})

export const runExample = (input: unknown): unknown => redactor(input)
```

**serialised-output.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.password'],
  serialise: true,
})

export const runExample = (input: unknown): unknown => redactor(input)
```
Note: `serialise: true` makes the redactor return a JSON string. The assertionMode is `serialised-output`; the harness checks `typeof actual === 'string'` and compares against `expected.txt` as text.

**ignored-value-types.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  keys: ['datetime'],
  ignoredValueTypes: { Date: true },
})

export const runExample = (input: unknown): unknown => {
  const record = input as { isoDate: string; name: string }
  return redactor({ event: new Date(record.isoDate), name: record.name })
}
```
Note: The default Date transformer converts `new Date(...)` to `{ _transformer: 'date', datetime: '...' }`. Without `ignoredValueTypes: { Date: true }`, `keys: ['datetime']` would redact the `datetime` property inside that transformed output. With it, the transformed Date is excluded from further traversal, so `datetime` is preserved. Verify against `test/contract/api/create-redactor.test.ts` — "keeps the safe transformed root output for ignored date values".

**custom-transformer.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

class ServicePayload {
  constructor(readonly status: number, readonly body: Record<string, unknown>) {}
}

const redactor = deepRedact({
  keys: ['token'],
  transformers: {
    byConstructor: {
      ServicePayload: [(value: unknown) => {
        if (!(value instanceof ServicePayload)) return value
        return { status: value.status, body: value.body }
      }],
    },
  },
})

export const runExample = (input: unknown): unknown => {
  const record = input as { status: number; body: Record<string, unknown> }
  return redactor(new ServicePayload(record.status, record.body))
}
```
Note: The custom transformer flattens `ServicePayload` to a plain object `{ status, body }`. Then `keys: ['token']` redacts `body.token` inside the transformed output.

**graceful-error-replacement.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.password', 'config.apiKey'],
  censor: (value: unknown) => {
    if (value === 'will-fail') throw new Error('value cannot be censored safely')
    return '[REDACTED]'
  },
})

export const runExample = (input: unknown): unknown => redactor(input)
```
Note: When the censor function throws, deepRedact degrades that specific node to `[UNSUPPORTED]` and continues processing the rest of the payload. Verify against `test/contract/api/create-redactor.test.ts` — "Nested runtime failures degrade locally to [UNSUPPORTED] with structured diagnostics".

**console-redaction.ts**
```ts
import { deepRedact } from '@hackylabs/deep-redact'
import { createRedactedConsole } from '@hackylabs/deep-redact/adapters/console'

const redactor = deepRedact({ keys: ['password', 'token'] })

export const runExample = (input: unknown): unknown => {
  let captured: unknown
  const fakeConsole = {
    debug: (...args: unknown[]) => { captured = args[0] },
    error: (...args: unknown[]) => { captured = args[0] },
    info: (...args: unknown[]) => { captured = args[0] },
    log: (...args: unknown[]) => { captured = args[0] },
    trace: (...args: unknown[]) => { captured = args[0] },
    warn: (...args: unknown[]) => { captured = args[0] },
  }
  const redactedConsole = createRedactedConsole(redactor, fakeConsole)
  redactedConsole.log(input)
  return captured
}
```
Note: `createRedactedConsole(redactor, target, options?)` wraps `target` so every method call redacts its arguments before forwarding. The fake console captures the redacted first argument for comparison. See `src/adapters/console/create-redacted-console.ts` for the full signature.

### Contract Test Update

The Story `5.6` review deferred this fix:
> "Test hardcodes `[]` expectation for `verifyExampleManifest` — correct for Story 5.6 scope but will break when Story 5.7 adds rows; update the test when rows are introduced [`test/contract/examples/example-manifest.test.ts`]"

Update `test/contract/examples/example-manifest.test.ts`:

1. Replace:
   ```ts
   it('runs verifyExampleManifest against the real manifest and returns an empty array without error', async () => {
     const result = await verifyExampleManifest({ repositoryRoot: repoRoot })
     expect(result).toStrictEqual([])
   })
   ```
   With:
   ```ts
   it('runs verifyExampleManifest against the real manifest and returns verified rows without error', async () => {
     const result = await verifyExampleManifest({ repositoryRoot: repoRoot })
     expect(result).toHaveLength(15)
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
     ])
   })
   ```

2. Add a test asserting the manifest has exactly 15 rows:
   ```ts
   it('contains exactly 15 non-migration example rows', () => {
     const manifest = loadExampleManifest(repoRoot)
     expect(manifest.rows).toHaveLength(15)
     expect(manifest.rows.every(r => !r.category.startsWith('migration-'))).toBe(true)
   })
   ```

### Known Gotchas

**`validateFixturePath` scoping:** `fixtureDir` must be exactly `docs/examples/fixtures/<id>`. The validator enforces `fixtureDir === \`docs/examples/fixtures/${row.id}\``. Any mismatch causes `verifyExampleManifest` to throw during `validateExampleManifest`.

**`serialised-output` `expected.txt`:** `readTextFile` strips one trailing newline (`replace(/\n$/, '')`). Ensure `expected.txt` contains no trailing newline, or it will cause a comparison mismatch.

**RegExp in TypeScript source files:** Source files like `regex-property-matching.ts` and `regex-path-segment-matching.ts` use RegExp literals in the `deepRedact` config. RegExp literals are valid in `.ts` files executed via `node --experimental-strip-types`. Do not serialise them to JSON in the fixture; keep them in the source file.

**`custom-transformer.ts` class declaration:** The `ServicePayload` class is declared inside the source file itself. The `transformers.byConstructor` key must be the class name as a string: `'ServicePayload'`. This works because the transformer registry looks up constructor names at registration time.

**`ignored-value-types.ts` Date construction:** `new Date(record.isoDate)` parses the ISO string from `input.json`. The default Date transformer output is `{ _transformer: 'date', datetime: value.toISOString() }`. With `ignoredValueTypes: { Date: true }`, this object is returned but not further traversed, so `keys: ['datetime']` has no effect on it.

**`graceful-error-replacement.ts` censor throws:** A censor that throws triggers `[UNSUPPORTED]` only for that specific targeted node. The rest of the payload continues through normal redaction. The diagnostics sink (not configured in this example) would receive a `DiagnosticEvent` for each failure — the example omits the sink deliberately to keep it minimal.

**`console-redaction.ts` import path:** The console adapter is at `@hackylabs/deep-redact/adapters/console` (per `package.json` exports). Do not import from a relative path into `src/`.

**Row order in `manifest.json`:** The harness verifies rows in array order. The contract test asserts `result.map(r => r.id)` against the ordered list above. Maintain this exact order in `manifest.json`.

### File Structure Requirements

**New directories to create:**
- `docs/examples/examples/` — 15 TypeScript source files
- `docs/examples/fixtures/singleton-setup/`
- `docs/examples/fixtures/key-targeting/`
- `docs/examples/fixtures/regex-property-matching/`
- `docs/examples/fixtures/path-targeting/`
- `docs/examples/fixtures/regex-path-segment-matching/`
- `docs/examples/fixtures/substring-targeting/`
- `docs/examples/fixtures/root-primitive-redaction/`
- `docs/examples/fixtures/replacement-and-removal/`
- `docs/examples/fixtures/retain-structure/`
- `docs/examples/fixtures/same-length-replacement/`
- `docs/examples/fixtures/serialised-output/`
- `docs/examples/fixtures/ignored-value-types/`
- `docs/examples/fixtures/custom-transformer/`
- `docs/examples/fixtures/graceful-error-replacement/`
- `docs/examples/fixtures/console-redaction/`

**Files to update:**
- `docs/examples/manifest.json` — replace empty `rows: []` with 15 row objects
- `test/contract/examples/example-manifest.test.ts` — update `verifyExampleManifest` assertion, add row-count test
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status
- `_bmad-output/implementation-artifacts/5-7-*.md` — task checkboxes, Dev Agent Record, File List, Status

**Files NOT to touch:**
- `scripts/example-validation.ts` — harness complete from Story `5.6`
- `scripts/verify-examples.ts` — entrypoint complete from Story `5.6`
- `scripts/generated-files.ts` — documentation generation is Story `5.8`
- `scripts/verify-generated-files.ts` — does not include example verification
- `package.json` — `verify:examples` script already wired
- `.github/workflows/npmPublish.yml` — release gate already wired
- `test/migration/` — owned by Stories `5.4` and `5.5`
- `docs/migration/` — owned by Stories `5.4` and `5.5`
- `src/` — no public API changes
- `test/bench/` — owned by Stories `5.9`–`5.10`

### Testing Requirements

- The primary verification is `pnpm run verify:examples` which runs `pnpm run build` then executes `scripts/verify-examples.ts`. All 15 rows must pass.
- The secondary verification is `pnpm run test:contract` which runs `test/contract/examples/example-manifest.test.ts`. The updated `verifyExampleManifest` test must confirm 15 rows, and the new row-count test must pass.
- Do not add row-execution tests beyond what the contract test already covers — `verifyExampleManifest` in the contract test exercises the full harness end-to-end.
- Follow the import and describe-block patterns of `test/contract/examples/example-manifest.test.ts` (Story `5.6`) exactly when adding the new test.

### Previous Story Intelligence

- Story `5.6` established the harness and the full manifest schema. Key decisions to carry forward:
  - `fixtureDir` must be exactly `docs/examples/fixtures/<id>` — the validator enforces this strictly (`validateFixturePath` in `scripts/example-validation.ts:213–233`).
  - `sourceFile` and `expectedResultFile` are both path-traversal-checked — relative paths only, no `..`.
  - `runFn` result is awaited: `const actual = await Promise.resolve(runFn(input))`. Sync and async `runExample` exports both work.
  - For `serialised-output`, the harness checks `typeof actual === 'string'` before comparing — ensure `runExample` returns a string, not an object.
  - Story `5.6` review patch: `fixtureDir === fixtureRoot` is rejected — the fixture directory must have the row id appended. `docs/examples/fixtures/` alone is invalid as a `fixtureDir`.
  - Story `5.6` review patch: `process.cwd()` in contract tests is environment-sensitive — the test uses `import.meta.url`-based `repoRoot` resolution. Follow this pattern for any new tests.

### Project Context Reference

- British English in all code, comments, tests, docs, and commit messages. Use `serialise` (not `serialize`), `recognised` (not `recognized`), `artefacts` (not `artifacts` in prose). [Source: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md:430)]
- Node, package-manager, build, lint, test, and verify commands must run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: project-context.md]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: project-context.md]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: project-context.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `custom-transformer` initially used TypeScript parameter property syntax (`readonly` in constructor) which is not supported in `--experimental-strip-types` mode — rewrote to explicit field assignments.
- Story spec suggested `transformers.byConstructor.ServicePayload` but `TransformersByConstructor` only admits `Date`, `Error`, `Map`, `RegExp`, `Set`, `URL` — redesigned to use `byConstructor.Map` with the same fixture and expected output.

### Completion Notes List

- Added 15 rows to `docs/examples/manifest.json` covering all required feature areas in the specified order.
- Created `docs/examples/examples/` directory with 15 TypeScript source files, each exporting a `runExample` function.
- Created 15 fixture directories under `docs/examples/fixtures/`, each containing `input.json` and `expected.json` (or `expected.txt` for `serialised-output`).
- `serialised-output/expected.txt` written without trailing newline (49 bytes) as required by `readTextFile` stripping logic.
- Updated `test/contract/examples/example-manifest.test.ts`: replaced empty-array assertion with 15-row assertion and added row-count test.
- All 15 rows verified via `pnpm run verify:examples` — "Verified 15 example rows."
- All 436 contract tests pass via `pnpm run test:contract`.
- Lint passes with zero errors via `pnpm run lint`.

### File List

- `docs/examples/manifest.json` — updated: 15 rows added
- `docs/examples/examples/singleton-setup.ts` — new
- `docs/examples/examples/key-targeting.ts` — new
- `docs/examples/examples/regex-property-matching.ts` — new
- `docs/examples/examples/path-targeting.ts` — new
- `docs/examples/examples/regex-path-segment-matching.ts` — new
- `docs/examples/examples/substring-targeting.ts` — new
- `docs/examples/examples/root-primitive-redaction.ts` — new
- `docs/examples/examples/replacement-and-removal.ts` — new
- `docs/examples/examples/retain-structure.ts` — new
- `docs/examples/examples/same-length-replacement.ts` — new
- `docs/examples/examples/serialised-output.ts` — new
- `docs/examples/examples/ignored-value-types.ts` — new
- `docs/examples/examples/custom-transformer.ts` — new
- `docs/examples/examples/graceful-error-replacement.ts` — new
- `docs/examples/examples/console-redaction.ts` — new
- `docs/examples/fixtures/singleton-setup/input.json` — new
- `docs/examples/fixtures/singleton-setup/expected.json` — new
- `docs/examples/fixtures/key-targeting/input.json` — new
- `docs/examples/fixtures/key-targeting/expected.json` — new
- `docs/examples/fixtures/regex-property-matching/input.json` — new
- `docs/examples/fixtures/regex-property-matching/expected.json` — new
- `docs/examples/fixtures/path-targeting/input.json` — new
- `docs/examples/fixtures/path-targeting/expected.json` — new
- `docs/examples/fixtures/regex-path-segment-matching/input.json` — new
- `docs/examples/fixtures/regex-path-segment-matching/expected.json` — new
- `docs/examples/fixtures/substring-targeting/input.json` — new
- `docs/examples/fixtures/substring-targeting/expected.json` — new
- `docs/examples/fixtures/root-primitive-redaction/input.json` — new
- `docs/examples/fixtures/root-primitive-redaction/expected.json` — new
- `docs/examples/fixtures/replacement-and-removal/input.json` — new
- `docs/examples/fixtures/replacement-and-removal/expected.json` — new
- `docs/examples/fixtures/retain-structure/input.json` — new
- `docs/examples/fixtures/retain-structure/expected.json` — new
- `docs/examples/fixtures/same-length-replacement/input.json` — new
- `docs/examples/fixtures/same-length-replacement/expected.json` — new
- `docs/examples/fixtures/serialised-output/input.json` — new
- `docs/examples/fixtures/serialised-output/expected.txt` — new (no trailing newline)
- `docs/examples/fixtures/ignored-value-types/input.json` — new
- `docs/examples/fixtures/ignored-value-types/expected.json` — new
- `docs/examples/fixtures/custom-transformer/input.json` — new
- `docs/examples/fixtures/custom-transformer/expected.json` — new
- `docs/examples/fixtures/graceful-error-replacement/input.json` — new
- `docs/examples/fixtures/graceful-error-replacement/expected.json` — new
- `docs/examples/fixtures/console-redaction/input.json` — new
- `docs/examples/fixtures/console-redaction/expected.json` — new
- `test/contract/examples/example-manifest.test.ts` — updated: verifyExampleManifest assertion updated, row-count test added
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated: story status → review

## Review Findings

### Review Findings (code-review 2026-05-22)

✅ Clean review — all 12 Blind Hunter candidates dismissed as false positives. No genuine bugs, edge cases, or AC violations found.

- [x] [Review][Defer] (none) — 12 findings dismissed as noise; 0 patches; 0 decisions needed
