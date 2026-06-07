# Migration Fast Redact Dot Path Structured Output

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.password'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{
  "user": {
    "name": "Ada",
    "password": "secret"
  },
  "requestId": "req-1"
}
```

## Output

```json
{
  "user": {
    "name": "Ada",
    "password": "[REDACTED]"
  },
  "requestId": "req-1"
}
```
