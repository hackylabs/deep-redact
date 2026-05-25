import {
  compileRedactorPlan,
  type CompiledDynamicPathRule,
  type CompiledExactPathRule,
  type CompiledRedactorPlan,
} from '../../../src/core/compiler/compile-redactor-plan.js'
import { renderSelectorSignature } from '../../../src/core/matching/path-normaliser.js'
import { redactValue } from '../../../src/core/runtime/redact-value.js'
import type { DeepRedactOptions, FunctionCensorContext } from '../../../src/index.js'
import type { PathSegment } from '../../../src/core/matching/path-parser.js'

// ── Lane-override mechanism ──────────────────────────────────────────────────

const createEmptyLookupTable = <T>(): Record<string, T> =>
  Object.create(null) as Record<string, T>

export const createGenericisedPlan = (plan: CompiledRedactorPlan): CompiledRedactorPlan => {
  if (plan.dynamicPathRules.length > 0) {
    throw new Error('createGenericisedPlan: plan must have no pre-existing dynamicPathRules')
  }

  const convertedRules: CompiledDynamicPathRule[] = []

  for (const canonicalPath of Object.keys(plan.exactPathRules)) {
    const exactRule = plan.exactPathRules[canonicalPath]!
    convertedRules.push(Object.freeze({
      signature: renderSelectorSignature(exactRule.segments as readonly PathSegment[]),
      policy: exactRule.policy,
      rulePath: exactRule.rulePath,
      segments: exactRule.segments as readonly PathSegment[],
    }))
  }

  if (convertedRules.length !== Object.keys(plan.exactPathRules).length) {
    throw new Error('createGenericisedPlan: internal error — converted rule count mismatch')
  }

  return Object.freeze({
    ...plan,
    exactPathRules: Object.freeze(createEmptyLookupTable<CompiledExactPathRule>()),
    dynamicPathRules: Object.freeze([...plan.dynamicPathRules, ...convertedRules]),
  })
}

export const createLaneForcedRedactorFromPlan = (
  plan: CompiledRedactorPlan,
  lane: 'fast' | 'generic',
): (value: unknown) => unknown => {
  const activePlan = lane === 'generic' ? createGenericisedPlan(plan) : plan

  return (value: unknown): unknown => {
    const structured = redactValue(value, activePlan)
    if (activePlan.serialise === true) return JSON.stringify(structured)
    if (typeof activePlan.serialise === 'function') return activePlan.serialise(structured)
    return structured
  }
}

export const createLaneForcedRedactor = (
  options: DeepRedactOptions,
  lane: 'fast' | 'generic',
): (value: unknown) => unknown => createLaneForcedRedactorFromPlan(compileRedactorPlan(options), lane)

// ── Corpus entry type ────────────────────────────────────────────────────────

export interface ExactPathEquivalenceCorpusEntry {
  readonly name: string;
  readonly title: string;
  readonly exactPathEligibilityReason: string;
  readonly options: DeepRedactOptions;
  readonly createPayload: () => unknown;
  readonly expectedStructured: unknown;
  readonly expectedSerialised: string;
  readonly expectedCustomSerialised?: string;
}

// ── Canary golden serialised strings ─────────────────────────────────────────
// Each canary commits the exact byte sequence for a fixture shape.
// A property-order regression that somehow passes structural assertions will
// fail here before the corpus tests even run.

const SERIALISED_SINGLE_EXACT_PATH_CANARY =
  '{"user":{"password":"[REDACTED]","safe":"keep"}}' as const

const SERIALISED_MULTIPLE_EXACT_PATHS_CANARY =
  '{"user":{"password":"[REDACTED]","safe":"keep"},"session":{"token":"[REDACTED]","id":"abc"}}' as const

const SERIALISED_ARRAY_INDEX_CANARY =
  '{"users":[{"email":"[REDACTED]","safe":"keep"},{"email":"other@example.com"}]}' as const

const SERIALISED_CUSTOM_CENSOR_CANARY =
  '{"user":{"token":"[TOKEN-CENSORED]","safe":"keep"}}' as const

const SERIALISED_FUNCTION_CENSOR_CANARY =
  '{"account":{"secret":"[FN:account.secret]","visible":"show"}}' as const

const SERIALISED_RETAIN_STRUCTURE_CANARY =
  '{"user":{"profile":{"secret":"[REDACTED]","safe":"[REDACTED]"}}}' as const

const SERIALISED_REMOVE_CANARY =
  '{"user":{"name":"alice"}}' as const

const SERIALISED_MULTIPLE_POLICIES_CANARY =
  '{"config":{"apiKey":"[API-KEY]","secret":"[SECRET]","safe":"keep"}}' as const

const CUSTOM_SERIALISED_SINGLE_EXACT_PATH_CANARY =
  '{"v":{"user":{"password":"[REDACTED]","safe":"keep"}}}' as const

const SERIALISED_BRACKET_QUOTED_KEY_CANARY =
  '{"users":{"first.name":{"email":"[REDACTED]"}}}' as const

const SERIALISED_PRIMITIVE_LEAF_VALUES_CANARY =
  '{"data":{"count":"[REDACTED]","active":"[REDACTED]","extra":"[REDACTED]"}}' as const

const SERIALISED_ABSENT_PATH_CANARY =
  '{"user":{"name":"alice","age":30}}' as const

const SERIALISED_REPLACE_STRING_BY_LENGTH_CANARY =
  '{"user":{"password":"[REDAC","safe":"keep"}}' as const

const SERIALISED_REPLACE_STRING_BY_LENGTH_CUSTOM_CENSOR_CANARY =
  '{"user":{"password":"******","safe":"keep"}}' as const

const SERIALISED_RETAIN_STRUCTURE_ALIAS_REPLAY_CANARY =
  '{"primary":{"secret":"[REDACTED]","name":"[REDACTED]"},"secondary":{"secret":"[REDACTED]","name":"[REDACTED]"}}' as const

// ── Corpus ───────────────────────────────────────────────────────────────────

const determineFunctionCensorOutput = (
  _value: unknown,
  ctx: FunctionCensorContext,
): string => {
  return `[FN:${(ctx.matchedPath as ReadonlyArray<string | number>).join('.')}]`
}

export const exactPathEquivalenceCorpus: readonly ExactPathEquivalenceCorpusEntry[] = [
  {
    name: 'single-exact-path',
    title: 'single exact path — user.password',
    exactPathEligibilityReason: 'one exact static absolute path with no dynamic segments',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'secret', safe: 'keep' } }),
    expectedStructured: { user: { password: '[REDACTED]', safe: 'keep' } },
    expectedSerialised: SERIALISED_SINGLE_EXACT_PATH_CANARY,
    expectedCustomSerialised: CUSTOM_SERIALISED_SINGLE_EXACT_PATH_CANARY,
  },
  {
    name: 'multiple-exact-paths',
    title: 'multiple exact paths — user.password and session.token',
    exactPathEligibilityReason: 'two exact static absolute paths, each with no dynamic segments',
    options: { paths: ['user.password', 'session.token'] },
    createPayload: () => ({
      user: { password: 'secret1', safe: 'keep' },
      session: { token: 'secret2', id: 'abc' },
    }),
    expectedStructured: {
      user: { password: '[REDACTED]', safe: 'keep' },
      session: { token: '[REDACTED]', id: 'abc' },
    },
    expectedSerialised: SERIALISED_MULTIPLE_EXACT_PATHS_CANARY,
  },
  {
    name: 'exact-path-array-index',
    title: 'exact path with array index — users.0.email',
    exactPathEligibilityReason: 'all segments are static, including a numeric index segment',
    options: { paths: ['users.0.email'] },
    createPayload: () => ({
      users: [
        { email: 'user@example.com', safe: 'keep' },
        { email: 'other@example.com' },
      ],
    }),
    expectedStructured: {
      users: [
        { email: '[REDACTED]', safe: 'keep' },
        { email: 'other@example.com' },
      ],
    },
    expectedSerialised: SERIALISED_ARRAY_INDEX_CANARY,
  },
  {
    name: 'exact-path-custom-censor',
    title: 'exact path with literal string censor — user.token',
    exactPathEligibilityReason: 'one exact static absolute path with a per-path literal censor override',
    options: { paths: [{ path: 'user.token', censor: '[TOKEN-CENSORED]' }] },
    createPayload: () => ({ user: { token: 'abc123', safe: 'keep' } }),
    expectedStructured: { user: { token: '[TOKEN-CENSORED]', safe: 'keep' } },
    expectedSerialised: SERIALISED_CUSTOM_CENSOR_CANARY,
  },
  {
    name: 'exact-path-function-censor',
    title: 'exact path with function censor — account.secret',
    exactPathEligibilityReason: 'one exact static absolute path with a per-path function censor',
    options: {
      paths: [{ path: 'account.secret', censor: determineFunctionCensorOutput }],
    },
    createPayload: () => ({ account: { secret: 'hidden', visible: 'show' } }),
    expectedStructured: { account: { secret: '[FN:account.secret]', visible: 'show' } },
    expectedSerialised: SERIALISED_FUNCTION_CENSOR_CANARY,
  },
  {
    name: 'exact-path-retain-structure',
    title: 'exact path with retainStructure — user.profile',
    exactPathEligibilityReason: 'one exact static absolute path with retainStructure: true; descendant traversal applies the default censor to all leaf values',
    options: { paths: [{ path: 'user.profile', retainStructure: true }] },
    createPayload: () => ({ user: { profile: { secret: 'hidden', safe: 'keep' } } }),
    expectedStructured: { user: { profile: { secret: '[REDACTED]', safe: '[REDACTED]' } } },
    expectedSerialised: SERIALISED_RETAIN_STRUCTURE_CANARY,
  },
  {
    name: 'exact-path-remove',
    title: 'exact path with remove — user.token',
    exactPathEligibilityReason: 'one exact static absolute path with remove: true',
    options: { paths: [{ path: 'user.token', remove: true }] },
    createPayload: () => ({ user: { token: 'secret', name: 'alice' } }),
    expectedStructured: { user: { name: 'alice' } },
    expectedSerialised: SERIALISED_REMOVE_CANARY,
  },
  {
    name: 'exact-path-multiple-policies',
    title: 'multiple exact paths with different per-path censors — config.apiKey and config.secret',
    exactPathEligibilityReason: 'two exact static absolute paths with distinct literal censor values, proving policy isolation',
    options: {
      paths: [
        { path: 'config.apiKey', censor: '[API-KEY]' },
        { path: 'config.secret', censor: '[SECRET]' },
      ],
    },
    createPayload: () => ({ config: { apiKey: 'key123', secret: 'secret456', safe: 'keep' } }),
    expectedStructured: { config: { apiKey: '[API-KEY]', secret: '[SECRET]', safe: 'keep' } },
    expectedSerialised: SERIALISED_MULTIPLE_POLICIES_CANARY,
  },
  {
    name: 'exact-path-bracket-quoted-key',
    title: 'exact path with bracket-quoted property key — users["first.name"].email',
    exactPathEligibilityReason: 'all segments are exact static properties; the middle segment uses bracket-quoted notation because its key contains a dot',
    options: { paths: ['users["first.name"].email'] },
    createPayload: () => ({ users: { 'first.name': { email: 'user@example.com' } } }),
    expectedStructured: { users: { 'first.name': { email: '[REDACTED]' } } },
    expectedSerialised: SERIALISED_BRACKET_QUOTED_KEY_CANARY,
  },
  {
    name: 'exact-path-primitive-leaf-values',
    title: 'exact paths targeting number, boolean, and null leaf values',
    exactPathEligibilityReason: 'three exact static absolute paths; leaf values are non-string primitives',
    options: { paths: ['data.count', 'data.active', 'data.extra'] },
    createPayload: () => ({ data: { count: 42, active: true, extra: null } }),
    expectedStructured: { data: { count: '[REDACTED]', active: '[REDACTED]', extra: '[REDACTED]' } },
    expectedSerialised: SERIALISED_PRIMITIVE_LEAF_VALUES_CANARY,
  },
  {
    name: 'exact-path-absent-key',
    title: 'exact path targeting a key absent from the payload — no-op',
    exactPathEligibilityReason: 'one exact static absolute path; the targeted key does not exist in the payload',
    options: { paths: ['user.missing'] },
    createPayload: () => ({ user: { name: 'alice', age: 30 } }),
    expectedStructured: { user: { name: 'alice', age: 30 } },
    expectedSerialised: SERIALISED_ABSENT_PATH_CANARY,
  },
  {
    name: 'exact-path-replace-string-by-length',
    title: 'exact path with replaceStringByLength: true — user.password',
    exactPathEligibilityReason: 'one exact static absolute path with replaceStringByLength: true per-path override',
    options: { paths: [{ path: 'user.password', replaceStringByLength: true }] },
    createPayload: () => ({ user: { password: 'secret', safe: 'keep' } }),
    expectedStructured: { user: { password: '[REDAC', safe: 'keep' } },
    expectedSerialised: SERIALISED_REPLACE_STRING_BY_LENGTH_CANARY,
  },
  {
    name: 'exact-path-replace-string-by-length-custom-censor',
    title: 'exact path with replaceStringByLength: true and single-character censor — quotient branch of buildSameLengthReplacement',
    exactPathEligibilityReason: 'one exact static absolute path with replaceStringByLength: true and a single-character censor, exercising the repeat branch (quotient > 0) of buildSameLengthReplacement',
    options: { paths: [{ path: 'user.password', replaceStringByLength: true, censor: '*' }] },
    createPayload: () => ({ user: { password: 'secret', safe: 'keep' } }),
    expectedStructured: { user: { password: '******', safe: 'keep' } },
    expectedSerialised: SERIALISED_REPLACE_STRING_BY_LENGTH_CUSTOM_CENSOR_CANARY,
  },
  {
    name: 'exact-path-retain-structure-alias-replay',
    title: 'retainStructure alias-replay — same object identity reached via two branches',
    exactPathEligibilityReason: 'two exact static absolute paths with retainStructure: true; the payload uses shared object identity across both branches',
    options: {
      paths: [
        { path: 'primary', retainStructure: true },
        { path: 'secondary', retainStructure: true },
      ],
    },
    createPayload: () => {
      const sharedProfile = { secret: 'hidden', name: 'alice' }
      return { primary: sharedProfile, secondary: sharedProfile }
    },
    expectedStructured: {
      primary: { secret: '[REDACTED]', name: '[REDACTED]' },
      secondary: { secret: '[REDACTED]', name: '[REDACTED]' },
    },
    expectedSerialised: SERIALISED_RETAIN_STRUCTURE_ALIAS_REPLAY_CANARY,
  },
]
