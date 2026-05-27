import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { deepRedact } from '../../src/index.js'

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

// keys rule forces general traversal (not fast lane), where budget enforcement lives
const redact = deepRedact({ keys: ['secret'] })

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
})
