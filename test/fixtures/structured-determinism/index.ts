import { expect, vi } from 'vitest'
import {
  deepRedact,
  type FunctionCensorContext,
} from '../../../src/index.js'

export interface StructuredDeterminismRun<Result = unknown> {
  readonly assertExpected?: (result: Result) => void
  readonly payload: unknown
  readonly expected: Result
  readonly originalPayload?: unknown
  readonly assertResult?: (result: Result) => void
  readonly snapshot?: () => unknown
}

export interface StructuredDeterminismWarmUp<Snapshot = unknown> {
  readonly payload: unknown
  readonly snapshot: () => Snapshot
  readonly assertRun?: (
    run: StructuredDeterminismRun,
    warmUpSnapshot: Snapshot,
    runSnapshot: unknown,
  ) => void
}

export interface StructuredDeterminismFixture<Result = unknown> {
  readonly name: string
  readonly title: string
  readonly createRun: () => StructuredDeterminismRun<Result>
  readonly createWarmUp?: () => StructuredDeterminismWarmUp
}

export interface StructuredDeterminismFixtureSet {
  readonly name: string
  readonly title: string
  readonly createRedactor: () => (value: unknown) => unknown
  readonly fixtures: readonly StructuredDeterminismFixture[]
}

const createCircularMarker = (
  path: string,
  value = '',
) => ({
  _transformer: 'circular',
  path,
  value,
})

const assertPayloadUnchanged = (
  payload: unknown,
  originalPayload: unknown,
) => {
  expect(payload).toStrictEqual(originalPayload)
}

const createPathSensitiveCensor = (
  _value: unknown,
  context: FunctionCensorContext,
) => String(context.matchedPath.join('.'))

const createSharedTokenFixture = <TPayload extends Record<string, unknown>>(
  buildPayload: (shared: Record<string, unknown>) => TPayload,
  options: {
    readonly safe?: string
    readonly token?: string
  } = {},
): {
  readonly payload: TPayload
  readonly getTokenReads: () => number
} => {
  let tokenReads = 0
  const shared: Record<string, unknown> = {
    safe: options.safe ?? 'visible',
  }

  Object.defineProperty(shared, 'token', {
    configurable: true,
    enumerable: true,
    get() {
      tokenReads += 1
      return options.token ?? 'secret'
    },
  })

  return {
    getTokenReads: () => tokenReads,
    payload: buildPayload(shared),
  }
}

const createPrecedenceKeyCensor = () => vi.fn((_value: unknown, context: FunctionCensorContext) => {
  const firstRuleSegment = context.rulePath[0]

  return firstRuleSegment instanceof RegExp ? '[REGEX-KEY]' : '[EXACT-KEY]'
})

const replaceTokenSubstring = (
  value: string,
  pattern: RegExp,
) => value.replace(pattern, 'token=[SUBSTRING]')

const createPrecedenceSubstringReplacer = () => vi.fn(replaceTokenSubstring)

const createPrecedencePayload = (
  options: {
    readonly exactToken?: string
    readonly keyToken?: string
    readonly regexToken?: string
    readonly structuredToken?: string
    readonly substringNote?: string
  } = {},
) => ({
  records: {
    exact: { token: options.exactToken ?? 'token=exact' },
    structured: { token: options.structuredToken ?? 'token=structured' },
    key: { token: options.keyToken ?? 'token=key' },
    regex: { sessionToken: options.regexToken ?? 'token=regex' },
    substring: { note: options.substringNote ?? 'token=substring' },
  },
})

const createPrecedenceExpectedResult = (
  options: {
    readonly substringNote?: string
  } = {},
) => ({
  records: {
    exact: { token: '[EXACT-PATH]' },
    structured: { token: '[STRUCTURED-PATH]' },
    key: { token: '[EXACT-KEY]' },
    regex: { sessionToken: '[REGEX-KEY]' },
    substring: { note: replaceTokenSubstring(options.substringNote ?? 'token=substring', /token=[^&\s]+/) },
  },
})

const createPrecedenceRedactor = () => {
  const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
  const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
  const keyCensor = createPrecedenceKeyCensor()
  const substringReplacer = createPrecedenceSubstringReplacer()

  return deepRedact({
    serialise: false,
    censor: keyCensor,
    keys: ['token', /token$/i],
    paths: [
      {
        path: 'records.exact.token',
        censor: exactPathCensor,
      },
      {
        path: ['records', /^structured$/, 'token'],
        censor: structuredPathCensor,
      },
    ],
    stringTests: [
      {
        pattern: /token=[^&\s]+/,
        replacer: substringReplacer,
      },
    ],
  })
}

const createPrecedenceFixture = (
  name: string,
  title: string,
  options: Parameters<typeof createPrecedencePayload>[0] = {},
): StructuredDeterminismFixture => ({
  createRun: () => {
    const payload = createPrecedencePayload(options)
    const originalPayload = structuredClone(payload)

    return {
      assertResult: (result) => {
        expect(result).not.toBe(payload)
        assertPayloadUnchanged(payload, originalPayload)
      },
      expected: createPrecedenceExpectedResult({
        substringNote: options.substringNote,
      }),
      originalPayload,
      payload,
    }
  },
  name,
  title,
})

const createCanonicalMixedPayloadKeyCensor = () => vi.fn((_value: unknown, context: FunctionCensorContext) => {
  const firstRuleSegment = context.rulePath[0]

  return firstRuleSegment instanceof RegExp ? '[REGEX-KEY]' : '[EXACT-KEY]'
})

const createCanonicalMixedPayloadSubstringReplacer = () => vi.fn(replaceTokenSubstring)

export const createCanonicalMixedPayload = (
  options: {
    readonly batchOneKeep?: string
    readonly freeText?: string
    readonly metadataPublic?: string
    readonly objectInArraySubstring?: string
    readonly regexSessionToken?: string
    readonly sessionNote?: string
  } = {},
) => ({
  identity: {
    exact: {
      password: 'token=exact-path',
      safeNumber: 42,
      safeBoolean: false,
      safeNull: null,
      safeUndefined: undefined,
    },
    retained: {
      directSecret: 'token=retained-exact-key',
      sessionToken: 'token=retained-regex-key',
      note: 'token=retained-substring',
      override: 'token=retained-override',
      nestedArray: [
        'token=retained-array-item',
        {
          sessionToken: 'token=retained-object-in-array',
          publicNote: 'token=retained-public-note',
        },
      ],
    },
    batches: [
      {
        note: 'token=dynamic-zero',
        keep: 'visible batch zero',
        flag: true,
      },
      {
        note: 'token=dynamic-one',
        keep: options.batchOneKeep ?? 'visible batch one',
        count: 2,
        safeUndefined: undefined,
      },
    ],
    freeText: options.freeText ?? 'token=free-text',
    safeRootBoolean: true,
  },
  sessions: [
    {
      directSecret: 'token=exact-key-array',
      sessionToken: options.regexSessionToken ?? 'token=regex-key-array',
      note: options.sessionNote ?? 'visible session note',
      flags: [true, null, undefined],
    },
    {
      eventList: [
        'visible event',
        {
          note: options.objectInArraySubstring ?? 'token=substring-object-in-array',
          safeNumber: 9,
        },
      ],
      safeNull: null,
    },
  ],
  metadata: {
    public: options.metadataPublic ?? 'visible metadata',
    nullable: null,
    safeUndefined: undefined,
  },
})

export const createCanonicalMixedPayloadExpectedResult = (
  options: {
    readonly batchOneKeep?: string
    readonly metadataPublic?: string
    readonly objectInArraySubstring?: string
    readonly regexSessionToken?: string
    readonly sessionNote?: string
  } = {},
) => ({
  identity: {
    exact: {
      password: '[EXACT-PATH]',
      safeNumber: 42,
      safeBoolean: false,
      safeNull: null,
      safeUndefined: undefined,
    },
    retained: {
      directSecret: '[INHERITED-PATH]',
      sessionToken: '[INHERITED-PATH]',
      note: '[INHERITED-PATH]',
      override: '[EXACT-PATH]',
      nestedArray: [
        '[INHERITED-PATH]',
        {
          sessionToken: '[INHERITED-PATH]',
          publicNote: '[INHERITED-PATH]',
        },
      ],
    },
    batches: [
      {
        note: '[DYNAMIC-PATH]',
        keep: 'visible batch zero',
        flag: true,
      },
      {
        note: '[DYNAMIC-PATH]',
        keep: options.batchOneKeep ?? 'visible batch one',
        count: 2,
        safeUndefined: undefined,
      },
    ],
    freeText: 'token=[SUBSTRING]',
    safeRootBoolean: true,
  },
  sessions: [
    {
      directSecret: '[EXACT-KEY]',
      sessionToken: '[REGEX-KEY]',
      note: options.sessionNote ?? 'visible session note',
      flags: [true, null, undefined],
    },
    {
      eventList: [
        'visible event',
        {
          note: replaceTokenSubstring(options.objectInArraySubstring ?? 'token=substring-object-in-array', /token=[^&\s]+/),
          safeNumber: 9,
        },
      ],
      safeNull: null,
    },
  ],
  metadata: {
    public: options.metadataPublic ?? 'visible metadata',
    nullable: null,
    safeUndefined: undefined,
  },
})

export const createCanonicalMixedPayloadRedactor = (
  keyCensor = createCanonicalMixedPayloadKeyCensor(),
  substringReplacer = createCanonicalMixedPayloadSubstringReplacer(),
) => ({
  keyCensor,
  redact: deepRedact({
    serialise: false,
    censor: keyCensor,
    keys: ['directSecret', /token$/i],
    paths: [
      {
        path: 'identity.exact.password',
        censor: '[EXACT-PATH]',
      },
      {
        path: 'identity.retained',
        censor: '[INHERITED-PATH]',
        retainStructure: true,
      },
      {
        path: 'identity.retained.override',
        censor: '[EXACT-PATH]',
      },
      {
        path: 'identity.batches.*.note',
        censor: '[DYNAMIC-PATH]',
      },
    ],
    stringTests: [
      {
        pattern: /token=[^&\s]+/,
        replacer: substringReplacer,
      },
    ],
  }),
  substringReplacer,
})

const createCanonicalMixedPayloadFixture = (
  name: string,
  title: string,
  options: Parameters<typeof createCanonicalMixedPayload>[0] = {},
): StructuredDeterminismFixture => ({
  createRun: () => {
    const payload = createCanonicalMixedPayload(options)
    const originalPayload = structuredClone(payload)

    return {
      assertResult: (result) => {
        expect(result).not.toBe(payload)
        assertPayloadUnchanged(payload, originalPayload)
      },
      expected: createCanonicalMixedPayloadExpectedResult(options),
      originalPayload,
      payload,
    }
  },
  name,
  title,
})

const createSameContextAliasFixture = () => createSharedTokenFixture((shared) => ({
  left: { shared },
  right: { shared },
}))

const createDifferentContextAliasFixture = () => createSharedTokenFixture((shared) => ({
  exact: { shared },
  regex: { sessionShared: shared },
}))

const createMatchedAfterUnmatchedAliasFixture = () => createSharedTokenFixture((shared) => ({
  plain: { item: shared },
  sensitive: { password: shared },
}))

const createMatchedAfterUnmatchedAliasVariantFixture = () => createSharedTokenFixture((shared) => ({
  plain: { item: shared },
  sensitive: { password: shared },
}), {
  safe: 'visible variant',
  token: 'secret variant',
})

const createMatchedAfterUnmatchedWarmUpPayload = (payload: Record<string, unknown>) => ({
  plain: (payload as { plain: unknown }).plain,
})

const createCyclicAliasFixture = (): Record<string, unknown> => {
  const shared: Record<string, unknown> = {
    safe: 'visible',
  }

  shared.self = shared

  return {
    left: shared,
    right: shared,
  }
}

const createRepeatedInvocationFixture = (): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    records: [{
      safe: 'visible',
      token: 'secret',
    }],
  }
  const records = payload.records as Array<Record<string, unknown>>

  records[0]!.parent = records

  return payload
}

const createAliasReplayFixture = (
  name: string,
  title: string,
  createFixture: () => {
    readonly payload: Record<string, unknown>
    readonly getTokenReads: () => number
  },
  expected: Record<string, unknown>,
  createWarmUpPayload: ((payload: Record<string, unknown>) => unknown) | undefined,
  assertIdentity: (result: Record<string, unknown>) => void,
  assertExpected?: (
    result: Record<string, unknown>,
    payload: Record<string, unknown>,
  ) => void,
): StructuredDeterminismFixture => {
  return {
    createRun: () => {
      const fixture = createFixture()

      return {
        assertExpected: assertExpected === undefined
          ? undefined
          : (result) => assertExpected(result as Record<string, unknown>, fixture.payload),
        assertResult: (result) => {
          assertIdentity(result as Record<string, unknown>)
        },
        expected,
        payload: fixture.payload,
        snapshot: fixture.getTokenReads,
      }
    },
    createWarmUp: createWarmUpPayload === undefined
      ? undefined
      : () => {
        const warmUpFixture = createFixture()

        return {
          assertRun: (_run, warmUpSnapshot, runSnapshot) => {
            expect(runSnapshot).toBe(warmUpSnapshot)
          },
          payload: createWarmUpPayload(warmUpFixture.payload),
          snapshot: warmUpFixture.getTokenReads,
        }
      },
    name,
    title,
  }
}

const sameContextAliasFixture = createAliasReplayFixture(
  'alias-same-context',
  'same-context alias replay',
  createSameContextAliasFixture,
  {
    left: {
      shared: {
        safe: 'left.shared.safe',
        token: 'left.shared.token',
      },
    },
    right: {
      shared: {
        safe: 'right.shared.safe',
        token: 'right.shared.token',
      },
    },
  },
  (payload) => ({
    left: (payload as { left: unknown }).left,
  }),
  (result) => {
    const typedResult = result as {
      left: { shared: Record<string, unknown> }
      right: { shared: Record<string, unknown> }
    }

    expect(typedResult.left.shared).not.toBe(typedResult.right.shared)
  },
)

const differentContextAliasFixture = createAliasReplayFixture(
  'alias-different-context',
  'different-context alias replay',
  createDifferentContextAliasFixture,
  {
    exact: {
      shared: {
        safe: 'exact.shared.safe',
        token: 'exact.shared.token',
      },
    },
    regex: {
      sessionShared: {
        safe: 'regex.sessionShared.safe',
        token: 'regex.sessionShared.token',
      },
    },
  },
  (payload) => ({
    exact: (payload as { exact: unknown }).exact,
  }),
  (result) => {
    const typedResult = result as {
      exact: { shared: Record<string, unknown> }
      regex: { sessionShared: Record<string, unknown> }
    }

    expect(typedResult.exact.shared).not.toBe(typedResult.regex.sessionShared)
  },
)

const matchedAfterUnmatchedAliasFixture = createAliasReplayFixture(
  'matched-after-unmatched',
  'later matched retained revisit after earlier unmatched visit',
  createMatchedAfterUnmatchedAliasFixture,
  {
    plain: {
      item: {
        safe: 'visible',
        token: 'secret',
      },
    },
    sensitive: {
      password: {
        safe: 'sensitive.password.safe',
        token: 'sensitive.password.token',
      },
    },
  },
  createMatchedAfterUnmatchedWarmUpPayload,
  (result) => {
    const typedResult = result as {
      plain: { item: Record<string, unknown> }
      sensitive: { password: Record<string, unknown> }
    }

    expect(typedResult.plain.item).not.toBe(typedResult.sensitive.password)
  },
  (result, payload) => {
    const typedResult = result as {
      plain: { item: Record<string, unknown> }
      sensitive: { password: Record<string, unknown> }
    }
    const typedPayload = payload as {
      plain: { item: Record<string, unknown> }
    }

    expect(typedResult.plain.item).toBe(typedPayload.plain.item)
    expect(typedResult.plain.item.safe).toBe('visible')
    expect(typedResult.sensitive.password).toEqual({
      safe: 'sensitive.password.safe',
      token: 'sensitive.password.token',
    })
  },
)

const matchedAfterUnmatchedAliasVariantFixture = createAliasReplayFixture(
  'matched-after-unmatched-variant',
  'later matched retained revisit variant after earlier unmatched visit',
  createMatchedAfterUnmatchedAliasVariantFixture,
  {
    plain: {
      item: {
        safe: 'visible variant',
        token: 'secret variant',
      },
    },
    sensitive: {
      password: {
        safe: 'sensitive.password.safe',
        token: 'sensitive.password.token',
      },
    },
  },
  createMatchedAfterUnmatchedWarmUpPayload,
  (result) => {
    const typedResult = result as {
      plain: { item: Record<string, unknown> }
      sensitive: { password: Record<string, unknown> }
    }

    expect(typedResult.plain.item).not.toBe(typedResult.sensitive.password)
  },
  (result, payload) => {
    const typedResult = result as {
      plain: { item: Record<string, unknown> }
      sensitive: { password: Record<string, unknown> }
    }
    const typedPayload = payload as {
      plain: { item: Record<string, unknown> }
    }

    expect(typedResult.plain.item).toBe(typedPayload.plain.item)
    expect(typedResult.plain.item.safe).toBe('visible variant')
    expect(typedResult.sensitive.password).toEqual({
      safe: 'sensitive.password.safe',
      token: 'sensitive.password.token',
    })
  },
)

const cyclicAliasReplayFixture: StructuredDeterminismFixture = {
  createRun: () => ({
    expected: {
      left: {
        safe: 'visible',
        self: createCircularMarker('left.self', 'left'),
      },
      right: {
        safe: 'visible',
        self: createCircularMarker('right.self', 'right'),
      },
    },
    payload: createCyclicAliasFixture(),
  }),
  name: 'cyclic-alias-replay',
  title: 'cyclic alias replay with branch-local circular markers',
}

const repeatedInvocationFixture: StructuredDeterminismFixture = {
  createRun: () => {
    const payload = createRepeatedInvocationFixture()
    const records = payload.records as Array<Record<string, unknown>>

    return {
      assertResult: (result) => {
        expect(result).not.toBe(payload)
        expect(records[0]!.token).toBe('secret')
        expect(records[0]!.parent).toBe(records)
      },
      expected: {
        records: [{
          parent: createCircularMarker('records.0.parent', 'records'),
          safe: 'visible',
          token: '[REDACTED]',
        }],
      },
      payload,
    }
  },
  name: 'repeated-invocations',
  title: 'repeated invocations with equivalent fresh cyclic fixtures',
}

export const structuredDeterminismFixtureSets: readonly StructuredDeterminismFixtureSet[] = [
  {
    createRedactor: createPrecedenceRedactor,
    fixtures: [
      createPrecedenceFixture(
        'overlapping-rule-baseline',
        'overlapping-rule payload baseline',
      ),
      createPrecedenceFixture(
        'overlapping-rule-variant',
        'overlapping-rule payload variant',
        {
          exactToken: 'token=exact-second',
          keyToken: 'token=key-second',
          regexToken: 'token=regex-second',
          structuredToken: 'token=structured-second',
          substringNote: 'prefix token=substring-second suffix',
        },
      ),
    ],
    name: 'overlapping-rules',
    title: 'overlapping rules',
  },
  {
    createRedactor: () => createCanonicalMixedPayloadRedactor().redact,
    fixtures: [
      createCanonicalMixedPayloadFixture(
        'canonical-mixed-payload-baseline',
        'canonical mixed payload baseline',
      ),
      createCanonicalMixedPayloadFixture(
        'canonical-mixed-payload-variant',
        'canonical mixed payload variant',
        {
          batchOneKeep: 'visible batch one second call',
          freeText: 'token=free-text-second',
          metadataPublic: 'visible metadata second call',
          objectInArraySubstring: 'token=substring-object-in-array-second',
          regexSessionToken: 'token=regex-key-array-second',
          sessionNote: 'visible session note second call',
        },
      ),
    ],
    name: 'canonical-mixed-payload',
    title: 'canonical mixed payload',
  },
  {
    createRedactor: () => deepRedact({
      serialise: false,
      censor: createPathSensitiveCensor,
      keys: ['shared', /Shared$/],
      retainStructure: true,
    }),
    fixtures: [
      sameContextAliasFixture,
      differentContextAliasFixture,
    ],
    name: 'alias-replays',
    title: 'alias replays',
  },
  {
    createRedactor: () => deepRedact({
      serialise: false,
      censor: createPathSensitiveCensor,
      keys: ['password'],
      retainStructure: true,
    }),
    fixtures: [
      matchedAfterUnmatchedAliasFixture,
      matchedAfterUnmatchedAliasVariantFixture,
    ],
    name: 'retained-revisits',
    title: 'retained revisits',
  },
  {
    createRedactor: () => deepRedact({
      keys: ['token'],
      serialise: false,
    }),
    fixtures: [
      cyclicAliasReplayFixture,
      repeatedInvocationFixture,
    ],
    name: 'cyclic-revisits',
    title: 'cyclic revisits',
  },
] as const
