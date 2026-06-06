import type { FunctionCensorContext } from '../compiler/compile-redactor-plan.js'
import type { CompiledRedactionPolicy } from '../compiler/compile-redactor-plan.js'
import type { CompiledValueTypesPlan } from '../compiler/compile-value-types.js'

const defaultCensor = '[REDACTED]'

// The single value-type eligibility check shared by both engines. `valueTypes` is `typeof`-keyed,
// so this is one O(1) property read evaluated only where a rule has already matched a value. A
// vetoed value must be returned raw — never redacted — so a matched-but-vetoed value stays byte-
// identical to the same value had no rule matched it (Story 9.1).
export const isRedactableType = (
  value: unknown,
  valueTypes: CompiledValueTypesPlan,
): boolean => {
  return valueTypes[typeof value]
}

export const removedValue = Symbol('deep-redact.removed')

export type RemovedValue = typeof removedValue

export const isRemovedValue = (value: unknown): value is RemovedValue => {
  return value === removedValue
}

const buildSameLengthReplacement = (token: string, targetLength: number): string => {
  if (targetLength === 0) {
    return ''
  }

  const tokenLength = token.length

  if (tokenLength === 0) {
    return ''
  }

  const quotient = Math.floor(targetLength / tokenLength)
  const remainder = targetLength % tokenLength

  return token.repeat(quotient) + token.slice(0, remainder)
}

export const applyRedaction = (
  value: unknown,
  policy: CompiledRedactionPolicy,
  context: FunctionCensorContext,
): RemovedValue | unknown => {
  if (policy.remove) {
    return removedValue
  }

  if (typeof policy.censor === 'function') {
    return policy.censor.call(undefined, value, context)
  }

  const literalCensor = policy.censor ?? defaultCensor

  if (policy.replaceStringByLength && typeof value === 'string') {
    return buildSameLengthReplacement(literalCensor, value.length)
  }

  return literalCensor
}
