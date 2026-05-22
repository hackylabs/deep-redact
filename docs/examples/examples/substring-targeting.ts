import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  stringTests: [{
    pattern: /\d{3}-\d{3}-\d{4}/g,
    replacer: (value, pattern) => value.replace(pattern, '[REDACTED]'),
  }],
})

export const runExample = (input: unknown): unknown => redactor(input)
