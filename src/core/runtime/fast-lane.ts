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

export type FastLaneExecutor = (input: unknown) => unknown

const unsupportedValue = '[UNSUPPORTED]'

// Shared placeholder context for literal-censor / remove redaction, where the context is
// never read. Avoids a per-leaf allocation on the hot path.
const noContext: FunctionCensorContext = Object.freeze({
  matchedPath: Object.freeze([]) as PathSegments,
  rootInput: undefined,
  rulePath: Object.freeze([]) as PathSegments,
})

// A node in the compiled prefix tree. Children are indexed into per-kind maps at build time
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

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

// Lazily shallow-copies a container, preserving sparse array holes (mirrors the general
// traversal's `new Array(length)` + `if (!(index in value)) continue`).
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

// Sentinel returned up the recursion when the fast lane encounters a value the general
// traversal would treat differently (a supported-transformable value outside a wholesale
// censor, or a non-plain object reached without a censoring rule). The caller delegates the
// whole call to the general traversal — the input is never mutated, so any partial copy is
// simply discarded.
const delegate = Symbol('deep-redact.fast-lane.delegate')

// True for a non-container value the general traversal would transform rather than leave or
// censor under an inherited/retain policy: BigInt and any non-plain object (Date, Map, Set,
// Error, RegExp, URL — and, conservatively, class instances, which delegate to identical
// output). `null` and plain primitives are safe.
const requiresDelegation = (value: unknown): boolean => {
  return typeof value === 'bigint' || (value !== null && typeof value === 'object')
}

// The fused fast-lane traversal: a single pass that redacts configured exact paths AND
// confirms payload safety, iterating keys in payload order so diagnostic event order matches
// the general traversal. Uses copy-on-write and signals "unchanged" by returning the *same
// container reference* — an untouched payload preserves identity and allocates nothing. Every
// plain object / array is visited (even unmatched ones) so a stray transformable value deep in
// the payload is detected; on detection the `delegate` sentinel is propagated up and the whole
// call falls back to the general traversal. When `inherited` is set, every leaf is redacted
// (retained structure) unless a more-specific node rule overrides it.
//
// The body is split between array and object iteration: both share the same per-entry decision
// logic but differ in key enumeration (index loop vs `for…in`) and removal (array compaction
// vs property deletion); inlining both avoids any per-call closure on the hot path.
const applyNodes = (
  container: Record<string, unknown> | unknown[],
  level: PathTreeNode,
  inherited: InheritedRetain | undefined,
  plan: CompiledRedactorPlan,
  rootInput: unknown,
): unknown => {
  let copy: Record<string | number, unknown> | undefined

  if (Array.isArray(container)) {
    const items = container
    let removedIndices: number[] | undefined

    for (let index = 0; index < items.length; index += 1) {
      if (!(index in items)) {
        // Preserve sparse array holes — never materialise an absent index.
        continue
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
        const child = applyNodes(value, node ?? emptyLevel, childInherited, plan, rootInput)

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

        continue
      }

      if (requiresDelegation(value)) {
        // A stray transformable value (or non-plain object) the general traversal would handle.
        return delegate
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
        copy[key] = redacted
      }

      continue
    }

    if (Array.isArray(value) || isPlainObject(value)) {
      const childInherited = resolveChildInherited(node, inherited, 'property', key)
      const child = applyNodes(value, node ?? emptyLevel, childInherited, plan, rootInput)

      if (child === delegate) {
        return delegate
      }

      if (child !== value) {
        (copy ??= shallowCopyContainer(container) as Record<string | number, unknown>)[key] = child
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
        copy[key] = redacted
      }

      continue
    }

    if (requiresDelegation(value)) {
      // A stray transformable value (or non-plain object) the general traversal would handle.
      return delegate
    }
  }

  return copy ?? container
}

export const buildFastLaneExecutor = (
  plan: CompiledRedactorPlan,
  fallback: FastLaneExecutor,
): FastLaneExecutor => {
  const root = buildPrefixTree(Object.values(plan.exactPathRules))

  return function fastLane(input: unknown): unknown {
    if (input === null) {
      return input
    }

    const inputType = typeof input

    if (inputType !== 'object') {
      // Root primitives cannot be targeted by path rules. BigInt would be transformed by the
      // general traversal, so it delegates; every other primitive is returned unchanged.
      return inputType === 'bigint' ? fallback(input) : input
    }

    if (!(Array.isArray(input) || isPlainObject(input))) {
      // Non-plain root (Date, Map, class instance, hostile proxy) — delegate.
      return fallback(input)
    }

    let result: unknown

    try {
      result = applyNodes(input, root, undefined, plan, input)
    } catch {
      // A hostile accessor (throwing getter / proxy trap) or a circular reference (caught as a
      // stack overflow) — delegate so the general traversal can transform or degrade it.
      return fallback(input)
    }

    return result === delegate ? fallback(input) : result
  }
}
