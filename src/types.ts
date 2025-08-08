export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object' | 'function' | 'symbol' | 'undefined'

export type Transformer = (value: unknown, key?: string, reference?: WeakMap<object, unknown>) => unknown

/**
 * Configuration for organised transformers by type and constructor
 */
export interface OrganisedTransformers {
  /**
   * Transformers for primitive types (based on typeof result)
   */
  byType?: {
    bigint?: Transformer[]
    string?: Transformer[]
    number?: Transformer[]
    boolean?: Transformer[]
    symbol?: Transformer[]
    function?: Transformer[]
    object?: Transformer[]
    undefined?: Transformer[]
  }

  /**
   * Transformers for specific constructors (based on instanceof checks)
   */
  byConstructor?: {
    Date?: Transformer[]
    Error?: Transformer[]
    Map?: Transformer[]
    Set?: Transformer[]
    RegExp?: Transformer[]
    URL?: Transformer[]
    [key: string]: Transformer[] | undefined
  }

  /**
   * Transformers that run on all values (like the current system)
   */
  fallback?: Transformer[]
}

/**
 * Transformer configuration - supports both old array format and new organised format
 */
export type TransformerConfig = Transformer[] | OrganisedTransformers

export interface ObjectPathConfig {
  /**
   * Perform a fuzzy match on the key. This will match any key that contains the string, rather than a case-sensitive match.
   * @default false
   * @example true // match any key that contains the string 'address', such as 'homeAddress', 'workAddress', 'addressLine1', etc.
   * @example false // match only keys that contain 'address' from start to end.
   */
  fuzzyKeyMatch?: boolean

  /**
   * Perform a case-sensitive match on the key
   * @default true
   * @example false // match any key that contains the string 'address' regardless of upper, lower, snake, camel or any other case.
   * @example true // match only keys that are exactly 'address' in the same case.
   */
  caseSensitiveKeyMatch?: boolean

  /**
   * Retain the structure of the object, but redact the values.
   * @default false
   * @example true // retain the structure of the object, but redact the values. { a: '1' } => becomes { a: '[REDACTED]' }
   * @example false // redact the entire object. { a: '1' } => becomes '[REDACTED]'
   */
  retainStructure?: boolean

  /**
   * Remove the redacted data instead of replacing it with the `replacement` value.
   * @default false // replace the redacted data with the `replacement` value.
   * @example true // remove the redacted data.
   */
  remove?: boolean

  /**
   * The replacement value for redacted data. Can be a string, or a function that takes the original value and returns any value.
   * @default '[REDACTED]'
   * @example '*' // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `**********************`
   * @example (value) => `REDACTED: ${typeof value}` // redact the value with a prefix of 'REDACTED: ' and the type of the value.
   * @example (value) => return typeof value === 'string' ? '*'.repeat(value.length) : '[REDACTED]' // redact the value with a string of the same length.
   * @param value The original value that is being redacted.
   * @returns The redacted value or undefined to remove the value.
   */
  replacement?: string | ((value: unknown) => unknown)

  /**
   * Replace string values with a redacted string of the same length, using the `replacement` option. Ignored if `remove` is true, `replacement` is a function, or the value is not a string.
   * @default false
   * @example true // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `**********************`
   * @example false // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `*`
   */
  replaceStringByLength?: boolean

  /**
   * The types of values that should be redacted. If the value is not one of these types, it will not be redacted.
   * @default ['string']
   * @example ['string', 'number'] // redact only strings and numbers, leave other types unchanged.
   */
  types?: Types[]

  /**
   * The object path to redact. Must be an array containing any of mixture of strings, numbers, or RegExps.
   * @example ['payment', 'card', '*'] // redact any value that is at the object path 'payment.card.*'.
   * @example ['*', 'address', '**'] // redact any value that is deeply nested in the object path '*.address.**'.
   * @example ['*', /(user|home)Address/gi, '**'] // redact any value that is at the object path '*.userAddress.**.payment.card.*' or '*.homeAddress.**.payment.card.*'.
   */
  path: Array<string | number | RegExp>
}

export interface ComplexStringTest {
  pattern: RegExp,
  replacer: (value: string, pattern: RegExp) => string
}

export interface BaseDeepRedactConfig {
  /**
   * Object paths that should be redacted. Can be any valid glob pattern, or an object with additional configuration options.
   * @default []
   * @example ['password', 'ssn'] // redact any value that is 'password' or 'ssn'.
   * @example [{ value: 'payment.card.*' }] // redact any value that's contained in the object path 'payment.card.*'.
   */
  paths?: Array<ObjectPathConfig | Array<string | number | RegExp>>

  /**
   * Redact a string value that matches a test pattern.
   * @default []
   * @example [
   *   /^[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}$/,  // redact any string that looks like an IP address.
   * ]
   */
  stringTests?: Array<RegExp | ComplexStringTest>

  /**
   * Perform a fuzzy match on the key. This will match any key that contains the string, rather than a case-sensitive match.
   * @default false
   * @example true // match any key that contains the string 'address', such as 'homeAddress', 'workAddress', 'addressLine1', etc.
   * @example false // match only keys that contain 'address' from start to end.
   */
  fuzzyKeyMatch?: boolean

  /**
   * Perform a case-sensitive match on the key
   * @default true
   * @example false // match any key that contains the string 'address' regardless of upper, lower, snake, camel or any other case.
   * @example true // match only keys that are exactly 'address' in the same case.
   */
  caseSensitiveKeyMatch?: boolean

  /**
   * Retain the structure of the object, but redact the values.
   * @default false
   * @example true // retain the structure of the object, but redact the values. { a: '1' } => becomes { a: '[REDACTED]' }
   * @example false // redact the entire object. { a: '1' } => becomes '[REDACTED]'
   */
  retainStructure?: boolean

  /**
   * Replace string values with a redacted string of the same length, using the `replacement` option. Ignored if `remove` is true, `replacement` is a function, or the value is not a string.
   * @default false
   * @example true // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `**********************`
   * @example false // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `*`
   */
  replaceStringByLength?: boolean

  /**
   * The replacement value for redacted data. Can be a string, or a function that takes the original value and returns any value.
   * @default '[REDACTED]'
   * @example (value) => `REDACTED: ${typeof value}` // redact the value with a prefix of 'REDACTED: ' and the type of the value.
   * @example (value) => return typeof value === 'string' ? '*'.repeat(value.length) : '[REDACTED]' // redact the value with a string of the same length.
   * @param value The original value that is being redacted.
   * @returns The redacted value or undefined to remove the value.
   */
  replacement?: string | Transformer

  /**
   * Remove the redacted data instead of replacing it with the `replacement` value.
   */
  remove?: boolean

  /**
   * The types of values that should be redacted. If the value is not one of these types, it will not be redacted.
   * @default ['string']
   * @example ['string', 'number'] // redact only strings and numbers, leave other types unchanged.
   */
  types?: Types[]

  /**
   * Serialise the redacted data. If true, the redacted data will be returned as a JSON string. If false, it will be returned as an object.
   * @default true
   * @example true // return the redacted data as a JSON string.
   * @example false // return the redacted data as the same type as the original data.
   */
  serialise?: boolean,

  /**
   * Alias of `serialise` for International-English users.
   */
  serialize?: boolean

  /**
   * Configuration for transformers to apply when transforming unsupported values.
   * Supports both legacy array format and new organised format for better performance.
   * 
   * Legacy format: Array of transformers that run on all values in order
   * New format: Object with transformers organised by type and constructor
   * 
   * @default []
   * @example
   * // Legacy format (still supported)
   * [
   *   (value: unknown) => {
   *     if (typeof value !== 'bigint') return value
   *     return value.toString(10)
   *   },
   *   (value: unknown) => {
   *     if (!(value instanceof Date)) return value
   *     return value.toISOString()
   *   }
   * ]
   * 
   * @example
   * {
   *   byType: {
   *     bigint: [(value: unknown) => (value as bigint).toString(10)]
   *   },
   *   byConstructor: {
   *     Date: [(value: unknown) => (value as Date).toISOString()]
   *   },
   *   fallback: [
   *     // transformers that run on all values
   *   ]
   * }
   */
  transformers?: TransformerConfig
}

export type DeepRedactConfig = Partial<Omit<BaseDeepRedactConfig, '_blacklistedKeysTransformed' | 'blacklistedKeys' | 'stringTests'>> & ({
  paths: BaseDeepRedactConfig['paths']
  stringTests: BaseDeepRedactConfig['stringTests']
} | {
  paths: BaseDeepRedactConfig['paths']
} | {
  stringTests: BaseDeepRedactConfig['stringTests']
})

export type RedactorUtilsConfig = Omit<BaseDeepRedactConfig, 'serialise' | 'serialize'>

export type StackReference = WeakMap<object, unknown>

export type Stack = Array<{ 
  parent: any, 
  key: string, 
  value: unknown, 
  path: Array<string | number>, 
  redactingParent: boolean
  pathConfig?: ObjectPathConfig
}>
