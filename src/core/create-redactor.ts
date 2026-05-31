import type {
  Redactor,
  RedactorFactory,
  SerialiseOption,
} from '../types/public.js'
import { compileRedactorPlan, type CompiledRedactorPlan } from './compiler/compile-redactor-plan.js'
import { redactValue } from './runtime/redact-value.js'
import { buildPathDrivenExecutor } from './runtime/navigate-exact-paths.js'
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

  // For exact-path-only plans the rule-driven engine navigates directly to each configured
  // terminal via a trie-guided single traversal, never visiting non-configured positions; a
  // non-plain prototype on a configured path (or a throwing accessor) delegates the whole call
  // to the general traversal via this fallback.
  const executor = plan.pathDrivenOnly
    ? buildPathDrivenExecutor(plan, generalTraversal)
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
