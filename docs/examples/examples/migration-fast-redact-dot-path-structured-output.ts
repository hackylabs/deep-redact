import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.password'] })

export const runExample = (input: unknown): unknown => redactor(input)
