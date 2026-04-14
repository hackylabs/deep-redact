import deepRedactPackage = require('@hackylabs/deep-redact')

const redact = deepRedactPackage.deepRedact({
  keys: ['password'],
  paths: [
    'user.password',
    ['users', 0, 'email'],
    ['users', { ignore: 'admin' }, 'email'],
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
