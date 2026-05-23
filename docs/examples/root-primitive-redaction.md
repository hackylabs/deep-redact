# Root Primitive Redaction

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ stringTests: [/api-key=[^\s&]+/] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
"api-key=sk-1234567890"
```

## Output

```json
"[REDACTED]"
```
