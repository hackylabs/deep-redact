# Substring Targeting

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  stringTests: [{
    pattern: /\d{3}-\d{3}-\d{4}/g,
    replacer: (value, pattern) => value.replace(pattern, '[REDACTED]'),
  }],
})

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "message": "Call 555-867-5309 for info", "subject": "Contact request" }
```

## Output

```json
{ "message": "Call [REDACTED] for info", "subject": "Contact request" }
```
