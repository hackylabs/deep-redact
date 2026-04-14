import type {
  CompiledDynamicPathRule,
  CompiledExactPathRule,
  CompiledRedactionPolicy,
  CompiledRedactorPlan,
} from '../compiler/compile-redactor-plan.js'
import {
  createIndexPathSegment,
  createPropertyPathSegment,
  type ExactPathSegment,
  type PathSegment,
} from '../matching/path-parser.js'
import { appendCanonicalPathSegment } from '../matching/path-normaliser.js'
import {
  applyRedaction,
  isRemovedValue,
  type RemovedValue,
} from '../replacement/apply-redaction.js'

type TraversableContainer = Record<string, unknown> | unknown[]
type PolicySource = 'dynamic-path' | 'exact-path' | 'key'

interface ActivePolicyMatch {
  readonly policy: CompiledRedactionPolicy
  readonly source: PolicySource
}

interface TraversalContext {
  readonly canonicalPath?: string
  readonly directKeyMatch: boolean
  readonly inheritedPolicy?: ActivePolicyMatch
  readonly pathSegments: readonly ExactPathSegment[]
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

const resolveExactPathRule = (
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

const matchesSingleSegment = (
  selectorSegment: PathSegment,
  pathSegment: ExactPathSegment,
): boolean => {
  if (selectorSegment.kind === 'wildcard') {
    return true
  }

  if (selectorSegment.kind === 'recursive-wildcard') {
    return false
  }

  if (selectorSegment.kind === 'ignore-index') {
    return pathSegment.kind === 'index' && pathSegment.value !== selectorSegment.value
  }

  if (selectorSegment.kind === 'ignore-property') {
    return pathSegment.kind === 'property' && pathSegment.value !== selectorSegment.value
  }

  if (selectorSegment.kind === 'index') {
    return pathSegment.kind === 'index' && pathSegment.value === selectorSegment.value
  }

  return pathSegment.kind === 'property' && pathSegment.value === selectorSegment.value
}

const matchesDynamicRule = (
  selectorSegments: readonly PathSegment[],
  pathSegments: readonly ExactPathSegment[],
  selectorIndex = 0,
  pathIndex = 0,
): boolean => {
  if (selectorIndex >= selectorSegments.length) {
    return pathIndex === pathSegments.length
  }

  const selectorSegment = selectorSegments[selectorIndex]

  if (selectorSegment.kind === 'recursive-wildcard') {
    for (let nextPathIndex = pathIndex; nextPathIndex <= pathSegments.length; nextPathIndex += 1) {
      if (matchesDynamicRule(selectorSegments, pathSegments, selectorIndex + 1, nextPathIndex)) {
        return true
      }
    }

    return false
  }

  if (pathIndex >= pathSegments.length) {
    return false
  }

  return matchesSingleSegment(selectorSegment, pathSegments[pathIndex])
    && matchesDynamicRule(selectorSegments, pathSegments, selectorIndex + 1, pathIndex + 1)
}

const resolveDynamicPathRule = (
  plan: CompiledRedactorPlan,
  pathSegments: readonly ExactPathSegment[],
): CompiledDynamicPathRule | undefined => {
  return plan.dynamicPathRules.find((rule) => matchesDynamicRule(rule.segments, pathSegments))
}

const selectActivePolicy = (
  plan: CompiledRedactorPlan,
  exactPathRule: CompiledExactPathRule | undefined,
  dynamicPathRule: CompiledDynamicPathRule | undefined,
  directKeyMatch: boolean,
  inheritedPolicy: ActivePolicyMatch | undefined,
): ActivePolicyMatch | undefined => {
  if (exactPathRule !== undefined) {
    return {
      policy: exactPathRule.policy,
      source: 'exact-path',
    }
  }

  if (dynamicPathRule !== undefined) {
    return {
      policy: dynamicPathRule.policy,
      source: 'dynamic-path',
    }
  }

  if (inheritedPolicy?.source === 'exact-path' || inheritedPolicy?.source === 'dynamic-path') {
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
  pathSegments: readonly ExactPathSegment[],
): TraversalResult => {
  let transformedValue: unknown[] | undefined
  const removedIndexes: number[] = []
  let changed = false

  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      continue
    }

    const item = value[index]
    const pathSegment = createIndexPathSegment(index)
    const itemPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    const itemResult = transformNode(item, plan, {
      canonicalPath: itemPath,
      directKeyMatch: false,
      inheritedPolicy,
      pathSegments: Object.freeze([...pathSegments, pathSegment]),
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
  pathSegments: readonly ExactPathSegment[],
): TraversalResult => {
  let changed = false
  let transformedValue: Record<string, unknown> | undefined

  for (const [key, propertyValue] of Object.entries(value)) {
    const pathSegment = createPropertyPathSegment(key)
    const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    const propertyResult = transformNode(propertyValue, plan, {
      canonicalPath: propertyPath,
      directKeyMatch: hasLookupValue(plan.exactKeyRules.keys, key),
      inheritedPolicy,
      pathSegments: Object.freeze([...pathSegments, pathSegment]),
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
    resolveExactPathRule(plan, context.canonicalPath),
    resolveDynamicPathRule(plan, context.pathSegments),
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
    ? transformArray(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments)
    : transformObject(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments)

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
    pathSegments: Object.freeze([]) as readonly ExactPathSegment[],
  })

  return isRemovedValue(result.value) ? undefined : result.value
}
