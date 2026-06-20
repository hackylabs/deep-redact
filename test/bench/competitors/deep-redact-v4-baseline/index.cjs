'use strict'
const { deepRedact } = require('deep-redact-v4-baseline')

module.exports = function (config) {
  const redactor = deepRedact(config)
  return function (payload) {
    return redactor(payload)
  }
}
