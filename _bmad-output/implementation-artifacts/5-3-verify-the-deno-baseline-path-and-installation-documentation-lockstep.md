# Story 5.3: Verify the Deno Baseline Path and Installation Documentation Lockstep

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the Deno baseline path and installation documentation to be proven from the same canonical install artefacts,
so that the final support matrix remains aligned with verified behaviour rather than release-note drift.

## Acceptance Criteria

1. Given the `deno-2` row, when release verification runs, then that row executes the documented Deno baseline usage path successfully on Deno `2.x`, and stdout matches the row's expected stdout file byte-for-byte.
2. Given installation documentation and baseline usage documentation are published, when they are generated or validated in CI, then the published install commands and baseline usage snippets are derived from the same canonical install matrix manifest and fixture source, and documentation drift causes the same verification workflow to fail.
3. Given the `deno-2` row or installation documentation lockstep fails, when release verification runs, then the verification run fails, and the affected support claim is not treated as release-proven.
4. Given this story's scope, when the implementation is reviewed, then migration, worked examples, benchmarks, and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Add executable Deno install-matrix verification (AC: 1, 3)
  - [x] Extend `scripts/verify-install-matrix.ts` to select and execute the existing `deno-2` row from `test/compatibility/install/matrix.json`; do not create a second Deno-only verifier or duplicate row definitions.
  - [x] Add a Deno row planner that validates `runtimeVersion: "deno@2"`, checks `deno --version`, and fails when the available Deno runtime is not major version `2`.
  - [x] Expand `{denoPackageSpecifier}` only for Deno rows. Keep `{packageTarball}` and `{packageTarballUrl}` semantics unchanged for Node package-manager rows.
  - [x] Copy `test/fixtures/compatibility/install/deno-baseline/` to a temporary fixture directory before execution. Replace the temporary fixture's `deno.json` token value with the verifier-provided package specifier; do not mutate the committed fixture.
  - [x] Run the manifest `installCommand` and `runCommand` as argument arrays through the existing shell-free execution path. The expected command path is `deno install --entrypoint smoke.ts` followed by `deno run smoke.ts`.
  - [x] Compare stdout with `test/artefacts/install-matrix/expected/baseline-structured.stdout` as raw UTF-8, including the trailing LF. Do not parse and reserialise output for equality.
  - [x] Treat install failure, run failure, non-zero exit status, stderr from the Deno smoke run, stdout drift, missing Deno, unsupported Deno major version, and unresolved command tokens as release-verification failures.
  - [x] Preserve the existing Node verifier behaviour: active Node runtime still selects only the four Node rows for that runtime, Bun still uses the file-URL-then-HTTP fallback, and Yarn still uses `YARN_NODE_LINKER=node-modules`.

- [x] Prove the package source used by Deno before publish (AC: 1, 3)
  - [x] Resolve the documented Deno package specifier from package metadata as `npm:${packageJson.name}@${packageJson.version}`; for the current repository this is `npm:@hackylabs/deep-redact@4.0.0`.
  - [x] Do not verify against an unpinned public `latest` tag or the currently published v3 package. That would prove the wrong package surface.
  - [x] Because `4.0.0` is not necessarily published before the release gate runs, use a verifier-controlled package source for pre-publish proof. Prefer a small loopback npm registry helper that serves the same packed `.tgz` artefact already produced by `packCurrentPackage(...)`, then write fixture-local `.npmrc` or equivalent environment configuration so Deno resolves the `npm:` specifier through that registry.
  - [x] Keep the loopback registry single-package and temporary: it should serve only `@hackylabs/deep-redact` metadata for the current package version and the matching tarball URL, then close after verification.
  - [x] Run Deno install and smoke commands with a verifier-owned temporary `DENO_DIR` so the proof cannot pass from a developer's or CI runner's global Deno cache. Remove that cache with the temporary fixture unless `DEEP_REDACT_KEEP_INSTALL_FIXTURES=1` is set for debugging.
  - [x] Make the loopback registry observable: the verifier must fail if the Deno install phase does not request the current package metadata and the exact tarball served from `packCurrentPackage(...)`. A cache hit, public-registry hit, or unrequested tarball must not be treated as release proof.
  - [x] Ensure the verification still exercises Deno's `npm:` package resolution path. Do not replace the import map with `../dist`, `src/`, a filesystem path to the package root, or a direct tarball URL masquerading as Deno support.

- [x] Generate installation and baseline-usage documentation from source data (AC: 2, 3)
  - [x] Extend the generated README workflow rather than hand-editing `README.md`. Add the maintained source under `scripts/templates/README.md.template`, `scripts/generated-files.ts`, or a small adjacent generator module used by `buildGeneratedReadme()`.
  - [x] Read `test/compatibility/install/matrix.json` and the fixture sources to render the public installation section. The generated docs must fail if the canonical rows, command tokens, fixture import, expected package name, or baseline snippet drift.
  - [x] Render installation commands for `npm`, `pnpm`, `yarn`, `bun`, and Deno from the canonical matrix row data and package metadata. Public package-manager commands may replace verifier tarball tokens with the package name, but the transform must be tested and derived from the row rather than hand-written in `README.md`.
  - [x] Render the Deno baseline usage snippet from `test/fixtures/compatibility/install/deno-baseline/smoke.ts` and the Deno import-map entry from `test/fixtures/compatibility/install/deno-baseline/deno.json`, with `{denoPackageSpecifier}` resolved through the same package-specifier helper used by the verifier.
  - [x] Keep generated documentation concise and release-facing. This story should document installation and the canonical baseline smoke usage only, not migration examples, worked examples, benchmarks, or platform-adoption guidance.
  - [x] Update `scripts/verify-generated-files.ts` coverage as needed so README/documentation drift is caught by `pnpm run build`, `pnpm run test`, and `pnpm run verify:install-matrix`.

- [x] Wire Deno verification into CI and release gates (AC: 1, 2, 3)
  - [x] Update `.github/workflows/npmPublish.yml` or the relevant release workflow to install Deno using `denoland/setup-deno@v2` with Deno `v2.x`.
  - [x] Ensure the install-matrix release gate runs the Deno row as part of the same `pnpm run verify:install-matrix` command that verifies Node package-manager rows.
  - [x] Keep publish single-shot after all verification succeeds. Do not publish from each matrix leg and do not move Deno verification after `pnpm publish`.
  - [x] Keep release verification explicit about required tools: Node `22.18.0` and `24.14.1` jobs still prove their Node rows, and a Deno `2.x` setup must prove the `deno-2` row before publish.

- [x] Add hermetic contract coverage without running external installs in ordinary tests (AC: 1, 2, 3)
  - [x] Extend `test/contract/compatibility/install-matrix-verifier.test.ts` with injected-executor coverage for Deno row selection, `{denoPackageSpecifier}` expansion, Deno major-version validation, fixture-local `deno.json` token replacement, `.npmrc` or registry configuration, stdout comparison, failure reporting, and temporary cleanup.
  - [x] Extend `test/contract/compatibility/install-matrix.test.ts` if the manifest gains documentation metadata or stricter Deno-row invariants.
  - [x] Add generated documentation tests that intentionally compare generated README installation text with the matrix and fixture source. A hand-edited README command or snippet must fail `verify-generated-files`.
  - [x] Keep ordinary contract tests offline and side-effect-free through fake executors, fake registry servers, and temporary directories. Real Deno dependency resolution belongs to `verify:install-matrix` and CI/release gates.

- [x] Maintain scope boundaries (AC: 4)
  - [x] Do not change public redaction semantics, console adapter behaviour, precedence rules, migration fixtures, benchmark artefacts, or platform-adoption material unless Deno verification exposes a real package-surface defect.
  - [x] Do not introduce a persistent local npm registry dependency such as Verdaccio unless a no-dependency loopback registry proves impractical and the trade-off is covered by contract tests.
  - [x] Do not commit `deno.lock`, `node_modules`, `.npmrc`, generated package-manager locks, packed `.tgz` artefacts, or temporary registry metadata from verifier runs.
  - [x] Keep all code, comments, tests, and docs in British English unless quoting identifiers or third-party APIs.

- [x] Verify the story implementation (AC: 1-4)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:install-matrix` with local Deno `2.x` available, recording whether the Deno row and local Node `24.14.1` rows passed.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if package scripts, generated files, workflow-critical package metadata, generator code, or shared verifier behaviour changed.
  - [x] Record any unavailable local Deno or package-manager binary separately. The release support claim is not proven unless CI executes the Deno row and both exact Node runtime sets.

### Review Findings

- [x] [Review][Patch] Registry proof is not tied to the Deno install phase [scripts/verify-install-matrix.ts:1119]
- [x] [Review][Patch] Deno registry environment does not isolate user-level scoped npm configuration [scripts/verify-install-matrix.ts:725]

## Dev Notes

### Story Intent

- Story `5.1` created the canonical manifest, Node and Deno baseline fixtures, expected stdout artefact, and static contract coverage. Story `5.2` made the eight Node package-manager rows executable. Story `5.3` must now make the `deno-2` row executable and make public installation documentation generated from the same manifest and fixture data. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:15), [_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md:17)]
- This is a release-trust story, not a runtime feature story. It should fail loudly when Deno support or public documentation is not proven.
- The key false-positive risk is verifying an already-published older package, a local `dist/` path, or a manually maintained README snippet. The implementation must prove the current packed package artefact through Deno's npm-resolution path and generated docs.

### Current Repository Intelligence

- The canonical matrix already contains `deno-2` with `packageManager: "deno"`, `runtime: "deno"`, `fixtureDir: "test/fixtures/compatibility/install/deno-baseline"`, `runtimeVersion: "deno@2"`, install command `["deno", "install", "--entrypoint", "smoke.ts"]`, run command `["deno", "run", "smoke.ts"]`, and the shared expected stdout file. [Source: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:161)]
- Matrix metadata already defines `{denoPackageSpecifier}` as the verifier-provided Deno-compatible public package specifier, expected to resolve to a form such as `npm:@hackylabs/deep-redact@{packageVersion}` once documentation lockstep is finalised. [Source: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:7)]
- The committed Deno fixture imports `deepRedact` from the bare public package specifier and maps that specifier through `deno.json`; this is intentional so the verifier and docs can resolve the package version centrally. [Source: [test/fixtures/compatibility/install/deno-baseline/smoke.ts](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/deno-baseline/smoke.ts:1), [test/fixtures/compatibility/install/deno-baseline/deno.json](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/deno-baseline/deno.json:3)]
- The Deno and Node baseline fixtures use the same public `deepRedact(...)` call with `paths: ['user.password', 'token']`, the same canonical payload, and `console.log(JSON.stringify(redactedPayload))`, so the expected stdout includes a single trailing LF. [Source: [test/fixtures/compatibility/install/deno-baseline/smoke.ts](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/deno-baseline/smoke.ts:3), [test/artefacts/install-matrix/expected/baseline-structured.stdout](/Users/ben.green/Code/deep-redact/test/artefacts/install-matrix/expected/baseline-structured.stdout:1)]
- `scripts/verify-install-matrix.ts` currently supports only `{packageTarball}` and `{packageTarballUrl}` command tokens, and `planInstallMatrixVerification(...)` selects Node rows through `selectNodeRows(...)`. Deno support should be added by extending this verifier rather than replacing it. [Source: [scripts/verify-install-matrix.ts](/Users/ben.green/Code/deep-redact/scripts/verify-install-matrix.ts:151), [scripts/verify-install-matrix.ts](/Users/ben.green/Code/deep-redact/scripts/verify-install-matrix.ts:304)]
- The current package metadata declares `@hackylabs/deep-redact` version `4.0.0`, Node engine floor `>=22.18.0`, generated exports, and `files: ["dist"]`. Use this metadata for generated package specifiers and public install snippets. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:2), [package.json](/Users/ben.green/Code/deep-redact/package.json:35)]
- `README.md` is generated from `scripts/templates/README.md.template` through `scripts/generated-files.ts`, and `verify-generated-files` fails when README output drifts. Installation documentation must join this generation path rather than bypass it. [Source: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:54), [scripts/verify-generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/verify-generated-files.ts:20)]
- The current publish workflow verifies Node `22.18.0` and Node `24.14.1` install-matrix jobs before a single publish job, but it does not yet install Deno. [Source: [.github/workflows/npmPublish.yml](/Users/ben.green/Code/deep-redact/.github/workflows/npmPublish.yml:6), [.github/workflows/npmPublish.yml](/Users/ben.green/Code/deep-redact/.github/workflows/npmPublish.yml:28)]

### Architecture Compliance

- FR34 requires install and use through `npm`, `pnpm`, `yarn`, `bun`, and `deno`; the PRD also requires installation and baseline usage to be verified rather than treated as documentation-only claims. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:440), [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:479)]
- Deno support must cover `>= 2.*`, and published documentation must align with the verified installation and compatibility matrix. [Source: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:481), [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:483)]
- Release verification must cover Node `22` and `24`, Deno `2.x`, install smoke tests across `npm`, `pnpm`, `yarn`, and `bun`, and browser-safe smoke coverage for the core build. This story owns only the Deno and installation-documentation part of that release-verification surface. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:370)]
- Compatibility verification belongs under `test/compatibility/`, fixtures under `test/fixtures/`, committed verification baselines under `test/artefacts/`, scripts under `scripts/`, and CI wiring under `.github/workflows/`. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:736), [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:966)]
- Generated artefacts are validated from maintained source data. `README.md` and package exports must not be edited as primary outputs. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:879)]

### Library and Framework Requirements

- Contributor commands must run with the repository bootstrap: `source .agents/initialise-env.sh && ...`. Treat bootstrap failure as a blocker. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:16)]
- Use the live pinned contributor baseline: Node `24.14.1`, `pnpm@10.33.0`, `tsdown`, Vitest, and ESLint/XO tooling already declared by `package.json`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10), [package.json](/Users/ben.green/Code/deep-redact/package.json:75)]
- Keep verifier helpers dependency-light. The current verifier uses Node built-ins for child processes, filesystem work, temporary directories, loopback HTTP serving, and path handling; extend those patterns before adding third-party tools. [Source: [scripts/verify-install-matrix.ts](/Users/ben.green/Code/deep-redact/scripts/verify-install-matrix.ts:1)]
- For CI, use the official Deno setup action with Deno `v2.x`; `denoland/setup-deno@v2` defaults to Deno `v2.x` and supports explicit `deno-version` input. [Source: [denoland/setup-deno README](https://github.com/denoland/setup-deno)]

### Deno Technical Guidance

- Deno supports `deno.json` import-map entries that map bare specifiers to `npm:` packages. This matches the committed fixture pattern. [Source: [Deno configuration docs](https://docs.deno.com/runtime/fundamentals/configuration/)]
- `deno install --entrypoint <file>` installs dependencies used by an entrypoint and is explicitly intended for `npm:` specifiers. This matches the `deno-2` manifest command. [Source: [Deno install docs](https://docs.deno.com/runtime/reference/cli/install/)]
- By default Deno resolves npm packages through its global npm cache and no local `node_modules` directory is required for ordinary npm imports. Do not introduce `nodeModulesDir` unless Deno verification proves the package needs it. [Source: [Deno Node/npm compatibility docs](https://docs.deno.com/runtime/fundamentals/node/)]
- The global cache is `DENO_DIR` and is shared across projects by default, so the verifier must provide a fresh temporary `DENO_DIR` for this release proof rather than relying on the user's existing cache. [Source: [Deno modules and dependencies docs](https://docs.deno.com/runtime/fundamentals/modules/)]
- Deno supports private npm registries through project-root or home `.npmrc`, and `NPM_CONFIG_REGISTRY` can override registry configuration. This is the correct primitive for a verifier-controlled pre-publish package source when using an `npm:` specifier. [Source: [Deno Node/npm compatibility docs](https://docs.deno.com/runtime/fundamentals/node/)]
- Use current Deno 2.x primitives only when they are necessary. Avoid Deno 2.8-only features such as `--package-json`, hoisted `nodeModulesLinker`, or platform-specific install flags unless a failing proof demonstrates they are needed, because the product claim is Deno `>= 2.*`. [Source: [Deno install docs](https://docs.deno.com/runtime/reference/cli/install/), [Deno Node/npm compatibility docs](https://docs.deno.com/runtime/fundamentals/node/)]

### Implementation Guardrails

- Prefer adding small, typed helpers to the existing verifier:
  - `resolveDenoPackageSpecifier(packageJson)` returns `npm:<name>@<version>`.
  - `selectDenoRows(matrix, denoVersionOutput)` returns exactly the `deno-2` row when Deno major version is `2`.
  - `planDenoInstallMatrixVerification(...)` validates paths, expands `{denoPackageSpecifier}`, and prepares fixture-local config.
  - `createNpmRegistryServer({ packageJson, packageTarball })` serves a minimal loopback packument and the packed tarball.
  - `writeTemporaryDenoFixtureConfig(...)` replaces the committed `deno.json` token only inside the temporary fixture.
  - `createDenoRowEnvironment(...)` overlays the row environment with fixture-local registry configuration and a temporary `DENO_DIR`.
- Keep Deno execution serial with the existing row runner. Deno cache and temporary registry state are simpler to reason about one row at a time.
- Keep row errors actionable: include row id, phase, Deno version, command phase, exit status, and trimmed stderr; never dump full fixture contents or payload values.
- If the loopback registry serves the packed tarball, assert the tarball path is the exact output from `packCurrentPackage(...)`, support the scoped package metadata route that Deno requests, and record metadata/tarball requests so the verifier can fail when Deno resolves from anywhere else.
- The generated public documentation should have one source path from matrix and fixtures to output. A practical shape is:
  - add installation-rendering helpers in `scripts/generated-files.ts` or `scripts/install-documentation.ts`;
  - read `matrix.json`, package metadata, and fixture source;
  - replace a template placeholder such as `{{INSTALLATION_DOCUMENTATION}}` in `README.md.template`;
  - verify with `scripts/verify-generated-files.ts`.
- When rendering public package-manager install commands from tarball-based verification rows, test the transform. For example, npm's verifier row contains `{packageTarball}` but public docs should show the package name; Deno's docs should show the resolved `npm:@hackylabs/deep-redact@4.0.0` specifier and the same baseline fixture shape.

### File Structure Requirements

Likely files to update:

- `scripts/verify-install-matrix.ts`
- `scripts/generated-files.ts`
- `scripts/templates/README.md.template`
- `scripts/verify-generated-files.ts`
- `README.md` (generated only)
- `test/contract/compatibility/install-matrix-verifier.test.ts`
- `test/contract/compatibility/install-matrix.test.ts`
- `.github/workflows/npmPublish.yml`
- `package.json` if an additional verification script is justified, though the preferred path is to keep `verify:install-matrix`
- `_bmad-output/implementation-artifacts/5-3-verify-the-deno-baseline-path-and-installation-documentation-lockstep.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Do not add or update for this story:

- migration matrices or migration docs
- worked-example manifests or example documentation beyond the baseline install smoke snippet
- benchmark artefacts or benchmark workflows
- public runtime exports, redaction semantics, precedence docs, or console adapter behaviour unless Deno verification exposes a package-surface defect
- planning artefacts under `docs/`

### Testing Requirements

- Add red-phase contract coverage before implementing Deno execution. The first failing test should demonstrate that the current verifier ignores `deno-2` and cannot expand `{denoPackageSpecifier}`.
- Use injected executors and fake Deno version output in contract tests. Default contract tests must not require Deno, package downloads, or network access.
- Test the temporary fixture mutation by asserting committed `test/fixtures/compatibility/install/deno-baseline/deno.json` remains tokenised while the copied fixture receives the resolved package specifier.
- Test the loopback registry helper with in-process HTTP and no external dependency. It should serve only the scoped package metadata for `package.json`'s name/version and the tarball route, and should expose request counters or equivalent proof that Deno fetched both.
- Test Deno row environment isolation: `DENO_DIR` points inside the temporary verification area, registry configuration points at the loopback server, the committed fixture and user home are untouched, and cleanup removes both the fixture and Deno cache by default.
- Test generated README/documentation output through `buildGeneratedReadme()` and `verify-generated-files`. A manual README edit that changes an install command or Deno snippet must fail.
- The release-verification path must execute real Deno `2.x`; local proof can cover the active workstation, but the release claim depends on CI.

### Previous Story Intelligence

- Story `5.1` deliberately deferred Deno verification and documentation lockstep here; the Deno fixture and manifest token were shaped specifically for this story. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:39)]
- Story `5.1` established repository-relative paths, shell-free command arrays, committed stdout baselines, and fixture source boundaries. Preserve these contracts when adding executable Deno support. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:32)]
- Story `5.2` resolved important verifier defects: complete active-runtime row coverage, shell interpreter rejection, run-phase stderr failure, Bun package-source fallback, and serial temporary fixture cleanup. Do not regress those behaviours while adding Deno. [Source: [_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md:71)]
- Story `5.2` added hermetic contract tests and release workflow gating for Node rows; Deno should follow the same pattern: fake side effects in contract tests, real execution in the named release verifier. [Source: [_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md:247)]
- Recent commits are source-of-truth and verifier-led: `0b5e604` verified the Node installation flow, `e5bfb9d` defined the canonical install matrix and baseline fixtures, and earlier commits completed console adapter and one-way redaction safeguards.

### Latest Technical Information

- Checked on 22 May 2026 against official Deno documentation and the current repository baseline.
- `deno install --entrypoint` is the documented way to install dependencies referenced by entrypoint files, including `npm:` specifiers. [Source: [Deno install docs](https://docs.deno.com/runtime/reference/cli/install/)]
- Deno supports `deno.json` import maps and can map bare imports to `npm:` specifiers, matching the current fixture's bare `@hackylabs/deep-redact` import. [Source: [Deno configuration docs](https://docs.deno.com/runtime/fundamentals/configuration/)]
- Deno's default npm dependency path uses the global cache and does not require local `node_modules` for ordinary npm package imports; local `node_modules` modes should remain a fallback, not the default implementation. [Source: [Deno Node/npm compatibility docs](https://docs.deno.com/runtime/fundamentals/node/)]
- Deno uses a global `DENO_DIR` cache by default. Isolate this verifier with a temporary cache so repeated local runs cannot pass from stale cached package metadata or tarball contents. [Source: [Deno modules and dependencies docs](https://docs.deno.com/runtime/fundamentals/modules/)]
- Deno supports `.npmrc` private-registry configuration and `NPM_CONFIG_REGISTRY` override, which gives the verifier a path to prove the current packed package before it is published to npm. [Source: [Deno Node/npm compatibility docs](https://docs.deno.com/runtime/fundamentals/node/)]
- `denoland/setup-deno@v2` supports Deno `v2.x` in GitHub Actions and can cache Deno dependencies; use it in release verification rather than installing Deno through npm. [Source: [denoland/setup-deno README](https://github.com/denoland/setup-deno), [Deno CI docs](https://docs.deno.com/runtime/reference/continuous_integration/)]

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:5)]
- Planning documents stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:32)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:38)]

### Open Questions / Assumptions

- Assume `README.md` is the published installation documentation for this story unless the implementation introduces an additional generated installation document. If an additional public document is added, it must still be generated and verified from the matrix and fixture source.
- Assume the verifier should keep one package script, `verify:install-matrix`, and extend it to run Deno rather than adding a separate `verify:deno-install` script.
- Assume a no-dependency loopback npm registry is the preferred pre-publish proof because it lets Deno resolve `npm:@hackylabs/deep-redact@4.0.0` without hitting a stale public registry version.
- Assume the Deno verifier must use a fresh temporary `DENO_DIR` and observable loopback registry requests, because otherwise a prior local or CI cache could satisfy `npm:@hackylabs/deep-redact@4.0.0` without proving the current packed artefact.
- Assume Deno `v2.x` in CI is acceptable for the `deno@2` matrix row; record the actual `deno --version` in verification logs but do not pin the matrix to a patch release unless product requirements change.
- Assume documentation snippets should use exact package version `4.0.0` for the Deno `npm:` specifier to avoid silently proving or documenting an older major version.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1378)
- FR34: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:440)
- Installation verification NFRs: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:479)
- Release verification architecture: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:370)
- Previous story: [_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md:1)
- Canonical matrix: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:1)
- Deno baseline fixture: [test/fixtures/compatibility/install/deno-baseline/smoke.ts](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/deno-baseline/smoke.ts:1)
- Deno import map: [test/fixtures/compatibility/install/deno-baseline/deno.json](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/deno-baseline/deno.json:1)
- Install verifier: [scripts/verify-install-matrix.ts](/Users/ben.green/Code/deep-redact/scripts/verify-install-matrix.ts:1)
- README generator: [scripts/generated-files.ts](/Users/ben.green/Code/deep-redact/scripts/generated-files.ts:54)
- Deno install docs: [https://docs.deno.com/runtime/reference/cli/install/](https://docs.deno.com/runtime/reference/cli/install/)
- Deno configuration docs: [https://docs.deno.com/runtime/fundamentals/configuration/](https://docs.deno.com/runtime/fundamentals/configuration/)
- Deno Node/npm compatibility docs: [https://docs.deno.com/runtime/fundamentals/node/](https://docs.deno.com/runtime/fundamentals/node/)
- Deno modules and dependencies docs: [https://docs.deno.com/runtime/fundamentals/modules/](https://docs.deno.com/runtime/fundamentals/modules/)
- Deno CI docs: [https://docs.deno.com/runtime/reference/continuous_integration/](https://docs.deno.com/runtime/reference/continuous_integration/)
- setup-deno README: [https://github.com/denoland/setup-deno](https://github.com/denoland/setup-deno)
- Project context: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-22: Manual `validate-create-story` review used [.agents/skills/bmad-create-story/checklist.md](/Users/ben.green/Code/deep-redact/.agents/skills/bmad-create-story/checklist.md:1) and checked Story `5.3` against the Epic `5` source acceptance criteria, PRD installation-verification NFRs, release-verification architecture, Story `5.2` verifier behaviour, current matrix/fixture/generator code, and official Deno/setup-deno documentation.
- 2026-05-22: Validation tightened the Deno package-source proof so the verifier must run with a temporary `DENO_DIR` and observable loopback registry metadata/tarball requests; this prevents stale global Deno cache or public-registry resolution from being treated as release proof.
- 2026-05-22: Red-phase focused contracts failed because the verifier did not export Deno selection/package-source helpers, did not plan `deno-2`, did not prepare fixture-local Deno config, README installation text was not generated, and the release workflow did not install Deno.
- 2026-05-22: Local Deno runtime for release verification was `deno 2.0.6`; initial real verifier run reached `deno-2` but failed on a scoped `.npmrc` registry line, so the Deno fixture writer was narrowed to a single fixture-local registry entry plus `NPM_CONFIG_REGISTRY`.
- 2026-05-22: Final validation passed: `pnpm run test:contract` (401 tests), `pnpm run lint`, `pnpm run verify:install-matrix` (`npm-node24`, `pnpm-node24`, `yarn-node24`, `bun-node24`, `deno-2`), and `pnpm run test` (build plus 401 contract tests).
- 2026-05-22: Code review follow-up tied loopback registry assertions to the Deno install phase, isolated Deno npm config to the temporary fixture, and revalidated with `pnpm run lint`, `pnpm run test:contract` (402 tests), and `pnpm run verify:install-matrix`.

### Completion Notes List

- Implemented Deno install-matrix execution inside the existing verifier with Deno 2 version gating, Deno-only `{denoPackageSpecifier}` expansion, fixture-local `deno.json` replacement, isolated `DENO_DIR`, raw stdout comparison, and existing Node/Yarn/Bun behaviour preserved.
- Added a no-dependency loopback npm registry that serves only the current package metadata and packed tarball, records metadata/tarball requests, and fails verification when Deno does not fetch both from the verifier-controlled source.
- Generated README installation and Deno baseline usage from the canonical matrix, package metadata, and Deno fixture source through a new adjacent generator module and the existing generated-files workflow.
- Wired the npm publish verification job to install Deno `v2.x` before the existing single `pnpm run verify:install-matrix` release gate.
- Added hermetic contract coverage for Deno planning/execution, package-source proof, fixture cleanup, generated README lockstep, matrix metadata, and release workflow wiring.
- Scope boundaries held: no public redaction semantics, console adapter behaviour, migration material, worked examples, benchmarks, platform-adoption guidance, persistent registry dependency, or temporary install artefacts were added.
- Code review follow-up resolved both patch findings by checking package-source requests before `deno run` and by setting the Deno row npm user-config path to the fixture-local `.npmrc`.

### File List

- `.github/workflows/npmPublish.yml`
- `README.md`
- `_bmad-output/implementation-artifacts/5-3-verify-the-deno-baseline-path-and-installation-documentation-lockstep.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `scripts/generated-files.ts`
- `scripts/install-documentation.ts`
- `scripts/templates/README.md.template`
- `scripts/verify-install-matrix.ts`
- `test/compatibility/install/matrix.json`
- `test/contract/compatibility/install-matrix-verifier.test.ts`
- `test/contract/compatibility/install-matrix.test.ts`
- `test/contract/generated-readme.test.ts`

### Change Log

- 2026-05-22: Implemented Deno install-matrix verification, verifier-controlled Deno package-source proof, generated README installation lockstep, release workflow Deno setup, and contract coverage; story moved to review.
