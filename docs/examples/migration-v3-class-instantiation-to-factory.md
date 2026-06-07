# Migration V3 Class Instantiation To Factory

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password', 'token'], censor: '[REDACTED]' })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{
  "user": {
    "password": "secret123"
  },
  "token": "abc",
  "email": "user@example.com"
}
```

## Output

```json
{
  "user": {
    "password": "[REDACTED]"
  },
  "token": "[REDACTED]",
  "email": "user@example.com"
}
```
