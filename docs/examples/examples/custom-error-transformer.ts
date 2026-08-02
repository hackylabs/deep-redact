import { deepRedact, type Transformer } from '@hackylabs/deep-redact'

// A minimal stand-in for an AxiosError: an Error subclass carrying a nested request payload. By
// default an Error is a terminal leaf, so PII inside `config.data` would pass through unmasked.
class RequestError extends Error {
  public readonly config: { data: unknown }

  constructor(message: string, data: unknown) {
    super(message)
    this.name = 'RequestError'
    this.config = { data }
  }
}

// A per-class `byConstructor.Error` transformer runs BEFORE regular traversal, in both serialise
// modes. It converts the Error to the plain object returned here, which deep-redact then scrubs with
// the configured `keys` — so the nested `config.data.password` is redacted without a pre-normalise
// step. (Relying on a transformer that only runs during the serialise pass is deprecated; a
// per-class transformer like this is the supported replacement.)
const errorTransformer: Transformer = (value) => {
  if (!(value instanceof RequestError)) {
    return value
  }

  return {
    name: value.name,
    message: value.message,
    config: value.config,
  }
}

const redactor = deepRedact({
  serialise: true,
  keys: ['password'],
  transformers: {
    byConstructor: {
      Error: [errorTransformer],
    },
  },
})

export const runExample = (input: unknown): unknown => {
  const request = input as { message: string; data: unknown }

  return redactor(new RequestError(request.message, request.data))
}
