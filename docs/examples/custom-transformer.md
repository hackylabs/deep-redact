# Custom Transformer

```typescript
import { deepRedact, type Transformer } from '@hackylabs/deep-redact'

class AccountRecord {
  public readonly id: string
  public readonly token: string

  constructor(id: string, token: string) {
    this.id = id
    this.token = token
  }
}

const accountTransformer: Transformer = (value) => {
  if (!(value instanceof AccountRecord)) {
    return value
  }

  return {
    id: value.id,
    type: 'account',
  }
}

const redactor = deepRedact({
  serialise: true,
  transformers: {
    byConstructor: {
      custom: [
        { constructor: AccountRecord, transformers: [accountTransformer] },
      ],
    },
  },
})

export const runExample = (input: unknown): unknown => {
  const record = input as { id: string; token: string }

  return redactor(new AccountRecord(record.id, record.token))
}
```

## Input

```json
{ "id": "acct-1", "token": "tok-1234" }
```

## Serialised output

```text
{"id":"acct-1","type":"account"}
```
