import type {
  CompiledDynamicPathRule,
  CompiledExactPathRule,
  CompiledRedactionPolicy,
  CompiledRedactorPlan,
  FunctionCensorContext,
} from '../compiler/compile-redactor-plan.js'
import type { PathSegments } from '../../types/paths.js'
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
type PolicySource = 'dynamic-path' | 'exact-key' | 'exact-path' | 'regex-key'

interface ActivePolicyMatch {
  readonly policy: CompiledRedactionPolicy
  readonly source: PolicySource
  readonly rulePath: PathSegments
}

interface TraversalContext {
  readonly canonicalPath?: string
  readonly directKeyMatch?: DirectKeyMatchResult
  readonly inheritedPolicy?: ActivePolicyMatch
  readonly pathSegments: readonly ExactPathSegment[]
  readonly rootInput: unknown
}

interface DirectKeyMatchResult {
  readonly source: 'exact-key' | 'regex-key'
  readonly rulePath: PathSegments
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

const findMatchingRegexKey = (
  matchers: readonly RegExp[],
  key: string,
): RegExp | undefined => {
  return matchers.find((matcher) => {
    matcher.lastIndex = 0
    return matcher.test(key)
  })
}

const renderPathSegmentText = (pathSegment: ExactPathSegment): string => {
  return pathSegment.kind === 'index' ? String(pathSegment.value) : pathSegment.value
}

const resolveDirectKeyMatch = (
  plan: CompiledRedactorPlan,
  key: string,
): DirectKeyMatchResult | undefined => {
  if (hasLookupValue(plan.exactKeyRules.keys, key)) {
    return {
      source: 'exact-key',
      rulePath: Object.freeze([key]),
    }
  }

  const matchingRegex = findMatchingRegexKey(plan.regexKeyRules.matchers, key)

  if (matchingRegex !== undefined) {
    return {
      source: 'regex-key',
      rulePath: Object.freeze([matchingRegex]),
    }
  }

  return undefined
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

  if (selectorSegment.kind === 'regex') {
    return selectorSegment.matcher.test(renderPathSegmentText(pathSegment))
  }

  if (selectorSegment.kind === 'ignore-regex') {
    return !selectorSegment.matcher.test(renderPathSegmentText(pathSegment))
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
  directKeyMatch: DirectKeyMatchResult | undefined,
  inheritedPolicy: ActivePolicyMatch | undefined,
): ActivePolicyMatch | undefined => {
  if (exactPathRule !== undefined) {
    return {
      policy: exactPathRule.policy,
      source: 'exact-path',
      rulePath: exactPathRule.rulePath,
    }
  }

  if (dynamicPathRule !== undefined) {
    return {
      policy: dynamicPathRule.policy,
      source: 'dynamic-path',
      rulePath: dynamicPathRule.rulePath,
    }
  }

  if (inheritedPolicy?.source === 'exact-path' || inheritedPolicy?.source === 'dynamic-path') {
    return inheritedPolicy
  }

  if (directKeyMatch?.source === 'exact-key') {
    return {
      policy: plan.exactKeyRules.policy,
      source: 'exact-key',
      rulePath: directKeyMatch.rulePath,
    }
  }

  if (directKeyMatch?.source === 'regex-key') {
    return {
      policy: plan.regexKeyRules.policy,
      source: 'regex-key',
      rulePath: directKeyMatch.rulePath,
    }
  }

  return inheritedPolicy
}

const buildFunctionCensorContext = (
  pathSegments: readonly ExactPathSegment[],
  rulePath: PathSegments,
  rootInput: unknown,
): FunctionCensorContext => {
  const matchedPath = Object.freeze(pathSegments.map((seg) => seg.value)) as PathSegments
  const rulePathCopy = Object.freeze([...rulePath]) as PathSegments
  const terminalKey = matchedPath.length > 0
    ? (matchedPath[matchedPath.length - 1] as string | number)
    : undefined

  return terminalKey !== undefined
    ? { matchedPath, rulePath: rulePathCopy, rootInput, terminalKey }
    : { matchedPath, rulePath: rulePathCopy, rootInput }
}

const transformArray = (
  value: readonly unknown[],
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
  pathSegments: readonly ExactPathSegment[],
  rootInput: unknown,
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
      inheritedPolicy,
      pathSegments: Object.freeze([...pathSegments, pathSegment]),
      rootInput,
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
  rootInput: unknown,
): TraversalResult => {
  let changed = false
  let transformedValue: Record<string, unknown> | undefined

  for (const [key, propertyValue] of Object.entries(value)) {
    const pathSegment = createPropertyPathSegment(key)
    const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    const propertyResult = transformNode(propertyValue, plan, {
      canonicalPath: propertyPath,
      directKeyMatch: resolveDirectKeyMatch(plan, key),
      inheritedPolicy,
      pathSegments: Object.freeze([...pathSegments, pathSegment]),
      rootInput,
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
    const fnContext = buildFunctionCensorContext(
      context.pathSegments,
      activePolicy.rulePath,
      context.rootInput,
    )

    return {
      changed: true,
      value: applyRedaction(value, activePolicy.policy, fnContext),
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
    ? transformArray(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput)
    : transformObject(value, plan, inheritedPolicy, context.canonicalPath, context.pathSegments, context.rootInput)

  return result
}

export const redactValue = (
  value: unknown,
  plan: CompiledRedactorPlan,
): unknown => {
  const result = transformNode(value, plan, {
    canonicalPath: undefined,
    inheritedPolicy: undefined,
    pathSegments: Object.freeze([]) as readonly ExactPathSegment[],
    rootInput: value,
  })

  return isRemovedValue(result.value) ? undefined : result.value
}
