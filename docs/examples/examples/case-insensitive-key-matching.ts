import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password'], caseSensitiveKeyMatch: false })

export const runExample = (input: unknown): unknown => redactor(input)
