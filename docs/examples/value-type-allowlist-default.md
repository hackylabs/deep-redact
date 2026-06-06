# Value Type Allowlist Default

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

// With no `types` option, redaction defaults to strings only (matching Deep Redact v3):
// a non-string value at a targeted key is left untouched.
const redactor = deepRedact({ keys: ['secret'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "secret": "classified", "account": { "secret": 42 } }
```

## Output

```json
{ "secret": "[REDACTED]", "account": { "secret": 42 } }
```
