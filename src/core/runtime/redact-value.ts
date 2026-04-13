import type {
  CompiledExactPathRule,
  CompiledRedactionPolicy,
  CompiledRedactorPlan,
} from '../compiler/compile-redactor-plan.js'
import {
  createIndexPathSegment,
  createPropertyPathSegment,
} from '../matching/path-parser.js'
import { appendCanonicalPathSegment } from '../matching/path-normaliser.js'
import {
  applyRedaction,
  isRemovedValue,
  type RemovedValue,
} from '../replacement/apply-redaction.js'

type TraversableContainer = Record<string, unknown> | unknown[]
type PolicySource = 'key' | 'path'

interface ActivePolicyMatch {
  readonly policy: CompiledRedactionPolicy
  readonly source: PolicySource
}

interface TraversalContext {
  readonly canonicalPath?: string
  readonly directKeyMatch: boolean
  readonly inheritedPolicy?: ActivePolicyMatch
}

interface TraversalResult {
  readonly changed: boolean
  readonly value: RemovedValue | unknown
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

const isTraversableContainer = (value: unknown): value is TraversableContainer => {
  return Array.isArray(value) || isPlainObject(value)
}

const hasLookupValue = <T>(
  table: Readonly<Record<string, T>>,
  key: string,
): boolean => {
  return Object.hasOwn(table, key)
}

const resolvePathRule = (
  plan: CompiledRedactorPlan,
  canonicalPath: string | undefined,
): CompiledExactPathRule | undefined => {
  if (canonicalPath === undefined) {
    return undefined
  }

  return hasLookupValue(plan.exactPathRules, canonicalPath)
    ? plan.exactPathRules[canonicalPath]
    : undefined
}

const selectActivePolicy = (
  plan: CompiledRedactorPlan,
  pathRule: CompiledExactPathRule | undefined,
  directKeyMatch: boolean,
  inheritedPolicy: ActivePolicyMatch | undefined,
): ActivePolicyMatch | undefined => {
  if (pathRule !== undefined) {
    return {
      policy: pathRule.policy,
      source: 'path',
    }
  }

  if (inheritedPolicy?.source === 'path') {
    return inheritedPolicy
  }

  if (directKeyMatch) {
    return {
      policy: plan.exactKeyRules.policy,
      source: 'key',
    }
  }

  return inheritedPolicy
}

const transformArray = (
  value: readonly unknown[],
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
): TraversalResult => {
  let transformedValue: unknown[] | undefined
  const removedIndexes: number[] = []
  let changed = false

  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      continue
    }

    const item = value[index]
    const itemPath = appendCanonicalPathSegment(
      canonicalPath,
      createIndexPathSegment(index),
    )
    const itemResult = transformNode(item, plan, {
      canonicalPath: itemPath,
      directKeyMatch: false,
      inheritedPolicy,
    })

    if (isRemovedValue(itemResult.value)) {
      if (transformedValue === undefined) {
        transformedValue = value.slice()
      }

      changed = true
      removedIndexes.push(index)
      continue
    }

    if (!itemResult.changed) {
      continue
    }

    if (transformedValue === undefined) {
      transformedValue = value.slice()
    }

    changed = true
    transformedValue[index] = itemResult.value
  }

  if (transformedValue === undefined) {
    return {
      changed: false,
      value,
    }
  }

  if (removedIndexes.length === 0) {
    return {
      changed,
      value: transformedValue,
    }
  }

  const compactedValue = transformedValue.slice()
  let removedCount = 0

  for (const removedIndex of removedIndexes) {
    compactedValue.splice(removedIndex - removedCount, 1)
    removedCount += 1
  }

  return {
    changed,
    value: compactedValue,
  }
}

const transformObject = (
  value: Record<string, unknown>,
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
): TraversalResult => {
  let changed = false
  let transformedValue: Record<string, unknown> | undefined

  for (const [key, propertyValue] of Object.entries(value)) {
    const propertyPath = appendCanonicalPathSegment(
      canonicalPath,
      createPropertyPathSegment(key),
    )
    const propertyResult = transformNode(propertyValue, plan, {
      canonicalPath: propertyPath,
      directKeyMatch: hasLookupValue(plan.exactKeyRules.keys, key),
      inheritedPolicy,
    })

    if (isRemovedValue(propertyResult.value)) {
      if (transformedValue === undefined) {
        transformedValue = { ...value }
      }

      changed = true
      delete transformedValue[key]
      continue
    }

    if (!propertyResult.changed) {
      continue
    }

    if (transformedValue === undefined) {
      transformedValue = { ...value }
    }

    changed = true
    transformedValue[key] = propertyResult.value
  }

  return {
    changed,
    value: changed ? transformedValue : value,
  }
}

const transformNode = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
): TraversalResult => {
  const activePolicy = selectActivePolicy(
    plan,
    resolvePathRule(plan, context.canonicalPath),
    context.directKeyMatch,
    context.inheritedPolicy,
  )

  if (activePolicy !== undefined && (!activePolicy.policy.retainStructure || !isTraversableContainer(value))) {
    return {
      changed: true,
      value: applyRedaction(value, activePolicy.policy),
    }
  }

  if (!isTraversableContainer(value)) {
    return {
      changed: false,
      value,
    }
  }

  const inheritedPolicy = activePolicy
  const result = Array.isArray(value)
    ? transformArray(value, plan, inheritedPolicy, context.canonicalPath)
    : transformObject(value, plan, inheritedPolicy, context.canonicalPath)

  return result
}

export const redactValue = (
  value: unknown,
  plan: CompiledRedactorPlan,
): unknown => {
  const result = transformNode(value, plan, {
    canonicalPath: undefined,
    directKeyMatch: false,
    inheritedPolicy: undefined,
  })

  return isRemovedValue(result.value) ? undefined : result.value
}
