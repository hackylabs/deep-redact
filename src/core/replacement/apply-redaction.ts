import type { CompiledRedactionPolicy } from '../compiler/compile-redactor-plan.js'

const defaultCensor = '[REDACTED]'

export const removedValue = Symbol('deep-redact.removed')

export type RemovedValue = typeof removedValue

export const isRemovedValue = (value: unknown): value is RemovedValue => {
  return value === removedValue
}

export const applyRedaction = (
  value: unknown,
  policy: CompiledRedactionPolicy,
): RemovedValue | unknown => {
  if (policy.remove) {
    return removedValue
  }

  if (typeof policy.censor === 'function') {
    return policy.censor(value)
  }

  return policy.censor ?? defaultCensor
}
