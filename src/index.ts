import { createRedactor as createReusableRedactor } from './core/create-redactor.js'

export type {
  Censor,
  DeepRedactOptions,
  IgnorePathSegment,
  KeySelector,
  PathEntry,
  PathRule,
  PathSelector,
  Redactor,
  RedactorFactory,
  SerialiseOption,
  StructuredPathSegment,
  StructuredPathSelector,
} from './types/public.js'

export const deepRedact = createReusableRedactor
export const createRedactor = deepRedact
