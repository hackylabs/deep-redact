const packageSurface = require('@hackylabs/deep-redact')

console.log(JSON.stringify({
  createRedactorType: typeof packageSurface.createRedactor,
  deepRedactType: typeof packageSurface.deepRedact,
  exposesLegacyClass: Object.prototype.hasOwnProperty.call(packageSurface, 'DeepRedact'),
  exportNames: Object.keys(packageSurface).sort(),
  sharesFactory: packageSurface.createRedactor === packageSurface.deepRedact,
}))
