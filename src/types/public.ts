import type { DeepRedactOptions } from './config.js'

export type { DeepRedactOptions, KeySelector, SerialiseOption } from './config.js'
export type {
  Censor,
  IgnorePathSegment,
  PathEntry,
  PathRule,
  PathSelector,
  RegexPathSegment,
  StructuredPathSegment,
  StructuredPathSelector,
} from './paths.js'

export type Redactor = (value: unknown) => unknown
export type RedactorFactory = (options?: DeepRedactOptions) => Redactor
