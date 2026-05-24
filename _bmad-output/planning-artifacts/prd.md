---
date: "2026-04-07T14:38:44Z"
stepsCompleted:
  - "step-01-init"
  - "step-02-discovery"
  - "step-02b-vision"
  - "step-02c-executive-summary"
  - "step-03-success"
  - "step-04-journeys"
  - "step-05-domain"
  - "step-07-project-type"
  - "step-08-scoping"
  - "step-09-functional"
  - "step-10-nonfunctional"
  - "step-11-polish"
  - "step-12-complete"
  - "step-e-01-discovery"
  - "step-e-02-review"
  - "step-e-03-edit"
inputDocuments:
  - "_bmad-output/planning-artifacts/product-brief-deep-redact.md"
  - "_bmad-output/planning-artifacts/product-brief-deep-redact-distillate.md"
documentCounts:
  productBriefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: "developer_tool"
  domain: "general"
  complexity: "medium"
  projectContext: "brownfield"
workflowType: "prd"
workflow: "edit"
lastEdited: "2026-05-23T00:00:00+01:00"
editHistory:
  - date: "2026-04-07T14:38:44Z"
    changes: "Tightened FR and NFR wording, added explicit out-of-scope scope language, and completed edit workflow metadata."
  - date: "2026-04-07T14:41:23Z"
    changes: "Normalised console redaction wording, tightened diagnostics language, and aligned example requirements."
  - date: "2026-04-07T14:41:49Z"
    changes: "Rephrased console redaction safeguards as diagnostic logging behaviour to avoid internal implementation wording."
  - date: "2026-04-07T14:46:31Z"
    changes: "Added retained regex, root-primitive, ignored-type, and regex path-segment features to the v4 capability contract."
  - date: "2026-04-07T14:51:38Z"
    changes: "Aligned the PRD with v3 docs and source by restoring removal, retain-structure, same-length replacement, serialised output, and transformer support, while narrowing overstated awkward-value claims."
  - date: "2026-04-07T16:04:38+01:00"
    changes: "Removed explicit Console API wording from the failure-handling NFR and compressed the scoping section to focus on delivery strategy, constraints, trade-offs, and risks."
  - date: "2026-05-23T00:00:00+01:00"
    changes: "Updated Performance NFR and Technical Risk sections to record the benchmark gate failure at v4.0.0 and the Epic 7 remediation plan. Overhead target unchanged."
---

# Product Requirements Document - deep-redact

**Author:** Ben
**Date:** 2026-04-07T12:08:51Z

## Executive Summary

Deep Redact v4 is a major-version reset of an existing Node.js and TypeScript redaction library. The release is intended to let teams define one small singleton configuration at application startup and rely on it for log and payload redaction across a service. This is a brownfield evolution of an existing package, so the product work must deliver new capabilities, recover performance, and provide a clean migration away from the current class-based API.

Deep Redact already exists because real production data does not arrive in neat, predictable shapes. The current capabilities that matter are:

- redaction of nested arrays and objects without declaring every key at every level
- partial string redaction via regex anywhere in a payload
- regex-based object property matching
- whole-string redaction when a matching value is supplied as the root primitive input
- configurable replacement behaviour, including custom replacers, removal, retain-structure handling, and same-length string replacement
- optional fuzzy matching
- optional case-insensitive matching
- support for optionally ignoring values of specified types
- optional structured or serialised output
- configurable transformer support, with standard coverage for circular references, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`

v4 is not a retreat from those capabilities. It is a deliberate expansion that preserves the current capabilities and adds the missing pieces required for broader adoption. The key v4 additions are:

- a `fast-redact`-compatible primary API for low-friction adoption
- object-path redaction as a first-class capability
- regex-based object path segment matching
- path grammar supporting `*`, `**`, and `!<key|index>` segments
- one-way deterministic redaction only, with no restore capability
- early configuration validation and clear singleton initialisation guidance
- a runtime contract that does not throw after successful initialisation for supported inputs
- graceful degradation for problematic nested values using `[UNSUPPORTED]` without throwing
- optional redaction of `console.*` calls, with safeguards to prevent recursive redaction loops during Deep Redact’s own diagnostic logging
- memory-exhaustion and traversal-safety protections
- benchmark-led performance recovery
- a clear v3-to-v4 migration path

The release exists as v4 because these API and behavioural changes are substantial enough that an incremental release would create more migration confusion than value. A clean major-version break provides room to align the public API with practical ecosystem compatibility while preserving the existing capabilities that make Deep Redact worth adopting.

### What Makes This Special

Deep Redact v4 is differentiated by combining the current capabilities and v4 additions in one engine with one compact configuration. Teams should not need one tool for path rules, another for nested-key coverage, and bespoke code for partial string handling or awkward runtime values. The product is valuable when a team can cover the real shape of its production data with one comprehensible setup and standardise it at service root.

The core insight is that sensitive data in real systems is inconsistent, nested, and often embedded within larger values or exposed directly as root primitives. That is why Deep Redact must support both the existing capabilities and the new v4 additions in a single product direction rather than forcing users into narrow path-only assumptions or fragmented solutions.

The value proposition is direct: redact every piece of sensitive data using a single, small config.

## Project Classification

Deep Redact v4 is classified as a `developer_tool`. It operates in the `general` software domain, with a specific emphasis on security-sensitive logging and payload sanitisation use cases. The project complexity is `medium`, driven by the combination of API redesign, migration constraints, performance expectations, and security-critical runtime behaviour. The project context is `brownfield`, since v4 is a major evolution of an existing package with an established codebase and behavioural expectations.

## Success Criteria

### User Success

Developers can initialise Deep Redact once at service root with a small, comprehensible configuration and use it consistently across a service. Users succeed when that single configuration is sufficient to redact sensitive data without scattering redaction logic across the codebase.

Redaction behaviour must be precise. Partial string redaction must alter only matched substrings and leave surrounding content unchanged. Key-based and object-path-based redaction must affect only the specified keys or paths within deeply nested payloads, leaving non-targeted sibling values unchanged. The product is successful when users can express this behaviour clearly and trust the output without post-processing or bespoke wrappers.

Users should also be able to apply the existing capability set and the v4 additions in one engine without unacceptable operational cost. That includes safe handling of circular references and standard transformed runtime values, plus a runtime contract that does not throw after successful initialisation for supported inputs.

### Business Success

At 3 months, Deep Redact should show clear adoption acceleration, with weekly npm downloads rising from the current baseline of roughly 38K to at least 57K.

At 12 months, Deep Redact should displace `fast-redact` as the default redaction library in Pino. Because that outcome depends partly on external maintainers and ecosystem decisions, the PRD should treat it as a strategic adoption objective backed by leading indicators such as migration uptake, community trust, compatibility credibility, and reduced need for bespoke wrappers.

Business success also means the release is recognised as the security-first and feature-complete choice for Node.js log and payload redaction, rather than as a niche alternative with stronger semantics but weaker adoption.

### Technical Success

Performance must recover to commercially credible levels. On comparable path-based workloads, Deep Redact v4 should operate within the realistic range already outlined in the briefs, namely roughly 25 to 50 per cent overhead versus `fast-redact`, with published benchmark artefacts to support that claim.

Memory safety is non-negotiable. The release must include explicit safeguards against memory exhaustion and unsafe traversal behaviour, with hostile-input coverage treated as release-critical rather than optional hardening.

Migration quality and documentation quality are also core technical success measures. If practical `fast-redact` portability is achievable without compromising the desired feature set, v4 should provide it. If it is not achievable, v4 is still successful if the new API is cleaner, fully documented, migration expectations are explicit, and the desired feature set is delivered without compromise. Backwards similarity to v3 is not itself a success condition.

### Measurable Outcomes

- A developer can configure one singleton redactor at application root and use it across a service without additional wrapper logic for the common target cases defined in the PRD.
- Partial string redaction changes only the matched segments of a value, with surrounding text preserved.
- Deeply nested key and object-path targeting redact only specified matches, with non-targeted values preserved.
- After successful initialisation, runtime redaction does not throw for supported inputs, including circular references and supported non-serialisable values.
- Published benchmark artefacts demonstrate performance within the agreed realistic range against `fast-redact` on comparable workloads.
- Weekly npm downloads reach at least 57K after 3 months.
- Within 12 months, Deep Redact becomes the default redaction library in Pino, or is demonstrably on that path through ecosystem adoption signals and maintainers’ preference.

## Product Scope

### MVP - Minimum Viable Product

The MVP scope for v4 should include the full intended release, not a narrow subset. That means preserving the current capabilities already established in Deep Redact and adding the desired v4 capabilities in the same major release wherever technically possible.

MVP therefore includes preservation of nested key targeting, partial string redaction, regex-based object property matching, whole-string redaction for matching root primitive inputs, configurable replacement behaviour including removal, retain-structure handling, custom replacers, and same-length string replacement, fuzzy matching, case-insensitive matching, optional ignored-value-type rules, optional structured or serialised output, and configurable transformer support with standard coverage for circular references, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`. It also includes the v4 additions: first-class object-path redaction, regex-based object path segment matching, support for `*`, `**`, and `!<key|index>` path segments, one-way deterministic redaction only, early configuration validation, singleton-oriented setup guidance, non-throwing runtime behaviour after successful initialisation, graceful degradation to `[UNSUPPORTED]` for problematic nested values, optional use with `console.*` calls while preventing recursive redaction loops during Deep Redact’s own diagnostic logging, traversal and memory protections, performance recovery, and migration documentation.

### Growth Features (Post-MVP)

There is no deliberate post-v4 feature bucket in the current strategy. If items fall out of the main v4 release, that is a compromise rather than the intended roadmap. The only acceptable post-MVP items are contingency items that do not undermine the core v4 promise, such as expanded ecosystem examples, additional migration tooling, extra framework-specific integration guidance, or benchmark coverage beyond the required release bar.

### Out of Scope for v4

- reversible redaction, restore, or unredact behaviour
- AI or ML-based PII discovery, remote DLP features, or policy-management platform work
- multi-language expansion beyond JavaScript and TypeScript, including a shared native core or parallel language re-implementations
- broad product expansion beyond the core redaction library
- removal of differentiated Deep Redact capabilities purely to mimic `fast-redact`

### Vision (Future)

There is no planned feature vision beyond v4 at this stage. The product intent is to make v4 the decisive release that fully expresses the desired feature set and positioning.

Future work, if any, should be driven by adoption evidence after v4 rather than by a pre-committed roadmap. The current PRD should therefore optimise for getting the full intended capability set into v4 rather than reserving important functionality for later phases.

## User Journeys

### Journey 1: Primary User - Singleton Setup and Trusted Production Use

A backend engineer is responsible for log safety across a Node.js service that already emits structured logs from multiple code paths. Their current state is fragmented: some payloads are safe, some are partially masked, and some require local wrapper logic because sensitive data appears unpredictably in nested structures.

They install Deep Redact v4, declare one small configuration during service startup, and cache that redactor for reuse across the service lifetime. They define the keys, object paths, and partial-string rules that matter to their environment, then run representative payloads through the redactor before shipping.

The turning point is not merely that values are censored. It is that the engineer can see targeted redaction happening precisely where expected while the rest of each payload remains unchanged. Once the service is live, they trust the logging path because the redactor is centralised, deterministic, and reusable rather than scattered through application code.

**Capabilities revealed by this journey:**

- singleton initialisation and caching guidance
- one compact configuration that covers service-wide logging
- precise targeting by specified keys and object paths
- partial-string redaction that preserves surrounding content
- deterministic output suitable for production trust

### Journey 2: Primary User - Graceful Recovery from Redaction Errors

The same backend engineer encounters a hostile or awkward payload in production. A nested value cannot be processed cleanly during redaction, but the rest of the object is still valid and useful for logs and debugging.

The engineer’s expectation is strict: Deep Redact must not throw, must not drop the entire parent object, and must not leak any sensitive detail from the problematic value. Instead, the specific nested value is replaced with `[UNSUPPORTED]`, while the rest of the payload remains intact and safely redacted.

The critical moment is when production logging continues without service interruption and without silent leakage. The engineer retains enough surrounding structure to diagnose where the problem occurred, but not enough detail to expose the original value.

**Capabilities revealed by this journey:**

- non-throwing runtime behaviour after successful initialisation
- graceful degradation for problematic nested values
- replacement of only the failed target, not the entire object
- generic non-leaking error marker semantics
- preservation of surrounding payload context for safe debugging

### Journey 3: Secondary User - Platform or Security Standardisation Decision

A platform or security engineer is deciding whether Deep Redact can become the standard redaction dependency across multiple services. Their concern is not only feature coverage, but whether the library is trustworthy under load, safe under hostile input, and simple enough to mandate across teams.

They review the documented current capabilities, the v4 additions, benchmark artefacts, memory-safety posture, and the runtime contract. They compare Deep Redact with `fast-redact` and internal wrappers, looking for evidence that one small central configuration can cover real production data without compromising determinism or exposing a restore path.

The decision point comes when the evaluator concludes that Deep Redact is strong enough to standardise at service root, backed by published evidence rather than marketing claims. At that point, the library moves from “interesting tool” to “approved platform default”.

**Capabilities revealed by this journey:**

- benchmark publication and performance credibility
- memory-exhaustion and traversal-safety protections
- one-way deterministic redaction with no restore support
- clear documentation for standardised service-root adoption
- trust signals strong enough for cross-team approval

### Journey 4: Migration or Integration Owner - Moving from `fast-redact` or v3

A technical owner needs to replace either `fast-redact` or the current class-based Deep Redact v3 usage without destabilising production services. They are willing to accept breaking changes, but only if the result is cleaner, better documented, and clearly aligned with the desired feature set.

They start by mapping current redaction behaviour to the v4 API, updating configuration shape where needed, and validating equivalent path-based behaviour first. Then they layer in the broader v4 capability set: targeted nested redaction, partial-string handling, and the runtime safety guarantees that were previously hard to achieve consistently.

The migration succeeds when the owner can move a service with clear documentation, understandable examples, and no ambiguity about what changed. The emotional payoff is not nostalgia for v3 compatibility; it is confidence that the new API is worth the break because it solves the real problem more completely.

**Capabilities revealed by this journey:**

- migration guide from v3 to v4
- practical migration path from `fast-redact`
- examples showing parity cases and intentional divergences
- clear explanation of API changes and behavioural guarantees
- low-drama adoption path for existing services

### Journey Requirements Summary

These journeys imply a concentrated set of product requirements:

- one singleton redactor initialised and cached at service startup
- a compact configuration model that can express key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, partial-string targeting, root-primitive redaction, replacement and removal behaviour, retained-structure handling, serialised-output behaviour, ignored-value-type rules, and transformer configuration together
- precise redaction behaviour that changes only intended matches and leaves non-targeted values unchanged
- graceful handling of redaction failures at nested value level, with no throw and no leakage
- safe handling of circular references and standard transformed runtime values
- one-way deterministic output with no restore capability
- published benchmark evidence and explicit security hardening evidence
- migration documentation for both `fast-redact` adopters and existing v3 users
- documentation and examples strong enough for platform-level standardisation decisions

## Domain-Specific Requirements

### Compliance & Regulatory

Deep Redact does not target a formally regulated industry domain in this PRD, so the primary requirement is not sector-specific certification. Instead, the relevant expectation is security-grade handling of sensitive data in logs and payloads. The product must behave conservatively when processing secrets, credentials, tokens, identifiers, and personal data, because its output is likely to be written to persistent logs, telemetry systems, and downstream observability tooling.

The release must therefore treat leakage prevention as a first-order requirement. One-way redaction, deterministic output, and the absence of any restore capability are not optional product choices; they are domain-appropriate safeguards for a library whose entire purpose is to reduce exposure risk.

### Technical Constraints

Deep Redact operates in a runtime-sensitive part of application infrastructure. It is likely to sit on the hot path for logging and payload processing, so performance overhead must remain within realistic operational limits. Path-based and targeted redaction workloads must be fast enough to justify adoption in production services that already have viable alternatives.

Memory behaviour must also remain bounded and predictable. The library must defend against memory exhaustion, excessive traversal, and pathological object shapes without destabilising the host service. It must handle circular references and standard transformed runtime values safely, and it must degrade gracefully when a specific nested value cannot be redacted cleanly.

After successful initialisation, runtime execution must not throw for supported inputs. If a redaction operation encounters a problematic nested value, the product must replace only that target with `[UNSUPPORTED]` and preserve the rest of the redacted structure.

### Integration Requirements

The core domain-specific integration requirement is that the redactor can be initialised once and reused consistently across a service. The product must support singleton deployment patterns and configuration clarity suitable for service-root setup in Node.js applications.

The library must also support the practical realities of structured logging and payload sanitisation, where the same redactor may be applied to heterogeneous objects, nested arrays, and mixed content that includes both target values and safe context that should remain unchanged.

### Risk Mitigations

The primary overlooked risk in this domain is false confidence. A library can appear to redact successfully while still leaking sensitive substrings, missing deeply nested targets, or over-redacting surrounding context in ways that reduce the usefulness of logs. The product must therefore make targeting precise and testable.

A second overlooked risk is failure handling. Throwing during redaction, dropping whole values, or silently returning unsafe output can all create production incidents or leakage. The product must instead fail locally at the problematic nested value, preserve surrounding safe context, and avoid exposing any detail from the failed value.

A third overlooked risk is treating transformed runtime values as edge cases rather than normal production inputs. Circular references, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL` must be treated as expected conditions within the product boundary, with clear extension points for other values.

A fourth overlooked risk is shipping undocumented behavioural ambiguity. If precedence rules between key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, and partial-string targeting are unclear, users cannot trust the output. The product must document those rules explicitly and test them thoroughly.

## Developer Tool Specific Requirements

### Project-Type Overview

Deep Redact v4 is a JavaScript and TypeScript developer library intended for service-root use in Node.js applications. The product should be positioned narrowly and deliberately rather than aspirationally broad. The language target remains JavaScript and TypeScript only for v4.

Broader multi-language support is explicitly out of scope for this release. A shared native core, such as a Rust implementation, would introduce cross-boundary payload transfer costs that could erode performance in precisely the workloads the product is trying to optimise. Re-implementing the same mechanics independently across multiple languages would create an unsustainable maintenance burden. The v4 PRD should therefore treat depth and quality in the JavaScript and TypeScript ecosystem as the correct product decision.

### Technical Architecture Considerations

The public API must support a singleton initialisation pattern suitable for service-root configuration and repeated runtime use. TypeScript support is a formal product requirement, not a by-product of implementation. The API surface, typings, and documentation must work together so that developers can discover correct usage directly from editor feedback and static analysis, rather than relying on trial and error.

The v4 API may diverge substantially from v3 if that is required to achieve the desired feature set cleanly. Compatibility with `fast-redact` is valuable where practical, but the PRD should not constrain the product to superficial API similarity if that would weaken the release. The standard for success is a cleaner and better documented API that delivers the full intended capability set.

### Language Matrix

The supported language matrix for v4 is:

- JavaScript
- TypeScript

This support must be explicit in product documentation, examples, package behaviour, and test coverage. TypeScript usage must include strong typings, editor discoverability, and examples that demonstrate intended configuration patterns clearly.

### Installation Methods

The product must support installation and use through the following package ecosystems:

- `npm`
- `pnpm`
- `yarn`
- `bun`
- `deno`

These are not documentation-only claims. Each installation path must be verified in automated release verification so the release has evidence that package installation and baseline usage work as described across the supported environments.

### API Surface

The v4 API surface must support:

- singleton initialisation and caching at application startup
- a compact configuration model
- key targeting
- regex-based object property matching
- object-path targeting
- regex-based object path segment matching
- partial-string targeting
- whole-string redaction for matching root primitive inputs
- configurable replacement behaviour, including removal, retain-structure handling, custom replacers, and same-length string replacement
- optional structured or serialised output
- optional ignored-value-type rules
- configurable transformers, including standard handling for circular references, `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`
- graceful replacement of problematic nested values with `[UNSUPPORTED]` when redaction cannot complete normally
- optional use of Deep Redact for `console.*` calls, with safeguards to prevent recursive redaction loops during Deep Redact’s own diagnostic logging
- one-way deterministic behaviour with no restore capability
- non-throwing runtime behaviour after successful initialisation for supported inputs

If `fast-redact` parity is achievable while preserving these requirements, it should be pursued. If it is not, the API should prioritise correctness, clarity, and the full desired feature set over imitation.

### Code Examples

Code examples are release-critical. The documentation set must include worked examples for:

- singleton service-root setup
- key targeting, including regex-based object property matching
- object-path targeting, including regex-based object path segment matching
- partial-string targeting and whole-string redaction for matching root primitive inputs
- replacement, removal, retain-structure handling, and same-length string replacement
- structured versus serialised output
- ignored-value-type configuration
- custom transformer configuration and standard transformed values
- graceful redaction-error replacement
- optional `console.*` redaction setup
- migration from `fast-redact`
- migration from Deep Redact v3

Examples must be practical, minimal, and representative of real service usage rather than abstract toy snippets. They should help developers understand both the happy path and the boundaries of the API.

### Migration Guide

The release must include two separate migration tracks:

- migration from `fast-redact`
- migration from Deep Redact v3

These guides must not assume the same reader intent. The `fast-redact` migration guide should focus on portability, equivalent cases, and clearly documented divergences. The v3 migration guide should focus on the break from the class-based API, the rationale for that break, and the clearest path to adopting the new configuration model.

### Implementation Considerations

Because this is a developer tool, documentation quality is part of the product itself. The implementation is not complete if the package works but the migration path, installation instructions, editor experience, and examples are weak. The release must therefore treat typings, examples, installation verification, and migration material as part of the shipping surface, not as follow-up work.

## Project Scoping & Phased Development

### Delivery Strategy

Deep Redact v4 is a problem-solving and credibility MVP delivered as one decisive major release rather than as a staged feature roadmap. The release is intended to ship the full agreed v4 capability set wherever technically possible.

### Delivery Constraints

The current planning assumption is solo implementation. That makes sequencing, scope discipline, benchmarks, migration material, and documentation quality release-critical rather than secondary work.

### Acceptable Trade-Offs

If trade-offs become necessary, formal IDE integration may slip before core redaction capability, runtime safety, migration quality, benchmark publication, or installation verification.

### Risk Mitigation Strategy

**Technical Risks:** The primary technical risk is performance recovery. v4 must preserve and extend capability breadth while recovering enough runtime performance to remain credible against `fast-redact`. Mitigation requires benchmark-led development, published artefacts, and aggressive focus on hot-path costs during design and implementation. This risk has partially materialised: the v4.0.0 benchmark artefact for the `path-based-single-object-node24` workload records 5566.4% overhead, against the 25–50% target, because the general traversal engine (correctness-complete as of Epic 6) carries per-call allocation costs that dominate on small exact-path workloads. Epic 7 delivers the compiled path executor (Story 7.1) that addresses this directly. The risk is considered open until the gate passes.

**Market Risks:** The main market risk is that the release is perceived as richer but still not practical enough to replace incumbent tooling. The mitigation is to make the release easy to evaluate: clear migration guides, explicit parity and divergence documentation, strong examples, and published performance evidence.

**Resource Risks:** The project is already resource-constrained because delivery is planned around a single maintainer. That means scope discipline must be real, not rhetorical. If trade-offs become necessary, the first acceptable drop is formal IDE integration complexity, provided strong typings, documentation, and examples still make the API usable and discoverable.

## Functional Requirements

### Configuration & Policy Definition

- FR1: Developers can create a redactor from a single configuration intended for service-root use.
- FR2: Developers can reuse one initialised redactor across repeated redaction operations within a service.
- FR3: Developers can validate whether a configuration is accepted before runtime redaction begins.
- FR4: Developers can define one redaction policy that combines multiple targeting approaches, replacement behaviour, output-format behaviour, ignored-value-type rules, and transformer configuration in the same configuration.
- FR5: Developers can define replacement behaviour for specific redaction targets, including literal replacements, function-based replacements, removal, retain-structure handling, and same-length string replacement.
- FR6: Developers can enable optional fuzzy matching for target keys.
- FR7: Developers can enable optional case-insensitive matching for target keys.
- FR8: TypeScript developers can discover valid configuration and API usage through typed interfaces.

### Targeted Redaction Coverage

- FR9: Developers can target sensitive values by key name or regex-based object property matching across nested objects and arrays.
- FR10: Developers can target sensitive values by explicit object path, including regex-based object path segment matching.
- FR11: Developers can target sensitive values using single-level wildcard path segments.
- FR12: Developers can target sensitive values using recursive wildcard path segments.
- FR13: Developers can exclude specific keys or indexes from otherwise matching path rules.
- FR14: Developers can target matched substrings within a larger string value and can fully redact a matching root primitive input.
- FR15: Developers can apply key targeting, object-path targeting, and substring targeting to the same payload.
- FR16: Developers can redact payloads that contain nested objects, arrays, and mixed value types in the same structure, including standard transformed runtime values.

### Precise Output Behaviour

- FR17: Developers can preserve non-targeted values when targeted values are redacted.
- FR18: Developers can rely on only matched substrings being altered when substring targeting is used.
- FR19: Developers can rely on deterministic output for the same input and configuration.
- FR20: Developers can understand how the library resolves overlaps when more than one targeting rule applies to the same value.
- FR21: Developers can use the library without any capability to restore or unredact original values.

### Runtime Resilience & Safety

- FR22: Developers can redact payloads containing circular references.
- FR23: Developers can redact payloads containing circular references and standard transformed runtime values including `BigInt`, `Date`, `Error`, `Map`, `RegExp`, `Set`, and `URL`, and can optionally ignore configured value types or apply custom transformers.
- FR24: Developers can continue receiving redacted output when a specific nested value cannot be processed cleanly.
- FR25: Developers can receive `[UNSUPPORTED]` for a problematic nested value while the rest of the payload remains intact.
- FR26: Developers can use runtime redaction without supported inputs causing thrown errors after successful initialisation.
- FR27: Developers can retain the surrounding parent structure when one nested value fails redaction.

### Migration & Ecosystem Adoption

- FR28: Developers can migrate documented `fast-redact` scenarios to v4 through equivalent or clearly documented alternative configuration.
- FR29: Developers can identify intentional behavioural differences from `fast-redact` before adopting v4.
- FR30: Existing Deep Redact users can migrate from the v3 class-based API to the v4 API through dedicated migration guidance.
- FR31: Developers can evaluate v4 through code examples that cover singleton setup, key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, substring targeting, root-primitive redaction, replacement and removal behaviour, retain-structure handling, same-length string replacement, structured versus serialised output, ignored-value-type configuration, custom transformer configuration, graceful error replacement, optional `console.*` redaction, `fast-redact` migration, and v3 migration.

### Distribution & Language Support

- FR32: Developers can install and use the library in JavaScript projects.
- FR33: Developers can install and use the library in TypeScript projects.
- FR34: Developers can install and use the library through `npm`, `pnpm`, `yarn`, `bun`, and `deno`.

### Console Redaction Support

- FR35: Developers can optionally apply Deep Redact to `console.*` calls in application code.
- FR36: Developers can enable optional console redaction without triggering recursive redaction from Deep Redact’s own diagnostic logging.

### Trust & Standardisation Support

- FR37: Platform and security teams can review published benchmark artefacts when evaluating the library for standard use.
- FR38: Platform and security teams can review published guidance on supported capabilities, targeting semantics, and migration expectations before standardising the library.

## Non-Functional Requirements

### Performance

- On comparable path-based benchmark workloads, Deep Redact v4 must operate within roughly `25% to 50%` overhead versus `fast-redact`.
- Performance claims must be backed by published benchmark artefacts included with the release.
- Performance evaluation must use a published benchmark set with clearly documented comparable workloads and benchmark conditions.
- Performance regressions against the published benchmark set must be treated as release-blocking when they push equivalent path-based workloads outside the agreed `25% to 50%` overhead range versus `fast-redact`.

**Current status (v4.0.0):** The `path-based-single-object-node24` benchmark artefact records `overheadPct: 5566.4` against the `maxOverheadPct: 50` gate, a gap of two orders of magnitude. The overhead target above is unchanged. Epic 7 is the remediation plan: Story 7.1 delivers the compiled path executor that eliminates per-call traversal allocation for exact-path-only configurations, which is the only approach capable of closing the gap to within the target range. The gate remains blocking for protected-branch and release-candidate runs.

### Security

- The release must ship with no known runtime security vulnerabilities.
- The library must provide one-way redaction only and must not expose any restore or unredact capability.
- When a redaction error occurs, no error placeholder or diagnostic output may expose sensitive source values.
- The library must document precedence rules for overlapping key targeting, regex-based object property matching, object-path targeting, regex-based object path segment matching, and partial-string targeting so users can reason about exposure risk.
- Security-sensitive behaviours, including redaction boundaries, placeholder behaviour, and precedence rules, must be covered by explicit tests.

### Reliability & Failure Handling

- After successful initialisation, supported inputs must not cause thrown runtime errors during redaction.
- Redaction failures must be isolated to the problematic nested value and replaced with `[UNSUPPORTED]` without throwing an error.
- When a nested redaction failure occurs, the rest of the payload must remain intact and continue through normal redaction processing.
- Diagnostic logging for redaction failures must record the value type, object path, and error details without exposing sensitive data.
- Optional console redaction must not create recursive redaction loops or destabilise application logging behaviour.

### Integration & Compatibility

- Installation and baseline usage must be verified for `npm`, `pnpm`, `yarn`, `bun`, and `deno`.
- Those installation and usage paths must be validated in automated release verification, not left as documentation-only claims.
- Deno support must cover `>= 2.*`.
- The PRD intentionally does not pin a minimum Node.js version yet. Before v4 ships, release documentation must declare the supported Node.js version matrix explicitly.
- Published documentation must align with the verified installation and compatibility matrix so users are not relying on untested claims.
