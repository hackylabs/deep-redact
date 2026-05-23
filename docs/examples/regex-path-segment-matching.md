# Regex Path Segment Matching

```typescript
import { deepRedact } from '@hackylabs/deep-redact'

const redactor = deepRedact({ paths: [['config', /password|secret/i]] })

export const runExample = (input: unknown): unknown => redactor(input)
```

## Input

```json
{ "config": { "db_password": "pass1", "db_host": "localhost", "app_secret": "sec1" }, "name": "app" }
```

## Output

```json
{ "config": { "db_password": "[REDACTED]", "db_host": "localhost", "app_secret": "[REDACTED]" }, "name": "app" }
```
