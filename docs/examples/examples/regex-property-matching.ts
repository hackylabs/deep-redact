import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: [/api/i] })

export const runExample = (input: unknown): unknown => redactor(input)
