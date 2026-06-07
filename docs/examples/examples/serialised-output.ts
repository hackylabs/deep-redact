import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.password'],
  serialise: true,
})

export const runExample = (input: unknown): unknown => redactor(input)
