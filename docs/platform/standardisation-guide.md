# Deep Redact Standardisation Guide

This guide is generated from canonical release artefacts. It covers supported capabilities, targeting semantics, migration expectations, verification evidence, and adoption decision scope for platform and security evaluators.

## Supported capabilities

Deep Redact is a one-way redaction library. There is no `restore` or `unredact` capability.

The following capabilities are supported and covered by validated worked examples:

- [key targeting](../examples/key-targeting.md)
- [fuzzy key matching](../examples/fuzzy-key-matching.md)
- [case-insensitive key matching](../examples/case-insensitive-key-matching.md)
- [path targeting](../examples/path-targeting.md)
- [path-segment ignore selectors](../examples/path-segment-ignore.md)
- [regex property matching](../examples/regex-property-matching.md)
- [per-key rule overrides](../examples/per-key-rule-overrides-string.md)
- [substring targeting](../examples/substring-targeting.md)
- [replacement behaviour](../examples/replacement-and-removal.md)
- [structured versus serialised output](../examples/serialised-output.md)
- [transformer support](../examples/custom-transformer.md)
- [value-type allowlist](../examples/value-type-allowlist-default.md)
- [ignored-value-type behaviour](../examples/ignored-value-types.md)
- [graceful [UNSUPPORTED] degradation](../examples/graceful-error-replacement.md)
- [optional console.* redaction](../examples/console-redaction.md)

## Targeting semantics

Rules are evaluated in precedence order. When multiple rules match a node, the higher-precedence rule wins:

1. **exact string-path** — full dot-notation path, literal match
2. **structured path** — compiled path segments with wildcard and exclusion support
3. **exact key** — literal property name, no path context
4. **regex property** — regular-expression match against the property name
5. **substring** — match against string value content

When `retainStructure: true` is set on a matched rule, descendant nodes remain traversable for lower-precedence rules. Without it, the matched node and all descendants are replaced as a unit.

For the canonical precedence contract and full matrix, see [docs/architecture/precedence.md](../architecture/precedence.md).

## Migration expectations

### fast-redact migration

The following intentional behavioural divergences from `fast-redact` have been validated for Deep Redact v4:

- **no-restore-api**: With serialize: false, fast-redact exposes a redactor.restore method for caller-side reversal. → Deep Redact v4 redactors expose no restore, unredact, or reverse-operation method. (Deep Redact v4 is intentionally one-way.)
- **no-strict-option**: With strict: false and serialize: false, fast-redact returns the primitive input unchanged when the redactor sees a primitive instead of an object. → Deep Redact v4 rejects the unsupported `strict` option during initialisation. (Deep Redact v4 does not provide a strict compatibility switch for primitive input handling.)
- **omitted-serialise-structured-output**: fast-redact returns a JSON string when `serialize` is omitted. → Deep Redact v4 returns structured output when `serialise` is omitted. (The default output type intentionally differs.)
- **non-string-censor-value**: fast-redact accepts documented non-string censor values such as number literals. → Deep Redact v4 rejects root censor values that are neither strings nor functions. (The v4 public Censor contract is intentionally narrower.)

For the complete migration matrix and fixture-verified examples, see [docs/migration/from-fast-redact.md](../migration/from-fast-redact.md).

### Deep Redact v3 migration

Deep Redact v4 introduces a factory API (`deepRedact(config)`) to replace the v3 class instantiation pattern (`new DeepRedact(config)`). The redaction method is unchanged.

For the complete v3 migration matrix and fixture-verified examples, see [docs/migration/from-v3.md](../migration/from-v3.md).

## Verification evidence

The following artefacts have been produced and committed as part of the v4 release verification:

- **Installation verification matrix** — verified across Node.js 22/24, npm, pnpm, yarn, bun, and deno: `test/artefacts/install-matrix/`
- **Worked-example manifest** — all examples validated against fixture inputs and expected outputs: `docs/examples/manifest.json`
- **Benchmark artefacts** — performance comparison against fast-redact: `test/artefacts/benchmarks/`
- **Benchmark results document** — rendered from committed artefacts: `docs/benchmarks/results.md`

Supported installation environments: Node.js 22 LTS and 24 LTS (npm, pnpm, yarn, bun); Deno 2.x.

Performance: Deep Redact v4 has been benchmarked against `fast-redact` on comparable path-based workloads. Benchmark artefacts are committed and gate release candidates.

## Adoption decision scope

Deep Redact v4 is a single-library, one-way redaction engine. Guidance on what is in and out of scope:

**In scope:**
- Service-root singleton initialisation for log and payload redaction
- Flexible targeting of sensitive fields by key, path, regex, or substring
- Structured and serialised output formats
- Optional `console.*` redaction via an explicit adapter

**Out of scope:**
- AI or ML-based PII discovery
- Remote or dynamic policy management
- Reversible redaction, restore, or unredact operations
- Broader platform work beyond this library

For the canonical one-way redaction contract, see [docs/architecture/one-way-redaction.md](../architecture/one-way-redaction.md).
