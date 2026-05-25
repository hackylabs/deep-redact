---
stepsCompleted:
  - "step-01-validate-prerequisites"
  - "step-02-design-epics"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
---

# deep-redact - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for deep-redact, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Developers can create a redactor from a single configuration intended for service-root use.
FR2: Developers can reuse one initialised redactor across repeated redaction operations within a service.
FR3: Developers can validate whether a configuration is accepted before runtime redaction begins.
FR4: Developers can define one redaction policy that combines multiple targeting approaches, replacement behaviour, output-format behaviour, ignored-value-type rules, and transformer configuration in the same configuration.
FR5: Developers can define replacement behaviour for specific redaction targets, including literal replacements, function-based replacements, removal, retain-structure handling, and same-length string replacement.
FR6: Developers can enable optional fuzzy matching for target keys.
FR7: Developers can enable optional case-insensitive matching for target keys.
FR8: TypeScript developers can discover valid configuration and API usage through typed interfaces.
FR9: Developers can target sensitive values by key name or regex-based object property matching across nested objects and arrays.
FR10: Developers can target sensitive values by explicit object path, including regex-based object path segment matching.
FR11: Developers can target sensitive values using single-level wildcard path segments.
FR12: Developers can target sensitive values using recursive wildcard path segments.
FR13: Developers can exclude specific keys or indexes from otherwise matching path rules.
FR14: Developers can target matched substrings within a larger string value and can fully redact a matching root primitive input.
FR15: Developers can apply key targeting, object-path targeting, and substring targeting to the same payload.
FR16: Developers can redact payloads that contain nested objects, arrays, and mixed value types in the same structure, including standard transformed runtime values.
FR17: Developers can preserve non-targeted values when targeted values are redacted.
FR18: Developers can rely on only matched substrings being altered when substring targeting is used.
FR19: Developers can rely on deterministic output for the same input and configuration.
FR20: Developers can understand how the library resolves overlaps when more than one targeting rule applies to the same value.
FR21: Developers can use the library without any capability to restore or unredact original values.
FR22: Developers can redact payloads containing circular references.
FR23: Developers can redact payloads containing circular references and standard transformed runtime values including `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`, and can optionally ignore configured value types or apply custom transformers.
FR24: Developers can continue receiving redacted output when a specific nested value cannot be processed cleanly.
FR25: Developers can receive `[UNSUPPORTED]` for a problematic nested value while the rest of the payload remains intact.
FR26: Developers can use runtime redaction without supported inputs causing thrown errors after successful initialisation.
FR27: Developers can retain the surrounding parent structure when one nested value fails redaction.
FR28: Developers can migrate documented `fast-redact` scenarios to v4 through equivalent or clearly documented alternative configuration.
FR29: Developers can identify intentional behavioural differences from `fast-redact` before adopting v4.
FR30: Existing Deep Redact users can migrate from the v3 class-based API to the v4 API through dedicated migration guidance.
FR31: Developers can evaluate v4 through code examples that cover singleton setup, key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, substring targeting, root-primitive redaction, replacement and removal behaviour, retain-structure handling, same-length string replacement, structured versus serialised output, ignored-value-type configuration, custom transformer configuration, graceful error replacement, optional `console.*` redaction, `fast-redact` migration, and v3 migration.
FR32: Developers can install and use the library in JavaScript projects.
FR33: Developers can install and use the library in TypeScript projects.
FR34: Developers can install and use the library through `npm`, `pnpm`, `yarn`, `bun`, and `deno`.
FR35: Developers can optionally apply Deep Redact to `console.*` calls in application code.
FR36: Developers can enable optional console redaction without triggering recursive redaction from Deep Redact’s own diagnostic logging.
FR37: Platform and security teams can review published benchmark artefacts when evaluating the library for standard use.
FR38: Platform and security teams can review published guidance on supported capabilities, targeting semantics, and migration expectations before standardising the library.

### NonFunctional Requirements

NFR1: On comparable path-based benchmark workloads, Deep Redact v4 targets roughly `25% to 50%` overhead versus `fast-redact` as an aspirational goal, with a release-blocking ceiling of `60%` overhead.
NFR2: Performance claims must be backed by published benchmark artefacts included with the release.
NFR3: Performance evaluation must use a published benchmark set with clearly documented comparable workloads and benchmark conditions.
NFR4: Performance regressions against the published benchmark set must be treated as release-blocking when they push equivalent path-based workloads outside the `60%` overhead ceiling versus `fast-redact`. The `25% to 50%` band is the aspirational optimisation target; exceeding it without breaching the `60%` ceiling is a signal to keep optimising, not a release blocker.
NFR5: The release must ship with no known runtime security vulnerabilities.
NFR6: The library must provide one-way redaction only and must not expose any restore or unredact capability.
NFR7: When a redaction error occurs, no error placeholder or diagnostic output may expose sensitive source values.
NFR8: The library must document precedence rules for overlapping key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, and partial-string targeting so users can reason about exposure risk.
NFR9: Security-sensitive behaviours, including redaction boundaries, placeholder behaviour, and precedence rules, must be covered by explicit tests.
NFR10: After successful initialisation, supported inputs must not cause thrown runtime errors during redaction.
NFR11: Redaction failures must be isolated to the problematic nested value and replaced with `[UNSUPPORTED]` without throwing an error.
NFR12: When a nested redaction failure occurs, the rest of the payload must remain intact and continue through normal redaction processing.
NFR13: Diagnostic logging for redaction failures must record the value type, object path, and error details without exposing sensitive data.
NFR14: Optional console redaction must not create recursive redaction loops or destabilise application logging behaviour.
NFR15: Installation and baseline usage must be verified for `npm`, `pnpm`, `yarn`, `bun`, and `deno`.
NFR16: Those installation and usage paths must be validated in automated release verification, not left as documentation-only claims.
NFR17: Deno support must cover `>= 2.*`.
NFR18: Before v4 ships, release documentation must declare the supported Node.js version matrix explicitly.
NFR19: Published documentation must align with the verified installation and compatibility matrix so users are not relying on untested claims.

### Additional Requirements

- Starter template: Epic 1 Story 1 should establish a scratch v4 foundation using `pnpm create tsdown@latest deep-redact-v4 --template minimal`, then selectively merge the chosen scaffold into the existing repository without deleting the current test suite.
- The v4 foundation should adopt a TypeScript-first Node `24.14.1` contributor baseline with `pnpm`, `tsdown`, `Vitest`, and `xo`.
- The repository should use ESM package metadata while published output remains dual-format with ESM, CommonJS, and type declarations.
- The core package should remain zero-runtime-dependency.
- Generated `README` and export-map workflows must be retained and enforced as generated artefacts rather than hand-maintained files.
- The primary public API should be function-first: `deepRedact(options)` returning a callable redactor, with `createRedactor(options)` as an ergonomic alias.
- The public configuration surface should preserve `fast-redact` familiarity where appropriate, using `paths`, `censor`, `remove`, and `serialise` as the public options. `serialise` accepts `boolean | ((value: unknown) => string)` and defaults to structured output when omitted.
- Invalid configuration combinations, including `remove + censor` and `remove + retainStructure`, must fail initialisation at both global and per-path levels.
- Configuration should be compiled once at initialisation into an immutable rule plan separating exact path rules, dynamic path rules, key rules, substring rules, transformer rules, diagnostics configuration, and output-shaping rules.
- The runtime should use a two-lane design: an exact static path fast lane plus a generic iterative traversal fallback, with both lanes required to produce identical observable behaviour.
- Path grammar must be finalised before runtime implementation, including canonical syntax, `*`, `**`, and `{ ignore: ... }` semantics, selector validation, duplicate canonical selector rejection, and bounded selector complexity.
- The runtime must enforce traversal and parser safety controls, including maximum depth, visited-node or edge budgets, hostile-input protection, and safe regex handling against ReDoS.
- Transformer support must include built-in handling for circular references, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`, plus deterministic custom transformer registration and failure handling.
- Optional console redaction must be delivered through a separate adapter entry point with a re-entrancy guard so Deep Redact diagnostics cannot recursively redact themselves.
- Release verification must cover Node `22` and `24`, Deno `2.x`, install smoke tests for `npm`, `pnpm`, `yarn`, and `bun`, and browser-safe smoke coverage for the core build.
- CI quality gates must include linting, type-checking, build verification, generated-artefact verification, retained legacy contract tests, new v4 tests, migration-fixture validation, security-corpus validation, and benchmark reporting.
- The implementation sequence should stabilise the API, path grammar, precedence model, diagnostics contract, transformer model, and traversal-safety budgets before the main runtime build-out.
- Migration tooling is a planned deliverable: provide separate migration guides for `fast-redact` and Deep Redact v3, plus codemod or migration-assist support validated against representative golden fixtures.
- Project boundaries should keep core runtime logic separate from adapters, keep tests under `test/` rather than `src/`, and treat generated artefacts as outputs from scripts rather than sources of truth.

### UX Design Requirements

No UX design document was identified, so there are no UX-specific implementation requirements to extract at this stage.

### FR Coverage Map

FR1: Epic 1 - create a singleton redactor from one service-root configuration
FR2: Epic 1 - reuse one initialised redactor across a service
FR3: Epic 1 - validate configuration before runtime use
FR4: Epic 1 - define one combined redaction policy
FR5: Epic 2 - configure replacement behaviour per target
FR6: Epic 2 - enable fuzzy key matching
FR7: Epic 2 - enable case-insensitive key matching
FR8: Epic 1 - provide typed API discoverability for TypeScript users
FR9: Epic 1 - target values by key or regex property match
FR10: Epic 1 - target values by explicit object path and regex path segment
FR11: Epic 1 Story 1.4 (functional) + Epic 7 Story 7.5 (performance fast lane) - support single-level wildcard path segments
FR12: Epic 1 - support recursive wildcard path segments
FR13: Epic 1 - exclude keys or indexes from matching path rules
FR14: Epic 2 - redact matched substrings and root primitive inputs
FR15: Epic 2 - combine key, path, and substring targeting in one payload
FR16: Epic 3 - handle nested mixed payloads including transformed runtime values
FR17: Epic 1 - preserve non-targeted values during redaction
FR18: Epic 2 - alter only matched substrings and preserve surrounding text
FR19: Epic 4 - provide deterministic output for the same input and configuration
FR20: Epic 4 - explain overlap resolution when multiple rules match
FR21: Epic 4 - provide one-way redaction with no restore capability
FR22: Epic 3 - handle circular references safely
FR23: Epic 3 - support transformed runtime values, ignored types, and custom transformers
FR24: Epic 3 - continue returning redacted output when one nested value fails
FR25: Epic 3 - replace only the problematic nested value with `[UNSUPPORTED]`
FR26: Epic 3 - avoid thrown runtime errors after successful initialisation
FR27: Epic 3 - preserve parent structure when one nested value fails
FR28: Epic 5 - migrate documented `fast-redact` scenarios to v4
FR29: Epic 5 - document intentional `fast-redact` divergences before adoption
FR30: Epic 5 - provide a dedicated v3-to-v4 migration path
FR31: Epic 5 - provide release-critical examples across setup, features, and migration
FR32: Epic 1 - support JavaScript consumers
FR33: Epic 1 - support TypeScript consumers
FR34: Epic 5 - verify installation and usage across `npm`, `pnpm`, `yarn`, `bun`, and `deno`
FR35: Epic 4 - support optional `console.*` redaction in application code
FR36: Epic 4 - prevent recursive redaction from Deep Redact diagnostics
FR37: Epic 5 - publish benchmark artefacts for platform evaluation
FR38: Epic 5 - publish guidance on capabilities, targeting semantics, and migration expectations

**Technical Constraint (no FR number):** Story 7.4 - enforce traversal depth limits, node/edge budgets, hostile-input protection, and security corpus validation (PRD Domain-Specific Requirements — traversal and memory safety)

## Epic List

### Epic 1: Enable Service-Wide Redaction with One Configuration
Developers can initialise one redactor in a JavaScript or TypeScript service and apply predictable key and path-based redaction across the service.
**FRs covered:** FR1, FR2, FR3, FR4, FR8, FR9, FR10, FR11, FR12, FR13, FR17, FR32, FR33

### Epic 2: Precisely Redact Sensitive Content Without Losing Safe Context
Developers can target only sensitive substrings and values, using precise replacement behaviour while keeping surrounding safe data useful.
**FRs covered:** FR5, FR6, FR7, FR14, FR15, FR18

### Epic 3: Safely Redact Real Production Payloads
Developers can trust Deep Redact on circular, transformed, mixed, and partially unsupported payloads without post-init runtime failures.
**FRs covered:** FR16, FR22, FR23, FR24, FR25, FR26, FR27

### Epic 4: Prove Redaction Quality in Operation
Teams can understand redaction outcomes, trust deterministic one-way behaviour, and safely use optional `console.*` redaction without recursion.
**FRs covered:** FR19, FR20, FR21, FR35, FR36

### Epic 5: Roll Out, Migrate, and Standardise Adoption
Teams can migrate existing usage, verify cross-environment support, evaluate performance, and standardise Deep Redact with strong examples and guidance.
**FRs covered:** FR28, FR29, FR30, FR31, FR34, FR37, FR38

### Epic 7: Runtime Performance — Pass the Benchmark Gate
Address the open performance gate and traversal safety controls.
**Technical Constraints covered:** Story 7.1 — compiled path executor; Story 7.2 — equivalence proof; Story 7.3 — general traversal allocation; Story 7.4 — traversal safety limits, hostile-input protection, security corpus

## Epic 1: Enable Service-Wide Redaction with One Configuration

Developers can initialise one redactor in a JavaScript or TypeScript service and apply predictable key and path-based redaction across the service.

### Story 1.1: Establish the Scratch v4 Foundation and Brownfield Transplant Scaffold

Implements: FR32, FR33

As a Deep Redact maintainer,
I want to generate the mandated scratch v4 foundation and transplant only the approved package conventions into the existing repository,
So that the rewrite starts from the selected architecture baseline without replacing the current red-phase tests and fixtures.

**Acceptance Criteria:**

**Given** the approved v4 architecture selects `create-tsdown` `minimal` as the starter workflow
**When** Story `1.1` begins
**Then** a scratch package foundation is generated with `pnpm create tsdown@latest deep-redact-v4 --template minimal`
**And** that scratch output is treated as the reference source for the brownfield transplant

**Given** the scratch starter output and the current repository
**When** the v4 foundation is merged
**Then** only the chosen build, lint, test, packaging, and generated-artefact conventions are transplanted into the existing repository
**And** the current test suite and fixtures remain in place
**And** no existing coverage is deleted or disabled through a wholesale scaffold replacement

**Given** the new package foundation
**When** contributor tooling metadata is defined
**Then** the repository declares `Node 24.14.1`, `pnpm`, `tsdown`, `Vitest`, and `xo` as the contributor baseline

**Given** the v4 package configuration
**When** the package is prepared for development and publishing
**Then** the source is treated as ESM during development
**And** the build is configured to emit ESM, CommonJS, and type declarations

**Given** the new public API shape
**When** the entrypoint scaffold is generated
**Then** `deepRedact` is exposed as the primary public factory
**And** `createRedactor` is exposed as a named alias through generated export metadata rather than hand-maintained export maps

**Given** the repository automation requirements
**When** the foundation is complete
**Then** documented scripts exist and run for build, lint, test, generated exports, and generated README workflows

**Given** the built package artefacts
**When** the package is consumed from clean fixtures using both `import` and `require`
**Then** the entrypoint resolves successfully
**And** both `deepRedact` and `createRedactor` are available as documented exports
**And** type declarations are available to consumers

**Given** the transplanted scaffold is reviewed
**When** brownfield-safety is assessed
**Then** the selected starter conventions are documented as having come from the scratch template workflow
**And** any retained repository-specific files outside that workflow are deliberate and justified

**Given** this is a foundation-only story driven by the starter workflow
**When** the story is reviewed
**Then** no redaction algorithm, transformation logic, or policy behaviour is implemented beyond the minimum compile-safe scaffolding needed to validate the package surface

### Story 1.2: Create and Validate a Reusable Service Redactor

Implements: FR1, FR2, FR3, FR4, FR8

As a backend engineer,
I want to create one reusable redactor from startup configuration,
So that I can standardise redaction setup once per service and reuse it without re-initialising on every call.

**Acceptance Criteria:**

**Given** a valid startup configuration object for the factory API
**When** the consumer calls `deepRedact(validOptions)` during service startup
**Then** a callable redactor function is returned
**And** no payload redaction work is performed at creation time

**Given** a redactor created from valid startup configuration
**When** the consumer invokes it multiple times with payloads
**Then** the same initialised redactor instance is reused
**And** no configuration argument is required on subsequent calls

**Given** the public API surface
**When** the consumer calls `createRedactor(validOptions)`
**Then** it returns the same callable redactor behaviour as `deepRedact(validOptions)`
**And** both factories are available from the public entrypoint

**Given** an invalid configuration shape, unsupported option value, or unsupported public option name
**When** either factory is called
**Then** initialisation fails immediately with a validation error
**And** no redaction function is returned

**Given** startup configuration includes `paths`
**When** the public config is typed and validated for this story
**Then** each entry is either a string selector or a path-rule object with `path` plus optional `censor`, `remove`, and `retainStructure` overrides
**And** selector execution beyond this story's init-time contract remains deferred to later stories in Epic `1`

**Given** invalid option combinations for this story
**When** `remove` is combined with `censor` or `retainStructure` at the global config level or inside a path-rule object
**Then** factory creation is rejected during initialisation
**And** the validation error identifies the conflicting option or combination

**Given** a TypeScript consumer
**When** the factory functions are imported from the public entrypoint
**Then** the package exposes typed signatures for supported startup options
**And** `serialise` is the only public serialisation option, accepts `boolean | ((value: unknown) => string)`, and defaults to structured output when omitted
**And** the returned redactor is editor-discoverable as a callable function

**Given** a validly initialised redactor in this story before runtime targeting is implemented
**When** the consumer invokes it with a payload compatible with the configured `serialise` setting
**Then** it returns the payload unchanged apart from optional serialisation configured at initialisation
**And** it does not throw solely because later targeting stories have not landed yet

**Given** clean ESM and CommonJS consumer fixtures
**When** the built package exports are imported and either factory is invoked
**Then** each returns a callable redactor
**And** the built root surface still exposes only `deepRedact` and `createRedactor`

**Given** this story’s scope
**When** the implementation is reviewed
**Then** it covers reusable factory creation and init-time validation only
**And** nested key/path redaction behaviour remains deferred to later stories in Epic `1`

### Story 1.3: Redact Exact Keys and Canonical Exact Paths in Nested Payloads

Implements: FR9, FR10, FR17

As a backend engineer,
I want one service redactor to target exact key names and canonical exact root-relative object paths,
So that I can protect predictable sensitive fields across nested payloads without altering unrelated data.

**Acceptance Criteria:**

**Given** exact static path selectors are configured at initialisation
**When** the redactor factory normalises them
**Then** every selector is canonicalised into one internal root-relative form before any redaction occurs

**Given** two exact path selectors collapse to the same canonical selector
**When** the factory initialises
**Then** initialisation fails fast with a duplicate-selector validation error
**And** no redactor is created

**Given** exact path selectors use dot or bracket notation for array indices
**When** they are canonicalised
**Then** `users[0].email` and `users.0.email` are treated as equivalent canonical forms
**And** array indices match literally, so index `0` does not match any other index

**Given** a payload containing nested objects and arrays
**When** an exact-key rule matches a configured key name
**Then** every value under that exact key is redacted wherever it occurs in the nested structure

**Given** a payload where the same leaf matches both an exact-path rule and an exact-key rule
**When** redaction runs
**Then** the exact-path rule takes precedence
**And** that leaf is redacted once only

**Given** a payload containing both targeted and non-targeted sibling fields
**When** redaction runs
**Then** only targeted values are redacted
**And** non-targeted sibling values remain unchanged in the returned result

**Given** one reusable redactor configured with both exact-key and exact-path rules
**When** it is invoked on a payload
**Then** both rule types are applied in one redaction pass
**And** one redacted result is returned to the caller

**Given** configuration includes wildcard segments, recursive wildcards, exclusion segments, or regex-based key or path matching
**When** the factory initialises
**Then** initialisation fails with an unsupported-selector validation error
**And** those selector types remain deferred to later stories in Epic `1`

### Story 1.4: Support Wildcard and Exclusion Selectors for Repeated Nested Structures

Implements: FR11, FR12, FR13

As a backend engineer,
I want one service redactor to support wildcard, recursive wildcard, and exclusion path selectors,
So that I can redact repeated nested sensitive fields without enumerating every path manually.

**Acceptance Criteria:**

**Given** path selectors for this story are configured at initialisation
**When** the factory validates them
**Then** it accepts root-relative string selectors with literal segments, `*`, and `**`
**And** it accepts exclusion segments only in structured selector form such as `['users', { ignore: 'admin' }, 'email']`
**And** regex-based property matching and regex-based path-segment matching remain unsupported in this story

**Given** a selector containing `*`
**When** the redactor is invoked on nested objects or arrays
**Then** `*` matches exactly one segment at that position
**And** only leaves reached through that one-segment match are redacted
**And** `users.*.email` matches `users.0.email` and `users.1.email` but not `users.profile.contact.email`

**Given** a selector containing `**`
**When** the redactor is invoked on nested structures of variable depth
**Then** `**` matches zero or more intermediate segments below that position
**And** matching descendant leaves are redacted in one pass
**And** `account.**.token` matches `account.token`, `account.session.token`, and `account.audit.session.token`

**Given** a structured selector containing an exclusion segment
**When** the redactor is invoked on sibling branches
**Then** the exclusion segment matches any single segment except the ignored key or index
**And** excluded branches remain unchanged
**And** `['users', { ignore: 'admin' }, 'email']` matches `users.alice.email` and `users.0.email` but not `users.admin.email`

**Given** a selector targets an array branch
**When** the redactor is invoked on indexed entries
**Then** array indices are treated as path segments
**And** wildcard matching applies to them
**And** `orders.*.cardNumber` redacts each entry’s `cardNumber` without requiring explicit numeric indices

**Given** a payload where the same leaf matches both an exact-path rule and a wildcard or exclusion selector
**When** redaction runs
**Then** the exact-path rule takes precedence
**And** that leaf is redacted once only

**Given** a payload containing both targeted and non-targeted branches
**When** wildcard or exclusion selectors are applied
**Then** only targeted values are redacted
**And** non-targeted sibling and excluded values remain unchanged in the returned result

**Given** invalid selector syntax for this story
**When** the factory initialises
**Then** initialisation fails with a validation error for partial wildcard text, more than one recursive wildcard segment in one selector, or exclusion syntax supplied in unsupported string-selector form
**And** no redactor is created

### Story 1.5: Match Sensitive Fields by Regex-Based Property Names

Implements: FR9

As a backend engineer,
I want one service redactor to support regex-based object property matching,
So that I can redact predictable sensitive fields even when property names vary within known patterns.

**Acceptance Criteria:**

**Given** regex-based property matching is configured through the public factory options
**When** the redactor is invoked on nested objects or arrays
**Then** properties whose names match the configured regular expression are redacted wherever they occur

**Given** a payload containing both matching and non-matching property names
**When** redaction runs
**Then** only the matched properties are redacted
**And** non-targeted sibling values remain unchanged in the returned result

**Given** a payload where the same leaf matches both an exact-path rule and a regex-based property rule
**When** redaction runs
**Then** the exact-path rule takes precedence
**And** that leaf is redacted once only

**Given** a configuration containing an invalid, unsupported, or unsafe property regular expression
**When** the factory initialises
**Then** initialisation fails with a validation error before any redactor is created

**Given** a JavaScript or TypeScript consumer
**When** regex-based property matching is configured through the public entrypoint
**Then** the supported option shape is typed and editor-discoverable

### Story 1.6: Match Sensitive Fields by Regex-Based Path Segments

Implements: FR10

As a backend engineer,
I want one service redactor to support regex-based path-segment matching in structured selectors,
So that I can redact sensitive values when only part of the path name varies within known patterns.

**Acceptance Criteria:**

**Given** regex-based path-segment matching is configured in structured selector form
**When** the redactor is invoked on a payload with matching segment names
**Then** only paths whose targeted segment matches the configured regular expression are redacted

**Given** a payload containing both matching and non-matching path segments
**When** redaction runs
**Then** only the matched paths are redacted
**And** non-targeted sibling values remain unchanged in the returned result

**Given** a payload where the same leaf matches both an exact-path rule and a regex-based path-segment rule
**When** redaction runs
**Then** the exact-path rule takes precedence
**And** that leaf is redacted once only

**Given** a payload where the same leaf matches both a regex-based path-segment rule and a regex-based property rule
**When** redaction runs
**Then** the path-segment rule takes precedence
**And** that leaf is redacted once only

**Given** a configuration containing an invalid, unsupported, or unsafe path-segment regular expression
**When** the factory initialises
**Then** initialisation fails with a validation error before any redactor is created

**Given** a JavaScript or TypeScript consumer
**When** regex-based path-segment matching is configured through the public entrypoint
**Then** the supported structured selector shape is typed and editor-discoverable

## Epic 2: Precisely Redact Sensitive Content Without Losing Safe Context

Developers can target only sensitive substrings and values, using precise replacement behaviour while keeping surrounding safe data useful.

### Story 2.1: Apply Literal Replacement, Removal, and Retain-Structure Handling

Implements: FR5

As a backend engineer,
I want matched targets to support literal replacement, removal, and structure retention with explicit fallback rules,
So that redacted output preserves only the safe context I still need for logs and diagnostics.

**Acceptance Criteria:**

**Given** a matched scalar target with no local override and no explicit global `censor` configured
**When** redaction runs
**Then** the library default censor fallback is applied
**And** the matched value is replaced with `[REDACTED]`

**Given** a matched target with a global literal `censor` configured and no local override
**When** redaction runs
**Then** the global censor value is applied to that matched target

**Given** a matched target with a local literal `censor` override
**When** redaction runs
**Then** the matched value is replaced with that literal override
**And** only the matched value is altered
**And** sibling values remain unchanged

**Given** a matched object-property target with `remove: true`
**When** redaction runs
**Then** the targeted property is omitted from the returned result
**And** no placeholder value is emitted for that property
**And** sibling values remain unchanged

**Given** a matched container target with `retainStructure: true`
**When** redaction runs
**Then** the matched container remains present in the returned result
**And** descendant matched values inside that container are redacted according to the applicable censor rule
**And** the surrounding parent shape is preserved

**Given** a local matched-rule override and a broader global default both apply to the same target
**When** redaction runs
**Then** the local override takes precedence for that matched rule only
**And** any unset local option falls back first to the compiled global default
**And** any still-unset option then falls back to the library default

**Given** a configuration combines `remove` with `censor` or `retainStructure` at the global level or within a per-path rule
**When** the factory initialises
**Then** initialisation fails immediately with a validation error
**And** no redactor is created

**Given** a payload containing both targeted and non-targeted branches
**When** redaction runs
**Then** only the targeted value or branch is altered
**And** unrelated siblings and branches remain unchanged

**Given** custom censor functions, same-length replacement, substring targeting, root-primitive targeting, fuzzy matching, and case-insensitive key matching
**When** this story is implemented
**Then** those behaviours remain out of scope for Story `2.1`

### Story 2.2: Support Function Censors and Same-Length String Replacement

Implements: FR5

As a backend engineer,
I want matched targets to support function censors and length-preserving string replacement,
So that I can tailor redacted output to the matched value while preserving only safe diagnostic cues.

**Acceptance Criteria:**

**Given** a matched target and a function censor is resolved for that target
**When** redaction runs
**Then** the censor is invoked once with exactly two arguments: the original matched `value` and a `context` object

**Given** a function censor `context` object
**When** it is exposed through the public API
**Then** its exact public shape is `FunctionCensorContext = { matchedPath: PathSegments, rulePath: PathSegments, rootInput: unknown, terminalKey?: string | number }`
**And** `matchedPath` is the canonical root-relative path to the matched target
**And** `rulePath` is the configured rule path that produced the match, expressed in the same path format
**And** `rootInput` is the original unmodified root input reference supplied to the redactor

**Given** a matched target with a final property key or array index
**When** the function censor context is created
**Then** `terminalKey` is present and contains that final key or index

**Given** the match is the root input
**When** the function censor context is created
**Then** `terminalKey` is omitted

**Given** both a local function censor and a broader global literal or function censor are configured
**When** redaction runs
**Then** the local function censor takes precedence for that matched rule only

**Given** a matched rule does not define a local censor
**When** redaction runs
**Then** the resolved censor falls back to the compiled global censor

**Given** neither a local censor nor a compiled global censor is defined
**When** redaction runs
**Then** the resolved censor falls back to the library default censor

**Given** a function censor returns a replacement value
**When** redaction runs
**Then** only the matched target is replaced with that returned value
**And** non-targeted siblings remain unchanged

**Given** `replaceStringByLength: true` and the resolved censor is a non-empty literal string
**When** the matched value is a string
**Then** the redacted output is produced by repeating and truncating that literal token so the final output length exactly matches the original string length

**Given** `replaceStringByLength: true` and the matched value is not a string
**When** redaction runs
**Then** same-length replacement is not applied
**And** the resolved censor output is used as-is

**Given** `replaceStringByLength: true` and the resolved censor is a function
**When** redaction runs
**Then** same-length replacement is not applied
**And** the function return value is used as-is

**Given** `replaceStringByLength: true` and the resolved literal censor is an empty string
**When** the factory initialises
**Then** initialisation fails with a validation error
**And** no redactor is created

**Given** a configuration sets `remove: true` together with `censor` or `retainStructure: true` on the same rule
**When** the factory initialises
**Then** initialisation fails with a validation error
**And** no redactor is created

**Given** a root primitive input such as a string
**When** this story is implemented
**Then** root-primitive targeting remains out of scope for Story `2.2`
**And** dedicated root-primitive matching behaviour is deferred to Story `2.4`

### Story 2.3: Redact Matched Substrings in Nested String Values

Implements: FR14, FR18

As a backend engineer,
I want ordered substring-targeting rules to partially redact nested string content,
So that I can protect embedded secrets without losing surrounding safe context.

**Acceptance Criteria:**

**Given** substring-targeting rules are configured through the public factory options
**When** the factory initialises
**Then** it accepts an ordered list of rules containing either bare `RegExp` tests or structured `{ pattern: RegExp, replacer: (value: string, pattern: RegExp) => string }` rules

**Given** a configured rule is invalid, unsafe, or fails regex validation
**When** the factory initialises
**Then** initialisation fails with a validation error
**And** no redactor is created

**Given** a configured pattern is empty, matches the empty string, or would create ambiguous zero-length matching behaviour
**When** the factory initialises
**Then** initialisation fails with a validation error

**Given** multiple substring rules are configured
**When** redaction runs
**Then** rules are evaluated in configuration order
**And** the first matching rule wins

**Given** a nested string value matches a bare `RegExp` rule
**When** redaction runs
**Then** the entire string value is redacted using the resolved whole-value censor behaviour for that match
**And** later substring rules are not applied to that value

**Given** a nested string value matches a structured substring rule
**When** redaction runs
**Then** the `replacer` is called once with the original string value and configured pattern
**And** the returned string is used as-is
**And** no later substring rules are applied to that value

**Given** a structured substring rule partially rewrites a string
**When** redaction runs
**Then** only the matched substrings are altered
**And** surrounding unmatched text remains unchanged

**Given** a string value does not match any substring rule
**When** redaction runs
**Then** that value is returned unchanged

**Given** a targeted value is not a string
**When** redaction runs
**Then** substring targeting is not applied to that value

**Given** substring targeting collides with key, path, or deep-key targeting
**When** this story is implemented
**Then** cross-target precedence remains deferred to the later precedence story

### Story 2.4: Redact Matching Root Primitive String Inputs

Implements: FR14

As a backend engineer,
I want a matching root primitive string to be redacted as one value,
So that I can protect secrets passed directly as a root string without substring callbacks altering the root input.

**Acceptance Criteria:**

**Given** the root input is a primitive string and it matches any configured substring rule
**When** redaction runs
**Then** the entire root string is redacted using whole-value censor behaviour

**Given** the root input is a primitive string and it matches a structured substring rule
**When** redaction runs
**Then** the structured `replacer` callback is not applied to the root input

**Given** the root input is a primitive string and it does not match any substring rule
**When** redaction runs
**Then** the original root string is returned unchanged

**Given** a root primitive is not a string
**When** redaction runs
**Then** substring targeting is not applied to that value

### Story 2.5: Deterministic Precedence Across Exact Path, Structured Path, Exact Key, Regex Property, and Substring Rules

Implements: FR15

As a backend engineer,
I want overlapping exact path, structured path, exact key, regex property, and substring rules to resolve in one deterministic order across the same nested payload,
So that sensitive data is redacted once without ambiguity or double application.

**Acceptance Criteria:**

**Given** one nested payload contains values that match more than one of these selector types in the same redaction call
**When** redaction runs
**Then** one redacted result is returned
**And** the matches are resolved using this ordered precedence ladder: exact path, structured path, exact key, regex property, substring

**Given** the same leaf matches an exact path rule and any lower-precedence rule
**When** redaction runs
**Then** the exact path rule wins
**And** the leaf is redacted once only

**Given** the same leaf matches a structured path rule and any lower-precedence rule other than an exact path rule
**When** redaction runs
**Then** the structured path rule wins
**And** the leaf is redacted once only

**Given** the same leaf matches an exact key rule and any lower-precedence rule other than an exact path or structured path rule
**When** redaction runs
**Then** the exact key rule wins
**And** the leaf is redacted once only

**Given** the same leaf matches a regex property rule and a substring rule
**When** redaction runs
**Then** the regex property rule wins
**And** substring replacement is not applied to that leaf

**Given** a matched container is redacted with `retainStructure: true`
**When** redaction runs
**Then** the container remains present in the output
**And** traversal continues into its descendants
**And** descendant substring matches are still applied unless that descendant is already fully redacted by a higher-precedence whole-value rule

**Given** overlapping rules are configured
**When** redaction runs repeatedly with the same input and configuration
**Then** the output is identical on every run

### Story 2.6: Enable Optional Fuzzy and Case-Insensitive Matching for Literal String Key Rules

Implements: FR6, FR7

As a backend engineer,
I want literal string key rules in `blacklistedKeys` to support optional fuzzy and case-insensitive matching,
So that I can redact variant field names without enumerating every naming or formatting variant.

**Acceptance Criteria:**

**Given** the story scope is limited to literal string key rules in `blacklistedKeys`
**When** global matching options are supplied through the public factory options
**Then** each literal string key rule inherits `fuzzyKeyMatch` and `caseSensitiveKeyMatch` unless that rule explicitly overrides either setting

**Given** two literal string key rules in the same redactor
**When** one rule defines local matching options and the other does not
**Then** the local options apply only to the rule that defines them
**And** they do not change the behaviour of the other rule

**Given** `fuzzyKeyMatch: false` and `caseSensitiveKeyMatch: true`
**When** the configured key is `PassCode`
**Then** only an exact case-sensitive match on `PassCode` is treated as a hit
**And** `passcode`, `passCode`, and `PASS-CODE` are not hits

**Given** `fuzzyKeyMatch: false` and `caseSensitiveKeyMatch: false`
**When** the configured key is `pass_code`
**Then** matching uses canonical equality after lowercasing, trimming, and removing `_` and `-`
**And** `pass_code`, `pass-code`, `passCode`, and ` PASS_CODE ` are treated as the same key

**Given** `fuzzyKeyMatch: true` and `caseSensitiveKeyMatch: true`
**When** the configured key is `pass`
**Then** any payload key containing `pass` with the same case is a hit
**And** `password` and `passcode` are hits
**And** `Password` is not

**Given** `fuzzyKeyMatch: true` and `caseSensitiveKeyMatch: false`
**When** the configured key is `pass_code`
**Then** matching uses canonical containment after lowercasing, trimming, and removing `_` and `-`
**And** `passcode`, `passCode`, and `PASS-CODE` are hits

**Given** a literal string key rule does not match under its active matching settings
**When** redaction runs
**Then** that rule is not applied to that payload key

**Given** a rule is configured with a `RegExp` key or a path selector is configured elsewhere in the same redactor
**When** redaction runs
**Then** `fuzzyKeyMatch` and `caseSensitiveKeyMatch` do not alter those rules’ matching behaviour

## Epic 3: Safely Redact Real Production Payloads

Developers can trust Deep Redact on circular, transformed, mixed, and partially unsupported payloads without post-init runtime failures.

### Story 3.1: Redact a Canonical Nested Mixed Payload Without Post-Init Runtime Throws

Implements: FR16, FR26

As a backend engineer,
I want one compiled redactor to process a canonical nested mixed payload in a single pass,
So that supported production payloads can be redacted safely without pre-normalising their shape.

**Acceptance Criteria:**

**Given** a redactor has been successfully initialised
**When** it is invoked on a canonical supported fixture containing nested objects and arrays with supported leaf values limited to `string`, `number`, `boolean`, `null`, and `undefined`
**Then** redaction completes without throwing
**And** one redacted result is returned

**Given** the canonical fixture contains both targeted and non-targeted branches
**When** redaction runs
**Then** targeted leaves are redacted according to the configured rules
**And** non-targeted sibling leaves remain unchanged in the returned result

**Given** the canonical fixture contains nested arrays within objects and nested objects within arrays
**When** redaction runs
**Then** the same targeting rules apply consistently across all nested branches in one invocation

**Given** the canonical fixture includes at least one targeted field in an object-in-array branch and at least one targeted field in an array-in-object branch
**When** redaction runs
**Then** both branches are redacted correctly within the same returned result

**Given** the same compiled redactor is invoked sequentially on two different instances of the canonical supported fixture
**When** the second call runs
**Then** it is evaluated independently of the first call
**And** no traversal state, cursor position, or branch-visitation state bleeds across invocations

**Given** this story’s scope
**When** the implementation is reviewed
**Then** circular references, transformed runtime values, custom transformers, ignored types, and localised `[UNSUPPORTED]` degradation remain out of scope for this story

### Story 3.2: Handle Circular References and Revisited Identities Safely

Implements: FR22

As a backend engineer,
I want one compiled redactor to process cyclic object graphs and repeated object identities in a single pass,
So that production payloads can be redacted safely without recursion failures or unstable alias handling.

**Acceptance Criteria:**

**Active circular edges**
- **Given** a supported input envelope limited to objects and arrays with leaf values already supported by Story `3.1`
  **When** the redactor encounters a direct self-reference on an object or array branch
  **Then** the circular edge is replaced with the public circular marker object `{ _transformer: 'circular', value: '', path: <current path> }`
  **And** non-circular sibling values remain intact
- **Given** a supported input contains a nested circular reference in an object-in-array branch or an array-in-object branch
  **When** redaction runs
  **Then** only the circular edge is replaced with the same public circular marker shape
  **And** the current object path is recorded in `path`
  **And** the original reference path is recorded in `value` when available
  **And** the surrounding parent structure is preserved
- **Given** two supported objects or arrays reference each other mutually
  **When** redaction runs
  **Then** each circular edge is handled deterministically using the public circular marker shape
  **And** the call completes without throwing

**Completed identity revisits**
- **Given** the same object or array identity is encountered again after it has already been fully traversed during the same redaction call
  **When** redaction runs
  **Then** the redactor does not descend into that identity a second time
  **And** the revisited branch appears in the returned result with deterministic output
  **And** the call completes without throwing
- **Given** a completed identity is revisited through the same effective rule context
  **When** redaction runs
  **Then** the already produced redacted result is reused for that revisited branch
- **Given** a completed identity is revisited through a different effective rule context
  **When** redaction runs
  **Then** the returned structure remains deterministic and path-correct without re-entering the completed subtree
- **Given** the same cyclic or aliased fixture is redacted repeatedly with the same configuration
  **When** redaction runs on separate invocations
  **Then** the output is identical on every run

**Scope guard**
- **Given** transformed runtime values, custom transformers, ignored types, and localised `[UNSUPPORTED]` degradation
  **When** this story is implemented
  **Then** those behaviours remain out of scope for Story `3.2`

### Story 3.3: Resolve Built-In and Custom Transformers Deterministically

Implements: FR23

As a backend engineer,
I want supported transformed runtime values to resolve through one deterministic transformer pipeline,
So that non-plain runtime values are converted safely before normal redaction continues.

**Acceptance Criteria:**

**Given** no ignored-value-type rule matches a value
**When** redaction encounters nested or root values of `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, or `URL`
**Then** redaction completes without throwing
**And** one result is returned

**Given** no custom transformer changes a `BigInt`
**When** redaction runs
**Then** the value becomes `{ _transformer: 'bigint', value: { radix: 10, number: '<decimal string>' } }`

**Given** no custom transformer changes a `Date`
**When** redaction runs
**Then** the value becomes `{ _transformer: 'date', datetime: '<ISO 8601 string>' }`

**Given** no custom transformer changes an `Error`
**When** redaction runs
**Then** the value becomes `{ _transformer: 'error', value: { type, message, stack } }`

**Given** no custom transformer changes a `Map`, `RegExp`, `Set`, or `URL`
**When** redaction runs
**Then** `Map` becomes `{ _transformer: 'map', value: <plain object from entries> }`
**And** `RegExp` becomes `{ _transformer: 'regex', value: { source, flags } }`
**And** `Set` becomes `{ _transformer: 'set', value: <array from values> }`
**And** `URL` becomes `{ _transformer: 'url', value: '<href string>' }`

**Given** a transformed object-like result such as a `Map`, `Set`, or `Error` payload contains descendant fields that match existing key or path rules
**When** no ignored-value-type rule matches that raw value
**And** redaction runs
**Then** traversal continues into the transformed representation
**And** matching descendants are redacted

**Given** custom transformers are registered in `byType`, `byConstructor`, and `fallback`
**When** a value matches more than one bucket
**Then** resolution uses the bucket order `byType`, `byConstructor`, `fallback`

**Given** more than one transformer is available within the same bucket
**When** redaction runs
**Then** user-registered transformers are evaluated in declaration order before the built-in default transformer for that bucket
**And** the first transformer returning a different value wins

**Given** a transformer wins for a value
**When** that value is resolved
**Then** later transformers in the same bucket and all lower-precedence buckets are not applied to that value

**Given** circular-reference handling, ignored-value-type behaviour, or transformer failure is involved
**When** this story is implemented
**Then** circular handling remains governed by Story `3.2`
**And** ignored-value-type semantics remain deferred to Story `3.4`
**And** localised `[UNSUPPORTED]` degradation remains deferred to Story `3.5`

### Story 3.4: Exclude Ignored Value Types from Descendant Redaction While Preserving Safe Output

Implements: FR23

As a backend engineer,
I want ignored-value-type rules to suppress descendant redaction inside selected transformed runtime values,
So that I can preserve chosen runtime values while still returning safe output.

**Acceptance Criteria:**

**Given** ignored-value-type rules are configured for supported transformed runtime values
**When** redaction evaluates a value
**Then** ignore matching is performed against the raw value before traversal enters that value

**Given** an ignored-value-type rule matches a raw `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, or `URL`
**When** redaction runs
**Then** the value is still resolved through the applicable safe-output transformer contract from Story `3.3`

**Given** an ignored-value-type rule matches a raw transformed runtime value
**When** its safe transformed representation is produced
**Then** key, path, and substring targeting are not applied within that value or its transformed representation

**Given** a nested ignored `Map`, `Set`, or `Error` would otherwise contain descendant matches
**When** redaction runs
**Then** those descendants remain unredacted because traversal does not continue into the ignored branch

**Given** an ignored-value-type rule does not match a raw transformed runtime value
**When** redaction runs
**Then** normal transformer resolution, traversal, and targeting continue for that value

**Given** one branch matches an ignored-value-type rule and another branch does not
**When** redaction runs
**Then** the ignored branch is excluded from descendant redaction
**And** unrelated branches continue through normal redaction processing

**Given** the root input is a supported transformed runtime value and it matches an ignored-value-type rule
**When** redaction runs
**Then** the returned root value is the safe transformed representation
**And** no further targeting is applied within it

**Given** transformer failure or localised `[UNSUPPORTED]` degradation occurs
**When** this story is implemented
**Then** that behaviour remains deferred to Story `3.5`

### Story 3.5: Degrade Nested Runtime Failures to `[UNSUPPORTED]` with Deterministic Diagnostics

Implements: FR24, FR25, FR27

As a backend engineer,
I want one failing nested value to degrade locally to `[UNSUPPORTED]` with deterministic sanitised diagnostics,
So that the rest of the payload remains usable and safely redacted without runtime throws.

**Acceptance Criteria:**

**Runtime recovery**
- **Given** a redactor has been successfully initialised
  **When** runtime processing for one nested value throws during transformer execution, function censor execution, substring replacer execution, or traversal of that value
  **Then** redaction does not throw
  **And** only that nested value is replaced with `[UNSUPPORTED]`
- **Given** a failing nested value occupies an object property position
  **When** redaction completes
  **Then** that property remains present with the value `[UNSUPPORTED]`
  **And** the parent object and all surviving ancestors remain present
- **Given** a failing nested value occupies an array element position
  **When** redaction completes
  **Then** that element position contains `[UNSUPPORTED]`
  **And** array length and surrounding element order are preserved
- **Given** a nested runtime failure occurs in one branch while other branches include transformed runtime values, circular references, or revisited identities
  **When** redaction completes
  **Then** only the failing branch degrades to `[UNSUPPORTED]`
  **And** non-failing branches continue to follow the contracts already defined by Stories `3.2`, `3.3`, and `3.4`
- **Given** more than one nested value fails during the same redaction call
  **When** redaction completes
  **Then** each failing node degrades independently to `[UNSUPPORTED]`
  **And** one failing node does not cause sibling or ancestor branches to be dropped or rethrown

**Diagnostics emission and sanitisation**
- **Given** one nested runtime failure is degraded to `[UNSUPPORTED]`
  **When** diagnostics are emitted
  **Then** exactly one structured diagnostic event is produced for that failing node
- **Given** a diagnostic event is produced for a nested runtime failure
  **When** the event is inspected
  **Then** it follows `DiagnosticEvent = { event, path, valueType, message, details? }`
- **Given** a diagnostic event is produced for a nested runtime failure
  **When** the event fields are populated
  **Then** `event` uses `dot.case` naming with `redaction.failure` as the default failure event
  **And** `path` uses canonical dot-path syntax
  **And** `valueType` is descriptive but sanitised
- **Given** failure-specific metadata is included in `details`
  **When** diagnostics are inspected
  **Then** `details` remains machine-readable and non-leaking
  **And** it may include sanitised error metadata
  **And** it must not include raw source values, partially redacted originals, or unsafe snippets from the failing value
- **Given** multiple nested failures occur in one redaction call
  **When** diagnostics are emitted
  **Then** each failing node produces its own structured diagnostic event
  **And** non-failing nodes do not emit failure events

**Scope guard**
- **Given** initialisation-time validation failures or optional `console.*` transport behaviour
  **When** this story is implemented
  **Then** initialisation failures remain out of scope
  **And** console transport behaviour remains deferred to Epic `4`

## Epic 4: Prove Redaction Quality in Operation

Teams can understand redaction outcomes, trust deterministic one-way behaviour, and safely use optional `console.*` redaction without recursion.

### Story 4.1: Return Deterministic Structured Output Across Repeated Runs

Implements: FR19

As a backend engineer,
I want structured redaction output to be stable across repeated runs on equivalent inputs,
So that I can trust regression tests and production behaviour when `serialise` is disabled.

**Acceptance Criteria:**

**Given** a named structured determinism fixture set and one compiled redactor with `serialise: false`
**When** equivalent fresh copies of the same named fixture are redacted repeatedly with the same configuration
**Then** the returned structured output is deeply equal to the fixture’s golden expected output on every run

**Given** the same compiled redactor has already processed different payloads
**When** the same named structured fixture is redacted again
**Then** the returned output is still deeply equal to that fixture’s golden expected output

**Given** a named `alias-same-context` fixture where two branches reach the same input identity under equivalent effective rule context
**When** redaction runs with structured output
**Then** the returned output preserves the expected shared-identity relationship defined by that fixture’s golden assertion on every run

**Given** a named `alias-different-context` fixture where two branches reach the same input identity under different effective rule context
**When** redaction runs with structured output
**Then** the returned output preserves the expected path-correct separation defined by that fixture’s golden assertion on every run

**Given** this story’s scope
**When** the implementation is reviewed
**Then** serialised-output determinism remains deferred to Story `4.2`
**And** traversal-lane equivalence, precedence explanation, restore exclusion, and console adapter behaviour remain deferred to later Epic `4` stories

### Story 4.2: Return Deterministic Serialised Output Across Repeated Runs

Implements: FR19

As a backend engineer,
I want serialised redaction output to be byte-stable across repeated runs on equivalent inputs,
So that logs, snapshots, and downstream consumers receive predictable output strings.

**Acceptance Criteria:**

**Given** a named serialised determinism fixture set and one compiled redactor with `serialise: true`
**When** equivalent fresh copies of the same named fixture are redacted repeatedly with the same configuration
**Then** the returned string output is byte-for-byte identical to the fixture’s golden expected string on every run

**Given** the same compiled redactor has already processed different payloads
**When** the same named serialised fixture is redacted again
**Then** the returned string is still byte-for-byte identical to that fixture’s golden expected string

**Given** `serialise` is configured with a deterministic custom serialiser function
**When** the same named fixture is redacted repeatedly with the same configuration
**Then** the custom-serialised string output is byte-for-byte identical on every run

**Given** one named fixture contains transformed values, circular markers, ignored branches, and `[UNSUPPORTED]` placeholders
**When** serialised output is produced repeatedly
**Then** the rendered string remains stable across runs
**And** matches the fixture’s golden expected string exactly

### Story 4.3: Prove Exact-Path Fast Lane and Generic Traversal Are Behaviourally Equivalent

Implements: FR19

As a backend engineer,
I want exact-path-eligible redaction to produce the same observable result whether executed through the fast lane or the generic traversal lane,
So that performance optimisation never changes redaction semantics.

**Acceptance Criteria:**

**Lane-control contract**
- **Given** the contract test harness for this story
  **When** lane equivalence is exercised
  **Then** the same compiled policy can be executed through a test-only lane override of `fast` or `generic`
  **And** that override is not exposed through the public factory API or any adapter entrypoint
- **Given** a control execution for a corpus fixture
  **When** the fixture is run without the test-only override
  **Then** the harness can verify whether the normal runtime selected the fast lane or the generic lane for that fixture

**Corpus contract**
- **Given** a fixture is admitted to the exact-path equivalence corpus
  **When** its configuration is reviewed
  **Then** every targeted selector in that fixture compiles to an exact static absolute path eligible for the fast lane
- **Given** a fixture is admitted to the exact-path equivalence corpus
  **When** its selector and matching surface are reviewed
  **Then** it excludes structured selectors, wildcard segments, recursive wildcards, ignore segments, regex path segments, key-only targeting, and substring-only targeting as the primary trigger for the asserted redaction outcome
- **Given** a fixture is admitted to the exact-path equivalence corpus
  **When** it is recorded in the corpus manifest
  **Then** the manifest includes the fixture name, the exact-path eligibility reason, the configuration, the golden expected structured output, and where relevant the golden expected serialised output

**Structured-output equivalence**
- **Given** a named corpus fixture with `serialise: false`
  **When** it is executed once through the forced `fast` lane and once through the forced `generic` lane
  **Then** the two structured outputs are deeply equal to each other
  **And** both are deeply equal to that fixture’s golden expected structured output

**Serialised-output equivalence**
- **Given** a named corpus fixture with `serialise: true`
  **When** it is executed once through the forced `fast` lane and once through the forced `generic` lane
  **Then** the two returned strings are byte-for-byte identical to each other
  **And** both match that fixture’s golden expected serialised output exactly
- **Given** a named corpus fixture uses a deterministic custom serialiser
  **When** it is executed through both forced lanes
  **Then** the custom-serialised output is byte-for-byte identical across lanes
  **And** matches that fixture’s golden expected serialised output exactly

**Scope guard**
- **Given** this story’s scope
  **When** the implementation is reviewed
  **Then** repeated-run determinism remains governed by Stories `4.1` and `4.2`
  **And** precedence explanation remains deferred to Story `4.4`
  **And** restore exclusion remains deferred to Story `4.5`
  **And** console adapter behaviour remains deferred to Story `4.6`

### Story 4.4: Publish and Prove a Normative Precedence Matrix for Overlapping Targeting Rules

Implements: FR20

As a backend engineer,
I want Deep Redact to publish one normative precedence matrix with fixture-backed examples and matching contract tests,
So that I can predict overlap resolution before trusting the output in production.

**Acceptance Criteria:**

**Normative contract**
- **Given** the public precedence contract for Deep Redact
  **When** it is published
  **Then** it defines one total precedence order using canonical terms only: `exact string-path`, `structured path`, `exact key`, `regex property`, `substring`
- **Given** the published precedence matrix
  **When** the total order is stated
  **Then** it defines this ordered ladder: `exact string-path` outranks `structured path`; `structured path` outranks `exact key`; `exact key` outranks `regex property`; `regex property` outranks `substring`
- **Given** the published precedence matrix
  **When** exact string-path rules overlap within the same layer
  **Then** it states that more specific canonical exact paths outrank less specific canonical exact paths
- **Given** the published precedence matrix
  **When** duplicate selectors collapse to the same canonical path within the same precedence layer
  **Then** it states that initialisation fails rather than resolving that collision at runtime
- **Given** the published precedence matrix
  **When** whole-value and partial-string overlap is defined
  **Then** it states that whole-value censor or removal outranks substring replacement
- **Given** the published precedence matrix
  **When** retained-container behaviour is defined
  **Then** it states that `retainStructure: true` preserves the matched container and allows descendant targeting to continue unless a higher-precedence whole-value rule has already claimed that descendant

**Fixture-backed examples**
- **Given** the published precedence contract
  **When** worked examples are provided
  **Then** the fixture set includes at least:
  - `path-versus-key`
  - `exact-key-versus-regex-property`
  - `whole-value-versus-substring`
  - `retain-structure-descendant-targeting`
  - `duplicate-canonical-path-init-failure`
- **Given** a worked precedence example is published
  **When** developers inspect it
  **Then** it includes the input fixture, the relevant configuration, and the final expected output or initialisation error outcome

**Executable proof**
- **Given** the precedence contract test suite
  **When** it is executed
  **Then** each rule in the normative precedence matrix is covered by explicit automated contract tests
- **Given** the fixture-backed examples and the contract test suite
  **When** they are maintained over time
  **Then** both documentation examples and automated tests use the same canonical fixture set so they cannot drift silently apart

### Story 4.5: Enforce a One-Way Redaction Deny-List Across Public Surface and Outputs

Implements: FR21

As a backend engineer,
I want Deep Redact to enforce an explicit one-way deny-list across its public surface and returned outputs,
So that redacted data cannot be reversed through supported API or output artefacts.

**Acceptance Criteria:**

**Public surface denial**
- **Given** the shipped public package surface, including all public factory exports, named aliases, compatibility aliases, and adapter entrypoints
  **When** that surface is enumerated
  **Then** it exposes no public export, method, option, or adapter entry whose purpose is to `restore`, `unredact`, `reveal`, `decode`, or otherwise reverse redaction output
- **Given** the public package surface is inspected
  **When** names and exported entrypoints are reviewed
  **Then** no restore-oriented alias or compatibility shim is present under any supported public name

**Structured-output denial**
- **Given** a representative structured-output fixture set covering ordinary redacted values, circular markers, transformed values, ignored branches, and `[UNSUPPORTED]` placeholders
  **When** structured outputs are inspected after redaction
  **Then** no enumerable property, non-enumerable property, symbol-keyed property, or attached metadata field contains the original sensitive value or a reversible handle to it
- **Given** a structured output fixture is inspected
  **When** object graph metadata is reviewed
  **Then** no lookup table, hidden original, restore token, encoded original payload, or reversible envelope is present anywhere in the returned output

**Serialised-output denial**
- **Given** a representative serialised-output fixture set covering the same output families
  **When** serialised outputs are inspected after redaction
  **Then** no restore token, reversible envelope, encoded original payload, or recoverable original-value field is present in the returned string
- **Given** transformed outputs such as circular markers, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, `URL`, or `[UNSUPPORTED]` placeholders appear in structured or serialised output
  **When** they are inspected
  **Then** they expose only the documented operational representation
  **And** no supported reverse path from that representation is documented or exposed through the public surface

**Documentation and proof**
- **Given** migration-facing or capability documentation describes divergences from `fast-redact` or prior Deep Redact versions
  **When** restore-related expectations are documented
  **Then** the documentation states explicitly that Deep Redact does not support restore or unredact capability
- **Given** the one-way redaction contract suite
  **When** it is executed
  **Then** it covers the deny-list against the public surface, structured outputs, and serialised outputs using explicit automated tests

### Story 4.6: Provide Optional `console.*` Redaction Through an Explicit Guarded Adapter

Implements: FR35, FR36

As a backend engineer,
I want to apply Deep Redact to application `console.*` logging through an explicit guarded adapter,
So that logs can be redacted without mutating global console state or creating recursive logging loops.

**Acceptance Criteria:**

**Adapter boundary**
- **Given** console integration is provided
  **When** the public package surface is reviewed
  **Then** it is exported only from a dedicated adapter entrypoint
  **And** the core runtime entrypoint has no dependency on that adapter module
- **Given** this story's integration model
  **When** console redaction is enabled
  **Then** application code must opt in by creating an adapted console surface around a supplied console-like target
  **And** no implicit singleton auto-hook or automatic global `console` monkeypatching occurs
- **Given** both the original console-like target and the adapted surface exist
  **When** calls are made through the original target
  **Then** those calls are not redacted merely because the adapter has been created
- **Given** the adapter is not imported or constructed
  **When** the core redactor is used normally
  **Then** no console-specific behaviour is activated
  **And** the core runtime contract remains unchanged

**Forwarding contract**
- **Given** a configured redactor and a supplied console-like target
  **When** the adapter constructs an adapted surface
  **Then** it exposes wrappers for the documented logging methods `log`, `info`, `warn`, `error`, `debug`, and `trace`
- **Given** one of those adapted methods is called with targeted and non-targeted arguments
  **When** the call is forwarded
  **Then** each argument is passed through the redactor independently
  **And** targeted arguments are redacted
  **And** non-targeted arguments preserve their original order and position
- **Given** an adapted method is invoked
  **When** the underlying console method is called
  **Then** the same method name is used
  **And** the variadic argument shape is preserved
  **And** the adapted method returns the underlying method's return value
- **Given** one argument degrades locally to `[UNSUPPORTED]` under the existing runtime contract
  **When** the adapted console call is forwarded
  **Then** the call still completes
  **And** only that argument reflects the degraded output

**Diagnostics and re-entrancy**
- **Given** Deep Redact emits an internal diagnostic while the console adapter is active and the Node fallback transport is in use
  **When** that diagnostic is written
  **Then** it bypasses the adapted console surface
  **And** it is emitted through the guarded diagnostics sink without triggering another redaction pass
- **Given** a synchronous emission would otherwise re-enter the adapted surface while one adapted console call is already in progress
  **When** the re-entrancy guard trips
  **Then** the nested adapter pass is blocked
  **And** the outer call still completes
  **And** at most one sanitised `console.recursion_blocked` diagnostic event is emitted for that blocked re-entry chain
- **Given** adapted application logging and Deep Redact diagnostics both occur during the same process lifetime
  **When** they are exercised together
  **Then** application log redaction continues to work
  **And** diagnostics remain sanitised
  **And** no infinite logging loop occurs

**Scope guard**
- **Given** richer console APIs such as `assert`, `dir`, `table`, `group*`, `time*`, and `count*`
  **When** this story is implemented
  **Then** those behaviours remain out of scope unless separately specified

## Epic 5: Roll Out, Migrate, and Standardise Adoption

Teams can migrate existing usage, verify cross-environment support, evaluate performance, and standardise Deep Redact with strong examples and guidance.

### Story 5.1: Define the Canonical Installation Verification Matrix and Baseline Fixtures

Implements: FR34

As a backend engineer,
I want one canonical installation-verification manifest and fixture set for the supported package ecosystems,
So that later verification stories execute against one stable source of truth rather than hand-maintained release steps.

**Acceptance Criteria:**

**Verification matrix contract**
- **Given** the installation verification source of truth
  **When** it is reviewed
  **Then** it is defined by one canonical manifest at `test/compatibility/install/matrix.json`
- **Given** the canonical install matrix manifest
  **When** it is inspected
  **Then** it defines exactly these named verification rows:
  - `npm-node22`
  - `npm-node24`
  - `pnpm-node22`
  - `pnpm-node24`
  - `yarn-node22`
  - `yarn-node24`
  - `bun-node22`
  - `bun-node24`
  - `deno-2`
- **Given** a row in the canonical install matrix manifest
  **When** it is inspected
  **Then** it records the fixture directory, runtime version, install command, run command, expected stdout file, and expected exit status for that row

**Baseline fixture contract**
- **Given** any row in the canonical install matrix manifest
  **When** its baseline smoke fixture is executed
  **Then** it uses the public factory entrypoint `deepRedact(...)`
  **And** it initialises a redactor with `paths: ['user.password', 'token']`
  **And** it redacts this canonical payload: `{ user: { password: 'secret' }, token: 'abc123', ok: true }`
  **And** it writes this canonical structured result to stdout in stable JSON form: `{"user":{"password":"[REDACTED]"},"token":"[REDACTED]","ok":true}`

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** executable verification across the Node package-manager rows remains deferred to Story `5.2`
  **And** Deno verification and installation-documentation lockstep remain deferred to Story `5.3`
  **And** migration, worked examples, benchmarks, and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.2: Execute Node Package-Manager Installation Verification Across Supported Node Runtimes

Implements: FR34

As a backend engineer,
I want the supported Node package-manager installation rows to execute from the canonical manifest in clean fixtures,
So that the Node-side support claims are release-proven by repeatable automation.

**Acceptance Criteria:**

**Node ecosystem verification**
- **Given** a Node ecosystem row of `npm-node22`, `npm-node24`, `pnpm-node22`, `pnpm-node24`, `yarn-node22`, `yarn-node24`, `bun-node22`, or `bun-node24`
  **When** release verification runs
  **Then** that row installs the package in a clean temporary fixture
  **And** executes its recorded run command successfully on the declared Node runtime
  **And** stdout matches the row's expected stdout file byte-for-byte

**Failure gate**
- **Given** any Node ecosystem row in the canonical install matrix manifest fails its install step, run step, exit-status check, or stdout comparison
  **When** release verification runs
  **Then** the verification run fails
  **And** that ecosystem support claim is not treated as release-proven

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** Deno verification and installation-documentation lockstep remain deferred to Story `5.3`
  **And** migration, worked examples, benchmarks, and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.3: Verify the Deno Baseline Path and Installation Documentation Lockstep

Implements: FR34

As a backend engineer,
I want the Deno baseline path and installation documentation to be proven from the same canonical install artefacts,
So that the final support matrix remains aligned with verified behaviour rather than release-note drift.

**Acceptance Criteria:**

**Deno verification**
- **Given** the `deno-2` row
  **When** release verification runs
  **Then** that row executes the documented Deno baseline usage path successfully on Deno `2.x`
  **And** stdout matches the row's expected stdout file byte-for-byte

**Documentation lockstep**
- **Given** installation documentation and baseline usage documentation are published
  **When** they are generated or validated in CI
  **Then** the published install commands and baseline usage snippets are derived from the same canonical install matrix manifest and fixture source
  **And** documentation drift causes the same verification workflow to fail

**Failure gate**
- **Given** the `deno-2` row or installation documentation lockstep fails
  **When** release verification runs
  **Then** the verification run fails
  **And** the affected support claim is not treated as release-proven

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** migration, worked examples, benchmarks, and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.4: Publish a Verified `fast-redact` Migration Matrix for Documented Scenarios

Implements: FR28, FR29

As a backend engineer,
I want documented `fast-redact` scenarios to map to Deep Redact v4 through a verified migration matrix of equivalents, rewrites, and divergences,
So that I can judge migration effort before changing production services.

**Acceptance Criteria:**

**Canonical matrix contract**
- **Given** the `fast-redact` migration source of truth
  **When** it is reviewed
  **Then** it is defined by one canonical manifest at `test/migration/fast-redact/matrix.json`
- **Given** the canonical `fast-redact` migration manifest
  **When** it is validated
  **Then** every row conforms to one strict JSON schema with these required fields: `id`, `classification`, `fixtureDir`, `fastRedactConfig`, `v4Action`, `assertionMode`, and `expectedResult`
- **Given** the canonical `fast-redact` migration manifest
  **When** a row is inspected
  **Then** `classification` is exactly one of `direct-equivalent`, `mechanical-rewrite`, or `intentional-divergence`
- **Given** the canonical `fast-redact` migration manifest
  **When** a row is inspected
  **Then** `assertionMode` is valid for that row classification and uses only declared enum values supported by the migration validator
- **Given** the canonical `fast-redact` migration manifest
  **When** a row is inspected
  **Then** `fixtureDir` points to a named fixture directory under `test/migration/fast-redact/fixtures/<id>/` containing the shared input payload, the expected v4 result or divergence artefact, and any row-specific notes required by the documentation generator

**Direct-equivalent rows**
- **Given** a row classified as `direct-equivalent`
  **When** migration validation runs
  **Then** the v4 configuration described by `v4Action` produces the row's expected result exactly for the shared fixture payload
  **And** that row is treated as a parity case in the generated migration documentation

**Mechanical-rewrite rows**
- **Given** a row classified as `mechanical-rewrite`
  **When** migration validation runs
  **Then** the rewritten v4 configuration described by `v4Action` produces the row's expected result exactly for the shared fixture payload
- **Given** a row classified as `mechanical-rewrite`
  **When** migration documentation is generated
  **Then** it shows the original `fast-redact` configuration, the rewritten v4 configuration, and the exact rewrite required for that row
- **Given** the mechanical-rewrite row set
  **When** it is reviewed before release
  **Then** it explicitly includes at least one admitted scenario covering the serialisation-option spelling difference between source and target configurations

**Intentional-divergence rows**
- **Given** a row classified as `intentional-divergence`
  **When** migration validation runs
  **Then** the row satisfies the alternative assertion defined by its `assertionMode` and `expectedResult` rather than being treated as a parity case
- **Given** a row classified as `intentional-divergence`
  **When** migration documentation is generated
  **Then** it states the `fast-redact` behaviour, the v4 behaviour, the migration action required, and the reason for divergence for that row
- **Given** the intentional-divergence row set
  **When** it is reviewed before release
  **Then** it explicitly includes admitted rows covering lack of `restore`, lack of `strict`, and `serialise` defaulting to `false` rather than implicit JSON serialisation

**Docs and validation lockstep**
- **Given** the published `fast-redact` migration guide and the migration validation suite
  **When** they are maintained over time
  **Then** both are generated from or validated directly against the same canonical migration manifest and fixture directories
  **And** documentation drift causes migration verification to fail

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** Deep Redact v3 migration remains deferred to Story `5.5`
  **And** worked examples remain deferred to Stories `5.6` to `5.8`
  **And** benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.5: Publish a Dedicated Deep Redact v3-to-v4 Migration Path

Implements: FR30

As a backend engineer,
I want a dedicated migration path from the class-based Deep Redact v3 API to the v4 function-first API,
So that I can move existing services without ambiguity about the required API and configuration changes.

**Acceptance Criteria:**

**Dedicated-track contract**
- **Given** Deep Redact v4 migration documentation is published
  **When** migration guides are reviewed
  **Then** the v3-to-v4 migration path exists as a dedicated track separate from the `fast-redact` migration guide
- **Given** the v3 migration guide
  **When** it is generated or validated
  **Then** it focuses on replacing the class-based API with the v4 function-first API and configuration model
  **And** it does not assume `fast-redact` reader intent or reuse `fast-redact` migration examples as its primary source

**Canonical manifest contract**
- **Given** the v3 migration source of truth
  **When** it is reviewed
  **Then** it is defined by one canonical manifest at `test/migration/v3/matrix.json`
- **Given** the canonical v3 migration manifest
  **When** it is validated
  **Then** every row conforms to one strict JSON schema with these required fields: `id`, `fixtureDir`, `v3Usage`, `v4Usage`, `migrationSteps`, `assertionMode`, and `expectedResult`
- **Given** the canonical v3 migration manifest
  **When** a row is inspected
  **Then** `fixtureDir` points to a named fixture directory under `test/migration/v3/fixtures/<id>/` containing the shared input payload, the expected migrated output artefact, and any row-specific notes required by the documentation generator
- **Given** the canonical v3 migration manifest
  **When** a row is inspected
  **Then** `assertionMode` uses only declared enum values supported by the v3 migration validator

**Migration coverage**
- **Given** the v3 migration row set
  **When** it is reviewed before release
  **Then** it explicitly includes admitted rows covering replacement of class instantiation with `deepRedact(...)`, replacement of v3 invocation patterns with the callable redactor function, and any documented option-name rewrites required for the supported migration path
- **Given** a row in the canonical v3 migration manifest
  **When** migration validation runs
  **Then** the `v4Usage` described by that row satisfies the row's `assertionMode` and produces the row's `expectedResult` exactly for the shared fixture payload
- **Given** a row in the canonical v3 migration manifest
  **When** migration documentation is generated
  **Then** it shows the original `v3Usage`, the replacement `v4Usage`, and the exact `migrationSteps` required for that row

**Docs and validation lockstep**
- **Given** the published v3 migration guide and the v3 migration validation suite
  **When** they are maintained over time
  **Then** both are generated from or validated directly against the same canonical v3 migration manifest and fixture directories
  **And** migration verification fails when the guide, manifest, or fixture outputs drift apart

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** worked examples remain deferred to Stories `5.6` to `5.8`
  **And** benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.6: Establish the Worked-Example Manifest and Validation Harness

Implements: FR31

As a backend engineer,
I want one canonical worked-example manifest and validator harness,
So that example coverage can expand in small verified slices without redefining the release machinery in every story.

**Acceptance Criteria:**

**Canonical example contract**
- **Given** the release-critical example source of truth
  **When** it is reviewed
  **Then** it is defined by one canonical manifest at `docs/examples/manifest.json`
- **Given** the canonical example manifest
  **When** it is validated
  **Then** every row conforms to one strict JSON schema with these required fields: `id`, `category`, `docTarget`, `sourceFile`, `fixtureDir`, `assertionMode`, and `expectedResultFile`
- **Given** the canonical example manifest
  **When** a row is inspected
  **Then** `category` is exactly one of `setup`, `targeting`, `replacement`, `output`, `runtime`, `console`, `migration-fast-redact`, or `migration-v3`
- **Given** the canonical example manifest
  **When** a row is inspected
  **Then** `assertionMode` uses only declared enum values supported by the example validator
  **And** each row covers one behaviour only
- **Given** the canonical example manifest
  **When** a row is inspected
  **Then** `fixtureDir` points to a named fixture directory under `docs/examples/fixtures/<id>/` containing the shared input payload and the artefacts required by that row's `assertionMode`

**Executable validation harness**
- **Given** a row in the canonical example manifest
  **When** example validation runs
  **Then** the example source identified by `sourceFile` is executed or evaluated against its paired fixture directory using the semantics defined by that row's `assertionMode`
- **Given** any row fails schema validation, fixture resolution, example execution, assertion-mode evaluation, or expected-result comparison
  **When** example validation runs
  **Then** the validation run fails
  **And** that example is not treated as release-proven

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** release-critical non-migration worked examples remain deferred to Story `5.7`
  **And** migration worked examples and example-documentation lockstep remain deferred to Story `5.8`
  **And** benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.7: Publish Verified Worked Examples for Setup, Targeting, Replacement, Output, Runtime, and Console Behaviour

Implements: FR31

As a backend engineer,
I want verified worked examples for the core Deep Redact feature surface,
So that evaluators can prove setup and runtime capability from executable examples before consulting migration guidance.

**Acceptance Criteria:**

**Required coverage matrix**
- **Given** the canonical example manifest
  **When** the admitted non-migration example set is reviewed before release
  **Then** it includes at least one distinct row covering each of these behaviours:
  - singleton setup
  - key targeting
  - regex-based object property matching
  - object-path targeting
  - regex-based object path segment matching
  - substring targeting
  - root-primitive redaction
  - replacement and removal behaviour
  - retain-structure handling
  - same-length string replacement
  - structured versus serialised output
  - ignored-value-type configuration
  - custom transformer configuration
  - graceful error replacement
  - optional `console.*` redaction
- **Given** the admitted non-migration example rows
  **When** they are reviewed
  **Then** they use only the categories `setup`, `targeting`, `replacement`, `output`, `runtime`, or `console`

**Executable validation**
- **Given** a non-migration row in the canonical example manifest
  **When** validation completes
  **Then** the produced result matches the row's `expectedResultFile` exactly under that assertion mode

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** migration worked examples and example-documentation lockstep remain deferred to Story `5.8`
  **And** benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.8: Publish Verified Migration Worked Examples and Enforce Example Documentation Lockstep

Implements: FR31

As a backend engineer,
I want migration worked examples and published example documentation to stay locked to the same canonical artefacts,
So that release examples remain both executable and trustworthy across migration tracks.

**Acceptance Criteria:**

**Migration example coverage**
- **Given** the canonical example manifest
  **When** the admitted migration example set is reviewed before release
  **Then** it includes at least one `migration-fast-redact` row and at least one `migration-v3` row
- **Given** migration example rows in the canonical example manifest
  **When** they are reviewed
  **Then** `migration-fast-redact` rows reuse the canonical migration fixtures from Story `5.4`
  **And** `migration-v3` rows reuse the canonical migration fixtures from Story `5.5`
- **Given** a migration row in the canonical example manifest
  **When** validation completes
  **Then** the produced result matches the row's `expectedResultFile` exactly under that row's assertion mode

**Documentation lockstep**
- **Given** a published worked example in release documentation
  **When** it is rendered to its `docTarget`
  **Then** it is generated from or validated directly against the same manifest row, source file, fixture directory, and expected result used by example validation
- **Given** the published examples and the example validation suite
  **When** they are maintained over time
  **Then** documentation drift causes the same validation workflow to fail

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** benchmarks and platform-adoption guidance remain deferred to later Epic `5` stories

### Story 5.9: Produce Canonical Benchmark Runs and Publish Benchmark Artefacts

Implements: FR37

As a platform evaluator,
I want canonical benchmark runs and published Deep Redact benchmark artefacts,
So that performance evidence exists as inspectable release artefacts before any gating policy is enforced.

**Acceptance Criteria:**

**Canonical benchmark contract**
- **Given** the benchmark source of truth
  **When** it is reviewed
  **Then** it is defined by one canonical manifest at `test/bench/manifest.json`
- **Given** the canonical benchmark manifest
  **When** it is validated
  **Then** every benchmark row conforms to one strict JSON schema with these required fields: `id`, `fixtureDir`, `workloadClass`, `competitor`, `runtime`, `command`, `outputArtefact`, and `thresholdPolicy`
- **Given** the canonical benchmark manifest
  **When** a row is inspected
  **Then** `competitor` is explicitly declared
  **And** comparable path-based rows use `fast-redact` as the comparator
- **Given** the canonical benchmark manifest
  **When** a row is inspected
  **Then** `thresholdPolicy` defines the row's pass/fail contract using declared fields for comparator metric, minimum overhead percentage, maximum overhead percentage, and run scope

**Measurement and artefact contract**
- **Given** a comparable path-based benchmark row
  **When** the benchmark is executed
  **Then** the benchmark uses the immutable workload fixture identified by `fixtureDir`
  **And** records both the Deep Redact result and the comparator result needed to compute overhead for that row
- **Given** a comparable benchmark row against `fast-redact`
  **When** overhead is computed
  **Then** the row uses one declared formula: `((deep-redact - fast-redact) / fast-redact) * 100`
- **Given** a row in the canonical benchmark manifest
  **When** it is executed
  **Then** it produces the declared `outputArtefact` under `test/artefacts/benchmarks/`
- **Given** a published benchmark artefact
  **When** it is inspected
  **Then** it includes the benchmark `id`, workload class, runtime, benchmark conditions, comparator identity, measured raw values, computed overhead percentage where applicable, and the threshold decision for that row

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** release-gate enforcement and benchmark-documentation lockstep remain deferred to Story `5.10`
  **And** broader platform-adoption guidance remains deferred to Story `5.11`

### Story 5.10: Enforce the Release Benchmark Gate and Benchmark Documentation Lockstep

Implements: FR37

As a platform evaluator,
I want benchmark thresholds and published benchmark documentation to be enforced from the same canonical artefacts,
So that release performance claims fail closed when benchmark evidence drifts or falls outside the agreed range.

**Acceptance Criteria:**

**Release gate**
- **Given** a comparable path-based benchmark row whose `thresholdPolicy.runScope` includes protected branches or release candidates
  **When** release benchmark verification runs in that scope
  **Then** the computed Deep Redact overhead remains within that row's declared minimum and maximum overhead percentages
- **Given** a comparable path-based benchmark row exceeds its declared threshold policy in protected-branch or release-candidate scope
  **When** release benchmark verification runs
  **Then** the verification run fails
  **And** the release is not treated as performance-proven
- **Given** a benchmark run outside a row's declared gate scope, such as an ordinary pull request
  **When** benchmark verification runs
  **Then** benchmark artefacts are still emitted for visibility
  **And** threshold enforcement is not treated as a release gate for that run type

**Docs and verification lockstep**
- **Given** published benchmark documentation and release benchmark verification
  **When** they are maintained over time
  **Then** both are generated from or validated directly against the same canonical benchmark manifest and published artefacts
  **And** drift causes benchmark verification to fail

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** broader platform-adoption guidance remains deferred to Story `5.11`

### Story 5.11: Publish Platform-Adoption Guidance Through a Canonical Standardisation Guide

Implements: FR38

As a platform or security evaluator,
I want one canonical Deep Redact standardisation guide covering supported capabilities, targeting semantics, migration expectations, and release evidence,
So that I can decide whether to standardise the library at service root before rollout.

**Acceptance Criteria:**

**Canonical guide contract**
- **Given** the platform-adoption guidance source of truth
  **When** it is reviewed
  **Then** it is defined by one canonical document at `docs/platform/standardisation-guide.md`
- **Given** the canonical standardisation guide
  **When** documentation validation runs
  **Then** it contains these required section headings exactly once:
  - `Supported capabilities`
  - `Targeting semantics`
  - `Migration expectations`
  - `Verification evidence`
  - `Adoption decision scope`

**Supported capabilities contract**
- **Given** the `Supported capabilities` section
  **When** it is validated
  **Then** it uses only the canonical public capability terms already established in the validated release artefacts
  **And** it explicitly includes links to the validated worked examples or source artefacts covering:
  - key targeting
  - path targeting
  - regex property matching
  - substring targeting
  - replacement behaviour
  - structured versus serialised output
  - transformer support
  - ignored-value-type behaviour
  - graceful `[UNSUPPORTED]` degradation
  - optional `console.*` redaction
- **Given** the `Supported capabilities` section
  **When** it is validated
  **Then** it explicitly states that Deep Redact is one-way only
  **And** that no `restore` or `unredact` capability is supported

**Targeting semantics contract**
- **Given** the `Targeting semantics` section
  **When** it is validated
  **Then** it uses exactly these precedence terms in this order: `exact string-path`, `structured path`, `exact key`, `regex property`, `substring`
- **Given** the `Targeting semantics` section
  **When** it is validated
  **Then** it states the published precedence ladder and the effect of `retainStructure: true` on descendant targeting
  **And** it links to the canonical precedence contract artefacts validated by Story `4.4`

**Migration expectations contract**
- **Given** the `Migration expectations` section
  **When** it is validated
  **Then** it contains distinct subsections for `fast-redact` migration and Deep Redact v3 migration
- **Given** the `Migration expectations` section
  **When** it is validated
  **Then** the `fast-redact` subsection links to the canonical migration artefacts from Story `5.4`
  **And** the v3 subsection links to the canonical migration artefacts from Story `5.5`
- **Given** the `Migration expectations` section
  **When** it is validated
  **Then** it explicitly states the intentional `fast-redact` divergences already validated for v4
  **And** it does not introduce migration claims that are not backed by those canonical migration artefacts

**Verification evidence contract**
- **Given** the `Verification evidence` section
  **When** it is validated
  **Then** it links to the canonical installation verification matrix, worked-example manifest, and benchmark artefacts produced by Stories `5.1` to `5.3`, `5.6` to `5.8`, and `5.9` to `5.10`
- **Given** the `Verification evidence` section
  **When** it is validated
  **Then** it states the supported installation environments and benchmark evidence boundary using only claims already proven by those linked artefacts

**Guide-validation gate**
- **Given** the published standardisation guide
  **When** release documentation validation runs
  **Then** validation fails if any required section is missing, duplicated, missing required links, uses non-canonical precedence terms, or introduces unsupported capability or migration claims
- **Given** the published standardisation guide and the canonical release artefacts
  **When** they are maintained over time
  **Then** the guide is generated from or validated directly against those same artefacts
  **And** guidance drift causes documentation verification to fail

## Epic 6: Pre-Release Hardening

Address all items deferred from code reviews of Stories 2.2, 4.2, 4.3, 5.5, 5.6, 5.8, 5.9, 5.10, and 5.11, resolving runtime correctness gaps, test corpus coverage gaps, and script robustness issues before the v4.0.0 release.

### Story 6.1: Fix Inherited Key-Rule Policy Override Under retainStructure

As a backend engineer,
I want a `retainStructure: true` key rule to preserve its inherited policy for all descendants,
so that a descendant whose key independently matches a different key rule does not silently displace the parent's intended policy.

**Deferred from:** Story 2.2 code review.

**Acceptance Criteria:**

**Inherited policy under retainStructure**
- **Given** a key rule matching key `A` with `retainStructure: true`, and a separate key rule matching key `B` with a distinct literal censor value
  **When** `A` is a container holding a descendant `B` and another key `C` with no matching rule
  **And** redaction runs on a payload containing `{ A: { B: <sensitive>, C: <safe> } }`
  **Then** `A` is retained as a container in the returned result (not replaced with any censor value)
  **And** `B` inside `A` is redacted using its own rule's censor value (not any censor inherited from rule `A`)
  **And** `C` remains unchanged

- **Given** a key rule matching key `A` with `retainStructure: true` and `censor: '[STRUCT]'`, and a separate key rule matching key `B` with `censor: '[SECRET]'`
  **When** `B` is a nested key inside `A`
  **And** redaction runs
  **Then** the returned container for `A` is retained with its structure preserved
  **And** the value for `B` inside `A` is `'[SECRET]'`, not `'[STRUCT]'`

- **Given** a key rule matching key `A` with `retainStructure: true` and a descendant key `B` that does NOT independently match any rule
  **When** redaction runs on a payload containing `{ A: { B: <value> } }`
  **Then** `A` is retained as a container
  **And** `B` is not redacted

- **Given** a key rule matching key `A` with `retainStructure: true`, and a separate key rule matching key `B` with `remove: true`
  **When** redaction runs on a payload containing `{ A: { B: <sensitive>, C: <safe> } }`
  **Then** `A` is retained as a container in the returned result
  **And** property `B` is absent from the returned result
  **And** `C` remains unchanged

**Regression guard**
- **Given** the full existing test suite for key-based redaction, retainStructure behaviour, and policy precedence
  **When** Story 6.1 is implemented
  **Then** all pre-existing tests pass without modification

### Story 6.2: Extend Exact-Path Equivalence Corpus to Cover Deferred Selector Scenarios

As a backend engineer,
I want the exact-path equivalence corpus to cover all deferred selector scenarios,
so that the behavioural equivalence proof between the fast lane and generic traversal lane is complete.

**Deferred from:** Story 4.3 code review (7 items).

**Acceptance Criteria:**

**Corpus extension**
- **Given** the exact-path equivalence corpus established by Story 4.3
  **When** Story 6.2 is implemented
  **Then** all selector scenarios explicitly deferred in the Story 4.3 code review are admitted to the equivalence corpus
  **And** each admitted fixture is recorded in the corpus manifest with: fixture name, exact-path eligibility reason, configuration, golden expected structured output, and where relevant golden expected serialised output

- **Given** each newly admitted corpus fixture
  **When** its selector configuration is reviewed
  **Then** every targeted selector in that fixture compiles to an exact static absolute path eligible for the fast lane
  **And** no fixture in the corpus uses wildcard, recursive-wildcard, ignore, regex path-segment, or key-only targeting as the primary trigger for the asserted redaction outcome

**Equivalence proof for new fixtures**
- **Given** each newly admitted exact-path corpus fixture with `serialise: false`
  **When** it is executed once through the forced `fast` lane and once through the forced `generic` lane
  **Then** both structured outputs are deeply equal to each other
  **And** both are deeply equal to that fixture's golden expected structured output

- **Given** each newly admitted exact-path corpus fixture with `serialise: true`
  **When** it is executed through both forced lanes
  **Then** both serialised outputs are byte-for-byte identical to each other
  **And** both match that fixture's golden expected serialised output

**Completeness verification**
- **Given** the extended corpus
  **When** the list of open deferred items from the Story 4.3 code review is reviewed
  **Then** every open item is either admitted to the corpus with a fixture or explicitly documented as out of scope with a justification
  **And** no deferred item remains unresolved without a recorded decision

### Story 6.3: Harden Structured-Determinism Fixture Set and Symbol Serialisation Guard

As a backend engineer,
I want the structured-determinism fixture set to be robust against trivial cross-contamination test reduction and worker-boundary serialisation loss,
so that the determinism tests remain meaningful under fixture pruning and do not fail silently under fork-based test runners.

**Deferred from:** Story 4.2 code review (2 items).

**Acceptance Criteria:**

**Cross-contamination guard**
- **Given** the structured-determinism fixture set
  **When** any single fixture is removed from the set
  **Then** the remaining fixtures still provide meaningful determinism coverage
  **And** removing one fixture does not cause all remaining determinism assertions to trivially pass
  **And** each fixture asserts at least one behaviour not asserted by any other fixture in the set

- **Given** the fixture independence requirement
  **When** the fixture set is reviewed
  **Then** independence is documented in a fixture manifest or inline comments
  **And** fixtures that would be trivial subsets of each other are consolidated or removed

**Symbol serialisation guard**
- **Given** a structured-determinism fixture whose redacted output contains Symbol-keyed properties or Symbol values
  **When** that fixture is run in a fork-based or worker-based test runner that serialises results across a process boundary
  **Then** the test harness detects potential symbol serialisation loss before the equality assertion is evaluated
  **And** if symbol data would be lost across the process boundary, the test fails with a descriptive error rather than silently passing with a corrupted assertion

- **Given** a determinism fixture whose redacted output contains no Symbol-keyed properties
  **When** the symbol guard runs
  **Then** the guard does not introduce false failures for that fixture
  **And** the test passes or fails correctly on its deep-equality assertion alone

**Regression guard**
- **Given** the full existing structured-determinism test suite
  **When** Story 6.3 is implemented
  **Then** all pre-existing determinism tests continue to assert the same golden outputs
  **And** no existing test is weakened or removed without explicit justification

### Story 6.4: Harden v3 Migration Validation Scripts

As a backend engineer,
I want the v3 migration validation scripts to handle edge cases, CRLF line endings, malformed JSON, config typos, and reporting gaps robustly,
so that contributors receive clear error messages and validation failures are never silently swallowed.

**Deferred from:** Story 5.5 code review (7 items).

**Acceptance Criteria:**

**CRLF line endings**
- **Given** a v3 migration manifest or fixture file that uses CRLF line endings
  **When** the v3 migration validation script processes that file
  **Then** the script normalises line endings before parsing
  **And** validation completes without error due to line-ending differences
  **And** the migration assertion is evaluated against the normalised content

**Malformed JSON input**
- **Given** a v3 migration manifest or fixture file that contains malformed JSON
  **When** the v3 migration validation script processes that file
  **Then** the script fails with a clear descriptive error identifying the file path and the parse error location
  **And** no partial validation output is silently emitted
  **And** the script exits with a non-zero exit code

**Config typos and schema violations**
- **Given** a v3 migration manifest row that contains an unrecognised field name or a misspelt required field
  **When** the v3 migration validation script processes that row
  **Then** the script fails with a clear error identifying the row `id` and the offending field
  **And** the error message distinguishes between an unrecognised field and a missing required field
  **And** subsequent rows are not silently processed after a schema violation is detected

**Reporting gaps**
- **Given** the v3 migration validation script processes a batch of manifest rows with mixed pass and fail outcomes
  **When** validation completes
  **Then** the summary report lists every failing row by `id`, the nature of the failure (schema, assertion, or fixture resolution), and the fixture directory path
  **And** the summary report states the total pass count, fail count, and skip count
  **And** no failing row is silently omitted from the summary

**No silent failure swallowing**
- **Given** any internal error during v3 migration validation (file I/O failure, unexpected exception, or assertion timeout)
  **When** that error occurs
  **Then** the script emits the error details to stderr
  **And** the script exits with a non-zero exit code
  **And** no partial or misleadingly positive result is written to stdout

**Regression guard**
- **Given** the existing v3 migration validation corpus from Story 5.5
  **When** Story 6.4 is implemented
  **Then** all currently-passing migration rows continue to pass
  **And** the hardening changes do not alter validation semantics for well-formed inputs

### Story 6.5: Harden Example Validation and Documentation Generation Scripts

As a backend engineer,
I want example validation and documentation generation scripts to handle malformed manifests, untested error fields, and unsafe Markdown output robustly,
so that failures surface with clear context and generated documentation remains structurally sound regardless of source content.

**Deferred from:** Story 5.6 and 5.8 code reviews (6 items).

**Acceptance Criteria:**

**Malformed manifest handling**
- **Given** an example manifest that fails JSON schema validation (missing required fields, wrong field types, or unrecognised `category` values)
  **When** the example validation script processes that manifest
  **Then** the script fails with a clear error identifying the row `id` and the violated schema constraint
  **And** the script exits with a non-zero exit code
  **And** no partial validation output is emitted for rows processed after the first schema failure

- **Given** an example manifest row whose `fixtureDir` does not exist or does not contain the expected artefacts
  **When** the example validation script processes that row
  **Then** the script fails with a clear error identifying the missing fixture path
  **And** the error is distinct from a schema validation error

**Untested error fields**
- **Given** an example fixture whose expected result includes an error output (for example, a row asserting an initialisation failure)
  **When** the example validation script evaluates that row
  **Then** the script validates the error output against the row's `expectedResultFile`
  **And** the assertion does not silently pass when the error field is absent from the actual result

**Unsafe Markdown output**
- **Given** the documentation generation script produces Markdown from example fixture content
  **When** that content includes characters that would create invalid Markdown (for example, unescaped backticks in inline code, unclosed fenced code blocks, or embedded content that alters document structure)
  **Then** the generation script detects and escapes or rejects the offending content
  **And** the generated Markdown is structurally well-formed and parses without error under a standard Markdown parser

**Reporting completeness**
- **Given** the example validation script processes a batch of manifest rows with mixed pass and fail outcomes
  **When** validation completes
  **Then** the summary report includes every failing row with its `id`, `category`, and failure reason
  **And** no failing row is silently omitted

**Regression guard**
- **Given** the existing canonical example manifest and fixture set from Stories 5.6 and 5.8
  **When** Story 6.5 is implemented
  **Then** all currently-passing example rows continue to pass
  **And** the hardening changes do not alter validation semantics for well-formed inputs

### Story 6.6: Harden Benchmark Runner and Release Gate Scripts

As a platform evaluator,
I want the benchmark runner and release gate scripts to handle edge cases, unknown competitors, missing flags, and platform-provenance information robustly,
so that CI failures are diagnosable and benchmark artefacts accurately reflect their generating environment.

**Deferred from:** Story 5.9 and 5.10 code reviews (8 items).

**Acceptance Criteria:**

**Unknown competitor handling**
- **Given** a benchmark manifest row whose `competitor` field names a package that cannot be resolved in the benchmark environment
  **When** the benchmark runner processes that row
  **Then** the runner fails with a clear error identifying the row `id` and the unresolvable competitor
  **And** no benchmark result is emitted for that row
  **And** the runner exits with a non-zero exit code

**Missing required flags**
- **Given** the benchmark runner or release gate script is invoked without a required flag (for example, `--runtime` or `--artefact-dir`)
  **When** the script initialises
  **Then** it fails immediately with a usage error identifying the missing flag by name
  **And** no partial benchmark run is started

**Platform-provenance information**
- **Given** a benchmark artefact is written to `test/artefacts/benchmarks/`
  **When** the artefact is inspected
  **Then** it includes platform-provenance fields: operating system, Node.js or runtime version, CPU model, and benchmark timestamp
  **And** these fields are populated from the actual runtime environment at the time of the benchmark run
  **And** they are not hard-coded or inferred from configuration alone

**Artefact structural integrity**
- **Given** the benchmark runner completes a row
  **When** the output artefact is written
  **Then** the artefact is valid JSON
  **And** all required fields (`id`, `workloadClass`, `runtime`, `thresholdDecision`) are present and non-null
  **And** `overheadPct` is present and numeric for all comparable path-based rows

**Release gate robustness**
- **Given** the release gate script encounters a benchmark artefact whose `overheadPct` field is missing, null, or non-numeric
  **When** the gate evaluates that artefact
  **Then** the gate fails with a clear error identifying the artefact path and the missing or invalid field
  **And** the gate does not silently pass on an invalid artefact

**Regression guard**
- **Given** the existing benchmark manifest and artefact set from Stories 5.9 and 5.10
  **When** Story 6.6 is implemented
  **Then** all existing well-formed benchmark rows continue to produce correct artefacts
  **And** the hardening changes do not alter benchmark measurement or comparison semantics for valid inputs

### Story 6.7: Harden Standardisation Guide Generation Scripts

As a platform or security evaluator,
I want the standardisation guide generation scripts to validate their inputs, handle errors gracefully, and produce structurally correct output under all manifest states,
so that guide generation fails visibly rather than silently and the rendered Markdown is always well-formed.

**Deferred from:** Story 5.11 code review (7 items).

**Acceptance Criteria:**

**Input validation before generation**
- **Given** the standardisation guide generation script is invoked
  **When** it loads the canonical artefact sources (example manifest, migration manifests, benchmark manifest, precedence contract)
  **Then** it validates each source against its expected schema before using it to generate content
  **And** if any source fails validation, the script fails with a clear error identifying the source file and the constraint violated
  **And** no partially-generated guide is written to the output path

**Required section headings enforced**
- **Given** the guide generation script runs to completion
  **When** the output file is inspected
  **Then** it contains each of the five required section headings exactly once: `Supported capabilities`, `Targeting semantics`, `Migration expectations`, `Verification evidence`, `Adoption decision scope`
  **And** if any required heading would be missing from the generated output, the generation script fails with a clear error before writing the file

**Link resolution**
- **Given** the guide generation script emits links to canonical artefacts
  **When** those links are validated after generation
  **Then** each emitted link references an artefact that exists at the declared path at generation time
  **And** if any linked artefact is absent, the generation script fails with a clear error before writing the guide

**Error handling during generation**
- **Given** any I/O error, missing source file, or unexpected exception during guide generation
  **When** that error occurs
  **Then** the script emits the error details to stderr and exits with a non-zero exit code
  **And** no incomplete or truncated guide is written to the output path

**Structurally well-formed Markdown output**
- **Given** the generated standardisation guide
  **When** it is parsed by a standard Markdown parser
  **Then** it contains no unclosed fenced code blocks, no mismatched heading levels, and no embedded content that would corrupt its rendered structure

**Idempotency**
- **Given** the guide generation script is run twice with identical source artefacts
  **When** both outputs are compared
  **Then** the outputs are byte-for-byte identical
  **And** the second run does not fail due to the output file already existing

**Regression guard**
- **Given** the existing standardisation guide generation scenario from Story 5.11
  **When** Story 6.7 is implemented
  **Then** the generated guide continues to satisfy all section, link, and content requirements defined in Story 5.11's acceptance criteria
  **And** the hardening changes do not alter generated content for valid inputs

## Epic 7: Deliver Production-Credible Performance on Path-Based Workloads

Developers can use Deep Redact on path-based workloads with performance comparable to `fast-redact`, backed by published benchmark evidence, and trust that the library is safe under hostile or adversarial inputs.

**Background:** The `path-based-single-object-node24` benchmark artefact in `test/artefacts/benchmarks/` records a `thresholdDecision.passed: false` with an `overheadPct` of 5566.4% against a `maxOverheadPct` release ceiling of 60 (with `25–50%` retained as the aspirational optimisation target). The gap exists because the general traversal algorithm allocates per-call state (WeakMaps, frozen path-segment arrays, canonical path strings) and walks the full object graph on every invocation, while fast-redact compiles exact paths into direct property accessors at init time and executes them with near-zero per-call overhead.

This epic closes the gate through a compiled path executor for exact-path-only configurations and targeted hot-path allocation reductions in the general traversal.

### Story 7.1: Implement Compiled Path Executor for Exact-Path-Only Configurations

As a platform or performance engineer,
I want the redactor to use compiled direct path operations at runtime when configured exclusively with exact string paths,
so that the `path-based-single-object-node24` benchmark gate of ≤60% overhead vs fast-redact is met (with ≤50% as the aspirational target).

**Motivation:** When all entries in `paths` are exact string selectors (no `*`, `**`, `!<key>`, `!<index>`, regex segments, or bracket-quoted wildcard syntax) and no `keys`, `stringTests`, `fuzzyKeyMatch`, or `caseSensitiveKeyMatch: false` options are present, the general traversal algorithm's fixed per-call cost (three WeakMap constructions, `Object.freeze` on every path-segment array, `Object.defineProperty` on every output property, canonical path string concatenation per node) dominates the measured time. For a small object with four exact paths, this overhead is approximately 56× fast-redact. A compiled executor compiled at init time eliminates these fixed costs from the hot path.

**Acceptance Criteria:**

> **Course-corrected 2026-05-25** (Sprint Change Proposal 2026-05-25): `isExactPathOnly` is a compile-time **candidacy** flag; final lane selection is **per-call** and payload-aware. A config-level-only gate cannot preserve behavioural equivalence because the behaviours the fast lane cannot reproduce (built-in/custom transformers, `ignoredValueTypes`, failure degradation/diagnostics, circular refs, root identity, sparse holes) are determined by the **payload**, not the config.

**Given** a redactor initialised with a config whose `paths` array contains only exact string selectors (no wildcard, recursive-wildcard, ignore, or regex path segments) and whose config sets none of `keys`, `stringTests`, `fuzzyKeyMatch: true`, or `caseSensitiveKeyMatch: false`
**When** the redactor factory compiles the plan
**Then** the plan is flagged as a **candidate** for the compiled path executor (`isExactPathOnly: true` — necessary but not sufficient)
**And** compiled direct-path accessor closures are generated at init time for each configured path — one per unique target — with no deferred work left to each `.redact()` call

**Given** a candidate redactor and a **fast-lane-safe** runtime payload (pure plain-data: only plain objects, arrays, and primitive leaves)
**When** `.redact(payload)` is invoked
**Then** the executor applies each compiled accessor in turn to produce the redacted output
**And** no per-call WeakMap, frozen array, `Object.defineProperty`, or canonical path string is allocated inside the redaction path (a lightweight fast-lane-safe guard may run first, itself allocating none of those and using a bounded depth cap for cycle safety)
**And** the output is behaviourally identical to what the general traversal would produce for the same config and input
**And** the same input reference is returned when no configured path changed anything, and sparse array holes are preserved

**Given** a candidate redactor and a payload that is **not** fast-lane-safe (contains a supported-transformable runtime value such as Date/BigInt/Map/Set/Error/RegExp/URL, a circular reference, a non-plain prototype, or a property whose accessor throws)
**When** `.redact(payload)` is invoked
**Then** the call is delegated to the general traversal
**And** output is identical to general-traversal output (transformers applied, `ignoredValueTypes` honoured, nested failures degraded to `[UNSUPPORTED]` with diagnostics, no rethrow)

**Given** the `path-based-single-object-node24` benchmark row in `test/bench/manifest.json`
**When** the benchmark is run and the artefact is written to `test/artefacts/benchmarks/path-based-single-object-node24.json`
**Then** `thresholdDecision.passed` is `true`
**And** `overheadPct` is ≤60 (release ceiling; ≤50 is the aspirational target)

**Given** a redactor initialised with any config that includes dynamic path segments (`*`, `**`, ignore segments, regex), `keys`, `stringTests`, fuzzy matching, or case-insensitive matching
**When** `.redact(payload)` is invoked
**Then** the general traversal algorithm is used unchanged
**And** no compiled path executor is involved
**And** no change in output or observable behaviour occurs

**Given** a payload in which a configured exact path does not exist (missing intermediate key or missing terminal key)
**When** the compiled executor processes the payload
**Then** the missing path is silently skipped
**And** the remainder of the output is unaffected

**Given** a payload in which a configured exact path resolves to `null`, `undefined`, a primitive, or a nested object
**When** the compiled executor processes the payload
**Then** the configured censor, remove, or retainStructure policy is applied identically to what the general traversal would apply

### Story 7.2: Prove Behavioural Equivalence of the Compiled Path Executor

As a backend engineer,
I want guaranteed identical redaction output regardless of which internal execution path processes my call,
so that the performance optimisation introduced by Story 7.1 cannot silently change my redaction results as the codebase evolves.

**Motivation:** Story 4.3 established a behavioural equivalence proof between the then-current fast lane and the general traversal. Story 7.1 introduces a new fast lane. The equivalence corpus must be extended to cover the compiled path executor across the edge cases specific to exact-path-only configs. **Per the 2026-05-25 course-correction, the corpus must also include payloads that are NOT fast-lane-safe (supported-transformable runtime values, circular references, throwing accessors) and assert that the fast-lane-wired redactor delegates to the general traversal and produces identical output — i.e. the per-call guard's delegation is itself proven.**

**Acceptance Criteria:**

**Given** the compiled path executor and the general traversal are both applied to the same exact-path-only config and the same input
**When** the inputs cover the following cases:
- a single-segment path (root-level key)
- a two-segment path (one level of nesting)
- a three-or-more-segment path (deep nesting)
- multiple paths that share a common prefix segment
- multiple paths that share no prefix
- a path whose terminal key is absent from the input
- a path whose intermediate key is absent from the input
- a path whose value is `null`
- a path whose value is a number, boolean, or empty string
- a path whose value is a nested object
- a path whose value is an array
- two paths pointing to the same terminal key under different parent paths
**Then** both executors produce byte-for-byte identical output for every case

**Given** the equivalence corpus test file
**When** a new case is added to the compiled path executor's code path
**Then** a corresponding equivalence case is added to this corpus

**Given** the compiled path executor produces output that differs from the general traversal for any input in the corpus
**When** that difference is detected by the test suite
**Then** the test fails with a diff that identifies the diverging key and value

### Story 7.3: Reduce Hot-Path Allocation Overhead in the General Traversal

As a backend engineer,
I want the general traversal algorithm's per-call and per-node allocation overhead reduced,
so that configs using key rules, dynamic paths, fuzzy matching, or string tests perform closer to their theoretical minimum and the general path benefits from the same discipline applied to the compiled executor.

**Motivation:** Even after Story 7.1, the general traversal carries avoidable allocation costs that affect every non-compiled config. The benchmark manifest currently has one row (path-based). If additional rows for key-based or mixed configs are added in future, those rows will also benefit from this story. The changes are purely internal — no public API or output behaviour is affected.

**Acceptance Criteria:**

**Given** any redactor using the general traversal path
**When** `.redact(payload)` is invoked
**Then** `setObjectEntry` uses direct property assignment (`target[key] = value`) instead of `Object.defineProperty`
**And** the path-segment array passed through the traversal is managed as a mutable stack (push at entry, pop at exit) rather than a new frozen spread-copy at every depth level
**And** `resolveDynamicPathRule` is not called when `plan.dynamicPathRules.length === 0`
**And** `resolveDirectKeyMatch` is not called when `plan.exactKeyRules.literalMatchers.length === 0` and `plan.regexKeyRules.matchers.length === 0`
**And** `buildRuleContextKey` is not called when `activePolicy` is `undefined`

**Given** the general traversal changes
**When** the full test suite is executed
**Then** all existing tests pass without modification
**And** no change in output, error behaviour, or observable semantics is introduced

### Story 7.4: Enforce Traversal Safety Limits and Validate Hostile-Input Protection

Implements: PRD Technical Constraint (Domain-Specific Requirements — traversal and memory safety)

As a backend engineer,
I want the redactor to enforce maximum traversal depth and edge budgets, and to be validated against a hostile-input security corpus,
So that production services are protected from memory exhaustion, stack overflow, and indefinite execution when Deep Redact processes adversarial or pathological payloads.

**Acceptance Criteria:**

**Maximum traversal depth**
- **Given** a payload whose nesting exceeds the configured maximum traversal depth
  **When** redaction runs
  **Then** traversal stops at the maximum depth boundary
  **And** values beyond that boundary are replaced with `[UNSUPPORTED]`
  **And** redaction does not throw and does not enter unbounded recursion
- **Given** the maximum traversal depth configuration
  **When** the factory initialises with no explicit depth limit
  **Then** a default maximum depth is applied automatically
- **Given** the factory is provided an explicit depth limit through public configuration
  **When** a payload reaches that depth
  **Then** the declared depth-limit behaviour applies

**Edge and node budget**
- **Given** a payload whose total traversed node count would exceed the configured visited-node or edge budget
  **When** redaction runs
  **Then** traversal stops at the budget boundary
  **And** nodes beyond the budget are replaced with `[UNSUPPORTED]`
  **And** the call completes without throwing

**Hostile-input protection**
- **Given** a payload with extreme breadth (an object with at least ten thousand keys at a single level)
  **When** redaction runs
  **Then** the call completes without throwing, without memory exhaustion, and within a bounded wall-clock time
- **Given** a payload with extreme nesting depth (an object nested at least one thousand levels deep)
  **When** redaction runs
  **Then** the call completes without stack overflow and within the declared depth-limit behaviour
- **Given** a payload combining extreme breadth and depth simultaneously
  **When** redaction runs
  **Then** the call completes safely within both declared budgets

**Safe regex handling at runtime**
- **Given** an initialised redactor whose regex-based property or path-segment rules are already validated at init time
  **When** those rules are evaluated against a string value at runtime
  **Then** the match operation completes within a bounded time even for adversarially crafted string content
  **And** a runtime step-count guard or equivalent protection is enforced so that catastrophic-backtracking inputs cannot block the event loop indefinitely

**Security corpus**
- **Given** a named hostile-input security corpus at `test/security/hostile-input-corpus.json`
  **When** it is inspected
  **Then** it includes named cases covering: extreme nesting depth, extreme object breadth, circular references at depth, extremely long string values, regex-triggering string content, and combined adversarial shapes
- **Given** the security corpus
  **When** the test suite runs
  **Then** every corpus case completes without throwing, without stack overflow, without memory exhaustion, and within declared traversal budgets
  **And** redaction output for each corpus case is either a valid redacted structure or contains `[UNSUPPORTED]` placeholders at the exceeded boundary
- **Given** the CI quality gate configuration
  **When** any CI run executes
  **Then** security corpus validation is a required passing gate before build success is reported

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** it covers traversal depth limits, node/edge budgets, hostile-input corpus validation, and runtime regex safety only
  **And** init-time regex validation remains governed by Stories 1.5 and 1.6
  **And** allocation optimisations in the general traversal remain governed by Story 7.3

### Story 7.5: Extend the Fast Lane to Support Single-Level Wildcard Path Segments

Implements: NFR1–NFR2 (performance targets), FR11 (single-level wildcard targeting)

As a backend engineer,
I want the compiled fast lane to handle configurations that combine exact path segments with single-level wildcard (`*`) path segments,
So that the most common real-world path policies — such as `user.password` alongside `*.email` — remain in the low-allocation fast lane rather than falling back to the general traversal, and the benchmark overhead versus `fast-redact` for these workloads approaches the aspirational 25–50% band.

**Motivation:**
The current `isExactPathOnly` candidacy condition rejects any configuration that contains a `*` segment, routing mixed exact + wildcard configs entirely to the general traversal. Because a two-pass approach (fast lane for exact paths, then general traversal for wildcards) would require two full O(N) traversals — costing more than a single general pass — the only net-win strategy is to extend the fast lane's prefix trie itself so that a single pass handles both exact and `*.field` paths. This story delivers that extension.

**Acceptance Criteria:**

**Trie node extension**
- **Given** the `PathTreeNode` interface used by the fast-lane trie builder
  **When** this story is complete
  **Then** the interface includes a `wildcardChild?: PathTreeNode` field alongside the existing `propertyChildren` and `indexChildren` maps
  **And** the trie builder populates `wildcardChild` for any `*` segment encountered in a compiled path rule
  **And** existing exact-segment and index-segment construction is unchanged

**Single-pass wildcard traversal**
- **Given** the fast-lane traversal logic
  **When** a node in the trie has a `wildcardChild`
  **Then** for each property or array index encountered at that depth, the traversal follows the `wildcardChild` branch in addition to any matching exact child
  **And** this check adds one null-guard per depth level with no heap allocation
  **And** the `delegate` sentinel path is unchanged: payloads with supported-transformable runtime values, non-plain prototypes, or circular references are still escalated to the general lane

**Broadened fast-lane candidacy**
- **Given** the `isExactPathOnly` compile-time flag (or its replacement, `isFastLaneEligible`)
  **When** a configuration contains only exact path segments and/or single-level `*` path segments, with no `**` recursive wildcards, no regex path segments, no ignore rules on paths, no key rules, no substring tests, no fuzzy key matching, and case-sensitive matching enabled
  **Then** the candidacy flag is `true` and the fast lane is selected
- **Given** a configuration that includes any `**` segment, regex path segment, key rule, substring test, fuzzy match option, or case-insensitive match option
  **When** the candidacy flag is evaluated
  **Then** it is `false` and the general traversal is selected, unchanged from current behaviour

**Behavioural equivalence**
- **Given** a configuration containing a mix of exact and `*.field` paths
  **When** the fast lane processes a payload
  **Then** the redacted output is byte-for-byte identical to the output produced by the general traversal for the same input and configuration
  **And** this equivalence is covered by an automated test that runs both lanes against the same fixtures and asserts output equality

**Benchmark regression**
- **Given** the `wildcard-single-object-*` benchmark rows in the manifest
  **When** this story is complete and benchmarks are re-run
  **Then** the recorded overhead for the wildcard workload versus `fast-redact` is materially lower than the pre-story baseline
  **And** the threshold policy for `wildcard-single-object-fast-redact-node24` in `test/bench/manifest.json` is tightened to reflect the new achievable overhead
  **And** the `wildcard-single-object-v3-node24` and `wildcard-single-object-json-stringify-regex-node24` thresholds are reviewed and tightened accordingly

**Scope guard**
- **Given** this story's scope
  **When** the implementation is reviewed
  **Then** it covers `PathTreeNode` wildcard extension, trie builder update, fast-lane traversal wildcard handling, `isFastLaneEligible` condition broadening, equivalence tests, and benchmark threshold updates only
  **And** recursive wildcard (`**`) support in the fast lane is explicitly out of scope and remains a candidate for a future story
  **And** general traversal allocation reductions remain governed by Story 7.3
