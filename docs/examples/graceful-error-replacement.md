# Graceful Error Replacement

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.password', 'config.apiKey'],
  censor: (value: unknown) => {
    if (value === 'will-fail') throw new Error('value cannot be censored safely')
    return '[REDACTED]'
  },
})

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "password": "safe-password", "name": "Alice" }, "config": { "apiKey": "will-fail" } }
```

## Output

```json
{ "user": { "password": "[REDACTED]", "name": "Alice" }, "config": { "apiKey": "[UNSUPPORTED]" } }
```
