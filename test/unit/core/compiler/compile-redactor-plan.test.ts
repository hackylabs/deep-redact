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
      retainStructure: false,
    })
    expect(plan.exactPathRules['user.password']).toEqual({
      canonicalPath: 'user.password',
      policy: {
        censor: '[GLOBAL]',
        remove: false,
        retainStructure: true,
      },
      segments: expect.any(Array),
    })
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
