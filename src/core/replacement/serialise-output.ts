import type { CompiledTransformersPlan } from '../compiler/compile-transformers.js'
import type { SerialiseOption } from '../../types/config.js'
import {
  resolveSupportedTransformableValueKind,
  resolveTransformedValue,
} from '../../transformers/resolve-transformer.js'
import { isPlainObject } from '../runtime/redact-value.js'

const bareIdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/

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
): unknown => {
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

      return buildSafeGraph(transformed, transformers, seen, identityPaths, currentPath, cycleRegistry)
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
        return buildSafeGraph(transformed, transformers, seen, identityPaths, currentPath, cycleRegistry)
      }
    } catch {
      return '[UNSUPPORTED]'
    }

    return '[UNSUPPORTED]'
  } finally {
    seen.delete(identity)
  }
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
    )

  if (serialise === true) {
    return JSON.stringify(safeGraph)
  }

  return serialise(safeGraph)
}
