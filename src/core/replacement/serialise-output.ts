import type { CompiledTransformersPlan } from '../compiler/compile-transformers.js'
import type { SerialiseOption } from '../../types/config.js'
import {
  resolveSupportedTransformableValueKind,
  resolveTransformedValue,
} from '../../transformers/resolve-transformer.js'
import { isPlainObject } from '../runtime/redact-value.js'

const bareIdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/

// Recursion guard for the serialise pass. Cycle detection (the `seen` WeakSet) neutralises any
// graph that points back at a previously-seen identity, but a misbehaving custom transformer can
// manufacture a *fresh* identity on every call (e.g. `(v) => ({ _transformer: 'x', value: new
// Widget(v) })`); each level is a new object, so `seen` never matches and the mutual recursion
// `buildSafeGraph` <-> `buildTransformedGraph` would grow until the call stack overflows, breaking
// the no-throw serialisation guarantee. This budget caps that descent and degrades to the
// `[UNSUPPORTED]` marker instead. It is deliberately decoupled from the configurable `maxDepth`
// (which already bounds the *redacted* graph reaching this pass) and chosen to sit comfortably
// between two limits: above any realistic structure — under the default `maxDepth` of 500 the
// transformer-wrapping multiplier (~2x) keeps a valid graph below ~1500 levels — so it never
// rejects a structure the main pass accepted; and below the depth at which the downstream
// `JSON.stringify` (the default serialiser, itself recursive) would overflow, so the degraded
// output still serialises and the no-throw guarantee holds end to end. It fires only on genuinely
// unbounded recursion.
const MAX_SERIALISE_DEPTH = 3000

const buildObjectChildPath = (parentPath: string | undefined, key: string): string => {
  if (!bareIdentifierPattern.test(key)) {
    return `${parentPath ?? ''}["${key.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`)}"]`
  }

  return parentPath === undefined ? key : `${parentPath}.${key}`
}

const buildArrayChildPath = (parentPath: string | undefined, index: number): string => {
  return parentPath === undefined ? String(index) : `${parentPath}.${index}`
}

// Returns true if `ancestor` is a strict path-prefix of `path` (path is within, but not equal to, ancestor).
const isStrictDescendantPath = (ancestor: string, path: string): boolean => {
  if (path === ancestor) return false

  if (ancestor === '') return true

  return path.startsWith(`${ancestor}.`) || path.startsWith(`${ancestor}[`)
}

const buildSafeGraph = (
  value: unknown,
  transformers: CompiledTransformersPlan,
  seen: WeakSet<object>,
  identityPaths: WeakMap<object, string>,
  currentPath: string | undefined,
  cycleRegistry: WeakMap<object, string> | undefined,
  depth: number,
): unknown => {
  // Bound the descent before any further recursion (see MAX_SERIALISE_DEPTH): an identity-
  // manufacturing transformer evades cycle detection, so this is the only stop for it.
  if (depth > MAX_SERIALISE_DEPTH) {
    return '[UNSUPPORTED]'
  }

  // Primitives (except bigint) pass through unchanged.
  if (value === null || typeof value === 'string' || typeof value === 'number'
    || typeof value === 'boolean' || value === undefined) {
    return value
  }

  // Functions and symbols are not JSON-serialisable and cannot be tracked in the cycle WeakSet
  // (WeakSet.add throws on a symbol). Substitute the unsupported marker rather than letting them
  // reach JSON.stringify (which would silently drop them) or the identity bookkeeping below.
  if (typeof value === 'function' || typeof value === 'symbol') {
    return '[UNSUPPORTED]'
  }

  // Bigint and all supported runtime object types go through transformer dispatch.
  const supportedKind = resolveSupportedTransformableValueKind(value)

  if (supportedKind !== undefined) {
    // For supported object types (not bigint — bigint is a primitive and cannot be stored
    // in a WeakSet), track the original identity in `seen` before recursing into the
    // transformed representation. Without this, a self-referential Map (or Set) would
    // cause unbounded recursion: the transformed plain-object representation contains a
    // reference back to the original Map, which is never found in `seen` and gets
    // transformed again indefinitely.
    const runtimeIdentity = supportedKind === 'bigint' ? undefined : (value as object)

    if (runtimeIdentity !== undefined) {
      if (seen.has(runtimeIdentity)) {
        return {
          _transformer: 'circular',
          path: currentPath ?? '',
          value: identityPaths.get(runtimeIdentity) ?? '',
        }
      }

      const currentPathStr = currentPath ?? ''
      identityPaths.set(runtimeIdentity, currentPathStr)
      seen.add(runtimeIdentity)
    }

    try {
      const transformed = resolveTransformedValue(value, transformers)

      if (transformed === undefined) {
        return '[UNSUPPORTED]'
      }

      return buildTransformedGraph(transformed, transformers, seen, identityPaths, currentPath, cycleRegistry, depth + 1)
    } catch {
      return '[UNSUPPORTED]'
    } finally {
      if (runtimeIdentity !== undefined) {
        seen.delete(runtimeIdentity)
      }
    }
  }

  // Only plain objects and arrays remain.
  const identity = value as object

  // Cycle detection — objects currently on the active traversal stack.
  if (seen.has(identity)) {
    return {
      _transformer: 'circular',
      path: currentPath ?? '',
      value: identityPaths.get(identity) ?? '',
    }
  }

  // Detect cycle back-references that point to the original (pre-result) identity: these occur
  // when a traversal cycle was detected and the raw identity was preserved in the result. The
  // cycleRegistry maps each such identity to the canonical path where it was first seen, so we
  // can emit the correct circular marker without re-traversing the unredacted source object.
  if (cycleRegistry?.has(identity)) {
    const registryPath = cycleRegistry.get(identity)!

    if (isStrictDescendantPath(registryPath, currentPath ?? '')) {
      return {
        _transformer: 'circular',
        path: currentPath ?? '',
        value: registryPath,
      }
    }
  }

  const currentPathStr = currentPath ?? ''
  identityPaths.set(identity, currentPathStr)
  seen.add(identity)

  try {
    if (Array.isArray(value)) {
      const result: unknown[] = []
      result.length = value.length

      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          continue
        }

        result[index] = buildSafeGraph(
          (value as unknown[])[index],
          transformers,
          seen,
          identityPaths,
          buildArrayChildPath(currentPath, index),
          cycleRegistry,
          depth + 1,
        )
      }

      return result
    }

    if (isPlainObject(value)) {
      const result: Record<string, unknown> = {}

      for (const key of Object.keys(value)) {
        result[key] = buildSafeGraph(
          (value as Record<string, unknown>)[key],
          transformers,
          seen,
          identityPaths,
          buildObjectChildPath(currentPath, key),
          cycleRegistry,
          depth + 1,
        )
      }

      return result
    }

    // Non-plain objects (for example class instances) can only reach JSON output through
    // configured constructor/fallback transformers. Otherwise a throwing toJSON or accessor would
    // defeat the no-throw guarantee (FR26), and raw fields must never leak.
    try {
      const transformed = resolveTransformedValue(value, transformers)

      if (transformed !== undefined) {
        return buildTransformedGraph(transformed, transformers, seen, identityPaths, currentPath, cycleRegistry, depth + 1)
      }
    } catch {
      return '[UNSUPPORTED]'
    }

    return '[UNSUPPORTED]'
  } finally {
    seen.delete(identity)
  }
}

// A transformer represents its subject as `{ _transformer, value }`. The `value` payload occupies
// the same logical position as the original container, so when a reference-holding container
// (Set, Map, or any future transformer-wrapped container) holds a cycle, the circular marker's
// `path` must be rooted at the container — not at the synthetic `value` wrapper segment. Recursing
// into the wrapper generically would append `value` to the path (e.g. `roles.value.0` instead of
// the logical `roles.0`), making Set/Map cycle paths inconsistent with object/array cycle paths
// and with the marker's own `value` field. Treat the `value` key as path-transparent (rooted at
// the container) while any other wrapper key extends the path normally. The corrected, logical
// rendering also stays cheap to rebuild from a retained ancestor chain (Story 10.2).
const buildTransformedGraph = (
  transformed: unknown,
  transformers: CompiledTransformersPlan,
  seen: WeakSet<object>,
  identityPaths: WeakMap<object, string>,
  currentPath: string | undefined,
  cycleRegistry: WeakMap<object, string> | undefined,
  depth: number,
): unknown => {
  if (
    isPlainObject(transformed)
    && typeof (transformed as Record<string, unknown>)._transformer === 'string'
    && 'value' in transformed
  ) {
    const wrapper = transformed as Record<string, unknown>
    const result: Record<string, unknown> = {}

    for (const key of Object.keys(wrapper)) {
      result[key] = key === 'value'
        ? buildSafeGraph(wrapper.value, transformers, seen, identityPaths, currentPath, cycleRegistry, depth + 1)
        : buildSafeGraph(
          wrapper[key],
          transformers,
          seen,
          identityPaths,
          buildObjectChildPath(currentPath, key),
          cycleRegistry,
          depth + 1,
        )
    }

    return result
  }

  return buildSafeGraph(transformed, transformers, seen, identityPaths, currentPath, cycleRegistry, depth + 1)
}

export const serialiseOutput = (
  value: unknown,
  transformers: CompiledTransformersPlan,
  serialise: SerialiseOption | undefined,
  cycleRegistry?: WeakMap<object, string>,
): unknown => {
  if (!serialise) {
    return value
  }

  const safeGraph = value === undefined
    ? '[UNSUPPORTED]'
    : buildSafeGraph(
      value,
      transformers,
      new WeakSet<object>(),
      new WeakMap<object, string>(),
      undefined,
      cycleRegistry,
      0,
    )

  if (serialise === true) {
    return JSON.stringify(safeGraph)
  }

  return serialise(safeGraph)
}
