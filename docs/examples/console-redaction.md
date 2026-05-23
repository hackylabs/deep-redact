# Console Redaction

```typescript
import { deepRedact } from '@hackylabs/deep-redact'
import { createRedactedConsole } from '@hackylabs/deep-redact/adapters/console'

const redactor = deepRedact({ keys: ['password', 'token'] })

export const runExample = (input: unknown): unknown => {
  let captured: unknown
  const fakeConsole = {
    debug: (...args: unknown[]) => { captured = args[0] },
    error: (...args: unknown[]) => { captured = args[0] },
    info: (...args: unknown[]) => { captured = args[0] },
    log: (...args: unknown[]) => { captured = args[0] },
    trace: (...args: unknown[]) => { captured = args[0] },
    warn: (...args: unknown[]) => { captured = args[0] },
  }
  const redactedConsole = createRedactedConsole(redactor, fakeConsole)
  redactedConsole.log(input)
  return captured
}
```

## Input

```json
{ "user": { "password": "s3cret", "name": "Alice" }, "token": "abc123" }
```

## Output

```json
{ "user": { "password": "[REDACTED]", "name": "Alice" }, "token": "[REDACTED]" }
```
