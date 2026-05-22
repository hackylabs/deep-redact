import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: [['config', /password|secret/i]] })

export const runExample = (input: unknown): unknown => redactor(input)
