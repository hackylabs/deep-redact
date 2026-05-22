import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: [
    { path: 'user.password', remove: true },
    'user.token',
  ],
})

export const runExample = (input: unknown): unknown => redactor(input)
