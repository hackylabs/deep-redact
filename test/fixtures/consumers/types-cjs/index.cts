import deepRedactPackage = require('@hackylabs/deep-redact')

const keySelector: deepRedactPackage.KeySelector = /token$/i
const regexPathSegment: deepRedactPackage.RegexPathSegment = /^tenant-\d+$/
const structuredSegment: deepRedactPackage.StructuredPathSegment = /^tenant-\d+$/
const structuredSelector: deepRedactPackage.StructuredPathSelector = ['tenants', /^tenant-\d+$/, 'token']

const redact = deepRedactPackage.deepRedact({
  keys: ['password', /token$/i],
  paths: [
    'user.password',
    ['users', 0, 'email'],
    ['tenants', /^tenant-\d+$/, 'token'],
    ['users', { ignore: 'admin' }, 'email'],
    ['users', { ignore: /^internal/ }, 'email'],
    { path: 'user.token', remove: true },
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
