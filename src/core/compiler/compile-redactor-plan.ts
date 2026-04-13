import type {
  Censor,
  DeepRedactOptions,
  PathEntry,
  PathRule,
  SerialiseOption,
} from '../../types/public.js'
import { parsePathSelector, type PathSegment } from '../matching/path-parser.js'
import { normaliseParsedPath } from '../matching/path-normaliser.js'

export interface CompiledRedactionPolicy {
  readonly censor?: Censor
  readonly remove: boolean
  readonly retainStructure: boolean
}

export interface CompiledExactPathRule {
  readonly canonicalPath: string
  readonly policy: CompiledRedactionPolicy
  readonly segments: readonly PathSegment[]
}

export interface CompiledExactKeyRules {
  readonly keys: Readonly<Record<string, true>>
  readonly policy: CompiledRedactionPolicy
}

export interface CompiledRedactorPlan {
  readonly defaults: CompiledRedactionPolicy
  readonly exactPathRules: Readonly<Record<string, CompiledExactPathRule>>
  readonly exactKeyRules: CompiledExactKeyRules
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

const compilePathRule = (
  pathEntry: PathEntry,
  defaults: CompiledRedactionPolicy,
): CompiledExactPathRule => {
  const rule = typeof pathEntry === 'string'
    ? { path: pathEntry }
    : pathEntry
  const normalisedPath = normaliseParsedPath(parsePathSelector(rule.path))

  return Object.freeze({
    canonicalPath: normalisedPath.canonicalPath,
    policy: mergePolicy(defaults, typeof pathEntry === 'string' ? {} : pathEntry),
    segments: normalisedPath.segments,
  })
}

const compileExactPathRules = (
  pathEntries: readonly PathEntry[],
  defaults: CompiledRedactionPolicy,
): Readonly<Record<string, CompiledExactPathRule>> => {
  const exactPathRules = createLookupTable<CompiledExactPathRule>()

  for (const pathEntry of pathEntries) {
    const compiledRule = compilePathRule(pathEntry, defaults)
    exactPathRules[compiledRule.canonicalPath] = compiledRule
  }

  return Object.freeze(exactPathRules)
}

const compileExactKeyRules = (
  keys: readonly string[],
  defaults: CompiledRedactionPolicy,
): CompiledExactKeyRules => {
  const exactKeys = createLookupTable<true>()

  for (const key of keys) {
    exactKeys[key] = true
  }

  return Object.freeze({
    keys: Object.freeze(exactKeys),
    policy: defaults,
  })
}

export const compileRedactorPlan = (options: DeepRedactOptions = {}): CompiledRedactorPlan => {
  const defaults = createDefaultPolicy(options)

  return Object.freeze({
    defaults,
    exactKeyRules: compileExactKeyRules(options.keys ?? [], defaults),
    exactPathRules: compileExactPathRules(options.paths ?? [], defaults),
    serialise: options.serialise,
  })
}
