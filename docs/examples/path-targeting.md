# Path Targeting

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: ['user.profile.ssn', 'user.credentials.token'] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "user": { "profile": { "ssn": "123-45-6789", "name": "Alice" }, "credentials": { "token": "tok1", "type": "bearer" } } }
```

## Output

```json
{ "user": { "profile": { "ssn": "[REDACTED]", "name": "Alice" }, "credentials": { "token": "[REDACTED]", "type": "bearer" } } }
```
