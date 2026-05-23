# Custom Transformer

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  keys: ['token'],
  transformers: {
    byConstructor: {
      Map: [(value: unknown) => {
        if (!(value instanceof Map)) return value
        return Object.fromEntries(value.entries())
      }],
    },
  },
})

export const runExample = (input: unknown): unknown => {
  const record = input as { status: number; body: Record<string, unknown> }
  const bodyMap = new Map(Object.entries(record.body))
  return redactor({ status: record.status, body: bodyMap })
}
```

## Input

```json
{ "status": 200, "body": { "token": "tok-1234", "data": "user-data" } }
```

## Output

```json
{ "status": 200, "body": { "token": "[REDACTED]", "data": "user-data" } }
```
