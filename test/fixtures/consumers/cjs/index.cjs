const packageSurface = require('@hackylabs/deep-redact')
const consoleAdapterSurface = require('@hackylabs/deep-redact/adapters/console')

const payload = { ok: true }
const redact = packageSurface.deepRedact({
  paths: ['user.password'],
})
const alias = packageSurface.createRedactor({
  paths: [{ path: 'user.password', remove: true }],
  serialise: (value) => JSON.stringify({ wrapped: value }),
})
const consoleCalls = []
const consoleTarget = {
  debug: (...args) => consoleCalls.push(['debug', args]),
  error: (...args) => consoleCalls.push(['error', args]),
  info: (...args) => consoleCalls.push(['info', args]),
  log: (...args) => consoleCalls.push(['log', args]),
  trace: (...args) => consoleCalls.push(['trace', args]),
  warn: (...args) => consoleCalls.push(['warn', args]),
}
const adaptedConsole = consoleAdapterSurface.createRedactedConsole(redact, consoleTarget)

adaptedConsole.log({ user: { password: 'secret' } }, 'visible')

const resolvePrivateSubpath = (subpath) => {
  try {
    require(subpath)

    return 'resolved'
  } catch (error) {
    return error?.code
  }
}

console.log(JSON.stringify({
  adapterExportNames: Object.keys(consoleAdapterSurface).sort(),
  adapterExportOwnKeys: Reflect.ownKeys(consoleAdapterSurface).map(String).sort(),
  adapterRedactsConsoleArguments: JSON.stringify(consoleCalls) === JSON.stringify([[
    'log',
    [
      { user: { password: '[REDACTED]' } },
      'visible',
    ],
  ]]),
  createRedactorReturnsCallable: typeof alias === 'function',
  createRedactorSerialises: alias({ ok: true }) === JSON.stringify({ wrapped: { ok: true } }),
  createRedactorType: typeof packageSurface.createRedactor,
  deepRedactReturnsCallable: typeof redact === 'function',
  deepRedactReturnsPayload: redact(payload) === payload,
  deepRedactType: typeof packageSurface.deepRedact,
  exposesConsoleAdapterFromRoot: Object.prototype.hasOwnProperty.call(packageSurface, 'createRedactedConsole'),
  exposesLegacyClass: Object.prototype.hasOwnProperty.call(packageSurface, 'DeepRedact'),
  exportNames: Object.keys(packageSurface).sort(),
  exportOwnKeys: Reflect.ownKeys(packageSurface).map(String).sort(),
  privateAdapterSubpathErrors: [
    resolvePrivateSubpath('@hackylabs/deep-redact/adapters/console/create-redacted-console'),
    resolvePrivateSubpath('@hackylabs/deep-redact/adapters/console/recursion-guard'),
  ],
  redactorOwnKeys: Reflect.ownKeys(redact).map(String).sort(),
  redactorPrototypeOwnKeys: Reflect.ownKeys(redact.prototype).map(String).sort(),
  sharesFactory: packageSurface.createRedactor === packageSurface.deepRedact,
}))
