import type {
  Redactor,
  RedactorFactory,
  SerialiseOption,
} from '../types/public.js'
import { compileRedactorPlan, type CompiledRedactorPlan } from './compiler/compile-redactor-plan.js'
import { redactValue } from './runtime/redact-value.js'
import { buildFastLaneExecutor } from './runtime/fast-lane.js'
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
  const generalTraversal = (value: unknown): unknown => redactValue(value, plan)

  // For exact-path-only plans the compiled fast lane handles each call in a single pass,
  // redacting configured paths and verifying payload safety together; anything it cannot prove
  // behaviourally identical (transformable values, circular references, non-plain prototypes,
  // throwing accessors) is delegated to the general traversal via this fallback.
  const executor = plan.isExactPathOnly
    ? buildFastLaneExecutor(plan, generalTraversal)
    : generalTraversal

  return function redact(value: unknown): unknown {
    return applySerialisation(executor(value), plan.serialise)
  }
}

export const createRedactor: RedactorFactory = (options) => {
  const validationReport = validateConfig(options)
  assertValidConfig(validationReport)

  const initialisedPlan = compileRedactorPlan(options ?? {})

  return createCallableRedactor(initialisedPlan)
}
