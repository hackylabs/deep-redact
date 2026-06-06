import type {
  Censor,
  DeepRedactOptions,
  KeyRule,
  KeySelector,
  PathEntry,
  PathRule,
  PathSegments,
  SerialiseOption,
  StringTest,
  SubstringRule,
} from '../../types/public.js'
import {
  compileDiagnostics,
  type CompiledDiagnosticsPlan,
} from './compile-diagnostics.js'
import {
  compileIgnoredValueTypes,
  type CompiledIgnoredValueTypesPlan,
} from './compile-ignored-value-types.js'
import {
  compileValueTypes,
  type CompiledValueTypesPlan,
} from './compile-value-types.js'
import { compileTransformers, type CompiledTransformersPlan } from './compile-transformers.js'
import {
  containsOnlySingleWildcardDynamics,
  hasUnsafeWildcardOverlap,
  isDynamicPathSegment,
  parsePathSelector,
  type ExactPathSegment,
  type PathSegment,
} from '../matching/path-parser.js'
import { canonicaliseKey } from '../matching/key-normaliser.js'
import { normaliseParsedPath, renderSelectorSignature } from '../matching/path-normaliser.js'
import { cloneRegExp } from '../validation/regex-safety.js'
import { DEFAULT_MAX_DEPTH, DEFAULT_MAX_NODES } from '../runtime/traversal-budget.js'



export interface CompiledRedactionPolicy {
  readonly censor?: Censor;
  readonly remove: boolean;
  readonly retainStructure: boolean;
  readonly replaceStringByLength: boolean;
}

export interface CompiledExactPathRule {
  readonly canonicalPath: string;
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
  readonly segments: readonly ExactPathSegment[];
}

export interface CompiledDynamicPathRule {
  readonly signature: string;
  readonly policy: CompiledRedactionPolicy;
  readonly rulePath: PathSegments;
  readonly segments: readonly PathSegment[];
}

export type CompiledLiteralKeyMatchMode = 'exact' | 'canonical-exact' | 'contains' | 'canonical-contains'

export interface CompiledLiteralKeyRule {
  readonly canonicalKey: string;
  readonly configuredKey: string;
  readonly matchMode: CompiledLiteralKeyMatchMode;
  readonly rulePath: PathSegments;
}

export interface CompiledExactKeyRules {
  readonly literalMatchers: readonly CompiledLiteralKeyRule[];
  readonly policy: CompiledRedactionPolicy;
  readonly requiresCanonicalKey: boolean;
}

export interface CompiledRegexKeyRules {
  readonly matchers: readonly RegExp[];
  readonly policy: CompiledRedactionPolicy;
}

export interface CompiledWholeValueSubstringRule {
  readonly kind: 'whole-value';
  readonly pattern: RegExp;
  readonly policy: CompiledRedactionPolicy;
}

export interface CompiledStructuredSubstringRule {
  readonly kind: 'structured-replacer';
  readonly pattern: RegExp;
  readonly replacer: SubstringRule['replacer'];
}

export type CompiledSubstringRule = CompiledWholeValueSubstringRule | CompiledStructuredSubstringRule

export interface CompiledRedactorPlan {
  readonly diagnostics: CompiledDiagnosticsPlan;
  readonly defaults: CompiledRedactionPolicy;
  readonly dynamicPathRules: readonly CompiledDynamicPathRule[];
  readonly exactPathRules: Readonly<Record<string, CompiledExactPathRule>>;
  readonly exactKeyRules: CompiledExactKeyRules;
  readonly ignoredValueTypes: CompiledIgnoredValueTypesPlan;
  // Selects the rule-driven navigation engine: the config targets exact string paths and/or
  // single-level `*` wildcard paths exclusively, with no key, regex-key, or stringTest rules,
  // and none of the disqualifying selectors (`**` recursive wildcard, ignore segments,
  // regex/ignore-regex segments). Necessary but not sufficient — final navigation is payload-
  // aware at call time (a non-plain prototype on a configured path, or a non-plain container
  // reached at a wildcard depth, delegates to the general traversal; see navigate-exact-paths.ts).
  readonly pathDrivenOnly: boolean;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly regexKeyRules: CompiledRegexKeyRules;
  readonly serialise?: SerialiseOption;
  readonly substringRules: readonly CompiledSubstringRule[];
  readonly transformers: CompiledTransformersPlan;
  // The value-type allowlist, authoritative over every redaction source at the shared leaf-
  // replacement boundary. Always present; an unset `types` option compiles the string-only default.
  readonly valueTypes: CompiledValueTypesPlan;
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
  return Object.freeze(segments.map((segment) => toPublicPathSegment(segment)))
}

const createDefaultPolicy = (options: DeepRedactOptions): CompiledRedactionPolicy => {
  return Object.freeze({
    censor: options.censor,
    remove: options.remove ?? false,
    replaceStringByLength: options.replaceStringByLength ?? false,
    retainStructure: options.retainStructure ?? false,
  })
}

interface KeyMatchDefaults {
  readonly caseSensitiveKeyMatch: boolean;
  readonly fuzzyKeyMatch: boolean;
}

const createKeyMatchDefaults = (options: DeepRedactOptions): KeyMatchDefaults => {
  return Object.freeze({
    caseSensitiveKeyMatch: options.caseSensitiveKeyMatch ?? true,
    fuzzyKeyMatch: options.fuzzyKeyMatch ?? false,
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
  return isPathRule(pathEntry)
    ? pathEntry
    : { path: pathEntry }
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

  if (parsedPath.segments.some((segment) => isDynamicPathSegment(segment))) {
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
  readonly dynamicPathRules: readonly CompiledDynamicPathRule[];
  readonly exactPathRules: Readonly<Record<string, CompiledExactPathRule>>;
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

const isKeyRule = (keySelector: KeySelector): keySelector is KeyRule => {
  return typeof keySelector === 'object'
    && keySelector !== null
    && !(keySelector instanceof RegExp)
    && 'key' in keySelector
}

const toLiteralKeyRule = (keySelector: string | KeyRule, defaults: KeyMatchDefaults): CompiledLiteralKeyRule => {
  const configuredKey = typeof keySelector === 'string' ? keySelector : keySelector.key
  const fuzzyKeyMatch = typeof keySelector === 'string'
    ? defaults.fuzzyKeyMatch
    : keySelector.fuzzyKeyMatch ?? defaults.fuzzyKeyMatch
  const caseSensitiveKeyMatch = typeof keySelector === 'string'
    ? defaults.caseSensitiveKeyMatch
    : keySelector.caseSensitiveKeyMatch ?? defaults.caseSensitiveKeyMatch

  let matchMode: CompiledLiteralKeyMatchMode = 'exact'

  if (fuzzyKeyMatch) {
    matchMode = caseSensitiveKeyMatch ? 'contains' : 'canonical-contains'
  } else if (!caseSensitiveKeyMatch) {
    matchMode = 'canonical-exact'
  }

  return Object.freeze({
    canonicalKey: canonicaliseKey(configuredKey),
    configuredKey,
    matchMode,
    rulePath: Object.freeze([configuredKey]) as PathSegments,
  })
}

const compileExactKeyRules = (
  keys: readonly KeySelector[],
  defaults: CompiledRedactionPolicy,
  keyDefaults: KeyMatchDefaults,
): CompiledExactKeyRules => {
  const literalMatchers: CompiledLiteralKeyRule[] = []

  for (const key of keys) {
    if (typeof key === 'string' || isKeyRule(key)) {
      literalMatchers.push(toLiteralKeyRule(key, keyDefaults))
    }
  }

  return Object.freeze({
    literalMatchers: Object.freeze(literalMatchers),
    policy: defaults,
    requiresCanonicalKey: literalMatchers.some((rule) => rule.matchMode.startsWith('canonical')),
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
  const keyDefaults = createKeyMatchDefaults(options)
  const compiledPathRules = compilePathRules(options.paths ?? [], defaults)
  const exactKeyRules = compileExactKeyRules(options.keys ?? [], defaults, keyDefaults)
  const regexKeyRules = compileRegexKeyRules(options.keys ?? [], defaults)
  const substringRules = compileSubstringRules(options.stringTests ?? [], defaults)

  // The config selects the rule-driven engine only when redaction is driven purely by exact
  // string paths and/or single-level `*` wildcard paths: every dynamic path rule is single-
  // wildcard-only (no `**`, ignore, or regex segments), no key/regex-key rules, no stringTests,
  // and none of the key-matching mode flags (fuzzyKeyMatch, caseSensitiveKeyMatch: false) that
  // would alter matching behaviour if key rules were present. At least one path rule must exist
  // (an exact path or a qualifying wildcard rule). It is additionally rejected when a wildcard's
  // `*` enumeration depth coincides with another rule's non-terminal concrete segment on a shared
  // prefix (e.g. `a.b.c` + `a.*.d`): the engine's two-pass navigation cannot resolve that per-leaf
  // precedence, so such configs route to the O(N) general traversal instead.
  //
  // Eligibility is deliberately retain-agnostic: it takes no `retainStructure` input. A retain-heavy
  // config (including one that delegates wholesale at call time, e.g. a retain rule above a wildcard)
  // therefore still compiles `pathDrivenOnly: true` and pays prefix-tree setup cost. This trade-off
  // is accepted; excluding unprofitable near-100%-delegation retain patterns is deferred follow-up
  // work (see deferred-work-audit.md) and is intentionally not implemented here. The current
  // behaviour is classifier-pinned in compile-redactor-plan.test.ts.
  const everyDynamicRuleIsSingleWildcard = compiledPathRules.dynamicPathRules
    .every((rule) => containsOnlySingleWildcardDynamics(rule.segments))
  const hasAnyPathRule = Object.keys(compiledPathRules.exactPathRules).length > 0
    || compiledPathRules.dynamicPathRules.length > 0
  const hasUnsafeOverlap = compiledPathRules.dynamicPathRules.length > 0
    && hasUnsafeWildcardOverlap([
      ...Object.values(compiledPathRules.exactPathRules).map((rule) => rule.segments),
      ...compiledPathRules.dynamicPathRules.map((rule) => rule.segments),
    ])
  const pathDrivenOnly = everyDynamicRuleIsSingleWildcard
    && hasAnyPathRule
    && !hasUnsafeOverlap
    && exactKeyRules.literalMatchers.length === 0
    && regexKeyRules.matchers.length === 0
    && substringRules.length === 0
    && !options.fuzzyKeyMatch
    && options.caseSensitiveKeyMatch !== false

  return Object.freeze({
    diagnostics: compileDiagnostics(options.diagnostics),
    defaults,
    dynamicPathRules: compiledPathRules.dynamicPathRules,
    exactKeyRules,
    exactPathRules: compiledPathRules.exactPathRules,
    ignoredValueTypes: compileIgnoredValueTypes(options.ignoredValueTypes),
    pathDrivenOnly,
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxNodes: options.maxNodes ?? DEFAULT_MAX_NODES,
    regexKeyRules,
    serialise: options.serialise,
    substringRules,
    transformers: compileTransformers(options.transformers),
    valueTypes: compileValueTypes(options.types),
  })
}

export {type FunctionCensorContext} from '../../types/public.js'
