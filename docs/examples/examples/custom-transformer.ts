import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  keys: ['token'],
})

export const runExample = (input: unknown): unknown => {
  const record = input as { status: number; body: Record<string, unknown> }
  const bodyMap = new Map(Object.entries(record.body))
  return redactor({ status: record.status, body: Object.fromEntries(bodyMap.entries()) })
}
