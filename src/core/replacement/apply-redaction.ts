import type { FunctionCensorContext } from '../compiler/compile-redactor-plan.js'
import type { CompiledRedactionPolicy } from '../compiler/compile-redactor-plan.js'

const defaultCensor = '[REDACTED]'

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
