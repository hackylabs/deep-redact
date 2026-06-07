import { deepRedact } from '@hackylabs/deep-redact'

// Per-key overrides also apply to regex key selectors: a regex key rule reaches the same
// parity as a literal key rule. Here the `/token$/i` rule carries a per-key censor that is
// applied to every matching key.
const redactor = deepRedact({
  keys: [{ key: /token$/i, censor: '[TOKEN REDACTED]' }],
  censor: '[REDACTED]',
})

export const runExample = (input: unknown): unknown => redactor(input)
