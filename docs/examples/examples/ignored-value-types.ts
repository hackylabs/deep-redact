import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  keys: ['datetime'],
  ignoredValueTypes: { Date: true },
  serialise: true,
})

export const runExample = (input: unknown): unknown => {
  const record = input as { isoDate: string; name: string }
  return redactor({ event: new Date(record.isoDate), name: record.name })
}
