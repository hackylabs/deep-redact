'use strict'

module.exports = function (config) {
  const keys = (config.keys || []).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp('"(' + keys.join('|') + ')":"[^"]*"', 'gi')
  return function (payload) {
    return JSON.parse(JSON.stringify(payload).replace(pattern, '"$1":"[REDACTED]"'))
  }
}
