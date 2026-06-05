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
are read. Recursive wildcard `**` is intentionally outside this rule-driven
navigation. A configuration containing `**` routes to the `O(N)` traversal mode
described below, where the generic traversal resolves zero, one, or many
intermediate path segments.

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

### Alias Boundaries And Path-Correct Output

Redaction coverage is path-based, not identity-wide. If two runtime branches
point at the same source object, an exact path such as `a.secret` selects only
that configured position. It does not imply that every other alias of `a` is
also covered. For example, with `{ a: shared, b: { ref: shared } }` and
`paths: ['a.secret']`, the structured result redacts `a.secret` and leaves
`b.ref.secret` outside the configured target set. The same boundary applies when
`serialise: true` is enabled: the serialise adapter makes the result safe to
stringify, but it does not widen the caller's redaction policy.

When callers need identity-wide secrecy for a property name, they must either
configure every alias path explicitly, such as `['a.secret', 'b.ref.secret']`,
or use a breadth-visiting targeting mode such as `keys: ['secret']`. Key-based
rules route to the generic `O(N)` traversal and apply wherever that key is
encountered.

Structured output is therefore **path-correct rather than identity-preserving**.
If two configured exact retain paths, or two concrete wildcard retain matches,
resolve to the same source object identity, each configured path applies its own
policy and function-censor context. The returned graph may contain distinct
copies for those alias branches so that a retain policy from one path cannot be
replayed for another path.

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
should use `serialise: true` or a custom `serialise` function; the serialise
adapter handles all supported runtime types (Date, BigInt, Map, Set, Error,
RegExp, URL) and neutralises circular references regardless of which traversal
mode ran. Transformation and circular neutralisation are output-stage behaviour
gated by serialised output, not a reason to choose substring, key, or
recursive-wildcard targeting.

Targeting modes that must inspect payload breadth route to the `O(N)` traversal:
key rules (`keys`), regex-key rules, recursive-wildcard (`**`) rules, regex or
ignore path segments, substring rules (`stringTests`), fuzzy key matching, and
case-insensitive key matching. These targeting modes are **not** transformation
escape hatches: under `serialise: false`, non-redacted runtime values remain raw.
Single-level `*` rules are also not an escape hatch: they stay in the rule-driven
engine when they are otherwise safe. Choosing exact paths (optionally with safe
single-level `*`) is choosing the targeted model; choosing any breadth-visiting
targeting mode is choosing the generic `O(N)` model.

## Traversal Mode Boundary

Which mode a configuration uses is decided at compile time by the
`pathDrivenOnly` flag. A configuration takes the **rule-driven** path when all of
these conditions hold:

- It contains at least one path rule.
- Every path rule is exact or every dynamic path rule is single-wildcard-only:
  its segments are exact properties/indices or single-level `*`.
- There is no unsafe wildcard-depth overlap between any path rules. Unsafe means
  a wildcard enumeration depth shares a prefix with another rule's non-terminal
  concrete segment: `a.b.c` with `a.*.d`, and `a.b.*` with `a.*.c`, both route
  to the generic traversal; `account.token` with `profiles.*.email` remains
  rule-driven when otherwise safe.
- There are no recursive-wildcard (`**`) segments, regex path segments, ignore
  path segments, or ignore-regex path segments.
- There are no key rules, regex-key rules, or substring rules (`stringTests`).
- `fuzzyKeyMatch` is false or unset.
- `caseSensitiveKeyMatch` is true or unset.

Every other configuration takes the breadth-visiting `O(N)` traversal mode,
including any configuration with `stringTests`.

Single-level `*` wildcard support landed in **Story 8.4**: a `*` segment is
navigated by enumerating only the keys of the container reached at that depth
(`O(K)` at the wildcard level), not by walking the whole payload. Exact path
segments before and after the `*` still use direct property/index access.
Recursive-wildcard (`**`) and key-based rules were pinned in **Story 8.5** as
intentionally outside the rule-driven engine: they route to the `O(N)` generic
traversal and are applied there alongside any path rules in one pass. Substring
rules (`stringTests`) follow the same generic traversal boundary because the
runtime must inspect string values across the payload to know whether they match.

Compile-time selection is necessary but not sufficient: the rule-driven engine
is payload-aware at call time. A non-plain prototype on a configured path, a
non-plain container reached at a wildcard depth (when the `*` is not the
terminal), or a hostile accessor delegates the whole call to the `O(N)`
traversal, which produces identical output. A `*` **terminal** whose matched
value is a non-plain object or circular reference is censored wholesale (censor
wins, no descent, no delegation), mirroring the exact-terminal behaviour. This
document defines the **contract** the modes must honour; the flag's
implementation lives in the compiler.

The non-plain root/intermediate container cases above are governed by the
existing prototype-pollution guard. A fuller prototype-handling contract remains
deferred; this document records only the traversal-mode boundary.
