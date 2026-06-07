# Serialised Output

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.password'],
  serialise: true,
})

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "password": "secret", "name": "Alice" } }
```

## Serialised output

```text
{"user":{"password":"[REDACTED]","name":"Alice"}}
```
