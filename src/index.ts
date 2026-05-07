import { createRedactor as createReusableRedactor } from './core/create-redactor.js'

export type {
  Censor,
  DiagnosticEvent,
  DiagnosticsOptions,
  DiagnosticSink,
  DeepRedactOptions,
  FunctionCensorContext,
  IgnoredValueTypesOption,
  IgnorePathSegment,
  KeyRule,
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
  Transformer,
  TransformersByConstructor,
  TransformersByType,
  TransformersOption,
} from './types/public.js'

export const deepRedact = createReusableRedactor
export const createRedactor = deepRedact
