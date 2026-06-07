import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password'], fuzzyKeyMatch: true })

export const runExample = (input: unknown): unknown => redactor(input)
