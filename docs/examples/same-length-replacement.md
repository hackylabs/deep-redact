# Same Length Replacement

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({
  paths: ['user.token'],
  censor: '*',
  replaceStringByLength: true,
})

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "token": "abc123", "name": "Alice" } }
```

## Output

```json
{ "user": { "token": "******", "name": "Alice" } }
```
