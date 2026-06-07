# Regex Property Matching

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: [/api/i] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "apiKey": "key1", "nested": { "apiToken": "tok1" }, "name": "app" }
```

## Output

```json
{ "apiKey": "[REDACTED]", "nested": { "apiToken": "[REDACTED]" }, "name": "app" }
```
