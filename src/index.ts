export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object' | 'function'

export interface BlacklistKeyConfig {
  fuzzyKeyMatch?: boolean
  caseSensitiveKeyMatch?: boolean
  retainStructure?: boolean
  remove?: boolean
  key: string | RegExp
}

export interface DeepRedactConfig {
  blacklistedKeys?: Array<string | BlacklistKeyConfig>
  stringTests?: RegExp[]
  fuzzyKeyMatch?: boolean
  caseSensitiveKeyMatch?: boolean
  retainStructure?: boolean
  replaceStringByLength?: boolean
  replacement?: string
  remove?: boolean
  types?: Types[]
  serialise?: boolean,
  unsupportedTransformer?: (value: unknown) => unknown
}

const normaliseString = (key: string): string => key.toLowerCase().replace(/\W/g, '')

class DeepRedact {
  private circularReference: WeakSet<object> | null = new WeakSet()

  private readonly config: Required<DeepRedactConfig> = {
    blacklistedKeys: [],
    stringTests: [],
    fuzzyKeyMatch: false,
    caseSensitiveKeyMatch: true,
    retainStructure: false,
    remove: false,
    replaceStringByLength: false,
    replacement: '[REDACTED]',
    types: ['string'],
    serialise: true,
    unsupportedTransformer: DeepRedact.unsupportedTransformer,
  }

  constructor(config: DeepRedactConfig) {
    this.config = {
      ...this.config,
      ...config,
      blacklistedKeys: config.blacklistedKeys?.map((key) => {
        if (typeof key === 'string') return key

        return {
          fuzzyKeyMatch: this.config.fuzzyKeyMatch,
          caseSensitiveKeyMatch: this.config.caseSensitiveKeyMatch,
          retainStructure: this.config.retainStructure,
          remove: this.config.remove,
          ...key,
        }
      }) ?? [],
    }
  }

  private static unsupportedTransformer = (value: unknown): unknown => {
    if (typeof value === 'bigint') {
      return {
        __unsupported: {
          type: 'bigint',
          value: value.toString(),
          radix: 10,
        },
      }
    }

    if (value instanceof Error) {
      return {
        __unsupported: {
          type: 'error',
          name: value.name,
          message: value.message,
          stack: value.stack,
        },
      }
    }

    if (value instanceof RegExp) {
      return {
        __unsupported: {
          type: 'regexp',
          source: value.source,
          flags: value.flags,
        },
      }
    }

    if (value instanceof Date) return value.toISOString()

    return value
  }

  private removeCircular = (value: unknown): unknown => {
    if (!(value instanceof Object)) return value
    if (!this.circularReference?.has(value)) {
      this.circularReference?.add(value)
      return value
    }

    return '__circular__'
  }

  private redactString = (value: string, parentShouldRedact = false): string | undefined => {
    if (!this.config.stringTests.some((test) => test.test(value)) && !parentShouldRedact) return value
    if (this.config.replaceStringByLength) return this.config.replacement.repeat(value.length)
    return this.config.remove ? undefined : this.config.replacement
  }

  private static complexShouldRedact = (key: string, config: BlacklistKeyConfig): boolean => {
    if (config.key instanceof RegExp) return config.key.test(key)
    if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return key.includes(config.key)
    if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch) return normaliseString(key).includes(normaliseString(config.key))
    if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return key === config.key
    return normaliseString(config.key) === normaliseString(key)
  }

  private shouldRedactObjectValue = (key: string): boolean => {
    return this.config.blacklistedKeys.some((redactableKey) => (typeof redactableKey === 'string'
      ? key === redactableKey
      : DeepRedact.complexShouldRedact(key, redactableKey)))
  }

  private deepRedact = (value: unknown, parentShouldRedact = false): unknown => {
    if (value === undefined || value === null) return value

    let safeValue = this.removeCircular(value)
    safeValue = this.config.unsupportedTransformer(safeValue)
    if (!(safeValue instanceof Object)) {
      // @ts-expect-error - we already know that safeValue is not a function, symbol, undefined, null, or an object
      if (!this.config.types.includes(typeof safeValue)) return safeValue
      if (typeof safeValue === 'string') return this.redactString(safeValue, parentShouldRedact)

      if (!parentShouldRedact) return safeValue

      return this.config.remove
        ? undefined
        : this.config.replacement
    }

    if (parentShouldRedact && (!this.config.retainStructure || this.config.remove)) {
      return this.config.remove ? undefined : this.config.replacement
    }

    if (Array.isArray(safeValue)) return safeValue.map((val) => this.deepRedact(val, parentShouldRedact))

    return Object.fromEntries(Object.entries(safeValue).map(([key, val]) => {
      const shouldRedact = parentShouldRedact || this.shouldRedactObjectValue(key)
      return [key, this.deepRedact(val, shouldRedact)]
    }))
  }

  redact = (value: unknown): unknown => {
    this.circularReference = new WeakSet()
    const redacted = this.deepRedact(value)
    this.circularReference = null
    return this.config.serialise ? JSON.stringify(redacted) : redacted
  }
}

export { DeepRedact as default, DeepRedact }
