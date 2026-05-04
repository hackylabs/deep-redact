import type {
  Censor,
  DeepRedactOptions,
  FunctionCensorContext,
  KeySelector,
  PathEntry,
  PathRule,
  PathSegments,
  PathSelector,
  SerialiseOption,
  StringTest,
  SubstringRule,
} from '../../types/public.js'
import {
  isDynamicPathSegment,
  parsePathSelector,
  type ExactPathSegment,
  type PathSegment,
} from '../matching/path-parser.js'
import { normaliseParsedPath, renderSelectorSignature } from '../matching/path-normaliser.js'
import { cloneRegExp } from '../validation/regex-safety.js'

export type { FunctionCensorContext }

export interface CompiledRedactionPolicy {
  readonly censor?: Censor
  readonly remove: boolean
  readonly retainStructure: boolean
  readonly replaceStringByLength: boolean
}

export interface CompiledExactPathRule {
  readonly canonicalPath: string
  readonly policy: CompiledRedactionPolicy
  readonly rulePath: PathSegments
  readonly segments: readonly ExactPathSegment[]
}

export interface CompiledDynamicPathRule {
  readonly signature: string
  readonly policy: CompiledRedactionPolicy
  readonly rulePath: PathSegments
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

export interface CompiledWholeValueSubstringRule {
  readonly kind: 'whole-value'
  readonly pattern: RegExp
  readonly policy: CompiledRedactionPolicy
}

export interface CompiledStructuredSubstringRule {
  readonly kind: 'structured-replacer'
  readonly pattern: RegExp
  readonly replacer: SubstringRule['replacer']
}

export type CompiledSubstringRule = CompiledWholeValueSubstringRule | CompiledStructuredSubstringRule

export interface CompiledRedactorPlan {
  readonly defaults: CompiledRedactionPolicy
  readonly dynamicPathRules: readonly CompiledDynamicPathRule[]
  readonly exactPathRules: Readonly<Record<string, CompiledExactPathRule>>
  readonly exactKeyRules: CompiledExactKeyRules
  readonly regexKeyRules: CompiledRegexKeyRules
  readonly serialise?: SerialiseOption
  readonly substringRules: readonly CompiledSubstringRule[]
}

const createLookupTable = <T>(): Record<string, T> => {
  return Object.create(null) as Record<string, T>
}

const toPublicPathSegment = (segment: PathSegment): PathSegments[number] => {
  if (segment.kind === 'property') return segment.value
  if (segment.kind === 'index') return segment.value
  if (segment.kind === 'wildcard') return Object.freeze({ any: true as const })
  if (segment.kind === 'recursive-wildcard') return Object.freeze({ anyDepth: true as const })
  if (segment.kind === 'ignore-property') return Object.freeze({ ignore: segment.value })
  if (segment.kind === 'ignore-index') return Object.freeze({ ignore: segment.value })
  if (segment.kind === 'regex') return new RegExp(segment.matcher.source, segment.matcher.flags)
  // ignore-regex
  return Object.freeze({ ignore: new RegExp(segment.matcher.source, segment.matcher.flags) })
}

const compileRulePath = (segments: readonly PathSegment[]): PathSegments => {
  return Object.freeze(segments.map(toPublicPathSegment))
}

const createDefaultPolicy = (options: DeepRedactOptions): CompiledRedactionPolicy => {
  return Object.freeze({
    censor: options.censor,
    remove: options.remove ?? false,
    replaceStringByLength: options.replaceStringByLength ?? false,
    retainStructure: options.retainStructure ?? false,
  })
}

const mergePolicy = (
  defaults: CompiledRedactionPolicy,
  overrides: Partial<Pick<PathRule, 'censor' | 'remove' | 'retainStructure' | 'replaceStringByLength'>>,
): CompiledRedactionPolicy => {
  return Object.freeze({
    censor: overrides.censor ?? defaults.censor,
    remove: overrides.remove ?? defaults.remove,
    replaceStringByLength: overrides.replaceStringByLength ?? defaults.replaceStringByLength,
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
  const rulePath = compileRulePath(parsedPath.segments)

  if (parsedPath.segments.some(isDynamicPathSegment)) {
    return Object.freeze({
      signature: renderSelectorSignature(parsedPath.segments),
      policy,
      rulePath,
      segments: parsedPath.segments,
    })
  }

  const normalisedPath = normaliseParsedPath(parsedPath)

  return Object.freeze({
    canonicalPath: normalisedPath.canonicalPath,
    policy,
    rulePath,
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

const isSubstringRule = (stringTest: StringTest): stringTest is SubstringRule => {
  return !(stringTest instanceof RegExp)
}

const compileSubstringRules = (
  stringTests: readonly StringTest[],
  defaults: CompiledRedactionPolicy,
): readonly CompiledSubstringRule[] => {
  return Object.freeze(stringTests.map((stringTest) => {
    if (isSubstringRule(stringTest)) {
      return Object.freeze({
        kind: 'structured-replacer' as const,
        pattern: cloneRegExp(stringTest.pattern),
        replacer: stringTest.replacer,
      })
    }

    return Object.freeze({
      kind: 'whole-value' as const,
      pattern: cloneRegExp(stringTest),
      policy: defaults,
    })
  }))
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
    substringRules: compileSubstringRules(options.stringTests ?? [], defaults),
  })
}
