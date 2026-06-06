import { describe, expect, it } from 'vitest'
import { compileValueTypes } from '../../../../src/core/compiler/compile-value-types.js'
import { isRedactableType } from '../../../../src/core/replacement/apply-redaction.js'

// Unit coverage for the value-type allowlist compiler (Story 9.1). Run explicitly via
// vitest.red-phase.config.ts — test/unit/** is not part of `pnpm run test`.

const ALL_TYPEOF_KEYS = [
  'string',
  'number',
  'bigint',
  'boolean',
  'object',
  'function',
  'symbol',
  'undefined',
] as const

describe('compileValueTypes', () => {
  it('compiles the string-only default when the option is unset', () => {
    const plan = compileValueTypes(undefined)

    expect(plan).toStrictEqual({
      string: true,
      number: false,
      bigint: false,
      boolean: false,
      object: false,
      function: false,
      symbol: false,
      undefined: false,
    })
  })

  it('returns an allow-nothing plan for an explicit empty array (not an allow-all default)', () => {
    const plan = compileValueTypes([])

    for (const key of ALL_TYPEOF_KEYS) {
      expect(plan[key]).toBe(false)
    }
  })

  it('marks exactly the configured type names as eligible', () => {
    const plan = compileValueTypes(['number', 'boolean'])

    expect(plan.number).toBe(true)
    expect(plan.boolean).toBe(true)
    expect(plan.string).toBe(false)
    expect(plan.object).toBe(false)
    expect(plan.bigint).toBe(false)
    expect(plan.function).toBe(false)
    expect(plan.symbol).toBe(false)
    expect(plan.undefined).toBe(false)
  })

  it('keys the plan exactly by the eight typeof categories', () => {
    const plan = compileValueTypes(undefined)

    expect(Object.keys(plan).sort()).toStrictEqual([...ALL_TYPEOF_KEYS].sort())
  })

  it('produces an immutable (frozen) plan', () => {
    const plan = compileValueTypes(['string'])

    expect(Object.isFrozen(plan)).toBe(true)
  })

  it('supports widening to all eight type names', () => {
    const plan = compileValueTypes([...ALL_TYPEOF_KEYS])

    for (const key of ALL_TYPEOF_KEYS) {
      expect(plan[key]).toBe(true)
    }
  })
})

describe('isRedactableType', () => {
  it('admits only string values under the compiled default', () => {
    const plan = compileValueTypes(undefined)

    expect(isRedactableType('secret', plan)).toBe(true)
    expect(isRedactableType(42, plan)).toBe(false)
    expect(isRedactableType(10n, plan)).toBe(false)
    expect(isRedactableType(true, plan)).toBe(false)
    expect(isRedactableType({}, plan)).toBe(false)
    expect(isRedactableType([], plan)).toBe(false)
    expect(isRedactableType(null, plan)).toBe(false)
    expect(isRedactableType(new Date(0), plan)).toBe(false)
    expect(isRedactableType(undefined, plan)).toBe(false)
    expect(isRedactableType(() => undefined, plan)).toBe(false)
    expect(isRedactableType(Symbol('x'), plan)).toBe(false)
  })

  it('admits values whose typeof matches a widened allowlist (object covers null, arrays, and Date)', () => {
    const plan = compileValueTypes(['number', 'object'])

    expect(isRedactableType(42, plan)).toBe(true)
    expect(isRedactableType({}, plan)).toBe(true)
    expect(isRedactableType([], plan)).toBe(true)
    expect(isRedactableType(null, plan)).toBe(true)
    expect(isRedactableType(new Date(0), plan)).toBe(true)
    expect(isRedactableType(new Map(), plan)).toBe(true)
    expect(isRedactableType('secret', plan)).toBe(false)
  })
})
