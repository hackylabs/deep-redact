import deepRedactPackage = require('@hackylabs/deep-redact')

const keySelector: deepRedactPackage.KeySelector = /token$/i
const regexPathSegment: deepRedactPackage.RegexPathSegment = /^tenant-\d+$/
const structuredSegment: deepRedactPackage.StructuredPathSegment = /^tenant-\d+$/
const structuredSelector: deepRedactPackage.StructuredPathSelector = ['tenants', /^tenant-\d+$/, 'token']

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
const oneArgCensor: deepRedactPackage.Censor = (value: unknown) => String(value)

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
  replaceStringByLength: false,
  keys: ['password', /token$/i],
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
void regexPathSegment
void structuredSegment
void structuredSelector
void exampleSegments
void exampleCtx
void oneArgCensor
void wildcardSegment
