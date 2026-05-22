import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.profile.ssn', 'user.credentials.token'] })

export const runExample = (input: unknown): unknown => redactor(input)
