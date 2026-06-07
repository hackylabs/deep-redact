import { deepRedact } from '@hackylabs/deep-redact'

// A key rule can carry its own overrides (censor, remove, retainStructure,
// replaceStringByLength), reaching parity with the v3 BlacklistKeyConfig. Here the `ssn` key
// rule uses a per-key censor while `email` falls back to the global default censor.
const redactor = deepRedact({
  keys: ['email', { key: 'ssn', censor: '[SSN REDACTED]' }],
  censor: '[REDACTED]',
})

export const runExample = (input: unknown): unknown => redactor(input)
