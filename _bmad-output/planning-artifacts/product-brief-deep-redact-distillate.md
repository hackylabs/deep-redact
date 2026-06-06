---
title: "Product Brief Distillate: deep-redact"
type: llm-distillate
source: "product-brief-deep-redact.md"
created: "2026-04-07T11:59:48Z"
purpose: "Token-efficient context for downstream PRD creation"
---

# Product Brief Distillate: Deep Redact v4

## Product Intent

- Deep Redact is a brownfield OSS redaction library for Node.js and TypeScript that was originally built to fill gaps left by path-only redaction tools.
- The core product bet is that real-world sensitive data does not always appear at stable, fully known object paths, so the library must support deep key-based matching, partial string redaction, and safe handling of awkward runtime values.
- The next release is not a minor tidy-up. It is a strategic v4 reset to recover performance, improve portability, and harden security behaviour.

## Primary Users And Adoption Context

- Primary user is the backend engineer working in Node.js or TypeScript who owns log safety, telemetry hygiene, and payload sanitisation in production services.
- Secondary stakeholder is the platform or security-conscious engineering team that wants deterministic one-way redaction, low operational risk, and evidence-backed trust signals before standardising a dependency.
- Intended usage pattern is singleton initialisation at the consumer application root, with early configuration validation and repeated runtime use thereafter.

## Problem Signals

- The user sees a persistent OSS market gap for redaction that can deeply redact arrays and objects without forcing exact key declaration at every nesting level.
- The user needs partial string redaction by regex whether the matching string is top-level or deeply nested within structured input.
- The user needs custom replacers per match rather than one global censor path.
- The user needs optional fuzzy matching and optional case-insensitive matching per key because real payload schemas are inconsistent.
- The user needs safe transformation of non-serialisable values including circular references, `BigInt`, `Date`, class instances, functions, symbols, and similar awkward runtime values.
- Since v0, the codebase has grown in complexity and performance has degraded to the point that it is now slower than `fast-redact`, whereas earlier versions were significantly faster.

## Hard Requirements Hints

- Redaction must be one-way only. There must be no supported restore or unredact capability in v4.
- Output must be deterministic based on input and configuration. The same input and same config must produce the same redacted result.
- After initial configuration succeeds, runtime redaction must never throw for supported inputs. Fail-fast behaviour is allowed only during initial singleton configuration.
- Performance impact must be minimal, with explicit work to recover performance lost since earlier versions.
- The library must remain strict-security oriented, with zero known runtime vulnerabilities treated as a release expectation rather than an optional quality goal.
- The library must be well tested across normal and edge cases, especially hostile inputs, non-serialisable values, and boundary semantics in traversal and path handling.
- Deep Redact must preserve existing differentiating capabilities even if `fast-redact` portability creates pressure to narrow scope.

## MVP Scope Signals For v4

- Add object-path redaction support as a first-class capability.
- Support wildcard path segments `*` and `**` as parent and terminal path segments.
- Support ignore segments using `!<key|index>` as parent and terminal path segments.
- Mitigate denial-of-service risk via memory exhaustion and traversal-safety controls.
- Rework the public API so common use can be a practical drop-in replacement for `fast-redact`.
- Preserve support for deep key matching, partial string redaction, per-match custom replacers, fuzzy matching, case-insensitive matching, and safe transformation of unsupported values.
- Preserve per-key rule overrides (per-key censor, removal, retain-structure, and same-length replacement on string or regex key selectors) at full parity with the v3 `BlacklistKeyConfig`.
- Preserve the value-type allowlist that restricts which value types are eligible for redaction, defaulting to string-only redaction to match v3.
- Provide a documented major-version migration path from the existing class-based API to the new `fast-redact`-style API shape.

## Rejected Ideas

- Reversible redaction is explicitly rejected. The user does not want any capability to restore original values as if redaction never happened.
- Feature removal in service of `fast-redact` compatibility is explicitly rejected. If portability conflicts with Deep Redact’s existing or desired features, portability loses.
- AI or ML-based PII discovery is not part of this release direction. The product is staying focused on deterministic configurable redaction, not expanding into broad detection or DLP workflows.
- Remote policy-management or platform-style product expansion is not a v4 goal. The near-term mandate is a sharper engine, not a broader platform.

## API And Behaviour Constraints

- Desired compatibility target is `fast-redact`, but only where it does not compromise one-way security or remove differentiated behaviour.
- The current Deep Redact public API is class-based, using `new DeepRedact(...)`, so v4 likely requires breaking changes and migration material.
- The product brief positions compatibility as an adoption lever, not the core reason the library exists.
- Runtime behaviour should be predictable under malformed or hostile input, which implies bounded traversal, memory-aware safeguards, and precompiled or prevalidated configuration where feasible.
- Consumer guidance should strongly encourage declaring the redactor once at application root rather than creating instances ad hoc throughout the codebase.

## Current Repo Signals

- Local `README.md` positions Deep Redact as safer and more configurable than many alternatives, with zero dependencies and support for string and object redaction.
- Local `package.json` currently describes the package as “A fast, safe and configurable zero-dependency library for redacting strings or deeply redacting arrays and objects.”
- Local source currently exposes a class-based `DeepRedact` API and delegates traversal work through `RedactorUtils`.
- Existing tests already cover memory-leak checks, transformer behaviour, circular-reference handling, and serialise or serialize configuration, which is a useful foundation for v4 trust messaging.

## Performance Evidence

- Local benchmark artefact `benchmark.json` shows `fast redact, large object` mean around `0.011ms` and `DeepRedact, default config, large object` mean around `0.119ms`, indicating roughly an order-of-magnitude gap on that benchmark harness.
- Local benchmark artefact `benchmark.json` shows `fast redact, 1000 large objects` mean around `11.679ms` and `DeepRedact, default config, 1000 large objects` mean around `123.320ms`, confirming the same broad performance gap at larger batch size.
- Local load-test artefact `load-test-results.json` shows `FastRedact 100 Objects` average latency around `2.36ms` while `DeepRedact 100 Objects` average latency is around `22.89ms`, reinforcing that performance recovery is not cosmetic; it is product-critical.
- Product brief success criteria were intentionally framed as “within 25 to 50 per cent overhead versus `fast-redact`” rather than absolute parity, because that is more realistic for a richer feature set while still being commercially credible.

## Competitive Intelligence

- `fast-redact` is still the main reference point in this category. Its npm page showed about 9.66 million weekly downloads when checked on 2026-04-07, making it the practical compatibility target for adoption.
- `fast-redact` publicly positions itself as “very fast object redaction” and emphasises path-based redaction, wildcard support, and performance-oriented implementation details.
- `pino` remains a major ecosystem distribution channel. Its npm page showed about 12.4 million weekly downloads when checked on 2026-04-07.
- The `pino` v10.1.0 release notes dated 2025-10-18 explicitly mention a move to `@pinojs/redact`, which indicates that `fast-redact`-style API compatibility has value beyond direct `fast-redact` users.
- A GitHub advisory against `fast-redact` tied to restore internals was published on 2025-09-24 and withdrawn on 2025-11-20 because it relied on an internal undocumented utility, but it still reinforces the argument that reversible redaction expands risk surface and should not be part of Deep Redact v4.

## Positioning Signals

- Working positioning line for v4 is a one-way, security-first redaction engine with practical `fast-redact` portability and richer semantics for messy real-world payloads.
- The strongest differentiation is not abstract “configurability”; it is the combination of deep key matching, path support, partial string redaction, safe transformation of awkward values, and refusal to support restore behaviour.
- The product story should frame security and determinism as design constraints, not optional features.
- The product story should frame portability as a migration benefit, not as capitulation to the incumbent.

## Success Signals

- Success is not defined by revenue in this phase. The user explicitly prioritised near-parity with `fast-redact`, migration adoption, and trust signals such as test coverage and security posture.
- Published benchmark artefacts should be part of the release package, because performance claims must be externally defensible.
- Migration materials should include compatibility examples and clear documentation for users moving from v3 and from `fast-redact`.
- Trust signals should include unit coverage, edge-case coverage, load coverage, and explicit security tests for memory exhaustion and path semantics.

## Open Questions

- Should the v4 public API be a strict superset of `fast-redact`, or should it present a compatibility-first wrapper plus Deep Redact-specific extensions behind additional config keys?
- What exact traversal or allocation limits define acceptable DoS mitigation without breaking valid large-payload use cases?
- What should the precedence rules be when path-based redaction, deep key matching, and regex partial redaction all target overlapping values in the same payload?
- What migration affordances are worth shipping for existing v3 users beyond documentation, such as shims, codemods, warnings, or parallel examples?
- What benchmark set should be published as the authoritative v4 performance bar so performance debates do not drift across incomparable workloads?

## Likely PRD Follow-On Themes

- Architecture and algorithm choices for bounded traversal and memory-aware redaction.
- API design for `fast-redact` compatibility plus Deep Redact-specific capabilities.
- Path grammar specification for `*`, `**`, and `!segment`.
- Error-handling contract that enforces “throw only at initialisation”.
- Test strategy covering security, compatibility, performance, and non-serialisable value handling.
- Documentation and migration plan for the v3 to v4 major release.
