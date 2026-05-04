import { describe, expect, it, vi } from 'vitest'
import { createRedactor, deepRedact, type FunctionCensorContext } from '../../../src/index.js'

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
    ['invalid serialise value', { serialise: 'json' }, /serialise must be a boolean or function/i],
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
      expect((calls[0]?.[1].rulePath[0] as RegExp).source).toBe('token=[^&\\s]+')
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
      expect(seenPatterns[0]?.source).toBe('token=[^&\\s]+')
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
      expect((calls[0]!.ctx.rulePath[0] as RegExp).source).toBe('token=[^&\\s]+')
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
      expect((calls[0]!.ctx.rulePath[0] as RegExp).source).toBe('token=[^&\\s]+')
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

    it('returns byte-for-byte identical output across repeated runs with the same overlapping-rule payload', () => {
      const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
      const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const payload = createPrecedencePayload()
      const redact = deepRedact({
        serialise: true,
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

      const first = redact(payload)
      const second = redact(payload)

      expect(first).toBe(second)
      expect(first).toBe(JSON.stringify({
        records: {
          exact: { token: '[EXACT-PATH]' },
          structured: { token: '[STRUCTURED-PATH]' },
          key: { token: '[EXACT-KEY]' },
          regex: { sessionToken: '[REGEX-KEY]' },
          substring: { note: 'token=[SUBSTRING]' },
        },
      }))
    })

    it('returns structurally identical output across repeated runs with the same overlapping-rule payload when serialise is omitted', () => {
      const exactPathCensor = vi.fn(() => '[EXACT-PATH]')
      const structuredPathCensor = vi.fn(() => '[STRUCTURED-PATH]')
      const keyCensor = createKeyCensor()
      const substringReplacer = createSubstringReplacer()
      const payload = createPrecedencePayload()
      const originalPayload = structuredClone(payload)
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

      const first = redact(payload)
      const second = redact(payload)
      const expected = {
        records: {
          exact: { token: '[EXACT-PATH]' },
          structured: { token: '[STRUCTURED-PATH]' },
          key: { token: '[EXACT-KEY]' },
          regex: { sessionToken: '[REGEX-KEY]' },
          substring: { note: 'token=[SUBSTRING]' },
        },
      }

      expect(first).toEqual(expected)
      expect(second).toEqual(expected)
      expect(first).toEqual(second)
      expect(first).not.toBe(payload)
      expect(second).not.toBe(payload)
      expect(payload).toEqual(originalPayload)
    })
  })

  describe('Canonical nested mixed payload traversal', () => {
    const createCanonicalMixedPayloadKeyCensor = () => vi.fn((_value: unknown, ctx: FunctionCensorContext) => {
      const firstRuleSegment = ctx.rulePath[0]

      return firstRuleSegment instanceof RegExp ? '[REGEX-KEY]' : '[EXACT-KEY]'
    })

    const createCanonicalMixedPayloadSubstringReplacer = () => vi.fn((value: string, pattern: RegExp) => {
      return value.replace(pattern, 'token=[SUBSTRING]')
    })

    const createCanonicalMixedPayload = (
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

    const createCanonicalMixedPayloadExpectedResult = (
      options: {
        readonly batchOneKeep?: string
        readonly metadataPublic?: string
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
              note: 'token=[SUBSTRING]',
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

    const createCanonicalMixedPayloadRedactor = (
      keyCensor = createCanonicalMixedPayloadKeyCensor(),
      substringReplacer = createCanonicalMixedPayloadSubstringReplacer(),
    ) => ({
      keyCensor,
      substringReplacer,
      redact: deepRedact({
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
    })

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

    it('keeps repeated canonical mixed-payload calls independent across fixture instances', () => {
      const firstPayload = createCanonicalMixedPayload()
      const secondPayload = createCanonicalMixedPayload({
        batchOneKeep: 'visible batch one second call',
        freeText: 'token=free-text-second',
        metadataPublic: 'visible metadata second call',
        objectInArraySubstring: 'token=substring-object-in-array-second',
        regexSessionToken: 'token=regex-key-array-second',
        sessionNote: 'visible session note second call',
      })
      const firstOriginalPayload = structuredClone(firstPayload)
      const secondOriginalPayload = structuredClone(secondPayload)
      const firstExpected = createCanonicalMixedPayloadExpectedResult()
      const secondExpected = createCanonicalMixedPayloadExpectedResult({
        batchOneKeep: 'visible batch one second call',
        metadataPublic: 'visible metadata second call',
        sessionNote: 'visible session note second call',
      })
      const { redact, keyCensor, substringReplacer } = createCanonicalMixedPayloadRedactor()
      const firstResult = redact(firstPayload)
      const secondResult = redact(secondPayload)

      expect(firstResult).toStrictEqual(firstExpected)
      expect(secondResult).toStrictEqual(secondExpected)
      expect(firstResult).not.toBe(firstPayload)
      expect(secondResult).not.toBe(secondPayload)
      expect(firstPayload).toStrictEqual(firstOriginalPayload)
      expect(secondPayload).toStrictEqual(secondOriginalPayload)
      expect(keyCensor).toHaveBeenCalledTimes(4)
      expect(substringReplacer).toHaveBeenCalledTimes(4)
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
      users: Array<{ readonly token: string } | undefined>
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
      users: Array<{ readonly safe?: boolean; readonly token?: string } | undefined>
    }

    expect(result.users).toHaveLength(3)
    expect(1 in result.users).toBe(false)
    expect(result.users[0]).toEqual({ token: '[REDACTED]' })
    expect(result.users[2]).toEqual({ safe: true })
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

  const createSameContextAliasFixture = (): {
    readonly payload: Record<string, unknown>
    readonly getTokenReads: () => number
  } => {
    let tokenReads = 0
    const shared: Record<string, unknown> = {
      safe: 'visible',
    }
    Object.defineProperty(shared, 'token', {
      configurable: true,
      enumerable: true,
      get() {
        tokenReads += 1
        return 'secret'
      },
    })

    return {
      getTokenReads: () => tokenReads,
      payload: {
        left: { shared },
        right: { shared },
      },
    }
  }

  const createDifferentContextAliasFixture = (): {
    readonly payload: Record<string, unknown>
    readonly getTokenReads: () => number
  } => {
    let tokenReads = 0
    const shared: Record<string, unknown> = {
      safe: 'visible',
    }
    Object.defineProperty(shared, 'token', {
      configurable: true,
      enumerable: true,
      get() {
        tokenReads += 1
        return 'secret'
      },
    })

    return {
      getTokenReads: () => tokenReads,
      payload: {
        exact: { shared },
        regex: { sessionShared: shared },
      },
    }
  }

  const createMatchedAfterUnmatchedAliasFixture = (): {
    readonly payload: Record<string, unknown>
    readonly getTokenReads: () => number
  } => {
    let tokenReads = 0
    const shared: Record<string, unknown> = {
      safe: 'visible',
    }
    Object.defineProperty(shared, 'token', {
      configurable: true,
      enumerable: true,
      get() {
        tokenReads += 1
        return 'secret'
      },
    })

    return {
      getTokenReads: () => tokenReads,
      payload: {
        plain: { item: shared },
        sensitive: { password: shared },
      },
    }
  }

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

  it('replays same-context path-sensitive revisits with the current branch path without descending into the original identity again', () => {
    const baselineFixture = createSameContextAliasFixture()
    const fixture = createSameContextAliasFixture()
    const redact = deepRedact({
      censor: (_value, context) => String(context.matchedPath.join('.')),
      keys: ['shared'],
      retainStructure: true,
    })
    redact({
      left: baselineFixture.payload.left,
    })
    const baselineTokenReads = baselineFixture.getTokenReads()
    const result = redact(fixture.payload) as {
      left: { shared: Record<string, unknown> }
      right: { shared: Record<string, unknown> }
    }
    expect(result.left.shared).toEqual({
      safe: 'left.shared.safe',
      token: 'left.shared.token',
    })
    expect(result.right.shared).toEqual({
      safe: 'right.shared.safe',
      token: 'right.shared.token',
    })
    expect(fixture.getTokenReads()).toBe(baselineTokenReads)
  })

  it('replays different-context revisits with path-correct output even when both rules share the compiled default policy object', () => {
    const baselineFixture = createDifferentContextAliasFixture()
    const fixture = createDifferentContextAliasFixture()
    const redact = deepRedact({
      censor: (_value, context) => String(context.matchedPath.join('.')),
      keys: ['shared', /Shared$/],
      retainStructure: true,
    })
    redact({
      exact: baselineFixture.payload.exact,
    })
    const baselineTokenReads = baselineFixture.getTokenReads()
    const result = redact(fixture.payload) as {
      exact: { shared: Record<string, unknown> }
      regex: { sessionShared: Record<string, unknown> }
    }
    expect(result.exact.shared).toEqual({
      safe: 'exact.shared.safe',
      token: 'exact.shared.token',
    })
    expect(result.regex.sessionShared).toEqual({
      safe: 'regex.sessionShared.safe',
      token: 'regex.sessionShared.token',
    })
    expect(fixture.getTokenReads()).toBe(baselineTokenReads)
  })

  it('applies later matched retained redaction after an earlier unmatched visit without re-entering the completed identity', () => {
    const baselineFixture = createMatchedAfterUnmatchedAliasFixture()
    const fixture = createMatchedAfterUnmatchedAliasFixture()
    const redact = deepRedact({
      censor: (_value, context) => String(context.matchedPath.join('.')),
      keys: ['password'],
      retainStructure: true,
    })
    redact({
      plain: baselineFixture.payload.plain,
    })
    const baselineTokenReads = baselineFixture.getTokenReads()
    const result = redact(fixture.payload) as {
      plain: { item: Record<string, unknown> }
      sensitive: { password: Record<string, unknown> }
    }

    expect(result.plain.item.safe).toBe('visible')
    expect(result.sensitive.password).toEqual({
      safe: 'sensitive.password.safe',
      token: 'sensitive.password.token',
    })
    expect(fixture.getTokenReads()).toBe(baselineTokenReads)
  })

  it('replays revisited cyclic aliases with branch-local circular marker paths', () => {
    const redact = deepRedact({})

    expect(redact(createCyclicAliasFixture())).toEqual({
      left: {
        safe: 'visible',
        self: circularMarker('left.self', 'left'),
      },
      right: {
        safe: 'visible',
        self: circularMarker('right.self', 'right'),
      },
    })
  })

  it('returns identical output across repeated invocations with equivalent fresh cyclic fixtures while leaving inputs unchanged', () => {
    const redact = deepRedact({
      keys: ['token'],
    })
    const firstPayload = createRepeatedInvocationFixture()
    const secondPayload = createRepeatedInvocationFixture()
    const firstResult = redact(firstPayload)
    const secondResult = redact(secondPayload)
    const firstRecords = firstPayload.records as Array<Record<string, unknown>>
    const secondRecords = secondPayload.records as Array<Record<string, unknown>>

    expect(firstResult).toEqual(secondResult)
    expect(firstRecords[0]!.token).toBe('secret')
    expect(firstRecords[0]!.parent).toBe(firstRecords)
    expect(secondRecords[0]!.token).toBe('secret')
    expect(secondRecords[0]!.parent).toBe(secondRecords)
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
