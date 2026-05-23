# Key Targeting

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password', 'secret'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "password": "pass1", "name": "Alice" }, "config": { "secret": "sec1", "timeout": 30 } }
```

## Output

```json
{ "user": { "password": "[REDACTED]", "name": "Alice" }, "config": { "secret": "[REDACTED]", "timeout": 30 } }
```
