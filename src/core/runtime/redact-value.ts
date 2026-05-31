import type {
  CompiledDynamicPathRule,
  CompiledExactPathRule,
  CompiledLiteralKeyRule,
  CompiledRedactionPolicy,
  CompiledRedactorPlan,
  CompiledSubstringRule,
  FunctionCensorContext,
} from '../compiler/compile-redactor-plan.js'
import type { PathSegments } from '../../types/paths.js'
import {
  createIndexPathSegment,
  createPropertyPathSegment,
  type ExactPathSegment,
  type PathSegment,
} from '../matching/path-parser.js'
import { canonicaliseKey } from '../matching/key-normaliser.js'
import { appendCanonicalPathSegment } from '../matching/path-normaliser.js'
import {
  applyRedaction,
  isRemovedValue,
  type RemovedValue,
} from '../replacement/apply-redaction.js'
import {
  createDiagnosticEvent,
  createFailureDiagnosticSnapshot,
  type FailureDiagnosticSnapshot,
  type RuntimeFailureStage,
} from '../diagnostics/diagnostic-event.js'
import { emitDiagnosticEvent } from '../diagnostics/diagnostics-sink.js'
import { cloneRegExp } from '../validation/regex-safety.js'
import {
  createBudgetExceededError,
  createTraversalBudget,
  isBudgetExceededError,
  isDepthExceeded,
  isNodeBudgetExceeded,
  type TraversalBudget,
} from './traversal-budget.js'
import {
  isSupportedTransformableObject,
  isSupportedTransformableValue,
  resolveSupportedTransformableValueKind,
  resolveTransformedValue,
} from '../../transformers/resolve-transformer.js'

type TraversableContainer = Record<string, unknown> | unknown[]
type TrackableIdentity = object
type PolicySource = 'dynamic-path' | 'exact-key' | 'exact-path' | 'regex-key'

interface ActivePolicyMatch {
  readonly policy: CompiledRedactionPolicy;
  readonly source: PolicySource;
  readonly rulePath: PathSegments;
}

interface TraversalContext {
  readonly canonicalPath?: string;
  readonly directKeyMatch?: DirectKeyMatchResult;
  readonly inheritedPolicy?: ActivePolicyMatch;
  readonly pathSegments: ExactPathSegment[];
  readonly rootInput: unknown;
  readonly suppressDescendantRedaction?: boolean;
}

interface DirectKeyMatchResult {
  readonly source: 'exact-key' | 'regex-key';
  readonly rulePath: PathSegments;
}

interface TraversalResult {
  readonly cacheValue: RemovedValue | unknown;
  readonly changed: boolean;
  readonly pathStable: boolean;
  readonly value: RemovedValue | unknown;
}

interface CompletedTraversalRecord {
  readonly canonicalPath: string;
  readonly pathStable: boolean;
  readonly ruleContextKey: string;
  readonly value: RemovedValue | unknown;
}

interface CompletedArraySnapshotEntry {
  readonly diagnostic?: FailureDiagnosticSnapshot;
  readonly present: boolean;
  readonly value?: unknown;
}

interface CompletedObjectSnapshotEntry {
  readonly diagnostic?: FailureDiagnosticSnapshot;
  readonly key: string;
  readonly value?: unknown;
}

interface CompletedArraySnapshot {
  readonly items: readonly CompletedArraySnapshotEntry[];
  readonly kind: 'array';
}

interface CompletedObjectSnapshot {
  readonly entries: readonly CompletedObjectSnapshotEntry[];
  readonly kind: 'object';
}

type CompletedTraversalSnapshot = CompletedArraySnapshot | CompletedObjectSnapshot

interface TraversalState {
  readonly budget: TraversalBudget;
  readonly completedIdentities: WeakMap<TrackableIdentity, CompletedTraversalRecord[]>;
  readonly completedSnapshots: WeakMap<TrackableIdentity, CompletedTraversalSnapshot>;
}

interface TraversalBranchState {
  readonly activePaths: WeakMap<TrackableIdentity, string>;
}

const unsupportedValue = '[UNSUPPORTED]'

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

export const isTraversableContainer = (value: unknown): value is TraversableContainer => {
  return Array.isArray(value) || isPlainObject(value)
}

const canRetainStructure = (value: unknown): boolean => {
  return isTraversableContainer(value) || isSupportedTransformableValue(value)
}

const hasLookupValue = <T>(
  table: Readonly<Record<string, T>>,
  key: string,
): boolean => {
  return Object.hasOwn(table, key)
}

export const setObjectEntry = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void => {
  if (key === '__proto__') {
    Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true })
  } else {
    target[key] = value
  }
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

const findMatchingLiteralKey = (
  literalMatchers: readonly CompiledLiteralKeyRule[],
  requiresCanonicalKey: boolean,
  key: string,
): CompiledLiteralKeyRule | undefined => {
  let canonicalKey: string | undefined

  for (const rule of literalMatchers) {
    if (rule.matchMode === 'exact' && key === rule.configuredKey) {
      return rule
    }

    if (rule.matchMode === 'contains' && key.includes(rule.configuredKey)) {
      return rule
    }

    if (requiresCanonicalKey && (rule.matchMode === 'canonical-exact' || rule.matchMode === 'canonical-contains')) {
      canonicalKey ??= canonicaliseKey(key)

      if (rule.matchMode === 'canonical-exact' && canonicalKey === rule.canonicalKey) {
        return rule
      }

      if (rule.matchMode === 'canonical-contains' && canonicalKey.includes(rule.canonicalKey)) {
        return rule
      }
    }
  }

  return undefined
}

const renderPathSegmentText = (pathSegment: ExactPathSegment): string => {
  return pathSegment.kind === 'index' ? String(pathSegment.value) : pathSegment.value
}

const createTraversalState = (): TraversalState => {
  return {
    budget: createTraversalBudget(),
    completedIdentities: new WeakMap<TrackableIdentity, CompletedTraversalRecord[]>(),
    completedSnapshots: new WeakMap<TrackableIdentity, CompletedTraversalSnapshot>(),
  }
}

const createTraversalBranchState = (): TraversalBranchState => {
  return {
    activePaths: new WeakMap<TrackableIdentity, string>(),
  }
}

const emitFailureDiagnostic = (
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  options: {
    readonly error: unknown;
    readonly stage: RuntimeFailureStage;
    readonly value: unknown;
    readonly valueType?: string;
  },
): FailureDiagnosticSnapshot => {
  const diagnostic = createFailureDiagnosticSnapshot({
    error: options.error,
    stage: options.stage,
    value: options.value,
    valueType: options.valueType,
  })

  emitDiagnosticEvent(
    plan.diagnostics,
    createDiagnosticEvent(plan.diagnostics, context.canonicalPath ?? '', diagnostic),
  )

  return diagnostic
}

const throwBudgetExceeded = (
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  kind: 'depth' | 'nodes',
): never => {
  const limit = kind === 'depth' ? plan.maxDepth : plan.maxNodes
  emitDiagnosticEvent(plan.diagnostics, Object.freeze({
    details: Object.freeze({ stage: 'traversal', kind, limit }),
    event: 'budget.exceeded',
    message: kind === 'depth'
      ? `Traversal depth limit (${limit}) exceeded.`
      : `Traversal node budget (${limit}) exceeded.`,
    path: context.canonicalPath ?? '',
    valueType: 'unknown',
  }))
  throw createBudgetExceededError(kind, limit)
}

const createUnsupportedTraversalResult = (): TraversalResult => {
  return {
    cacheValue: unsupportedValue,
    changed: true,
    pathStable: false,
    value: unsupportedValue,
  }
}

const createFailureTraversalResult = (
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  options: {
    readonly error: unknown;
    readonly stage: RuntimeFailureStage;
    readonly value: unknown;
    readonly valueType?: string;
  },
): TraversalResult => {
  emitFailureDiagnostic(plan, context, options)

  return createUnsupportedTraversalResult()
}

const renderRulePathSegment = (segment: PathSegments[number]): string => {
  if (typeof segment === 'string') {
    return `property:${segment}`
  }

  if (typeof segment === 'number') {
    return `index:${segment}`
  }

  if (segment instanceof RegExp) {
    return `regex:${segment.source}/${segment.flags}`
  }

  if ('any' in segment && segment.any === true) {
    return 'wildcard:*'
  }

  if ('anyDepth' in segment && segment.anyDepth === true) {
    return 'wildcard:**'
  }

  if (!('ignore' in segment)) {
    return 'unknown'
  }

  const ignored = segment.ignore

  if (ignored instanceof RegExp) {
    return `ignore-regex:${ignored.source}/${ignored.flags}`
  }

  return typeof ignored === 'number'
    ? `ignore-index:${ignored}`
    : `ignore-property:${ignored}`
}

const buildRuleContextKey = (
  activePolicy: ActivePolicyMatch | undefined,
): string => {
  if (activePolicy === undefined) {
    return 'none'
  }

  return `${activePolicy.source}:${activePolicy.rulePath.map((segment) => renderRulePathSegment(segment)).join('|')}`
}

const usesPathSensitivePolicy = (
  activePolicy: ActivePolicyMatch | undefined,
): boolean => {
  return activePolicy?.source === 'exact-path'
    || activePolicy?.source === 'dynamic-path'
    || typeof activePolicy?.policy.censor === 'function'
}

const createCircularMarker = (
  originalPath: string,
  path: string,
): Record<string, string> => {
  return {
    _transformer: 'circular',
    path,
    value: originalPath,
  }
}

const resolveCompletedTraversal = (
  records: readonly CompletedTraversalRecord[],
  canonicalPath: string,
  ruleContextKey: string,
  value: unknown,
): TraversalResult | undefined => {
  const reusableRecord = records.find((record) => {
    return record.ruleContextKey === ruleContextKey
      && (record.pathStable || record.canonicalPath === canonicalPath)
  })

  if (reusableRecord !== undefined) {
    return {
      cacheValue: reusableRecord.value,
      changed: reusableRecord.value !== value,
      pathStable: reusableRecord.pathStable,
      value: reusableRecord.value,
    }
  }
}

const storeCompletedTraversal = (
  state: TraversalState,
  value: TrackableIdentity,
  record: CompletedTraversalRecord,
): void => {
  const existingRecords = state.completedIdentities.get(value)

  if (existingRecords === undefined) {
    state.completedIdentities.set(value, [record])
    return
  }

  existingRecords.push(record)
}

const storeCompletedSnapshot = (
  state: TraversalState,
  value: TrackableIdentity,
  snapshot: CompletedTraversalSnapshot,
): void => {
  state.completedSnapshots.set(value, snapshot)
}

const withActiveIdentity = <T>(
  branchState: TraversalBranchState,
  value: TrackableIdentity,
  canonicalPath: string,
  run: () => T,
): T => {
  branchState.activePaths.set(value, canonicalPath)

  try {
    return run()
  } finally {
    branchState.activePaths.delete(value)
  }
}

const resolveDirectKeyMatch = (
  plan: CompiledRedactorPlan,
  key: string,
): DirectKeyMatchResult | undefined => {
  const matchingLiteralRule = findMatchingLiteralKey(plan.exactKeyRules.literalMatchers, plan.exactKeyRules.requiresCanonicalKey, key)

  if (matchingLiteralRule !== undefined) {
    return {
      source: 'exact-key',
      rulePath: matchingLiteralRule.rulePath,
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
  pathSegments: ExactPathSegment[],
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
  pathSegments: ExactPathSegment[],
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

  if (
    inheritedPolicy?.source === 'exact-path'
    || inheritedPolicy?.source === 'dynamic-path'
    || inheritedPolicy?.source === 'exact-key'
    || inheritedPolicy?.source === 'regex-key'
  ) {
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

  return undefined
}

const buildFunctionCensorContext = (
  pathSegments: ExactPathSegment[],
  rulePath: PathSegments,
  rootInput: unknown,
): FunctionCensorContext => {
  const matchedPath = Object.freeze(pathSegments.map((seg) => seg.value)) as PathSegments
  const rulePathCopy = Object.freeze([...rulePath]) as PathSegments
  const terminalKey = matchedPath.length > 0
    ? (matchedPath.at(-1) as string | number)
    : undefined

  return terminalKey === undefined
    ? { matchedPath, rulePath: rulePathCopy, rootInput }
    : { matchedPath, rulePath: rulePathCopy, rootInput, terminalKey }
}

const applyConfiguredRedaction = (
  value: unknown,
  policy: CompiledRedactionPolicy,
  rulePath: PathSegments,
  pathStable: boolean,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
): TraversalResult => {
  try {
    const fnContext = buildFunctionCensorContext(
      context.pathSegments,
      rulePath,
      context.rootInput,
    )
    const redactedValue = applyRedaction(value, policy, fnContext)

    return {
      cacheValue: redactedValue,
      changed: true,
      pathStable,
      value: redactedValue,
    }
  } catch (error) {
    return createFailureTraversalResult(plan, context, {
      error,
      stage: 'censor',
      value,
    })
  }
}

const transformNestedNode = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  try {
    return transformNode(value, plan, context, state, branchState)
  } catch (error) {
    if (isBudgetExceededError(error)) throw error
    return createFailureTraversalResult(plan, context, {
      error,
      stage: 'traversal',
      value,
    })
  }
}

// Clones the pattern per call so function censor contexts cannot share or mutate compiled regex state.
const buildSubstringRulePath = (pattern: RegExp): PathSegments => {
  return Object.freeze([cloneRegExp(pattern)]) as PathSegments
}

const patternMatchesString = (pattern: RegExp, value: string): boolean => {
  pattern.lastIndex = 0
  const matched = pattern.test(value)
  pattern.lastIndex = 0

  return matched
}

const applySubstringRule = (
  value: string,
  rule: CompiledSubstringRule,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
): TraversalResult | undefined => {
  if (!patternMatchesString(rule.pattern, value)) {
    return undefined
  }

  if (rule.kind === 'structured-replacer') {
    try {
      const replacement = rule.replacer(value, cloneRegExp(rule.pattern))

      return {
        cacheValue: replacement,
        changed: replacement !== value,
        pathStable: true,
        value: replacement,
      }
    } catch (error) {
      return createFailureTraversalResult(plan, context, {
        error,
        stage: 'substring-replacer',
        value,
      })
    }
  }

  return applyConfiguredRedaction(
    value,
    rule.policy,
    buildSubstringRulePath(rule.pattern),
    typeof rule.policy.censor !== 'function',
    plan,
    context,
  )
}

const applyRootPrimitiveSubstringMatch = (
  value: string,
  rule: CompiledSubstringRule,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
): TraversalResult | undefined => {
  if (!patternMatchesString(rule.pattern, value)) {
    return undefined
  }

  const policy = rule.kind === 'whole-value' ? rule.policy : plan.defaults

  return applyConfiguredRedaction(
    value,
    policy,
    buildSubstringRulePath(rule.pattern),
    typeof policy.censor !== 'function',
    plan,
    context,
  )
}

const transformSubstringValue = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
): TraversalResult | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const isRootInput = context.pathSegments.length === 0

  for (const rule of plan.substringRules) {
    const result = isRootInput
      ? applyRootPrimitiveSubstringMatch(value, rule, plan, context)
      : applySubstringRule(value, rule, plan, context)

    if (result !== undefined) {
      return result
    }
  }

  return undefined
}

const syncCompletedSnapshot = (
  state: TraversalState,
  identity: TrackableIdentity,
  value: unknown,
): void => {
  if (!isTraversableContainer(value)) {
    return
  }

  const snapshot = state.completedSnapshots.get(value)

  if (snapshot !== undefined) {
    state.completedSnapshots.set(identity, snapshot)
  }
}

const transformTrackedIdentity = (
  identity: TrackableIdentity,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  activePolicy: ActivePolicyMatch | undefined,
  state: TraversalState,
  branchState: TraversalBranchState,
  traverse: () => TraversalResult,
): TraversalResult => {
  const canonicalPath = context.canonicalPath ?? ''
  const originalPath = branchState.activePaths.get(identity)

  if (originalPath !== undefined) {
    const circularMarker = createCircularMarker(originalPath ?? '', canonicalPath)

    return {
      cacheValue: circularMarker,
      changed: true,
      pathStable: false,
      value: circularMarker,
    }
  }

  const completedRecords = state.completedIdentities.get(identity)
  const ruleContextKey = activePolicy === undefined ? 'none' : buildRuleContextKey(activePolicy)
  const completedResult = completedRecords === undefined
    ? undefined
    : resolveCompletedTraversal(completedRecords, canonicalPath, ruleContextKey, identity)

  if (completedResult !== undefined) {
    return completedResult
  }

  if (completedRecords !== undefined) {
    const snapshot = state.completedSnapshots.get(identity)

    if (snapshot !== undefined) {
      return replayCompletedTraversal(
        identity,
        snapshot,
        plan,
        activePolicy,
        context,
        ruleContextKey,
        state,
        branchState,
      )
    }
  }

  state.budget.depth += 1
  try {
    if (isDepthExceeded(state.budget, plan.maxDepth)) {
      throwBudgetExceeded(plan, context, 'depth')
    }
    return withActiveIdentity(branchState, identity, canonicalPath, () => {
      const result = traverse()

      storeCompletedTraversal(state, identity, {
        canonicalPath,
        pathStable: result.pathStable,
        ruleContextKey,
        value: result.cacheValue,
      })

      return result
    })
  } finally {
    state.budget.depth -= 1
  }
}

const transformArray = (
  value: readonly unknown[],
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
  pathSegments: ExactPathSegment[],
  rootInput: unknown,
  suppressDescendantRedaction: boolean | undefined,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  const cacheValue: unknown[] = new Array(value.length)
  const transformedValue: unknown[] = new Array(value.length)
  const snapshotItems: CompletedArraySnapshotEntry[] = new Array(value.length)
  const removedIndexes: number[] = []
  let changed = false
  let pathStable = true

  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      continue
    }

    const pathSegment = createIndexPathSegment(index)
    const itemPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    pathSegments.push(pathSegment)
    try {
      const itemContext: TraversalContext = {
        canonicalPath: itemPath,
        inheritedPolicy,
        pathSegments,
        rootInput,
        suppressDescendantRedaction,
      }
      let item: unknown

      try {
        item = value[index]
      } catch (error) {
        const diagnostic = emitFailureDiagnostic(plan, itemContext, {
          error,
          stage: 'traversal-read',
          value: value,
          valueType: 'getter',
        })

        snapshotItems[index] = {
          diagnostic,
          present: true,
        }
        const failureResult = createUnsupportedTraversalResult()

        cacheValue[index] = failureResult.cacheValue
        transformedValue[index] = failureResult.value
        changed = true
        pathStable &&= failureResult.pathStable
        continue
      }

      snapshotItems[index] = {
        present: true,
        value: item,
      }

      const itemResult = transformNestedNode(item, plan, itemContext, state, branchState)
      pathStable &&= itemResult.pathStable

      if (isRemovedValue(itemResult.value)) {
        changed = true
        removedIndexes.push(index)
        continue
      }

      cacheValue[index] = itemResult.cacheValue
      transformedValue[index] = itemResult.value

      if (!itemResult.changed) {
        continue
      }

      changed = true
    } finally {
      pathSegments.pop()
    }
  }

  storeCompletedSnapshot(state, value, {
    items: snapshotItems,
    kind: 'array',
  })

  if (!changed) {
    return {
      cacheValue,
      changed: false,
      pathStable,
      value,
    }
  }

  if (removedIndexes.length === 0) {
    return {
      cacheValue,
      changed,
      pathStable,
      value: transformedValue,
    }
  }

  const compactedValue = transformedValue.slice()
  const compactedCacheValue = cacheValue.slice()
  let removedCount = 0

  for (const removedIndex of removedIndexes) {
    compactedValue.splice(removedIndex - removedCount, 1)
    compactedCacheValue.splice(removedIndex - removedCount, 1)
    removedCount += 1
  }

  return {
    cacheValue: compactedCacheValue,
    changed,
    pathStable,
    value: compactedValue,
  }
}

const transformObject = (
  value: Record<string, unknown>,
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
  pathSegments: ExactPathSegment[],
  rootInput: unknown,
  suppressDescendantRedaction: boolean | undefined,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  const cacheValue: Record<string, unknown> = {}
  const snapshotEntries: CompletedObjectSnapshotEntry[] = []
  let changed = false
  let pathStable = true
  const transformedValue: Record<string, unknown> = {}
  let propertyKeys: string[]

  try {
    propertyKeys = Object.keys(value)
  } catch (error) {
    return createFailureTraversalResult(plan, {
      canonicalPath,
      inheritedPolicy,
      pathSegments,
      rootInput,
      suppressDescendantRedaction,
    }, {
      error,
      stage: 'traversal-read',
      value,
    })
  }

  for (const key of propertyKeys) {
    const pathSegment = createPropertyPathSegment(key)
    const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    pathSegments.push(pathSegment)
    try {
      const propertyContext: TraversalContext = {
        canonicalPath: propertyPath,
        directKeyMatch: plan.exactKeyRules.literalMatchers.length === 0 && plan.regexKeyRules.matchers.length === 0
          ? undefined
          : resolveDirectKeyMatch(plan, key),
        inheritedPolicy,
        pathSegments,
        rootInput,
        suppressDescendantRedaction,
      }
      let propertyValue: unknown

      try {
        propertyValue = value[key]
      } catch (error) {
        const diagnostic = emitFailureDiagnostic(plan, propertyContext, {
          error,
          stage: 'traversal-read',
          value: value,
          valueType: 'getter',
        })

        snapshotEntries.push({
          diagnostic,
          key,
        })
        const failureResult = createUnsupportedTraversalResult()

        setObjectEntry(cacheValue, key, failureResult.cacheValue)
        setObjectEntry(transformedValue, key, failureResult.value)
        changed = true
        pathStable &&= failureResult.pathStable
        continue
      }

      snapshotEntries.push({
        key,
        value: propertyValue,
      })

      const propertyResult = transformNestedNode(propertyValue, plan, propertyContext, state, branchState)
      pathStable &&= propertyResult.pathStable

      if (isRemovedValue(propertyResult.value)) {
        changed = true
        continue
      }

      setObjectEntry(cacheValue, key, propertyResult.cacheValue)
      setObjectEntry(transformedValue, key, propertyResult.value)

      if (!propertyResult.changed) {
        continue
      }

      changed = true
    } finally {
      pathSegments.pop()
    }
  }

  storeCompletedSnapshot(state, value, {
    entries: snapshotEntries,
    kind: 'object',
  })

  return {
    cacheValue,
    changed,
    pathStable,
    value: changed ? transformedValue : value,
  }
}

const transformCompletedArray = (
  snapshot: CompletedArraySnapshot,
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
  pathSegments: ExactPathSegment[],
  rootInput: unknown,
  suppressDescendantRedaction: boolean | undefined,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  const cacheValue: unknown[] = new Array(snapshot.items.length)
  const transformedValue: unknown[] = new Array(snapshot.items.length)
  const removedIndexes: number[] = []
  let pathStable = true

  for (let index = 0; index < snapshot.items.length; index += 1) {
    const itemSnapshot = snapshot.items[index]

    if (itemSnapshot === undefined || !itemSnapshot.present) {
      continue
    }

    const pathSegment = createIndexPathSegment(index)
    const itemPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    if (itemSnapshot.diagnostic !== undefined) {
      emitDiagnosticEvent(
        plan.diagnostics,
        createDiagnosticEvent(plan.diagnostics, itemPath, itemSnapshot.diagnostic),
      )

      const failureResult = createUnsupportedTraversalResult()

      cacheValue[index] = failureResult.cacheValue
      transformedValue[index] = failureResult.value
      pathStable &&= failureResult.pathStable
      continue
    }

    pathSegments.push(pathSegment)
    try {
      const itemResult = transformNestedNode(itemSnapshot.value, plan, {
        canonicalPath: itemPath,
        inheritedPolicy,
        pathSegments,
        rootInput,
        suppressDescendantRedaction,
      }, state, branchState)
      pathStable &&= itemResult.pathStable

      if (isRemovedValue(itemResult.value)) {
        removedIndexes.push(index)
        continue
      }

      cacheValue[index] = itemResult.cacheValue
      transformedValue[index] = itemResult.value
    } finally {
      pathSegments.pop()
    }
  }

  if (removedIndexes.length === 0) {
    return {
      cacheValue,
      changed: true,
      pathStable,
      value: transformedValue,
    }
  }

  const compactedCacheValue = cacheValue.slice()
  const compactedValue = transformedValue.slice()
  let removedCount = 0

  for (const removedIndex of removedIndexes) {
    compactedCacheValue.splice(removedIndex - removedCount, 1)
    compactedValue.splice(removedIndex - removedCount, 1)
    removedCount += 1
  }

  return {
    cacheValue: compactedCacheValue,
    changed: true,
    pathStable,
    value: compactedValue,
  }
}

const transformCompletedObject = (
  snapshot: CompletedObjectSnapshot,
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  canonicalPath: string | undefined,
  pathSegments: ExactPathSegment[],
  rootInput: unknown,
  suppressDescendantRedaction: boolean | undefined,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  const cacheValue: Record<string, unknown> = {}
  const transformedValue: Record<string, unknown> = {}
  let pathStable = true

  for (const entry of snapshot.entries) {
    const pathSegment = createPropertyPathSegment(entry.key)
    const propertyPath = appendCanonicalPathSegment(canonicalPath, pathSegment)
    if (entry.diagnostic !== undefined) {
      emitDiagnosticEvent(
        plan.diagnostics,
        createDiagnosticEvent(plan.diagnostics, propertyPath, entry.diagnostic),
      )

      const failureResult = createUnsupportedTraversalResult()

      setObjectEntry(cacheValue, entry.key, failureResult.cacheValue)
      setObjectEntry(transformedValue, entry.key, failureResult.value)
      pathStable &&= failureResult.pathStable
      continue
    }

    pathSegments.push(pathSegment)
    try {
      const propertyResult = transformNestedNode(entry.value, plan, {
        canonicalPath: propertyPath,
        directKeyMatch: plan.exactKeyRules.literalMatchers.length === 0 && plan.regexKeyRules.matchers.length === 0
          ? undefined
          : resolveDirectKeyMatch(plan, entry.key),
        inheritedPolicy,
        pathSegments,
        rootInput,
        suppressDescendantRedaction,
      }, state, branchState)
      pathStable &&= propertyResult.pathStable

      if (isRemovedValue(propertyResult.value)) {
        continue
      }

      setObjectEntry(cacheValue, entry.key, propertyResult.cacheValue)
      setObjectEntry(transformedValue, entry.key, propertyResult.value)
    } finally {
      pathSegments.pop()
    }
  }

  return {
    cacheValue,
    changed: true,
    pathStable,
    value: transformedValue,
  }
}

const replayCompletedTraversal = (
  value: TrackableIdentity,
  snapshot: CompletedTraversalSnapshot,
  plan: CompiledRedactorPlan,
  inheritedPolicy: ActivePolicyMatch | undefined,
  context: TraversalContext,
  ruleContextKey: string,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  const canonicalPath = context.canonicalPath ?? ''
  const result = withActiveIdentity(branchState, value, canonicalPath, () => {
    return snapshot.kind === 'array'
      ? transformCompletedArray(
        snapshot,
        plan,
        inheritedPolicy,
        context.canonicalPath,
        context.pathSegments,
        context.rootInput,
        context.suppressDescendantRedaction,
        state,
        branchState,
      )
      : transformCompletedObject(
        snapshot,
        plan,
        inheritedPolicy,
        context.canonicalPath,
        context.pathSegments,
        context.rootInput,
        context.suppressDescendantRedaction,
        state,
        branchState,
      )
  })

  storeCompletedTraversal(state, value, {
    canonicalPath,
    pathStable: result.pathStable,
    ruleContextKey,
    value: result.cacheValue,
  })

  return result
}

const transformResolvedNode = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  const activePolicy = context.suppressDescendantRedaction
    ? undefined
    : selectActivePolicy(
      plan,
      resolveExactPathRule(plan, context.canonicalPath),
      plan.dynamicPathRules.length === 0 ? undefined : resolveDynamicPathRule(plan, context.pathSegments),
      context.directKeyMatch,
      context.inheritedPolicy,
    )

  if (activePolicy !== undefined && (!activePolicy.policy.retainStructure || !canRetainStructure(value))) {
    return applyConfiguredRedaction(
      value,
      activePolicy.policy,
      activePolicy.rulePath,
      !usesPathSensitivePolicy(activePolicy),
      plan,
      context,
    )
  }

  if (!isTraversableContainer(value)) {
    const substringResult = context.suppressDescendantRedaction
      ? undefined
      : transformSubstringValue(value, plan, context)

    if (substringResult !== undefined) {
      return substringResult
    }

    return {
      cacheValue: value,
      changed: false,
      pathStable: true,
      value,
    }
  }

  const inheritedPolicy = activePolicy

  return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
    return Array.isArray(value)
      ? transformArray(
        value,
        plan,
        inheritedPolicy,
        context.canonicalPath,
        context.pathSegments,
        context.rootInput,
        context.suppressDescendantRedaction,
        state,
        branchState,
      )
      : transformObject(
        value,
        plan,
        inheritedPolicy,
        context.canonicalPath,
        context.pathSegments,
        context.rootInput,
        context.suppressDescendantRedaction,
        state,
        branchState,
      )
  })
}

const transformSupportedRuntimeValue = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  activePolicy: ActivePolicyMatch | undefined,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult | undefined => {
  const supportedValueKind = resolveSupportedTransformableValueKind(value)

  if (supportedValueKind === undefined) {
    return undefined
  }

  try {
    const transformedValue = resolveTransformedValue(value, plan.transformers)

    if (transformedValue === undefined) {
      return undefined
    }

    const traverseResolvedValue = (
      suppressDescendantRedaction = false,
    ): TraversalResult => {
      const result = transformResolvedNode(transformedValue, plan, {
        ...context,
        suppressDescendantRedaction,
      }, state, branchState)

      return {
        cacheValue: result.cacheValue,
        changed: true,
        pathStable: result.pathStable,
        value: result.value,
      }
    }

    const ignoreDescendantRedaction = plan.ignoredValueTypes[supportedValueKind]

    if (ignoreDescendantRedaction) {
      if (!isSupportedTransformableObject(value)) {
        return traverseResolvedValue(true)
      }

      return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
        const result = traverseResolvedValue(true)

        syncCompletedSnapshot(state, value, transformedValue)

        return result
      })
    }

    if (!isSupportedTransformableObject(value)) {
      return traverseResolvedValue()
    }

    return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
      const result = traverseResolvedValue()

      syncCompletedSnapshot(state, value, transformedValue)

      return result
    })
  } catch (error) {
    if (isBudgetExceededError(error)) throw error
    return createFailureTraversalResult(plan, context, {
      error,
      stage: 'transformer',
      value,
    })
  }
}

const transformNode = (
  value: unknown,
  plan: CompiledRedactorPlan,
  context: TraversalContext,
  state: TraversalState,
  branchState: TraversalBranchState,
): TraversalResult => {
  state.budget.nodesVisited += 1
  if (isNodeBudgetExceeded(state.budget, plan.maxNodes)) {
    throwBudgetExceeded(plan, context, 'nodes')
  }

  const activePolicy = context.suppressDescendantRedaction
    ? undefined
    : selectActivePolicy(
      plan,
      resolveExactPathRule(plan, context.canonicalPath),
      plan.dynamicPathRules.length === 0 ? undefined : resolveDynamicPathRule(plan, context.pathSegments),
      context.directKeyMatch,
      context.inheritedPolicy,
    )

  if (activePolicy !== undefined && (!activePolicy.policy.retainStructure || !canRetainStructure(value))) {
    return applyConfiguredRedaction(
      value,
      activePolicy.policy,
      activePolicy.rulePath,
      !usesPathSensitivePolicy(activePolicy),
      plan,
      context,
    )
  }

  const transformedResult = transformSupportedRuntimeValue(value, plan, context, activePolicy, state, branchState)

  if (transformedResult !== undefined) {
    return transformedResult
  }

  if (!isTraversableContainer(value)) {
    const substringResult = context.suppressDescendantRedaction
      ? undefined
      : transformSubstringValue(value, plan, context)

    if (substringResult !== undefined) {
      return substringResult
    }

    return {
      cacheValue: value,
      changed: false,
      pathStable: true,
      value,
    }
  }

  const inheritedPolicy = activePolicy

  return transformTrackedIdentity(value, plan, context, activePolicy, state, branchState, () => {
    return Array.isArray(value)
      ? transformArray(
        value,
        plan,
        inheritedPolicy,
        context.canonicalPath,
        context.pathSegments,
        context.rootInput,
        context.suppressDescendantRedaction,
        state,
        branchState,
      )
      : transformObject(
        value,
        plan,
        inheritedPolicy,
        context.canonicalPath,
        context.pathSegments,
        context.rootInput,
        context.suppressDescendantRedaction,
        state,
        branchState,
      )
  })
}

export const redactValue = (
  value: unknown,
  plan: CompiledRedactorPlan,
): unknown => {
  const state = createTraversalState()
  const branchState = createTraversalBranchState()
  const result = transformNode(value, plan, {
    canonicalPath: undefined,
    inheritedPolicy: undefined,
    pathSegments: [],
    rootInput: value,
  }, state, branchState)

  return isRemovedValue(result.value) ? undefined : result.value
}
