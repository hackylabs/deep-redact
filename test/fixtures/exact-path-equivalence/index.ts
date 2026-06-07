import {
  compileRedactorPlan,
  type CompiledDynamicPathRule,
  type CompiledExactPathRule,
  type CompiledRedactorPlan,
} from '../../../src/core/compiler/compile-redactor-plan.js'
import { renderSelectorSignature } from '../../../src/core/matching/path-normaliser.js'
import { redactValue } from '../../../src/core/runtime/redact-value.js'
import { buildPathDrivenExecutor } from '../../../src/core/runtime/navigate-exact-paths.js'
import type { DeepRedactOptions, FunctionCensorContext } from '../../../src/index.js'
import type { PathSegment } from '../../../src/core/matching/path-parser.js'

// ── Execution-mode override mechanism ────────────────────────────────────────

const createEmptyLookupTable = <T>(): Record<string, T> =>
  Object.create(null) as Record<string, T>

export const createGenericisedPlan = (plan: CompiledRedactorPlan): CompiledRedactorPlan => {
  if (plan.dynamicPathRules.length > 0) {
    // A wildcard (or otherwise dynamic) plan already routes through the O(N) general traversal,
    // and `redactValue` applies the native exact-path-before-dynamic-path precedence. Run it
    // as-is so the generic traversal mirrors production precedence; converting the exact rules to
    // dynamic here would flatten that ordering and diverge for exact-over-wildcard overlaps.
    return plan
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

export const createExecutionModeForcedRedactorFromPlan = (
  plan: CompiledRedactorPlan,
  mode: 'path-driven' | 'generic',
): (value: unknown) => unknown => {
  // 'path-driven' exercises the rule-driven engine (trie-guided exact-path navigation)
  // with the general traversal as its delegation fallback; 'generic' converts the exact
  // rules to dynamic rules and runs the O(N) general traversal. The serialise step mirrors
  // create-redactor's applySerialisation so byte-for-byte equality is comparable across modes.
  const activePlan = mode === 'generic' ? createGenericisedPlan(plan) : plan
  const executor = mode === 'path-driven'
    ? buildPathDrivenExecutor(plan, (value: unknown) => redactValue(value, plan))
    : (value: unknown): unknown => redactValue(value, activePlan)

  return (value: unknown): unknown => {
    const structured = executor(value)
    if (activePlan.serialise === true) return JSON.stringify(structured)
    if (typeof activePlan.serialise === 'function') return activePlan.serialise(structured)
    return structured
  }
}

export const createExecutionModeForcedRedactor = (
  options: DeepRedactOptions,
  mode: 'path-driven' | 'generic',
): (value: unknown) => unknown => createExecutionModeForcedRedactorFromPlan(compileRedactorPlan(options), mode)

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

const SERIALISED_SINGLE_SEGMENT_PATH_CANARY =
  '{"password":"[REDACTED]","safe":"keep"}' as const

const SERIALISED_DEEP_NESTED_PATH_CANARY =
  '{"a":{"b":{"c":{"secret":"[REDACTED]","safe":"keep"}}}}' as const

const SERIALISED_COMMON_PREFIX_PATHS_CANARY =
  '{"user":{"password":"[REDACTED]","email":"[REDACTED]","safe":"keep"}}' as const

const SERIALISED_ABSENT_INTERMEDIATE_KEY_CANARY =
  '{"user":{"name":"alice"}}' as const

const SERIALISED_ARRAY_TERMINAL_VALUE_CANARY =
  '{"user":{"items":"[REDACTED]","name":"alice"}}' as const

const SERIALISED_SAME_TERMINAL_KEY_DIFFERENT_PARENTS_CANARY =
  '{"a":{"secret":"[REDACTED]","safe":"keep-a"},"b":{"secret":"[REDACTED]","safe":"keep-b"}}' as const

const SERIALISED_NESTED_OBJECT_TERMINAL_CANARY =
  '{"user":{"id":1,"address":"[REDACTED]"}}' as const

const SERIALISED_EMPTY_STRING_VALUE_CANARY =
  '{"data":{"tag":"[REDACTED]","safe":"keep"}}' as const

const SERIALISED_NULL_INTERMEDIATE_KEY_CANARY =
  '{"user":null}' as const

const SERIALISED_SINGLE_SEGMENT_ABSENT_KEY_CANARY =
  '{"safe":"keep"}' as const

const SERIALISED_PARENT_AND_CHILD_PATHS_CANARY =
  '{"user":"[REDACTED]"}' as const

// ── Corpus ───────────────────────────────────────────────────────────────────

const determineFunctionCensorOutput = (
  _value: unknown,
  ctx: FunctionCensorContext,
): string => {
  return `[FN:${(ctx.matchedPath as ReadonlyArray<string | number>).join('.')}]`
}

// AC coverage map — Story 7.2 requires the following cases to be represented in this corpus:
//   AC-1a  single-segment path (root-level key)           → 'single-segment-path' + 'single-segment-absent-key' (absent variant)
//   AC-1b  two-segment path (one level of nesting)        → 'single-exact-path'
//   AC-1c  three-or-more-segment path (deep nesting)      → 'deep-nested-path'
//   AC-1d  common prefix paths                            → 'common-prefix-paths'
//   AC-1e  no common prefix paths                         → 'multiple-exact-paths'
//   AC-1f  absent terminal key                            → 'exact-path-absent-key'
//   AC-1g  absent intermediate key                        → 'absent-intermediate-key' + 'null-intermediate-key'
//   AC-1h  null / number / boolean / empty-string values  → 'exact-path-primitive-leaf-values' (null/number/boolean) + 'exact-path-empty-string-value'
//   AC-1i  nested object terminal (wholesale redact)      → 'exact-path-retain-structure' (retainStructure: true) + 'nested-object-terminal' (default wholesale)
//   AC-1j  array terminal value (wholesale redact)        → 'array-terminal-value'
//   AC-1k  same terminal key under different parents      → 'same-terminal-key-different-parents'

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
    exactPathEligibilityReason: 'three exact static absolute paths; leaf values are non-string primitives, so the value-type allowlist is widened to make them eligible (Story 9.1)',
    options: { paths: ['data.count', 'data.active', 'data.extra'], types: ['number', 'boolean', 'object'] },
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
  {
    name: 'single-segment-path',
    title: 'single-segment path — root-level key (password)',
    exactPathEligibilityReason: 'one exact static absolute path with a single segment targeting a root-level key',
    options: { paths: ['password'] },
    createPayload: () => ({ password: 'secret', safe: 'keep' }),
    expectedStructured: { password: '[REDACTED]', safe: 'keep' },
    expectedSerialised: SERIALISED_SINGLE_SEGMENT_PATH_CANARY,
  },
  {
    name: 'single-segment-absent-key',
    title: 'single-segment path where the root-level terminal key is absent from the payload',
    exactPathEligibilityReason: 'one exact static absolute path with a single segment; the targeted key is not present in the payload',
    options: { paths: ['missing'] },
    createPayload: () => ({ safe: 'keep' }),
    expectedStructured: { safe: 'keep' },
    expectedSerialised: SERIALISED_SINGLE_SEGMENT_ABSENT_KEY_CANARY,
  },
  {
    name: 'deep-nested-path',
    title: 'four-segment deep-nested path — a.b.c.secret',
    exactPathEligibilityReason: 'one exact static absolute path with four segments; the targeted key is three levels deep',
    options: { paths: ['a.b.c.secret'] },
    createPayload: () => ({ a: { b: { c: { secret: 'hidden', safe: 'keep' } } } }),
    expectedStructured: { a: { b: { c: { secret: '[REDACTED]', safe: 'keep' } } } },
    expectedSerialised: SERIALISED_DEEP_NESTED_PATH_CANARY,
  },
  {
    name: 'common-prefix-paths',
    title: 'multiple paths sharing a common prefix — user.password and user.email',
    exactPathEligibilityReason: 'two exact static absolute paths sharing the root segment; proves prefix-trie branching',
    options: { paths: ['user.password', 'user.email'] },
    createPayload: () => ({ user: { password: 'pw', email: 'user@example.com', safe: 'keep' } }),
    expectedStructured: { user: { password: '[REDACTED]', email: '[REDACTED]', safe: 'keep' } },
    expectedSerialised: SERIALISED_COMMON_PREFIX_PATHS_CANARY,
  },
  {
    name: 'absent-intermediate-key',
    title: 'exact path with absent intermediate key — user.profile.email where user.profile does not exist',
    exactPathEligibilityReason: 'one exact static absolute path; the intermediate segment is absent from the payload so traversal terminates early',
    options: { paths: ['user.profile.email'] },
    createPayload: () => ({ user: { name: 'alice' } }),
    expectedStructured: { user: { name: 'alice' } },
    expectedSerialised: SERIALISED_ABSENT_INTERMEDIATE_KEY_CANARY,
  },
  {
    name: 'null-intermediate-key',
    title: 'exact path with null at intermediate position — user is null so user.profile.email is unreachable',
    exactPathEligibilityReason: 'one exact static absolute path; the intermediate segment resolves to null so trie traversal terminates early',
    options: { paths: ['user.profile.email'] },
    createPayload: () => ({ user: null }),
    expectedStructured: { user: null },
    expectedSerialised: SERIALISED_NULL_INTERMEDIATE_KEY_CANARY,
  },
  {
    name: 'array-terminal-value',
    title: 'exact path targeting an array terminal value — user.items',
    exactPathEligibilityReason: 'one exact static absolute path; the terminal value is an array, censored wholesale once the allowlist makes object types eligible (Story 9.1)',
    options: { paths: ['user.items'], types: ['string', 'object'] },
    createPayload: () => ({ user: { items: [1, 2, 3], name: 'alice' } }),
    expectedStructured: { user: { items: '[REDACTED]', name: 'alice' } },
    expectedSerialised: SERIALISED_ARRAY_TERMINAL_VALUE_CANARY,
  },
  {
    name: 'same-terminal-key-different-parents',
    title: 'two paths pointing to the same terminal key name under different parent paths — a.secret and b.secret',
    exactPathEligibilityReason: 'two exact static absolute paths sharing only the terminal key name; proves trie handles sibling branches independently',
    options: { paths: ['a.secret', 'b.secret'] },
    createPayload: () => ({ a: { secret: 'x', safe: 'keep-a' }, b: { secret: 'y', safe: 'keep-b' } }),
    expectedStructured: { a: { secret: '[REDACTED]', safe: 'keep-a' }, b: { secret: '[REDACTED]', safe: 'keep-b' } },
    expectedSerialised: SERIALISED_SAME_TERMINAL_KEY_DIFFERENT_PARENTS_CANARY,
  },
  {
    name: 'parent-and-child-paths',
    title: 'paths where one is a prefix of another — user is terminal and parent of user.password',
    exactPathEligibilityReason: 'two exact static absolute paths where one is a prefix of the other; the trie node for "user" is simultaneously terminal and parent; proves terminal rule short-circuits descendant traversal (allowlist widened to make the object terminal eligible, Story 9.1)',
    options: { paths: ['user', 'user.password'], types: ['string', 'object'] },
    createPayload: () => ({ user: { password: 'pw', name: 'alice' } }),
    expectedStructured: { user: '[REDACTED]' },
    expectedSerialised: SERIALISED_PARENT_AND_CHILD_PATHS_CANARY,
  },
  {
    name: 'nested-object-terminal',
    title: 'exact path targeting a nested object terminal — wholesale redact (no retainStructure)',
    exactPathEligibilityReason: 'one exact static absolute path; the terminal value is a nested object, censored wholesale once the allowlist makes object types eligible (Story 9.1)',
    options: { paths: ['user.address'], types: ['string', 'object'] },
    createPayload: () => ({ user: { id: 1, address: { city: 'Springfield', postalCode: '62701' } } }),
    expectedStructured: { user: { id: 1, address: '[REDACTED]' } },
    expectedSerialised: SERIALISED_NESTED_OBJECT_TERMINAL_CANARY,
  },
  {
    name: 'exact-path-empty-string-value',
    title: 'exact path targeting an empty string terminal value',
    exactPathEligibilityReason: 'one exact static absolute path; the terminal value is an empty string',
    options: { paths: ['data.tag'] },
    createPayload: () => ({ data: { tag: '', safe: 'keep' } }),
    expectedStructured: { data: { tag: '[REDACTED]', safe: 'keep' } },
    expectedSerialised: SERIALISED_EMPTY_STRING_VALUE_CANARY,
  },
  {
    name: 'shared-ancestor-copy',
    title: 'two paths under a single shared ancestor — user.password and user.email (AC 2)',
    exactPathEligibilityReason: 'two exact static absolute paths sharing the ancestor segment "user"; the shared container is shallow-copied exactly once and both redactions land on that single copy',
    options: { paths: ['user.password', 'user.email'] },
    createPayload: () => ({ user: { password: 'secret1', email: 'a@b.com', safe: 'keep' } }),
    expectedStructured: { user: { password: '[REDACTED]', email: '[REDACTED]', safe: 'keep' } },
    expectedSerialised: '{"user":{"password":"[REDACTED]","email":"[REDACTED]","safe":"keep"}}',
  },
]

// ── Wildcard equivalence corpus (Story 8.4) ──────────────────────────────────
// Single-level `*` configs that select the rule-driven engine (pathDrivenOnly === true) and avoid
// delegation. Each pins both structured and serialised goldens; the consuming test additionally
// asserts path-driven output === generic output for the binding equivalence contract. CANARY
// serialised strings catch property-order regressions before the corpus runs.

const SERIALISED_WILDCARD_TERMINAL_MULTI_KEY_CANARY =
  '{"users":{"email":"[REDACTED]","name":"n"},"accounts":{"email":"[REDACTED]"},"other":5}' as const

const SERIALISED_WILDCARD_OVER_ARRAY_CANARY =
  '{"list":[{"secret":"[REDACTED]","keep":1},{"secret":"[REDACTED]"},7]}' as const

const SERIALISED_WILDCARD_MID_PATH_CANARY =
  '{"a":{"x":{"b":"[REDACTED]","c":2},"y":{"b":"[REDACTED]"}}}' as const

const SERIALISED_WILDCARD_PRECEDENCE_OVERLAP_CANARY =
  '{"a":{"b":"[EXACT-B]","c":"[WILD]","d":"[WILD]"}}' as const

const SERIALISED_WILDCARD_RETAIN_STRUCTURE_CANARY =
  '{"u1":{"profile":{"s":"[REDACTED]","t":"[REDACTED]"}},"u2":{"profile":{"s":"[REDACTED]"}}}' as const

const SERIALISED_WILDCARD_SHARED_ANCESTOR_CANARY =
  '{"data":{"token":"[REDACTED]","users":{"email":"[REDACTED]"},"admins":{"email":"[REDACTED]"}}}' as const

const SERIALISED_WILDCARD_ARRAY_REMOVE_COMPACTION_CANARY =
  '{"list":["[WILD]","[WILD]"]}' as const

const SERIALISED_WILDCARD_FUNCTION_CENSOR_CANARY =
  '{"users":{"email":"[FN:users.email]"},"accounts":{"email":"[FN:accounts.email]"}}' as const

const SERIALISED_WILDCARD_NON_CONFIGURED_DATE_SIBLING_CANARY =
  '{"u":{"email":"[REDACTED]","when":"2020-01-01T00:00:00.000Z"}}' as const

export const wildcardEquivalenceCorpus: readonly ExactPathEquivalenceCorpusEntry[] = [
  {
    name: 'wildcard-terminal-multi-key',
    title: 'wildcard terminal matching several object keys — *.email',
    exactPathEligibilityReason: 'single `*` segment then an exact terminal; matches email under every root key',
    options: { paths: ['*.email'] },
    createPayload: () => ({ users: { email: 'a', name: 'n' }, accounts: { email: 'b' }, other: 5 }),
    expectedStructured: { users: { email: '[REDACTED]', name: 'n' }, accounts: { email: '[REDACTED]' }, other: 5 },
    expectedSerialised: SERIALISED_WILDCARD_TERMINAL_MULTI_KEY_CANARY,
  },
  {
    name: 'wildcard-over-array',
    title: 'wildcard over an array — list.*.secret',
    exactPathEligibilityReason: 'exact `list`, then a `*` over array indices, then exact `secret`; array holes/non-objects skipped',
    options: { paths: ['list.*.secret'] },
    createPayload: () => ({ list: [{ secret: 's1', keep: 1 }, { secret: 's2' }, 7] }),
    expectedStructured: { list: [{ secret: '[REDACTED]', keep: 1 }, { secret: '[REDACTED]' }, 7] },
    expectedSerialised: SERIALISED_WILDCARD_OVER_ARRAY_CANARY,
  },
  {
    name: 'wildcard-mid-path',
    title: 'mid-path wildcard — a.*.b',
    exactPathEligibilityReason: 'exact `a`, then a `*`, then exact `b`; exact segments before and after the wildcard',
    options: { paths: ['a.*.b'] },
    createPayload: () => ({ a: { x: { b: 'b1', c: 2 }, y: { b: 'b2' } } }),
    expectedStructured: { a: { x: { b: '[REDACTED]', c: 2 }, y: { b: '[REDACTED]' } } },
    expectedSerialised: SERIALISED_WILDCARD_MID_PATH_CANARY,
  },
  {
    name: 'wildcard-precedence-overlap',
    title: 'exact path wins over wildcard at a shared level — a.b and a.* (AC 4)',
    exactPathEligibilityReason: 'exact `a.b` and wildcard `a.*` both target key b; the exact rule wins and the wildcard does not re-touch b',
    options: {
      paths: [
        { path: 'a.b', censor: '[EXACT-B]' },
        { path: 'a.*', censor: '[WILD]' },
      ],
    },
    createPayload: () => ({ a: { b: 'B', c: 'C', d: 'D' } }),
    expectedStructured: { a: { b: '[EXACT-B]', c: '[WILD]', d: '[WILD]' } },
    expectedSerialised: SERIALISED_WILDCARD_PRECEDENCE_OVERLAP_CANARY,
  },
  {
    name: 'wildcard-retain-structure',
    title: 'wildcard terminal with retainStructure — *.profile',
    exactPathEligibilityReason: 'single `*` then exact `profile` with retainStructure: true; descendant leaves redacted under the default policy',
    options: { paths: [{ path: '*.profile', retainStructure: true }] },
    createPayload: () => ({ u1: { profile: { s: 's1', t: 's2' } }, u2: { profile: { s: 's3' } } }),
    expectedStructured: { u1: { profile: { s: '[REDACTED]', t: '[REDACTED]' } }, u2: { profile: { s: '[REDACTED]' } } },
    expectedSerialised: SERIALISED_WILDCARD_RETAIN_STRUCTURE_CANARY,
  },
  {
    name: 'wildcard-shared-ancestor',
    title: 'wildcard and exact rule sharing an ancestor copied once — data.token and data.*.email (AC 5)',
    exactPathEligibilityReason: 'exact `data.token` and wildcard `data.*.email` share the ancestor `data`; one shallow copy carries both redactions',
    options: { paths: ['data.token', 'data.*.email'] },
    createPayload: () => ({ data: { token: 'T', users: { email: 'e1' }, admins: { email: 'e2' } } }),
    expectedStructured: { data: { token: '[REDACTED]', users: { email: '[REDACTED]' }, admins: { email: '[REDACTED]' } } },
    expectedSerialised: SERIALISED_WILDCARD_SHARED_ANCESTOR_CANARY,
  },
  {
    name: 'wildcard-array-remove-compaction',
    title: 'exact remove + wildcard censor feed one removedIndices compaction — list.0 remove, list.* censor (AC 5)',
    exactPathEligibilityReason: 'exact `list.0` removal and wildcard `list.*` censor land on one array copy; the removed index compacts after the wildcard pass',
    options: {
      paths: [
        { path: 'list.0', remove: true },
        { path: 'list.*', censor: '[WILD]' },
      ],
    },
    createPayload: () => ({ list: ['a', 'b', 'c'] }),
    expectedStructured: { list: ['[WILD]', '[WILD]'] },
    expectedSerialised: SERIALISED_WILDCARD_ARRAY_REMOVE_COMPACTION_CANARY,
  },
  {
    name: 'wildcard-function-censor',
    title: 'wildcard terminal with a function censor reporting the concrete matched path — *.email (AC 3)',
    exactPathEligibilityReason: 'single `*` then exact `email` with a function censor; the censor receives the concrete matched key path, not the wildcard signature',
    options: { paths: [{ path: '*.email', censor: determineFunctionCensorOutput }] },
    createPayload: () => ({ users: { email: 'a' }, accounts: { email: 'b' } }),
    expectedStructured: { users: { email: '[FN:users.email]' }, accounts: { email: '[FN:accounts.email]' } },
    expectedSerialised: SERIALISED_WILDCARD_FUNCTION_CENSOR_CANARY,
  },
  {
    name: 'wildcard-non-configured-date-sibling',
    title: 'non-configured Date sibling under a wildcard config left raw — *.email',
    exactPathEligibilityReason: 'single `*` then exact `email`; the sibling `when` is never visited, so the live Date is carried over by reference',
    options: { paths: ['*.email'] },
    createPayload: () => ({ u: { email: 'e', when: new Date('2020-01-01T00:00:00.000Z') } }),
    expectedStructured: { u: { email: '[REDACTED]', when: new Date('2020-01-01T00:00:00.000Z') } },
    expectedSerialised: SERIALISED_WILDCARD_NON_CONFIGURED_DATE_SIBLING_CANARY,
  },
]

// ── Delegation proof corpus ───────────────────────────────────────────────────

export interface DelegationProofEntry {
  readonly name: string;
  readonly title: string;
  readonly unsafeReason: string;
  readonly options: DeepRedactOptions;
  readonly createPayload: () => unknown;
}

export const delegationProofCorpus: readonly DelegationProofEntry[] = [
  {
    name: 'delegate-date',
    title: 'delegates payload containing a Date',
    unsafeReason: 'Date is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, meta: { created: new Date('2020-01-01T00:00:00.000Z') } }),
  },
  {
    name: 'delegate-map',
    title: 'delegates payload containing a Map',
    unsafeReason: 'Map is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, lookup: new Map([['k', 'v']]) }),
  },
  {
    name: 'delegate-bigint',
    title: 'delegates payload containing a BigInt',
    unsafeReason: 'BigInt is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, count: 10n }),
  },
  {
    name: 'delegate-error',
    title: 'delegates payload containing an Error',
    unsafeReason: 'Error is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, failure: new Error('boom') }),
  },
  {
    name: 'delegate-set',
    title: 'delegates payload containing a Set',
    unsafeReason: 'Set is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, tags: new Set(['a', 'b']) }),
  },
  {
    name: 'delegate-regexp',
    title: 'delegates payload containing a RegExp',
    unsafeReason: 'RegExp is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, pattern: /secret/i }),
  },
  {
    name: 'delegate-url',
    title: 'delegates payload containing a URL',
    unsafeReason: 'URL is a supported-transformable runtime value',
    options: { paths: ['user.password'] },
    createPayload: () => ({ user: { password: 'pw' }, endpoint: new URL('https://example.com') }),
  },
]
