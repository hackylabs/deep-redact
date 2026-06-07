# Story 4.6: Provide Optional `console.*` Redaction Through an Explicit Guarded Adapter

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want to apply Deep Redact to application `console.*` logging through an explicit guarded adapter,
so that logs can be redacted without mutating global console state or creating recursive logging loops.

## Acceptance Criteria

1. Given console integration is provided, when the public package surface is reviewed, then it is exported only from a dedicated adapter entrypoint and the core runtime entrypoint has no dependency on that adapter module.
2. Given this story's integration model, when console redaction is enabled, then application code must opt in by creating an adapted console surface around a supplied console-like target and no implicit singleton auto-hook or automatic global `console` monkeypatching occurs.
3. Given both the original console-like target and the adapted surface exist, when calls are made through the original target, then those calls are not redacted merely because the adapter has been created.
4. Given the adapter is not imported or constructed, when the core redactor is used normally, then no console-specific behaviour is activated and the core runtime contract remains unchanged.
5. Given a configured redactor and a supplied console-like target, when the adapter constructs an adapted surface, then it exposes wrappers for the documented logging methods `log`, `info`, `warn`, `error`, `debug`, and `trace`.
6. Given one of those adapted methods is called with targeted and non-targeted arguments, when the call is forwarded, then each argument is passed through the redactor independently, targeted arguments are redacted, and non-targeted arguments preserve their original order and position.
7. Given an adapted method is invoked, when the underlying console method is called, then the same method name is used, the variadic argument shape is preserved, and the adapted method returns the underlying method's return value.
8. Given one argument degrades locally to `[UNSUPPORTED]` under the existing runtime contract, when the adapted console call is forwarded, then the call still completes and only that argument reflects the degraded output.
9. Given Deep Redact emits an internal diagnostic while the console adapter is active and the Node fallback transport is in use, when that diagnostic is written, then it bypasses the adapted console surface and is emitted through the guarded diagnostics sink without triggering another redaction pass.
10. Given a synchronous emission would otherwise re-enter the adapted surface while one adapted console call is already in progress, when the re-entrancy guard trips, then the nested adapter pass is blocked, the outer call still completes, and at most one sanitised `console.recursion_blocked` diagnostic event is emitted for that blocked re-entry chain.
11. Given adapted application logging and Deep Redact diagnostics both occur during the same process lifetime, when they are exercised together, then application log redaction continues to work, diagnostics remain sanitised, and no infinite logging loop occurs.
12. Given richer console APIs such as `assert`, `dir`, `table`, `group*`, `time*`, and `count*`, when this story is implemented, then those behaviours remain out of scope unless separately specified.

## Tasks / Subtasks

- [x] Add the optional console adapter source and public types (AC: 1, 2, 5, 6, 7, 8, 10, 12)
  - [x] Add `src/adapters/console/index.ts` as the dedicated adapter entrypoint.
  - [x] Add a small implementation module such as `src/adapters/console/create-redacted-console.ts` and, if clearer, `src/adapters/console/recursion-guard.ts`.
  - [x] Export a single adapter factory from the adapter entrypoint, preferably `createRedactedConsole`, plus narrow public types such as `ConsoleLike`, `ConsoleMethodName`, `ConsoleRedactionOptions`, and `RedactedConsole`.
  - [x] Shape `ConsoleLike` around the exact in-scope method names: `log`, `info`, `warn`, `error`, `debug`, and `trace`. Do not add `assert`, `dir`, `table`, `group*`, `time*`, `count*`, or inspector-only methods in this story.
  - [x] Accept an already configured `Redactor` and a supplied console-like target. Do not accept raw `DeepRedactOptions` in the adapter because policy compilation belongs to `deepRedact(...)` / `createRedactor(...)`.
  - [x] Keep `ConsoleRedactionOptions` adapter-local. If the re-entrancy diagnostic needs an observable caller sink, accept only the existing sink shape, for example `{ diagnostics?: { sink?: DiagnosticSink } }`; do not infer diagnostics from the `Redactor` callable, do not attach hidden diagnostics state to it, and do not add root `DeepRedactOptions` fields.
  - [x] Return a new adapted surface. Do not mutate the supplied target, do not patch `globalThis.console`, and do not install any singleton hook.
  - [x] Call the underlying method with the same method name and preserve `this` by applying the method against the supplied target.
  - [x] Return the exact underlying method return value for normal adapted calls.

- [x] Wire the dedicated adapter entrypoint into the generated package surface (AC: 1, 4)
  - [x] Update `tsdown.config.ts` from its single-entry default to explicit entries for `src/index.ts` and `src/adapters/console/index.ts`.
  - [x] Update `scripts/generated-files.ts` and `scripts/generate-exports.ts` so `package.json` gains exactly one adapter subpath, `./adapters/console`, with ESM, CommonJS, and declaration targets under `dist/adapters/console/`.
  - [x] Assert the emitted adapter artefacts include the built ESM, CommonJS, ESM declaration, and CommonJS declaration outputs, expected as `dist/adapters/console/index.js`, `dist/adapters/console/index.cjs`, `dist/adapters/console/index.d.ts`, and `dist/adapters/console/index.d.cts` unless `tsdown` proves a different deterministic filename.
  - [x] Keep `.` and `./package.json` exports intact and keep root value exports exactly `createRedactor` and `deepRedact`.
  - [x] Update `test/build.test.ts` so package export-map expectations include `./adapters/console` and continue to reject restore-like export names.
  - [x] Add negative package-export coverage proving private adapter implementation subpaths such as `@hackylabs/deep-redact/adapters/console/create-redacted-console` and `@hackylabs/deep-redact/adapters/console/recursion-guard` are not exported and fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  - [x] Update `test/contract/exports/import.test.ts`, `test/contract/exports/require.test.ts`, and consumer fixtures so the root package does not expose the adapter, while `@hackylabs/deep-redact/adapters/console` resolves in both ESM and CommonJS.
  - [x] Update declaration tests and type consumer fixtures so adapter types resolve from the adapter subpath in both ESM and CJS TypeScript consumers.
  - [x] Ensure `tsconfig.json` includes the new adapter entrypoint and supporting adapter source during `pnpm run lint`.
  - [x] Do not hand-edit generated package metadata after the generator exists; run `pnpm run generate`.

- [x] Prove opt-in behaviour and absence of global mutation (AC: 2, 3, 4)
  - [x] Add contract coverage proving `deepRedact(...)` and the root package surface behave identically when the adapter is not imported or constructed.
  - [x] Add a target object with in-memory method spies, create an adapted surface, call the original target methods directly, and prove those calls receive unredacted arguments.
  - [x] Prove creating one adapted surface does not alter `globalThis.console`, does not replace any method on the supplied target, and does not affect another independent console-like target.
  - [x] Prove importing the adapter subpath has no observable effect until `createRedactedConsole(...)` is called.

- [x] Prove forwarding and argument redaction semantics (AC: 5, 6, 7, 8)
  - [x] Add a focused adapter contract suite, preferably `test/contract/adapters/console.test.ts`, that exercises all six in-scope methods.
  - [x] For each in-scope method, assert the adapter forwards to the same method on the target exactly once with the same number of arguments.
  - [x] Pass mixed arguments where only some values match configured `paths`, `keys`, or `stringTests`, and assert each argument is redacted independently without reordering.
  - [x] Include at least one object argument, one array argument, one string argument, and one primitive non-targeted argument.
  - [x] Include a case where one argument degrades to `[UNSUPPORTED]` through the existing runtime contract and prove sibling arguments still forward normally.
  - [x] Assert the adapter does not pre-format arguments with `util.format(...)`; Node's own console formatting remains the responsibility of the supplied target method.
  - [x] Assert the underlying method's return value is returned by the adapted wrapper, including for a custom target method that returns a sentinel value.

- [x] Add guarded diagnostics and re-entrancy protection (AC: 9, 10, 11)
  - [x] Add a private guard that marks one adapted console call as active for the duration of synchronous argument redaction and forwarding.
  - [x] If an adapted method is called again while the guard is active, block the nested adapter pass rather than invoking the redactor a second time.
  - [x] When blocking a nested pass, do not forward unredacted nested arguments through the target. Return `undefined` for the blocked nested call unless implementation discovers a safer existing convention.
  - [x] Emit at most one sanitised `console.recursion_blocked` event for one blocked re-entry chain. The event must use the existing `DiagnosticEvent` shape, include the method name as safe metadata, and must not include console arguments or source values.
  - [x] Add the private Node fallback transport required for AC9 under `src/core/diagnostics/`. Keep it free of public `diagnostics.console` or transport-selection options.
  - [x] Add a private helper for adapter-originated guard events, for example `emitConsoleRecursionBlockedDiagnostic(...)`, that builds `event: 'console.recursion_blocked'`, `path: ''`, `valueType: 'console'`, a generic non-leaking message, and `details: { method }`.
  - [x] Route adapter-originated guard diagnostics through the same guarded diagnostics boundary as redaction failures: call an explicit adapter-local sink when supplied, otherwise use the private Node fallback when available, and silently ignore transport failures. Do not import compiler plans into the adapter, expose redactor internals, or widen the root diagnostics configuration.
  - [x] Detect Node fallback availability without importing Node-only modules into the browser-safe core path; a guarded `globalThis.process?.versions?.node` / `globalThis.console?.error` check is sufficient for this story.
  - [x] Prove a redaction failure diagnostic emitted while the adapter is active does not call the adapted surface and does not trigger another argument-redaction pass.
  - [x] Prove a target method that synchronously calls the adapted surface cannot create an infinite loop and that the outer call still completes.
  - [x] Keep diagnostics sanitisation aligned with Story `3.5`: no raw sensitive values, no partially redacted originals, and no unsafe thrown-message snippets.

- [x] Keep one-way and boundary contracts protected (AC: 1, 4, 9, 10, 11)
  - [x] Extend `test/fixtures/one-way-deny-list/index.ts` only as needed so adapter subpath export names and declarations are covered without weakening the existing root-surface assertions.
  - [x] Assert adapter exports and adapter declaration names do not include restore-like terms: `restore`, `unredact`, `reveal`, or `decode`.
  - [x] Do not add adapter exports to `src/index.ts`.
  - [x] Do not import from `src/adapters/` anywhere under `src/core/`.
  - [x] Do not expose runtime traversal state, redactor internals, original argument handles, or reversible metadata through adapter return values or diagnostics.

- [x] Update public generated documentation only where this story makes existing text false (AC: 1, 2, 12)
  - [x] Update `scripts/templates/README.md.template` if the current "root entrypoint and package.json only" wording becomes false after adding `./adapters/console`.
  - [x] If adding a concise console-adapter document, keep it generated or plainly maintained, keep examples minimal, and do not pre-empt the later worked-example story.
  - [x] Do not hand-edit `README.md`; run `pnpm run generate`.
  - [x] Keep public docs free of BMAD planning terminology.

- [x] Verify the story implementation (AC: 1-12)
  - [x] Start with a focused red phase after adding tests, for example `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/adapters/console.test.ts test/build.test.ts test/contract/exports/import.test.ts test/contract/exports/require.test.ts test/contract/types/declarations.test.ts`.
  - [x] If generated package metadata or README content changes, run `source .agents/initialise-env.sh && pnpm run generate`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify-generated-files`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` because this story changes source entrypoints, build output, package exports, and public type declarations.
  - [x] If `test:red-phase` is run, record unchanged legacy `DeepRedact` / `blacklistedKeys` failures separately rather than widening this story to revive v3 APIs.

### Review Findings

- [x] [Review][Patch] Redaction failure diagnostics still skip the Node fallback transport [src/core/diagnostics/diagnostics-sink.ts:8]
- [x] [Review][Patch] Adapter import side-effect proof snapshots after the adapter has already been statically imported [test/contract/adapters/console.test.ts:7]
- [x] [Review][Patch] Adapter factory own keys are not covered by one-way public-surface checks [test/build.test.ts:73]

## Dev Notes

### Story Intent

- Story `4.6` closes FR35 and FR36 by adding an explicit opt-in console adapter, not by changing core redaction semantics.
- The adapter must be a secondary public package surface. It should be unavailable from the root import and available from a dedicated subpath such as `@hackylabs/deep-redact/adapters/console`.
- The central safety rule is no global mutation. Creating an adapted console surface must not patch `console`, must not mutate the supplied target, and must not create a process-wide singleton hook.
- The adapter should be a thin forwarding boundary: redactor per argument, same method name, same argument arity, same order, same target method return value.
- The re-entrancy guard exists to prevent recursive redaction loops. It must not become a general logging framework, queue, transport abstraction, or replacement for the existing diagnostics sink.

### Current Runtime Intelligence

- The root public facade is `src/index.ts`; it currently exports `deepRedact` and `createRedactor` only as value exports. Do not add the console adapter to this root facade. [Source: [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts:34)]
- `Redactor` is currently typed as `(value: unknown) => unknown`. The adapter can consume this type without importing core runtime internals. [Source: [src/types/public.ts](/Users/ben.green/Code/deep-redact/src/types/public.ts:38)]
- `createRedactor(...)` validates options, compiles the plan once, and returns a callable redactor. The console adapter should receive that compiled callable instead of compiling options itself. [Source: [src/core/create-redactor.ts](/Users/ben.green/Code/deep-redact/src/core/create-redactor.ts:29)]
- Runtime redaction already emits structured diagnostics through `emitDiagnosticEvent(...)` when nested failures degrade locally to `[UNSUPPORTED]`. [Source: [src/core/runtime/redact-value.ts](/Users/ben.green/Code/deep-redact/src/core/runtime/redact-value.ts:226)]
- `emitDiagnosticEvent(...)` currently uses only `plan.sink` and silently ignores sink failures. This story must add the private Node fallback needed by AC9 in the diagnostics boundary while protecting existing caller-provided sink semantics. [Source: [src/core/diagnostics/diagnostics-sink.ts](/Users/ben.green/Code/deep-redact/src/core/diagnostics/diagnostics-sink.ts:4)]
- `compileDiagnostics(...)` currently fixes `redaction.failure` as the failure event name and compiles only an optional caller-provided sink. Do not add public event-name configuration for the console story. [Source: [src/core/compiler/compile-diagnostics.ts](/Users/ben.green/Code/deep-redact/src/core/compiler/compile-diagnostics.ts:3)]
- `DeepRedactOptions.diagnostics` currently permits only `{ sink?: DiagnosticSink }`. The console adapter should not add root options such as `diagnostics.console`. [Source: [src/types/diagnostics.ts](/Users/ben.green/Code/deep-redact/src/types/diagnostics.ts:11)]
- `validate-config` already rejects unsupported diagnostics fields. Existing tests cover `diagnostics: { console: true }` as unsupported; preserve that public-root constraint unless planning artefacts are updated. [Source: [test/contract/api/create-redactor.test.ts](/Users/ben.green/Code/deep-redact/test/contract/api/create-redactor.test.ts:350)]
- A `Redactor` is currently a bare function type, so the adapter cannot safely discover the caller's compiled diagnostics plan from it. Adapter-originated `console.recursion_blocked` diagnostics need an explicit adapter-local sink option or the private Node fallback; do not decorate redactor functions with hidden diagnostics metadata. [Source: [src/types/public.ts](/Users/ben.green/Code/deep-redact/src/types/public.ts:38)]

### Architecture Compliance

- The PRD explicitly includes optional `console.*` redaction with safeguards against recursive diagnostic logging. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:83)]
- FR35 requires developers to optionally apply Deep Redact to `console.*` calls, and FR36 requires enabling that without recursive diagnostic logging. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:442)]
- NFR14 states optional console redaction must not create recursive redaction loops or destabilise application logging behaviour. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:475)]
- The architecture requires optional platform-specific features, especially console integration, to live in secondary adapter entrypoints rather than the core runtime. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:150)]
- The architecture requires optional console integration to use a re-entrancy guard so internal diagnostics cannot recursively redact themselves. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:175)]
- Core runtime code must not depend on adapter modules. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:481)]
- Diagnostics events use `dot.case` names; `console.recursion_blocked` is the architecture-provided event name for the guard path. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:541)]
- Console redaction support maps to `src/adapters/console/`, `src/core/diagnostics/`, and diagnostics/security tests. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:883)]

### Library and Framework Requirements

- Use the live pinned repository baseline: Node `24.14.1`, `pnpm@10.33.0`, TypeScript `6.0.2`, Vitest `4.1.4`, `tsdown@0.21.7`, and ESLint `9.39.4`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10)]
- Every Node, package-manager, build, lint, test, generation, benchmark, or release command must be prefixed with `source .agents/initialise-env.sh` from the repository root. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:9)]
- Keep the package zero-runtime-dependency. All current dependencies are development-only; do not add a logging package for this story. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:73)]
- Keep ESM TypeScript imports consistent with the NodeNext setup and explicit `.js` specifiers for source and test imports. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:4)]
- The local `tsdown@0.21.7` type surface says `entry` defaults to `src/index.ts` when present. Multiple public entrypoints therefore require an explicit `entry` configuration. [Source: [node_modules/tsdown/dist/types-DD-uKQPn.d.mts](/Users/ben.green/Code/deep-redact/node_modules/tsdown/dist/types-DD-uKQPn.d.mts:755)]
- `tsconfig.json` currently includes `src/index.ts`, scripts, build tests, contract tests, and config files. Adapter-only source will not be type-checked by `pnpm run lint` unless the include list is widened or the adapter entrypoint is listed. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:17)]

### File Structure Requirements

- Expected new adapter source:
  - `src/adapters/console/index.ts`
  - `src/adapters/console/create-redacted-console.ts`
  - `src/adapters/console/recursion-guard.ts` if the guard is clearer as a separate module
- Expected package/build configuration targets:
  - `tsdown.config.ts`
  - `scripts/generated-files.ts`
  - `scripts/generate-exports.ts`
  - `scripts/verify-generated-files.ts` if generated-file coverage needs another expected output
  - `package.json` only through generation
  - `tsconfig.json`
- Expected test targets:
  - `test/contract/adapters/console.test.ts`
  - `test/build.test.ts`
  - `test/contract/exports/import.test.ts`
  - `test/contract/exports/require.test.ts`
  - `test/contract/types/declarations.test.ts`
  - `test/fixtures/consumers/esm/index.mjs`
  - `test/fixtures/consumers/cjs/index.cjs`
  - `test/fixtures/consumers/types/index.ts`
  - `test/fixtures/consumers/types-cjs/index.cts`
  - `test/fixtures/one-way-deny-list/index.ts` if adapter export/declaration scanning needs helper updates
- Conditional diagnostics targets only if needed for AC 9-11:
  - `src/core/diagnostics/diagnostics-sink.ts`
  - `src/core/diagnostics/diagnostic-event.ts`
  - `src/core/diagnostics/console-diagnostic-event.ts` or equivalent guard-event helper if this keeps `console.recursion_blocked` construction out of the adapter
  - `src/core/diagnostics/node-console-sink.ts`
  - `test/unit/core/diagnostics/diagnostic-event.test.ts`
- Avoid editing legacy-looking `src/utils/` and `src/types.ts`. They are not part of the current primary package facade or TypeScript include set. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:17)]

### Testing Requirements

- Prefer public contract tests over internal runtime imports. Use `deepRedact(...)` to create the configured redactor consumed by the adapter.
- Build adapter tests around a custom console-like target with spies for `log`, `info`, `warn`, `error`, `debug`, and `trace`. Avoid relying on process stdout/stderr for primary assertions.
- Assert the original target method is unchanged after adapter creation by comparing function identities before and after construction.
- Assert root imports remain adapter-free and adapter subpath imports work in both ESM and CommonJS built-package fixtures.
- Assert private adapter implementation subpaths remain blocked by the package export map, not merely undocumented.
- Use one-way deny-list helpers for public-surface and declaration assertions so Story `4.5` coverage extends to the new adapter subpath.
- Inspect both adapter declaration outputs, `dist/adapters/console/index.d.ts` and `dist/adapters/console/index.d.cts`, for the expected public type names and for absence of restore-like terms.
- Re-entrancy tests should create a target method that synchronously calls the adapted surface while a call is active. Assert the redactor is not called recursively, the outer call returns, and the `console.recursion_blocked` event is emitted at most once for the chain.
- Test `console.recursion_blocked` emission through an explicit adapter-local sink, and separately test the private Node fallback path without replacing the supplied or adapted console target.
- Diagnostics leakage assertions should serialise diagnostic events and assert they do not include targeted secrets, raw original argument values, `[REDACTED]` as an original-value hint, or thrown secret-bearing messages.
- Do not test out-of-scope console methods except to assert they are not added to the adapted surface.
- Keep `test:contract` and `lint` in the verification path because package exports, declaration generation, and TypeScript include coverage are easy to break with a new entrypoint.

### Previous Story Intelligence

- Story `4.5` explicitly said optional console integration is deferred to Story `4.6`; this is now the right place to add `src/adapters/console/`. [Source: [_bmad-output/implementation-artifacts/4-5-enforce-a-one-way-redaction-deny-list-across-public-surface-and-outputs.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-5-enforce-a-one-way-redaction-deny-list-across-public-surface-and-outputs.md:110)]
- Story `4.5` added `test/fixtures/one-way-deny-list/index.ts` and scanners for public names, declarations, structured output, serialised output, non-enumerable properties, symbols, and source identity handles. Extend that fixture rather than inventing a parallel public-surface scanner. [Source: [test/fixtures/one-way-deny-list/index.ts](/Users/ben.green/Code/deep-redact/test/fixtures/one-way-deny-list/index.ts:1)]
- Story `4.5` review found public surface checks missed non-enumerable names and redactor prototypes. For this story, inspect adapter module own keys, adapter factory own keys, adapted surface own keys, and declaration names rather than only `Object.keys(...)`. [Source: [_bmad-output/implementation-artifacts/4-5-enforce-a-one-way-redaction-deny-list-across-public-surface-and-outputs.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/4-5-enforce-a-one-way-redaction-deny-list-across-public-surface-and-outputs.md:77)]
- Story `4.4` and Story `4.5` established the current pattern for fixture-backed public contracts plus generated documentation drift protection. Follow that pattern for package export and README changes instead of hand-maintaining generated artefacts. [Source: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:30)]
- Story `3.5` deferred console transport and recursion-guard behaviour to Epic `4`, while establishing the current `DiagnosticEvent` shape and sanitised runtime diagnostics boundary. Reuse that shape for `console.recursion_blocked`. [Source: [_bmad-output/implementation-artifacts/3-5-degrade-nested-runtime-failures-to-unsupported-with-deterministic-diagnostics.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/3-5-degrade-nested-runtime-failures-to-unsupported-with-deterministic-diagnostics.md:39)]
- Recent commits show Epic `4` work has consistently added focused fixtures and contract coverage without adding runtime dependencies: `83a1c02` for one-way denial, `e416d91` for precedence, `3a1e672` for lane equivalence, and `7dbc5ca` for deterministic output.

### Latest Technical Information

- Checked on **22 May 2026** against the local repository baseline and current official Node documentation.
- Node `22.18.0`, the package engine floor, documents `log`, `info`, `warn`, `error`, `debug`, and `trace` as stable console methods. It also documents `debug` as an alias for `log`, `info` as an alias for `log`, `warn` as an alias for `error`, and `trace` as stderr stack output. This supports the story's six-method scope without adding richer console APIs. [Source: [Node.js v22.18 Console API](https://nodejs.org/download/release/v22.18.0/docs/api/console.html)]
- Node's console docs warn that global console methods are not consistently synchronous or asynchronous across backing streams. The adapter must therefore avoid timing or flush assumptions and simply return the supplied method's return value. [Source: [Node.js v22.18 Console API](https://nodejs.org/download/release/v22.18.0/docs/api/console.html)]
- Node package docs say `"exports"` defines public entrypoints, unlisted subpaths fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`, custom subpaths are allowed, and export targets must be relative `./` URLs. The adapter should therefore be explicitly listed as one subpath and not exposed by accidental folder patterns. [Source: [Node.js v22.18 Packages API](https://nodejs.org/download/release/v22.18.0/docs/api/packages.html)]
- No dependency upgrade is required. The work should use the pinned local toolchain and the existing Vitest/package-fixture harness.

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:3)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`. This story file belongs under `_bmad-output/implementation-artifacts/`; public product/runtime docs belong under `docs/` only when they are product documentation, not planning artefacts. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:16)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:22)]

### Project Structure Notes

- The architecture's ideal tree already includes `src/adapters/console/`, but the live repository currently has no `src/adapters/` directory. Create only the console adapter needed for this story.
- The active package export map is generated and currently limited to `.`, plus `./package.json`. Adding the adapter subpath requires generator, build-test, consumer-fixture, and declaration-test updates together.
- `README.md` is generated from `scripts/templates/README.md.template`; do not hand-edit README if the public surface wording changes.
- Existing public docs `docs/architecture/precedence.md` and `docs/architecture/one-way-redaction.md` are generated. Do not edit them unless the story deliberately extends their source renderers.
- `test/security/diagnostics/` does not currently exist. Follow the existing repository pattern with contract and unit tests unless creating that directory materially improves clarity.

### Open Questions / Assumptions

- Assume the adapter public subpath should be `@hackylabs/deep-redact/adapters/console`, matching the architecture directory and keeping the root import small.
- Assume the primary factory name should be `createRedactedConsole`; if implementation finds an existing naming convention with a stronger local fit, keep the name explicit and avoid verbs that imply mutation such as a global hook.
- Assume normal adapted calls should return the underlying target method's return value, while blocked nested re-entry calls may return `undefined` because no underlying method should receive unredacted nested arguments.
- Assume no root-level diagnostics option should be added for console transport. AC9 requires private Node fallback diagnostics; implement them in `src/core/diagnostics/` without exposing transport selection as public configuration. If the adapter needs a test-observable sink for `console.recursion_blocked`, keep it adapter-local and compatible with the existing `DiagnosticSink` shape.
- Assume public worked examples for console behaviour can remain minimal in this story. Story `5.7` owns the broader worked-example manifest and example documentation set.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1233)
- FR35 / FR36: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:442)
- NFR14: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:475)
- Adapter boundary: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:150)
- Console recursion guard: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:175)
- Public API facade: [src/index.ts](/Users/ben.green/Code/deep-redact/src/index.ts:34)
- Redactor type: [src/types/public.ts](/Users/ben.green/Code/deep-redact/src/types/public.ts:38)
- Diagnostics sink: [src/core/diagnostics/diagnostics-sink.ts](/Users/ben.green/Code/deep-redact/src/core/diagnostics/diagnostics-sink.ts:4)
- Generated-file helpers: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:30)
- Current package scripts and dependencies: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)
- Project context: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)
- Node Console API: [https://nodejs.org/download/release/v22.18.0/docs/api/console.html](https://nodejs.org/download/release/v22.18.0/docs/api/console.html)
- Node Package Exports API: [https://nodejs.org/download/release/v22.18.0/docs/api/packages.html](https://nodejs.org/download/release/v22.18.0/docs/api/packages.html)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/adapters/console.test.ts test/build.test.ts test/contract/exports/import.test.ts test/contract/exports/require.test.ts test/contract/types/declarations.test.ts` failed in the red phase because the adapter source, export-map subpath, built artefacts, and adapter declarations did not exist yet.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/adapters/console.test.ts` passed after implementing the source adapter.
- `source .agents/initialise-env.sh && pnpm run generate` passed and refreshed generated package metadata and generated docs.
- `source .agents/initialise-env.sh && pnpm run build` passed and emitted `dist/adapters/console/*` artefacts.
- `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/adapters/console.test.ts test/build.test.ts test/contract/exports/import.test.ts test/contract/exports/require.test.ts test/contract/types/declarations.test.ts` passed after implementation.
- `source .agents/initialise-env.sh && pnpm run verify-generated-files` passed.
- `source .agents/initialise-env.sh && pnpm run test:contract` passed with 7 files and 373 tests.
- `source .agents/initialise-env.sh && pnpm run lint` passed after style and type fixes.
- `source .agents/initialise-env.sh && pnpm run test` passed with 7 files and 373 tests.
- Review red phase: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/adapters/console.test.ts` failed because `redaction.failure` diagnostics did not reach the Node fallback transport while the adapter was active.
- Review fix verification: `source .agents/initialise-env.sh && pnpm exec vitest run test/contract/adapters/console.test.ts test/unit/core/diagnostics/diagnostic-event.test.ts` passed for the adapter contract; the unit diagnostics path is outside the default Vitest include set and was not selected by the repository config.
- Review fix verification: `source .agents/initialise-env.sh && pnpm run build` passed.
- Review fix verification: `source .agents/initialise-env.sh && pnpm exec vitest run test/build.test.ts test/contract/adapters/console.test.ts test/contract/exports/import.test.ts test/contract/exports/require.test.ts test/contract/types/declarations.test.ts test/unit/core/diagnostics/diagnostic-event.test.ts` passed for the configured build and contract files; the unit diagnostics path is outside the default Vitest include set.
- Review fix verification: `source .agents/initialise-env.sh && pnpm run lint` passed.
- Review fix verification: `source .agents/initialise-env.sh && pnpm run test:contract` passed with 7 files and 374 tests.
- Review fix verification: `source .agents/initialise-env.sh && pnpm run test` passed with 7 files and 374 tests.

### Completion Notes List

- Added the explicit `createRedactedConsole` adapter subpath with `ConsoleLike`, `ConsoleMethodName`, `ConsoleRedactionOptions`, and `RedactedConsole` types, while keeping `src/index.ts` unchanged.
- Implemented per-argument redaction for `debug`, `error`, `info`, `log`, `trace`, and `warn`, preserving target method identity, `this`, argument order, arity, and return values.
- Added a synchronous re-entrancy guard that blocks nested adapter passes, emits at most one sanitised `console.recursion_blocked` event per chain, and routes guard diagnostics to an adapter-local sink or private Node fallback.
- Updated generated package exports, tsdown entries, generated public-surface documentation, and consumer fixtures for ESM, CommonJS, and TypeScript adapter subpath usage.
- Added contract coverage for opt-in behaviour, absence of global mutation, original-target pass-through, private subpath rejection, declaration surface safety, unsupported argument degradation, diagnostics sanitisation, and recursion-loop prevention.

### File List

- README.md
- _bmad-output/implementation-artifacts/4-6-provide-optional-console-redaction-through-an-explicit-guarded-adapter.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- docs/architecture/one-way-redaction.md
- package.json
- scripts/generated-files.ts
- scripts/templates/README.md.template
- src/adapters/console/create-redacted-console.ts
- src/adapters/console/index.ts
- src/adapters/console/recursion-guard.ts
- src/core/diagnostics/console-diagnostic-event.ts
- src/core/diagnostics/diagnostics-sink.ts
- src/core/diagnostics/node-console-sink.ts
- test/build.test.ts
- test/contract/adapters/console.test.ts
- test/contract/exports/import.test.ts
- test/contract/exports/require.test.ts
- test/contract/types/declarations.test.ts
- test/fixtures/consumers/cjs/index.cjs
- test/fixtures/consumers/esm/index.mjs
- test/fixtures/consumers/types-cjs/index.cts
- test/fixtures/consumers/types/index.ts
- test/fixtures/one-way-deny-list/index.ts
- tsconfig.json
- tsdown.config.ts
- dist/index.js

### Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-05-22 | 1.0 | Implemented optional guarded console adapter and package subpath contracts. | Codex |
| 2026-05-22 | 1.1 | Addressed code review findings for fallback diagnostics and adapter public-surface coverage. | Codex |
