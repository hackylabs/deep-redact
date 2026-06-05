# Case Insensitive Key Matching

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password'], caseSensitiveKeyMatch: false })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "credentials": { "PASSWORD": "pass1", "passwordHint": "favourite city" } }
```

## Output

```json
{ "credentials": { "PASSWORD": "[REDACTED]", "passwordHint": "favourite city" } }
```
