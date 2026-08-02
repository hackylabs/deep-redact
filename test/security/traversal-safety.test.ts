import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, vi } from 'vitest'
import { deepRedact, type DeepRedactOptions } from '../../src/index.js'
import { compileRedactorPlan } from '../../src/core/compiler/compile-redactor-plan.js'
import { buildPathDrivenExecutor } from '../../src/core/runtime/navigate-exact-paths.js'
import { redactValue } from '../../src/core/runtime/redact-value.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const corpus = JSON.parse(
  readFileSync(resolve(__dirname, 'hostile-input-corpus.json'), 'utf8')
) as Record<string, unknown>

const buildNestedObject = (depth: number): unknown => {
  let obj: unknown = { leaf: 'value' }
  for (let i = 0; i < depth; i++) obj = { child: obj }
  return obj
}

const buildWideObject = (keyCount: number): Record<string, number> => {
  const obj: Record<string, number> = {}
  for (let i = 0; i < keyCount; i++) obj[`k${i}`] = i
  return obj
}

const buildCircularAtDepth = (depth: number): Record<string, unknown> => {
  const root: Record<string, unknown> = {}
  let current = root
  for (let i = 0; i < depth; i++) {
    const next: Record<string, unknown> = {}
    current['child'] = next
    current = next
  }
  current['circular'] = root
  return root
}

// keys rule forces general traversal (not the rule-driven engine), where budget enforcement lives
const redact = deepRedact({ keys: ['secret'] })

const failOnDelegation = (): never => {
  throw new Error('rule-driven executor unexpectedly delegated to the general traversal')
}

const runRuleDriven = (options: DeepRedactOptions, payload: unknown): unknown => {
  const plan = compileRedactorPlan(options)

  expect(plan.pathDrivenOnly).toBe(true)

  return buildPathDrivenExecutor(plan, failOnDelegation)(payload)
}

describe('traversal safety — depth limit', () => {
  it('throws BUDGET_EXCEEDED for extreme nesting without stack overflow', () => {
    expect(() => redact(buildNestedObject(1001))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
  })
})

describe('traversal safety — node budget', () => {
  it('throws BUDGET_EXCEEDED for extreme breadth without memory exhaustion', () => {
    expect(() => redact(buildWideObject(60_000))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
  })
})

describe('traversal safety — combined adversarial', () => {
  it('throws BUDGET_EXCEEDED for a payload combining extreme breadth and depth', () => {
    expect(() => redact({ wide: buildWideObject(1000), deep: buildNestedObject(500) })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
  })
})

describe('traversal safety — circular references', () => {
  it('completes circular-at-depth without throwing', () => {
    expect(() => redact(buildCircularAtDepth(50))).not.toThrow()
  })
})

describe('traversal safety — string values', () => {
  it('completes extremely-long-string without throwing', () => {
    expect(() => redact({ value: 'a'.repeat(100_000) })).not.toThrow()
  })

  it('completes regex-triggering-string without throwing', () => {
    const entry = corpus['regex-triggering-string']
    expect(entry).toBeDefined()
    const redactWithRegex = deepRedact({ keys: [/secret/] })
    expect(() => redactWithRegex(entry)).not.toThrow()
  })
})

describe('traversal safety — custom limits', () => {
  it('throws BUDGET_EXCEEDED at a user-configured maxDepth, not the default', () => {
    const redactShallow = deepRedact({ keys: ['secret'], maxDepth: 3 })
    expect(() => redactShallow(buildNestedObject(4))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
    expect(() => redactShallow(buildNestedObject(2))).not.toThrow()
  })

  it('throws BUDGET_EXCEEDED at a user-configured maxNodes, not the default', () => {
    const redactNarrow = deepRedact({ keys: ['secret'], maxNodes: 5 })
    expect(() => redactNarrow(buildWideObject(6))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
    expect(() => redactNarrow(buildWideObject(4))).not.toThrow()
  })

  it('throws BUDGET_EXCEEDED for a substring-driven maxDepth breach in the generic traversal', () => {
    const options = {
      maxDepth: 3,
      stringTests: [/token=[^&\s]+/],
    } satisfies DeepRedactOptions
    const redactShallow = deepRedact(options)

    expect(compileRedactorPlan(options).pathDrivenOnly).toBe(false)
    expect(() => redactShallow(buildNestedObject(4))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
    expect(() => redactShallow(buildNestedObject(2))).not.toThrow()
  })

  it('throws BUDGET_EXCEEDED for a substring-driven maxNodes breach in the generic traversal', () => {
    const options = {
      maxNodes: 5,
      stringTests: [/token=[^&\s]+/],
    } satisfies DeepRedactOptions
    const redactNarrow = deepRedact(options)

    expect(compileRedactorPlan(options).pathDrivenOnly).toBe(false)
    expect(() => redactNarrow(buildWideObject(6))).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' })
    )
    expect(() => redactNarrow(buildWideObject(4))).not.toThrow()
  })
})

describe('traversal safety — onBudgetExceeded: truncate (fail closed)', () => {
  it('truncates to a [TRUNCATED] marker at a node-budget breach instead of throwing (general traversal)', () => {
    const redactTruncate = deepRedact({ keys: ['secret'], maxNodes: 3, onBudgetExceeded: 'truncate' })

    let result = {} as Record<string, unknown>
    expect(() => {
      result = redactTruncate({ a: 1, secret: 'hide me', b: 2, c: 3, d: 4 }) as Record<string, unknown>
    }).not.toThrow()

    // Root (1) + a (2) + secret (3) are within budget; b (4) breaches and becomes the marker;
    // everything after it is dropped (fail closed).
    expect(result.a).toBe(1)
    expect(result.secret).toBe('[REDACTED]')
    expect(result.b).toBe('[TRUNCATED]')
    expect('c' in result).toBe(false)
    expect('d' in result).toBe(false)
  })

  it('truncates to a [TRUNCATED] marker at a depth breach instead of throwing (general traversal)', () => {
    const redactTruncate = deepRedact({ keys: ['secret'], maxDepth: 3, onBudgetExceeded: 'truncate' })

    let result: unknown
    expect(() => {
      result = redactTruncate(buildNestedObject(10))
    }).not.toThrow()

    expect(JSON.stringify(result)).toContain('[TRUNCATED]')
  })

  it('does not throw or truncate below the limit', () => {
    const redactTruncate = deepRedact({ keys: ['secret'], maxNodes: 50, onBudgetExceeded: 'truncate' })

    expect(redactTruncate({ a: 1, secret: 'hide me', b: 2 })).toEqual({
      a: 1,
      secret: '[REDACTED]',
      b: 2,
    })
  })

  it('truncates fail-closed in the rule-driven engine by delegating to the general traversal', () => {
    const options = {
      paths: ['*.x'],
      maxNodes: 6,
      onBudgetExceeded: 'truncate',
    } satisfies DeepRedactOptions

    // Same config as the throwing AC 9 case, still pathDrivenOnly — under truncate a breach must
    // delegate rather than throw.
    expect(compileRedactorPlan(options).pathDrivenOnly).toBe(true)

    const payload = { a: { x: 1 }, b: { x: 2 }, c: { x: 3 }, d: { x: 4 }, e: { x: 5 } }

    let ruleDriven: unknown
    expect(() => {
      ruleDriven = deepRedact(options)(payload)
    }).not.toThrow()

    // Delegation contract: the rule-driven engine hands the whole payload to the general traversal,
    // so the truncated output equals the general traversal's truncated output for the same plan.
    expect(JSON.stringify(ruleDriven)).toContain('[TRUNCATED]')
    expect(ruleDriven).toEqual(redactValue(payload, compileRedactorPlan(options)))
  })

  it('accepts onBudgetExceeded: "truncate" and rejects invalid modes at initialisation', () => {
    expect(() => deepRedact({ onBudgetExceeded: 'truncate' })).not.toThrow()
    expect(() => deepRedact({
      // @ts-expect-error — an unknown overflow mode is rejected at runtime
      onBudgetExceeded: 'nope',
    })).toThrow()
  })
})

describe('traversal safety — rule-driven budget accounting', () => {
  it('charges exact path hops against maxDepth and permits equality', () => {
    const payload = { a: { b: 'secret' } }

    expect(() => runRuleDriven({
      maxDepth: 2,
      maxNodes: 100,
      paths: ['a.b'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 1,
      maxNodes: 100,
      paths: ['a.b'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('charges exact path hops against maxNodes and permits equality', () => {
    const payload = { a: { b: 'secret' } }

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 2,
      paths: ['a.b'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 1,
      paths: ['a.b'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('counts terminal exact segments for both depth and node budgets', () => {
    expect(() => runRuleDriven({
      maxDepth: 1,
      maxNodes: 1,
      paths: ['a'],
    }, { a: 'secret' })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 1,
      maxNodes: 100,
      paths: ['a.b'],
    }, { a: { b: 'secret' } })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 1,
      paths: ['a.b'],
    }, { a: { b: 'secret' } })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('charges exact index hops against depth and node budgets', () => {
    const payload = [{ secret: 'secret' }]

    expect(() => runRuleDriven({
      maxDepth: 2,
      maxNodes: 100,
      paths: ['[0].secret'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 1,
      maxNodes: 100,
      paths: ['[0].secret'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 2,
      paths: ['[0].secret'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 1,
      paths: ['[0].secret'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('charges exact segments around a single-level wildcard from the same node budget', () => {
    const payload = {
      users: {
        alice: {
          profile: { secret: 'secret' },
        },
      },
    }

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 4,
      paths: ['users.*.profile.secret'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 3,
      paths: ['users.*.profile.secret'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('charges exact segments around a single-level wildcard from the same depth budget', () => {
    const payload = {
      users: {
        alice: {
          profile: { secret: 'secret' },
        },
      },
    }

    expect(() => runRuleDriven({
      maxDepth: 3,
      maxNodes: 100,
      paths: ['users.*.profile.secret'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 2,
      maxNodes: 100,
      paths: ['users.*.profile.secret'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('charges only the reached concrete prefix for missing intermediate and terminal segments', () => {
    expect(() => runRuleDriven({
      maxDepth: 1,
      maxNodes: 1,
      paths: ['a.b.c'],
    }, { a: {} })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 1,
      maxNodes: 1,
      paths: ['a.b'],
    }, { a: {} })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 0,
      maxNodes: 100,
      paths: ['a.b'],
    }, { a: {} })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 0,
      paths: ['a.b'],
    }, { a: {} })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('aggregates exact-hop maxNodes work across shared prefixes and shallow branches', () => {
    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 3,
      paths: ['a.b', 'a.c'],
    }, { a: { b: 'secret', c: 'secret' } })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 2,
      paths: ['a.b', 'a.c'],
    }, { a: { b: 'secret', c: 'secret' } })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 3,
      paths: ['a', 'b', 'c'],
    }, { a: 'secret', b: 'secret', c: 'secret' })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 2,
      paths: ['a', 'b', 'c'],
    }, { a: 'secret', b: 'secret', c: 'secret' })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('charges retained-subtree exact overrides against maxNodes', () => {
    const payload = { a: { b: 'secret', c: 'secret' } }

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 3,
      paths: [{ path: 'a', retainStructure: true }, 'a.b', 'a.c'],
    }, payload)).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 2,
      paths: [{ path: 'a', retainStructure: true }, 'a.b', 'a.c'],
    }, payload)).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })

  it('propagates BudgetExceededError without delegating, while non-budget accessor errors can delegate', () => {
    const budgetPlan = compileRedactorPlan({
      maxDepth: 100,
      maxNodes: 1,
      paths: ['a.b'],
    })
    const budgetFallback = vi.fn(failOnDelegation)

    expect(budgetPlan.pathDrivenOnly).toBe(true)
    expect(() => buildPathDrivenExecutor(budgetPlan, budgetFallback)({ a: { b: 'secret' } })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
    expect(budgetFallback).not.toHaveBeenCalled()

    const accessorPlan = compileRedactorPlan({ paths: ['a.b'] })
    const payload = {}
    const accessorFallback = vi.fn((_value: unknown) => 'fallback-result')

    Object.defineProperty(payload, 'a', {
      enumerable: true,
      get: () => {
        throw new Error('hostile accessor')
      },
    })

    expect(accessorPlan.pathDrivenOnly).toBe(true)
    expect(buildPathDrivenExecutor(accessorPlan, accessorFallback)(payload)).toBe('fallback-result')
    expect(accessorFallback).toHaveBeenCalledTimes(1)
    expect(accessorFallback.mock.calls[0]?.[0]).toBe(payload)
  })

  it('propagates retained-subtree maxDepth and maxNodes limits through the shared budget', () => {
    expect(() => runRuleDriven({
      maxDepth: 3,
      maxNodes: 100,
      paths: [{ path: 'a', retainStructure: true }],
    }, { a: { b: { c: 'secret' } } })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 2,
      maxNodes: 100,
      paths: [{ path: 'a', retainStructure: true }],
    }, { a: { b: { c: 'secret' } } })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 3,
      paths: [{ path: 'a', retainStructure: true }],
    }, { a: { b: 'secret', c: 'secret' } })).not.toThrow()

    expect(() => runRuleDriven({
      maxDepth: 100,
      maxNodes: 2,
      paths: [{ path: 'a', retainStructure: true }],
    }, { a: { b: 'secret', c: 'secret' } })).toThrowError(
      expect.objectContaining({ code: 'BUDGET_EXCEEDED' }),
    )
  })
})
