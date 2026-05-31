# Custom Transformer

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  keys: ['token'],
})

export const runExample = (input: unknown): unknown => {
  const record = input as { status: number; body: Record<string, unknown> }
  const bodyMap = new Map(Object.entries(record.body))
  return redactor({ status: record.status, body: Object.fromEntries(bodyMap.entries()) })
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
