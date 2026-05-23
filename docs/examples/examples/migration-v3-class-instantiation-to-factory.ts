import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password', 'token'], censor: '[REDACTED]' })

export const runExample = (input: unknown): unknown => redactor(input)
