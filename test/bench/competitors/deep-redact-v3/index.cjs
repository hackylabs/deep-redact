'use strict'
const { DeepRedact } = require('deep-redact-v3')

module.exports = function (config) {
  const redactor = new DeepRedact(config)
  return function (payload) {
    return redactor.redact(payload)
  }
}
