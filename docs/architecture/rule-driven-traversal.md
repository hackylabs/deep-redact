# Rule-Driven Traversal Contract

Deep Redact navigates to the values a configuration targets rather than visiting
every value in a payload. This document is the normative contract for that
behaviour: it defines the traversal model, the cost it incurs, and the
observable behaviour change that the model introduces. It is hand-authored prose
and sits alongside the [precedence](./precedence.md) and
[one-way redaction](./one-way-redaction.md) contracts.

## Traversal Contract

The engine's outer loop iterates the **configured rules**, not the nodes of the
payload. For each rule, the engine navigates directly to the position that rule
targets by following the rule's path segments from the root. A rule whose path
cannot be resolved — because an intermediate or terminal key is absent — is
silently skipped; it does not throw and does not affect any other rule.

Positions not covered by any configured rule are **not visited** during
navigation. The engine never performs a blanket walk of the payload to ask
"which rule matches this node?". It asks the inverse question — "where does this
rule lead?" — and travels only there. The single exception is single-level
wildcard (`*`) expansion: a `*` segment requires the engine to enumerate the
keys of the container at that level so it can descend into each. Enumeration at
a `*` level is the only point at which positions outside a rule's literal path
are touched, and even then only the keys of the specifically targeted container
are read. (Recursive wildcard `**` is not part of this rule-driven navigation;
its handling is not yet implemented in the rule-driven engine, and until then a
configuration containing `**` routes to the `O(N)` traversal mode described below.)

### Cost Model

The traversal cost is a function of the configuration, not of the payload size:

- **Exact-path-only configuration:** `O(P)`, where `P` is the total number of
  path segments across all configured paths. The engine performs one navigation
  step per segment per rule and visits nothing else. Payload breadth and the
  number of non-configured siblings are irrelevant to the cost.
- **Configuration containing single-level `*` segments:**
  `O(P + Σ K_at_wildcard_levels)`, where `K_at_wildcard_levels` is the number of
  keys present in each container reached at a `*` segment. The wildcard forces
  enumeration of that one container's keys; the remainder of the navigation
  stays exact.

This replaces the previous `O(N)` model, in which cost scaled with the total
number of nodes `N` in the payload regardless of how few were configured.

### Relationship To The Prior Compiled Path Executor

The rule-driven engine **supersedes** the compiled path executor (the "fast lane")
that preceded it. That executor was a faster lane layered on top of the general
node-walking traversal: it still visited every plain object and array and fell back
to the general traversal whenever it met a value it could not handle. The
rule-driven engine removes that node walk entirely, so the compiled path executor
has no remaining role and has been removed.

## Documented Behaviour Change

Because non-configured positions are never visited, a runtime value that the
library would otherwise transform is left **unchanged** when it sits at a
position no rule targets. The affected runtime types are:

- `Date`
- `BigInt`
- `Map`
- `Set`
- `Error`
- `RegExp`
- `URL`

Under the rule-driven engine, such a value at a non-configured position appears
in the returned output **exactly as it was in the input** — neither transformed
into its operational representation, nor redacted, nor delegated to another
traversal mode. It is copied by reference into the output graph.

This is a **behaviour change** from the general traversal that preceded it. The
general traversal visited every node and transformed every supported runtime
value it encountered into its operational representation, regardless of whether
any rule targeted that value. The same `Date` that the general traversal would
have serialised into a `{ _transformer: 'date', … }` marker is, under the
rule-driven engine, returned untouched as a live `Date` instance.

### Circular References At Non-Configured Positions

The same principle governs circular references. The general traversal detected a
circular reference while walking the graph and substituted a circular marker
(`{ _transformer: 'circular', path, value }`) at the **back-edge** — the
property whose value points back to an already-visited ancestor. The containing
node is rebuilt as a fresh object and the marker takes the place of that
back-edge child, rather than the whole container being replaced (e.g. for
`loop = { self: loop }` at a non-configured position, the general traversal
emitted `{ self: <circular marker> }`). The rule-driven engine never visits a
non-configured position, so it never detects — and never marks — a circular
reference there. The raw reference is preserved in
the output graph: the output's non-configured property holds the very same
object the input held, cycle and all.

A circular reference **at a configured terminal** is unaffected by this change.
The engine navigates to that terminal and applies the censor before any descent,
so the cycle is never followed and the configured terminal is redacted as
specified.

### Serialised Output

Callers using `serialise: true` or a custom `serialise` function receive fully safe,
non-throwing serialised output regardless of which traversal mode ran. The serialise
output adapter (see [`docs/architecture/serialise-output.md`](./serialise-output.md))
runs over the already-redacted result and builds a safe inert graph before passing it
to `JSON.stringify` or the caller's `serialise` function. Circular references are
neutralised into markers, transformer markers are applied to all supported runtime
types, and `[UNSUPPORTED]` is substituted for any per-value transformation failure —
all inside per-value `try/catch` guards, so the serialised output never throws.

The interim `serialise: true` regression from Story 8.2 (raw cycles causing a throw)
is resolved by this adapter.

### Diagnostic Event Ordering

The rule-driven engine navigates configured rules directly rather than walking
the payload, so structured diagnostic events (e.g. censor / traversal failures)
are emitted in **rule-configuration order**, not payload-key order. The event
**content** — canonical path, stage, value type — is identical to the general
traversal; only the relative ordering between events originating at distinct
configured positions can differ. Consumers must not depend on diagnostic
ordering reflecting the shape of the payload.

### Why This Is Acceptable, And The Escape Hatch

This is an intentional design decision for v4, taken before public release.
The rule-driven model's contract is that the configuration declares what is
sensitive; values nobody configured are, by definition, outside that
declaration.

Callers who need every transformable value processed into a stable serialisable form
should use `serialise: true`; the serialise adapter handles all supported runtime
types (Date, BigInt, Map, Set, Error, RegExp, URL) and neutralises circular
references regardless of which traversal mode ran. Key-based rules (`keys`),
substring rules, and recursive-wildcard (`**`) rules route to the `O(N)` traversal
mode, which visits the matched breadth of the payload. Single-level `*` rules are
**not** an escape hatch: they stay in the rule-driven engine. Choosing exact paths
(optionally with single-level `*`) is choosing the targeted model; choosing
key, substring, or `**` rules is choosing the breadth-visiting `O(N)` model.

## Traversal Mode Boundary (Forward Reference)

Which mode a configuration uses is decided at compile time. A future
`pathDrivenOnly` determination will gate the rule-driven mode against the
`O(N)` traversal mode: configurations using only exact paths and single-level
`*` segments take the rule-driven path, while configurations with key,
substring, or recursive-wildcard (`**`) rules take the breadth-visiting path.
The precise shape of that flag is finalised alongside the `**` and substring
work in Stories 8.4 and 8.5. This document defines the **contract** the modes
must honour; it does not define the flag.
