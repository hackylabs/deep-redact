import {
  createRedactor,
  deepRedact,
  type Censor,
  type DiagnosticEvent,
  type DeepRedactOptions,
  type FunctionCensorContext,
  type IgnoredValueTypesOption,
  type IgnorePathSegment,
  type KeyRule,
  type KeySelector,
  type PathEntry,
  type PathSegments,
  type PathRule,
  type PathSelector,
  type PublicRecursiveWildcardSegment,
  type PublicWildcardSegment,
  type Redactor,
  type RegexPathSegment,
  type StringTest,
  type SubstringRule,
  type Transformer,
  type TransformersByConstructor,
  type TransformersByType,
  type TransformersOption,
  type StructuredPathSegment,
  type StructuredPathSelector,
} from '@hackylabs/deep-redact'

// One-argument function censor remains assignable to Censor
const oneArgCensor: Censor = (value: unknown) => String(value)

// Two-argument function censor using FunctionCensorContext
const twoArgCensor: Censor = (value: unknown, ctx: FunctionCensorContext) => {
  const path: PathSegments = ctx.matchedPath
  const rule: PathSegments = ctx.rulePath
  const root: unknown = ctx.rootInput
  const terminal: string | number | undefined = ctx.terminalKey

  void path
  void rule
  void root
  void terminal

  return `[REDACTED:${String(value)}]`
}

// PathSegments can hold all public segment types
const wildcardSegment: PublicWildcardSegment = { any: true }
const recursiveWildcardSegment: PublicRecursiveWildcardSegment = { anyDepth: true }
const exampleSegments: PathSegments = [
  'users',
  0,
  /^tenant-\d+$/,
  { ignore: 'admin' },
  wildcardSegment,
  recursiveWildcardSegment,
]

// Readonly properties on FunctionCensorContext
const exampleCtx: FunctionCensorContext = {
  matchedPath: ['users', 0, 'email'],
  rulePath: ['users', wildcardSegment, 'email'],
  rootInput: { users: [] },
  terminalKey: 'email',
}

const passwordRule: PathRule = {
  path: 'user.password',
  censor: '[REDACTED]',
  replaceStringByLength: false,
}

const paths: PathEntry[] = [
  'user.token',
  passwordRule,
  ['users', 0, 'email'],
  ['tenants', /^tenant-\d+$/, 'token'],
  ['users', { ignore: 'admin' }, 'email'],
  ['users', { ignore: /^internal/ }, 'email'],
  {
    path: 'user.profile.secret',
    remove: true,
  },
  {
    path: 'user.name',
    censor: '*',
    replaceStringByLength: true,
  },
]

const selector: PathSelector = ['users', { ignore: 'admin' }, 'email']
const ignoredSegment: IgnorePathSegment = { ignore: 'admin' }
const structuredKeyRule: KeyRule = {
  key: 'pass_code',
  fuzzyKeyMatch: true,
  caseSensitiveKeyMatch: false,
}
const keySelector: KeySelector = structuredKeyRule
const regexKeySelector: KeySelector = /token$/i
const substringRule: SubstringRule = {
  pattern: /token=[^&\s]+/g,
  replacer: (value: string, pattern: RegExp) => value.replace(pattern, 'token=[REDACTED]'),
}
const bareStringTest: StringTest = /api-key=[^&\s]+/
const structuredStringTest: StringTest = substringRule
const regexPathSegment: RegexPathSegment = /^tenant-\d+$/
const structuredSegment: StructuredPathSegment = /^tenant-\d+$/
const structuredSelector: StructuredPathSelector = ['tenants', /^tenant-\d+$/, 'token']
const passthroughTransformer: Transformer = (value: unknown) => value
const transformersByType: TransformersByType = {
  bigint: [passthroughTransformer],
  object: [passthroughTransformer],
}
const transformersByConstructor: TransformersByConstructor = {
  Date: [passthroughTransformer],
  Error: [passthroughTransformer],
  Map: [passthroughTransformer],
  RegExp: [passthroughTransformer],
  Set: [passthroughTransformer],
  URL: [passthroughTransformer],
}
const transformers: TransformersOption = {
  byType: transformersByType,
  byConstructor: transformersByConstructor,
  fallback: [passthroughTransformer],
}
const ignoredValueTypes: IgnoredValueTypesOption = {
  bigint: true,
  Error: false,
  Map: true,
}
const diagnosticEvent: DiagnosticEvent = {
  event: 'redaction.failure',
  path: 'user.password',
  valueType: 'string',
  message: 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].',
  details: {
    stage: 'censor',
  },
}
const diagnosticSink = (event: DiagnosticEvent) => {
  const eventName: string = event.event
  const eventPath: string = event.path
  const valueType: string = event.valueType
  const message: string = event.message
  const details: Record<string, unknown> | undefined = event.details

  void eventName
  void eventPath
  void valueType
  void message
  void details
}

const options: DeepRedactOptions = {
  censor: twoArgCensor,
  fuzzyKeyMatch: false,
  caseSensitiveKeyMatch: false,
  diagnostics: {
    sink: diagnosticSink,
  },
  ignoredValueTypes,
  keys: ['password', regexKeySelector, structuredKeyRule],
  paths,
  stringTests: [bareStringTest, structuredStringTest],
  serialise: (value) => JSON.stringify(value) ?? 'null',
  transformers,
  replaceStringByLength: false,
}

const redact: Redactor = deepRedact(options)
const alias: Redactor = createRedactor({
  keys: ['token'],
  paths,
})

const structuredResult = redact({ ok: true })
const aliasResult = alias({ ok: true })

// @ts-expect-error v4 exposes only the British-English serialise option
const invalidLegacyOption: DeepRedactOptions = { serialize: true }
// @ts-expect-error v4 does not expose the legacy v3 key option
const invalidLegacyKeys: DeepRedactOptions = { blacklistedKeys: ['password'] }
// @ts-expect-error the reusable redactor accepts payload input only after initialisation
redact({ ok: true }, options)

void oneArgCensor
void twoArgCensor
void structuredResult
void aliasResult
void selector
void substringRule
void bareStringTest
void structuredStringTest
void ignoredSegment
void keySelector
void regexKeySelector
void structuredKeyRule
void regexPathSegment
void structuredSegment
void structuredSelector
void passthroughTransformer
void ignoredValueTypes
void diagnosticEvent
void diagnosticSink
void transformersByType
void transformersByConstructor
void transformers
void exampleSegments
void exampleCtx
void invalidLegacyOption
void invalidLegacyKeys
