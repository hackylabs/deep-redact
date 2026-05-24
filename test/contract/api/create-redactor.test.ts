import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  createRedactor,
  deepRedact,
  type DeepRedactOptions,
  type DiagnosticEvent,
  type FunctionCensorContext,
} from '../../../src/index.js'
import { compileRedactorPlan } from '../../../src/core/compiler/compile-redactor-plan.js'
import {
  createCanonicalMixedPayload,
  createCanonicalMixedPayloadExpectedResult,
  createCanonicalMixedPayloadRedactor,
  serialisedDeterminismFixtureSets,
  structuredDeterminismFixtureSets,
  type StructuredDeterminismFixture,
  type StructuredDeterminismFixtureSet,
  type StructuredDeterminismRun,
} from '../../fixtures/structured-determinism/index.js'
import {
  createLaneForcedRedactor,
  createLaneForcedRedactorFromPlan,
  exactPathEquivalenceCorpus,
} from '../../fixtures/exact-path-equivalence/index.js'
import {
  precedenceMatrixFixtures,
  precedenceOrder,
  requiredPrecedenceEdges,
  type PrecedenceEdge,
  type PrecedenceMatrixFixture,
} from '../../fixtures/precedence-matrix/index.js'
import {
  buildGeneratedPrecedenceDocument,
  generatedFilePaths,
} from '../../../scripts/generated-files.ts'
import {
  assertNoDeniedDeclarationSurface,
  assertNoDeniedPublicNames,
  assertOneWaySerialisedOutput,
  assertOneWayStructuredOutput,
  createOneWayDenyListFixture,
  deniedPublicIntentTerms,
  oneWayDeniedOptionNames,
} from '../../fixtures/one-way-deny-list/index.js'

const buildBigInt = (value: bigint) => ({
  _transformer: 'bigint',
  value: {
    radix: 10,
    number: value.toString(10),
  },
})

const buildDate = (value: Date) => ({
  _transformer: 'date',
  datetime: value.toISOString(),
})

const buildError = (value: Error) => ({
  _transformer: 'error',
  value: {
    type: value.constructor.name,
    message: value.message,
    stack: value.stack,
  },
})

const buildMap = (value: Map<string, unknown>) => ({
  _transformer: 'map',
  value: Object.fromEntries(value.entries()),
})

const buildRegex = (value: RegExp) => ({
  _transformer: 'regex',
  value: {
    source: value.source,
    flags: value.flags,
  },
})

const buildSet = (value: Set<unknown>) => ({
  _transformer: 'set',
  value: [...value.values()],
})

const buildUrl = (value: URL) => ({
  _transformer: 'url',
  value: value.href,
})

class StoryTransformerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoryTransformerError'
  }
}

const createStoryError = (message: string): StoryTransformerError => {
  const error = new StoryTransformerError(message)
  error.stack = `StoryTransformerError: ${message}\n    at transformer story fixture`

  return error
}

const circularMarker = (path: string, value = '') => ({
  _transformer: 'circular',
  path,
  value,
})

const runStructuredDeterminismFixture = (
  redact: (value: unknown) => unknown,
  fixture: StructuredDeterminismFixture,
): {
  readonly redactionSnapshot: unknown;
  readonly result: unknown;
  readonly run: StructuredDeterminismRun;
} => {
  const run = fixture.createRun()
  const result = redact(run.payload)
  const redactionSnapshot = run.snapshot?.()

  expect(result).toStrictEqual(run.expected)

  run.assertExpected?.(result)

  run.assertResult?.(result)

  return {
    redactionSnapshot,
    result,
    run,
  }
}

const runSerialisedDeterminismFixture = (
  redact: (value: unknown) => unknown,
  fixture: StructuredDeterminismFixture,
): {
  readonly result: string;
  readonly run: StructuredDeterminismRun;
} => {
  const run = fixture.createRun()
  const result = redact(run.payload)

  expect(typeof result).toBe('string')

  if (run.serialisedExpected === undefined) {
    throw new Error(`fixture '${fixture.name}' is missing serialisedExpected — add it to the fixture's createRun return`)
  }

  if (run.originalPayload !== undefined) {
    expect(run.payload).toStrictEqual(run.originalPayload)
  }

  expect(result).toBe(run.serialisedExpected)

  return {
    result: result as string,
    run,
  }
}

const structuredDeterminismCases = structuredDeterminismFixtureSets.flatMap((fixtureSet) => {
  return fixtureSet.fixtures.map((fixture) => {
    return [
      fixtureSet.title,
      fixture.title,
      fixtureSet,
      fixture,
    ] as const satisfies readonly [
      string,
      string,
      StructuredDeterminismFixtureSet,
      StructuredDeterminismFixture,
    ]
  })
})

const structuredDeterminismWarmUpCases = structuredDeterminismCases.filter((fixtureCase) => {
  return fixtureCase[3].createWarmUp !== undefined
})

const serialisedDeterminismCases = serialisedDeterminismFixtureSets.flatMap((fixtureSet) => {
  return fixtureSet.fixtures.map((fixture) => {
    return [
      fixtureSet.title,
      fixture.title,
      fixtureSet,
      fixture,
    ] as const satisfies readonly [
      string,
      string,
      StructuredDeterminismFixtureSet,
      StructuredDeterminismFixture,
    ]
  })
})

const precedenceOutputCases = precedenceMatrixFixtures
  .filter((fixture) => fixture.outcome === 'output')
  .map((fixture) => [fixture.name, fixture] as const)

const getPrecedenceFixture = (name: string): PrecedenceMatrixFixture => {
  const fixture = precedenceMatrixFixtures.find((candidate) => candidate.name === name)

  if (fixture === undefined) {
    throw new Error(`Missing precedence matrix fixture '${name}'.`)
  }

  return fixture
}

const createTrackedPrecedenceRuntimeCase = (fixture: PrecedenceMatrixFixture) => {
  const trackedSpies = new Map<string, ReturnType<typeof vi.fn>>()
  const runtimeCase = fixture.createRuntimeCase({
    track: (label, implementation) => {
      const spy = vi.fn(implementation)
      trackedSpies.set(label, spy)

      return spy as typeof implementation
    },
  })

  return { runtimeCase, trackedSpies }
}

const expectTrackedPrecedenceCallCounts = (
  runtimeCase: ReturnType<PrecedenceMatrixFixture['createRuntimeCase']>,
  trackedSpies: ReadonlyMap<string, ReturnType<typeof vi.fn>>,
): void => {
  for (const expectedCallCount of runtimeCase.expectedCallCounts) {
    const spy = trackedSpies.get(expectedCallCount.label)

    expect(spy).toBeDefined()
    expect(spy!).toHaveBeenCalledTimes(expectedCallCount.count)
  }
}

const normalisePrecedenceDocumentationValue = (value: unknown): unknown => {
  if (typeof value === 'function') {
    return '[function]'
  }

  if (
    typeof value === 'object'
    && value !== null
    && (value as { kind?: unknown }).kind === 'function-placeholder'
  ) {
    return '[function]'
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalisePrecedenceDocumentationValue(entry))
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      return [key, normalisePrecedenceDocumentationValue(entry)]
    }))
  }

  return value
}

const publishedPrecedenceMatrixRows = precedenceOrder.flatMap((higherPrecedenceTerm, index) => {
  return precedenceOrder.slice(index + 1).map((lowerPrecedenceTerm) => {
    return {
      higher: higherPrecedenceTerm,
      lower: lowerPrecedenceTerm,
    }
  })
})

describe('Reusable redactor factory contract', () => {
  it('returns a callable redactor and defers serialisation work until invocation', () => {
    const serialise = vi.fn((value: unknown) => JSON.stringify(value))
    const redact = deepRedact({
      paths: ['user.password'],
      serialise,
    })

    expect(typeof redact).toBe('function')
    expect(serialise).not.toHaveBeenCalled()

    const payload = { user: { password: 'secret' } }
    const expectedPayload = { user: { password: '[REDACTED]' } }

    expect(redact(payload)).toBe(JSON.stringify(expectedPayload))
    expect(serialise).toHaveBeenCalledTimes(1)
    expect(serialise).toHaveBeenCalledWith(expectedPayload)
  })

  it('reuses init-time configuration across repeated payload calls', () => {
    const options = {
      paths: ['user.password'],
      serialise: false,
    }
    const redact = deepRedact(options)
    const firstPayload = { attempt: 1 }
    const secondPayload = { attempt: 2 }

    expect(redact(firstPayload)).toBe(firstPayload)

    options.serialise = true

    expect(redact(secondPayload)).toBe(secondPayload)
  })

  it('exposes createRedactor as the same public factory alias', () => {
    const payload = { ok: true }

    expect(createRedactor).toBe(deepRedact)
    expect(createRedactor({ serialise: true })(payload)).toBe(JSON.stringify(payload))
  })

  it('returns structured output unchanged when serialise is omitted', () => {
    const payload = { ok: true }
    const redact = deepRedact({
      paths: ['user.password'],
    })

    expect(redact(payload)).toBe(payload)
  })

  it.each([
    ['null config', null, /options must be an object/i],
    ['invalid keys container', { keys: 'password' }, /keys must be an array/i],
    ['invalid key selector', { keys: [42] }, /key selectors must be strings or RegExp instances/i],
    ['unsupported wildcard key selector', { keys: ['*'] }, /unsupported wildcard key selector/i],
    ['unsupported recursive wildcard key selector', { keys: ['**'] }, /unsupported recursive wildcard key selector/i],
    ['unsupported exclusion key selector', { keys: ['!password'] }, /unsupported exclusion key selector/i],
    ['unsupported regex-like key selector', { keys: ['/^password$/'] }, /unsupported regex-like key selector/i],
    ['unsupported global regex key selector', { keys: [/password/g] }, /regex key selector must not use global or sticky flags/i],
    ['unsupported sticky regex key selector', { keys: [/password/y] }, /regex key selector must not use global or sticky flags/i],
    ['unsafe nested-quantifier regex key selector', { keys: [/^(a+)+$/] }, /unsafe regex key selector/i],
    ['unsafe overlapping-alternation regex key selector', { keys: [/^(a|aa)+$/] }, /unsafe regex key selector/i],
    [
      'overlong regex key selector',
      { keys: [new RegExp('a'.repeat(257))] },
      /regex key selector source must be at most 256 characters/i,
    ],
    ['unsupported root option', { serialize: true }, /unsupported option "serialize"/i],
    ['unsupported legacy key option', { blacklistedKeys: ['password'] }, /unsupported option "blacklistedKeys"/i],
    ['invalid diagnostics container', { diagnostics: ['sink'] }, /diagnostics must be an object/i],
    ['unsupported diagnostics option', { diagnostics: { console: true } }, /unsupported option "console"/i],
    ['invalid diagnostics sink', { diagnostics: { sink: 'console.error' } }, /sink must be a function/i],
    ['invalid serialise value', { serialise: 'json' }, /serialise must be a boolean or function/i],
    ['invalid ignored-value-types container', { ignoredValueTypes: ['Map'] }, /ignoredValueTypes must be an object/i],
    ['unsupported ignored-value-type key', { ignoredValueTypes: { Promise: true } }, /unsupported option "Promise"/i],
    ['invalid ignored-value-type flag', { ignoredValueTypes: { Map: 'yes' } }, /Map must be a boolean/i],
    ['legacy array transformers option', { transformers: [(_value: unknown) => _value] }, /transformers must be an object/i],
    ['unsupported transformer bucket', { transformers: { byBucket: {} } }, /unsupported option "byBucket"/i],
    ['unsupported transformer type bucket', { transformers: { byType: { string: [(_value: unknown) => _value] } } }, /unsupported option "string"/i],
    [
      'unsupported transformer constructor bucket',
      { transformers: { byConstructor: { Promise: [(_value: unknown) => _value] } } },
      /unsupported option "Promise"/i,
    ],
    [
      'invalid fallback transformer entry',
      { transformers: { fallback: [null] } },
      /transformer entries must be functions/i,
    ],
    ['invalid paths container', { paths: 'user.password' }, /paths must be an array/i],
    ['invalid path entry', { paths: [42] }, /paths\[0\] must be a string selector or path-rule object/i],
    ['missing path on path rule', { paths: [{ remove: true }] }, /paths\[0\]\.path: path must be a string or structured selector array/i],
    ['partial wildcard path', { paths: ['users.foo*bar.password'] }, /unsupported wildcard syntax/i],
    ['multiple recursive wildcards', { paths: ['users.**.profile.**.password'] }, /at most one recursive wildcard/i],
    ['unsupported string exclusion syntax', { paths: ['users.!admin.password'] }, /unsupported exclusion syntax/i],
    ['unsupported structured regex-like string segment', { paths: [['users', '/^team-/i', 'token']] }, /unsupported regex-like segment/i],
    ['unsupported structured matcher object', { paths: [['users', { match: 'password' }]] }, /unsupported structured selector segment/i],
    ['negative structured numeric segment', { paths: [['users', -1, 'password']] }, /structured numeric segments must be non-negative integers/i],
    ['negative structured ignore index', { paths: [['users', { ignore: -1 }, 'password']] }, /structured ignore indexes must be non-negative integers/i],
    ['unsupported global regex path segment', { paths: [['users', /^admin$/g, 'token']] }, /regex path segment must not use global or sticky flags/i],
    ['unsupported sticky regex ignore segment', { paths: [['users', { ignore: /^internal/y }, 'token']] }, /regex path segment must not use global or sticky flags/i],
    ['unsafe nested-quantifier regex path segment', { paths: [['users', /^(a+)+$/, 'token']] }, /unsafe regex path segment/i],
    ['unsafe overlapping-alternation regex path segment', { paths: [['users', /^(a|aa)+$/, 'token']] }, /unsafe regex path segment/i],
    [
      'overlong regex path segment',
      { paths: [['users', new RegExp('a'.repeat(257)), 'token']] },
      /regex path segment source must be at most 256 characters/i,
    ],
    ['unsafe nested-quantifier regex ignore segment', { paths: [['users', { ignore: /^(a+)+$/ }, 'token']] }, /unsafe regex path segment/i],
    ['unsafe overlapping-alternation regex ignore segment', { paths: [['users', { ignore: /^(a|aa)+$/ }, 'token']] }, /unsafe regex path segment/i],
    [
      'overlong regex ignore segment',
      { paths: [['users', { ignore: new RegExp('a'.repeat(257)) }, 'token']] },
      /regex path segment source must be at most 256 characters/i,
    ],
    [
      'overlong regex path segment with supplementary-plane character (257 code points)',
      { paths: [['users', new RegExp('a'.repeat(256) + '😀'), 'token']] },
      /regex path segment source must be at most 256 characters/i,
    ],
  ])('fails fast for %s', (_label, options, expectedMessage) => {
    expect(() => deepRedact(options as never)).toThrow(expectedMessage)
  })

  it.each([
    [
      'root remove and censor',
      { remove: true, censor: '[REDACTED]' },
      /remove cannot be combined with censor/i,
    ],
    [
      'root remove and retainStructure',
      { remove: true, retainStructure: true },
      /remove cannot be combined with retainStructure/i,
    ],
    [
      'path remove and censor',
      { paths: [{ path: 'user.password', remove: true, censor: '[REDACTED]' }] },
      /paths\[0\].*remove cannot be combined with censor/i,
    ],
    [
      'path remove and retainStructure',
      { paths: [{ path: 'user.password', remove: true, retainStructure: true }] },
      /paths\[0\].*remove cannot be combined with retainStructure/i,
    ],
    [
      'global remove inherited by path censor',
      { remove: true, paths: [{ path: 'user.password', censor: '[REDACTED]' }] },
      /paths\[0\].*remove cannot be combined with censor/i,
    ],
    [
      'global censor inherited by path remove',
      { censor: '[REDACTED]', paths: [{ path: 'user.password', remove: true }] },
      /paths\[0\].*remove cannot be combined with censor/i,
    ],
    [
      'global remove inherited by path retainStructure',
      { remove: true, paths: [{ path: 'user.password', retainStructure: true }] },
      /paths\[0\].*remove cannot be combined with retainStructure/i,
    ],
    [
      'global retainStructure inherited by path remove',
      { retainStructure: true, paths: [{ path: 'user.password', remove: true }] },
      /paths\[0\].*remove cannot be combined with retainStructure/i,
    ],
  ])('rejects conflicting options for %s', (_label, options, expectedMessage) => {
    expect(() => deepRedact(options)).toThrow(expectedMessage)
  })

  describe('One-way redaction contract', () => {
    it.each(oneWayDeniedOptionNames)('rejects restore-like root option "%s"', (optionName) => {
      expect(() => deepRedact({
        paths: ['account.secret'],
        [optionName]: true,
      } as never)).toThrow(new RegExp(`Unsupported option "${optionName}"`, 'i'))
    })

    it.each(oneWayDeniedOptionNames)('rejects restore-like path-rule option "%s"', (optionName) => {
      expect(() => deepRedact({
        paths: [
          {
            path: 'account.secret',
            [optionName]: true,
          },
        ],
      } as never)).toThrow(new RegExp(`Unsupported option "${optionName}"`, 'i'))
    })

    it('exposes no restore-like methods or properties on returned redactors', () => {
      const redact = deepRedact({
        paths: ['account.secret'],
      })

      assertNoDeniedPublicNames(Reflect.ownKeys(redact), 'redactor own keys')
      assertNoDeniedPublicNames(
        Reflect.ownKeys((redact as { readonly prototype: object }).prototype),
        'redactor prototype own keys',
      )
      expect(Reflect.ownKeys(redact).sort()).toStrictEqual(['length', 'name', 'prototype'])
      expect(Reflect.ownKeys((redact as { readonly prototype: object }).prototype)).toStrictEqual(['constructor'])
    })

    it('defines a canonical deny-list fixture with sentinel variants and denied public intent terms', () => {
      const fixture = createOneWayDenyListFixture()
      const expectedBase64 = Buffer.from(fixture.sensitiveValue, 'utf8').toString('base64')
      const expectedHex = Buffer.from(fixture.sensitiveValue, 'utf8').toString('hex')
      const expectedUri = encodeURIComponent(fixture.sensitiveValue)

      expect(deniedPublicIntentTerms).toStrictEqual(['restore', 'unredact', 'reveal', 'decode'])
      expect(fixture.sensitiveValue).toBe('story-4-5-secret-value/token')
      expect(fixture.sensitiveValueVariants).toStrictEqual({
        base64: expectedBase64,
        base64Unpadded: expectedBase64.replaceAll(/=+$/g, ''),
        base64Url: expectedBase64.replaceAll('+', '-').replaceAll('/', '_').replaceAll(/=+$/g, ''),
        hex: expectedHex,
        hexUpper: expectedHex.toUpperCase(),
        raw: fixture.sensitiveValue,
        uri: expectedUri,
        uriLower: expectedUri.replaceAll(/%[0-9A-F]{2}/g, (match) => match.toLowerCase()),
        unicodeEscaped: [...fixture.sensitiveValue]
          .map((character) => `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`)
          .join(''),
      })
      expect(() => assertOneWaySerialisedOutput(
        `{"leak":"${fixture.sensitiveValueVariants.base64}"}`,
        fixture,
      )).toThrow(/base64 sensitive value/i)
      expect(() => assertOneWaySerialisedOutput(
        `{"leak":"${fixture.sensitiveValueVariants.unicodeEscaped}"}`,
        fixture,
      )).toThrow(/sensitive value/i)
      expect(() => assertOneWayStructuredOutput(
        new Map([['leak', fixture.sensitiveValue]]),
        fixture,
      )).toThrow(/raw sensitive value/i)

      const outputWithAccessor = {}
      Object.defineProperty(outputWithAccessor, 'safe', {
        enumerable: true,
        get: () => fixture.sensitiveValue,
      })
      expect(() => assertOneWayStructuredOutput(outputWithAccessor, fixture)).toThrow(/accessor descriptor/i)
      expect(() => assertNoDeniedDeclarationSurface(`
        interface Leak {
          restore(): void;
          reveal?: boolean;
          "decode"?: boolean;
        }
        declare function unredact(): void;
      `, 'synthetic declarations')).toThrow(/restore|unredact|reveal|decode/i)
    })

    it('returns structured output without reversible values, metadata, or source handles', () => {
      const fixture = createOneWayDenyListFixture()
      const redact = deepRedact(fixture.createOptions({ serialise: false }))
      const result = redact(fixture.payload)

      expect(result).toStrictEqual(fixture.expectedStructuredOutput)
      assertOneWayStructuredOutput(result, fixture)
    })

    it('returns serialised output without reversible values, metadata, or source handles', () => {
      const fixture = createOneWayDenyListFixture()
      const redact = deepRedact(fixture.createOptions({ serialise: true }))
      const result = redact(fixture.payload)

      expect(result).toBe(fixture.expectedSerialisedOutput)
      assertOneWaySerialisedOutput(result as string, fixture)
    })

    it('passes only the already-redacted structure to custom serialisers', () => {
      const fixture = createOneWayDenyListFixture()
      const serialise = vi.fn((value: unknown) => {
        expect(value).toStrictEqual(fixture.expectedStructuredOutput)
        assertOneWayStructuredOutput(value, fixture)

        return JSON.stringify({ wrapped: value })
      })
      const redact = deepRedact(fixture.createOptions({ serialise }))
      const result = redact(fixture.payload)

      expect(result).toBe(`{"wrapped":${fixture.expectedSerialisedOutput}}`)
      expect(serialise).toHaveBeenCalledTimes(1)
      expect(serialise).toHaveBeenCalledWith(fixture.expectedStructuredOutput)
    })
  })

  it('accepts non-stateful RegExp key selectors during initialisation', () => {
    expect(() => deepRedact({
      keys: [/password$/i],
    })).not.toThrow()
  })

  it('accepts a regex path segment source of exactly 256 Unicode code points including supplementary characters', () => {
    expect(() => deepRedact({
      paths: [['users', new RegExp('a'.repeat(255) + '😀'), 'token']],
    })).not.toThrow()
  })

  describe('Substring rule validation', () => {
    const replaceToken = (value: string, pattern: RegExp) => value.replace(pattern, '[TOKEN]')

    it.each([
      ['invalid stringTests container', { stringTests: /token/ }, /options\.stringTests: stringTests must be an array/i],
      ['invalid entry shape', { stringTests: [42] }, /options\.stringTests\[0\]: string test entries must be RegExp instances or substring rule objects/i],
      [
        'unsupported structured field',
        { stringTests: [{ pattern: /token/, replacer: replaceToken, censor: '[TOKEN]' }] },
        /options\.stringTests\[0\]: unsupported option "censor"/i,
      ],
      [
        'missing structured pattern',
        { stringTests: [{ replacer: replaceToken }] },
        /options\.stringTests\[0\]\.pattern: pattern must be a RegExp instance/i,
      ],
      [
        'missing structured replacer',
        { stringTests: [{ pattern: /token/ }] },
        /options\.stringTests\[0\]\.replacer: replacer must be a function/i,
      ],
      [
        'non-RegExp structured pattern',
        { stringTests: [{ pattern: 'token', replacer: replaceToken }] },
        /options\.stringTests\[0\]\.pattern: pattern must be a RegExp instance/i,
      ],
      [
        'non-function structured replacer',
        { stringTests: [{ pattern: /token/, replacer: '[TOKEN]' }] },
        /options\.stringTests\[0\]\.replacer: replacer must be a function/i,
      ],
      ['unsafe nested-quantifier pattern', { stringTests: [/^(a+)+$/] }, /unsafe substring rule pattern/i],
      ['unsafe overlapping-alternation pattern', { stringTests: [/^(a|aa)+$/] }, /unsafe substring rule pattern/i],
      ['sticky pattern', { stringTests: [/token/y] }, /substring rule pattern must not use sticky flag/i],
      [
        'overlong pattern',
        { stringTests: [new RegExp('a'.repeat(257))] },
        /substring rule pattern source must be at most 256 characters/i,
      ],
      ['empty non-capturing group /(?:)/ pattern', { stringTests: [new RegExp('')] }, /substring rule pattern must not match zero-length strings/i],
      ['start-anchor pattern', { stringTests: [/^/] }, /substring rule pattern must not match zero-length strings/i],
      ['end-anchor pattern', { stringTests: [/$/] }, /substring rule pattern must not match zero-length strings/i],
      ['optional pattern', { stringTests: [/a?/] }, /substring rule pattern must not match zero-length strings/i],
      ['lookahead pattern', { stringTests: [/(?=secret)/] }, /substring rule pattern must not match zero-length strings/i],
      [
        'structured zero-length pattern',
        { stringTests: [{ pattern: /^/, replacer: replaceToken }] },
        /options\.stringTests\[0\]\.pattern: substring rule pattern must not match zero-length strings/i,
      ],
    ])('fails fast for %s', (_label, options, expectedMessage) => {
      expect(() => deepRedact(options as never)).toThrow(expectedMessage)
    })

    it('accepts safe global substring patterns without mutating caller-owned lastIndex during validation', () => {
      const barePattern = /token=[^&\s]+/g
      const structuredPattern = /api-key=[^&\s]+/g
      barePattern.lastIndex = 7
      structuredPattern.lastIndex = 11

      expect(() => deepRedact({
        stringTests: [
          barePattern,
          {
            pattern: structuredPattern,
            replacer: replaceToken,
          },
        ],
      })).not.toThrow()
      expect(barePattern.lastIndex).toBe(7)
      expect(structuredPattern.lastIndex).toBe(11)
    })
  })

  describe('Substring rule redaction', () => {
    it('redacts nested object properties and array elements for bare RegExp rules with the default censor', () => {
      const redact = deepRedact({
        stringTests: [/token=[^&\s]+/],
      })
      const payload = {
        user: {
          note: 'safe token=secret tail',
          safe: 'visible',
        },
        events: [
          'token=array-secret',
          'visible',
        ],
      }

      expect(redact(payload)).toEqual({
        user: {
          note: '[REDACTED]',
          safe: 'visible',
        },
        events: [
          '[REDACTED]',
          'visible',
        ],
      })
      expect(payload.user.note).toBe('safe token=secret tail')
    })

    it('uses the resolved whole-value censor behaviour for bare RegExp matches', () => {
      const literalRedact = deepRedact({
        censor: '[MASKED]',
        stringTests: [/secret/],
      })
      const sameLengthRedact = deepRedact({
        censor: '*',
        replaceStringByLength: true,
        stringTests: [/secret/],
      })

      expect(literalRedact({ note: 'prefix secret suffix' })).toEqual({
        note: '[MASKED]',
      })
      expect(sameLengthRedact({ note: 'prefix secret suffix' })).toEqual({
        note: '*'.repeat('prefix secret suffix'.length),
      })
    })

    it('provides function censors with substring match context for bare RegExp matches', () => {
      const calls: Array<readonly [unknown, FunctionCensorContext, number]> = []
      const censor = function (value: unknown, ctx: FunctionCensorContext): string {
        calls.push([value, ctx, arguments.length])
        return `${ctx.matchedPath.join('.')}:${String(value)}`
      }
      const redact = deepRedact({
        censor,
        stringTests: [/token=[^&\s]+/g],
      })

      expect(redact({ user: { note: 'token=secret' } })).toEqual({
        user: {
          note: 'user.note:token=secret',
        },
      })
      expect(calls).toHaveLength(1)
      expect(calls[0]?.[2]).toBe(2)
      expect(calls[0]?.[1].matchedPath).toEqual(['user', 'note'])
      expect(calls[0]?.[1].terminalKey).toBe('note')
      expect(calls[0]?.[1].rootInput).toEqual({ user: { note: 'token=secret' } })
      expect(calls[0]?.[1].rulePath).toHaveLength(1)
      expect(calls[0]?.[1].rulePath[0]).toBeInstanceOf(RegExp)
      expect((calls[0]?.[1].rulePath[0] as RegExp).source).toBe(String.raw`token=[^&\s]+`)
    })

    it('calls structured replacers once with the original string and an invocation-local pattern clone', () => {
      const callerPattern = /token=[^&\s]+/g
      const seenPatterns: RegExp[] = []
      const replacer = vi.fn((value: string, pattern: RegExp) => {
        seenPatterns.push(pattern)
        pattern.lastIndex = 99
        return value.replace(pattern, 'token=[REDACTED]')
      })
      const redact = deepRedact({
        stringTests: [
          {
            pattern: callerPattern,
            replacer,
          },
        ],
      })

      expect(redact({
        note: 'safe token=one middle token=two tail',
      })).toEqual({
        note: 'safe token=[REDACTED] middle token=[REDACTED] tail',
      })
      expect(replacer).toHaveBeenCalledTimes(1)
      expect(replacer).toHaveBeenCalledWith('safe token=one middle token=two tail', expect.any(RegExp))
      expect(seenPatterns[0]).not.toBe(callerPattern)
      expect(seenPatterns[0]?.source).toBe(String.raw`token=[^&\s]+`)
      expect(seenPatterns[0]?.flags).toBe('g')
      expect(callerPattern.lastIndex).toBe(0)
    })

    it('stops after the first matching substring rule in configuration order', () => {
      const laterStructured = vi.fn((value: string) => value.replace('token', '[TOKEN]'))
      const bareFirst = deepRedact({
        censor: '[WHOLE]',
        stringTests: [
          /token/,
          {
            pattern: /token/,
            replacer: laterStructured,
          },
        ],
      })
      const structuredFirst = deepRedact({
        censor: '[WHOLE]',
        stringTests: [
          {
            pattern: /token/,
            replacer: (value) => value.replace('token', '[TOKEN]'),
          },
          /token/,
        ],
      })

      expect(bareFirst({ note: 'token=secret' })).toEqual({
        note: '[WHOLE]',
      })
      expect(laterStructured).not.toHaveBeenCalled()
      expect(structuredFirst({ note: 'token=secret' })).toEqual({
        note: '[TOKEN]=secret',
      })
    })

    it('leaves unmatched strings and non-string values unchanged', () => {
      const redact = deepRedact({
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: (value) => value.replace(/token=[^&\s]+/, 'token=[REDACTED]'),
          },
        ],
      })

      expect(redact({
        note: 'visible',
        count: 2,
        nested: {
          ok: true,
          empty: null,
        },
      })).toEqual({
        note: 'visible',
        count: 2,
        nested: {
          ok: true,
          empty: null,
        },
      })
    })

    it('does not apply substring rules to values already selected by existing path or key targeting', () => {
      const substringReplacer = vi.fn((value: string) => value.replace(/token=[^&\s]+/, 'token=[SUBSTRING]'))
      const redact = deepRedact({
        censor: '[WHOLE]',
        keys: ['direct'],
        paths: [
          {
            path: 'retained',
            retainStructure: true,
          },
        ],
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: substringReplacer,
          },
        ],
      })

      expect(redact({
        direct: 'token=key',
        retained: {
          inner: 'token=retained',
        },
        free: 'token=free',
      })).toEqual({
        direct: '[WHOLE]',
        retained: {
          inner: '[WHOLE]',
        },
        free: 'token=[SUBSTRING]',
      })
      expect(substringReplacer).toHaveBeenCalledTimes(1)
    })

    it('preserves sparse-array holes for substring rewrites and uses array compaction for bare substring removal', () => {
      const rewritten = deepRedact({
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: (value) => value.replace(/token=[^&\s]+/, 'token=[REDACTED]'),
          },
        ],
      })(['visible', , 'token=secret']) as unknown[]
      const removed = deepRedact({
        remove: true,
        stringTests: [/token=[^&\s]+/],
      })(['keep-first', , 'token=remove', 'keep-last']) as unknown[]

      expect(rewritten).toHaveLength(3)
      expect(rewritten[0]).toBe('visible')
      expect(1 in rewritten).toBe(false)
      expect(rewritten[2]).toBe('token=[REDACTED]')

      expect(removed).toHaveLength(3)
      expect(removed[0]).toBe('keep-first')
      expect(1 in removed).toBe(false)
      expect(removed[2]).toBe('keep-last')
    })

    it('does not copy the parent container when a structured replacer returns the original string unchanged', () => {
      const input = { note: 'no match here', safe: 'also no match' }
      const redact = deepRedact({
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: (value) => value,
          },
        ],
      })

      const result = redact(input)

      expect(result).toBe(input)
    })

    it('removes object properties matched by bare substring rules when remove: true', () => {
      const redact = deepRedact({
        remove: true,
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact({
        note: 'token=secret',
        safe: 'visible',
        nested: {
          token: 'token=nested',
          other: 'untouched',
        },
      })).toEqual({
        safe: 'visible',
        nested: {
          other: 'untouched',
        },
      })
    })

    it('serialises after bare and structured substring redaction', () => {
      const customSerialise = vi.fn((value: unknown) => JSON.stringify(value))
      const bareRedact = deepRedact({
        serialise: true,
        stringTests: [/token=[^&\s]+/],
      })
      const structuredRedact = deepRedact({
        serialise: customSerialise,
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: (value) => value.replace(/token=[^&\s]+/, 'token=[REDACTED]'),
          },
        ],
      })

      expect(bareRedact({ note: 'token=secret' })).toBe(JSON.stringify({ note: '[REDACTED]' }))
      expect(structuredRedact({ note: 'token=secret' })).toBe(JSON.stringify({ note: 'token=[REDACTED]' }))
      expect(customSerialise).toHaveBeenCalledWith({ note: 'token=[REDACTED]' })
    })

    it('isolates global RegExp state across repeated redaction calls and replacer pattern mutations', () => {
      const barePattern = /token=[^&\s]+/g
      const structuredPattern = /api-key=[^&\s]+/g
      const redact = deepRedact({
        stringTests: [
          {
            pattern: structuredPattern,
            replacer: (value, pattern) => {
              pattern.lastIndex = 99
              return value.replace(pattern, 'api-key=[REDACTED]')
            },
          },
          barePattern,
        ],
      })
      barePattern.lastIndex = 7
      structuredPattern.lastIndex = 11
      const payload = {
        first: 'api-key=one',
        second: 'api-key=two',
        bare: 'token=three',
      }

      expect(redact(payload)).toEqual({
        first: 'api-key=[REDACTED]',
        second: 'api-key=[REDACTED]',
        bare: '[REDACTED]',
      })
      expect(redact(payload)).toEqual({
        first: 'api-key=[REDACTED]',
        second: 'api-key=[REDACTED]',
        bare: '[REDACTED]',
      })
      expect(barePattern.lastIndex).toBe(7)
      expect(structuredPattern.lastIndex).toBe(11)
    })
  })

  describe('Root primitive string redaction', () => {
    it('redacts a matching root string with the default censor for a bare RegExp rule', () => {
      const redact = deepRedact({
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact('token=secret')).toBe('[REDACTED]')
    })

    it('redacts a matching root string with a custom literal censor for a bare RegExp rule', () => {
      const redact = deepRedact({
        censor: '[MASKED]',
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact('token=secret')).toBe('[MASKED]')
    })

    it('provides function censors with correct context for a bare RegExp match on a root string', () => {
      const calls: Array<{ value: unknown; ctx: FunctionCensorContext }> = []
      const censor = (_value: unknown, ctx: FunctionCensorContext) => {
        calls.push({ value: _value, ctx })
        return '[FN]'
      }
      const rootInput = 'token=secret'
      const redact = deepRedact({
        censor,
        stringTests: [/token=[^&\s]+/g],
      })

      expect(redact(rootInput)).toBe('[FN]')
      expect(calls).toHaveLength(1)
      expect(calls[0]!.value).toBe(rootInput)
      expect(calls[0]!.ctx.matchedPath).toEqual([])
      expect(Object.hasOwn(calls[0]!.ctx, 'terminalKey')).toBe(false)
      expect(calls[0]!.ctx.rootInput).toBe(rootInput)
      expect(calls[0]!.ctx.rulePath).toHaveLength(1)
      expect(calls[0]!.ctx.rulePath[0]).toBeInstanceOf(RegExp)
      expect((calls[0]!.ctx.rulePath[0] as RegExp).source).toBe(String.raw`token=[^&\s]+`)
    })

    it('applies same-length replacement to a matching root string', () => {
      const rootInput = 'token=secret'
      const redact = deepRedact({
        censor: '*',
        replaceStringByLength: true,
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact(rootInput)).toBe('*'.repeat(rootInput.length))
    })

    it('redacts a matching root string using whole-value censor for a structured rule without calling the replacer', () => {
      const replacer = vi.fn((value: string) => value.replace(/token=[^&\s]+/, 'token=[REDACTED]'))
      const redact = deepRedact({
        stringTests: [{ pattern: /token=[^&\s]+/, replacer }],
      })

      expect(redact('token=secret')).toBe('[REDACTED]')
      expect(replacer).toHaveBeenCalledTimes(0)
    })

    it('provides function censors with correct context for a structured rule match on a root string', () => {
      const calls: Array<{ value: unknown; ctx: FunctionCensorContext }> = []
      const censor = (_value: unknown, ctx: FunctionCensorContext) => {
        calls.push({ value: _value, ctx })
        return '[FN]'
      }
      const replacer = vi.fn((value: string) => value.replace(/token=[^&\s]+/, 'token=[REDACTED]'))
      const rootInput = 'token=secret'
      const redact = deepRedact({
        censor,
        stringTests: [{ pattern: /token=[^&\s]+/, replacer }],
      })

      expect(redact(rootInput)).toBe('[FN]')
      expect(calls).toHaveLength(1)
      expect(calls[0]!.ctx.matchedPath).toEqual([])
      expect(Object.hasOwn(calls[0]!.ctx, 'terminalKey')).toBe(false)
      expect(calls[0]!.ctx.rootInput).toBe(rootInput)
      expect(calls[0]!.ctx.rulePath).toHaveLength(1)
      expect(calls[0]!.ctx.rulePath[0]).toBeInstanceOf(RegExp)
      expect((calls[0]!.ctx.rulePath[0] as RegExp).source).toBe(String.raw`token=[^&\s]+`)
      expect(replacer).not.toHaveBeenCalled()
    })

    it('returns undefined when remove: true matches a root string', () => {
      const redact = deepRedact({
        remove: true,
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact('token=secret')).toBeUndefined()
      expect(redact('no-match')).toBe('no-match')
    })

    it('returns root string unchanged when no substring rule matches', () => {
      const redact = deepRedact({
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact('no-match-here')).toBe('no-match-here')
    })

    it('returns non-string root primitives unchanged', () => {
      const redact = deepRedact({
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact(42)).toBe(42)
      expect(redact(true)).toBe(true)
      expect(redact(null)).toBe(null)
    })

    it('stops at the first matching rule for root string inputs', () => {
      const firstRedact = deepRedact({
        censor: '[FIRST]',
        stringTests: [/token/, /secret/],
      })
      const secondRedact = deepRedact({
        censor: '[SECOND]',
        stringTests: [/nomatch/, /token/],
      })

      expect(firstRedact('token=secret')).toBe('[FIRST]')
      expect(secondRedact('token=secret')).toBe('[SECOND]')
    })

    it('passes the redacted root string to a custom serialise function', () => {
      const serialise = vi.fn((value: unknown) => JSON.stringify(value))
      const redact = deepRedact({
        serialise,
        stringTests: [/token=[^&\s]+/],
      })

      expect(redact('token=secret')).toBe('"[REDACTED]"')
      expect(serialise).toHaveBeenCalledWith('[REDACTED]')
    })

    it('returns the raw redacted string when serialise: false, not a JSON-stringified value', () => {
      const redact = deepRedact({
        serialise: false,
        stringTests: [/token=[^&\s]+/],
      })
      const result = redact('token=secret')

      expect(result).toBe('[REDACTED]')
      expect(result).not.toBe('"[REDACTED]"')
    })
  })

  describe('Precedence across path, key, and substring targeting', () => {
    const createKeyCensor = () => vi.fn((_value: unknown, ctx: FunctionCensorContext) => {
      const firstRuleSegment = ctx.rulePath[0]

      return firstRuleSegment instanceof RegExp ? '[REGEX-KEY]' : '[EXACT-KEY]'
    })

    const createSubstringReplacer = () => vi.fn((value: string) => value.replace(/token=[^&\s]+/, 'token=[SUBSTRING]'))

    const createPrecedencePayload = () => ({
      records: {
        exact: { token: 'token=exact' },
        structured: { token: 'token=structured' },
        key: { token: 'token=key' },
        regex: { sessionToken: 'token=regex' },
        substring: { note: 'token=substring' },
      },
    })

    it('resolves one deterministic winner per leaf across exact-path, structured path, exact-key, regex-key, and substring rules', () => {
      const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
      const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const redact = deepRedact({
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

      expect(redact(createPrecedencePayload())).toEqual({
        records: {
          exact: { token: '[EXACT-PATH]' },
          structured: { token: '[STRUCTURED-PATH]' },
          key: { token: '[EXACT-KEY]' },
          regex: { sessionToken: '[REGEX-KEY]' },
          substring: { note: 'token=[SUBSTRING]' },
        },
      })
      expect(exactPathCensor).toHaveBeenCalledTimes(1)
      expect(structuredPathCensor).toHaveBeenCalledTimes(1)
      expect(keyCensor).toHaveBeenCalledTimes(2)
      expect(substringReplacer).toHaveBeenCalledTimes(1)
    })

    it('lets exact-path rules beat structured path, exact-key, regex-key, and substring matches on the same leaf', () => {
      const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
      const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const redact = deepRedact({
        censor: keyCensor,
        keys: ['token', /token$/i],
        paths: [
          {
            path: 'records.exact.token',
            censor: exactPathCensor,
          },
          {
            path: ['records', /^exact$/, 'token'],
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

      expect(redact({
        records: {
          exact: { token: 'token=exact' },
        },
      })).toEqual({
        records: {
          exact: { token: '[EXACT-PATH]' },
        },
      })
      expect(exactPathCensor).toHaveBeenCalledTimes(1)
      expect(structuredPathCensor).not.toHaveBeenCalled()
      expect(keyCensor).not.toHaveBeenCalled()
      expect(substringReplacer).not.toHaveBeenCalled()
    })

    it('lets structured path rules beat exact-key, regex-key, and substring matches when no exact-path rule applies', () => {
      const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const redact = deepRedact({
        censor: keyCensor,
        keys: ['token', /token$/i],
        paths: [
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

      expect(redact({
        records: {
          structured: { token: 'token=structured' },
        },
      })).toEqual({
        records: {
          structured: { token: '[STRUCTURED-PATH]' },
        },
      })
      expect(structuredPathCensor).toHaveBeenCalledTimes(1)
      expect(keyCensor).not.toHaveBeenCalled()
      expect(substringReplacer).not.toHaveBeenCalled()
    })

    it('lets exact-key rules beat regex-key and substring matches when no path rule applies', () => {
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const redact = deepRedact({
        censor: keyCensor,
        keys: ['token', /token$/i],
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: substringReplacer,
          },
        ],
      })

      expect(redact({
        records: {
          key: { token: 'token=key' },
        },
      })).toEqual({
        records: {
          key: { token: '[EXACT-KEY]' },
        },
      })
      expect(keyCensor).toHaveBeenCalledTimes(1)
      expect(keyCensor.mock.calls[0]![1].rulePath).toEqual(['token'])
      expect(substringReplacer).not.toHaveBeenCalled()
    })

    it('lets regex-key rules beat substring replacement on the same leaf', () => {
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const redact = deepRedact({
        censor: keyCensor,
        keys: [/token$/i],
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: substringReplacer,
          },
        ],
      })

      expect(redact({
        records: {
          regex: { sessionToken: 'token=regex' },
        },
      })).toEqual({
        records: {
          regex: { sessionToken: '[REGEX-KEY]' },
        },
      })
      expect(keyCensor).toHaveBeenCalledTimes(1)
      expect(keyCensor.mock.calls[0]![1].rulePath[0]).toBeInstanceOf(RegExp)
      expect(substringReplacer).not.toHaveBeenCalled()
    })

    it('continues traversing retained containers while keeping inherited whole-value claims ahead of key and substring rewrites', () => {
      const retainedParentCensor = vi.fn((_value: unknown, _ctx: FunctionCensorContext) => '[RETAINED-PARENT]')
      const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const redact = deepRedact({
        censor: keyCensor,
        keys: ['token', /token$/i],
        paths: [
          {
            path: 'retained',
            censor: retainedParentCensor,
            retainStructure: true,
          },
          {
            path: 'retained.override',
            censor: exactPathCensor,
          },
        ],
        stringTests: [
          {
            pattern: /token=[^&\s]+/,
            replacer: substringReplacer,
          },
        ],
      })

      expect(redact({
        retained: {
          token: 'token=exact-key',
          sessionToken: 'token=regex-key',
          inherited: 'token=inherited',
          override: 'token=override',
        },
        free: 'token=free',
      })).toEqual({
        retained: {
          token: '[RETAINED-PARENT]',
          sessionToken: '[RETAINED-PARENT]',
          inherited: '[RETAINED-PARENT]',
          override: '[EXACT-PATH]',
        },
        free: 'token=[SUBSTRING]',
      })
      expect(retainedParentCensor).toHaveBeenCalledTimes(3)
      expect(retainedParentCensor.mock.calls.map(([, ctx]) => ctx.matchedPath)).toEqual([
        ['retained', 'token'],
        ['retained', 'sessionToken'],
        ['retained', 'inherited'],
      ])
      expect(exactPathCensor).toHaveBeenCalledTimes(1)
      expect(keyCensor).not.toHaveBeenCalled()
      expect(substringReplacer).toHaveBeenCalledTimes(1)
    })

  })

  describe('Normative precedence matrix', () => {
    it('publishes the exact public total order metadata', () => {
      expect(precedenceOrder).toStrictEqual([
        'exact string-path',
        'structured path',
        'exact key',
        'regex property',
        'substring',
      ])
    })

    it('backs every published overlap matrix row with exercised fixture metadata', () => {
      const fixtureEdges: PrecedenceEdge[] = precedenceMatrixFixtures.flatMap((fixture) => [...fixture.edges])

      expect(fixtureEdges).toEqual(expect.arrayContaining(publishedPrecedenceMatrixRows))
    })

    it('keeps documentation fixture fields aligned with each runtime case', () => {
      for (const fixture of precedenceMatrixFixtures) {
        const { runtimeCase } = createTrackedPrecedenceRuntimeCase(fixture)

        expect(fixture.documentation.input).toBeDefined()
        expect(normalisePrecedenceDocumentationValue(fixture.documentation.options))
          .toStrictEqual(normalisePrecedenceDocumentationValue(runtimeCase.options))

        if (fixture.outcome === 'output') {
          if (runtimeCase.outcome !== 'output') {
            throw new Error(`Fixture '${fixture.name}' did not create an output runtime case.`)
          }

          expect(fixture.documentation.input).toStrictEqual(runtimeCase.input)
          expect(fixture.documentation.expectedOutput).toStrictEqual(runtimeCase.expectedOutput)
        } else {
          if (runtimeCase.outcome !== 'initialisation-error') {
            throw new Error(`Fixture '${fixture.name}' did not create an initialisation-error runtime case.`)
          }

          expect(fixture.documentation.input).toStrictEqual(runtimeCase.input)
          expect(fixture.documentation.expectedInitialisationError).toMatch(runtimeCase.expectedError)
        }
      }
    })

    it.each(precedenceOutputCases)('proves the published fixture %s', (_name, fixture) => {
      const { runtimeCase, trackedSpies } = createTrackedPrecedenceRuntimeCase(fixture)

      if (runtimeCase.outcome !== 'output') {
        throw new Error(`Fixture '${fixture.name}' is not an output fixture.`)
      }

      const redact = deepRedact(runtimeCase.options)

      expect(redact(runtimeCase.input)).toStrictEqual(runtimeCase.expectedOutput)
      expectTrackedPrecedenceCallCounts(runtimeCase, trackedSpies)
    })

    it('fails initialisation when duplicate selectors collapse to the same canonical exact path', () => {
      const fixture = getPrecedenceFixture('duplicate-canonical-path-init-failure')
      const { runtimeCase } = createTrackedPrecedenceRuntimeCase(fixture)

      if (runtimeCase.outcome !== 'initialisation-error') {
        throw new Error(`Fixture '${fixture.name}' is not an initialisation-error fixture.`)
      }

      expect(() => deepRedact(runtimeCase.options)).toThrow(runtimeCase.expectedError)
    })

    it.each(requiredPrecedenceEdges)(
      'proves %s outranks %s',
      (higherPrecedenceTerm, lowerPrecedenceTerm, fixtureName) => {
        const fixture = getPrecedenceFixture(fixtureName)
        const { runtimeCase, trackedSpies } = createTrackedPrecedenceRuntimeCase(fixture)

        expect(fixture.edges).toContainEqual({
          higher: higherPrecedenceTerm,
          lower: lowerPrecedenceTerm,
        })

        if (runtimeCase.outcome !== 'output') {
          throw new Error(`Fixture '${fixture.name}' is not an output fixture.`)
        }

        const redact = deepRedact(runtimeCase.options)

        expect(redact(runtimeCase.input)).toStrictEqual(runtimeCase.expectedOutput)
        expectTrackedPrecedenceCallCounts(runtimeCase, trackedSpies)
      },
    )

    it('proves same-layer exact string-path specificity with a retained parent path', () => {
      const fixture = getPrecedenceFixture('exact-string-path-specificity')
      const { runtimeCase, trackedSpies } = createTrackedPrecedenceRuntimeCase(fixture)

      expect(fixture.edges).toContainEqual({
        higher: 'exact string-path',
        lower: 'less specific exact string-path',
      })

      if (runtimeCase.outcome !== 'output') {
        throw new Error(`Fixture '${fixture.name}' is not an output fixture.`)
      }

      const redact = deepRedact(runtimeCase.options)

      expect(redact(runtimeCase.input)).toStrictEqual(runtimeCase.expectedOutput)
      expectTrackedPrecedenceCallCounts(runtimeCase, trackedSpies)
    })

    it('keeps the published precedence document in lockstep with the canonical fixture renderer', () => {
      expect(readFileSync(generatedFilePaths.precedenceDocPath, 'utf8')).toBe(buildGeneratedPrecedenceDocument())
    })
  })

  describe('Canonical nested mixed payload traversal', () => {
    it('redacts the canonical mixed payload in one pass while preserving untouched supported siblings', () => {
      const payload = createCanonicalMixedPayload()
      const originalPayload = structuredClone(payload)
      const expected = createCanonicalMixedPayloadExpectedResult()
      const { redact, keyCensor, substringReplacer } = createCanonicalMixedPayloadRedactor()
      const result = redact(payload)

      expect(result).toStrictEqual(expected)
      expect(result).not.toBe(payload)
      expect(payload).toStrictEqual(originalPayload)
      expect(keyCensor).toHaveBeenCalledTimes(2)
      expect(substringReplacer).toHaveBeenCalledTimes(2)
    })
  })

  it('redacts exact-key matches anywhere in nested payloads through keys', () => {
    const redact = deepRedact({
      keys: ['password'],
    })
    const payload = {
      password: 'root-secret',
      safe: 'visible',
      user: {
        password: 'nested-secret',
        profile: {
          password: 'leaf-secret',
          safe: 'still-visible',
        },
      },
    }

    expect(redact(payload)).toEqual({
      password: '[REDACTED]',
      safe: 'visible',
      user: {
        password: '[REDACTED]',
        profile: {
          password: '[REDACTED]',
          safe: 'still-visible',
        },
      },
    })
    expect(payload.user.profile.password).toBe('leaf-secret')
  })

  it('redacts regex-key matches anywhere in nested payloads while preserving siblings', () => {
    const redact = deepRedact({
      keys: [/password$/i],
    })
    const payload = {
      password: 'root-secret',
      passcode: 'visible-code',
      username: 'ben',
      user: {
        dbPassword: 'db-secret',
        passcode: 'nested-code',
        profile: {
          temporaryPassword: 'temporary-secret',
          safe: 'still-visible',
        },
      },
    }

    expect(redact(payload)).toEqual({
      password: '[REDACTED]',
      passcode: 'visible-code',
      username: 'ben',
      user: {
        dbPassword: '[REDACTED]',
        passcode: 'nested-code',
        profile: {
          temporaryPassword: '[REDACTED]',
          safe: 'still-visible',
        },
      },
    })
    expect(payload.user.profile.temporaryPassword).toBe('temporary-secret')
  })

  it('applies regex-key selectors to object elements inside arrays without matching array indexes', () => {
    const redact = deepRedact({
      keys: [/^0$/],
    })
    const payload = [
      'index-zero-secret',
      {
        0: 'property-zero-secret',
        safe: 'still-visible',
      },
    ]

    expect(redact(payload)).toEqual([
      'index-zero-secret',
      {
        0: '[REDACTED]',
        safe: 'still-visible',
      },
    ])
  })

  it('does not mutate caller-owned non-stateful RegExp key selectors across repeated redaction', () => {
    const passwordKey = /password$/i
    passwordKey.lastIndex = 7
    const redact = deepRedact({
      keys: [passwordKey],
    })
    const payload = {
      accountPassword: 'secret',
      safe: 'visible',
    }

    expect(redact(payload)).toEqual({
      accountPassword: '[REDACTED]',
      safe: 'visible',
    })
    expect(redact(payload)).toEqual({
      accountPassword: '[REDACTED]',
      safe: 'visible',
    })
    expect(passwordKey.lastIndex).toBe(7)
  })

  describe('Fuzzy and case-insensitive literal key matching', () => {
    it.each([
      [
        'rejects unsupported key-rule option names',
        { keys: [{ key: 'password', remove: true }] },
        /options\.keys\[0\]: unsupported option "remove"/i,
      ],
      [
        'rejects non-boolean fuzzyKeyMatch values',
        { keys: [{ key: 'password', fuzzyKeyMatch: 'yes' }] },
        /options\.keys\[0\]\.fuzzyKeyMatch: fuzzyKeyMatch must be a boolean/i,
      ],
      [
        'rejects non-boolean caseSensitiveKeyMatch values',
        { keys: [{ key: 'password', caseSensitiveKeyMatch: 'no' }] },
        /options\.keys\[0\]\.caseSensitiveKeyMatch: caseSensitiveKeyMatch must be a boolean/i,
      ],
      [
        'rejects empty key-rule key strings',
        { keys: [{ key: '' }] },
        /options\.keys\[0\]\.key: key must not be empty/i,
      ],
      [
        'rejects non-string key-rule key values',
        { keys: [{ key: /password/i }] },
        /options\.keys\[0\]\.key: key must be a string/i,
      ],
    ])('%s', (_label, options, expectedMessage) => {
      expect(() => deepRedact(options as never)).toThrow(expectedMessage)
    })

    it('defaults to exact case-sensitive matching for bare string key rules when no matching options are set', () => {
      const redact = deepRedact({
        keys: ['PassCode'],
      })

      expect(redact({
        PassCode: '[REDACTED]',
        passcode: 'visible-lower',
        passCode: 'visible-camel',
        'PASS-CODE': 'visible-kebab',
      })).toEqual({
        PassCode: '[REDACTED]',
        passcode: 'visible-lower',
        passCode: 'visible-camel',
        'PASS-CODE': 'visible-kebab',
      })
    })

    it('inherits root matching defaults and keeps local literal overrides isolated per rule', () => {
      const redact = deepRedact({
        censor: (_value: unknown, ctx: FunctionCensorContext) => `[${String(ctx.rulePath[0])}]`,
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: false,
        keys: [
          'pass_code',
          {
            key: 'ApiKey',
            caseSensitiveKeyMatch: true,
          },
        ],
      })

      expect(redact({
        passCode: 'global-a',
        'PASS-CODE': 'global-b',
        apikey: 'visible-local-miss',
        ApiKey: 'local-hit',
      })).toEqual({
        passCode: '[pass_code]',
        'PASS-CODE': '[pass_code]',
        apikey: 'visible-local-miss',
        ApiKey: '[ApiKey]',
      })
    })

    it('matches only exact case-sensitive literal keys when fuzzyKeyMatch is false and caseSensitiveKeyMatch is true', () => {
      const redact = deepRedact({
        censor: '[CASE-SENSITIVE-KEY]',
        keys: [{
          key: 'PassCode',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
        }],
      })

      expect(redact({
        PassCode: '[CASE-SENSITIVE-KEY]',
        passcode: 'visible-lower',
        passCode: 'visible-camel',
        'PASS-CODE': 'visible-kebab',
      })).toEqual({
        PassCode: '[CASE-SENSITIVE-KEY]',
        passcode: 'visible-lower',
        passCode: 'visible-camel',
        'PASS-CODE': 'visible-kebab',
      })
    })

    it('uses canonical equality for exact case-insensitive literal key matches', () => {
      const redact = deepRedact({
        censor: '[CASE-INSENSITIVE-KEY]',
        keys: [{
          key: 'pass_code',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: false,
        }],
      })

      expect(redact({
        pass_code: 'one',
        'pass-code': 'two',
        passCode: 'three',
        ' PASS_CODE ': 'four',
      })).toEqual({
        pass_code: '[CASE-INSENSITIVE-KEY]',
        'pass-code': '[CASE-INSENSITIVE-KEY]',
        passCode: '[CASE-INSENSITIVE-KEY]',
        ' PASS_CODE ': '[CASE-INSENSITIVE-KEY]',
      })
    })

    it('uses raw containment for fuzzy case-sensitive literal key matches', () => {
      const redact = deepRedact({
        censor: '[FUZZY-KEY]',
        keys: [{
          key: 'pass',
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: true,
        }],
      })

      expect(redact({
        password: 'lower-hit',
        passcode: 'camel-hit',
        Password: 'visible-upper',
      })).toEqual({
        password: '[FUZZY-KEY]',
        passcode: '[FUZZY-KEY]',
        Password: 'visible-upper',
      })
    })

    it('uses canonical containment for fuzzy case-insensitive literal key matches', () => {
      const redact = deepRedact({
        censor: '[FUZZY-KEY]',
        keys: [{
          key: 'pass_code',
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: false,
        }],
      })

      expect(redact({
        passcode: 'one',
        passCode: 'two',
        'PASS-CODE': 'three',
      })).toEqual({
        passcode: '[FUZZY-KEY]',
        passCode: '[FUZZY-KEY]',
        'PASS-CODE': '[FUZZY-KEY]',
      })
    })

    it('does not apply a literal key rule when the active matching settings do not match the payload key', () => {
      const redact = deepRedact({
        censor: '[NO-HIT]',
        keys: [{
          key: 'token',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
        }],
      })

      expect(redact({
        Token: 'visible-case-miss',
        tokenised: 'visible-fuzzy-miss',
      })).toEqual({
        Token: 'visible-case-miss',
        tokenised: 'visible-fuzzy-miss',
      })
    })

    it('does not change regex-key or path-selector semantics when literal matching defaults are enabled globally', () => {
      const redact = deepRedact({
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: false,
        censor: (_value: unknown, ctx: FunctionCensorContext) => ctx.rulePath[0] instanceof RegExp
          ? '[REGEX-KEY]'
          : '[PATH]',
        keys: [/Password$/],
        paths: [{
          path: 'account.Pass_Code',
          censor: '[PATH]',
        }],
      })

      expect(redact({
        account: {
          Pass_Code: 'path-hit',
          'pass-code': 'visible-path-miss',
        },
        record: {
          dbPassword: 'regex-hit',
          dbpassword: 'visible-regex-miss',
        },
      })).toEqual({
        account: {
          Pass_Code: '[PATH]',
          'pass-code': 'visible-path-miss',
        },
        record: {
          dbPassword: '[REGEX-KEY]',
          dbpassword: 'visible-regex-miss',
        },
      })
    })

    it('keeps fuzzy or case-insensitive literal hits in the exact-key tier beneath path rules and above regex-key and substring rules', () => {
      const redact = deepRedact({
        censor: (_value: unknown, ctx: FunctionCensorContext) => ctx.rulePath[0] instanceof RegExp
          ? '[REGEX-KEY]'
          : '[CASE-INSENSITIVE-KEY]',
        keys: [
          {
            key: 'pass_code',
            fuzzyKeyMatch: true,
            caseSensitiveKeyMatch: false,
          },
          /pass/i,
        ],
        paths: [{
          path: 'records.path.passCodeNote',
          censor: '[PATH-WIN]',
        }],
        stringTests: [{
          pattern: /token=\[[A-Z-]+\]/,
          replacer: (value: string) => value.replace(/token=\[[A-Z-]+\]/, 'token=[SUBSTRING]'),
        }],
      })

      expect(redact({
        records: {
          path: {
            passCodeNote: 'token=[PATH]',
          },
          literal: {
            passCodeNote: 'token=[FUZZY-KEY]',
          },
          substring: {
            note: 'token=[SUBSTRING]',
          },
        },
      })).toEqual({
        records: {
          path: {
            passCodeNote: '[PATH-WIN]',
          },
          literal: {
            passCodeNote: '[CASE-INSENSITIVE-KEY]',
          },
          substring: {
            note: 'token=[SUBSTRING]',
          },
        },
      })
    })

    it('surfaces the first matching configured literal key through FunctionCensorContext.rulePath when multiple literal rules match', () => {
      const contexts: FunctionCensorContext[] = []
      const redact = deepRedact({
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FIRST-LITERAL-WIN]'
        },
        keys: [
          {
            key: 'pass',
            fuzzyKeyMatch: true,
            caseSensitiveKeyMatch: true,
          },
          {
            key: 'pass_code',
            fuzzyKeyMatch: false,
            caseSensitiveKeyMatch: false,
          },
        ],
      })

      expect(redact({
        passCode: 'secret',
      })).toEqual({
        passCode: '[FIRST-LITERAL-WIN]',
      })
      expect(contexts).toHaveLength(1)
      expect(contexts[0]!.rulePath).toEqual(['pass'])
    })
  })

  it('canonicalises exact array-index paths across dot and bracket syntax', () => {
    const payload = {
      users: [
        { email: 'first@example.com', safe: 'keep' },
        { email: 'second@example.com', safe: 'keep-too' },
      ],
    }
    const expectedPayload = {
      users: [
        { email: '[REDACTED]', safe: 'keep' },
        { email: 'second@example.com', safe: 'keep-too' },
      ],
    }

    expect(deepRedact({ paths: ['users[0].email'] })(payload)).toEqual(expectedPayload)
    expect(deepRedact({ paths: ['users.0.email'] })(payload)).toEqual(expectedPayload)
  })

  it('accepts exact structured selectors and treats them like equivalent canonical exact paths', () => {
    const payload = {
      users: [
        { email: 'first@example.com', safe: 'keep' },
        { email: 'second@example.com', safe: 'keep-too' },
      ],
    }

    expect(deepRedact({
      paths: [
        ['users', 0, 'email'],
      ],
    })(payload)).toEqual({
      users: [
        { email: '[REDACTED]', safe: 'keep' },
        { email: 'second@example.com', safe: 'keep-too' },
      ],
    })
  })

  it('treats structured string segments as literal property keys, including numeric-looking and punctuation keys', () => {
    expect(deepRedact({
      paths: [
        ['users', '0', 'email'],
        ['headers', 'x-api-key'],
      ],
    })({
      users: {
        0: { email: 'zero@example.com', safe: 'keep-zero' },
        1: { email: 'one@example.com', safe: 'keep-one' },
      },
      headers: {
        'x-api-key': 'secret-token',
        safe: 'still-visible',
      },
    })).toEqual({
      users: {
        0: { email: '[REDACTED]', safe: 'keep-zero' },
        1: { email: 'one@example.com', safe: 'keep-one' },
      },
      headers: {
        'x-api-key': '[REDACTED]',
        safe: 'still-visible',
      },
    })
  })

  it('rejects duplicate canonical exact-path selectors during initialisation', () => {
    expect(() => deepRedact({
      paths: [
        'users[0].email',
        'users.0.email',
      ],
    })).toThrow(/duplicate canonical selector "users\.0\.email"/i)
  })

  it('rejects structured string selectors that duplicate equivalent quoted-property string selectors', () => {
    expect(() => deepRedact({
      paths: [
        'users["0"].email',
        ['users', '0', 'email'],
      ],
    })).toThrow(/duplicate canonical selector "users\["0"\]\.email"/i)
  })

  it('rejects duplicate dynamic selectors during initialisation', () => {
    expect(() => deepRedact({
      paths: [
        'users.*.email',
        'users.*.email',
      ],
    })).toThrow(/duplicate dynamic selector "users\.\*\.email"/i)
  })

  it('rejects duplicate regex dynamic selectors during initialisation', () => {
    expect(() => deepRedact({
      paths: [
        ['users', /^tenant-\d+$/i, 'token'],
        ['users', /^tenant-\d+$/i, 'token'],
      ],
    })).toThrow(/duplicate dynamic selector/i)
  })

  it('redacts one-level wildcard matches without touching deeper non-matching branches', () => {
    const redact = deepRedact({
      paths: ['users.*.email'],
    })

    expect(redact({
      users: {
        alice: { email: 'alice@example.com', safe: 'keep' },
        bob: { email: 'bob@example.com', safe: 'keep-too' },
        profile: {
          contact: {
            email: 'nested@example.com',
          },
        },
      },
    })).toEqual({
      users: {
        alice: { email: '[REDACTED]', safe: 'keep' },
        bob: { email: '[REDACTED]', safe: 'keep-too' },
        profile: {
          contact: {
            email: 'nested@example.com',
          },
        },
      },
    })
  })

  it('redacts recursive wildcard matches across zero, one, and many intermediate segments', () => {
    const redact = deepRedact({
      paths: ['account.**.token'],
    })

    expect(redact({
      account: {
        token: 'root-token',
        session: {
          token: 'session-token',
        },
        audit: {
          session: {
            token: 'audit-token',
          },
        },
        safe: true,
      },
    })).toEqual({
      account: {
        token: '[REDACTED]',
        session: {
          token: '[REDACTED]',
        },
        audit: {
          session: {
            token: '[REDACTED]',
          },
        },
        safe: true,
      },
    })
  })

  it('treats array indices as selector segments for wildcard rules', () => {
    const redact = deepRedact({
      paths: ['orders.*.cardNumber'],
    })

    expect(redact({
      orders: [
        { cardNumber: '4111111111111111', safe: true },
        { cardNumber: '5555555555554444', safe: false },
      ],
    })).toEqual({
      orders: [
        { cardNumber: '[REDACTED]', safe: true },
        { cardNumber: '[REDACTED]', safe: false },
      ],
    })
  })

  it('supports structured ignore selectors without redacting excluded siblings', () => {
    const redact = deepRedact({
      paths: [
        ['users', { ignore: 'admin' }, 'email'],
      ],
    })

    expect(redact({
      users: {
        admin: { email: 'admin@example.com', safe: 'keep-admin' },
        alice: { email: 'alice@example.com', safe: 'keep-alice' },
        0: { email: 'zero@example.com', safe: 'keep-zero' },
      },
    })).toEqual({
      users: {
        admin: { email: 'admin@example.com', safe: 'keep-admin' },
        alice: { email: '[REDACTED]', safe: 'keep-alice' },
        0: { email: '[REDACTED]', safe: 'keep-zero' },
      },
    })
  })

  it('redacts direct regex path-segment matches while preserving non-matching siblings', () => {
    const redact = deepRedact({
      paths: [
        ['tenants', /^tenant-\d+$/, 'token'],
      ],
    })

    expect(redact({
      tenants: {
        'tenant-100': { token: 'matching-token', safe: 'keep-matching' },
        'team-alpha': { token: 'team-token', safe: 'keep-team' },
      },
      safe: 'root-visible',
    })).toEqual({
      tenants: {
        'tenant-100': { token: '[REDACTED]', safe: 'keep-matching' },
        'team-alpha': { token: 'team-token', safe: 'keep-team' },
      },
      safe: 'root-visible',
    })
  })

  it('matches regex path segments against array indexes and numeric-looking object keys as text', () => {
    const redact = deepRedact({
      paths: [
        ['orders', /^\d+$/, 'cardNumber'],
        ['orderLookup', /^\d+$/, 'cardNumber'],
      ],
    })

    expect(redact({
      orders: [
        { cardNumber: '4111111111111111', safe: true },
        { cardNumber: '5555555555554444', safe: false },
      ],
      orderLookup: {
        0: { cardNumber: 'lookup-zero', safe: 'keep-zero' },
        summary: { cardNumber: 'summary-card', safe: 'keep-summary' },
      },
    })).toEqual({
      orders: [
        { cardNumber: '[REDACTED]', safe: true },
        { cardNumber: '[REDACTED]', safe: false },
      ],
      orderLookup: {
        0: { cardNumber: '[REDACTED]', safe: 'keep-zero' },
        summary: { cardNumber: 'summary-card', safe: 'keep-summary' },
      },
    })
  })

  it('supports regex ignore selectors without redacting excluded matching branches', () => {
    const redact = deepRedact({
      paths: [
        ['users', { ignore: /^internal/ }, 'token'],
      ],
    })

    expect(redact({
      users: {
        internalService: { token: 'internal-token', safe: 'keep-internal' },
        alice: { token: 'alice-token', safe: 'keep-alice' },
      },
    })).toEqual({
      users: {
        internalService: { token: 'internal-token', safe: 'keep-internal' },
        alice: { token: '[REDACTED]', safe: 'keep-alice' },
      },
    })
  })

  it('falls back to the library default censor when no explicit literal override is configured', () => {
    const redact = deepRedact({
      paths: ['user.password'],
    })
    const payload = {
      user: {
        password: 'secret-password',
        safe: 'still-visible',
      },
      safe: 'root-visible',
    }

    expect(redact(payload)).toEqual({
      user: {
        password: '[REDACTED]',
        safe: 'still-visible',
      },
      safe: 'root-visible',
    })
  })

  it('applies a global literal censor to exact-key, regex-key, exact-path, and dynamic-path matches', () => {
    const redact = deepRedact({
      censor: '[GLOBAL]',
      keys: ['password', /secret$/i],
      paths: [
        'account.token',
        'orders.*.cardNumber',
      ],
    })
    const payload = {
      password: 'root-password',
      nested: {
        apiSecret: 'nested-secret',
        safe: 'nested-safe',
      },
      account: {
        token: 'account-token',
        safe: 'account-safe',
      },
      orders: [
        { cardNumber: '4111111111111111', safe: true },
        { cardNumber: '5555555555554444', safe: false },
      ],
      safe: 'root-safe',
    }

    expect(redact(payload)).toEqual({
      password: '[GLOBAL]',
      nested: {
        apiSecret: '[GLOBAL]',
        safe: 'nested-safe',
      },
      account: {
        token: '[GLOBAL]',
        safe: 'account-safe',
      },
      orders: [
        { cardNumber: '[GLOBAL]', safe: true },
        { cardNumber: '[GLOBAL]', safe: false },
      ],
      safe: 'root-safe',
    })
  })

  it('lets a local path-rule censor override a broader global literal default without affecting siblings', () => {
    const redact = deepRedact({
      censor: '[GLOBAL]',
      paths: [
        'accounts.public.token',
        {
          path: 'accounts.internal.token',
          censor: '[LOCAL]',
        },
      ],
    })
    const payload = {
      accounts: {
        public: {
          token: 'public-token',
          safe: 'public-safe',
        },
        internal: {
          token: 'internal-token',
          safe: 'internal-safe',
        },
      },
      safe: 'root-safe',
    }

    expect(redact(payload)).toEqual({
      accounts: {
        public: {
          token: '[GLOBAL]',
          safe: 'public-safe',
        },
        internal: {
          token: '[LOCAL]',
          safe: 'internal-safe',
        },
      },
      safe: 'root-safe',
    })
  })

  it('removes exact-key and regex-key object properties without mutating the caller payload', () => {
    const redact = deepRedact({
      remove: true,
      keys: ['password', /token$/i],
    })
    const payload = {
      password: 'root-password',
      safe: 'root-safe',
      account: {
        accessToken: 'account-token',
        nested: {
          password: 'nested-password',
          safe: 'nested-safe',
        },
        safe: 'account-safe',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toStrictEqual({
      safe: 'root-safe',
      account: {
        nested: {
          safe: 'nested-safe',
        },
        safe: 'account-safe',
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('removes exact-path and dynamic-path object properties without mutating the caller payload', () => {
    const redact = deepRedact({
      paths: [
        {
          path: 'account.password',
          remove: true,
        },
        {
          path: 'services.*.accessToken',
          remove: true,
        },
      ],
    })
    const payload = {
      account: {
        password: 'root-password',
        safe: 'account-safe',
      },
      services: {
        api: {
          accessToken: 'api-token',
          safe: 'api-safe',
        },
        web: {
          accessToken: 'web-token',
          safe: 'web-safe',
        },
        summary: {
          safe: 'summary-safe',
        },
      },
      untouched: {
        password: 'still-visible',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toStrictEqual({
      account: {
        safe: 'account-safe',
      },
      services: {
        api: {
          safe: 'api-safe',
        },
        web: {
          safe: 'web-safe',
        },
        summary: {
          safe: 'summary-safe',
        },
      },
      untouched: {
        password: 'still-visible',
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('compacts removed array items from exact and dynamic path matches while preserving unrelated sparse holes', () => {
    const users = [
      { token: 'keep-first' },
      { token: 'remove-second' },
      ,
      { token: 'remove-fourth' },
      { token: 'keep-fifth' },
    ]
    const result = deepRedact({
      paths: [
        {
          path: 'users[1]',
          remove: true,
        },
        {
          path: ['users', /^3$/],
          remove: true,
        },
      ],
    })({ users }) as {
      users: Array<{ readonly token: string } | undefined>;
    }

    expect(result.users).toHaveLength(3)
    expect(result.users[0]).toEqual({ token: 'keep-first' })
    expect(1 in result.users).toBe(false)
    expect(result.users[2]).toEqual({ token: 'keep-fifth' })

    expect(users).toHaveLength(5)
    expect(2 in users).toBe(false)
    expect(users[1]).toEqual({ token: 'remove-second' })
    expect(users[3]).toEqual({ token: 'remove-fourth' })
  })

  it('retains matched path containers and redacts descendants with the compiled global literal censor', () => {
    const redact = deepRedact({
      censor: '[GLOBAL]',
      paths: [
        {
          path: 'accounts.public',
          retainStructure: true,
        },
      ],
    })
    const payload = {
      accounts: {
        public: {
          token: 'public-token',
          nested: {
            secret: 'public-secret',
          },
        },
        internal: {
          token: 'internal-token',
          nested: {
            secret: 'internal-secret',
          },
        },
      },
      safe: 'root-safe',
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      accounts: {
        public: {
          token: '[GLOBAL]',
          nested: {
            secret: '[GLOBAL]',
          },
        },
        internal: {
          token: 'internal-token',
          nested: {
            secret: 'internal-secret',
          },
        },
      },
      safe: 'root-safe',
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('retains exact-key and regex-key matched containers using the compiled global policy', () => {
    const redact = deepRedact({
      censor: '[HIDDEN]',
      retainStructure: true,
      keys: ['credentials', /Secrets$/],
    })
    const payload = {
      credentials: {
        token: 'credentials-token',
        nested: {
          password: 'credentials-password',
        },
      },
      tenantSecrets: {
        apiKey: 'tenant-api-key',
        nested: {
          value: 'tenant-secret',
        },
      },
      public: {
        token: 'public-token',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      credentials: {
        token: '[HIDDEN]',
        nested: {
          password: '[HIDDEN]',
        },
      },
      tenantSecrets: {
        apiKey: '[HIDDEN]',
        nested: {
          value: '[HIDDEN]',
        },
      },
      public: {
        token: 'public-token',
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('preserves the inherited key-rule policy when a descendant key independently matches a different key rule', () => {
    // Uses a function censor so that ctx.rulePath is observable: it will be 'parent'
    // for values under the parent container (inherited policy) and 'password' for
    // values matched directly by the password key rule.
    const redact = deepRedact({
      retainStructure: true,
      censor: (_value: unknown, ctx) => `[rule:${String(ctx.rulePath[0])}]`,
      keys: ['parent', 'password'],
    })
    const payload = {
      parent: {
        username: 'alice',
        password: 'secret',
      },
      other: {
        password: 'other-secret',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      parent: {
        username: '[rule:parent]',   // inherited policy from parent key rule
        password: '[rule:parent]',   // inherited policy, NOT [rule:password]
      },
      other: {
        password: '[rule:password]', // direct key match — no inherited policy
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('preserves the inherited exact-path policy when a descendant key independently matches a key rule', () => {
    const redact = deepRedact({
      censor: '[KEY]',
      keys: ['password'],
      paths: [
        {
          path: 'user',
          censor: '[PATH]',
          retainStructure: true,
        },
      ],
    })
    const payload = {
      user: {
        username: 'alice',
        password: 'secret',
      },
      other: {
        password: 'other-secret',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      user: {
        username: '[PATH]',  // inherited policy from exact-path rule
        password: '[PATH]',  // inherited policy, NOT [KEY]
      },
      other: {
        password: '[KEY]',   // direct key match — no inherited policy
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('propagates inherited key-rule policy through multiple nesting levels', () => {
    const redact = deepRedact({
      retainStructure: true,
      censor: (_value: unknown, ctx) => `[rule:${String(ctx.rulePath[0])}]`,
      keys: ['grandparent', 'parent', 'password'],
    })
    const payload = {
      grandparent: {
        parent: {
          password: 'secret',
          username: 'alice',
        },
        other: 'value',
      },
      parent: {
        password: 'other-secret',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      grandparent: {
        parent: {
          password: '[rule:grandparent]',  // inherited from grandparent through two levels
          username: '[rule:grandparent]',
        },
        other: '[rule:grandparent]',
      },
      parent: {
        password: '[rule:parent]',         // direct match at root — no grandparent policy
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('preserves the inherited regex-key policy when a descendant key independently matches a different key rule', () => {
    const redact = deepRedact({
      retainStructure: true,
      censor: (_value: unknown, ctx) => `[rule:${String(ctx.rulePath[0])}]`,
      keys: [/^secret/i, 'password'],
    })
    const payload = {
      secretData: {
        username: 'alice',
        password: 'hidden',
      },
      other: {
        password: 'other-secret',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      secretData: {
        username: `[rule:${String(/^secret/i)}]`,  // inherited regex-key policy
        password: `[rule:${String(/^secret/i)}]`,  // inherited policy, NOT [rule:password]
      },
      other: {
        password: '[rule:password]',               // direct key match — no inherited policy
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('allows an exact-path descendant rule to override an inherited key-rule policy', () => {
    const redact = deepRedact({
      retainStructure: true,
      censor: '[KEY]',
      keys: ['parent'],
      paths: [
        {
          path: 'parent.password',
          censor: '[PATH]',
        },
      ],
    })
    const payload = {
      parent: {
        username: 'alice',
        password: 'secret',
      },
    }
    const originalPayload = structuredClone(payload)

    expect(redact(payload)).toEqual({
      parent: {
        username: '[KEY]',   // inherited key-rule policy
        password: '[PATH]',  // exact-path rule takes precedence over inherited key-rule policy
      },
    })
    expect(payload).toStrictEqual(originalPayload)
  })

  it('gives exact-path rules precedence over exact-key rules on the same leaf', () => {
    const redact = deepRedact({
      censor: '[KEY]',
      keys: ['token'],
      paths: [
        {
          path: 'user.token',
          censor: '[PATH]',
        },
      ],
    })

    expect(redact({
      user: {
        token: 'secret-token',
      },
    })).toEqual({
      user: {
        token: '[PATH]',
      },
    })
  })

  it('gives exact-path rules precedence over regex-key matches on the same leaf', () => {
    const redact = deepRedact({
      censor: '[KEY]',
      keys: [/password/i],
      paths: [
        {
          path: 'user.passwordHash',
          censor: '[PATH]',
        },
      ],
    })

    expect(redact({
      user: {
        passwordHash: 'secret-hash',
      },
    })).toEqual({
      user: {
        passwordHash: '[PATH]',
      },
    })
  })

  it('gives exact-path rules precedence over wildcard matches on the same leaf', () => {
    const redact = deepRedact({
      paths: [
        {
          path: 'users.admin.email',
          censor: '[EXACT]',
        },
        {
          path: 'users.*.email',
          censor: '[WILDCARD]',
        },
      ],
    })

    expect(redact({
      users: {
        admin: { email: 'admin@example.com' },
        alice: { email: 'alice@example.com' },
      },
    })).toEqual({
      users: {
        admin: { email: '[EXACT]' },
        alice: { email: '[WILDCARD]' },
      },
    })
  })

  it('gives exact-path rules precedence over regex path-segment matches on the same leaf', () => {
    const redact = deepRedact({
      paths: [
        {
          path: 'users.admin.token',
          censor: '[EXACT]',
        },
        {
          path: ['users', /^(admin|alice)$/, 'token'],
          censor: '[REGEX-PATH]',
        },
      ],
    })

    expect(redact({
      users: {
        admin: { token: 'admin-token' },
        alice: { token: 'alice-token' },
      },
    })).toEqual({
      users: {
        admin: { token: '[EXACT]' },
        alice: { token: '[REGEX-PATH]' },
      },
    })
  })

  it('gives dynamic path rules precedence over regex-key matches on the same leaf', () => {
    const redact = deepRedact({
      censor: '[KEY]',
      keys: [/password/i],
      paths: [
        {
          path: ['users', { ignore: 'admin' }, 'password'],
          censor: '[PATH]',
        },
      ],
    })

    expect(redact({
      users: {
        admin: { password: 'admin-secret', safe: 'keep-admin' },
        alice: { password: 'alice-secret', safe: 'keep-alice' },
      },
    })).toEqual({
      users: {
        admin: { password: '[KEY]', safe: 'keep-admin' },
        alice: { password: '[PATH]', safe: 'keep-alice' },
      },
    })
  })

  it('gives regex path-segment rules precedence over regex-key matches on the same leaf', () => {
    const redact = deepRedact({
      censor: '[KEY]',
      keys: [/token$/i],
      paths: [
        {
          path: ['users', /^alice$/, 'accessToken'],
          censor: '[REGEX-PATH]',
        },
      ],
    })

    expect(redact({
      users: {
        alice: { accessToken: 'alice-token' },
        bob: { accessToken: 'bob-token' },
      },
    })).toEqual({
      users: {
        alice: { accessToken: '[REGEX-PATH]' },
        bob: { accessToken: '[KEY]' },
      },
    })
  })

  it('lets a more specific regex path rule outrank an inherited retained parent path policy', () => {
    const redact = deepRedact({
      paths: [
        {
          path: 'accounts.*',
          censor: '[PARENT]',
          retainStructure: true,
        },
        {
          path: ['accounts', /^tenant-\d+$/, 'token'],
          censor: '[CHILD]',
        },
      ],
    })

    expect(redact({
      accounts: {
        'tenant-100': { token: 'tenant-token', safe: 'tenant-safe' },
        public: { token: 'public-token', safe: 'public-safe' },
      },
    })).toEqual({
      accounts: {
        'tenant-100': { token: '[CHILD]', safe: '[PARENT]' },
        public: { token: '[PARENT]', safe: '[PARENT]' },
      },
    })
  })

  it('does not mutate caller-owned non-stateful RegExp path selectors across repeated redaction', () => {
    const tenantPattern = /^tenant-\d+$/i
    const internalPattern = /^internal/
    tenantPattern.lastIndex = 7
    internalPattern.lastIndex = 5
    const redact = deepRedact({
      paths: [
        ['tenants', tenantPattern, 'token'],
        ['users', { ignore: internalPattern }, 'token'],
      ],
    })
    const payload = {
      tenants: {
        'tenant-100': { token: 'tenant-token' },
      },
      users: {
        internalService: { token: 'internal-token' },
        alice: { token: 'alice-token' },
      },
    }

    expect(redact(payload)).toEqual({
      tenants: {
        'tenant-100': { token: '[REDACTED]' },
      },
      users: {
        internalService: { token: 'internal-token' },
        alice: { token: '[REDACTED]' },
      },
    })
    expect(redact(payload)).toEqual({
      tenants: {
        'tenant-100': { token: '[REDACTED]' },
      },
      users: {
        internalService: { token: 'internal-token' },
        alice: { token: '[REDACTED]' },
      },
    })
    expect(tenantPattern.lastIndex).toBe(7)
    expect(internalPattern.lastIndex).toBe(5)
  })

  it('preserves non-targeted siblings while applying exact paths and exact keys in one pass', () => {
    const redact = deepRedact({
      keys: ['password'],
      paths: ['users[0].token'],
    })

    expect(redact({
      account: {
        email: 'ben@example.com',
        password: 'root-password',
      },
      users: [
        { token: 'first-token', safe: 'first-safe' },
        { token: 'second-token', safe: 'second-safe' },
      ],
    })).toEqual({
      account: {
        email: 'ben@example.com',
        password: '[REDACTED]',
      },
      users: [
        { token: '[REDACTED]', safe: 'first-safe' },
        { token: 'second-token', safe: 'second-safe' },
      ],
    })
  })

  it('does not confuse root payload keys with inherited lookup-table properties', () => {
    const redact = deepRedact({
      keys: ['password'],
    })

    expect(redact({
      safe: true,
      toString: 'not-a-rule',
    })).toEqual({
      safe: true,
      toString: 'not-a-rule',
    })
  })

  it('redacts exact __proto__ path matches without mutating internal lookup prototypes', () => {
    const payload: Record<string, unknown> = {}
    Object.defineProperty(payload, '__proto__', {
      configurable: true,
      enumerable: true,
      value: 'secret',
      writable: true,
    })
    const result = deepRedact({
      paths: ['__proto__'],
    })(payload) as Record<string, unknown>

    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true)
    expect(result.__proto__).toBe('[REDACTED]')
  })

  it('preserves sparse array holes when unrelated elements are redacted', () => {
    const users = [
      { token: 'first-token' },
      ,
      { safe: true },
    ]
    const result = deepRedact({
      paths: ['users[0].token'],
    })({ users }) as {
      users: Array<{ readonly safe?: boolean; readonly token?: string } | undefined>;
    }

    expect(result.users).toHaveLength(3)
    expect(1 in result.users).toBe(false)
    expect(result.users[0]).toEqual({ token: '[REDACTED]' })
    expect(result.users[2]).toEqual({ safe: true })
  })
})

describe('Built-in and custom transformer resolution', () => {
  it('returns the public built-in output shapes for supported root runtime values', () => {
    const bigintValue = 42n
    const dateValue = new Date('2026-01-02T03:04:05.000Z')
    const errorValue = createStoryError('top-secret')
    const mapValue = new Map<string, unknown>([
      ['password', 'secret'],
      ['count', 2],
    ])
    const regexValue = /token/gi
    const setValue = new Set<unknown>(['visible', 7])
    const urlValue = new URL('https://example.com/private?token=secret')
    const redact = deepRedact({})

    expect(redact(bigintValue)).toEqual(buildBigInt(bigintValue))
    expect(redact(dateValue)).toEqual(buildDate(dateValue))
    expect(redact(errorValue)).toEqual(buildError(errorValue))
    expect(redact(mapValue)).toEqual(buildMap(mapValue))
    expect(redact(regexValue)).toEqual(buildRegex(regexValue))
    expect(redact(setValue)).toEqual(buildSet(setValue))
    expect(redact(urlValue)).toEqual(buildUrl(urlValue))
  })

  it('transforms supported nested runtime values and continues descendant redaction through their plain representations', () => {
    const dateValue = new Date('2026-01-02T03:04:05.000Z')
    const errorValue = createStoryError('token=secret')
    const regexValue = /token/gi
    const urlValue = new URL('https://example.com/private?token=secret')
    const payload = {
      runtime: {
        bigint: 42n,
        date: dateValue,
        error: errorValue,
        map: new Map<string, unknown>([
          ['password', 'secret'],
          ['nested', { secret: 'value' }],
        ]),
        regex: regexValue,
        set: new Set<unknown>([
          { password: 'secret' },
          'visible',
        ]),
        url: urlValue,
      },
    }
    const redact = deepRedact({
      paths: [
        'runtime.bigint.value.number',
        'runtime.error.value.message',
        'runtime.map.value.password',
        'runtime.map.value.nested.secret',
        'runtime.regex.value.source',
        'runtime.set.value.0.password',
        'runtime.url.value',
      ],
    })

    expect(redact(payload)).toEqual({
      runtime: {
        bigint: {
          _transformer: 'bigint',
          value: {
            radix: 10,
            number: '[REDACTED]',
          },
        },
        date: buildDate(dateValue),
        error: {
          _transformer: 'error',
          value: {
            type: 'StoryTransformerError',
            message: '[REDACTED]',
            stack: errorValue.stack,
          },
        },
        map: {
          _transformer: 'map',
          value: {
            password: '[REDACTED]',
            nested: {
              secret: '[REDACTED]',
            },
          },
        },
        regex: {
          _transformer: 'regex',
          value: {
            source: '[REDACTED]',
            flags: 'gi',
          },
        },
        set: {
          _transformer: 'set',
          value: [
            {
              password: '[REDACTED]',
            },
            'visible',
          ],
        },
        url: {
          _transformer: 'url',
          value: '[REDACTED]',
        },
      },
    })
  })

  it('keeps whole-value rule precedence when a transformed branch is already claimed by an existing terminal rule', () => {
    const redact = deepRedact({
      keys: ['map'],
      paths: ['map.value.password'],
    })

    expect(redact({
      map: new Map<string, unknown>([
        ['password', 'secret'],
      ]),
    })).toEqual({
      map: '[REDACTED]',
    })
  })

  it('reuses the circular and revisit seam inside transformed representations', () => {
    const shared = {
      secret: 'value',
    }
    const payload = new Map<string, unknown>([
      ['left', shared],
      ['right', shared],
    ])
    payload.set('self', payload)
    const redact = deepRedact({
      censor: (_value, context) => String(context.matchedPath.join('.')),
      paths: [
        'value.left.secret',
        'value.right.secret',
      ],
    })

    expect(redact(payload)).toEqual({
      _transformer: 'map',
      value: {
        left: {
          secret: 'value.left.secret',
        },
        right: {
          secret: 'value.right.secret',
        },
        self: circularMarker('value.self'),
      },
    })
  })

  it('prefers byType over byConstructor and fallback for supported object values', () => {
    const byType = vi.fn((value: unknown) => {
      if (!(value instanceof Date)) {
        return value
      }

      return {
        bucket: 'byType',
        iso: value.toISOString(),
      }
    })
    const byConstructor = vi.fn((value: unknown) => ({
      bucket: 'byConstructor',
      iso: (value as Date).toISOString(),
    }))
    const fallback = vi.fn((value: unknown) => ({
      bucket: 'fallback',
      value: String(value),
    }))
    const dateValue = new Date('2026-01-02T03:04:05.000Z')
    const redact = deepRedact({
      transformers: {
        byType: {
          object: [byType],
        },
        byConstructor: {
          Date: [byConstructor],
        },
        fallback: [fallback],
      },
    })

    expect(redact(dateValue)).toEqual({
      bucket: 'byType',
      iso: dateValue.toISOString(),
    })
    expect(byType).toHaveBeenCalledTimes(1)
    expect(byConstructor).not.toHaveBeenCalled()
    expect(fallback).not.toHaveBeenCalled()
  })

  it('prefers byConstructor over fallback when higher-precedence buckets leave the value unchanged', () => {
    const byType = vi.fn((value: unknown) => value)
    const byConstructor = vi.fn((value: unknown) => ({
      bucket: 'byConstructor',
      href: (value as URL).href,
    }))
    const fallback = vi.fn((value: unknown) => ({
      bucket: 'fallback',
      value: String(value),
    }))
    const urlValue = new URL('https://example.com/private?token=secret')
    const redact = deepRedact({
      transformers: {
        byType: {
          object: [byType],
        },
        byConstructor: {
          URL: [byConstructor],
        },
        fallback: [fallback],
      },
    })

    expect(redact(urlValue)).toEqual({
      bucket: 'byConstructor',
      href: urlValue.href,
    })
    expect(byType).toHaveBeenCalledTimes(1)
    expect(byConstructor).toHaveBeenCalledTimes(1)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('uses declaration order within a bucket and short-circuits after the first custom transformer that changes the value', () => {
    const first = vi.fn((value: unknown) => value)
    const second = vi.fn((value: unknown) => ({
      bucket: 'second',
      number: (value as bigint).toString(10),
    }))
    const third = vi.fn((value: unknown) => ({
      bucket: 'third',
      value: String(value),
    }))
    const fallback = vi.fn((value: unknown) => ({
      bucket: 'fallback',
      value: String(value),
    }))
    const redact = deepRedact({
      transformers: {
        byType: {
          bigint: [first, second, third],
        },
        fallback: [fallback],
      },
    })

    expect(redact(42n)).toEqual({
      bucket: 'second',
      number: '42',
    })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(third).not.toHaveBeenCalled()
    expect(fallback).not.toHaveBeenCalled()
  })

  it('falls back to the built-in transformer only when earlier user transformers leave the supported value unchanged', () => {
    const first = vi.fn((value: unknown) => value)
    const second = vi.fn((value: unknown) => value)
    const fallback = vi.fn((value: unknown) => ({
      bucket: 'fallback',
      value: String(value),
    }))
    const redact = deepRedact({
      transformers: {
        byType: {
          bigint: [first, second],
        },
        fallback: [fallback],
      },
    })

    expect(redact(42n)).toEqual(buildBigInt(42n))
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('does not apply byType.object transformers to ordinary plain objects or arrays', () => {
    const byTypeObject = vi.fn((value: unknown) => ({
      transformed: true,
      value,
    }))
    const payload = {
      list: [
        { password: 'secret' },
      ],
      plain: {
        password: 'secret',
      },
    }
    const redact = deepRedact({
      transformers: {
        byType: {
          object: [byTypeObject],
        },
      },
    })

    expect(redact(payload)).toBe(payload)
    expect(byTypeObject).not.toHaveBeenCalled()
  })
})

describe('Ignored value types suppress descendant redaction inside transformed runtime values', () => {
  it('keeps the safe transformed root output for ignored bigint values', () => {
    const redact = deepRedact({
      ignoredValueTypes: {
        bigint: true,
      },
      keys: ['number'],
      paths: ['value.number'],
    })

    expect(redact(42n)).toEqual(buildBigInt(42n))
  })

  it('keeps the safe transformed root output for ignored date values', () => {
    const dateValue = new Date('2026-01-02T03:04:05.000Z')
    const redact = deepRedact({
      ignoredValueTypes: {
        Date: true,
      },
      keys: ['datetime'],
    })

    expect(redact(dateValue)).toEqual(buildDate(dateValue))
  })

  it('keeps the safe transformed root output for ignored map values', () => {
    const mapValue = new Map<string, unknown>([
      ['password', 'secret'],
      ['count', 2],
    ])
    const redact = deepRedact({
      ignoredValueTypes: {
        Map: true,
      },
      paths: ['value.password'],
    })

    expect(redact(mapValue)).toEqual(buildMap(mapValue))
  })

  it('keeps the safe transformed root output for ignored regular expression values', () => {
    const regexValue = /token=secret/gi
    const redact = deepRedact({
      ignoredValueTypes: {
        RegExp: true,
      },
      paths: ['value.source'],
      stringTests: [/secret/g],
    })

    expect(redact(regexValue)).toEqual(buildRegex(regexValue))
  })

  it('locks the ignore decision to the raw supported value before a custom transformer changes the output shape', () => {
    const redact = deepRedact({
      ignoredValueTypes: {
        Map: true,
      },
      paths: ['branch.custom.password'],
      transformers: {
        byConstructor: {
          Map: [
            (value: unknown) => {
              if (!(value instanceof Map)) {
                return value
              }

              return {
                custom: {
                  password: String(value.get('password')),
                  safe: true,
                },
              }
            },
          ],
        },
      },
    })

    expect(redact({
      branch: new Map<string, unknown>([
        ['password', 'secret'],
      ]),
    })).toEqual({
      branch: {
        custom: {
          password: 'secret',
          safe: true,
        },
      },
    })
  })

  it('suppresses descendant redaction only for matching branches and keeps non-matching siblings on the normal traversal path', () => {
    const ignoredMap = new Map<string, unknown>([
      ['password', 'secret'],
      ['nested', { secret: 'value' }],
    ])
    const redact = deepRedact({
      ignoredValueTypes: {
        Map: true,
      },
      paths: [
        'ignored.value.password',
        'ignored.value.nested.secret',
        'active.value.number',
      ],
    })

    expect(redact({
      active: 42n,
      ignored: ignoredMap,
    })).toEqual({
      active: {
        _transformer: 'bigint',
        value: {
          radix: 10,
          number: '[REDACTED]',
        },
      },
      ignored: buildMap(ignoredMap),
    })
  })

  it('keeps whole-value rule precedence when an ignored transformed branch is already claimed by a terminal rule', () => {
    const redact = deepRedact({
      ignoredValueTypes: {
        Map: true,
      },
      keys: ['map'],
      paths: ['map.value.password'],
    })

    expect(redact({
      map: new Map<string, unknown>([
        ['password', 'secret'],
      ]),
    })).toEqual({
      map: '[REDACTED]',
    })
  })

  it('does not run descendant redaction inside ignored map, set, and error branches', () => {
    const errorValue = createStoryError('token=secret')
    const mapValue = new Map<string, unknown>([
      ['password', 'secret'],
      ['nested', { secret: 'value' }],
    ])
    const setValue = new Set<unknown>([
      { password: 'secret' },
      'visible',
    ])
    const redact = deepRedact({
      ignoredValueTypes: {
        Error: true,
        Map: true,
        Set: true,
      },
      paths: [
        'runtime.error.value.message',
        'runtime.map.value.password',
        'runtime.map.value.nested.secret',
        'runtime.set.value.0.password',
      ],
    })

    expect(redact({
      runtime: {
        error: errorValue,
        map: mapValue,
        set: setValue,
      },
    })).toEqual({
      runtime: {
        error: buildError(errorValue),
        map: buildMap(mapValue),
        set: buildSet(setValue),
      },
    })
  })

  it('does not apply substring rules inside ignored transformed representations', () => {
    const urlValue = new URL('https://example.com/private?token=secret')
    const redact = deepRedact({
      ignoredValueTypes: {
        URL: true,
      },
      stringTests: [/token=[^&\s]+/g],
    })

    expect(redact(urlValue)).toEqual(buildUrl(urlValue))
  })

  it('preserves circular markers inside ignored map and set transformed output', () => {
    const mapValue = new Map<string, unknown>()
    mapValue.set('self', mapValue)
    const setValue = new Set<unknown>()
    setValue.add(setValue)
    const redact = deepRedact({
      ignoredValueTypes: {
        Map: true,
        Set: true,
      },
    })

    expect(redact({
      map: mapValue,
      set: setValue,
    })).toEqual({
      map: {
        _transformer: 'map',
        value: {
          self: circularMarker('map.value.self', 'map'),
        },
      },
      set: {
        _transformer: 'set',
        value: [
          circularMarker('set.value.0', 'set'),
        ],
      },
    })
  })
})

describe('Nested runtime failures degrade locally to [UNSUPPORTED] with structured diagnostics', () => {
  const unsupportedMessage = 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].'

  const createDiagnosticSink = () => {
    const events: DiagnosticEvent[] = []
    const sink = vi.fn((event: DiagnosticEvent) => {
      events.push(event)
    })

    return {
      events,
      sink,
    }
  }

  const expectFailureEvent = (
    event: DiagnosticEvent,
    options: {
      readonly errorName: string;
      readonly path: string;
      readonly stage: string;
      readonly valueType: string;
    },
  ) => {
    expect(Object.keys(event).sort()).toEqual([
      'details',
      'event',
      'message',
      'path',
      'valueType',
    ])
    expect(event).toEqual(expect.objectContaining({
      event: 'redaction.failure',
      path: options.path,
      valueType: options.valueType,
      message: unsupportedMessage,
      details: expect.objectContaining({
        errorName: options.errorName,
        stage: options.stage,
      }),
    }))

    const serialisedEvent = JSON.stringify(event)
    expect(serialisedEvent).not.toMatch(/token=secret|password=secret|password=hunter2/i)
    expect(serialisedEvent).not.toMatch(/\[REDACTED\]/)
  }

  it('degrades a failing transformed branch locally while transformed, circular, revisited, and ignored siblings continue', () => {
    const { events, sink } = createDiagnosticSink()
    const circularPayload: Record<string, unknown> = {
      safe: 'visible',
    }
    const repeated = {
      safe: 'visible',
      token: 'secret',
    }
    const failingMap = new Map<string, unknown>([
      ['password', 'secret'],
    ])
    const ignoredMap = new Map<string, unknown>([
      ['password', 'secret'],
    ])
    circularPayload.self = circularPayload

    const redact = deepRedact({
      diagnostics: { sink },
      ignoredValueTypes: {
        Map: true,
      },
      keys: ['token'],
      transformers: {
        byConstructor: {
          Map: [
            (value: unknown) => {
              if (value === failingMap) {
                throw createStoryError('token=secret')
              }

              return value
            },
          ],
        },
      },
    })

    expect(redact({
      active: 42n,
      circular: circularPayload,
      failing: failingMap,
      ignored: ignoredMap,
      repeat: {
        first: repeated,
        second: repeated,
      },
    })).toEqual({
      active: buildBigInt(42n),
      circular: {
        safe: 'visible',
        self: circularMarker('circular.self', 'circular'),
      },
      failing: '[UNSUPPORTED]',
      ignored: buildMap(ignoredMap),
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
    })

    expect(events).toHaveLength(1)
    expectFailureEvent(events[0]!, {
      errorName: 'StoryTransformerError',
      path: 'failing',
      stage: 'transformer',
      valueType: 'Map',
    })
  })

  it('keeps object properties and array positions occupied when function censors fail', () => {
    const { events, sink } = createDiagnosticSink()
    const censor = vi.fn((_value: unknown, context: FunctionCensorContext) => {
      const path = context.matchedPath.join('.')

      if (path === 'profile.secret' || path === 'aliases.1') {
        throw createStoryError('password=hunter2')
      }

      return '[REDACTED]'
    })
    const redact = deepRedact({
      diagnostics: { sink },
      paths: [
        {
          path: 'profile.secret',
          censor,
        },
        {
          path: 'aliases.1',
          censor,
        },
      ],
    })

    expect(redact({
      aliases: ['first', 'second', 'third'],
      profile: {
        safe: 'visible',
        secret: 'alpha',
      },
    })).toEqual({
      aliases: ['first', '[UNSUPPORTED]', 'third'],
      profile: {
        safe: 'visible',
        secret: '[UNSUPPORTED]',
      },
    })

    expect(censor).toHaveBeenCalledTimes(2)
    expect(events).toHaveLength(2)
    expectFailureEvent(events[0]!, {
      errorName: 'StoryTransformerError',
      path: 'aliases.1',
      stage: 'censor',
      valueType: 'string',
    })
    expectFailureEvent(events[1]!, {
      errorName: 'StoryTransformerError',
      path: 'profile.secret',
      stage: 'censor',
      valueType: 'string',
    })
  })

  it('degrades only the matching string node when a structured substring replacer throws', () => {
    const { events, sink } = createDiagnosticSink()
    const redact = deepRedact({
      diagnostics: { sink },
      paths: ['session.token'],
      stringTests: [
        {
          pattern: /token=[^&\s]+/g,
          replacer: () => {
            throw createStoryError('token=secret')
          },
        },
      ],
    })

    expect(redact({
      safe: 'visible',
      session: {
        token: 'secret',
      },
      unsafe: {
        text: 'prefix token=secret suffix',
      },
    })).toEqual({
      safe: 'visible',
      session: {
        token: '[REDACTED]',
      },
      unsafe: {
        text: '[UNSUPPORTED]',
      },
    })

    expect(events).toHaveLength(1)
    expectFailureEvent(events[0]!, {
      errorName: 'StoryTransformerError',
      path: 'unsafe.text',
      stage: 'substring-replacer',
      valueType: 'string',
    })
  })

  it('keeps the parent object present when a nested getter throws during traversal even without a diagnostics sink', () => {
    const nested: Record<string, unknown> = {
      safe: 'visible',
    }
    let result: unknown

    Object.defineProperty(nested, 'secret', {
      enumerable: true,
      get() {
        throw createStoryError('token=secret')
      },
    })

    const redact = deepRedact({
      paths: ['account.token'],
    })

    expect(() => {
      result = redact({
        account: {
          token: 'secret',
        },
        nested,
      })
    }).not.toThrow()
    expect(result).toEqual({
      account: {
        token: '[REDACTED]',
      },
      nested: {
        safe: 'visible',
        secret: '[UNSUPPORTED]',
      },
    })
  })

  it('emits one structured diagnostic per failing path when a failed identity is revisited', () => {
    const { events, sink } = createDiagnosticSink()
    const shared: Record<string, unknown> = {
      safe: 'visible',
    }

    Object.defineProperty(shared, 'secret', {
      enumerable: true,
      get() {
        throw createStoryError('token=secret')
      },
    })

    const redact = deepRedact({
      diagnostics: { sink },
    })

    expect(redact({
      first: shared,
      second: shared,
    })).toEqual({
      first: {
        safe: 'visible',
        secret: '[UNSUPPORTED]',
      },
      second: {
        safe: 'visible',
        secret: '[UNSUPPORTED]',
      },
    })

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.path).sort()).toEqual([
      'first.secret',
      'second.secret',
    ])
    expectFailureEvent(events.find((event) => event.path === 'first.secret')!, {
      errorName: 'StoryTransformerError',
      path: 'first.secret',
      stage: 'traversal-read',
      valueType: 'getter',
    })
    expectFailureEvent(events.find((event) => event.path === 'second.secret')!, {
      errorName: 'StoryTransformerError',
      path: 'second.secret',
      stage: 'traversal-read',
      valueType: 'getter',
    })
  })

  it('degrades a hostile nested object without rethrowing when diagnostics cannot inspect its type safely', () => {
    const { events, sink } = createDiagnosticSink()
    const hostile = new Proxy<Record<string, unknown>>({}, {
      get(target, property, receiver) {
        if (property === 'constructor') {
          throw createStoryError('token=secret')
        }

        return Reflect.get(target, property, receiver)
      },
      getOwnPropertyDescriptor() {
        return {
          configurable: true,
          enumerable: true,
        }
      },
      ownKeys() {
        throw createStoryError('password=secret')
      },
    })
    let result: unknown

    const redact = deepRedact({
      diagnostics: { sink },
      paths: ['account.token'],
    })

    expect(() => {
      result = redact({
        account: {
          token: 'secret',
        },
        hostile,
      })
    }).not.toThrow()
    expect(result).toEqual({
      account: {
        token: '[REDACTED]',
      },
      hostile: '[UNSUPPORTED]',
    })

    expect(events).toHaveLength(1)
    expectFailureEvent(events[0]!, {
      errorName: 'StoryTransformerError',
      path: 'hostile',
      stage: 'traversal-read',
      valueType: 'object',
    })
  })

  it('degrades each failing node independently and emits one structured event per path in a single call', () => {
    const { events, sink } = createDiagnosticSink()
    const failingMap = new Map<string, unknown>([
      ['password', 'secret'],
    ])
    const getterBranch: Record<string, unknown> = {
      safe: 'visible',
    }

    Object.defineProperty(getterBranch, 'secret', {
      enumerable: true,
      get() {
        throw createStoryError('token=secret')
      },
    })

    const redact = deepRedact({
      diagnostics: { sink },
      paths: ['stable.token'],
      stringTests: [
        {
          pattern: /password=[^&\s]+/g,
          replacer: () => {
            throw createStoryError('password=secret')
          },
        },
      ],
      transformers: {
        byConstructor: {
          Map: [
            (value: unknown) => {
              if (value === failingMap) {
                throw createStoryError('token=secret')
              }

              return value
            },
          ],
        },
      },
    })

    expect(redact({
      failingMap,
      getterBranch,
      notes: {
        text: 'prefix password=secret suffix',
      },
      stable: {
        token: 'secret',
      },
      transformed: 42n,
    })).toEqual({
      failingMap: '[UNSUPPORTED]',
      getterBranch: {
        safe: 'visible',
        secret: '[UNSUPPORTED]',
      },
      notes: {
        text: '[UNSUPPORTED]',
      },
      stable: {
        token: '[REDACTED]',
      },
      transformed: buildBigInt(42n),
    })

    expect(events).toHaveLength(3)
    expect(events.map((event) => event.path).sort()).toEqual([
      'failingMap',
      'getterBranch.secret',
      'notes.text',
    ])
    expect(new Set(events.map((event) => event.path)).size).toBe(3)
    expectFailureEvent(events[0]!, {
      errorName: 'StoryTransformerError',
      path: 'failingMap',
      stage: 'transformer',
      valueType: 'Map',
    })
    expectFailureEvent(events[1]!, {
      errorName: 'StoryTransformerError',
      path: 'getterBranch.secret',
      stage: 'traversal-read',
      valueType: 'getter',
    })
    expectFailureEvent(events[2]!, {
      errorName: 'StoryTransformerError',
      path: 'notes.text',
      stage: 'substring-replacer',
      valueType: 'string',
    })
  })
})

describe('Circular references and revisited identities', () => {
  const circularMarker = (path: string, value = '') => ({
    _transformer: 'circular',
    path,
    value,
  })

  const createObjectSelfReferenceFixture = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      safe: 'visible',
    }

    payload.self = payload

    return payload
  }

  const createArraySelfReferenceFixture = (): unknown[] => {
    const payload: unknown[] = ['visible']
    payload.push(payload)

    return payload
  }

  const createObjectInArrayCycleFixture = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      records: [{
        safe: 'visible',
      }],
    }
    const records = payload.records as Array<Record<string, unknown>>
    records[0]!.parent = records

    return payload
  }

  const createArrayInObjectCycleFixture = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      wrapper: {
        items: [],
        safe: 'visible',
      },
    }
    const wrapper = payload.wrapper as { items: unknown[]; safe: string }
    wrapper.items.push(wrapper)

    return payload
  }

  const createMutualReferenceFixture = (): Record<string, unknown> => {
    const first: Record<string, unknown> = { name: 'A' }
    const second: Record<string, unknown> = { name: 'B' }
    first.peer = second
    second.peer = first

    return {
      first,
      second,
    }
  }

  it('replaces a direct object self-reference with the public circular marker while preserving siblings', () => {
    const redact = deepRedact({})

    expect(redact(createObjectSelfReferenceFixture())).toEqual({
      safe: 'visible',
      self: circularMarker('self'),
    })
  })

  it('replaces a direct array self-reference with the public circular marker while preserving siblings', () => {
    const redact = deepRedact({})

    expect(redact(createArraySelfReferenceFixture())).toEqual([
      'visible',
      circularMarker('1'),
    ])
  })

  it('records the original reference path for nested object-in-array and array-in-object circular edges', () => {
    const redact = deepRedact({})

    expect(redact(createObjectInArrayCycleFixture())).toEqual({
      records: [{
        parent: circularMarker('records.0.parent', 'records'),
        safe: 'visible',
      }],
    })
    expect(redact(createArrayInObjectCycleFixture())).toEqual({
      wrapper: {
        items: [circularMarker('wrapper.items.0', 'wrapper')],
        safe: 'visible',
      },
    })
  })

  it('handles mutually referential objects deterministically without throwing', () => {
    const redact = deepRedact({})

    expect(redact(createMutualReferenceFixture())).toEqual({
      first: {
        name: 'A',
        peer: {
          name: 'B',
          peer: circularMarker('first.peer.peer', 'first'),
        },
      },
      second: {
        name: 'B',
        peer: {
          name: 'A',
          peer: circularMarker('second.peer.peer', 'second'),
        },
      },
    })
  })
})

describe('Structured determinism fixture corpus', () => {
  it.each(structuredDeterminismCases)('returns stable structured output across repeated runs for %s / %s', (
    _fixtureSetTitle,
    _fixtureTitle,
    fixtureSet,
    fixture,
  ) => {
    const redact = fixtureSet.createRedactor()
    const firstRun = runStructuredDeterminismFixture(redact, fixture)
    const secondRun = runStructuredDeterminismFixture(redact, fixture)

    expect(secondRun.result).toStrictEqual(firstRun.result)
  })

  it.each(structuredDeterminismCases)('keeps %s / %s deterministic after other named fixtures on the same compiled redactor', (
    _fixtureSetTitle,
    _fixtureTitle,
    fixtureSet,
    fixture,
  ) => {
    const redact = fixtureSet.createRedactor()
    const firstRun = runStructuredDeterminismFixture(redact, fixture)

    for (const otherFixture of fixtureSet.fixtures) {
      if (otherFixture.name === fixture.name) {
        continue
      }

      runStructuredDeterminismFixture(redact, otherFixture)
    }

    const secondRun = runStructuredDeterminismFixture(redact, fixture)

    expect(secondRun.result).toStrictEqual(firstRun.result)
  })

  it.each(structuredDeterminismWarmUpCases)('replays the fixture-specific warm-up proof for %s / %s', (
    _fixtureSetTitle,
    _fixtureTitle,
    fixtureSet,
    fixture,
  ) => {
    const redact = fixtureSet.createRedactor()
    const warmUp = fixture.createWarmUp!()

    redact(warmUp.payload)

    const run = runStructuredDeterminismFixture(redact, fixture)

    warmUp.assertRun?.(run.run, warmUp.snapshot(), run.redactionSnapshot)
  })
})

describe('Serialised determinism fixture corpus', () => {
  it.each(serialisedDeterminismCases)('returns byte-for-byte identical output across repeated runs for %s / %s', (
    _fixtureSetTitle,
    _fixtureTitle,
    fixtureSet,
    fixture,
  ) => {
    const redact = fixtureSet.createRedactor(true)
    const firstRun = runSerialisedDeterminismFixture(redact, fixture)
    const secondRun = runSerialisedDeterminismFixture(redact, fixture)

    expect(secondRun.result).toBe(firstRun.result)
  })

  it.each(serialisedDeterminismCases)('keeps %s / %s byte-stable after other named fixtures on the same compiled redactor', (
    _fixtureSetTitle,
    _fixtureTitle,
    fixtureSet,
    fixture,
  ) => {
    const redact = fixtureSet.createRedactor(true)
    const firstRun = runSerialisedDeterminismFixture(redact, fixture)

    for (const otherFixture of fixtureSet.fixtures) {
      if (otherFixture.name === fixture.name) {
        continue
      }

      runSerialisedDeterminismFixture(redact, otherFixture)
    }

    const secondRun = runSerialisedDeterminismFixture(redact, fixture)

    expect(secondRun.result).toBe(firstRun.result)
  })

  it.each(serialisedDeterminismCases)('passes already-redacted values to a deterministic custom serialiser for %s / %s', (
    _fixtureSetTitle,
    _fixtureTitle,
    fixtureSet,
    fixture,
  ) => {
    const serialise = vi.fn((value: unknown) => JSON.stringify({ value }))
    const redact = fixtureSet.createRedactor(serialise)
    const firstRun = fixture.createRun()
    const firstResult = redact(firstRun.payload)
    const secondRun = fixture.createRun()
    const secondResult = redact(secondRun.payload)
    const expected = JSON.stringify({ value: firstRun.expected })

    expect(firstResult).toBe(expected)
    expect(secondResult).toBe(expected)
    expect(serialise).toHaveBeenNthCalledWith(1, firstRun.expected)
    expect(serialise).toHaveBeenNthCalledWith(2, secondRun.expected)
  })
})

describe('Function censors and same-length string replacement', () => {
  // ── validation failures ─────────────────────────────────────────────────────

  it.each([
    [
      'root replaceStringByLength with empty string censor',
      { censor: '', replaceStringByLength: true },
      /replaceStringByLength.*empty.*censor|empty.*censor.*replaceStringByLength/i,
    ],
    [
      'root replaceStringByLength: true with remove: true',
      { remove: true, replaceStringByLength: true },
      /remove cannot be combined with replaceStringByLength/i,
    ],
    [
      'path-rule replaceStringByLength with empty string censor',
      { paths: [{ path: 'user.password', censor: '', replaceStringByLength: true }] },
      /replaceStringByLength.*empty.*censor|empty.*censor.*replaceStringByLength/i,
    ],
    [
      'path-rule replaceStringByLength: true with remove: true',
      { paths: [{ path: 'user.password', remove: true, replaceStringByLength: true }] },
      /paths\[0\].*remove cannot be combined with replaceStringByLength/i,
    ],
    [
      'global censor empty string inherited by path replaceStringByLength',
      { censor: '', paths: [{ path: 'user.password', replaceStringByLength: true }] },
      /replaceStringByLength.*empty.*censor|empty.*censor.*replaceStringByLength/i,
    ],
    [
      'global remove inherited by path replaceStringByLength',
      { remove: true, paths: [{ path: 'user.password', replaceStringByLength: true }] },
      /paths\[0\].*remove cannot be combined with replaceStringByLength/i,
    ],
    [
      'global replaceStringByLength inherited by path remove',
      { replaceStringByLength: true, paths: [{ path: 'user.password', remove: true }] },
      /paths\[0\].*remove cannot be combined with replaceStringByLength/i,
    ],
    [
      'non-boolean replaceStringByLength at root',
      { replaceStringByLength: 'yes' },
      /replaceStringByLength must be a boolean/i,
    ],
    [
      'non-boolean replaceStringByLength at path rule',
      { paths: [{ path: 'user.password', replaceStringByLength: 1 }] },
      /replaceStringByLength must be a boolean/i,
    ],
  ])('fails fast for %s', (_label, options, expectedMessage) => {
    expect(() => deepRedact(options as never)).toThrow(expectedMessage)
  })

  it('accepts replaceStringByLength: false at root and path-rule without error', () => {
    expect(() => deepRedact({ replaceStringByLength: false })).not.toThrow()
    expect(() => deepRedact({ paths: [{ path: 'user.password', replaceStringByLength: false }] })).not.toThrow()
  })

  it('accepts function censor with replaceStringByLength: true without error', () => {
    expect(() => deepRedact({ censor: () => '[FN]', replaceStringByLength: true })).not.toThrow()
  })

  // ── function censor – basic invocation ────────────────────────────────────

  it('invokes global function censor on exact-key match with exactly two arguments', () => {
    let capturedArgs: unknown[] = []
    const redact = deepRedact({
      censor: function (...args: unknown[]) {
        capturedArgs = args
        return '[FN]'
      },
      keys: ['password'],
    })

    redact({ password: 'secret' })

    expect(capturedArgs).toHaveLength(2)
    expect(capturedArgs[0]).toBe('secret')
  })

  it('provides correct FunctionCensorContext shape on exact-key match', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { user: { password: 'secret', safe: 'keep' } }
    const redact = deepRedact({
      censor: (_value: unknown, ctx: FunctionCensorContext) => {
        contexts.push(ctx)
        return '[FN]'
      },
      keys: ['password'],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.matchedPath).toEqual(['user', 'password'])
    expect(contexts[0]!.rulePath).toEqual(['password'])
    expect(contexts[0]!.rootInput).toBe(rootPayload)
    expect(contexts[0]!.terminalKey).toBe('password')
  })

  it('provides correct FunctionCensorContext shape on regex-key match', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { user: { dbPassword: 'secret', safe: 'keep' } }
    const pattern = /password$/i
    const redact = deepRedact({
      censor: (_value: unknown, ctx: FunctionCensorContext) => {
        contexts.push(ctx)
        return '[FN]'
      },
      keys: [pattern],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.matchedPath).toEqual(['user', 'dbPassword'])
    expect(contexts[0]!.rulePath).toHaveLength(1)
    expect(contexts[0]!.rulePath[0]).toBeInstanceOf(RegExp)
    expect((contexts[0]!.rulePath[0] as RegExp).source).toBe(pattern.source)
    expect(contexts[0]!.rootInput).toBe(rootPayload)
    expect(contexts[0]!.terminalKey).toBe('dbPassword')
  })

  it('provides correct FunctionCensorContext shape on exact-path match', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { account: { token: 'tok', safe: 'keep' } }
    const redact = deepRedact({
      paths: [{
        path: 'account.token',
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
      }],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.matchedPath).toEqual(['account', 'token'])
    expect(contexts[0]!.rulePath).toEqual(['account', 'token'])
    expect(contexts[0]!.rootInput).toBe(rootPayload)
    expect(contexts[0]!.terminalKey).toBe('token')
  })

  it('provides correct FunctionCensorContext shape on dynamic-path wildcard match', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { users: { alice: { token: 'alice-tok' }, bob: { token: 'bob-tok' } } }
    const redact = deepRedact({
      paths: [{
        path: 'users.*.token',
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
      }],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(2)
    const aliceCtx = contexts.find((c) => c.terminalKey === 'token' && c.matchedPath[1] === 'alice')!
    expect(aliceCtx).toBeDefined()
    expect(aliceCtx.matchedPath).toEqual(['users', 'alice', 'token'])
    expect(aliceCtx.rulePath).toEqual(['users', { any: true }, 'token'])
    expect(aliceCtx.terminalKey).toBe('token')
  })

  it('provides correct FunctionCensorContext shape on array-index match', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { users: [{ email: 'a@b.com', safe: 'keep' }] }
    const redact = deepRedact({
      paths: [{
        path: 'users[0].email',
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
      }],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.matchedPath).toEqual(['users', 0, 'email'])
    expect(contexts[0]!.rulePath).toEqual(['users', 0, 'email'])
    expect(contexts[0]!.terminalKey).toBe('email')
  })

  it('provides correct FunctionCensorContext shape on dynamic-path recursive-wildcard match', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { account: { token: 'root-tok', session: { token: 'session-tok' } } }
    const redact = deepRedact({
      paths: [{
        path: 'account.**.token',
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
      }],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(2)
    const rootTokCtx = contexts.find((c) => c.matchedPath.length === 2)!
    expect(rootTokCtx.matchedPath).toEqual(['account', 'token'])
    expect(rootTokCtx.rulePath).toEqual(['account', { anyDepth: true }, 'token'])
  })

  it('provides correct FunctionCensorContext for ignore-segment dynamic path', () => {
    const contexts: FunctionCensorContext[] = []
    const rootPayload = { users: { admin: { email: 'admin@x.com' }, alice: { email: 'a@x.com' } } }
    const redact = deepRedact({
      paths: [{
        path: ['users', { ignore: 'admin' }, 'email'],
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
      }],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.matchedPath).toEqual(['users', 'alice', 'email'])
    const rp = contexts[0]!.rulePath
    expect(rp[0]).toBe('users')
    expect(rp[1]).toEqual({ ignore: 'admin' })
    expect(rp[2]).toBe('email')
  })

  it('provides correct FunctionCensorContext for regex path-segment match', () => {
    const contexts: FunctionCensorContext[] = []
    const regex = /^tenant-\d+$/
    const rootPayload = { tenants: { 'tenant-1': { token: 'tok', safe: 'keep' }, other: { token: 'other-tok' } } }
    const redact = deepRedact({
      paths: [{
        path: ['tenants', regex, 'token'],
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
      }],
    })

    redact(rootPayload)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.matchedPath).toEqual(['tenants', 'tenant-1', 'token'])
    const rp = contexts[0]!.rulePath
    expect(rp[0]).toBe('tenants')
    expect(rp[1]).toBeInstanceOf(RegExp)
    expect((rp[1] as RegExp).source).toBe(regex.source)
    expect(rp[2]).toBe('token')
  })

  it('resolves the first matching configured regex-key rule as rulePath when multiple matchers match', () => {
    const contexts: FunctionCensorContext[] = []
    const pattern1 = /password$/i
    const pattern2 = /password/
    const redact = deepRedact({
      censor: (_value: unknown, ctx: FunctionCensorContext) => {
        contexts.push(ctx)
        return '[FN]'
      },
      keys: [pattern1, pattern2],
    })

    redact({ dbPassword: 'secret' })

    expect(contexts).toHaveLength(1)
    const rp = contexts[0]!.rulePath
    expect(rp).toHaveLength(1)
    expect(rp[0]).toBeInstanceOf(RegExp)
    expect((rp[0] as RegExp).source).toBe(pattern1.source)
    expect((rp[0] as RegExp).flags).toBe(pattern1.flags)
  })

  it('rootInput is the exact original input reference, not a copy', () => {
    let capturedRoot: unknown
    const rootPayload = { nested: { secret: 'value' } }
    const redact = deepRedact({
      censor: (_value: unknown, ctx: FunctionCensorContext) => {
        capturedRoot = ctx.rootInput
        return '[FN]'
      },
      keys: ['secret'],
    })

    redact(rootPayload)

    expect(capturedRoot).toBe(rootPayload)
  })

  it('local path-rule function censor beats a global literal censor for the matched rule only', () => {
    const called: string[] = []
    const redact = deepRedact({
      censor: '[GLOBAL]',
      paths: [
        'accounts.public.token',
        {
          path: 'accounts.internal.token',
          censor: (_value: unknown) => {
            called.push('local')
            return '[LOCAL-FN]'
          },
        },
      ],
    })

    const result = redact({
      accounts: {
        public: { token: 'pub-tok', safe: 'pub-safe' },
        internal: { token: 'int-tok', safe: 'int-safe' },
      },
    }) as Record<string, Record<string, Record<string, string>>>

    expect(called).toEqual(['local'])
    expect(result.accounts!.public!.token).toBe('[GLOBAL]')
    expect(result.accounts!.internal!.token).toBe('[LOCAL-FN]')
    expect(result.accounts!.public!.safe).toBe('pub-safe')
    expect(result.accounts!.internal!.safe).toBe('int-safe')
  })

  it('local path-rule function censor beats a global function censor for the matched rule only', () => {
    const globalCalled: string[] = []
    const localCalled: string[] = []
    const redact = deepRedact({
      censor: () => {
        globalCalled.push('global')
        return '[GLOBAL-FN]'
      },
      paths: [
        {
          path: 'accounts.internal.token',
          censor: () => {
            localCalled.push('local')
            return '[LOCAL-FN]'
          },
        },
        'accounts.public.token',
      ],
    })

    redact({
      accounts: {
        public: { token: 'pub-tok' },
        internal: { token: 'int-tok' },
      },
    })

    expect(localCalled).toHaveLength(1)
    expect(globalCalled).toHaveLength(1)
  })

  it('function censor return value replaces only the matched target and preserves siblings', () => {
    const redact = deepRedact({
      censor: () => '[FN]',
      keys: ['secret'],
    })
    const payload = { secret: 'value', safe: 'keep', nested: { secret: 'nested-value', other: 'visible' } }

    const result = redact(payload) as typeof payload

    expect(result.secret).toBe('[FN]')
    expect(result.safe).toBe('keep')
    expect(result.nested.secret).toBe('[FN]')
    expect(result.nested.other).toBe('visible')
    expect(payload.secret).toBe('value')
  })

  it('function censor returning undefined replaces matched target with undefined instead of removing', () => {
    const redact = deepRedact({
      censor: () => undefined,
      keys: ['secret'],
    })
    const payload = { secret: 'value', safe: 'keep' }

    const result = redact(payload) as Record<string, unknown>

    expect(Object.hasOwn(result, 'secret')).toBe(true)
    expect(result.secret).toBeUndefined()
    expect(result.safe).toBe('keep')
  })

  it('context arrays are frozen: matchedPath and rulePath are immutable at runtime', () => {
    const contexts: FunctionCensorContext[] = []
    const redact = deepRedact({
      censor: (_value: unknown, ctx: FunctionCensorContext) => {
        contexts.push(ctx)
        return '[FN]'
      },
      keys: ['a', 'b'],
    })

    redact({ a: 1, b: 2 })

    expect(contexts).toHaveLength(2)
    for (const ctx of contexts) {
      expect(() => (ctx.matchedPath as unknown[]).push('MUTATION')).toThrow(TypeError)
      expect(() => (ctx.rulePath as unknown[]).push('MUTATION')).toThrow(TypeError)
    }
  })

  it('retained parent path rule: function censor descendants receive own exact matchedPath and parent rulePath', () => {
    const contexts: FunctionCensorContext[] = []
    const redact = deepRedact({
      paths: [{
        path: 'accounts.*',
        censor: (_value: unknown, ctx: FunctionCensorContext) => {
          contexts.push(ctx)
          return '[FN]'
        },
        retainStructure: true,
      }],
    })

    redact({ accounts: { alice: { token: 'tok', safe: 'keep' } } })

    expect(contexts).toHaveLength(2)
    for (const ctx of contexts) {
      expect(ctx.rulePath).toEqual(['accounts', { any: true }])
    }
    const tokenCtx = contexts.find((c) => c.terminalKey === 'token')!
    const safeCtx = contexts.find((c) => c.terminalKey === 'safe')!
    expect(tokenCtx.matchedPath).toEqual(['accounts', 'alice', 'token'])
    expect(safeCtx.matchedPath).toEqual(['accounts', 'alice', 'safe'])
  })

  it('function censor does not mutate caller-owned payload', () => {
    const payload = { user: { secret: 'original', safe: 'unchanged' } }
    const original = structuredClone(payload)
    const redact = deepRedact({
      censor: () => '[FN]',
      keys: ['secret'],
    })

    redact(payload)

    expect(payload).toStrictEqual(original)
  })

  // ── same-length literal string replacement ────────────────────────────────

  it('repeats literal censor to match original string length (replaceStringByLength: true, single-char token)', () => {
    const redact = deepRedact({ censor: '*', replaceStringByLength: true, keys: ['secret'] })

    expect(redact({ secret: 'hello' })).toEqual({ secret: '*****' })
  })

  it('repeats multi-character token and truncates to original string length', () => {
    const redact = deepRedact({ censor: 'XY', replaceStringByLength: true, keys: ['secret'] })

    expect(redact({ secret: 'hello' })).toEqual({ secret: 'XYXYX' })
  })

  it('uses default [REDACTED] token repeated to length when no explicit censor and replaceStringByLength: true', () => {
    const redact = deepRedact({ replaceStringByLength: true, keys: ['secret'] })

    const result = redact({ secret: 'hello' }) as { secret: string }
    expect(result.secret).toHaveLength(5)
    expect(result.secret).toBe('[REDA')
  })

  it('applies same-length replacement via local path-rule censor override', () => {
    const redact = deepRedact({
      paths: [{
        path: 'user.password',
        censor: '-',
        replaceStringByLength: true,
      }],
    })

    expect(redact({ user: { password: 'secret', safe: 'keep' } })).toEqual({
      user: { password: '------', safe: 'keep' },
    })
  })

  it('skips same-length replacement for non-string matched values', () => {
    const redact = deepRedact({ censor: '*', replaceStringByLength: true, keys: ['count'] })

    expect(redact({ count: 42 })).toEqual({ count: '*' })
  })

  it('skips same-length replacement when matched value is zero-length string', () => {
    const redact = deepRedact({ censor: '*', replaceStringByLength: true, keys: ['empty'] })

    expect(redact({ empty: '' })).toEqual({ empty: '' })
  })

  it('skips same-length replacement for function censor and uses its return value directly', () => {
    const redact = deepRedact({
      censor: () => '[FN-RESULT]',
      replaceStringByLength: true,
      keys: ['secret'],
    })

    expect(redact({ secret: 'hello' })).toEqual({ secret: '[FN-RESULT]' })
  })

  it('local replaceStringByLength: false overrides global replaceStringByLength: true', () => {
    const redact = deepRedact({
      censor: '*',
      replaceStringByLength: true,
      paths: [{
        path: 'user.name',
        replaceStringByLength: false,
      }],
    })

    const result = redact({ user: { name: 'alice' } }) as { user: { name: string } }

    expect(result.user.name).toBe('*')
  })
})

describe('Exact-path fast-lane and generic traversal equivalence', () => {
  it.each(exactPathEquivalenceCorpus)(
    'proves fast-lane and generic-lane are behaviourally equivalent for: $title',
    (entry) => {
      // (a) Control — verify the compiled plan exclusively uses the exact-path fast lane
      const plan = compileRedactorPlan(entry.options)
      expect(Object.keys(plan.exactPathRules).length).toBe((entry.options.paths ?? []).length)
      expect(plan.dynamicPathRules.length).toBe(0)

      // (b) Fast-lane run — both lanes derived from the same compiled plan
      const fastStructured = createLaneForcedRedactorFromPlan(plan, 'fast')(entry.createPayload())
      const fastSerialised = JSON.stringify(fastStructured)

      expect(fastStructured).toStrictEqual(entry.expectedStructured)
      expect(fastSerialised).toBe(entry.expectedSerialised)

      // (c) Generic-lane run — same golden assertions plus cross-lane equality
      const genericStructured = createLaneForcedRedactorFromPlan(plan, 'generic')(entry.createPayload())
      const genericSerialised = JSON.stringify(genericStructured)

      expect(genericStructured).toStrictEqual(entry.expectedStructured)
      expect(genericSerialised).toBe(entry.expectedSerialised)

      expect(fastStructured).toStrictEqual(genericStructured)
      expect(fastSerialised).toBe(genericSerialised)
    },
  )

  it('delivers identical FunctionCensorContext to both lanes for exact-path-function-censor', () => {
    const functionCensorEntry = exactPathEquivalenceCorpus.find(
      (entry) => entry.name === 'exact-path-function-censor',
    )
    if (functionCensorEntry == null) throw new Error('exact-path-function-censor corpus entry not found')

    let fastCapturedContext: FunctionCensorContext | undefined
    let genericCapturedContext: FunctionCensorContext | undefined

    const fastSpy = vi.fn((_value: unknown, ctx: FunctionCensorContext) => {
      fastCapturedContext = ctx
      return '[FN-SPY]'
    })
    const genericSpy = vi.fn((_value: unknown, ctx: FunctionCensorContext) => {
      genericCapturedContext = ctx
      return '[FN-SPY]'
    })

    const fastOptions = { paths: [{ path: 'account.secret', censor: fastSpy }] }
    const genericOptions = { paths: [{ path: 'account.secret', censor: genericSpy }] }

    const expectedPayload = { account: { secret: 'hidden', visible: 'show' } }

    createLaneForcedRedactor(fastOptions, 'fast')(functionCensorEntry.createPayload())
    createLaneForcedRedactor(genericOptions, 'generic')(functionCensorEntry.createPayload())

    expect(fastSpy).toHaveBeenCalledOnce()
    expect(genericSpy).toHaveBeenCalledOnce()

    expect(fastCapturedContext).toBeDefined()
    expect(genericCapturedContext).toBeDefined()

    expect(fastCapturedContext!.matchedPath).toStrictEqual(['account', 'secret'])
    expect(fastCapturedContext!.rulePath).toStrictEqual(['account', 'secret'])
    expect(fastCapturedContext!.rootInput).toStrictEqual(expectedPayload)
    expect(fastCapturedContext!.terminalKey).toBe('secret')

    expect(fastCapturedContext).toStrictEqual(genericCapturedContext)
  })

  it('produces byte-for-byte identical custom-serialised output across lanes for single-exact-path', () => {
    const entry = exactPathEquivalenceCorpus.find(
      (e) => e.name === 'single-exact-path',
    )
    if (entry == null) throw new Error('single-exact-path corpus entry not found')

    const customSerialise = vi.fn((value: unknown) => JSON.stringify({ v: value }))

    const fastStructured = createLaneForcedRedactor(entry.options, 'fast')(entry.createPayload())
    const genericStructured = createLaneForcedRedactor(entry.options, 'generic')(entry.createPayload())

    const fastCustomSerialised = customSerialise(fastStructured)
    const genericCustomSerialised = customSerialise(genericStructured)

    expect(fastCustomSerialised).toBe(entry.expectedCustomSerialised)
    expect(genericCustomSerialised).toBe(entry.expectedCustomSerialised)
    expect(fastCustomSerialised).toBe(genericCustomSerialised)
  })

  it('returns byte-for-byte identical serialised string across lanes when serialise: true (AC 7)', () => {
    const options: DeepRedactOptions = { paths: ['user.password'], serialise: true }
    const sharedPlan = compileRedactorPlan(options)

    expect(Object.keys(sharedPlan.exactPathRules).length).toBe(1)
    expect(sharedPlan.dynamicPathRules.length).toBe(0)

    const payload = { user: { password: 'secret', safe: 'keep' } }
    const fastResult = createLaneForcedRedactorFromPlan(sharedPlan, 'fast')(payload)
    const genericResult = createLaneForcedRedactorFromPlan(sharedPlan, 'generic')(payload)

    expect(typeof fastResult).toBe('string')
    expect(fastResult).toBe('{"user":{"password":"[REDACTED]","safe":"keep"}}')
    expect(genericResult).toBe('{"user":{"password":"[REDACTED]","safe":"keep"}}')
    expect(fastResult).toBe(genericResult)
  })
})
