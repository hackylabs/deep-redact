import deepRedactPackage = require('@hackylabs/deep-redact')

const redact = deepRedactPackage.deepRedact({
  paths: [
    'user.password',
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

void structuredResult
void serialisedResult
