import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password', 'secret'] })

export const runExample = (input: unknown): unknown => redactor(input)
