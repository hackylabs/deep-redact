import type { DeepRedactOptions } from './config.js'

export type {
  DeepRedactOptions,
  KeySelector,
  SerialiseOption,
  StringTest,
  SubstringRule,
} from './config.js'
export type {
  Censor,
  FunctionCensorContext,
  IgnorePathSegment,
  PathEntry,
  PathRule,
  PathSegments,
  PathSelector,
  PublicRecursiveWildcardSegment,
  PublicWildcardSegment,
  RegexPathSegment,
  StructuredPathSegment,
  StructuredPathSelector,
} from './paths.js'

export type Redactor = (value: unknown) => unknown
export type RedactorFactory = (options?: DeepRedactOptions) => Redactor
