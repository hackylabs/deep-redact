# Path Segment Ignore

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: [['users', { ignore: 'admin' }, 'email']] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "users": { "admin": { "email": "admin@example.test", "role": "owner" }, "customer": { "email": "customer@example.test", "role": "buyer" } } }
```

## Output

```json
{ "users": { "admin": { "email": "admin@example.test", "role": "owner" }, "customer": { "email": "[REDACTED]", "role": "buyer" } } }
```
