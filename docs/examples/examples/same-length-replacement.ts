import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.token'],
  censor: '*',
  replaceStringByLength: true,
})

export const runExample = (input: unknown): unknown => redactor(input)
