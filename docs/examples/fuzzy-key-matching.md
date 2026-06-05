# Fuzzy Key Matching

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ keys: ['password'], fuzzyKeyMatch: true })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "credentials": { "passwordHash": "sha256:abc123", "username": "alice" } }
```

## Output

```json
{ "credentials": { "passwordHash": "[REDACTED]", "username": "alice" } }
```
