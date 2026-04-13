---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/product-brief-deep-redact.md"
  - "_bmad-output/planning-artifacts/product-brief-deep-redact-distillate.md"
  - "README.md"
workflowType: "architecture"
lastStep: 8
status: "complete"
project_name: "deep-redact"
user_name: "Ben"
date: "2026-04-07T15:18:29Z"
completedAt: "2026-04-08T12:11:47Z"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Deep Redact v4 has 38 functional requirements across eight requirement groups. Configuration and policy-definition requirements cover singleton service-root setup, early configuration validation, replacement behaviour, fuzzy and case-insensitive matching, and typed API discoverability. Targeting requirements cover deep key matching, regex-based object property matching, explicit object paths, wildcard and ignore path segments, partial-string redaction, and root-primitive redaction across nested mixed payloads. Output requirements require deterministic one-way behaviour, preservation of non-targeted values, and clear precedence rules when matching strategies overlap.

The remaining functional scope extends beyond the core engine. Runtime resilience requirements require safe handling of circular references, transformed values, ignored value types, and localised `[UNSUPPORTED]` replacement when a nested value cannot be processed cleanly. Migration and ecosystem requirements cover compatibility-minded migration from `fast-redact` and Deep Redact v3, plus broad example coverage. Distribution requirements add JavaScript and TypeScript support across `npm`, `pnpm`, `yarn`, `bun`, and `deno`. Console support and trust requirements add optional `console.*` redaction, benchmark artefacts, and platform-review guidance.

Architecturally, this implies a compact but non-trivial set of responsibilities: policy definition, rule compilation, target matching, traversal and redaction, replacement and output shaping, diagnostics, migration clarity, and release verification.

**Non-Functional Requirements:**
The architecture is strongly shaped by non-functional constraints. Performance is release-critical: comparable path-based workloads must land within roughly 25 to 50 per cent overhead versus `fast-redact`, backed by published benchmark artefacts. Security requirements are equally strong: one-way redaction only, no restore capability, no leaking diagnostic placeholders, and explicit documentation of precedence rules for overlapping targeting modes. Reliability requirements demand that supported inputs do not throw after successful initialisation and that failures are isolated to the problematic nested value rather than collapsing the entire payload.

Compatibility and operational trust are also first-class concerns. Installation and baseline usage must be verified across multiple package ecosystems and Deno, and release documentation must align with that verified matrix. Optional console redaction must not create recursive logging loops. Diagnostic logging must preserve operational usefulness without exposing sensitive source data. These requirements mean that the architecture must support correctness, safety, and verification as part of the product surface, not as follow-up documentation work.

**Scale & Complexity:**
The PRD classifies the product as medium complexity, and that is consistent with the scope. This is a single-library product rather than a distributed platform, with no real-time collaboration, multi-tenancy, or UI-heavy interaction model. However, it operates on security-sensitive hot paths and must support a wide behavioural contract over arbitrary, deeply nested, mixed-type, and potentially hostile payloads.

- Primary domain: backend developer tooling / Node.js and TypeScript redaction library
- Complexity level: medium
- Estimated architectural components: 8

The scale drivers are concentrated rather than broad. Integration complexity is moderate because the product must support `fast-redact` migration, v3 migration, multiple package ecosystems, and optional console integration. Data complexity is high because payload shapes are unpredictable and may include circular references, transformed runtime values, and failure-prone nested inputs. User interaction complexity is low because the product is library-first, not UI-first. Compliance burden is informal rather than regulatory, but the security posture still has to be conservative.

### Technical Constraints & Dependencies

Deep Redact v4 is a brownfield major-version reset from a class-based API. The architecture must preserve differentiated Deep Redact capabilities while making common `fast-redact`-style adoption practical. The supported language surface is explicitly JavaScript and TypeScript, with strong typing and editor guidance treated as part of the product. Installation and baseline usage must be verified across `npm`, `pnpm`, `yarn`, `bun`, and `deno`, and release documentation must declare an explicit Node.js support matrix before ship.

The PRD also sets strong negative constraints. v4 must not introduce reversible redaction or restore behaviour. It must not expand into AI or ML-based PII discovery, remote policy management, or broader platform work. It must not dilute Deep Redact's differentiated capabilities merely to mimic `fast-redact`. Those constraints narrow the architecture toward a focused, one-way redaction engine with strong migration and verification support.

### Cross-Cutting Concerns Identified

The dominant cross-cutting concern is trust: deterministic one-way behaviour, clear rule precedence, and non-leaking failure handling all affect multiple architectural areas. Performance recovery is another cross-cutting concern because it influences policy compilation, traversal strategy, replacement handling, diagnostics, and benchmark governance. Traversal bounds and memory-exhaustion protection affect both runtime safety and API semantics.

Migration clarity is also cross-cutting. The architecture has to support a configuration model and documentation strategy that make `fast-redact` and v3 adoption understandable without weakening the security contract. TypeScript ergonomics, code examples, and release verification are not peripheral documentation concerns here; they are part of the product's adoption surface and therefore part of the architectural context.

## Starter Template Evaluation

### Primary Technology Domain

Backend library / TypeScript package based on the project requirements analysis and the updated technical preferences. This is explicitly a brownfield repository with a greenfield-style v4 source rewrite, with existing tests retained as a red-phase safety harness.

### Starter Options Considered

`create-tsdown` is the strongest starter option given the updated preferences. The official `tsdown` documentation provides a library-oriented starter flow via `create-tsdown`, and its `minimal` template is the closest match for a focused runtime package. It aligns with the desired move to Node 24, supports a modern TypeScript-first library workflow, and reduces the amount of bespoke build setup that would otherwise need to be recreated by hand. The main caveat is that `tsdown` is still officially labelled beta software, so adopting it means accepting some build-tool churn risk during v4 development.

`unbuild` remains a credible lower-risk alternative. Its official documentation emphasises package-oriented builds, CommonJS and ESM output, declaration generation, and package-metadata-driven distribution. It is a good fit for incremental brownfield migration, but it is less compelling once the preferred delivery model becomes a near-clean rewrite rather than a conservative evolution of the current build chain.

`tsup` was considered for familiarity, but its official repository now states that it is not actively maintained and recommends `tsdown` instead. It should not be selected as the v4 baseline.

### Selected Starter: `create-tsdown` `minimal`

**Rationale for Selection:**
The project is now explicitly open to a source-level reset for v4 while keeping existing tests as the red phase. That makes a true library scaffold more valuable than a package-build utility alone. `create-tsdown` with the `minimal` template gives a cleaner baseline for a rewrite on Node 24 while preserving the existing desire for TypeScript, Vitest, generated exports, a generated README workflow, and `pnpm` as the internal package manager.

This selection does not mean the current repository should be overwritten in place. The starter should be generated in a temporary or sibling directory, then selectively merged into the v4 branch. That preserves the current tests, benchmark artefacts, and documentation history while still giving the implementation a clean starting frame.

**Initialization Command:**

```bash
pnpm create tsdown@latest deep-redact-v4 --template minimal
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript-first library foundation on a Node 24 development baseline.

**Styling Solution:**
None. This is appropriate because Deep Redact is a runtime library with no UI surface.

**Build Tooling:**
`tsdown` provides modern library bundling and declaration generation with a simpler baseline than the current dual-tsconfig build flow.

**Testing Framework:**
The project should continue with `Vitest`, which is compatible with the selected Node baseline and remains appropriate for the existing unit, build, load, and benchmark-oriented test shape.

**Code Organisation:**
A cleaner single-purpose library layout suited to rebuilding `src/` from first principles while preserving the current tests as external red-phase constraints.

**Development Experience:**
A modern scaffold with less bespoke build plumbing than the current repository, while still allowing project-specific scripts for generated exports and a generated README.

**Linting & Formatting:**
Use `xo` as the v4 linting baseline instead of Airbnb. This keeps ESLint under the hood while replacing the current large inherited Airbnb rule surface with a smaller, opinionated, project-level standard that is easier to maintain. Because `xo` requires the project to be ESM, the repository should use ESM package metadata even if the build continues to emit both ESM and CommonJS outputs for consumers. Any Deep Redact-specific lint rules should be added as small targeted overrides rather than rebuilding the previous Airbnb-derived config.

**Package Management:**
Use `pnpm` internally as the project package manager baseline.

**Project-Specific Extensions Required:**
The starter does not remove the need for Deep Redact-specific automation. The v4 foundation should add:
- a generated exports workflow
- a generated README workflow
- retention of benchmark and release-verification scripts
- preservation of the existing tests as the initial red phase

**Note:** Project initialisation should happen in a scratch directory first. The first implementation story should be to establish the v4 foundation and selectively merge it into the existing repository without deleting the current test suite.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Public API contract: v4 replaces the class API with a function-first factory. The primary API should be `deepRedact(options)` returning a callable redactor, with an optional named alias such as `createRedactor(options)` for TypeScript ergonomics. The public configuration surface should preserve `fast-redact` familiarity where it fits, using `paths`, `censor`, `remove`, and `serialise` as public option names. `serialise` defaults to structured output when omitted. Path entries may be plain selectors or path-rule objects with per-path overrides. `strict` is not supported. No restore capability is exposed. Invalid combinations such as `remove + censor` and `remove + retainStructure` must fail initialisation at both global and per-path levels.
- Policy compilation model: configuration is compiled once at initialisation into an immutable internal rule plan that separates exact string path rules, structured path rules, deep key rules, substring rules, transformer rules, diagnostics configuration, and output-shaping rules. Global options are compiled as defaults once at initialisation, and per-rule options are merged over those defaults for the matched rule only, with any remaining unset values falling back to library defaults.
- Runtime execution model: redaction uses a benchmark-led hybrid engine with no user-visible mutation mode. Exact static absolute string-path rules run through a compiled fast lane first. Structured selectors, matcher objects, recursive wildcards, ignore segments, and remaining dynamic cases fall back to a generic iterative traversal engine. The fast lane is an optimisation only and must not change observable behaviour. Both paths must produce the same observable behaviour for matching, censoring, diagnostics, precedence, and `[UNSUPPORTED]` output. Object-identity tracking is scoped to a single call to `redact` and must distinguish between in-progress traversal and completed traversal. Re-encountering an in-progress identity during the same call follows the circular-reference handling path. Re-encountering a fully traversed object or array during the same call must not trigger a second descent; the runtime should reuse the already resolved transformed result where safe, or otherwise deterministically skip re-entry. A sanitised warning may be emitted optionally, but repeated completed identities are otherwise treated as benign. Each subsequent call to `redact` resets traversal state while retaining the already initialised and compiled configuration in memory.
- Security, resilience, and diagnostics contract: after successful initialisation, supported inputs must not throw during redaction. If a specific nested value cannot be processed safely, only that value or subtree degrades to `[UNSUPPORTED]`, while the rest of the payload continues through normal redaction processing. Internal diagnostic logging must record sanitised metadata only, such as value type, object path, and error details, and must never include sensitive source values or redacted originals. In Node contexts, the default internal diagnostics transport may use `console.error`, but it must bypass any optional console-redaction hook and include a re-entrancy guard so Deep Redact's own diagnostics can never recursively redact themselves.
- Security hardening and hostile-input contract: Deep Redact v4 must prevent and explicitly test for all applicable malicious-input attack classes relevant to its runtime and parsing model. This includes, at minimum, memory-exhaustion attacks, excessive-traversal attacks, selector-complexity abuse, and regular-expression denial of service (ReDoS) in any regex-driven path, key, or substring matching behaviour. The architecture must define explicit safety controls such as bounded parser complexity, traversal budgets, maximum depth, maximum visited-node or edge budgets, and safe regex handling rules. Where limits are exceeded, failure must be deterministic, localised, non-leaking, and must not destabilise the host process.
- Deterministic security contract: output must be deterministic for the same input and configuration regardless of internal execution path, including exact-path fast-lane handling, dynamic path syntax, wildcard resolution, regex-based matching, transformer selection, or graceful-degradation mechanics. No internal optimisation may alter observable redaction behaviour, precedence, placeholder semantics, diagnostics boundaries, or leakage risk.
- Transformer contract: v4 includes a built-in default transformer set for circular references, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`, and allows users to register custom transformers by value type, constructor, or fallback category. Transformer resolution order must be deterministic and documented. Built-in and custom transformers must share the same failure semantics, and any transformer failure must participate in the same per-path graceful-degradation contract as the rest of the runtime.
- Toolchain and runtime split: contributors develop on Node `24.14.1` with `pnpm`, `tsdown`, `Vitest`, and `xo`, while the published library should target Node `22.18+`, Node `24.x`, Deno `>= 2.x`, and a browser-safe core where practical.

**Important Decisions (Shape Architecture):**
- The core package remains zero-runtime-dependency to preserve portability, supply-chain simplicity, and current product positioning.
- Generated `exports` and generated `README` remain deterministic artefacts enforced in CI.
- Existing v3 tests are retained as the initial red-phase contract suite, with new v4-focused unit and contract tests added alongside them.
- `fast-redact` parity is surface-level and deliberate rather than exact. Common `paths`, `censor`, and `remove` cases should migrate mechanically, while divergences such as the `serialise` option name and structured-output default, lack of `strict`, lack of restore behaviour, structured selectors, and per-path rule objects must be codemodded and documented explicitly.
- Migration tooling is elevated from a nice-to-have to an important release-track concern. A codemod or migration-assist tool should be planned for `fast-redact` and Deep Redact v3 adoption, even if it is not a hard implementation blocker.
- Migration tooling must be validated against a golden corpus covering representative `fast-redact` and v3 examples, with intentional divergences explicitly documented.
- Release documentation must include separate migration tracks for `fast-redact` and Deep Redact v3, plus worked examples covering the final supported API surface.
- Optional platform-specific features, especially console integration, live in secondary adapter entry points instead of the core runtime.

**Deferred Decisions (Post-MVP):**
- Additional convenience adapters beyond console integration.
- Extra migration ergonomics beyond guides and codemods, such as temporary shims or warnings.
- Broader docs-site work beyond the generated README, migration guides, and required examples.

### Data Architecture

This project has no database, migrations, or external cache. Its "data architecture" is the internal representation of redaction policy and runtime state.

- Configuration is normalised at initialisation into an immutable rule plan covering exact string-path tables, structured selector matchers, key matcher tables, substring-test pipelines, transformer registries, diagnostics configuration, and output adapters.
- Validation occurs in two phases: structural schema validation first, then semantic validation for path grammar, unsupported combinations, precedence conflicts, ambiguous rules, and unsafe or unsupported selector constructs.
- Runtime state is per invocation only and includes the current path stack, object-identity tracking split between active and completed identities, diagnostic context, and traversal-budget counters. Each call starts with fresh traversal state while reusing the compiled rule plan from initialisation.
- Unsupported or downgraded configuration elements should be surfaced in structured initialisation diagnostics rather than being silently ignored.
- Caching is instance-scoped precompilation only. The system caches compiled rules, not user payloads.

### Authentication & Security

This library has no authentication or authorisation subsystem. The relevant security architecture is the runtime redaction contract.

- Redaction is one-way only. No restore, unredact, or reversible metadata is stored or exposed.
- Default placeholders remain explicit and non-leaking, including `[REDACTED]` and `[UNSUPPORTED]`.
- Diagnostic events must never contain raw sensitive values.
- Traversal is bounded using explicit safety controls such as maximum depth, maximum visited-node or edge budgets, bounded selector complexity, and safe regex handling rules.
- Optional console integration is implemented as an adapter export with a re-entrancy guard so internal diagnostics cannot recursively redact themselves.
- The core runtime remains free of Node-only APIs so security and portability decisions are not coupled to one host environment.
- Security-sensitive behaviours, including precedence rules, placeholder semantics, graceful degradation, diagnostics boundaries, and hostile-input handling, are release-critical and must be covered by explicit automated tests.

### API & Communication Patterns

The project's communication surface is its public library API and its internal precedence contract.

- The primary public API is a function-first factory aligned with `fast-redact` migration expectations where that does not conflict with Deep Redact's product direction.
- Singleton initialisation and caching at application startup is the recommended usage pattern and should be the main documented path.
- Public path configuration uses `paths`, where each item may be either a `PathSelector` shorthand or a `PathRule` object with local overrides such as `censor`, `remove`, and `retainStructure`.
- The runtime uses a two-lane execution strategy:
  - a compiled fast lane for exact static absolute string-path rules
  - a generic iterative traversal lane for structured selectors, wildcard paths, matcher objects, regex path segments, key matching, substring rules, transformer handling, and hostile-shape recovery
- The hot path must avoid `structuredClone` and other full-graph cloning approaches.
- Identity tracking is object-based using `WeakMap` and `WeakSet`, not path-only bookkeeping, so aliases and circular references are handled correctly.
- Once an object or array has been fully traversed, subsequent encounters of that same identity must not trigger another full descent. Revisited completed identities are either resolved through the already produced transformed result or ignored deterministically, with optional sanitised warning diagnostics only.
- `censor` is the primary public censor option and defaults to `[REDACTED]`. Public censor functions accept the original matched value as the first argument and an optional context object as the second argument.
- `serialise` is the public serialisation option and accepts `boolean | ((value: unknown) => string)`.
- Structured and serialised output are both first-class. Serialisation remains a final output-adapter step rather than a separate traversal mode.
- When `serialise` is disabled and structured output is returned, alias preservation is conditional. If the same input identity is reached through equivalent effective rule context, the returned structured result may preserve shared identity. If the same input identity is reached through different effective rule context, path-correct output takes priority over alias preservation and the returned result may contain distinct output objects derived from the same original identity.
- Rule precedence is explicit: more specific exact string-path rules outrank less specific exact string-path rules; exact string-path rules outrank structured dynamic path rules; path rules outrank key rules; exact key rules outrank regex or matcher-object key rules; whole-value censor or removal outranks substring replacement.
- Per-path rule options are merged over the already compiled global defaults for the matched rule only, with any unset values falling back first to the compiled global defaults and then to library defaults. If a parent path rule is terminal, unreachable descendant rules below it are ignored; if a parent path rule uses `retainStructure: true`, traversal continues and descendant path rules may still apply.
- Duplicate rules that resolve to the same canonical path within the same precedence layer are rejected at initialisation unless a future documented merge rule explicitly allows them.
- Censor semantics, including removal, retain-structure handling, same-length replacement, literal censor values, and function censors, are resolved after target selection and before final output shaping.
- `remove + censor` and `remove + retainStructure` are invalid combinations at both global and per-path levels and must fail initialisation rather than being silently resolved.
- Runtime diagnostics are emitted through a typed sink abstraction, not through thrown runtime errors. In Node environments, `console.error` is the default fallback transport only.
- Root primitive handling is governed by Deep Redact's own targeting semantics rather than by a `strict` compatibility switch.
- Optional ignored-value-type rules and custom transformer registration are part of the main runtime contract, not side utilities.

### Path Grammar & Selector Contract

Path grammar is part of the public selector contract and must be finalised before compiler or runtime implementation begins.

**Selector Types:**

```ts
type SegmentTextMatcher =
  | string
  | RegExp
  | {
      match: string
      caseSensitive?: boolean
      fuzzy?: boolean
    }

type IgnoreMatcher =
  | string
  | number
  | RegExp
  | {
      match: string
      caseSensitive?: boolean
      fuzzy?: boolean
    }

type StructuredPathSegment =
  | string
  | number
  | RegExp
  | {
      match: string
      caseSensitive?: boolean
      fuzzy?: boolean
    }
  | { any: true }
  | { anyDepth: true }
  | { ignore: IgnoreMatcher }

type PathSelector = string | StructuredPathSegment[]

type PathRule =
  | PathSelector
  | {
      path: PathSelector
      censor?: string | ((value: unknown, context?: CensorContext) => unknown)
      remove?: boolean
      retainStructure?: boolean
      replaceStringByLength?: boolean
    }

type CensorContext = {
  path: string
  key: string | number | undefined
  rulePath: PathSelector
  root: unknown
}
```

**Selector Forms:**
- `string` selectors are the primary developer experience for common path rules.
- `structured` selectors are the advanced form for ignore segments, regex segments, and matcher objects.
- Path selectors are always root-relative.
- Path selectors are structural only.
- Root primitive redaction is not expressed through path selectors.

**String Selector Syntax:**
- `user.password`
- `users.0.token`
- `users[0].token`
- `headers["x-api-key"]`
- `users.*.password`
- `users.**.secret`

Rules:
- `*` matches exactly one segment
- `**` matches zero or more segments
- only one `**` is allowed per selector
- string selectors do not support ignore segments
- string selectors do not support fuzzy or case-folded segment matching
- string selectors do not support regex segments

**Structured Selector Syntax:**
- `['user', 'password']`
- `['users', 0, 'token']`
- `['users', { any: true }, 'password']`
- `['users', { anyDepth: true }, 'secret']`
- `['users', { ignore: 'metadata' }, 'password']`
- `['users', { ignore: /^internal/i }, 'password']`
- `['user', { match: 'pass_code', caseSensitive: false }]`
- `['user', { match: 'pass', caseSensitive: false, fuzzy: true }]`

**Matching Semantics:**
- plain `string` segments are exact and case-sensitive
- plain `number` segments match exact array indexes
- `RegExp` segments match one structural segment only and are allowed only in structured selectors
- `{ any: true }` matches exactly one segment
- `{ anyDepth: true }` matches zero or more segments
- terminal `**` and terminal `{ anyDepth: true }` mean descendants below the current node rather than the current node itself
- `{ ignore: ... }` matches any single segment except the ignored matcher
- terminal `{ ignore: ... }` means all direct children except the ignored matcher

**Case Sensitivity and Fuzzy Matching:**
- `{ match: 'password' }` means exact, case-sensitive match
- `{ match: 'password', caseSensitive: false }` means canonical match
- `{ match: 'pass', fuzzy: true }` means case-sensitive contains match
- `{ match: 'pass_code', caseSensitive: false, fuzzy: true }` means canonical fuzzy match

When `caseSensitive: false`, comparison is canonicalised before matching:
- lower-case both values
- remove non-alphanumeric characters

Examples:
- `pass_code` matches `passcode`
- `pass_code` matches `passCode`
- `pass_code` matches `PASS-CODE`

When `fuzzy: true`, containment is evaluated after canonicalisation if `caseSensitive: false` is also set.

**Canonicalisation Rules:**
- `users[0].token` is canonicalised to `users.0.token`
- quoted keys remain quoted in diagnostics when dot form would be ambiguous
- diagnostics should emit one canonical path representation consistently

**Validation and Safety Rules:**
- empty selectors are invalid
- empty path segments are invalid
- partial wildcard text such as `foo*bar` is invalid
- ignore segments are represented as `{ ignore: ... }`, not punctuation-based string syntax
- selectors that collapse to the same canonical path within the same precedence layer are invalid unless a documented merge rule exists
- `remove + censor` and `remove + retainStructure` are invalid at both global and per-path configuration levels
- selector length and segment count are bounded
- regex segments must be validated at initialisation
- unsupported or unsafe selector forms fail initialisation, not runtime

**Relationship to Other Targeting Modes:**
- path selectors target structure
- deep key targeting is a separate targeting system
- substring targeting is a separate targeting system
- root primitive redaction is a separate targeting system
- precedence between path, key, and substring targeting is defined separately in the precedence contract

### Fast-Redact Parity & Deliberate Divergences

- Common `fast-redact` path strings should map directly to string selectors where possible.
- `paths`, `censor`, and `remove` are preserved as primary public concepts for portability.
- `serialise` is the Deep Redact serialisation option.
- Deep Redact preserves the `fast-redact` serialisation type shape but deliberately diverges on the default value: `serialise` defaults to `false` rather than `JSON.stringify`, to avoid unnecessary hot-path serialisation cost and to support structured-output workflows by default.
- `strict` is intentionally not supported.
- restore behaviour is intentionally not supported.
- Deep Redact extends the surface with per-path rule objects, structured selectors, deep key targeting, substring targeting, transformer controls, and graceful degradation.
- The `fast-redact` migration codemod and migration guide must mechanically account for serialisation-option spelling differences, and legacy Deep Redact migration material should account for option renames such as `replacement` to `censor` where required. Every intentional behavioural divergence must be documented explicitly.

### Frontend Architecture

Frontend architecture is not applicable as an application concern.

- The core package should remain browser-safe where practical.
- Node-specific helpers, especially console redaction, must be isolated into optional adapters rather than built into the core traversal engine.

### Infrastructure & Deployment

- Development baseline: Node `24.14.1`, `pnpm` `10.x` pinned via Corepack, `Vitest` `4.1.2`, `xo` `1.2.2`, and a `tsdown`-based package build.
- Package shape: the repository itself is ESM, while published output remains dual-format with ESM, CommonJS, and type declarations.
- Export-map generation remains automated from source entry metadata rather than hand-maintained.
- Release verification must cover Node `22` and `24`, Deno `2.x`, install smoke tests across `npm`, `pnpm`, `yarn`, and `bun`, and browser-safe smoke coverage for the core build.
- CI gates should include linting, type-checking, build verification, generated-artefact verification, retained legacy contract tests, new v4 tests, migration-fixture validation, security-corpus validation, and benchmark reporting.
- Benchmark threshold enforcement should happen on protected branches and release candidates, while ordinary pull requests should still emit benchmark reports for visibility.
- Published benchmark artefacts are a trust signal and must be treated as part of the release surface.

### Decision Impact Analysis

**Implementation Sequence:**
1. Generate a scratch v4 foundation from `create-tsdown minimal`.
2. Establish package metadata, Node and pnpm baseline, `xo`, `Vitest`, `tsdown`, and generated exports and README pipelines.
3. Finalise the v4 configuration schema, path grammar, parity and divergence contract, precedence model, graceful-degradation rules, diagnostics sink, transformer resolution model, and traversal-safety budgets before runtime implementation begins.
4. Implement the exact-path fast lane and the generic traversal fallback under one benchmarked runtime.
5. Retain and reframe the current tests as contract checks while adding v4-native unit, migration, hostile-input, and benchmark coverage.
6. Add optional console integration, release verification, and migration codemod support.

**Cross-Component Dependencies:**
- The function-first API depends on the compiler and precedence model being stable early.
- The exact-path fast lane depends on initial path normalisation and deterministic precedence resolution.
- The generic traversal fallback depends on object-identity tracking, transformer handling, and local failure isolation for correctness on hostile or aliased structures.
- The codemod and migration guide depend on finalising the path grammar and public option names before implementation stories are cut.
- Generated README and generated exports depend on settling public API names early.
- Published runtime support depends on keeping host-specific features out of the core package.
- Migration codemods depend on finalising the v4 API surface before release.

**Quality Gates:**
- A golden corpus must prove that the exact-path fast lane and the generic fallback are behaviourally equivalent for the same supported inputs and configurations.
- Path-grammar tests must prove canonicalisation, wildcard semantics, ignore-segment semantics, matcher-object behaviour, and invalid-selector rejection.
- Selector-equivalence tests must prove that string selectors and structured selectors behave identically when they describe the same path.
- Canonical matcher tests must prove behaviour such as `pass_code` matching `passcode`, `passCode`, and `PASS-CODE` when `caseSensitive: false`.
- Per-path isolation tests must prove that one failing nested value becomes `[UNSUPPORTED]` while siblings, ancestors, arrays, and cycles remain intact.
- Identity-revisit tests must prove that fully traversed objects and arrays are not descended into again when re-encountered by identity, and that optional warnings remain sanitised.
- Alias-behaviour tests must prove that shared identity is preserved only when the effective rule context is equivalent, and that path-correct output takes priority when the same input identity is reached through different effective rule context.
- Diagnostics tests must prove Node-only emission, sanitised messages, no sensitive snippets, and no recursion when optional console redaction is enabled.
- DoS and hostile-input tests must cover depth limits, traversal budgets, selector complexity, regex abuse, and large mixed structures.
- Censor contract tests must prove global-default compilation, per-path merge behaviour, optional context delivery, invalid combination rejection, and same-length replacement behaviour.
- Transformer contract tests must fix precedence, define behaviour on transformer failure, and prove no post-init throws for supported inputs.
- Migration validation must cover representative `fast-redact` and v3 fixtures, including documented divergences, serialisation-option rewrites where needed, legacy `replacement` to `censor` rewrites where needed, and per-path rule-object cases.
- Conflict tests must prove duplicate canonical selector rejection and unreachable-child-rule handling.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
10 areas where AI agents could make different choices and create architectural drift:

1. Public API naming and alias policy
2. Source file and directory naming
3. Public versus internal module boundaries
4. Test placement and test taxonomy
5. Fixture and corpus organisation
6. Diagnostics event naming and payload shape
7. Path grammar canonicalisation
8. Generated artefact workflow
9. Error and validation-report structure
10. Compatibility and migration example conventions

### Naming Patterns

**Public API Naming Conventions:**
- Public configuration keys use `camelCase`.
- British English is the default for project-owned names, comments, docs, and internal identifiers.
- Public API names do not expose duplicate spelling aliases unless a future product requirement explicitly introduces one.
- Public factory and helper names use `camelCase`.
- Public types, interfaces, and exported classes use `PascalCase`.
- Internal constants use `UPPER_SNAKE_CASE`.

**Examples:**
- `deepRedact`
- `createRedactor`
- `censor`
- `paths`
- `serialise`
- `replaceStringByLength`
- `DeepRedactOptions`
- `TransformerRegistry`

**Code Naming Conventions:**
- Functions, variables, and object properties use `camelCase`.
- Types, interfaces, and error classes use `PascalCase`.
- File names use `kebab-case` for ordinary modules and `index.ts` for entry modules.
- Directory names use `kebab-case`.
- Internal compatibility helpers should be named by purpose, not by source library internals.

**Examples:**
- `compile-policy.ts`
- `path-matcher.ts`
- `console-adapter.ts`
- `migration-fixtures/`
- `build-config.ts`

**Diagnostics and Rule Naming Conventions:**
- Diagnostic event names use `dot.case`.
- Internal rule categories use explicit names rather than abbreviations.

**Examples:**
- `redaction.failure`
- `selector.unsupported`
- `budget.exceeded`
- `transformer.failed`

### Structure Patterns

**Project Organisation:**
- `src/` contains production source only.
- `test/` contains all tests; tests are not co-located inside `src/`.
- `scripts/` contains generator, maintenance, and release-support scripts.
- Public entrypoints live at explicit entry boundaries; internal modules must not be imported as if they were public API.
- Optional host-specific adapters, such as console integration, must live outside the core runtime area.

**Pattern Rules:**
- Core runtime code must not depend on adapter modules.
- Generated outputs must never be treated as the source of truth.
- New public exports must be introduced through source entrypoints and generation scripts, not by hand-editing package metadata alone.

**Test Structure Patterns:**
- `test/unit/` for narrow runtime and compiler behaviour
- `test/contract/` for public API behaviour and precedence guarantees
- `test/migration/` for `fast-redact` and v3 compatibility fixtures
- `test/security/` for hostile-input, DoS, and non-leakage cases
- `test/load/` for sustained-behaviour and operational tests
- `test/bench/` for benchmark scenarios and regression tracking

### Format Patterns

**Configuration and Data Exchange Formats:**
- Public configuration objects use `camelCase`.
- Path strings use one canonical grammar form across docs, fixtures, diagnostics, and examples, while structured selectors are used for advanced matcher cases.
- JSON examples in docs must use the same field names as the actual API.
- Dates in diagnostics and reports use ISO 8601 strings.
- Structured and serialised output are both first-class; serialisation is a final formatting step only. `serialise` is the public option name.

**Diagnostics Payload Format:**
All internal diagnostic events should follow one shape:

```ts
type DiagnosticEvent = {
  event: string
  path: string
  valueType: string
  message: string
  details?: Record<string, unknown>
}
```

Rules:
- `path` uses canonical dot-path syntax
- `valueType` is descriptive but sanitised
- `message` must never embed sensitive values
- `details` must remain non-leaking and machine-readable

**Validation and Init Report Format:**
Initialisation validation should return or emit structured findings with consistent severity naming.

**Examples:**
- `error`
- `warning`
- `info`

### Communication Patterns

**Diagnostics and Event System Patterns:**
- Internal diagnostics are represented as structured events first, transport second.
- Node-specific fallback transport may use `console.error`, but only through the guarded diagnostics sink.
- Event names use `dot.case`.
- Event payloads must remain stable enough for tests and migration tooling.

**Examples:**
- `config.invalid`
- `selector.unsupported`
- `redaction.failure`
- `console.recursion_blocked`

**State and Mutation Patterns:**
- Internal runtime state is per invocation and ephemeral.
- Shared mutable singleton state is forbidden except for compiled immutable policy state owned by a redactor instance.
- No public API may expose internal mutable traversal state.
- Optimisation paths must not change observable semantics.

### Process Patterns

**Error Handling Patterns:**
- Initialisation may fail fast with structured validation errors.
- Runtime redaction must not throw for supported inputs after successful initialisation.
- Nested runtime failures degrade locally to `[UNSUPPORTED]`.
- Diagnostics capture failure metadata without leaking source values.
- Unsupported configuration or selector forms must be surfaced explicitly, never silently ignored.

**Generated Artefact Patterns:**
- `README` is generated from maintained source content or templates.
- export maps are generated, not hand-maintained
- generated artefacts are updated by script, reviewed as outputs, and never edited as primary sources
- `dist/` is build output, not a hand-edited working area

**Compatibility and Migration Patterns:**
- `fast-redact` compatibility examples and Deep Redact v3 migration examples are kept separate.
- Intentional divergences are documented in one consistent format.
- Codemod fixtures must use the same naming and output expectations as migration docs.

### Enforcement Guidelines

**All AI Agents MUST:**
- use British English by default, with American aliases only where explicitly required for compatibility
- place tests under the correct `test/` subdomain rather than co-locating them in `src/`
- treat `README`, export maps, and other generated artefacts as generated outputs, editing their source generators instead
- preserve the boundary between core runtime code and optional host-specific adapters
- use canonical path grammar, diagnostics naming, and configuration-key naming across code, tests, and docs
- avoid introducing new public API names or exports without updating migration fixtures, examples, and generation scripts

**Pattern Enforcement:**
- `xo`, TypeScript, and Vitest act as first-line enforcement
- generation scripts validate generated artefacts
- contract, migration, and security suites enforce semantic consistency
- benchmark and hostile-input suites enforce performance and safety assumptions
- any deliberate pattern change must be documented in the architecture and migration examples before implementation is treated as complete

### Pattern Examples

**Good Examples:**
- `src/compile-policy.ts` defines compilation logic, while `src/adapters/console-adapter.ts` isolates console integration
- `test/security/redos.test.ts` contains regex abuse cases, not `test/unit/`
- `serialise` is the documented serialisation option, covered by contract tests
- `censor` is the primary public censor option, while migration tooling rewrites legacy option names where needed
- a new public helper is added through source entry metadata and the export-generation script, then reflected in generated outputs

**Anti-Patterns:**
- adding Node-only logging calls directly inside core traversal modules
- placing migration fixtures inside `src/`
- hand-editing generated export maps or generated README output
- mixing `snake_case` and `camelCase` in public configuration keys
- creating one-off diagnostic payload shapes for special cases
- adding a new public alias without migration examples or contract coverage

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
deep-redact/
├── README.md
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsdown.config.ts
├── xo.config.js
├── vitest.config.ts
├── .gitignore
├── .npmignore
├── .editorconfig
├── .env.example
├── docs/
│   ├── migration/
│   │   ├── from-fast-redact.md
│   │   └── from-v3.md
│   ├── examples/
│   │   ├── singleton-setup.md
│   │   ├── path-rules.md
│   │   ├── partial-string.md
│   │   ├── transformers.md
│   │   └── console-redaction.md
│   └── architecture/
│       ├── precedence.md
│       ├── path-grammar.md
│       └── dependency-rules.md
├── scripts/
│   ├── generate-readme.ts
│   ├── generate-exports.ts
│   ├── verify-generated-files.ts
│   ├── verify-install-matrix.ts
│   ├── verify-benchmarks.ts
│   └── verify-migration-fixtures.ts
├── src/
│   ├── index.ts
│   ├── compat/
│   │   ├── fast-redact.ts
│   │   └── aliases.ts
│   ├── core/
│   │   ├── create-redactor.ts
│   │   ├── compiler/
│   │   │   ├── compile-policy.ts
│   │   │   ├── compile-exact-paths.ts
│   │   │   ├── compile-dynamic-paths.ts
│   │   │   ├── compile-key-rules.ts
│   │   │   ├── compile-string-rules.ts
│   │   │   └── compile-transformers.ts
│   │   ├── matching/
│   │   │   ├── key-matcher.ts
│   │   │   ├── path-matcher.ts
│   │   │   ├── path-normaliser.ts
│   │   │   ├── path-parser.ts
│   │   │   └── string-matcher.ts
│   │   ├── runtime/
│   │   │   ├── redact.ts
│   │   │   ├── fast-lane.ts
│   │   │   ├── traversal-engine.ts
│   │   │   ├── traversal-budget.ts
│   │   │   ├── path-state.ts
│   │   │   ├── identity-tracker.ts
│   │   │   └── graceful-degradation.ts
│   │   ├── replacement/
│   │   │   ├── apply-replacement.ts
│   │   │   ├── retain-structure.ts
│   │   │   ├── remove-node.ts
│   │   │   └── serialise-output.ts
│   │   ├── diagnostics/
│   │   │   ├── diagnostics-sink.ts
│   │   │   ├── diagnostic-event.ts
│   │   │   ├── node-console-sink.ts
│   │   │   └── sanitise-diagnostics.ts
│   │   └── validation/
│   │       ├── validate-config.ts
│   │       ├── validate-paths.ts
│   │       ├── validate-transformers.ts
│   │       └── validation-report.ts
│   ├── transformers/
│   │   ├── index.ts
│   │   ├── transformer-registry.ts
│   │   ├── default/
│   │   │   ├── circular.ts
│   │   │   ├── bigint.ts
│   │   │   ├── date.ts
│   │   │   ├── error.ts
│   │   │   ├── map.ts
│   │   │   ├── regex.ts
│   │   │   ├── set.ts
│   │   │   └── url.ts
│   │   └── shared/
│   │       └── transformer-types.ts
│   ├── adapters/
│   │   ├── console/
│   │   │   ├── index.ts
│   │   │   ├── attach-console-redaction.ts
│   │   │   └── recursion-guard.ts
│   │   └── browser/
│   │       └── index.ts
│   ├── types/
│   │   ├── public.ts
│   │   ├── config.ts
│   │   ├── diagnostics.ts
│   │   ├── paths.ts
│   │   └── transformers.ts
│   └── internal/
│       ├── constants.ts
│       ├── errors.ts
│       └── utils/
│           ├── object-utils.ts
│           ├── path-utils.ts
│           ├── regex-utils.ts
│           └── type-utils.ts
├── test/
│   ├── unit/
│   │   ├── compiler/
│   │   ├── matching/
│   │   ├── replacement/
│   │   ├── diagnostics/
│   │   ├── validation/
│   │   └── transformers/
│   ├── contract/
│   │   ├── api/
│   │   ├── exports/
│   │   ├── types/
│   │   ├── precedence/
│   │   └── equivalence/
│   ├── compatibility/
│   │   ├── node/
│   │   ├── deno/
│   │   ├── package-managers/
│   │   └── browser/
│   ├── migration/
│   │   ├── fast-redact/
│   │   ├── v3/
│   │   └── codemod/
│   ├── security/
│   │   ├── hostile-input/
│   │   ├── diagnostics/
│   │   ├── dos/
│   │   └── leakage/
│   ├── load/
│   ├── bench/
│   ├── fixtures/
│   │   ├── inputs/
│   │   └── golden/
│   ├── artefacts/
│   │   ├── benchmarks/
│   │   ├── install-matrix/
│   │   └── migration/
│   └── setup/
│       ├── dummy-user.ts
│       ├── blacklist.ts
│       └── test-helpers.ts
├── codemods/
│   ├── fast-redact/
│   │   └── transform.ts
│   ├── v3/
│   │   └── transform.ts
│   └── shared/
│       └── utils.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── benchmark.yml
└── dist/
```

### Architectural Boundaries

**Public API Boundaries:**
- `src/index.ts` is the only primary public package facade.
- `src/types/` contains public contract types only.
- `src/compat/` contains compatibility-facing helpers and aliases, but must not become a second independent runtime.
- `src/adapters/` contains optional integration code only and is not part of the core runtime contract.

**Core Dependency Order:**
The dependency direction inside `src/core/` is one-way:

1. `matching/`
2. `validation/`
3. `compiler/`
4. `replacement/`
5. `diagnostics/`
6. `runtime/`

Rules:
- `matching/` contains pure selector and path logic only.
- `validation/` may depend on shared types and matching utilities, but not on runtime execution.
- `compiler/` produces immutable compiled policy and must not depend on adapters.
- `replacement/` owns output-shaping mechanics only.
- `diagnostics/` owns event structures, sanitisation, and sinks only.
- `runtime/` consumes compiled policy and orchestrates fast lane, fallback traversal, transformers, replacement, and diagnostics.
- No lower layer may import from a higher layer.

**Private Implementation Boundary:**
- `src/internal/` is strictly private implementation detail.
- Nothing outside `src/` may import from `src/internal/`.
- Public API and test fixtures must never depend on `src/internal/` paths as if they were stable contracts.

### Service Boundaries

This is a library, so “services” are internal runtime domains rather than deployable services.

- **Compilation boundary:** `src/core/compiler/`
  - owns conversion from user config to immutable compiled policy
- **Execution boundary:** `src/core/runtime/`
  - owns fast lane, fallback traversal, identity tracking, budgets, graceful degradation
- **Diagnostics boundary:** `src/core/diagnostics/`
  - owns structured events, sanitisation, sink routing
- **Validation boundary:** `src/core/validation/`
  - owns config acceptance and init-time reporting
- **Transformation boundary:** `src/transformers/`
  - owns built-in and custom transformer resolution only
- **Adapter boundary:** `src/adapters/`
  - owns host-specific optional integration only

### Data Boundaries

- User configuration enters through the public API and becomes an immutable compiled rule plan.
- Payload data enters runtime execution and must never be cached across invocations.
- Diagnostics data is sanitised before leaving runtime internals.
- Generated artefact metadata flows from source modules and scripts into `README.md`, package exports, and release outputs.
- Test fixtures under `test/fixtures/inputs/` are inputs only.
- Verification outputs and recorded baselines belong under `test/artefacts/`, not under fixtures.

### Requirements to Structure Mapping

**Configuration & Policy Definition FRs:**
- `src/core/create-redactor.ts`
- `src/core/compiler/`
- `src/core/validation/`
- `src/types/config.ts`
- `test/unit/compiler/`
- `test/contract/api/`

**Targeted Redaction Coverage FRs:**
- `src/core/matching/`
- `src/core/runtime/fast-lane.ts`
- `src/core/runtime/traversal-engine.ts`
- `src/core/replacement/`
- `test/unit/matching/`
- `test/contract/precedence/`
- `test/contract/equivalence/`

**Precise Output Behaviour FRs:**
- `src/core/replacement/`
- `src/core/diagnostics/`
- `src/core/runtime/graceful-degradation.ts`
- `test/contract/api/`
- `test/contract/precedence/`
- `test/contract/equivalence/`

**Runtime Resilience & Safety FRs:**
- `src/core/runtime/traversal-budget.ts`
- `src/core/runtime/identity-tracker.ts`
- `src/transformers/`
- `src/core/diagnostics/`
- `test/security/`
- `test/load/`

**Migration & Ecosystem Adoption FRs:**
- `src/compat/`
- `docs/migration/`
- `codemods/`
- `test/migration/`

**Distribution & Language Support FRs:**
- `src/index.ts`
- `src/types/`
- `scripts/generate-exports.ts`
- `scripts/verify-install-matrix.ts`
- `test/compatibility/`
- `.github/workflows/`

**Console Redaction Support FRs:**
- `src/adapters/console/`
- `src/core/diagnostics/`
- `test/security/diagnostics/`

**Trust & Standardisation Support FRs:**
- `docs/examples/`
- `docs/architecture/`
- `test/bench/`
- `test/artefacts/benchmarks/`
- `scripts/verify-benchmarks.ts`

### Cross-Cutting Concerns

**Generated Artefacts:**
- `scripts/generate-readme.ts`
- `scripts/generate-exports.ts`
- `scripts/verify-generated-files.ts`

Rules:
- `src/**` is the source of truth.
- `README.md` and package exports are generated artefacts.
- They must only change through the generator scripts, not through direct manual editing.

**Diagnostics and Non-Leakage:**
- `src/core/diagnostics/`
- `test/security/diagnostics/`

**Hostile Input / DoS Mitigation:**
- `src/core/runtime/traversal-budget.ts`
- `src/core/matching/path-parser.ts`
- `src/internal/utils/regex-utils.ts`
- `test/security/dos/`
- `test/security/hostile-input/`

**Transformer Contracts:**
- `src/transformers/`
- `test/unit/transformers/`
- `test/contract/equivalence/`
- `test/security/leakage/`

**Red-Phase Compatibility Constraint:**
- retained legacy tests remain compatibility constraints during the rewrite
- they do not replace the new contract, migration, security, or compatibility suites
- until equivalent v4 coverage exists, legacy expectations should be treated as quarantined red-phase signals rather than as the full shape of the new architecture

### Integration Points

**Internal Communication:**
- Public API -> validation -> compiler -> runtime -> replacement -> diagnostics sink
- Transformer registry is consulted through compiled policy, not ad hoc resolution scattered across modules
- Adapters consume public/core exports, not `src/internal/` directly

**External Integrations:**
- Optional consumer integration with `console.*` via `src/adapters/console/`
- Package-manager and runtime verification through CI and scripts
- Codemod entrypoints for migration assistance outside runtime execution

**Data Flow:**
1. User passes config to public factory
2. Validation produces structured findings
3. Compiler creates immutable rule plan
4. Runtime executes fast lane where applicable, then fallback traversal
5. Replacement and output shaping finalise result
6. Diagnostics sink receives sanitised events where relevant

### File Organisation Patterns

**Configuration Files:**
- Root-level toolchain config only
- generation and verification rules live in `scripts/`
- architecture and migration docs live in `docs/`

**Source Organisation:**
- `src/index.ts` defines public exports
- core logic lives under `src/core/`
- optional host integrations live under `src/adapters/`
- compatibility shims and aliases live under `src/compat/`
- transformer concerns live under `src/transformers/`
- reusable internals live under `src/internal/`
- public types live under `src/types/`

**Test Organisation:**
- all tests live under `test/`
- each test directory maps to one responsibility domain
- `test/compatibility/` is separate from `test/migration/`
- fixtures are centralised under `test/fixtures/`
- verification outputs and committed baselines live under `test/artefacts/`

**Asset Organisation:**
- no static app assets are expected
- generated documentation and verification outputs are docs-adjacent or test-artefact outputs
- `dist/` is disposable build output only

### Development Workflow Integration

**Development Structure:**
- Local development revolves around `pnpm` scripts for linting, testing, generation, verification, codemods, and benchmarks.
- Optional adapters should be buildable and testable independently from the core runtime.

**Build Process Structure:**
- `tsdown` consumes `src/` entrypoints
- export generation runs from source metadata
- README generation runs from maintained source content and templates
- build verification confirms generated artefacts and output structure

**Deployment Structure:**
- CI produces validated package artefacts for release
- release workflows verify compatibility matrix, generated artefacts, migration fixtures, benchmark thresholds, and security gates before publish
- published package exposes only approved public entrypoints and type definitions

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
The architecture is coherent. The contributor baseline of Node `24.14.1`, `pnpm`, `tsdown`, `Vitest`, and `xo` is compatible with the package shape and with the published-support split for Node `22.18+`, Node `24.x`, Deno `2.x`, and a browser-safe core. The function-first API, hybrid runtime, generated artefact workflow, optional adapter boundaries, and migration-focused parity stance all reinforce one another without obvious conflict. The explicit decision to preserve `fast-redact` surface familiarity where useful while documenting deliberate divergences keeps the API direction technically honest.

**Pattern Consistency:**
The implementation patterns support the architectural decisions. British-English-first naming, explicit American-English compatibility aliases, generated README and export-map rules, structured diagnostics, source-of-truth boundaries, and canonical path-grammar rules all align with the intended public surface. The runtime contract, graceful degradation model, hostile-input protections, censor semantics, transformer handling, and migration rules are now described consistently enough to constrain implementation.

**Structure Alignment:**
The project structure supports the chosen architecture. `src/core/` owns engine behaviour, `src/transformers/` owns transformation concerns, `src/adapters/` isolates host-specific integration, and `src/compat/` provides an explicit place for migration-facing helpers without creating a second runtime. The test layout mirrors the product's real risks by separating contract, compatibility, migration, security, load, and benchmark concerns. The one-way dependency rule inside `src/core/` is strong enough to reduce implementation drift.

### Requirements Coverage Validation ✅

**Feature Coverage:**
All major functional requirement groups from the PRD are architecturally supported. Configuration and policy-definition requirements are covered by the compiler and validation layers. Targeting requirements are covered by the path-selector contract, key matching, substring handling, and runtime layers. Output-shaping requirements are covered by the censor, removal, retain-structure, and serialisation contracts. Runtime resilience, diagnostics, transformer behaviour, migration, console integration, benchmark artefacts, and release verification all have explicit architectural homes.

**Functional Requirements Coverage:**
The architecture supports:
- singleton initialisation and cached policy compilation
- exact paths, structured selectors, wildcard segments, ignore segments, deep key targeting, and substring targeting
- canonical and fuzzy matcher behaviour for structured selector segments
- deterministic precedence resolution across overlapping rules
- one-way structured and serialised output modes
- built-in and custom transformers with deterministic resolution order
- localised `[UNSUPPORTED]` degradation for problematic nested values
- migration support for both `fast-redact` and Deep Redact v3
- generated exports, generated README, and release-verification automation
- optional `console.*` redaction through an adapter boundary rather than core coupling

**Non-Functional Requirements Coverage:**
The architecture addresses the key NFRs directly:
- performance through a benchmark-led hybrid runtime, selective exact-path fast lane, and explicit benchmark gates
- security through one-way semantics, sanitised diagnostics, deterministic behaviour, hostile-input protection, and selector-safety rules
- reliability through no-post-init-throw runtime rules, per-path degradation, and per-invocation traversal-state isolation
- compatibility through Node, Deno, package-manager, browser-safe, and migration-oriented coverage
- maintainability through strict boundaries, naming rules, generated artefact workflows, and agent-facing consistency rules

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical decisions are documented at the right level. The public API direction, parity and divergence stance, path grammar, runtime strategy, security model, diagnostics contract, censor contract, transformer model, contributor/runtime split, migration stance, and verification expectations are explicit enough to prevent agents from inventing incompatible implementations.

**Structure Completeness:**
The project structure is concrete and implementation-ready. It defines root config, source boundaries, optional adapters, codemods, docs, generation scripts, compatibility coverage, migration fixtures, security domains, and verification artefacts. The mapping from requirement groups to modules and test domains is specific enough to guide story slicing and code ownership.

**Pattern Completeness:**
The consistency rules are strong enough to reduce implementation drift. Naming, file placement, diagnostics shape, generated artefact ownership, migration example handling, selector canonicalisation, red-phase quarantine, and compatibility-alias handling are all clearly defined. The architecture now gives agents both strategic direction and tactical boundaries.

### Gap Analysis Results

**Critical Gaps:**
No critical architectural gaps remain in the drafted sections.

**Important Gaps:**
No important gaps remain that block the next planning phase.

**Nice-to-Have Gaps:**
- Some earlier illustrative examples in the implementation-pattern section can still be refreshed later to mirror the final directory structure exactly.
- Supporting architecture-adjacent docs such as `docs/architecture/path-grammar.md` and `docs/architecture/dependency-rules.md` are planned in the structure but do not need to exist before implementation planning begins.

### Validation Issues Addressed

- The brownfield-versus-greenfield wording was corrected to distinguish repository context from v4 implementation strategy.
- Path grammar was elevated from an implied concern to an explicit pre-implementation selector contract.
- `fast-redact` parity was narrowed to surface-level portability with explicit documented divergences.
- `serialise` now preserves the `fast-redact` serialisation type shape while deliberately defaulting to `false` for performance and structured-output workflows.
- `censor` was formalised with optional context, merged per-path settings, and explicit invalid-combination rejection.
- Identity handling now distinguishes active versus completed traversal state per invocation, prevents repeated descent within a single `redact` call, and defines conditional alias preservation for structured output.
- Validation now explicitly requires proof for selector equivalence, canonical matcher behaviour, codemod rewrites, duplicate-selector rejection, unreachable-child handling, and alias-behaviour correctness.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements-to-structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION PLANNING

**Confidence Level:** High based on the specificity of the runtime, selector, safety, migration, and verification decisions.

**Key Strengths:**
- clear runtime and safety contract for a security-sensitive library
- explicit selector grammar and parity/divergence model
- strong migration pathing for both `fast-redact` and v3
- test-domain separation that matches the product's real risk profile
- deterministic artefact generation and release-verification expectations
- implementation patterns concrete enough for multi-agent execution

**Areas for Future Enhancement:**
- optional additional adapters beyond console integration
- richer migration ergonomics beyond guides and codemods
- supplementary architecture-adjacent docs once implementation settles

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries.
- Refer to this document for all architectural questions before inventing new conventions.

**First Implementation Priority:**
Generate a scratch v4 foundation from `create-tsdown minimal`, then transplant only the chosen build, lint, test, and package conventions into the existing repository before rebuilding the runtime from first principles.
