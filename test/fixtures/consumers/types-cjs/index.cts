import deepRedactPackage = require('@hackylabs/deep-redact')

const structuredKeyRule: deepRedactPackage.KeyRule = {
  key: 'pass_code',
  fuzzyKeyMatch: true,
  caseSensitiveKeyMatch: false,
}
const keySelector: deepRedactPackage.KeySelector = structuredKeyRule
const regexKeySelector: deepRedactPackage.KeySelector = /token$/i
const substringRule: deepRedactPackage.SubstringRule = {
  pattern: /token=[^&\s]+/g,
  replacer: (value: string, pattern: RegExp) => value.replace(pattern, 'token=[REDACTED]'),
}
const bareStringTest: deepRedactPackage.StringTest = /api-key=[^&\s]+/
const structuredStringTest: deepRedactPackage.StringTest = substringRule
const regexPathSegment: deepRedactPackage.RegexPathSegment = /^tenant-\d+$/
const structuredSegment: deepRedactPackage.StructuredPathSegment = /^tenant-\d+$/
const structuredSelector: deepRedactPackage.StructuredPathSelector = ['tenants', /^tenant-\d+$/, 'token']
const passthroughTransformer: deepRedactPackage.Transformer = (value: unknown) => value
const transformersByType: deepRedactPackage.TransformersByType = {
  bigint: [passthroughTransformer],
  object: [passthroughTransformer],
}
const transformersByConstructor: deepRedactPackage.TransformersByConstructor = {
  Date: [passthroughTransformer],
  Error: [passthroughTransformer],
  Map: [passthroughTransformer],
  RegExp: [passthroughTransformer],
  Set: [passthroughTransformer],
  URL: [passthroughTransformer],
}
const transformers: deepRedactPackage.TransformersOption = {
  byType: transformersByType,
  byConstructor: transformersByConstructor,
  fallback: [passthroughTransformer],
}
const ignoredValueTypes: deepRedactPackage.IgnoredValueTypesOption = {
  bigint: true,
  Error: false,
  Map: true,
}
const diagnosticEvent: deepRedactPackage.DiagnosticEvent = {
  event: 'redaction.failure',
  path: 'user.password',
  valueType: 'string',
  message: 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].',
  details: {
    stage: 'censor',
  },
}
const diagnosticSink = (event: deepRedactPackage.DiagnosticEvent) => {
  void event.event
  void event.path
  void event.valueType
  void event.message
  void event.details
}

// PathSegments and FunctionCensorContext accessible in CJS
const wildcardSegment: deepRedactPackage.PublicWildcardSegment = { any: true }
const exampleSegments: deepRedactPackage.PathSegments = ['users', 0, wildcardSegment]
const exampleCtx: deepRedactPackage.FunctionCensorContext = {
  matchedPath: ['users', 0, 'email'],
  rulePath: ['users', wildcardSegment, 'email'],
  rootInput: { users: [] },
  terminalKey: 'email',
}

// One-arg function censor remains assignable
const oneArgCensor: deepRedactPackage.Censor = String

// Two-arg function censor using context
const twoArgCensor: deepRedactPackage.Censor = (value: unknown, ctx: deepRedactPackage.FunctionCensorContext) => {
  void ctx.matchedPath
  void ctx.rulePath
  void ctx.rootInput
  void ctx.terminalKey
  return String(value)
}

const redact = deepRedactPackage.deepRedact({
  censor: twoArgCensor,
  fuzzyKeyMatch: false,
  caseSensitiveKeyMatch: false,
  diagnostics: {
    sink: diagnosticSink,
  },
  replaceStringByLength: false,
  ignoredValueTypes,
  keys: ['password', regexKeySelector, structuredKeyRule],
  stringTests: [bareStringTest, structuredStringTest],
  transformers,
  paths: [
    'user.password',
    ['users', 0, 'email'],
    ['tenants', /^tenant-\d+$/, 'token'],
    ['users', { ignore: 'admin' }, 'email'],
    ['users', { ignore: /^internal/ }, 'email'],
    { path: 'user.token', remove: true },
    { path: 'user.name', censor: '*', replaceStringByLength: true },
  ],
})
const alias = deepRedactPackage.createRedactor({
  serialise: (value: unknown) => JSON.stringify(value) ?? 'null',
})

const structuredResult = redact({ ok: true })
const serialisedResult = alias({ ok: true })

// @ts-expect-error v4 does not expose the American-English serialisation alias
deepRedactPackage.deepRedact({ serialize: true })
// @ts-expect-error v4 does not expose the legacy v3 key option
deepRedactPackage.deepRedact({ blacklistedKeys: ['password'] })

void structuredResult
void serialisedResult
void keySelector
void regexKeySelector
void structuredKeyRule
void substringRule
void bareStringTest
void structuredStringTest
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
void oneArgCensor
void wildcardSegment
