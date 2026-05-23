# Retain Structure

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: [{ path: 'credentials', retainStructure: true }],
})

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "credentials": { "apiKey": "key1", "secret": "sec1" }, "name": "app" }
```

## Output

```json
{ "credentials": { "apiKey": "[REDACTED]", "secret": "[REDACTED]" }, "name": "app" }
```
