import type {
  Censor,
  DeepRedactOptions,
  KeySelector,
  PathEntry,
  PathRule,
  PathSelector,
  SerialiseOption,
} from '../../types/public.js'
import {
  isDynamicPathSegment,
  parsePathSelector,
  type ExactPathSegment,
  type PathSegment,
} from '../matching/path-parser.js'
import { normaliseParsedPath, renderSelectorSignature } from '../matching/path-normaliser.js'

export interface CompiledRedactionPolicy {
  readonly censor?: Censor
  readonly remove: boolean
  readonly retainStructure: boolean
}

export interface CompiledExactPathRule {
  readonly canonicalPath: string
  readonly policy: CompiledRedactionPolicy
  readonly segments: readonly ExactPathSegment[]
}

export interface CompiledDynamicPathRule {
  readonly signature: string
  readonly policy: CompiledRedactionPolicy
  readonly segments: readonly PathSegment[]
}

export interface CompiledExactKeyRules {
  readonly keys: Readonly<Record<string, true>>
  readonly policy: CompiledRedactionPolicy
}

export interface CompiledRegexKeyRules {
  readonly matchers: readonly RegExp[]
  readonly policy: CompiledRedactionPolicy
}

export interface CompiledRedactorPlan {
  readonly defaults: CompiledRedactionPolicy
  readonly dynamicPathRules: readonly CompiledDynamicPathRule[]
  readonly exactPathRules: Readonly<Record<string, CompiledExactPathRule>>
  readonly exactKeyRules: CompiledExactKeyRules
  readonly regexKeyRules: CompiledRegexKeyRules
  readonly serialise?: SerialiseOption
}

const createLookupTable = <T>(): Record<string, T> => {
  return Object.create(null) as Record<string, T>
}

const createDefaultPolicy = (options: DeepRedactOptions): CompiledRedactionPolicy => {
  return Object.freeze({
    censor: options.censor,
    remove: options.remove ?? false,
    retainStructure: options.retainStructure ?? false,
  })
}

const mergePolicy = (
  defaults: CompiledRedactionPolicy,
  overrides: Partial<Pick<PathRule, 'censor' | 'remove' | 'retainStructure'>>,
): CompiledRedactionPolicy => {
  return Object.freeze({
    censor: overrides.censor ?? defaults.censor,
    remove: overrides.remove ?? defaults.remove,
    retainStructure: overrides.retainStructure ?? defaults.retainStructure,
  })
}

const isPathRule = (pathEntry: PathEntry): pathEntry is PathRule => {
  return typeof pathEntry === 'object' && pathEntry !== null && !Array.isArray(pathEntry) && 'path' in pathEntry
}

const toPathRule = (pathEntry: PathEntry): PathRule => {
  return !isPathRule(pathEntry)
    ? { path: pathEntry }
    : pathEntry
}

type CompiledPathRule = CompiledExactPathRule | CompiledDynamicPathRule

const compilePathRule = (
  pathEntry: PathEntry,
  defaults: CompiledRedactionPolicy,
): CompiledPathRule => {
  const rule = toPathRule(pathEntry)
  const parsedPath = parsePathSelector(rule.path)
  const policy = mergePolicy(defaults, isPathRule(pathEntry) ? pathEntry : {})

  if (parsedPath.segments.some(isDynamicPathSegment)) {
    return Object.freeze({
      signature: renderSelectorSignature(parsedPath.segments),
      policy,
      segments: parsedPath.segments,
    })
  }

  const normalisedPath = normaliseParsedPath(parsedPath)

  return Object.freeze({
    canonicalPath: normalisedPath.canonicalPath,
    policy,
    segments: normalisedPath.segments,
  })
}

const compilePathRules = (
  pathEntries: readonly PathEntry[],
  defaults: CompiledRedactionPolicy,
): {
  readonly dynamicPathRules: readonly CompiledDynamicPathRule[]
  readonly exactPathRules: Readonly<Record<string, CompiledExactPathRule>>
} => {
  const exactPathRules = createLookupTable<CompiledExactPathRule>()
  const dynamicPathRules: CompiledDynamicPathRule[] = []

  for (const pathEntry of pathEntries) {
    const compiledRule = compilePathRule(pathEntry, defaults)

    if ('canonicalPath' in compiledRule) {
      exactPathRules[compiledRule.canonicalPath] = compiledRule
      continue
    }

    dynamicPathRules.push(compiledRule)
  }

  return Object.freeze({
    dynamicPathRules: Object.freeze(dynamicPathRules),
    exactPathRules: Object.freeze(exactPathRules),
  })
}

const compileExactKeyRules = (
  keys: readonly KeySelector[],
  defaults: CompiledRedactionPolicy,
): CompiledExactKeyRules => {
  const exactKeys = createLookupTable<true>()

  for (const key of keys) {
    if (typeof key === 'string') {
      exactKeys[key] = true
    }
  }

  return Object.freeze({
    keys: Object.freeze(exactKeys),
    policy: defaults,
  })
}

const compileRegexKeyRules = (
  keys: readonly KeySelector[],
  defaults: CompiledRedactionPolicy,
): CompiledRegexKeyRules => {
  const matchers: RegExp[] = []

  for (const key of keys) {
    if (key instanceof RegExp) {
      matchers.push(new RegExp(key.source, key.flags))
    }
  }

  return Object.freeze({
    matchers: Object.freeze(matchers),
    policy: defaults,
  })
}

export const compileRedactorPlan = (options: DeepRedactOptions = {}): CompiledRedactorPlan => {
  const defaults = createDefaultPolicy(options)
  const compiledPathRules = compilePathRules(options.paths ?? [], defaults)

  return Object.freeze({
    defaults,
    dynamicPathRules: compiledPathRules.dynamicPathRules,
    exactKeyRules: compileExactKeyRules(options.keys ?? [], defaults),
    exactPathRules: compiledPathRules.exactPathRules,
    regexKeyRules: compileRegexKeyRules(options.keys ?? [], defaults),
    serialise: options.serialise,
  })
}
