import type { FunctionCensorContext, PathSegments } from '../../types/paths.js'
import type {
  CompiledRedactionPolicy,
  CompiledRedactorPlan,
} from '../compiler/compile-redactor-plan.js'
import type { ExactPathSegment, PathSegment } from '../matching/path-parser.js'
import { appendCanonicalPathSegment } from '../matching/path-normaliser.js'
import { applyRedaction, isRedactableType, isRemovedValue } from '../replacement/apply-redaction.js'
import {
  createDiagnosticEvent,
  createFailureDiagnosticSnapshot,
} from '../diagnostics/diagnostic-event.js'
import { emitDiagnosticEvent } from '../diagnostics/diagnostics-sink.js'
import { isPlainObject, setObjectEntry } from './redact-value.js'
import {
  createBudgetExceededError,
  createTraversalBudget,
  isBudgetExceededError,
  isDepthExceeded,
  isNodeBudgetExceeded,
  type TraversalBudget,
} from './traversal-budget.js'

export type PathDrivenExecutor = (input: unknown) => unknown

const unsupportedValue = '[UNSUPPORTED]'

// Shared placeholder context for literal-censor / remove redaction, where the context is
// never read. Avoids a per-leaf allocation on the hot path.
const noContext: FunctionCensorContext = Object.freeze({
  matchedPath: Object.freeze([]) as PathSegments,
  rootInput: undefined,
  rulePath: Object.freeze([]) as PathSegments,
})

// A terminal redaction rule stored at a trie node. An `exact` terminal carries the statically
// known canonical path (its rulePath is also the concrete matched path, since exact paths have
// no wildcards). A `wildcard` terminal is reached via one or more enumerated `*` keys, so its
// concrete matched path — and therefore its canonical path — is only known at match time and is
// built lazily from the keys traversed (see appendMatchedKey / renderConcreteCanonicalPath).
interface ExactTerminalRule {
  readonly kind: 'exact';
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
  readonly canonicalPath: string;
}

interface WildcardTerminalRule {
  readonly kind: 'wildcard';
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
}

type TerminalRule = ExactTerminalRule | WildcardTerminalRule

// A node in the compiled prefix trie. Children are indexed into per-kind maps at build time
// so runtime lookup is O(1) with no closures or scans on the hot path. `propertyChildren` /
// `indexChildren` are `undefined` when a node has no children of that kind. `wildcardChild` is
// the single `*` edge (a sibling to the keyed maps). `subtreeHasWildcard` is a build-time hint:
// `true` when this node or any descendant carries a wildcard edge or wildcard terminal. It gates
// concrete-path construction during descent so the exact-only hot path allocates nothing.
interface PathTreeNode {
  rule?: TerminalRule;
  propertyChildren?: Map<string, PathTreeNode>;
  indexChildren?: Map<number, PathTreeNode>;
  wildcardChild?: PathTreeNode;
  subtreeHasWildcard?: boolean;
}

type ContainerCopy = Record<string, unknown> | unknown[]

interface AncestorCopyRecord {
  readonly level: PathTreeNode;
  readonly matchedPathKey: string | undefined;
  readonly copy: ContainerCopy;
}

type AncestorCopies = Map<object, AncestorCopyRecord[]>

// A persistent, append-only chain of the concrete keys descended below a retain entry, stored
// leaf-to-root. `descendRetain` conses one node in O(1); the concrete matched-path array and the
// canonical-path string are materialised once, lazily, only when a function censor or a failure
// diagnostic at a leaf actually reads them. Descending a deep retained subtree is therefore
// O(depth) total rather than the previous O(depth^2) per-level array spread + canonical
// concatenation (AC 2).
interface RetainKeyChain {
  readonly parent: RetainKeyChain | undefined;
  readonly key: string | number;
}

// An inherited `retainStructure` policy flowing down from a retained ancestor. While active,
// every leaf beneath the ancestor is redacted with `policy`, unless a more-specific exact path
// rule overrides it. The position is tracked lazily: `basePath`/`baseCanonical` capture the
// retain entry point, and `descended` conses each container key traversed since, so function
// censor contexts and failure diagnostics can mirror the general traversal exactly without
// rebuilding the path on every descent level.
interface InheritedRetain {
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
  readonly basePath: readonly (string | number)[];
  readonly baseCanonical: string;
  readonly descended: RetainKeyChain | undefined;
}

// Lazily shallow-copies a container, preserving sparse array holes (mirrors the general
// traversal's length-sized sparse result + `if (!(index in value)) continue`). Non-targeted
// sibling slots are carried over by reference, so a non-configured transformable / circular
// value is preserved untouched — never visited, never transformed.
const shallowCopyContainer = (container: Record<string, unknown> | unknown[]): Record<string, unknown> | unknown[] => {
  if (Array.isArray(container)) {
    const copy: unknown[] = []
    copy.length = container.length

    for (let index = 0; index < container.length; index += 1) {
      if (index in container) {
        copy[index] = container[index]
      }
    }

    return copy
  }

  return { ...container }
}

// Extends the concrete matched-key path by one enumerated key. Allocates a fresh array, so it is
// only ever called within the wildcard branch (or while descending toward one) — never on the
// exact-only hot path, where `matchedPath` stays `undefined`. Unlike retained-subtree descent
// (which is bounded by payload depth and so uses the lazy RetainKeyChain to stay O(depth) total,
// AC 2), the wildcard matched path grows only with the compiled rule's wildcard depth — a small
// compile-time constant — so a per-enumerated-key spread here is bounded, not quadratic in N.
const appendMatchedKey = (
  matchedPath: readonly (string | number)[] | undefined,
  key: string | number,
): (string | number)[] => {
  return matchedPath === undefined ? [key] : [...matchedPath, key]
}

// Renders a concrete canonical path string for a wildcard-matched terminal from the keys actually
// traversed. Numeric keys (array indices) render as index segments; string keys (object
// properties) render as property segments — matching the general traversal's canonical paths.
// Called only at a wildcard terminal (diagnostic / retain entry), never per hop.
const renderConcreteCanonicalPath = (matchedPath: readonly (string | number)[]): string => {
  let path: string | undefined

  for (const key of matchedPath) {
    const segment: ExactPathSegment = typeof key === 'number'
      ? { kind: 'index', value: key }
      : { kind: 'property', value: key }
    path = appendCanonicalPathSegment(path, segment)
  }

  return path ?? ''
}

const renderAncestorCopyMatchedPath = (
  matchedPath: readonly (string | number)[] | undefined,
): string | undefined => {
  if (matchedPath === undefined) {
    return undefined
  }

  return JSON.stringify(matchedPath.map((segment) => [typeof segment, segment]))
}

const getAncestorCopy = (
  ancestorCopies: AncestorCopies,
  source: object,
  level: PathTreeNode,
  matchedPath: readonly (string | number)[] | undefined,
): ContainerCopy | undefined => {
  const records = ancestorCopies.get(source)

  if (records === undefined) {
    return undefined
  }

  const matchedPathKey = renderAncestorCopyMatchedPath(matchedPath)
  const record = records.find((candidate) => {
    return candidate.level === level && candidate.matchedPathKey === matchedPathKey
  })

  return record?.copy
}

const storeAncestorCopy = (
  ancestorCopies: AncestorCopies,
  source: object,
  level: PathTreeNode,
  matchedPath: readonly (string | number)[] | undefined,
  copy: ContainerCopy,
): void => {
  const matchedPathKey = renderAncestorCopyMatchedPath(matchedPath)
  const records = ancestorCopies.get(source)

  if (records === undefined) {
    ancestorCopies.set(source, [{ copy, level, matchedPathKey }])
    return
  }

  if (records.some((candidate) => candidate.level === level && candidate.matchedPathKey === matchedPathKey)) {
    return
  }

  records.push({ copy, level, matchedPathKey })
}

const insertRule = (
  root: PathTreeNode,
  segments: readonly PathSegment[],
  rule: TerminalRule,
): void => {
  let level = root

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    let node: PathTreeNode

    switch (segment.kind) {
      case 'index': {
        const map = level.indexChildren ??= new Map<number, PathTreeNode>()
        const existing = map.get(segment.value)

        if (existing === undefined) {
          node = {}
          map.set(segment.value, node)
        } else {
          node = existing
        }

        break
      }
      case 'wildcard': {
        node = level.wildcardChild ??= {}
        break
      }
      case 'property': {
        const map = level.propertyChildren ??= new Map<string, PathTreeNode>()
        const existing = map.get(segment.value)

        if (existing === undefined) {
          node = {}
          map.set(segment.value, node)
        } else {
          node = existing
        }

        break
      }
      default: {
        // Only property/index/wildcard segments reach the trie — `pathDrivenOnly` excludes `**`,
        // ignore, and regex selectors. A stray dynamic segment is a compiler/classification bug.
        throw new TypeError(`Unsupported path segment kind "${segment.kind}" in rule-driven trie.`)
      }
    }

    if (index === segments.length - 1) {
      // Duplicate selectors collapsing to one trie terminal are rejected at validation
      // (validate-paths.ts), so this slot is empty here; last-wins mirrors the exact-path
      // lookup table if a collision ever reached this far.
      node.rule = rule
    }

    level = node
  }
}

// Post-build pass marking every node whose subtree (including its own wildcard terminal/edge)
// carries a wildcard, so descent can decide cheaply whether to build a concrete matched path.
const markWildcardSubtrees = (node: PathTreeNode): boolean => {
  let hasWildcard = node.wildcardChild !== undefined || node.rule?.kind === 'wildcard'

  if (node.wildcardChild !== undefined && markWildcardSubtrees(node.wildcardChild)) {
    hasWildcard = true
  }

  if (node.indexChildren !== undefined) {
    for (const child of node.indexChildren.values()) {
      if (markWildcardSubtrees(child)) {
        hasWildcard = true
      }
    }
  }

  if (node.propertyChildren !== undefined) {
    for (const child of node.propertyChildren.values()) {
      if (markWildcardSubtrees(child)) {
        hasWildcard = true
      }
    }
  }

  node.subtreeHasWildcard = hasWildcard

  return hasWildcard
}

const buildPrefixTree = (plan: CompiledRedactorPlan): PathTreeNode => {
  const root: PathTreeNode = {}

  for (const rule of Object.values(plan.exactPathRules)) {
    insertRule(root, rule.segments, {
      canonicalPath: rule.canonicalPath,
      kind: 'exact',
      policy: rule.policy,
      rulePath: rule.rulePath,
    })
  }

  for (const rule of plan.dynamicPathRules) {
    // When pathDrivenOnly is true every dynamic rule is single-wildcard-only (property/index/`*`).
    insertRule(root, rule.segments, {
      kind: 'wildcard',
      policy: rule.policy,
      rulePath: rule.rulePath,
    })
  }

  markWildcardSubtrees(root)

  return root
}

const emitCensorFailure = (
  plan: CompiledRedactorPlan,
  canonicalPath: string,
  value: unknown,
  error: unknown,
): void => {
  emitDiagnosticEvent(
    plan.diagnostics,
    createDiagnosticEvent(
      plan.diagnostics,
      canonicalPath,
      createFailureDiagnosticSnapshot({ error, stage: 'censor', value }),
    ),
  )
}

// Applies a terminal exact-path rule's policy. Returns the redacted value (possibly the
// removed sentinel). A throwing function censor degrades locally to [UNSUPPORTED] with a
// structured diagnostic, mirroring the general traversal — it is never rethrown.
const applyTerminalRule = (
  value: unknown,
  rule: ExactTerminalRule,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
): unknown => {
  // The value-type allowlist outranks the rule match (Story 9.1). A type-vetoed value is returned
  // raw, byte-identical to an unmatched value of the same type. Callers route a vetoed *container*
  // to the general traversal before reaching here, so this only ever vetoes leaves.
  if (!isRedactableType(value, plan.valueTypes)) {
    return value
  }

  try {
    if (typeof rule.policy.censor === 'function') {
      return applyRedaction(value, rule.policy, {
        matchedPath: rule.rulePath,
        rootInput,
        rulePath: rule.rulePath,
        terminalKey: rule.rulePath.at(-1) as string | number,
      })
    }

    return applyRedaction(value, rule.policy, noContext)
  } catch (error) {
    emitCensorFailure(plan, rule.canonicalPath, value, error)
    return unsupportedValue
  }
}

// Applies a terminal wildcard-path rule's policy at a concretely matched key path. The function
// censor context and the failure diagnostic use the concrete path (`users.email`), not the
// configured wildcard signature (`*.email`) — matching the general traversal exactly. The
// configured `rule.rulePath` (with its `{ any: true }` markers) is still surfaced as `rulePath`,
// as the general traversal does for dynamic rules.
const applyWildcardTerminalRule = (
  value: unknown,
  rule: { readonly policy: CompiledRedactionPolicy; readonly rulePath: PathSegments },
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  matchedPath: readonly (string | number)[],
): unknown => {
  // Value-type allowlist outranks the wildcard match (Story 9.1); a vetoed leaf is returned raw.
  if (!isRedactableType(value, plan.valueTypes)) {
    return value
  }

  try {
    if (typeof rule.policy.censor === 'function') {
      return applyRedaction(value, rule.policy, {
        matchedPath: Object.freeze([...matchedPath]) as PathSegments,
        rootInput,
        rulePath: rule.rulePath,
        terminalKey: matchedPath.at(-1) as string | number,
      })
    }

    return applyRedaction(value, rule.policy, noContext)
  } catch (error) {
    emitCensorFailure(plan, renderConcreteCanonicalPath(matchedPath), value, error)
    return unsupportedValue
  }
}

// Walks the leaf-to-root retain key chain into a root-to-leaf key array. Called only at a leaf
// where the concrete path is actually read, so its O(depth) cost is paid once per consuming leaf
// rather than once per descent level.
const collectDescendedKeys = (chain: RetainKeyChain | undefined): (string | number)[] => {
  if (chain === undefined) {
    return []
  }

  const keys: (string | number)[] = []
  for (let node: RetainKeyChain | undefined = chain; node !== undefined; node = node.parent) {
    keys.push(node.key)
  }
  keys.reverse()
  return keys
}

// Materialises the concrete matched-path array for a leaf reached under an inherited retain: the
// entry base path, every descended container key, then the leaf key. Equivalent to the previous
// eager `[...inherited.matchedPath, key]`, but built once at the leaf instead of at every hop.
const materialiseRetainMatchedPath = (
  inherited: InheritedRetain,
  leafKey: string | number,
): (string | number)[] => {
  return [...inherited.basePath, ...collectDescendedKeys(inherited.descended), leafKey]
}

// Materialises the concrete canonical-path string for a leaf reached under an inherited retain,
// reproducing descendRetain's previous per-level `appendCanonicalPathSegment` chain. Each key's
// segment kind is derived from its runtime type (number -> index, string -> property), exactly as
// renderConcreteCanonicalPath does, so the rendered path is identical to the eager construction.
const materialiseRetainCanonical = (
  inherited: InheritedRetain,
  leafSegment: ExactPathSegment,
): string => {
  let path: string | undefined = inherited.baseCanonical
  for (const key of collectDescendedKeys(inherited.descended)) {
    path = appendCanonicalPathSegment(path, buildSegment(typeof key === 'number' ? 'index' : 'property', key))
  }
  return appendCanonicalPathSegment(path, leafSegment)
}

// Applies an inherited retain policy to a leaf reached during retained-structure traversal.
const applyInheritedLeaf = (
  value: unknown,
  inherited: InheritedRetain,
  segment: ExactPathSegment,
  key: string | number,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
): unknown => {
  // Value-type allowlist outranks the inherited retain policy (Story 9.1); a vetoed leaf stays raw.
  // Inherited leaves are always non-container primitives, so no delegation is needed here.
  if (!isRedactableType(value, plan.valueTypes)) {
    return value
  }

  try {
    if (typeof inherited.policy.censor === 'function') {
      return applyRedaction(value, inherited.policy, {
        matchedPath: materialiseRetainMatchedPath(inherited, key) as PathSegments,
        rootInput,
        rulePath: inherited.rulePath,
        terminalKey: key,
      })
    }

    return applyRedaction(value, inherited.policy, noContext)
  } catch (error) {
    emitCensorFailure(plan, materialiseRetainCanonical(inherited, segment), value, error)
    return unsupportedValue
  }
}

const enterRetain = (rule: ExactTerminalRule): InheritedRetain => {
  return {
    basePath: rule.rulePath as readonly (string | number)[],
    baseCanonical: rule.canonicalPath,
    descended: undefined,
    policy: rule.policy,
    rulePath: rule.rulePath,
  }
}

// Enters a retained subtree at a wildcard terminal: the base path and canonical prefix are the
// concrete keys traversed to reach the terminal, not the configured wildcard signature.
const enterRetainWildcard = (
  rule: { readonly policy: CompiledRedactionPolicy; readonly rulePath: PathSegments },
  matchedPath: readonly (string | number)[],
): InheritedRetain => {
  return {
    basePath: matchedPath,
    baseCanonical: renderConcreteCanonicalPath(matchedPath),
    descended: undefined,
    policy: rule.policy,
    rulePath: rule.rulePath,
  }
}

// Advances an inherited retain by one descended container key in O(1) — a single cons onto the
// key chain, with no per-level array or canonical-string allocation (AC 2).
const descendRetain = (
  inherited: InheritedRetain,
  key: string | number,
): InheritedRetain => {
  return {
    basePath: inherited.basePath,
    baseCanonical: inherited.baseCanonical,
    descended: { key, parent: inherited.descended },
    policy: inherited.policy,
    rulePath: inherited.rulePath,
  }
}

const buildSegment = (kind: 'property' | 'index', key: string | number): ExactPathSegment => {
  return kind === 'index'
    ? { kind: 'index', value: key as number }
    : { kind: 'property', value: key as string }
}

const enterExactHop = (
  budget: TraversalBudget,
  plan: CompiledRedactorPlan,
): void => {
  budget.depth += 1
  budget.nodesVisited += 1

  if (isDepthExceeded(budget, plan.maxDepth)) {
    throw createBudgetExceededError('depth', plan.maxDepth)
  }

  if (isNodeBudgetExceeded(budget, plan.maxNodes)) {
    throw createBudgetExceededError('nodes', plan.maxNodes)
  }
}

const leaveExactHop = (budget: TraversalBudget): void => {
  budget.depth -= 1
}

// Resolves the inherited-retain policy for a child container: a retain rule at this node
// starts a fresh retain, an active inherited retain continues (with its position advanced),
// and otherwise there is none. Within a retained subtree the rule-driven engine delegates on any
// wildcard interaction (see redactRetained), so `node.rule` here is always an exact terminal.
const resolveChildInherited = (
  node: PathTreeNode | undefined,
  inherited: InheritedRetain | undefined,
  key: string | number,
): InheritedRetain | undefined => {
  if (node?.rule?.kind === 'exact') {
    return enterRetain(node.rule)
  }

  if (inherited === undefined) {
    return undefined
  }

  return descendRetain(inherited, key)
}

const emptyLevel: PathTreeNode = {}

// Sentinel returned up the recursion when the engine reaches — on a *configured* path — a
// container whose prototype is non-plain (prototype pollution guard), or, while descending a
// `retainStructure` subtree, a transformable value the general traversal would transform, or a
// wildcard interaction inside a retained subtree that is cheaper to delegate than to re-derive.
// The caller delegates the whole call to the general traversal; the input is never mutated, so
// any partial copy is simply discarded.
const delegate = Symbol('deep-redact.rule-driven.delegate')

// True for a non-container value the general traversal would transform rather than leave or
// censor under an inherited/retain policy: BigInt and any non-plain object (Date, Map, Set,
// Error, RegExp, URL — and, conservatively, class instances, which delegate to identical
// output). Only consulted *within* a retained subtree, where every leaf is visited. `null` and
// plain primitives are safe.
const requiresDelegation = (value: unknown): boolean => {
  return typeof value === 'bigint' || (value !== null && typeof value === 'object')
}

// Full-key descent of a retained subtree (AC 10 — the sole sanctioned exception to the
// "no full-key iteration" rule). Iterates keys in payload order so diagnostic event order
// matches the general traversal, applying the inherited retain policy to every leaf unless a
// more-specific exact rule overrides it. Returns the same reference when nothing changed, a
// shallow copy when a descendant changed, or the `delegate` sentinel.
//
// A wildcard edge or wildcard terminal inside a retained subtree (e.g. an exact retain rule sat
// above a `*` rule, or `a.*` retain combined with `a.*.b`) is delegated wholesale to the general
// traversal: re-deriving concrete-path retain interaction with wildcard precedence here would
// duplicate the general traversal's precedence layering for a rare config, and delegation
// produces identical output. The delegate is detected at entry (a wildcard edge among children)
// and on encountering a wildcard terminal child.
const redactRetained = (
  container: Record<string, unknown> | unknown[],
  level: PathTreeNode,
  inherited: InheritedRetain | undefined,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  budget: TraversalBudget,
): unknown => {
  budget.depth += 1

  if (isDepthExceeded(budget, plan.maxDepth)) {
    throw createBudgetExceededError('depth', plan.maxDepth)
  }

  try {

  if (level.wildcardChild !== undefined) {
    // A wildcard edge sits beneath this retain — delegate the whole call (rare retain/wildcard mix).
    return delegate
  }

  let copy: Record<string | number, unknown> | undefined

  if (Array.isArray(container)) {
    const items = container
    let removedIndices: number[] | undefined

    for (let index = 0; index < items.length; index += 1) {
      if (!(index in items)) {
        // Preserve sparse array holes — never materialise an absent index.
        continue
      }

      budget.nodesVisited += 1

      if (isNodeBudgetExceeded(budget, plan.maxNodes)) {
        throw createBudgetExceededError('nodes', plan.maxNodes)
      }

      const value = items[index]
      const node = level.indexChildren?.get(index)

      if (node?.rule?.kind === 'wildcard') {
        // A wildcard terminal overriding a retained leaf — delegate (rare retain/wildcard mix).
        return delegate
      }

      if (node?.rule !== undefined && !node.rule.policy.retainStructure) {
        if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
          // Type-vetoed container at a non-retain override — route as if unmatched: delegate so
          // the general traversal descends it (and any deeper rules) with identical output.
          return delegate
        }

        const redacted = applyTerminalRule(value, node.rule, plan, rootInput)
        copy ??= shallowCopyContainer(container) as Record<string | number, unknown>

        if (isRemovedValue(redacted)) {
          (removedIndices ??= []).push(index)
        } else {
          copy[index] = redacted
        }

        continue
      }

      if (Array.isArray(value) || isPlainObject(value)) {
        const childInherited = resolveChildInherited(node, inherited, index)
        const child = redactRetained(value, node ?? emptyLevel, childInherited, plan, rootInput, budget)

        if (child === delegate) {
          return delegate
        }

        if (child !== value) {
          (copy ??= shallowCopyContainer(container) as Record<string | number, unknown>)[index] = child
        }

        continue
      }

      // `value` is not a traversable container here.
      if (node?.rule !== undefined || inherited !== undefined) {
        if (requiresDelegation(value)) {
          // Under a retain/inherited policy the general traversal transforms this value.
          return delegate
        }

        if (!isRedactableType(value, plan.valueTypes)) {
          // Type-vetoed leaf — left raw with no copy write, so an all-vetoed subtree keeps its
          // original identity, matching the general traversal's unchanged-reference behaviour.
          continue
        }

        const redacted = node?.rule === undefined
          ? applyInheritedLeaf(value, inherited as InheritedRetain, buildSegment('index', index), index, plan, rootInput)
          : applyTerminalRule(value, node.rule, plan, rootInput)
        copy ??= shallowCopyContainer(container) as Record<string | number, unknown>

        if (isRemovedValue(redacted)) {
          (removedIndices ??= []).push(index)
        } else {
          copy[index] = redacted
        }
      }
    }

    if (copy === undefined) {
      return container
    }

    if (removedIndices !== undefined) {
      const compacted = copy as unknown as unknown[]
      let removedCount = 0

      for (const removedIndex of removedIndices) {
        compacted.splice(removedIndex - removedCount, 1)
        removedCount += 1
      }
    }

    return copy
  }

  // Own enumerable keys only — `Object.keys`, never `for...in`. Mirrors the general traversal
  // (redact-value.ts), so inherited enumerable properties (e.g. under Object.prototype pollution)
  // are not materialised as own redacted keys in the retained copy (AC 1).
  for (const key of Object.keys(container)) {
    const node = level.propertyChildren?.get(key)

    budget.nodesVisited += 1

    if (isNodeBudgetExceeded(budget, plan.maxNodes)) {
      throw createBudgetExceededError('nodes', plan.maxNodes)
    }

    const value = (container as Record<string, unknown>)[key]

    if (node?.rule?.kind === 'wildcard') {
      // A wildcard terminal overriding a retained leaf — delegate (rare retain/wildcard mix).
      return delegate
    }

    if (node?.rule !== undefined && !node.rule.policy.retainStructure) {
      if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
        // Type-vetoed container at a non-retain override — route as if unmatched: delegate so
        // the general traversal descends it (and any deeper rules) with identical output.
        return delegate
      }

      const redacted = applyTerminalRule(value, node.rule, plan, rootInput)
      copy ??= shallowCopyContainer(container) as Record<string | number, unknown>

      if (isRemovedValue(redacted)) {
        delete copy[key]
      } else {
        setObjectEntry(copy as Record<string, unknown>, key, redacted)
      }

      continue
    }

    if (Array.isArray(value) || isPlainObject(value)) {
      const childInherited = resolveChildInherited(node, inherited, key)
      const child = redactRetained(value, node ?? emptyLevel, childInherited, plan, rootInput, budget)

      if (child === delegate) {
        return delegate
      }

      if (child !== value) {
        setObjectEntry(
          (copy ??= shallowCopyContainer(container) as Record<string | number, unknown>) as Record<string, unknown>,
          key,
          child,
        )
      }

      continue
    }

    // `value` is not a traversable container here.
    if (node?.rule !== undefined || inherited !== undefined) {
      if (requiresDelegation(value)) {
        // Under a retain/inherited policy the general traversal transforms this value.
        return delegate
      }

      if (!isRedactableType(value, plan.valueTypes)) {
        // Type-vetoed leaf — left raw with no copy write, so an all-vetoed subtree keeps its
        // original identity, matching the general traversal's unchanged-reference behaviour.
        continue
      }

      const redacted = node?.rule === undefined
        ? applyInheritedLeaf(value, inherited as InheritedRetain, buildSegment('property', key), key, plan, rootInput)
        : applyTerminalRule(value, node.rule, plan, rootInput)
      copy ??= shallowCopyContainer(container) as Record<string | number, unknown>

      if (isRemovedValue(redacted)) {
        delete copy[key]
      } else {
        setObjectEntry(copy as Record<string, unknown>, key, redacted)
      }
    }
  }

  return copy ?? container

  } finally {
    budget.depth -= 1
  }
}

// True when a value can be descended by the rule-driven walk (plain object or array). A
// non-plain object reached on a configured intermediate path triggers whole-payload delegation
// (prototype pollution guard); a primitive / null simply terminates that path.
const isDescendable = (value: unknown): value is Record<string, unknown> | unknown[] => {
  return Array.isArray(value) || isPlainObject(value)
}

// Resolves a `retainStructure: true` terminal (AC 10). Returns the value to write at the
// terminal slot — the descended (leaf-redacted) subtree, the censored primitive, the same
// reference when nothing changed, or the `delegate` sentinel. Context-aware ancestor copies
// can be reused for the same trie context, but aliases reached through a different retain rule
// must be processed independently so each configured path applies its own policy.
const resolveRetainTerminal = (
  value: unknown,
  childNode: PathTreeNode,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  ancestorCopies: AncestorCopies,
  budget: TraversalBudget,
): unknown => {
  if (isDescendable(value)) {
    const existing = getAncestorCopy(ancestorCopies, value, childNode, undefined)

    if (existing !== undefined) {
      return existing
    }

    const descended = redactRetained(value, childNode, enterRetain(childNode.rule as ExactTerminalRule), plan, rootInput, budget)

    if (descended === delegate) {
      return delegate
    }

    if (descended !== value) {
      storeAncestorCopy(ancestorCopies, value, childNode, undefined, descended as ContainerCopy)
    }

    return descended
  }

  if (requiresDelegation(value)) {
    // A transformable terminal under retain is transformed by the general traversal.
    return delegate
  }

  // A primitive terminal under retain is censored wholesale.
  return applyTerminalRule(value, childNode.rule as ExactTerminalRule, plan, rootInput)
}

// As resolveRetainTerminal, but for a wildcard terminal reached at a concrete key path. The
// retained subtree's leaves report concrete canonical paths / matched paths seeded from the keys
// traversed (enterRetainWildcard).
const resolveRetainTerminalWildcard = (
  value: unknown,
  childNode: PathTreeNode,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  ancestorCopies: AncestorCopies,
  budget: TraversalBudget,
  matchedPath: readonly (string | number)[],
): unknown => {
  const rule = childNode.rule as WildcardTerminalRule

  if (isDescendable(value)) {
    const existing = getAncestorCopy(ancestorCopies, value, childNode, matchedPath)

    if (existing !== undefined) {
      return existing
    }

    const descended = redactRetained(value, childNode, enterRetainWildcard(rule, matchedPath), plan, rootInput, budget)

    if (descended === delegate) {
      return delegate
    }

    if (descended !== value) {
      storeAncestorCopy(ancestorCopies, value, childNode, matchedPath, descended as ContainerCopy)
    }

    return descended
  }

  if (requiresDelegation(value)) {
    // A transformable terminal under retain is transformed by the general traversal.
    return delegate
  }

  // A primitive terminal under retain is censored wholesale.
  return applyWildcardTerminalRule(value, rule, plan, rootInput, matchedPath)
}

// Trie-guided single traversal of the live payload. Walks `level`'s configured edges only —
// never enumerating non-configured siblings — reading `container[key]` for each exact edge and
// following only branches the trie has. A `wildcardChild` edge is the one sanctioned exception:
// it enumerates the container's keys (skipping any already claimed by an exact edge at the same
// level, AC 4) and follows the wildcard sub-path for each. Copy-on-change: a container is
// shallow-copied (once, via `ancestorCopies`) the first time a descendant changes, and
// "unchanged" is signalled by returning the same reference. Returns the (possibly copied)
// container or the `delegate` sentinel when a non-plain container is met on a configured path.
//
// `matchedPath` is the concrete key path to `container`, threaded only while navigating toward or
// through a wildcard (gated by `subtreeHasWildcard`); on the exact-only hot path it stays
// `undefined` and nothing is allocated. The index and property branches are inlined rather than
// factored into a closure: the hot path must allocate nothing per call beyond the lazy copy.
const navigateNode = (
  container: Record<string, unknown> | unknown[],
  level: PathTreeNode,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  ancestorCopies: AncestorCopies,
  compactedArrayCopies: Set<object>,
  budget: TraversalBudget,
  matchedPath: readonly (string | number)[] | undefined,
): unknown => {
  // A container reached via two trie branches (aliasing) is shallow-copied exactly once: reuse
  // the stored copy for the same traversal context and continue applying this node's edges to it.
  let copy = getAncestorCopy(ancestorCopies, container, level, matchedPath) as
    | Record<string | number, unknown>
    | undefined
  let removedIndices: number[] | undefined

  if (level.indexChildren !== undefined) {
    for (const [index, childNode] of level.indexChildren) {
      if (!(index in container)) {
        // Missing intermediate / terminal index — silently skip (AC 4).
        continue
      }

      enterExactHop(budget, plan)

      try {
        const value = (container as Record<number, unknown>)[index]

        if (childNode.rule?.kind === 'wildcard') {
          // A wildcard terminal reached via an exact index edge (e.g. `a.*.0`): apply it at the
          // concrete matched key path. Censor wins wholesale on a non-retain terminal (AC 6).
          const concreteMatchedPath = appendMatchedKey(matchedPath, index)

          if (childNode.rule.policy.retainStructure) {
            const retained = resolveRetainTerminalWildcard(value, childNode, plan, rootInput, ancestorCopies, budget, concreteMatchedPath)

            if (retained === delegate) {
              return delegate
            }

            if (retained !== value) {
              if (copy === undefined) {
                copy = shallowCopyContainer(container) as Record<string | number, unknown>
                storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
              }

              if (isRemovedValue(retained)) {
                (removedIndices ??= []).push(index)
              } else {
                copy[index] = retained
              }
            }
          } else {
            if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
              // Type-vetoed container at a non-retain wildcard terminal — delegate (route as if
              // unmatched) so the general traversal handles veto-and-descend identically.
              return delegate
            }

            const redacted = applyWildcardTerminalRule(value, childNode.rule, plan, rootInput, concreteMatchedPath)

            if (copy === undefined) {
              copy = shallowCopyContainer(container) as Record<string | number, unknown>
              storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
            }

            if (isRemovedValue(redacted)) {
              (removedIndices ??= []).push(index)
            } else {
              copy[index] = redacted
            }
          }

          continue
        }

        if (childNode.rule !== undefined && !childNode.rule.policy.retainStructure) {
          if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
            // Type-vetoed container at a non-retain terminal — delegate (route as if unmatched)
            // so the general traversal handles veto-and-descend identically.
            return delegate
          }

          // Terminal (non-retain): the censor wins wholesale, even over a container value or a
          // circular reference at the terminal — no descent (AC 5).
          const redacted = applyTerminalRule(value, childNode.rule, plan, rootInput)

          if (copy === undefined) {
            copy = shallowCopyContainer(container) as Record<string | number, unknown>
            storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
          }

          if (isRemovedValue(redacted)) {
            (removedIndices ??= []).push(index)
          } else {
            copy[index] = redacted
          }

          continue
        }

        if (childNode.rule !== undefined) {
          // Terminal with `retainStructure` (AC 10).
          const retained = resolveRetainTerminal(value, childNode, plan, rootInput, ancestorCopies, budget)

          if (retained === delegate) {
            return delegate
          }

          if (retained !== value) {
            if (copy === undefined) {
              copy = shallowCopyContainer(container) as Record<string | number, unknown>
              storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
            }

            if (isRemovedValue(retained)) {
              (removedIndices ??= []).push(index)
            } else {
              copy[index] = retained
            }
          }

          continue
        }

        if (isDescendable(value)) {
          const childMatchedPath = matchedPath !== undefined || childNode.subtreeHasWildcard === true
            ? appendMatchedKey(matchedPath, index)
            : undefined
          const child = navigateNode(value, childNode, plan, rootInput, ancestorCopies, compactedArrayCopies, budget, childMatchedPath)

          if (child === delegate) {
            return delegate
          }

          if (child !== value) {
            if (copy === undefined) {
              copy = shallowCopyContainer(container) as Record<string | number, unknown>
              storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
            }
            copy[index] = child
          }

          continue
        }

        if (value !== null && typeof value === 'object') {
          // A non-plain container on a *configured* intermediate path — delegate (AC 3).
          return delegate
        }

        // Primitive / null intermediate — cannot be descended, silently skip (AC 4).
      } finally {
        leaveExactHop(budget)
      }
    }
  }

  if (level.propertyChildren !== undefined) {
    for (const [key, childNode] of level.propertyChildren) {
      if (!(key in container)) {
        // Missing intermediate / terminal key — silently skip (AC 4).
        continue
      }

      enterExactHop(budget, plan)

      try {
        const value = (container as Record<string, unknown>)[key]

        if (childNode.rule?.kind === 'wildcard') {
          // A wildcard terminal reached via an exact property edge (e.g. `*.email` or `a.*.b`):
          // apply it at the concrete matched key path. Censor wins wholesale on a non-retain
          // terminal (AC 6).
          const concreteMatchedPath = appendMatchedKey(matchedPath, key)

          if (childNode.rule.policy.retainStructure) {
            const retained = resolveRetainTerminalWildcard(value, childNode, plan, rootInput, ancestorCopies, budget, concreteMatchedPath)

            if (retained === delegate) {
              return delegate
            }

            if (retained !== value) {
              if (copy === undefined) {
                copy = shallowCopyContainer(container) as Record<string | number, unknown>
                storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
              }

              if (isRemovedValue(retained)) {
                delete copy[key]
              } else {
                setObjectEntry(copy as Record<string, unknown>, key, retained)
              }
            }
          } else {
            if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
              // Type-vetoed container at a non-retain wildcard terminal — delegate (route as if
              // unmatched) so the general traversal handles veto-and-descend identically.
              return delegate
            }

            const redacted = applyWildcardTerminalRule(value, childNode.rule, plan, rootInput, concreteMatchedPath)

            if (copy === undefined) {
              copy = shallowCopyContainer(container) as Record<string | number, unknown>
              storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
            }

            if (isRemovedValue(redacted)) {
              delete copy[key]
            } else {
              setObjectEntry(copy as Record<string, unknown>, key, redacted)
            }
          }

          continue
        }

        if (childNode.rule !== undefined && !childNode.rule.policy.retainStructure) {
          if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
            // Type-vetoed container at a non-retain terminal — delegate (route as if unmatched)
            // so the general traversal handles veto-and-descend identically.
            return delegate
          }

          const redacted = applyTerminalRule(value, childNode.rule, plan, rootInput)

          if (copy === undefined) {
            copy = shallowCopyContainer(container) as Record<string | number, unknown>
            storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
          }

          if (isRemovedValue(redacted)) {
            delete copy[key]
          } else {
            setObjectEntry(copy as Record<string, unknown>, key, redacted)
          }

          continue
        }

        if (childNode.rule !== undefined) {
          const retained = resolveRetainTerminal(value, childNode, plan, rootInput, ancestorCopies, budget)

          if (retained === delegate) {
            return delegate
          }

          if (retained !== value) {
            if (copy === undefined) {
              copy = shallowCopyContainer(container) as Record<string | number, unknown>
              storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
            }

            if (isRemovedValue(retained)) {
              delete copy[key]
            } else {
              setObjectEntry(copy as Record<string, unknown>, key, retained)
            }
          }

          continue
        }

        if (isDescendable(value)) {
          const childMatchedPath = matchedPath !== undefined || childNode.subtreeHasWildcard === true
            ? appendMatchedKey(matchedPath, key)
            : undefined
          const child = navigateNode(value, childNode, plan, rootInput, ancestorCopies, compactedArrayCopies, budget, childMatchedPath)

          if (child === delegate) {
            return delegate
          }

          if (child !== value) {
            if (copy === undefined) {
              copy = shallowCopyContainer(container) as Record<string | number, unknown>
              storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
            }
            setObjectEntry(copy as Record<string, unknown>, key, child)
          }

          continue
        }

        if (value !== null && typeof value === 'object') {
          // A non-plain container on a *configured* intermediate path — delegate (AC 3).
          return delegate
        }

        // Primitive / null intermediate — cannot be descended, silently skip (AC 4).
      } finally {
        leaveExactHop(budget)
      }
    }
  }

  if (level.wildcardChild !== undefined) {
    // The single sanctioned full-key enumeration: visit every key of `container`, skipping any
    // already claimed by an exact edge at this level (exact string-path > structured path, AC 4),
    // and follow the wildcard sub-path for each. Any such exact edge is necessarily a *terminal*
    // here: a non-terminal exact edge sharing this wildcard's enumeration depth is an unsafe overlap
    // that `hasUnsafeWildcardOverlap` rejects at compile time (the config takes the general traversal
    // instead), so skipping the key correctly lets the higher-precedence exact terminal win wholesale.
    // Each enumerated key counts against `maxNodes` (AC 9) so a wide wildcard container is bounded;
    // the threshold maps to the engine's `O(P + ΣK)` cost rather than the general traversal's per-node
    // count, so the two execution modes need not throw at an identical node total (full cross-mode safety-limit
    // parity is Story 8.6's scope).
    const wildcardChild = level.wildcardChild

    if (Array.isArray(container)) {
      const items = container

      for (let index = 0; index < items.length; index += 1) {
        if (!(index in items)) {
          // Preserve sparse array holes — never visit an absent index.
          continue
        }

        if (level.indexChildren?.has(index)) {
          // Already handled by the exact index edge above (precedence dedup, AC 4).
          continue
        }

        budget.nodesVisited += 1

        if (isNodeBudgetExceeded(budget, plan.maxNodes)) {
          throw createBudgetExceededError('nodes', plan.maxNodes)
        }

        const value = items[index]
        const result = applyWildcardEdge(
          value,
          wildcardChild,
          appendMatchedKey(matchedPath, index),
          plan,
          rootInput,
          ancestorCopies,
          compactedArrayCopies,
          budget,
        )

        if (result === delegate) {
          return delegate
        }

        if (result !== value) {
          if (copy === undefined) {
            copy = shallowCopyContainer(container) as Record<string | number, unknown>
            storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
          }

          if (isRemovedValue(result)) {
            (removedIndices ??= []).push(index)
          } else {
            copy[index] = result
          }
        }
      }
    } else {
      for (const key of Object.keys(container)) {
        if (level.propertyChildren?.has(key)) {
          // Already handled by the exact property edge above (precedence dedup, AC 4).
          continue
        }

        budget.nodesVisited += 1

        if (isNodeBudgetExceeded(budget, plan.maxNodes)) {
          throw createBudgetExceededError('nodes', plan.maxNodes)
        }

        const value = (container as Record<string, unknown>)[key]
        const result = applyWildcardEdge(
          value,
          wildcardChild,
          appendMatchedKey(matchedPath, key),
          plan,
          rootInput,
          ancestorCopies,
          compactedArrayCopies,
          budget,
        )

        if (result === delegate) {
          return delegate
        }

        if (result !== value) {
          if (copy === undefined) {
            copy = shallowCopyContainer(container) as Record<string | number, unknown>
            storeAncestorCopy(ancestorCopies, container, level, matchedPath, copy as ContainerCopy)
          }

          if (isRemovedValue(result)) {
            delete copy[key]
          } else {
            setObjectEntry(copy as Record<string, unknown>, key, result)
          }
        }
      }
    }
  }

  if (copy === undefined) {
    return container
  }

  if (removedIndices !== undefined && Array.isArray(copy) && !compactedArrayCopies.has(copy)) {
    // Guard against double-compaction on an aliased array copy. If `copy` was pre-loaded from
    // `ancestorCopies` for the same traversal context, it may already have been spliced by an
    // earlier pass. Applying original-source indices a second time would splice wrong positions.
    // The first pass for that context is sufficient; skip compaction here.
    const compacted = copy
    let removedCount = 0

    for (const removedIndex of removedIndices.sort((a, b) => a - b)) {
      compacted.splice(removedIndex - removedCount, 1)
      removedCount += 1
    }

    compactedArrayCopies.add(copy)
  }

  return copy
}

// Applies the per-key decision ladder for one key enumerated under a `wildcardChild`, mirroring
// the exact index/property branches: a non-retain terminal censors wholesale; a retain terminal
// descends (or delegates); a non-terminal descendable value recurses with the concrete matched
// path; a non-plain object on this configured path delegates (AC 6); a primitive with more path
// to go is skipped (the same value is returned, signalling "no change"). Kept off the exact hot
// path so the exact index/property loops stay inlined and allocation-free.
const applyWildcardEdge = (
  value: unknown,
  wildcardChild: PathTreeNode,
  matchedPath: readonly (string | number)[],
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  ancestorCopies: AncestorCopies,
  compactedArrayCopies: Set<object>,
  budget: TraversalBudget,
): unknown => {
  if (wildcardChild.rule !== undefined) {
    if (!wildcardChild.rule.policy.retainStructure) {
      if (isDescendable(value) && !isRedactableType(value, plan.valueTypes)) {
        // Type-vetoed container at a non-retain wildcard terminal — delegate (route as if
        // unmatched) so the general traversal handles veto-and-descend identically.
        return delegate
      }

      // Terminal (non-retain): censor wins wholesale, even over a container or circular
      // reference at the terminal — no descent, no delegation (AC 6).
      return applyWildcardTerminalRule(value, wildcardChild.rule, plan, rootInput, matchedPath)
    }

    // Terminal with `retainStructure` (AC 10).
    return resolveRetainTerminalWildcard(value, wildcardChild, plan, rootInput, ancestorCopies, budget, matchedPath)
  }

  if (isDescendable(value)) {
    // More wildcard/exact sub-path to follow — recurse with the concrete matched path so deeper
    // wildcard terminals report concrete paths.
    return navigateNode(value, wildcardChild, plan, rootInput, ancestorCopies, compactedArrayCopies, budget, matchedPath)
  }

  if (value !== null && typeof value === 'object') {
    // A non-plain container on a *configured* (wildcard) intermediate path — delegate (AC 6).
    return delegate
  }

  // Primitive / null with more path to go — cannot be descended; signal "no change".
  return value
}

export const buildPathDrivenExecutor = (
  plan: CompiledRedactorPlan,
  fallback: PathDrivenExecutor,
): PathDrivenExecutor => {
  const root = buildPrefixTree(plan)

  return function pathDriven(input: unknown): unknown {
    if (input === null || typeof input !== 'object') {
      // Root primitives cannot be targeted by path rules; under the rule-driven contract a
      // non-configured value is left unchanged, so the root is returned as-is.
      return input
    }

    if (!(Array.isArray(input) || isPlainObject(input))) {
      // Non-plain root (Date, Map, class instance, hostile proxy) — delegate (AC 3).
      return fallback(input)
    }

    const budget = createTraversalBudget()
    const compactedArrayCopies = new Set<object>()
    let result: unknown

    try {
      result = navigateNode(
        input,
        root,
        plan,
        input,
        new Map<object, AncestorCopyRecord[]>(),
        compactedArrayCopies,
        budget,
        undefined,
      )
    } catch (error) {
      if (isBudgetExceededError(error)) {
        // Under `onBudgetExceeded: 'throw'` the caller must see the error, not a fallback result.
        if (plan.onBudgetExceeded !== 'truncate') throw error

        // Under truncate the partially-navigated graph cannot be returned: this engine visits only
        // configured terminals, so the ones it had not reached yet would still be present and
        // unredacted. Hand the whole payload to the general traversal, which re-runs on a fresh
        // budget and truncates fail-closed. Costly, but only on the breach path.
        return fallback(input)
      }
      // A hostile accessor (throwing getter / proxy trap) encountered while shallow-copying a
      // touched ancestor — delegate so the general traversal can degrade it consistently.
      return fallback(input)
    }

    return result === delegate ? fallback(input) : result
  }
}
