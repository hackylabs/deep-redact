import type {
  Redactor,
  RedactorFactory,
} from '../types/public.js'
import { compileRedactorPlan, type CompiledRedactorPlan } from './compiler/compile-redactor-plan.js'
import { redactValue } from './runtime/redact-value.js'
import { buildPathDrivenExecutor } from './runtime/navigate-exact-paths.js'
import { validateConfig } from './validation/validate-config.js'
import { assertValidConfig } from './validation/validation-report.js'
import { serialiseOutput } from './replacement/serialise-output.js'

const createCallableRedactor = (plan: CompiledRedactorPlan): Redactor => {
  const generalTraversal = (value: unknown, cycleRegistry?: WeakMap<object, string>): unknown =>
    redactValue(value, plan, cycleRegistry)

  // For exact-path-only plans the rule-driven engine navigates directly to each configured
  // terminal via a trie-guided single traversal, never visiting non-configured positions; a
  // non-plain prototype on a configured path (or a throwing accessor) delegates the whole call
  // to the general traversal via this fallback.
  const executor = plan.pathDrivenOnly
    ? buildPathDrivenExecutor(plan, (v) => generalTraversal(v))
    : (v: unknown) => generalTraversal(v)

  return function redact(value: unknown): unknown {
    if (plan.serialise) {
      // The serialise adapter walks the whole redacted graph (O(N)) regardless of plan shape, so
      // the path-driven executor offers no benefit here. More importantly, only the general
      // traversal populates `cycleRegistry`: the path-driven engine never visits non-configured
      // subtrees, so a circular back-edge into a redacted ancestor would otherwise reach the
      // adapter as a raw, unredacted object and leak (the redacted copy and the original alias
      // are distinct identities the adapter cannot relate). Always use the general traversal under
      // `serialise: true` so every cycle is registered and neutralised in the serialised output.
      const cycleRegistry = new WeakMap<object, string>()
      const result = generalTraversal(value, cycleRegistry)

      return serialiseOutput(result, plan.transformers, plan.serialise, cycleRegistry)
    }

    return executor(value)
  }
}

export const createRedactor: RedactorFactory = (options) => {
  const validationReport = validateConfig(options)
  assertValidConfig(validationReport)

  const initialisedPlan = compileRedactorPlan(options ?? {})

  return createCallableRedactor(initialisedPlan)
}
