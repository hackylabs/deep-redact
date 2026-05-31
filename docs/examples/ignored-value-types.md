# Ignored Value Types

```typescript
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
```

## Input

```json
{ "isoDate": "2026-01-01T12:00:00.000Z", "name": "app-service" }
```

## Serialised output

```text
{"event":{"_transformer":"date","datetime":"2026-01-01T12:00:00.000Z"},"name":"app-service"}
```
