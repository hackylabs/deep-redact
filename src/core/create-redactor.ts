import type {
  Censor,
  DeepRedactOptions,
  PathEntry,
  Redactor,
  RedactorFactory,
  SerialiseOption,
} from '../types/public.js'
import { validateConfig } from './validation/validate-config.js'
import { assertValidConfig } from './validation/validation-report.js'

interface InitialisedPathRule {
  readonly path: string
  readonly censor?: Censor
  readonly remove: boolean
  readonly retainStructure: boolean
}

type InitialisedPathEntry = string | InitialisedPathRule

interface InitialisedRedactorPlan {
  readonly censor?: Censor
  readonly paths: readonly InitialisedPathEntry[]
  readonly remove: boolean
  readonly retainStructure: boolean
  readonly serialise?: SerialiseOption
}

interface RedactionDefaults {
  readonly censor?: Censor
  readonly remove: boolean
  readonly retainStructure: boolean
}

const initialisePathEntry = (
  entry: PathEntry,
  defaults: RedactionDefaults,
): InitialisedPathEntry => {
  if (typeof entry === 'string') {
    return entry
  }

  return Object.freeze({
    ...entry,
    censor: entry.censor ?? defaults.censor,
    remove: entry.remove ?? defaults.remove,
    retainStructure: entry.retainStructure ?? defaults.retainStructure,
  })
}

const createInitialisedPlan = (options: DeepRedactOptions = {}): InitialisedRedactorPlan => {
  const defaults: RedactionDefaults = {
    censor: options.censor,
    remove: options.remove ?? false,
    retainStructure: options.retainStructure ?? false,
  }

  return Object.freeze({
    ...defaults,
    paths: Object.freeze((options.paths ?? []).map((entry) => initialisePathEntry(entry, defaults))),
    serialise: options.serialise,
  })
}

const applySerialisation = (value: unknown, serialise?: SerialiseOption): unknown => {
  if (serialise === true) {
    return JSON.stringify(value)
  }

  if (typeof serialise === 'function') {
    return serialise(value)
  }

  return value
}

const createCallableRedactor = (plan: InitialisedRedactorPlan): Redactor => {
  return function redact(value: unknown): unknown {
    return applySerialisation(value, plan.serialise)
  }
}

export const createRedactor: RedactorFactory = (options) => {
  const validationReport = validateConfig(options)
  assertValidConfig(validationReport)

  const initialisedPlan = createInitialisedPlan(options ?? {})

  return createCallableRedactor(initialisedPlan)
}
