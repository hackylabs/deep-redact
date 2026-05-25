import { describe, expect, it } from 'vitest'
import type { CompiledRedactorPlan } from '../../../src/core/compiler/compile-redactor-plan.js'
import type { DeepRedactOptions } from '../../../src/types/public.js'
import { compileRedactorPlan } from '../../../src/core/compiler/compile-redactor-plan.js'
import { redactValue } from '../../../src/core/runtime/redact-value.js'
import { buildFastLaneExecutor } from '../../../src/core/runtime/fast-lane.js'
import { createRedactor } from '../../../src/core/create-redactor.js'

// Fallback that fails the test if the fast lane delegates when it should have handled the call.
const failOnDelegation = (): never => {
  throw new Error('fast lane unexpectedly delegated to the general traversal')
}

// Builds the fast-lane executor with a fallback that proves the fast lane handled the payload
// itself (rather than silently delegating).
const fastLaneOf = (plan: CompiledRedactorPlan) => buildFastLaneExecutor(plan, failOnDelegation)

// Runs a payload through the compiled fast lane and the general traversal for the same
// config, asserting the fast lane is engaged and that both produce deeply equal output.
const crossValidate = (options: DeepRedactOptions, payload: unknown): unknown => {
  const plan = compileRedactorPlan(options)
  expect(plan.isExactPathOnly).toBe(true)

  const general = redactValue(payload, plan)
  const fast = fastLaneOf(plan)(payload)

  expect(fast).toEqual(general)

  return fast
}

describe('fast-lane eligibility flag', () => {
  it('flags exact-path-only configs as candidates', () => {
    expect(compileRedactorPlan({ paths: ['user.password'] }).isExactPathOnly).toBe(true)
  })

  it('rejects configs with dynamic path segments', () => {
    expect(compileRedactorPlan({ paths: ['user.*'] }).isExactPathOnly).toBe(false)
    expect(compileRedactorPlan({ paths: ['**.password'] }).isExactPathOnly).toBe(false)
  })

  it('rejects configs with key, regex-key, or stringTest rules', () => {
    expect(compileRedactorPlan({ paths: ['user.password'], keys: ['email'] }).isExactPathOnly).toBe(false)
    expect(compileRedactorPlan({ paths: ['user.password'], keys: [/secret/] }).isExactPathOnly).toBe(false)
    expect(compileRedactorPlan({ paths: ['user.password'], stringTests: [/\d{4}/] }).isExactPathOnly).toBe(false)
  })

  it('rejects configs with no exact paths', () => {
    expect(compileRedactorPlan({ keys: ['password'] }).isExactPathOnly).toBe(false)
    expect(compileRedactorPlan({}).isExactPathOnly).toBe(false)
  })

  it('rejects configs with fuzzyKeyMatch or caseSensitiveKeyMatch: false', () => {
    expect(compileRedactorPlan({ paths: ['user.password'], fuzzyKeyMatch: true }).isExactPathOnly).toBe(false)
    expect(compileRedactorPlan({ paths: ['user.password'], caseSensitiveKeyMatch: false }).isExactPathOnly).toBe(false)
  })
})

describe('fast-lane executor — terminal value handling', () => {
  it('redacts a single nested exact path (benchmark fixture)', () => {
    const payload = {
      user: { id: 1, firstName: 'Emily', email: 'e@x.com', password: 'pw', ip: '1.2.3.4' },
      requestId: 'req-1',
      ok: true,
    }

    const result = crossValidate(
      { paths: ['user.password', 'user.email', 'user.firstName', 'user.ip'] },
      payload,
    ) as { user: Record<string, unknown> }

    expect(result.user).toEqual({
      id: 1,
      firstName: '[REDACTED]',
      email: '[REDACTED]',
      password: '[REDACTED]',
      ip: '[REDACTED]',
    })
    expect(result).not.toBe(payload)
  })

  it('silently skips a missing intermediate key', () => {
    crossValidate({ paths: ['user.profile.password'] }, { user: { id: 1 } })
  })

  it('silently skips a missing terminal key', () => {
    crossValidate({ paths: ['user.password'] }, { user: { id: 1 } })
  })

  it('redacts null, undefined, and primitive terminal values', () => {
    crossValidate(
      { paths: ['a', 'b', 'c', 'd'] },
      { a: null, b: undefined, c: 42, d: 'secret' },
    )
  })

  it('redacts a nested object terminal value wholesale', () => {
    const result = crossValidate(
      { paths: ['user.address'] },
      { user: { id: 1, address: { city: 'Springfield', postalCode: '62701' } } },
    ) as { user: { address: unknown } }

    expect(result.user.address).toBe('[REDACTED]')
  })

  it('redacts an array terminal value wholesale', () => {
    const result = crossValidate(
      { paths: ['tokens'] },
      { tokens: ['a', 'b', 'c'] },
    ) as { tokens: unknown }

    expect(result.tokens).toBe('[REDACTED]')
  })
})

describe('fast-lane executor — policies', () => {
  it('applies the remove policy by deleting the key', () => {
    const result = crossValidate(
      { paths: [{ path: 'user.password', remove: true }] },
      { user: { id: 1, password: 'pw' } },
    ) as { user: Record<string, unknown> }

    expect('password' in result.user).toBe(false)
    expect(result.user).toEqual({ id: 1 })
  })

  it('honours a custom censor', () => {
    crossValidate(
      { paths: [{ path: 'user.password', censor: '***' }] },
      { user: { password: 'pw' } },
    )
  })

  it('honours a function censor with matched path context', () => {
    const censor: DeepRedactOptions['censor'] = (value, context) =>
      `redacted:${context.matchedPath.join('.')}:${String(context.terminalKey)}`

    crossValidate(
      { paths: [{ path: 'user.password', censor }] },
      { user: { password: 'pw' } },
    )
  })

  it('retains structure of an object terminal, redacting descendant leaves', () => {
    const result = crossValidate(
      { paths: [{ path: 'user', retainStructure: true }] },
      { user: { id: 1, name: 'Emily', nested: { token: 'abc' } } },
    ) as { user: Record<string, unknown> }

    expect(result.user).toEqual({
      id: '[REDACTED]',
      name: '[REDACTED]',
      nested: { token: '[REDACTED]' },
    })
  })

  it('retains structure of an array terminal, redacting descendant leaves', () => {
    const result = crossValidate(
      { paths: [{ path: 'items', retainStructure: true }] },
      { items: [{ a: 1 }, 'plain', 2] },
    ) as { items: unknown[] }

    expect(result.items).toEqual([{ a: '[REDACTED]' }, '[REDACTED]', '[REDACTED]'])
  })
})

describe('fast-lane executor — prefix sharing and indexes', () => {
  it('handles array index paths', () => {
    crossValidate(
      { paths: ['data[0].secret', 'data[1].apiKey'] },
      { data: [{ secret: 's', keep: 1 }, { apiKey: 'k', keep: 2 }] },
    )
  })

  it('handles multiple paths sharing a common prefix', () => {
    crossValidate(
      { paths: ['user.a', 'user.b', 'user.c'] },
      { user: { a: 1, b: 2, c: 3, d: 4 } },
    )
  })

  it('handles multiple paths sharing no prefix', () => {
    crossValidate(
      { paths: ['alpha.secret', 'beta.token', 'gamma'] },
      { alpha: { secret: 's', keep: 1 }, beta: { token: 't' }, gamma: 'g', delta: 9 },
    )
  })
})

describe('fast-lane executor — identity and sparse holes', () => {
  it('returns the same reference when nothing matched or changed', () => {
    const payload = { user: { id: 1 }, other: 2 }
    const fast = fastLaneOf(compileRedactorPlan({ paths: ['user.password'] }))

    expect(fast(payload)).toBe(payload)
  })

  it('returns root primitives unchanged', () => {
    const fast = fastLaneOf(compileRedactorPlan({ paths: ['a'] }))

    expect(fast('hello')).toBe('hello')
    expect(fast(42)).toBe(42)
    expect(fast(null)).toBe(null)
  })

  it('preserves sparse array holes', () => {
    const sparse: unknown[] = []
    sparse[0] = { secret: 's' }
    sparse[2] = { secret: 't' }

    const plan = compileRedactorPlan({ paths: ['[0].secret', '[2].secret'] })
    const general = redactValue(sparse, plan)
    const fast = fastLaneOf(plan)(sparse) as unknown[]

    expect(1 in fast).toBe(false)
    expect(fast).toEqual(general)
  })
})

describe('payload-aware lane selection (delegation to general traversal)', () => {
  const delegated = Symbol('delegated')

  // Asserts the fast lane delegates (returns the fallback's result) AND that the redactor's
  // public output matches what the general traversal produces for the same payload.
  const assertDelegatesAndMatches = (options: DeepRedactOptions, payload: unknown): void => {
    const plan = compileRedactorPlan(options)

    expect(buildFastLaneExecutor(plan, () => delegated)(payload)).toBe(delegated)
    expect(createRedactor(options)(payload)).toEqual(redactValue(payload, plan))
  }

  it('delegates payloads containing a Date', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, meta: { created: new Date('2020-01-01T00:00:00.000Z') } },
    )
  })

  it('delegates payloads containing a Map', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, lookup: new Map([['k', 'v']]) },
    )
  })

  it('delegates payloads containing a BigInt', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, count: 10n },
    )
  })

  it('delegates payloads containing an Error', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, failure: new Error('boom') },
    )
  })

  it('delegates payloads containing a Set', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, tags: new Set(['a', 'b']) },
    )
  })

  it('delegates payloads containing a RegExp', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, pattern: /secret/i },
    )
  })

  it('delegates payloads containing a URL', () => {
    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, endpoint: new URL('https://example.com') },
    )
  })

  it('delegates payloads with a non-plain prototype', () => {
    class Holder {
      secret = 'value'
    }

    assertDelegatesAndMatches(
      { paths: ['user.password'] },
      { user: { password: 'pw' }, holder: new Holder() },
    )
  })

  it('delegates a non-plain root value', () => {
    const plan = compileRedactorPlan({ paths: ['user.password'] })

    expect(buildFastLaneExecutor(plan, () => delegated)(new Date('2020-01-01T00:00:00.000Z'))).toBe(delegated)
    expect(buildFastLaneExecutor(plan, () => delegated)(10n)).toBe(delegated)
  })

  it('delegates circular-reference payloads', () => {
    const payload: Record<string, unknown> = { user: { password: 'pw' } }
    payload.self = payload

    const plan = compileRedactorPlan({ paths: ['user.password'] })

    expect(buildFastLaneExecutor(plan, () => delegated)(payload)).toBe(delegated)
    expect(createRedactor({ paths: ['user.password'] })(payload)).toEqual(redactValue(payload, plan))
  })

  it('delegates payloads with a throwing getter', () => {
    const plan = compileRedactorPlan({ paths: ['user.password'] })
    const buildPayload = (): Record<string, unknown> => ({
      user: { password: 'pw' },
      get danger(): never {
        throw new Error('nope')
      },
    })

    expect(buildFastLaneExecutor(plan, () => delegated)(buildPayload())).toBe(delegated)
    expect(createRedactor({ paths: ['user.password'] })(buildPayload())).toEqual(redactValue(buildPayload(), plan))
  })

  it('handles pure plain-data payloads without delegating', () => {
    const plan = compileRedactorPlan({ paths: ['c.d'] })

    expect(() => fastLaneOf(plan)({ a: 1, b: [2, 3], c: { d: 'x' } })).not.toThrow()
    expect(fastLaneOf(plan)('plain')).toBe('plain')
    expect(fastLaneOf(plan)(null)).toBe(null)
  })
})
