import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.password', 'token'] })

export const runExample = (input: unknown): unknown => redactor(input)
