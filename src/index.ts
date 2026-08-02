import { createRedactor as createReusableRedactor } from './core/create-redactor.js'

export type {
  Censor,
  CustomConstructorTransformerRegistration,
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
  ValueTypeName,
} from './types/public.js'

export const deepRedact = createReusableRedactor
export const createRedactor = deepRedact

// The console sink is opt-in rather than the default: pass it to `diagnostics.sink` when console
// output is a safe destination. It is unsafe wherever console output is itself captured and fed
// back through redaction — a browser SDK that turns `console` calls into breadcrumbs would loop.
// Returns undefined outside Node, or where `console.error` is unavailable, which `diagnostics.sink`
// accepts as "no sink".
export { getNodeConsoleDiagnosticSink } from './core/diagnostics/node-console-sink.js'
