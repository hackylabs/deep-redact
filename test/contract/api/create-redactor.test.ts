import { describe, expect, it, vi } from 'vitest'
import { createRedactor, deepRedact } from '../../../src/index.js'

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
    ['unsupported global regex key selector', { keys: [/password/g] }, /regex key selectors must not use global or sticky flags/i],
    ['unsupported sticky regex key selector', { keys: [/password/y] }, /regex key selectors must not use global or sticky flags/i],
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
    ['unsupported structured matcher object', { paths: [['users', { match: 'password' }]] }, /unsupported structured selector segment/i],
    ['negative structured numeric segment', { paths: [['users', -1, 'password']] }, /structured numeric segments must be non-negative integers/i],
    ['negative structured ignore index', { paths: [['users', { ignore: -1 }, 'password']] }, /structured ignore indexes must be non-negative integers/i],
  ])('fails fast for %s', (_label, options, expectedMessage) => {
    expect(() => deepRedact(options as never)).toThrowError(expectedMessage)
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
    expect(() => deepRedact(options)).toThrowError(expectedMessage)
  })

  it('accepts non-stateful RegExp key selectors during initialisation', () => {
    expect(() => deepRedact({
      keys: [/password$/i],
    })).not.toThrow()
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
    })).toThrowError(/duplicate canonical selector "users\.0\.email"/i)
  })

  it('rejects structured string selectors that duplicate equivalent quoted-property string selectors', () => {
    expect(() => deepRedact({
      paths: [
        'users["0"].email',
        ['users', '0', 'email'],
      ],
    })).toThrowError(/duplicate canonical selector "users\["0"\]\.email"/i)
  })

  it('rejects duplicate dynamic selectors during initialisation', () => {
    expect(() => deepRedact({
      paths: [
        'users.*.email',
        'users.*.email',
      ],
    })).toThrowError(/duplicate dynamic selector "users\.\*\.email"/i)
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
