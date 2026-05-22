# Story 5.2: Execute Node Package-Manager Installation Verification Across Supported Node Runtimes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want the supported Node package-manager installation rows to execute from the canonical manifest in clean fixtures,
so that the Node-side support claims are release-proven by repeatable automation.

## Acceptance Criteria

1. Given a Node ecosystem row of `npm-node22`, `npm-node24`, `pnpm-node22`, `pnpm-node24`, `yarn-node22`, `yarn-node24`, `bun-node22`, or `bun-node24`, when the full release verification matrix runs across exact Node `22.18.0` and Node `24.14.1` jobs, then that row installs the package in a clean temporary fixture, executes its recorded run command successfully on the declared Node runtime, and stdout matches the row's expected stdout file byte-for-byte.
2. Given any Node ecosystem row in the canonical install matrix manifest fails its install step, run step, exit-status check, or stdout comparison, when release verification runs, then the verification run fails and that ecosystem support claim is not treated as release-proven.
3. Given this story's scope, when the implementation is reviewed, then Deno verification and installation-documentation lockstep remain deferred to Story `5.3`, and migration, worked examples, benchmarks, and platform-adoption guidance remain deferred to later Epic `5` stories.

## Tasks / Subtasks

- [x] Add executable Node install-matrix verification (AC: 1, 2)
  - [x] Create `scripts/verify-install-matrix.ts` as the release-support script named by the architecture; it should consume `test/compatibility/install/matrix.json` rather than duplicating row definitions.
  - [x] Filter the manifest to Node package-manager rows, then select only rows whose exact `runtimeVersion` matches the active `process.version`. A Node `22.18.0` invocation runs the four `*-node22` rows; a Node `24.14.1` invocation runs the four `*-node24` rows. The full release proof comes from both CI jobs, not from one process trying to execute incompatible Node rows.
  - [x] Parse `runtimeVersion` as an exact `node@<version>` value and fail malformed Node rows or supported-runtime invocations with no matching rows. Do not treat rows for a different declared Node version as successfully skipped; those rows must be proven by their matching CI job.
  - [x] Do not execute, mutate, or reinterpret the `deno-2` row in this story.
  - [x] For each selected row, copy the recorded `fixtureDir` to a new temporary directory under the OS temp directory. The verifier must never run package-manager commands in the repository fixture directory.
  - [x] Execute the manifest `installCommand` and `runCommand` as argument arrays with `execFile` or `spawn`, not through a shell.
  - [x] Compare actual stdout with the row's `expectedStdoutFile` as raw UTF-8 text, including the committed trailing LF.
  - [x] Check `expectedExitStatus` exactly for install and run phases. Treat non-zero exits, spawn failures, stderr-only failures, missing commands, and stdout drift as release-verification failures.
  - [x] Clean temporary fixture directories after each row by default; preserve them only behind an explicit debug flag or environment variable such as `DEEP_REDACT_KEEP_INSTALL_FIXTURES=1`.

- [x] Produce and install the packed package artefact (AC: 1, 2)
  - [x] Build the package before verification so the tarball contains current `dist/` output and declaration files.
  - [x] Pack the current package once per verification run into a temporary artefact directory, using the maintained package metadata and the existing `files: ["dist"]` package shape.
  - [x] Resolve `{packageTarball}` to an absolute path to that packed `.tgz`.
  - [x] Resolve `{packageTarballUrl}` to a verifier-proven URL form of the same tarball that works for Bun's manifest row. Try a `file://` URL first; if Bun cannot consume that reliably, serve the exact packed `.tgz` through a temporary loopback HTTP server for Bun rows and close it after verification. Keep any Bun package-source failure explicit rather than silently replacing the manifest row with a different package source.
  - [x] Do not install from the repository root, `src/`, `dist/` by relative path, or the existing symlink-based consumer fixture helper.

- [x] Add npm, pnpm, Yarn, and Bun package-manager handling (AC: 1, 2)
  - [x] Use the command arrays from `matrix.json` after token expansion. Do not hard-code package-manager-specific commands in the runner except for validation and token expansion.
  - [x] Ensure the verifier can run npm and the package-manager binary recorded by the row from the active Node runtime environment.
  - [x] Prepare pnpm and Yarn through Corepack or an equivalent explicit toolchain setup before their rows run; fail with a clear message if the required binary is unavailable.
  - [x] Require Bun to be available for Bun rows and fail clearly if it is missing. Do not mark Bun support proven by skipping the rows.
  - [x] Provision CI explicitly for the package managers being proven: enable Corepack for pnpm and Yarn, and install or set up Bun before Bun rows execute.
  - [x] Keep package-manager generated files inside the copied temporary fixture. Do not commit or update `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `.pnp.*`, or package-manager metadata from temporary runs.

- [x] Wire release verification into project commands and CI/release gates (AC: 1, 2)
  - [x] Add a package script such as `verify:install-matrix` that runs the build and then executes `node --experimental-strip-types ./scripts/verify-install-matrix.ts` under the active Node runtime. Do not add `tsx`, `ts-node`, or another script runner. Do not bake `.agents/initialise-env.sh` into the package script; local agent commands source it before invoking package scripts, while CI must use the Node version provisioned for that job.
  - [x] Add or update a GitHub Actions workflow so the Node install matrix is executed under exact Node versions `22.18.0` and `24.14.1`, with the row selection tied to the active Node runtime configured by the workflow.
  - [x] Ensure the release/publish path cannot publish after a failing Node install-matrix verification. Use a separate matrix verification job for Node `22.18.0` and Node `24.14.1`, then a single publish job that depends on that verifier. Do not put `pnpm publish` inside a Node-version matrix. The existing npm publish workflow currently tests only Node `24.14.1`, so Story `5.2` must add the Node `22.18.0` proof before the support claim is release-proven.
  - [x] Preserve normal `pnpm run lint`, `pnpm run test`, and generated-artefact gates. Do not replace contract tests with the install verifier.

- [x] Add automated tests around the verifier without executing package managers in ordinary unit/contract runs (AC: 1, 2)
  - [x] Add contract-level coverage for verifier row selection, token expansion, runtime-version matching, path confinement, command-array execution planning, stdout comparison, and failure reporting.
  - [x] Use injected executors or dry-run planning helpers for those tests so `pnpm run test:contract` does not actually invoke npm, pnpm, Yarn, Bun, or network-dependent installs.
  - [x] Assert the verifier refuses shell strings, absolute fixture paths outside allowed roots, `..` path escapes, unsupported command tokens, and attempts to execute `deno-2` during Story `5.2`.
  - [x] Assert failure output identifies the row id and phase (`install`, `run`, `exit-status`, or `stdout`) without dumping sensitive payload data.

- [x] Maintain scope boundaries (AC: 3)
  - [x] Leave `test/fixtures/compatibility/install/deno-baseline/`, `deno.json`, and `deno-2` execution for Story `5.3`.
  - [x] Do not add installation documentation, generated README install claims, migration matrices, worked examples, benchmark artefacts, or platform adoption guidance in this story.
  - [x] Do not change public exports, runtime redaction semantics, console adapter behaviour, or migration fixtures unless the install verifier exposes a real package-surface defect.

- [x] Verify the story implementation (AC: 1-3)
  - [x] Run `source .agents/initialise-env.sh && pnpm run test:contract`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run lint`.
  - [x] Run `source .agents/initialise-env.sh && pnpm run verify:install-matrix` or the final equivalent package script.
  - [x] Run `source .agents/initialise-env.sh && pnpm run test` if package scripts, build output, export maps, generated files, TypeScript config, or workflow-critical package metadata changed.
  - [x] Record any unavailable local package-manager binary separately from CI results; the release claim is not proven unless CI executes all eight Node rows.

### Review Findings

- [x] [Review][Patch] Stderr-only row failures are accepted as passing [scripts/verify-install-matrix.ts:323]
- [x] [Review][Patch] Node runtime row selection can pass after partially skipping required rows [scripts/verify-install-matrix.ts:160]
- [x] [Review][Patch] Shell interpreter command arrays are not rejected [scripts/verify-install-matrix.ts:203]
- [x] [Review][Patch] Bun tarball URL handling skips the required `file://` proof [scripts/verify-install-matrix.ts:617]
- [x] [Review][Patch] Temporary fixture directories can leak after an early row failure [scripts/verify-install-matrix.ts:597]

## Dev Notes

### Story Intent

- Story `5.1` created the source of truth. Story `5.2` must turn the eight Node rows into executable release evidence without changing the matrix into an implementation-specific script.
- The implementation must prove consumer installation from a packed package artefact, not from the repository symlink pattern used by existing package-surface contract tests.
- The verifier should be deterministic and hostile to false positives: a skipped command, wrong Node runtime, missing package-manager binary, stdout mismatch, or non-zero exit must fail the run.
- The verifier should be useful locally but authoritative in CI/release verification, where exact Node `22.18.0` and `24.14.1` jobs prove their matching declared-runtime rows and together cover all eight Node package-manager rows.

### Current Repository Intelligence

- The canonical installation manifest already exists at `test/compatibility/install/matrix.json` with `schemaVersion: 1`, command-token metadata, eight Node rows, and one deferred Deno row. [Source: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:1)]
- The Node row runtime versions are exact: `node@22.18.0` for the engine-floor rows and `node@24.14.1` for the contributor-baseline rows. [Source: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:22)]
- The manifest's Node install commands are already tokenised: npm and pnpm use `{packageTarball}`, Yarn uses `@hackylabs/deep-redact@file:{packageTarball}`, and Bun uses `@hackylabs/deep-redact@{packageTarballUrl}`. [Source: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:23)]
- The shared Node baseline fixture imports only `deepRedact` from `@hackylabs/deep-redact`, redacts the canonical payload, and writes stable JSON through `console.log`, so the expected stdout includes one trailing LF. [Source: [test/fixtures/compatibility/install/node-baseline/smoke.mjs](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/node-baseline/smoke.mjs:1)]
- The committed expected stdout baseline is `{"user":{"password":"[REDACTED]"},"token":"[REDACTED]","ok":true}\n`. Compare it byte-for-byte; do not parse and reserialise for equality. [Source: [test/artefacts/install-matrix/expected/baseline-structured.stdout](/Users/ben.green/Code/deep-redact/test/artefacts/install-matrix/expected/baseline-structured.stdout:1)]
- `package.json` declares package name `@hackylabs/deep-redact`, version `4.0.0`, ESM package type, public root and console-adapter exports, engine floor `>=22.18.0`, and `files: ["dist"]`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)]
- `pnpm run build` first verifies generated files and then runs `tsdown`; `pnpm run test` runs the build and contract suite. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:64)]
- The existing publish workflow runs only Node `24.14.1`; it does not yet prove Node `22.18.0` installation support. [Source: [.github/workflows/npmPublish.yml](/Users/ben.green/Code/deep-redact/.github/workflows/npmPublish.yml:13)]
- Existing consumer fixture tests use a repository symlink into `node_modules`; reuse their cleanup and process patterns only, not their package-source approach. [Source: [test/contract/support/package-fixture.ts](/Users/ben.green/Code/deep-redact/test/contract/support/package-fixture.ts:14)]

### Architecture Compliance

- Release verification must cover Node `22` and `24`, install smoke tests across `npm`, `pnpm`, `yarn`, and `bun`, plus Deno `2.x` in the later Deno story. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:370)]
- Scripts belong under `scripts/`, tests under `test/`, fixtures under `test/fixtures/`, and committed verification baselines under `test/artefacts/`; generated or transient verification output must not become source data. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:475)]
- The architecture names `scripts/verify-install-matrix.ts` and `test/compatibility/` as the intended release-verification homes. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:879)]
- Package-manager and runtime verification belongs to release scripts and CI, not the core redaction runtime. Keep `src/core/`, `src/adapters/`, and migration fixtures untouched unless a package-surface bug is discovered. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:938)]
- CI should produce validated package artefacts for release and release workflows should verify compatibility matrix, generated artefacts, migration fixtures, benchmarks, and security gates before publish. This story covers the Node install-matrix part only. [Source: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:990)]

### Library and Framework Requirements

- Use the live pinned contributor baseline: Node `24.14.1`, `pnpm@10.33.0`, TypeScript `6.0.2`, Vitest `4.1.4`, `tsdown@0.21.7`, and ESLint `9.39.4`. [Source: [package.json](/Users/ben.green/Code/deep-redact/package.json:10)]
- Every Node, package-manager, build, lint, test, generation, benchmark, or release command must be run from the repository root with `source .agents/initialise-env.sh && ...`; bootstrap failure is a blocker. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:18)]
- TypeScript can include scripts and contract tests through the current `tsconfig.json`; `scripts/**/*.ts` and `test/contract/**/*.ts` are already in scope. [Source: [tsconfig.json](/Users/ben.green/Code/deep-redact/tsconfig.json:18)]
- The default Vitest contract command includes `test/build.test.ts` and `test/contract/**/*.test.ts`; verifier tests that must run in the default gate belong under `test/contract/`. [Source: [vitest.config.ts](/Users/ben.green/Code/deep-redact/vitest.config.ts:5)]
- ESLint uses single quotes and no semicolons. Keep verifier helpers dependency-free; do not add a runtime dependency just to parse JSON, compare stdout, or copy fixtures. [Source: [eslint.config.mjs](/Users/ben.green/Code/deep-redact/eslint.config.mjs:28)]

### Implementation Guardrails

- Prefer a small typed runner with injectable low-level operations:
  - `loadInstallMatrix()`
  - `selectNodeRows(matrix, activeNodeVersion)`
  - `packCurrentPackage({ repositoryRoot, temporaryRoot })`
  - `expandCommandTokens(command, tokenValues)`
  - `runRow(row, context)`
  - `compareStdout(row, actualStdout)`
- Use `node:child_process` with `execFile`/`spawn`, `node:fs`/`node:fs/promises` for fixture copies and cleanup, `node:os` for temporary directories, `node:path`/`node:url` for absolute paths and file URLs.
- Pass `cwd` as the copied temporary fixture directory for row install and run commands. Pass a controlled environment that preserves `PATH` but does not rely on repository-local `node_modules/.bin` inside the clean consumer fixture.
- Bound process output capture to a reasonable size so a broken package-manager command cannot flood memory. Include row id, command phase, exit code, and trimmed stderr in errors; do not include full fixture contents.
- Use serial execution unless there is a strong reason to parallelise. Package-manager cache and global toolchain side effects are easier to reason about one row at a time.
- If package-manager setup is needed, keep it outside the temporary consumer fixture or in an explicit verifier preparation step. Do not add `packageManager` to the consumer fixture package unless required by the package manager being tested; the fixture should stay product-like and minimal.
- Implement Bun tarball URL handling as a package-source proof, not as a shortcut around the manifest: prefer `file://` for `{packageTarballUrl}` if Bun accepts it; otherwise start a temporary loopback HTTP server that serves only the packed `.tgz`, use that URL for Bun rows, and shut the server down after the run.
- Do not make the verifier force Node `24.14.1`. The repository bootstrap is required for local agent commands, but the release verifier itself must honour the active `process.version` so Node `22.18.0` CI jobs can execute the Node `22` rows.
- Do not update `matrix.json` merely to make verification easier. If a manifest command is wrong, update it with a contract test explaining why and preserve Story `5.1`'s single-source-of-truth contract.

### File Structure Requirements

Likely files to add or update:

- `scripts/verify-install-matrix.ts`
- `test/contract/compatibility/install-matrix-verifier.test.ts`
- `package.json`
- `.github/workflows/npmPublish.yml` or a dedicated release/CI workflow under `.github/workflows/`
- `_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Do not add or update for this story:

- `docs/` installation guidance
- `README.md` or `scripts/templates/README.md.template`
- Deno fixture execution scripts
- migration fixtures or migration docs
- benchmark artefacts or benchmark workflows
- public runtime exports or adapter entrypoints

### Testing Requirements

- Add a red-phase test first for the verifier script or its exported planning helpers. At minimum, prove that an absent verifier command currently leaves Node package-manager rows unexecuted.
- Keep ordinary contract tests hermetic. They should validate runner planning and failure handling with fake executors, not install real packages.
- Add one release-verification path that actually packs and installs the package for all eight Node rows across the two exact Node CI jobs. This path may be slower and network/toolchain dependent, so it should be a named package script and CI/release gate rather than an unlabelled unit test.
- The implementation is incomplete unless CI/release configuration proves both exact Node runtimes through a matrix verification job. Running only from the contributor baseline Node `24.14.1` does not satisfy `npm-node22`, `pnpm-node22`, `yarn-node22`, or `bun-node22`; publishing from every matrix leg would publish more than once and is also incorrect.
- Verification commands to record in the Dev Agent Record:
  - `source .agents/initialise-env.sh && pnpm run test:contract`
  - `source .agents/initialise-env.sh && pnpm run lint`
  - `source .agents/initialise-env.sh && pnpm run verify:install-matrix` for local Node `24.14.1` proof, plus CI proof for Node `22.18.0` and Node `24.14.1`
  - `source .agents/initialise-env.sh && pnpm run test` if package scripts, generated files, or shared build/test configuration changed

### Previous Story Intelligence

- Story `5.1` deliberately deferred executable Node package-manager verification to this story; do not leave the verifier static-only. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:19)]
- Story `5.1` established that `matrix.json` is committed JSON, command arrays are shell-free, and token expansion belongs to verifier code. Preserve those decisions rather than recreating row-specific commands in scripts. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:26)]
- Story `5.1` used static contract tests to prevent documentation and release-scope drift. Continue that pattern with hermetic tests for the verifier's planning and failure behaviour. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:57)]
- Story `5.1` recorded that Deno verification, installation documentation, migration, examples, benchmarks, and platform-adoption guidance are out of scope here. [Source: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:67)]
- Recent commits are source-of-truth and contract-test led: `e5bfb9d` added the install manifest and baseline fixtures, `75afb1b` added the optional console adapter, and `83a1c02` enforced the one-way deny list.

### Latest Technical Information

- Checked on 22 May 2026 against the live repository baseline and current official docs.
- `pnpm pack` creates a tarball from the package and supports `--pack-destination <dir>` plus JSON output; use it to create the verifier package artefact without committing tarballs. [Source: [pnpm pack docs](https://pnpm.io/cli/pack)]
- npm documents installation from local tarball files and tarball URLs, and tarball packages must contain a `package.json` with `name` and `version`; this supports `{packageTarball}` for npm rows. [Source: [npm install docs](https://docs.npmjs.com/cli-documentation/install/)]
- pnpm documents local filesystem installation from `.tar`, `.tar.gz`, or `.tgz` files with commands such as `pnpm add ./package.tar.gz`; this supports `{packageTarball}` for pnpm rows. [Source: [pnpm package sources](https://pnpm.io/package-sources)]
- Yarn documents adding a local gzipped tarball through the `file:` protocol, matching the current manifest's `@hackylabs/deep-redact@file:{packageTarball}` form. [Source: [Yarn add docs](https://yarnpkg.com/cli/add)]
- Bun documents tarball dependencies through a package specifier pointing at a publicly hosted `.tgz` URL; the current `{packageTarballUrl}` token must therefore be resolved and proven by the verifier rather than assumed equivalent to a filesystem path. [Source: [Bun add docs](https://bun.com/docs/pm/cli/add)]
- `actions/setup-node` supports matrix testing and exact version inputs such as `22` or more specific versions; use exact `22.18.0` and `24.14.1` values for this story rather than floating majors. [Source: [actions/setup-node README](https://github.com/actions/setup-node)]
- Node's latest documentation states Corepack is no longer distributed starting with Node `25`; do not add Node `25` rows or rely on Node `25` behaviour. This story targets Node `22.18.0` and `24.14.1` only. [Source: [Node Corepack docs](https://nodejs.org/download/release/latest/docs/api/corepack.html)]

### Project Context Reference

- All code, comments, tests, docs, commit messages, and story updates must use British English unless quoting identifiers or third-party APIs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:5)]
- Planning artefacts stay under `_bmad-output/planning-artifacts/`; this implementation story belongs under `_bmad-output/implementation-artifacts/`. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:32)]
- Outside `_bmad/`, `_bmad-output/`, and `.agents/`, avoid BMAD planning terminology in source, tests, scripts, and public docs. [Source: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:38)]

### Open Questions / Assumptions

- Assume the verifier should run rows matching the active Node runtime, with CI providing exact Node `22.18.0` and `24.14.1` jobs. This is safer than trying to download or shell into alternate Node runtimes inside one script.
- Assume `pnpm pack --pack-destination <temp-dir>` is the package artefact source because the repository is pnpm-pinned and package metadata already defines publish contents.
- Assume Bun rows are release-blocking. If Bun cannot consume a verifier-produced local tarball URL, fail the row and update the manifest or verifier token semantics explicitly rather than skipping Bun.
- Assume the publish workflow should verify in a Node-version matrix and publish once after the matrix succeeds.
- Assume package-manager downloads are acceptable in the named release-verification command and CI job, but not in default hermetic contract tests.
- Assume GitHub Actions is the release-verification host because the existing publish workflow already lives under `.github/workflows/`.

### References

- Story definition: [_bmad-output/planning-artifacts/epics.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/epics.md:1349)
- Installation methods PRD: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:292)
- FR34: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:440)
- NFR installation verification: [_bmad-output/planning-artifacts/prd.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/prd.md:479)
- Release verification architecture: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:370)
- Compatibility structure: [_bmad-output/planning-artifacts/architecture.md](/Users/ben.green/Code/deep-redact/_bmad-output/planning-artifacts/architecture.md:734)
- Previous story: [_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md](/Users/ben.green/Code/deep-redact/_bmad-output/implementation-artifacts/5-1-define-the-canonical-installation-verification-matrix-and-baseline-fixtures.md:1)
- Canonical matrix: [test/compatibility/install/matrix.json](/Users/ben.green/Code/deep-redact/test/compatibility/install/matrix.json:1)
- Node baseline fixture: [test/fixtures/compatibility/install/node-baseline/smoke.mjs](/Users/ben.green/Code/deep-redact/test/fixtures/compatibility/install/node-baseline/smoke.mjs:1)
- Expected stdout baseline: [test/artefacts/install-matrix/expected/baseline-structured.stdout](/Users/ben.green/Code/deep-redact/test/artefacts/install-matrix/expected/baseline-structured.stdout:1)
- Package metadata: [package.json](/Users/ben.green/Code/deep-redact/package.json:1)
- Existing publish workflow: [.github/workflows/npmPublish.yml](/Users/ben.green/Code/deep-redact/.github/workflows/npmPublish.yml:1)
- npm install docs: [https://docs.npmjs.com/cli-documentation/install/](https://docs.npmjs.com/cli-documentation/install/)
- pnpm pack docs: [https://pnpm.io/cli/pack](https://pnpm.io/cli/pack)
- pnpm package sources: [https://pnpm.io/package-sources](https://pnpm.io/package-sources)
- Yarn add docs: [https://yarnpkg.com/cli/add](https://yarnpkg.com/cli/add)
- Bun add docs: [https://bun.com/docs/pm/cli/add](https://bun.com/docs/pm/cli/add)
- actions/setup-node README: [https://github.com/actions/setup-node](https://github.com/actions/setup-node)
- Node Corepack docs: [https://nodejs.org/download/release/latest/docs/api/corepack.html](https://nodejs.org/download/release/latest/docs/api/corepack.html)
- Project context: [project-context.md](/Users/ben.green/Code/deep-redact/project-context.md:1)

## Story Completion Status

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-22: Red phase `source .agents/initialise-env.sh && pnpm run test:contract` failed because `scripts/verify-install-matrix.ts` did not exist.
- 2026-05-22: Initial local `verify:install-matrix` hit sandbox loopback binding restrictions; reran with approval for the Bun tarball server.
- 2026-05-22: Yarn 4 installed with Plug'n'Play by default, so `node smoke.mjs` could not resolve the package. Added fixture-local `YARN_NODE_LINKER=node-modules` for Yarn rows and covered it with a contract test.
- 2026-05-22: Final local verification passed for active Node `24.14.1` rows: `npm-node24`, `pnpm-node24`, `yarn-node24`, and `bun-node24`.
- 2026-05-22: Code review follow-up added regression coverage for partial Node-row drift, shell interpreter arrays, run-phase stderr-only failures, Bun `file://` URL fallback, and serial temporary fixture cleanup.
- 2026-05-22: Review follow-up verification passed `test:contract`, `lint`, `verify:install-matrix`, and `test` under active Node `24.14.1`.

### Completion Notes List

- Implemented `scripts/verify-install-matrix.ts` to load the canonical manifest, select rows by exact active Node runtime, reject unsafe paths and shell strings, expand package tarball tokens, copy clean fixtures, execute install/run arrays, compare stdout byte-for-byte, and clean temporary fixtures by default.
- Added package packing through `pnpm pack`, absolute tarball token resolution, and loopback HTTP tarball serving for Bun rows.
- Added Corepack preparation and package-manager availability checks for npm, pnpm, Yarn, and Bun; Yarn rows use `node-modules` linking so the manifest's plain `node smoke.mjs` command remains valid.
- Added hermetic contract tests for row selection, malformed runtime handling, token expansion, path confinement, Deno exclusion, command execution planning, stdout comparison, failure reporting, Yarn linker behaviour, package script wiring, and publish workflow gating.
- Updated npm publish workflow to run a Node `22.18.0` / `24.14.1` install-matrix job before a single publish job. Node `22.18.0` proof is configured for CI and was not locally executed in this Node `24.14.1` workspace.
- Resolved review findings by requiring all four package managers per active Node runtime, rejecting shell interpreter command arrays, failing run-phase stderr-only smoke failures, trying Bun `file://` tarball URLs before HTTP fallback, and allocating temporary fixtures serially.
- Deno verification, installation documentation, migration guidance, examples, benchmarks, and platform-adoption guidance remain deferred.

### File List

- `.github/workflows/npmPublish.yml`
- `_bmad-output/implementation-artifacts/5-2-execute-node-package-manager-installation-verification-across-supported-node-runtimes.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `scripts/verify-install-matrix.ts`
- `test/contract/compatibility/install-matrix-verifier.test.ts`

### Change Log

- 2026-05-22: Created ready-for-dev story context for Node package-manager installation verification.
- 2026-05-22: Tightened implementation guidance for active-runtime row selection, Bun tarball URL handling, package-manager setup, and single-publish CI gating.
- 2026-05-22: Implemented executable Node install-matrix verifier, package script, CI publish gate, and hermetic verifier contract coverage.
- 2026-05-22: Verified local Node `24.14.1` install rows and moved story to review.
- 2026-05-22: Applied code review fixes, re-verified local Node `24.14.1` install rows, and moved story to done.
