# Serialise Output Contract

This document is the normative contract for Deep Redact's serialised output
stage. It is hand-authored prose and complements the
[rule-driven traversal](./rule-driven-traversal.md),
[precedence](./precedence.md), and
[one-way redaction](./one-way-redaction.md) contracts.

---

## Output Stages

Deep Redact has two distinct output stages:

1. **Redaction traversal** — walks the payload, applies configured rules, and
   returns a structured result. The traversal is a pure-JavaScript object graph:
   runtime values at non-configured positions are returned as-is (by reference);
   circular references at those positions are also preserved by identity.

2. **Serialise adapter** — runs only when `serialise` is set to `true` or a
   function. It receives the already-redacted structured result and converts it
   into a safe, serialisable form. Only after this stage are transformer markers
   applied and cycles neutralised.

---

## `serialise: false` Raw Output Contract

When `serialise` is unset, `false`, or `null`, the redaction traversal result is
returned directly to the caller without any further processing. The contract is:

- **Redacted positions** — values at configured paths are replaced by the
  configured censor output (e.g. `'[REDACTED]'`).
- **Non-redacted positions** — all other values are returned **as they appeared
  in the input**, including runtime types such as `Date`, `BigInt`, `Map`,
  `Set`, `Error`, `RegExp`, and `URL`.
- **Circular references** — back-edge cycle references at non-configured positions
  are preserved in the output by identity. The caller is responsible for ensuring
  the resulting graph is safe to serialise if they later pass it to
  `JSON.stringify` directly.
- **No transformer markers emitted** — the traversal never emits
  `{ _transformer: … }` marker objects at non-configured positions. Markers are
  exclusively produced by the serialise adapter (see below).
- **No throws** — the traversal does not throw during normal operation, even in
  the presence of circular references or unsupported runtime values at
  non-configured positions. (A configured censor that throws is caught and
  degraded to `[UNSUPPORTED]`.)

> **Migration note (Story 8.3 behaviour change):** Prior to this story, the
> general traversal transformed supported runtime values inline even under
> `serialise: false`. A `Date` at a non-configured position previously produced
> `{ _transformer: 'date', datetime: '…' }` in the output; it now produces the
> live `Date` instance. Code that relied on transformer markers being present in
> the structured output must either use `serialise: true` or perform its own
> post-processing.

---

## `serialise: true` Safe-String Guarantee (FR23/FR26)

When `serialise: true`, the serialise adapter builds a safe inert plain graph
from the structured result and then calls `JSON.stringify` with **no** replacer.
The output is always a `string`. The adapter provides the following guarantees
for every (type × position) combination of the supported runtime types:

- The output is a string.
- The call does not throw (FR26).
- The string is `JSON.parse`-able.
- The string contains no raw source value selected by the configured redaction
  policy (one-way redaction).
- The string is byte-identical across repeated runs on structurally-equal inputs
  (FR19 determinism).

The supported runtime types and their adapter treatment are listed in
[Transformer Marker Shapes](#transformer-marker-shapes) below.

The adapter does not expand redaction coverage. Alias branches that were not
selected by the configured policy remain unredacted values in the already-redacted
structured result, then are serialised like any other non-redacted value. See
[Alias Boundaries And Path-Correct Output](./rule-driven-traversal.md#alias-boundaries-and-path-correct-output)
for the rule-driven traversal contract.

---

## Transformer Marker Shapes

The serialise adapter applies transformer dispatch via the same
`resolveTransformedValue` helper as the traversal-time system, so marker shapes
are canonical and unchanged across versions. The built-in shapes are:

| Type     | Marker shape |
|----------|-------------|
| `BigInt` | `{ _transformer: 'bigint', value: { radix: 10, number: '<string>' } }` |
| `Date`   | `{ _transformer: 'date', datetime: '<ISO-8601 string>' }` |
| `Error`  | `{ _transformer: 'error', value: { type: '<name>', message: '<msg>', stack: '<stack>' } }` |
| `Map`    | `{ _transformer: 'map', value: { '<key>': <value>, … } }` |
| `RegExp` | `{ _transformer: 'regex', value: { source: '<source>', flags: '<flags>' } }` |
| `Set`    | `{ _transformer: 'set', value: [ <element>, … ] }` |
| `URL`    | `{ _transformer: 'url', value: '<href>' }` |

Custom transformers registered via `transformers.byConstructor` or
`transformers.byType` are applied first and can override these shapes.

---

## Circular-Reference Neutralisation In The Adapter

The adapter walks the already-redacted result using a **try/finally** `WeakSet`
(`seen`) to track objects currently on the active traversal stack. When an
object that is already in `seen` is encountered at a child position, the adapter
emits a canonical circular marker rather than recursing further:

```json
{ "_transformer": "circular", "path": "<current-path>", "value": "<first-seen-path>" }
```

`path` is the canonical path at which the cycle was detected; `value` is the
canonical path at which the identity was first entered. Path segments use
dot-notation for bare identifiers and bracket-notation for non-identifier keys
(e.g. `records.0.parent` for an array index, `obj["some-key"]` for a key that
is not a valid identifier).

The `seen` set follows the same try/finally discipline as the traversal's
`withActiveIdentity` guard: an identity is added before recursing into a
container and removed in a `finally` block, so **aliased objects** (the same
identity reachable via two unrelated paths) are processed independently rather
than being mis-identified as cycles.

---

## `[UNSUPPORTED]` Semantics Under Serialise (FR24/FR25/FR27)

Per-value isolation is enforced by a `try/catch` guard around each transformer
invocation in the adapter. If a transformer throws for a given value — including
via a throwing `toJSON` or a throwing accessor on the source object — only that
value is replaced with the string `'[UNSUPPORTED]'`. The rest of the output is
intact and correctly serialised. The adapter call does not throw, and no source
detail from the failed value leaks into the output (security NFR).

---

## User `serialise` Function Sub-Contract

When `serialise` is a function, the adapter passes the **safe graph** — the
fully-built, cycle-neutralised, marker-applied plain object — to the function.
The function receives a value that is safe to pass to `JSON.stringify`, but it
may return any string it chooses. Any throw from the user-supplied function is
the caller's responsibility and is not caught by the adapter.

---

## Default-Safety Decision

The default value of `serialise` is `false`. This is intentional:

- The library never throws during redaction (FR26). Under `serialise: false`,
  runtime values at non-configured positions are returned raw and do not cause
  throws.
- `serialise: false` returns faithful structured output that is safe to
  serialise when the input itself contains no non-serialisable values (plain
  objects, arrays, strings, numbers, booleans, null, undefined).
- Guaranteed JSON-safe, non-throwing serialised output — including safe handling
  of runtime types, circular references, and per-value failure isolation — is
  delivered by `serialise: true`.
