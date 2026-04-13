import { createRedactor as createReusableRedactor } from './core/create-redactor.js'

export type {
  Censor,
  DeepRedactOptions,
  PathEntry,
  PathRule,
  Redactor,
  RedactorFactory,
  SerialiseOption,
} from './types/public.js'

export const deepRedact = createReusableRedactor
export const createRedactor = deepRedact
