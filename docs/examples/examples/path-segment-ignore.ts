import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: [['users', { ignore: 'admin' }, 'email']] })

export const runExample = (input: unknown): unknown => redactor(input)
