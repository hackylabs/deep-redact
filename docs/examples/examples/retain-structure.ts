import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: [{ path: 'credentials', retainStructure: true }],
})

export const runExample = (input: unknown): unknown => redactor(input)
