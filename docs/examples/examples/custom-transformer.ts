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
