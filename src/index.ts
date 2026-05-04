import { createRedactor as createReusableRedactor } from './core/create-redactor.js'

export type {
  Censor,
  DeepRedactOptions,
  FunctionCensorContext,
  IgnorePathSegment,
  KeySelector,
  PathEntry,
  PathRule,
  PathSegments,
  PathSelector,
  PublicRecursiveWildcardSegment,
  PublicWildcardSegment,
  Redactor,
  RedactorFactory,
  RegexPathSegment,
  SerialiseOption,
  StringTest,
  StructuredPathSegment,
  StructuredPathSelector,
  SubstringRule,
} from './types/public.js'

export const deepRedact = createReusableRedactor
export const createRedactor = deepRedact
