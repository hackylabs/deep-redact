import { describe, expect, it } from 'vitest'
import { compileRedactorPlan } from '../../../../src/core/compiler/compile-redactor-plan.js'
import { validateConfig } from '../../../../src/core/validation/validate-config.js'

describe('compiled exact-selector rule plan', () => {
  it('merges global defaults into path rules and exact-key rules once at initialisation', () => {
    const plan = compileRedactorPlan({
      censor: '[GLOBAL]',
      keys: ['password'],
      paths: [
        {
          path: 'user.password',
          retainStructure: true,
        },
      ],
    })

    expect(Object.getPrototypeOf(plan.exactKeyRules.keys)).toBeNull()
    expect(Object.getPrototypeOf(plan.exactPathRules)).toBeNull()
    expect(plan.exactKeyRules.keys).toEqual({
      password: true,
    })
    expect(plan.exactKeyRules.policy).toEqual({
      censor: '[GLOBAL]',
      remove: false,
      replaceStringByLength: false,
      retainStructure: false,
    })
    expect(plan.exactPathRules['user.password']).toEqual({
      canonicalPath: 'user.password',
      policy: {
        censor: '[GLOBAL]',
        remove: false,
        replaceStringByLength: false,
        retainStructure: true,
      },
      rulePath: expect.any(Array),
      segments: expect.any(Array),
    })
  })

  it('applies local path overrides only to the matching rule while preserving compiled defaults elsewhere', () => {
    const plan = compileRedactorPlan({
      censor: '[GLOBAL]',
      keys: ['password', /token$/i],
      paths: [
        'account.token',
        {
          path: 'audit',
          retainStructure: true,
        },
        {
          path: 'user.token',
          censor: '[LOCAL]',
        },
      ],
    })

    expect(plan.defaults).toEqual({
      censor: '[GLOBAL]',
      remove: false,
      replaceStringByLength: false,
      retainStructure: false,
    })
    expect(plan.exactKeyRules.policy).toBe(plan.defaults)
    expect(plan.regexKeyRules.policy).toBe(plan.defaults)
    expect(plan.exactPathRules['account.token']).toEqual({
      canonicalPath: 'account.token',
      policy: {
        censor: '[GLOBAL]',
        remove: false,
        replaceStringByLength: false,
        retainStructure: false,
      },
      rulePath: expect.any(Array),
      segments: expect.any(Array),
    })
    expect(plan.exactPathRules.audit).toEqual({
      canonicalPath: 'audit',
      policy: {
        censor: '[GLOBAL]',
        remove: false,
        replaceStringByLength: false,
        retainStructure: true,
      },
      rulePath: expect.any(Array),
      segments: expect.any(Array),
    })
    expect(plan.exactPathRules['user.token']).toEqual({
      canonicalPath: 'user.token',
      policy: {
        censor: '[LOCAL]',
        remove: false,
        replaceStringByLength: false,
        retainStructure: false,
      },
      rulePath: expect.any(Array),
      segments: expect.any(Array),
    })
  })

  it('separates exact and regex key selectors during compilation', () => {
    const tokenPattern = /token$/i
    const plan = compileRedactorPlan({
      censor: '[GLOBAL]',
      keys: ['password', tokenPattern],
    })

    expect(Object.getPrototypeOf(plan.exactKeyRules.keys)).toBeNull()
    expect(plan.exactKeyRules.keys).toEqual({
      password: true,
    })
    expect(plan.regexKeyRules.matchers).toHaveLength(1)
    expect(plan.regexKeyRules.matchers[0]).not.toBe(tokenPattern)
    expect(plan.regexKeyRules.matchers[0]?.source).toBe('token$')
    expect(plan.regexKeyRules.matchers[0]?.flags).toBe('i')
    expect(Object.isFrozen(plan.regexKeyRules.matchers)).toBe(true)
    expect(plan.regexKeyRules.policy).toBe(plan.exactKeyRules.policy)
    expect(plan.regexKeyRules.policy).toEqual({
      censor: '[GLOBAL]',
      remove: false,
      replaceStringByLength: false,
      retainStructure: false,
    })
  })

  it('uses cloned non-stateful regex key matchers deterministically', () => {
    const tokenPattern = /token$/i
    const plan = compileRedactorPlan({
      keys: [tokenPattern],
    })
    const matcher = plan.regexKeyRules.matchers[0]

    tokenPattern.lastIndex = 99

    expect(matcher?.test('accessToken')).toBe(true)
    expect(matcher?.test('safe')).toBe(false)
    expect(matcher?.test('refreshToken')).toBe(true)
    expect(matcher?.lastIndex).toBe(0)
    expect(tokenPattern.lastIndex).toBe(99)
  })

  it('rejects duplicate canonical exact-path selectors before compilation proceeds', () => {
    const report = validateConfig({
      paths: [
        'users[0].email',
        'users.0.email',
      ],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[1]',
      message: expect.stringMatching(/duplicate canonical selector "users\.0\.email"/i),
    }))
  })

  it('separates exact and dynamic path selectors during compilation', () => {
    const plan = compileRedactorPlan({
      paths: [
        'users.0.email',
        'users.*.email',
        ['users', { ignore: 'admin' }, 'email'],
      ],
    })

    expect(plan.exactPathRules['users.0.email']).toEqual(expect.objectContaining({
      canonicalPath: 'users.0.email',
    }))
    expect(plan.dynamicPathRules).toHaveLength(2)
    expect(plan.dynamicPathRules.map((rule) => rule.signature)).toEqual([
      'users.*.email',
      'users.{ignore:"admin"}.email',
    ])
  })

  it('compiles regex path segments into cloned dynamic rule matchers', () => {
    const tenantPattern = /^tenant-\d+$/i
    const internalPattern = /^internal/
    const plan = compileRedactorPlan({
      paths: [
        ['users', tenantPattern, 'token'],
        ['users', { ignore: internalPattern }, 'token'],
      ],
    })

    expect(Object.keys(plan.exactPathRules)).toEqual([])
    expect(plan.dynamicPathRules.map((rule) => rule.signature)).toEqual([
      'users.{regex:{"source":"^tenant-\\\\d+$","flags":"i"}}.token',
      'users.{ignore-regex:{"source":"^internal","flags":""}}.token',
    ])
    const directRegexSegment = plan.dynamicPathRules[0]?.segments[1]
    const ignoreRegexSegment = plan.dynamicPathRules[1]?.segments[1]

    expect(directRegexSegment).toMatchObject({
      kind: 'regex',
      matcher: expect.any(RegExp),
    })
    expect(ignoreRegexSegment).toMatchObject({
      kind: 'ignore-regex',
      matcher: expect.any(RegExp),
    })

    if (directRegexSegment?.kind !== 'regex' || ignoreRegexSegment?.kind !== 'ignore-regex') {
      throw new Error('Expected compiled regex path segments.')
    }

    expect(directRegexSegment.matcher).not.toBe(tenantPattern)
    expect(ignoreRegexSegment.matcher).not.toBe(internalPattern)
  })

  it('rejects duplicate dynamic selectors before compilation proceeds', () => {
    const report = validateConfig({
      paths: [
        'users.*.email',
        'users.*.email',
      ],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[1]',
      message: expect.stringMatching(/duplicate dynamic selector "users\.\*\.email"/i),
    }))
  })

  it('rejects duplicate regex dynamic selectors before compilation proceeds', () => {
    const report = validateConfig({
      paths: [
        ['users', /^tenant-\d+$/i, 'token'],
        ['users', /^tenant-\d+$/i, 'token'],
      ],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[1]',
      message: expect.stringMatching(/duplicate dynamic selector/i),
    }))
  })

  it('rejects exact structured selectors that duplicate canonical string selectors', () => {
    const report = validateConfig({
      paths: [
        'users.0.email',
        ['users', 0, 'email'],
      ],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[1]',
      message: expect.stringMatching(/duplicate canonical selector "users\.0\.email"/i),
    }))
  })

  it('rejects structured string selectors that duplicate equivalent quoted-property selectors', () => {
    const report = validateConfig({
      paths: [
        'users["0"].email',
        ['users', '0', 'email'],
      ],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[1]',
      message: expect.stringMatching(/duplicate canonical selector "users\["0"\]\.email"/i),
    }))
  })

  it('rejects invalid structured numeric segments before compilation proceeds', () => {
    const report = validateConfig({
      paths: [
        ['users', -1, 'email'],
        ['users', { ignore: 1.5 }, 'email'],
      ],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[0]',
      message: expect.stringMatching(/structured numeric segments must be non-negative integers/i),
    }))
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.paths[1]',
      message: expect.stringMatching(/structured ignore indexes must be non-negative integers/i),
    }))
  })

  it.each([
    ['wildcard', '*', /unsupported wildcard key selector/i],
    ['recursive wildcard', '**', /unsupported recursive wildcard key selector/i],
    ['exclusion', '!password', /unsupported exclusion key selector/i],
    ['regex-like', '/^password$/', /unsupported regex-like key selector/i],
  ])('rejects unsupported %s key selectors', (_label, selector, expectedMessage) => {
    const report = validateConfig({
      keys: [selector],
    })

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      path: 'options.keys[0]',
      message: expect.stringMatching(expectedMessage),
    }))
  })
})
