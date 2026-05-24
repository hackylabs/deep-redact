import { expect, vi } from 'vitest'
import {
  deepRedact,
  type FunctionCensorContext,
  type SerialiseOption,
} from '../../../src/index.js'

export interface StructuredDeterminismRun<Result = unknown> {
  readonly assertExpected?: (result: unknown) => void;
  readonly payload: unknown;
  readonly expected: Result;
  readonly originalPayload?: unknown;
  readonly assertResult?: (result: unknown) => void;
  readonly serialisedExpected?: string;
  readonly snapshot?: () => unknown;
}

export interface StructuredDeterminismWarmUp<Snapshot = unknown> {
  readonly payload: unknown;
  readonly snapshot: () => Snapshot;
  readonly assertRun?: (
    run: StructuredDeterminismRun,
    warmUpSnapshot: Snapshot,
    runSnapshot: unknown,
  ) => void;
}

export interface StructuredDeterminismFixture<Result = unknown> {
  readonly name: string;
  readonly title: string;
  readonly createRun: () => StructuredDeterminismRun<Result>;
  readonly createWarmUp?: () => StructuredDeterminismWarmUp;
}

export interface StructuredDeterminismFixtureSet {
  readonly name: string;
  readonly title: string;
  readonly createRedactor: (serialise?: SerialiseOption) => (value: unknown) => unknown;
  readonly fixtures: readonly StructuredDeterminismFixture[];
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

// Safe only for object literals with deterministic key-insertion order (i.e. authored as plain `{}`
// literals, not via Object.assign / spread / reduce). Computing serialisedExpected programmatically
// from an expected object is not circular because expected is verified independently by the
// structured-determinism corpus — but a key-order bug that somehow passes there would also produce
// matching wrong bytes here. The canary constants below commit one hardcoded golden string per fixture
// shape; if JSON key order ever regresses, the canary fails before the corpus tests even run.
const createSerialisedExpected = (value: unknown): string => JSON.stringify(value)

const SERIALISED_ROOT_STRING_REDACTION_CANARY = '"[REDACTED]"' as const
const SERIALISED_ROOT_BIGINT_CANARY = '{"_transformer":"bigint","value":{"radix":10,"number":"42"}}' as const
const SERIALISED_EDGE_CASE_BASELINE_CANARY = '{"active":{"_transformer":"bigint","value":{"radix":10,"number":"42"}},"circular":{"safe":"visible","self":{"_transformer":"circular","path":"circular.self","value":"circular"}},"failing":"[UNSUPPORTED]","getterBranch":{"safe":"visible","secret":"[UNSUPPORTED]"},"ignored":{"_transformer":"map","value":{"password":"secret"}},"notes":{"text":"[UNSUPPORTED]"},"repeat":{"first":{"safe":"visible","token":"[REDACTED]"},"second":{"safe":"visible","token":"[REDACTED]"}},"stable":{"token":"[REDACTED]"}}' as const

const buildBigIntResult = (value: bigint) => ({
  _transformer: 'bigint',
  value: {
    radix: 10,
    number: value.toString(10),
  },
})

const buildMapResult = (value: Map<string, unknown>) => ({
  _transformer: 'map',
  value: Object.fromEntries(value.entries()),
})

class FixtureRuntimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FixtureRuntimeError'
  }
}

const createFixtureError = (message: string): FixtureRuntimeError => {
  const error = new FixtureRuntimeError(message)
  error.stack = `FixtureRuntimeError: ${message}\n    at structured determinism fixture`

  return error
}

const failingMapRegistry = new WeakSet<Map<string, unknown>>()

const markFailingMap = (value: Map<string, unknown>): Map<string, unknown> => {
  failingMapRegistry.add(value)

  return value
}

const isMarkedFailingMap = (value: unknown): value is Map<string, unknown> => {
  return value instanceof Map && failingMapRegistry.has(value)
}

const createPathSensitiveCensor = (
  _value: unknown,
  context: FunctionCensorContext,
) => String(context.matchedPath.join('.'))

const createSharedTokenFixture = <TPayload extends Record<string, unknown>>(
  buildPayload: (shared: Record<string, unknown>) => TPayload,
  options: {
    readonly safe?: string;
    readonly token?: string;
  } = {},
): {
  readonly payload: TPayload;
  readonly getTokenReads: () => number;
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
    readonly exactToken?: string;
    readonly keyToken?: string;
    readonly regexToken?: string;
    readonly structuredToken?: string;
    readonly substringNote?: string;
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
    readonly substringNote?: string;
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

const createPrecedenceRedactor = (serialise: SerialiseOption = false) => {
  const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
  const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
  const keyCensor = createPrecedenceKeyCensor()
  const substringReplacer = createPrecedenceSubstringReplacer()

  return deepRedact({
    serialise,
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
    const expected = createPrecedenceExpectedResult({
      substringNote: options.substringNote,
    })

    return {
      assertResult: (result) => {
        expect(result).not.toBe(payload)
        assertPayloadUnchanged(payload, originalPayload)
      },
      expected,
      originalPayload,
      payload,
      serialisedExpected: createSerialisedExpected(expected),
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
    readonly batchOneKeep?: string;
    readonly freeText?: string;
    readonly metadataPublic?: string;
    readonly objectInArraySubstring?: string;
    readonly regexSessionToken?: string;
    readonly sessionNote?: string;
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
    readonly batchOneKeep?: string;
    readonly metadataPublic?: string;
    readonly objectInArraySubstring?: string;
    readonly regexSessionToken?: string;
    readonly sessionNote?: string;
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
  {
    keyCensor = createCanonicalMixedPayloadKeyCensor(),
    serialise = false,
    substringReplacer = createCanonicalMixedPayloadSubstringReplacer(),
  }: {
    readonly keyCensor?: ReturnType<typeof createCanonicalMixedPayloadKeyCensor>;
    readonly serialise?: SerialiseOption;
    readonly substringReplacer?: ReturnType<typeof createCanonicalMixedPayloadSubstringReplacer>;
  } = {},
) => ({
  keyCensor,
  redact: deepRedact({
    serialise,
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
    const expected = createCanonicalMixedPayloadExpectedResult(options)

    return {
      assertResult: (result) => {
        expect(result).not.toBe(payload)
        assertPayloadUnchanged(payload, originalPayload)
      },
      expected,
      originalPayload,
      payload,
      serialisedExpected: createSerialisedExpected(expected),
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
    readonly payload: Record<string, unknown>;
    readonly getTokenReads: () => number;
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
        serialisedExpected: createSerialisedExpected(expected),
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
      left: { shared: Record<string, unknown> };
      right: { shared: Record<string, unknown> };
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
      exact: { shared: Record<string, unknown> };
      regex: { sessionShared: Record<string, unknown> };
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
      plain: { item: Record<string, unknown> };
      sensitive: { password: Record<string, unknown> };
    }

    expect(typedResult.plain.item).not.toBe(typedResult.sensitive.password)
  },
  (result, payload) => {
    const typedResult = result as {
      plain: { item: Record<string, unknown> };
      sensitive: { password: Record<string, unknown> };
    }
    const typedPayload = payload as {
      plain: { item: Record<string, unknown> };
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
      plain: { item: Record<string, unknown> };
      sensitive: { password: Record<string, unknown> };
    }

    expect(typedResult.plain.item).not.toBe(typedResult.sensitive.password)
  },
  (result, payload) => {
    const typedResult = result as {
      plain: { item: Record<string, unknown> };
      sensitive: { password: Record<string, unknown> };
    }
    const typedPayload = payload as {
      plain: { item: Record<string, unknown> };
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
  createRun: () => {
    const expected = {
      left: {
        safe: 'visible',
        self: createCircularMarker('left.self', 'left'),
      },
      right: {
        safe: 'visible',
        self: createCircularMarker('right.self', 'right'),
      },
    }

    return {
      expected,
      payload: createCyclicAliasFixture(),
      serialisedExpected: createSerialisedExpected(expected),
    }
  },
  name: 'cyclic-alias-replay',
  title: 'cyclic alias replay with branch-local circular markers',
}

const repeatedInvocationFixture: StructuredDeterminismFixture = {
  createRun: () => {
    const payload = createRepeatedInvocationFixture()
    const records = payload.records as Array<Record<string, unknown>>
    const expected = {
      records: [{
        safe: 'visible',
        token: '[REDACTED]',
        parent: createCircularMarker('records.0.parent', 'records'),
      }],
    }

    return {
      assertResult: (result) => {
        expect(result).not.toBe(payload)
        expect(records[0]!.token).toBe('secret')
        expect(records[0]!.parent).toBe(records)
      },
      expected,
      payload,
      serialisedExpected: createSerialisedExpected(expected),
    }
  },
  name: 'repeated-invocations',
  title: 'repeated invocations with equivalent fresh cyclic fixtures',
}

const createSerialisedRootFixture = <TExpected>(
  name: string,
  title: string,
  payload: unknown,
  expected: TExpected,
  goldenCanary?: string,
): StructuredDeterminismFixture<TExpected> => ({
  createRun: () => {
    const serialisedExpected = createSerialisedExpected(expected)

    if (goldenCanary !== undefined) {
      expect(serialisedExpected).toBe(goldenCanary)
    }

    return {
      expected,
      payload,
      serialisedExpected,
    }
  },
  name,
  title,
})

const createSerialisationEdgePayload = (
  options: {
    readonly active?: bigint;
    readonly ignoredPassword?: string;
    readonly noteText?: string;
    readonly repeatedToken?: string;
    readonly stableToken?: string;
  } = {},
) => {
  const circularPayload: Record<string, unknown> = {
    safe: 'visible',
  }
  const getterBranch: Record<string, unknown> = {
    safe: 'visible',
  }
  const repeated = {
    safe: 'visible',
    token: options.repeatedToken ?? 'secret',
  }
  const failing = markFailingMap(new Map<string, unknown>([
    ['password', 'secret'],
  ]))
  const ignored = new Map<string, unknown>([
    ['password', options.ignoredPassword ?? 'secret'],
  ])

  circularPayload.self = circularPayload

  Object.defineProperty(getterBranch, 'secret', {
    enumerable: true,
    get() {
      throw createFixtureError('token=secret')
    },
  })

  return {
    active: options.active ?? 42n,
    circular: circularPayload,
    failing,
    getterBranch,
    ignored,
    notes: {
      text: options.noteText ?? 'prefix password=secret suffix',
    },
    repeat: {
      first: repeated,
      second: repeated,
    },
    stable: {
      token: options.stableToken ?? 'secret',
    },
  }
}

const createSerialisationEdgeExpectedResult = (
  options: {
    readonly active?: bigint;
    readonly ignoredPassword?: string;
  } = {},
) => ({
  active: buildBigIntResult(options.active ?? 42n),
  circular: {
    safe: 'visible',
    self: createCircularMarker('circular.self', 'circular'),
  },
  failing: '[UNSUPPORTED]',
  getterBranch: {
    safe: 'visible',
    secret: '[UNSUPPORTED]',
  },
  ignored: buildMapResult(new Map<string, unknown>([
    ['password', options.ignoredPassword ?? 'secret'],
  ])),
  notes: {
    text: '[UNSUPPORTED]',
  },
  repeat: {
    first: {
      safe: 'visible',
      token: '[REDACTED]',
    },
    second: {
      safe: 'visible',
      token: '[REDACTED]',
    },
  },
  stable: {
    token: '[REDACTED]',
  },
})

const createSerialisationEdgeFixture = (
  name: string,
  title: string,
  options: Parameters<typeof createSerialisationEdgePayload>[0] = {},
  goldenCanary?: string,
): StructuredDeterminismFixture => ({
  createRun: () => {
    const payload = createSerialisationEdgePayload(options)
    const expected = createSerialisationEdgeExpectedResult(options)
    const serialisedExpected = createSerialisedExpected(expected)

    if (goldenCanary !== undefined) {
      expect(serialisedExpected).toBe(goldenCanary)
    }

    return {
      expected,
      payload,
      serialisedExpected,
    }
  },
  name,
  title,
})

const createSerialisationEdgeRedactor = (
  serialise: SerialiseOption = false,
) => deepRedact({
  ignoredValueTypes: {
    Map: true,
  },
  keys: ['token'],
  serialise,
  stringTests: [
    {
      pattern: /password=[^&\s]+/g,
      replacer: () => {
        throw createFixtureError('password=secret')
      },
    },
  ],
  transformers: {
    byConstructor: {
      Map: [
        (value: unknown) => {
          if (isMarkedFailingMap(value)) {
            throw createFixtureError('token=secret')
          }

          return value
        },
      ],
    },
  },
})

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
    createRedactor: (serialise = false) => createCanonicalMixedPayloadRedactor({ serialise }).redact,
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
    createRedactor: (serialise = false) => deepRedact({
      serialise,
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
    createRedactor: (serialise = false) => deepRedact({
      serialise,
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
    createRedactor: (serialise = false) => deepRedact({
      keys: ['token'],
      serialise,
    }),
    fixtures: [
      cyclicAliasReplayFixture,
      repeatedInvocationFixture,
    ],
    name: 'cyclic-revisits',
    title: 'cyclic revisits',
  },
] as const

export const serialisedDeterminismFixtureSets: readonly StructuredDeterminismFixtureSet[] = [
  ...structuredDeterminismFixtureSets,
  {
    createRedactor: (serialise = false) => deepRedact({
      serialise,
      stringTests: [/token=[^&\s]+/],
    }),
    fixtures: [
      createSerialisedRootFixture(
        'root-string-redaction',
        'root string substring redaction',
        'token=secret',
        '[REDACTED]',
        SERIALISED_ROOT_STRING_REDACTION_CANARY,
      ),
      createSerialisedRootFixture(
        'root-string-no-match',
        'root string without a matching substring rule',
        'visible root string',
        'visible root string',
      ),
      createSerialisedRootFixture(
        'root-bigint-transformation',
        'root bigint transformation before serialisation',
        42n,
        buildBigIntResult(42n),
        SERIALISED_ROOT_BIGINT_CANARY,
      ),
      createSerialisedRootFixture(
        'root-bigint-transformation-variant',
        'root bigint transformation variant before serialisation',
        7n,
        buildBigIntResult(7n),
      ),
    ],
    name: 'serialisation-roots',
    title: 'serialisation roots',
  },
  {
    createRedactor: createSerialisationEdgeRedactor,
    fixtures: [
      createSerialisationEdgeFixture(
        'transformed-circular-ignored-unsupported-baseline',
        'transformed, circular, ignored, and unsupported baseline',
        {},
        SERIALISED_EDGE_CASE_BASELINE_CANARY,
      ),
      createSerialisationEdgeFixture(
        'transformed-circular-ignored-unsupported-variant',
        'transformed, circular, ignored, and unsupported variant',
        {
          active: 7n,
          ignoredPassword: 'hunter2',
          noteText: 'prefix password=hunter2 suffix',
          repeatedToken: 'secret second call',
          stableToken: 'secret second call',
        },
      ),
    ],
    name: 'serialisation-edge-cases',
    title: 'serialisation edge cases',
  },
] as const
