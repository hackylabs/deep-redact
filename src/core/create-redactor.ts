import type {
  Redactor,
  RedactorFactory,
  SerialiseOption,
} from '../types/public.js'
import { compileRedactorPlan, type CompiledRedactorPlan } from './compiler/compile-redactor-plan.js'
import { redactValue } from './runtime/redact-value.js'
import { validateConfig } from './validation/validate-config.js'
import { assertValidConfig } from './validation/validation-report.js'

const applySerialisation = (value: unknown, serialise?: SerialiseOption): unknown => {
  if (serialise === true) {
    return JSON.stringify(value)
  }

  if (typeof serialise === 'function') {
    return serialise(value)
  }

  return value
}

const createCallableRedactor = (plan: CompiledRedactorPlan): Redactor => {
  return function redact(value: unknown): unknown {
    return applySerialisation(redactValue(value, plan), plan.serialise)
  }
}

export const createRedactor: RedactorFactory = (options) => {
  const validationReport = validateConfig(options)
  assertValidConfig(validationReport)

  const initialisedPlan = compileRedactorPlan(options ?? {})

  return createCallableRedactor(initialisedPlan)
}
