import { deepRedact } from '@hackylabs/deep-redact'

// `types` widens redaction eligibility beyond the string-only default. Here strings and
// numbers are eligible, so both are redacted; values of any other type (e.g. booleans) are
// left untouched even when their key matches.
const redactor = deepRedact({ keys: ['secret'], types: ['string', 'number'] })

export const runExample = (input: unknown): unknown => redactor(input)
