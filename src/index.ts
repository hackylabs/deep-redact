export type Redactor = (value: unknown) => unknown

export interface DeepRedactOptions {
  readonly censor?: string | ((value: unknown) => unknown)
  readonly paths?: readonly string[]
  readonly remove?: boolean
  readonly serialise?: boolean
  readonly serialize?: boolean
}

export type RedactorFactory = (options?: DeepRedactOptions) => Redactor

const foundationPlaceholderMessage
  = 'Deep Redact v4 foundation placeholder: the runtime redactor is not implemented yet.'

const createPlaceholderRedactor = (): Redactor => {
  return function redact(_value: unknown): never {
    throw new Error(foundationPlaceholderMessage)
  }
}

export const deepRedact: RedactorFactory = (_options = {}) => {
  return createPlaceholderRedactor()
}

export const createRedactor = deepRedact
