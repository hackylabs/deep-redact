# Replacement And Removal

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: [
    { path: 'user.password', remove: true },
    'user.token',
  ],
})

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "password": "secret", "token": "tok1", "name": "Alice" } }
```

## Output

```json
{ "user": { "token": "[REDACTED]", "name": "Alice" } }
```
