# Singleton Setup

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.password', 'token'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "password": "s3cret" }, "token": "abc123", "ok": true }
```

## Output

```json
{ "user": { "password": "[REDACTED]" }, "token": "[REDACTED]", "ok": true }
```
