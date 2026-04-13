const packageSurface = require('@hackylabs/deep-redact')

const payload = { ok: true }
const redact = packageSurface.deepRedact({
  paths: ['user.password'],
})
const alias = packageSurface.createRedactor({
  paths: [{ path: 'user.password', remove: true }],
  serialise: (value) => JSON.stringify({ wrapped: value }),
})

console.log(JSON.stringify({
  createRedactorReturnsCallable: typeof alias === 'function',
  createRedactorSerialises: alias({ ok: true }) === JSON.stringify({ wrapped: { ok: true } }),
  createRedactorType: typeof packageSurface.createRedactor,
  deepRedactReturnsCallable: typeof redact === 'function',
  deepRedactReturnsPayload: redact(payload) === payload,
  deepRedactType: typeof packageSurface.deepRedact,
  exposesLegacyClass: Object.prototype.hasOwnProperty.call(packageSurface, 'DeepRedact'),
  exportNames: Object.keys(packageSurface).sort(),
  sharesFactory: packageSurface.createRedactor === packageSurface.deepRedact,
}))
