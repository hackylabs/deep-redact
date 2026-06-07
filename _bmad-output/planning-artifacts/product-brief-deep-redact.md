---
title: "Product Brief: deep-redact"
status: "complete"
created: "2026-04-07T11:56:31Z"
updated: "2026-04-07T11:58:36Z"
inputs:
  - "README.md"
  - "package.json"
  - "benchmark.json"
  - "load-test-results.json"
  - "test/bench/redact.bench.ts"
  - "User discovery session (2026-04-07)"
  - "https://github.com/davidmarkclements/fast-redact"
  - "https://www.npmjs.com/package/fast-redact"
  - "https://www.npmjs.com/package/pino"
  - "https://github.com/advisories/GHSA-ffrw-9mx8-89p8"
---

# Product Brief: Deep Redact v4

## Executive Summary

Deep Redact was created to fill a real gap in the OSS redaction market: production systems rarely present sensitive data as neat, predictable object paths. Teams need to redact nested arrays and objects without declaring every key at every level, partially redact strings anywhere in a payload, customise replacements per match, and safely handle awkward runtime values such as circular references, `BigInt`, `Date`, class instances, functions, and symbols. That need still exists, but the current brownfield codebase has drifted away from its original promise.

The next release should be a deliberate product reset. Local benchmark artefacts now show the current default path is roughly an order of magnitude slower than `fast-redact` on comparable large-object workloads, while two strategic gaps remain unresolved: memory-exhaustion safeguards and expressive path redaction with wildcard and ignore semantics. At the same time, the wider Node logging ecosystem still clusters around `fast-redact`-style APIs, so compatibility has real distribution value.

Deep Redact v4 should therefore be positioned as a major release: a one-way, security-first redaction engine that can serve as a practical drop-in replacement for `fast-redact` while preserving the richer capabilities that made Deep Redact worth building in the first place. The release should optimise for three outcomes: near-parity performance on equivalent workloads, lower migration friction for `fast-redact` adopters, and trust signals strong enough for security-conscious teams to standardise on a singleton redactor at application root. This is a major-version migration story from the current class-based API, so the transition must be explicit, documented, and low drama for existing users.

## The Problem

Backend engineers and platform teams increasingly rely on structured logs, error telemetry, queue payloads, and transient JSON or XML blobs that may contain secrets, credentials, or personal data in inconsistent shapes. Existing tools often assume that teams know exact object paths in advance, only need whole-value replacement, or can safely mutate and later restore original values. Those assumptions break down in real production systems.

Today, teams either accept brittle path lists, bolt regex masking on afterwards, or write bespoke logic to cope with circular references and other non-serialisable values. That creates operational risk in the hottest part of the logging path. For Deep Redact itself, the cost of feature growth is now visible: the implementation has become more complex, slower than the benchmark it wants to replace, and harder to present as the easiest option for teams already invested in `fast-redact` semantics.

## The Solution

Deep Redact v4 will reframe the library as a singleton-safe redaction engine for Node.js and TypeScript workloads that need both portability and richer redaction semantics. The primary API should mirror `fast-redact` closely enough to support low-friction adoption for common cases, while extending the model with:

- deep key matching without exhaustive per-level key declaration
- partial string redaction via regex at root level or deep within a payload
- custom replacers per match
- per-key redaction overrides — censor, removal, retain-structure, and same-length replacement — on string or regex key selectors
- restriction of redaction to specific value types, defaulting to redacting strings only
- optional fuzzy and case-insensitive matching per key
- safe transformation of non-serialisable and circular values
- path-based redaction with `*`, `**`, and `!<key|index>` segments
- early configuration validation, with no runtime throwing after initialisation

Where exact `fast-redact` parity would weaken one-way security guarantees or require removal of differentiated capabilities, v4 should favour safe, additive divergence and document it clearly. Compatibility is an adoption lever, not the product’s reason for existing.

Under the hood, the v4 thesis is deliberate constraint. Redaction must be one-way and deterministic. The engine should prefer precompiled configuration, bounded traversal, and memory-aware safeguards so performance remains close to `fast-redact` on equivalent workloads while behaving more safely on hostile or malformed input.

## What Makes This Different

Deep Redact v4 will stand apart in four ways. First, it is opinionated about one-way redaction and will not support restoration of original values. That is a feature, not a limitation, for security-conscious teams. Second, it combines path rules, deep key matching, and partial string redaction, which better matches messy production payloads than path-only approaches. Third, it treats circular references and non-serialisable values as normal runtime cases rather than caller mistakes. Fourth, it uses `fast-redact` compatibility to reduce migration friction without sacrificing the features that justified Deep Redact in the first place.

## Who This Serves

The primary user is the Node.js or TypeScript backend engineer who owns logging, telemetry, and payload handling in production services. They want a redactor they can initialise once, trust under load, and use without redesigning payloads around the library.

The secondary influencer is the platform, security, or compliance-minded engineering team that needs deterministic one-way redaction, predictable failure behaviour, and evidence that the library is tested against hostile inputs, awkward runtime values, and performance regressions.

## Success Criteria

- Equivalent path-based benchmarks close the current gap and land within 25 to 50 per cent overhead versus `fast-redact` on published comparable workloads.
- The new API supports `fast-redact`-style migration with minimal code changes for common cases, backed by a clear v3-to-v4 migration guide and compatibility examples.
- After successful initialisation, runtime redaction never throws for supported inputs, including circular and non-serialisable values.
- The shipped release has no known runtime security vulnerabilities, and security issues are treated as release blockers rather than follow-up work.
- The release ships with published benchmark artefacts, broad unit, load, and edge-case coverage, and explicit security tests for memory-exhaustion and path-handling boundaries.
- Early adopters describe v4 as easier to standardise in application bootstrap than bespoke redaction wrappers or current alternatives.

## Scope

In scope for v4:

- a `fast-redact`-compatible primary API shape
- path-based redaction including `*`, `**`, and `!segment`
- preservation of deep key matching, regex-based partial redaction, custom replacers, fuzzy matching, case-insensitive matching, and the safe transformation pipeline
- preservation of per-key rule overrides on string or regex key selectors, and of the value-type allowlist that defaults to string-only redaction
- one-way deterministic redaction only
- a documented major-version migration path from the existing class-based API
- early configuration validation with singleton-style initialisation guidance
- DoS mitigation focused on memory exhaustion and traversal safety
- benchmark-led performance recovery and published trust artefacts

Explicitly out of scope:

- restoring original values or any reversible or unredact workflow
- removing differentiated Deep Redact features purely to match `fast-redact`
- AI or ML-based PII discovery, remote DLP integrations, or policy-management platforms
- broad product expansion beyond the core redaction engine before v4 proves adoption and performance

## Vision

If v4 succeeds, Deep Redact becomes the trusted default for engineers who want `fast-redact` portability without accepting narrower semantics or reversible redaction. Over the next two to three years, it can grow from a strong library into the security-first redaction foundation for application logs, telemetry pipelines, and payload sanitisation across the Node ecosystem, with first-class ecosystem integrations and a reputation built on performance evidence, deterministic behaviour, and conservative security design.
