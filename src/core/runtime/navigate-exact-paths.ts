import type { FunctionCensorContext, PathSegments } from '../../types/paths.js'
import type {
  CompiledExactPathRule,
  CompiledRedactionPolicy,
  CompiledRedactorPlan,
} from '../compiler/compile-redactor-plan.js'
import type { ExactPathSegment } from '../matching/path-parser.js'
import { appendCanonicalPathSegment } from '../matching/path-normaliser.js'
import { applyRedaction, isRemovedValue } from '../replacement/apply-redaction.js'
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

// A node in the compiled prefix trie. Children are indexed into per-kind maps at build time
// so runtime lookup is O(1) with no closures or scans on the hot path. `propertyChildren` /
// `indexChildren` are `undefined` when a node has no children of that kind.
interface PathTreeNode {
  rule?: CompiledExactPathRule;
  propertyChildren?: Map<string, PathTreeNode>;
  indexChildren?: Map<number, PathTreeNode>;
}

// An inherited `retainStructure` policy flowing down from a retained ancestor. While active,
// every leaf beneath the ancestor is redacted with `policy`, unless a more-specific exact
// path rule overrides it. `matchedPath`/`canonicalPrefix` track the position so function
// censor contexts and failure diagnostics mirror the general traversal exactly.
interface InheritedRetain {
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
  readonly canonicalPrefix: string;
  readonly matchedPath: readonly (string | number)[];
}

// Lazily shallow-copies a container, preserving sparse array holes (mirrors the general
// traversal's `new Array(length)` + `if (!(index in value)) continue`). Non-targeted sibling
// slots are carried over by reference, so a non-configured transformable / circular value is
// preserved untouched — never visited, never transformed.
const shallowCopyContainer = (container: Record<string, unknown> | unknown[]): Record<string, unknown> | unknown[] => {
  if (Array.isArray(container)) {
    const copy = new Array<unknown>(container.length)

    for (let index = 0; index < container.length; index += 1) {
      if (index in container) {
        copy[index] = container[index]
      }
    }

    return copy
  }

  return { ...container }
}

const insertRule = (
  root: PathTreeNode,
  segments: readonly ExactPathSegment[],
  rule: CompiledExactPathRule,
): void => {
  let level = root

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    let node: PathTreeNode | undefined

    if (segment.kind === 'index') {
      const map = level.indexChildren ??= new Map<number, PathTreeNode>()
      node = map.get(segment.value)

      if (node === undefined) {
        node = {}
        map.set(segment.value, node)
      }
    } else {
      const map = level.propertyChildren ??= new Map<string, PathTreeNode>()
      node = map.get(segment.value)

      if (node === undefined) {
        node = {}
        map.set(segment.value, node)
      }
    }

    if (index === segments.length - 1) {
      node.rule = rule
    }

    level = node
  }
}

const buildPrefixTree = (rules: readonly CompiledExactPathRule[]): PathTreeNode => {
  const root: PathTreeNode = {}

  for (const rule of rules) {
    insertRule(root, rule.segments, rule)
  }

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
  rule: CompiledExactPathRule,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
): unknown => {
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

// Applies an inherited retain policy to a leaf reached during retained-structure traversal.
const applyInheritedLeaf = (
  value: unknown,
  inherited: InheritedRetain,
  segment: ExactPathSegment,
  key: string | number,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
): unknown => {
  try {
    if (typeof inherited.policy.censor === 'function') {
      return applyRedaction(value, inherited.policy, {
        matchedPath: [...inherited.matchedPath, key] as PathSegments,
        rootInput,
        rulePath: inherited.rulePath,
        terminalKey: key,
      })
    }

    return applyRedaction(value, inherited.policy, noContext)
  } catch (error) {
    emitCensorFailure(plan, appendCanonicalPathSegment(inherited.canonicalPrefix, segment), value, error)
    return unsupportedValue
  }
}

const enterRetain = (rule: CompiledExactPathRule): InheritedRetain => {
  return {
    canonicalPrefix: rule.canonicalPath,
    matchedPath: rule.rulePath as readonly (string | number)[],
    policy: rule.policy,
    rulePath: rule.rulePath,
  }
}

const descendRetain = (
  inherited: InheritedRetain,
  segment: ExactPathSegment,
  key: string | number,
): InheritedRetain => {
  return {
    canonicalPrefix: appendCanonicalPathSegment(inherited.canonicalPrefix, segment),
    matchedPath: [...inherited.matchedPath, key],
    policy: inherited.policy,
    rulePath: inherited.rulePath,
  }
}

const buildSegment = (kind: 'property' | 'index', key: string | number): ExactPathSegment => {
  return kind === 'index'
    ? { kind: 'index', value: key as number }
    : { kind: 'property', value: key as string }
}

// Resolves the inherited-retain policy for a child container: a retain rule at this node
// starts a fresh retain, an active inherited retain continues (with its position advanced),
// and otherwise there is none.
const resolveChildInherited = (
  node: PathTreeNode | undefined,
  inherited: InheritedRetain | undefined,
  kind: 'property' | 'index',
  key: string | number,
): InheritedRetain | undefined => {
  if (node?.rule !== undefined) {
    return enterRetain(node.rule)
  }

  if (inherited === undefined) {
    return undefined
  }

  return descendRetain(inherited, buildSegment(kind, key), key)
}

const emptyLevel: PathTreeNode = {}

// Sentinel returned up the recursion when the engine reaches — on a *configured* path — a
// container whose prototype is non-plain (prototype pollution guard), or, while descending a
// `retainStructure` subtree, a transformable value the general traversal would transform.
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

      if (node?.rule !== undefined && !node.rule.policy.retainStructure) {
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
        const childInherited = resolveChildInherited(node, inherited, 'index', index)
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

  for (const key in container) {
    const value = (container as Record<string, unknown>)[key]
    const node = level.propertyChildren?.get(key)

    if (node?.rule !== undefined && !node.rule.policy.retainStructure) {
      const redacted = applyTerminalRule(value, node.rule, plan, rootInput)
      copy ??= shallowCopyContainer(container) as Record<string | number, unknown>

      if (isRemovedValue(redacted)) {
        delete copy[key]
      } else {
        setObjectEntry(copy as Record<string, unknown>, key, redacted)
      }

      continue
    }

    budget.nodesVisited += 1

    if (isNodeBudgetExceeded(budget, plan.maxNodes)) {
      throw createBudgetExceededError('nodes', plan.maxNodes)
    }

    if (Array.isArray(value) || isPlainObject(value)) {
      const childInherited = resolveChildInherited(node, inherited, 'property', key)
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
// reference when nothing changed, or the `delegate` sentinel. The retained root is shallow
// copied at most once per source via `ancestorCopies`, so a subtree reached through an alias
// reuses the same copy.
const resolveRetainTerminal = (
  value: unknown,
  childNode: PathTreeNode,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  ancestorCopies: Map<object, Record<string, unknown> | unknown[]>,
  budget: TraversalBudget,
): unknown => {
  if (isDescendable(value)) {
    const existing = ancestorCopies.get(value)

    if (existing !== undefined) {
      return existing
    }

    const descended = redactRetained(value, childNode, enterRetain(childNode.rule as CompiledExactPathRule), plan, rootInput, budget)

    if (descended === delegate) {
      return delegate
    }

    if (descended !== value) {
      ancestorCopies.set(value, descended as Record<string, unknown> | unknown[])
    }

    return descended
  }

  if (requiresDelegation(value)) {
    // A transformable terminal under retain is transformed by the general traversal.
    return delegate
  }

  // A primitive terminal under retain is censored wholesale.
  return applyTerminalRule(value, childNode.rule as CompiledExactPathRule, plan, rootInput)
}

// Trie-guided single traversal of the live payload. Walks `level`'s configured edges only —
// never enumerating non-configured siblings — reading `container[key]` for each edge and
// following only branches the trie has. Copy-on-change: a container is shallow-copied (once,
// via `ancestorCopies`) the first time a descendant changes, and "unchanged" is signalled by
// returning the same reference. Returns the (possibly copied) container or the `delegate`
// sentinel when a non-plain container is met on a configured path.
//
// The index and property branches are inlined rather than factored into a closure: the hot
// path must allocate nothing per call beyond the lazy copy itself.
const navigateNode = (
  container: Record<string, unknown> | unknown[],
  level: PathTreeNode,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
  ancestorCopies: Map<object, Record<string, unknown> | unknown[]>,
  compactedArrayCopies: Set<object>,
  budget: TraversalBudget,
): unknown => {
  // A container reached via two trie branches (aliasing) is shallow-copied exactly once: reuse
  // the stored copy and continue applying this node's edges to it.
  let copy = ancestorCopies.get(container) as Record<string | number, unknown> | undefined
  let removedIndices: number[] | undefined

  if (level.indexChildren !== undefined) {
    for (const [index, childNode] of level.indexChildren) {
      if (!(index in container)) {
        // Missing intermediate / terminal index — silently skip (AC 4).
        continue
      }

      const value = (container as Record<number, unknown>)[index]

      if (childNode.rule !== undefined && !childNode.rule.policy.retainStructure) {
        // Terminal (non-retain): the censor wins wholesale, even over a container value or a
        // circular reference at the terminal — no descent (AC 5).
        const redacted = applyTerminalRule(value, childNode.rule, plan, rootInput)

        if (copy === undefined) {
          copy = shallowCopyContainer(container) as Record<string | number, unknown>
          ancestorCopies.set(container, copy)
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
            ancestorCopies.set(container, copy)
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
        const child = navigateNode(value, childNode, plan, rootInput, ancestorCopies, compactedArrayCopies, budget)

        if (child === delegate) {
          return delegate
        }

        if (child !== value) {
          if (copy === undefined) {
            copy = shallowCopyContainer(container) as Record<string | number, unknown>
            ancestorCopies.set(container, copy)
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
    }
  }

  if (level.propertyChildren !== undefined) {
    for (const [key, childNode] of level.propertyChildren) {
      if (!(key in container)) {
        // Missing intermediate / terminal key — silently skip (AC 4).
        continue
      }

      const value = (container as Record<string, unknown>)[key]

      if (childNode.rule !== undefined && !childNode.rule.policy.retainStructure) {
        const redacted = applyTerminalRule(value, childNode.rule, plan, rootInput)

        if (copy === undefined) {
          copy = shallowCopyContainer(container) as Record<string | number, unknown>
          ancestorCopies.set(container, copy)
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
            ancestorCopies.set(container, copy)
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
        const child = navigateNode(value, childNode, plan, rootInput, ancestorCopies, compactedArrayCopies, budget)

        if (child === delegate) {
          return delegate
        }

        if (child !== value) {
          if (copy === undefined) {
            copy = shallowCopyContainer(container) as Record<string | number, unknown>
            ancestorCopies.set(container, copy)
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
    }
  }

  if (copy === undefined) {
    return container
  }

  if (removedIndices !== undefined && Array.isArray(copy) && !compactedArrayCopies.has(copy)) {
    // Guard against double-compaction on an aliased array copy. If `copy` was pre-loaded from
    // `ancestorCopies` (the same array object reached via a second trie branch), it may already
    // have been spliced by the first branch's pass. Applying original-source indices a second
    // time would splice wrong positions. The first-wins pass is sufficient; skip compaction here.
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

export const buildPathDrivenExecutor = (
  plan: CompiledRedactorPlan,
  fallback: PathDrivenExecutor,
): PathDrivenExecutor => {
  const root = buildPrefixTree(Object.values(plan.exactPathRules))

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
        new Map<object, Record<string, unknown> | unknown[]>(),
        compactedArrayCopies,
        budget,
      )
    } catch (error) {
      // BudgetExceededError propagates — the caller must see it, not a fallback result.
      if (isBudgetExceededError(error)) throw error
      // A hostile accessor (throwing getter / proxy trap) encountered while shallow-copying a
      // touched ancestor — delegate so the general traversal can degrade it consistently.
      return fallback(input)
    }

    return result === delegate ? fallback(input) : result
  }
}
