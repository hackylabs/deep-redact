import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ stringTests: [/api-key=[^\s&]+/] })

export const runExample = (input: unknown): unknown => redactor(input)
