export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object' | 'function' | 'symbol' | 'undefined'

export type Transformer = (value: unknown, key?: string | number | null, reference?: WeakMap<object, unknown>) => unknown

export interface BlacklistKeyConfig {
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
   * Replace string values with a redacted string of the same length, using the `replacement` option. Ignored if `remove` is true, `replacement` is a function, or the value is not a string.
   * @default false
   * @example true // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `**********************`
   * @example false // if `replacement` equals `*` then `joe.bloggs@example.com` becomes `*`
   */
  replacement?: string | ((value: unknown) => unknown)

  /**
   * The key to redact. Can be a string or a RegExp.
   * @example 'address' // redact any key that is 'address'.
   * @example /^address$/ // redact any key that is exactly 'address'.
   */
  key: string | RegExp
}

export interface ComplexStringTest {
  pattern: RegExp,
  replacer: (value: string, pattern: RegExp) => string
}

export interface BaseDeepRedactConfig {
  /**
   * Keys that should be redacted. Can be a string, or an object with additional configuration options.
   * @default []
   * @example ['password', 'ssn'] // redact any key that is 'password' or 'ssn'.
   * @example [{ key: 'address', fuzzyKeyMatch: true, caseSensitiveKeyMatch: false }] // redact any key that contains 'address' regardless of case.
   */
  blacklistedKeys?: Array<string | RegExp | BlacklistKeyConfig>

  /**
   * Internal use only.
   */
  _blacklistedKeysTransformed: Array<Required<BlacklistKeyConfig>>

  /**
   * Redact a string value that matches a test pattern.
   * @default []
   * @example [
   *   /^[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}$/,  // redact any string that looks like an IP address.
   * ]
   */
  stringTests?: Array<RegExp | ComplexStringTest>

  partialStringTests?: Array<ComplexStringTest>

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
   * A list of transformers to apply when transforming unsupported values.
   * Each transformer should conditionally transform the value, or return the value unchanged to be passed to the next transformer.
   * Transformers will be run in the order they are provided recursively over the entire object.
   * @default []
   * @example [
   *   // redact a key by name.
   *   standardTransformers.redactByKey,
   *   // convert a Date to an ISO string.
   *   (value: unknown) => {
   *     if (!(value instanceof Date)) return value
   *     return value.toISOString()
   *   },
   *   // convert a BigInt to a string.
   *   (value: unknown) => {
   *     if (typeof value !== 'bigint') return value
   *     return value.toString(10)
   *   }
   */
  transformers?: Array<Transformer>

  /**
   * Enable logging of the redaction process.
   * @default false
   */
  enableLogging?: boolean
}

export type DeepRedactConfig = Partial<Omit<BaseDeepRedactConfig, '_blacklistedKeysTransformed' | 'blacklistedKeys' | 'stringTests'>> & ({
  partialStringTests: BaseDeepRedactConfig['partialStringTests']
  blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
  stringTests: BaseDeepRedactConfig['stringTests']
} | {
  partialStringTests: BaseDeepRedactConfig['partialStringTests']
  blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
} | {
  blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
  stringTests: BaseDeepRedactConfig['stringTests']
} | {
  partialStringTests: BaseDeepRedactConfig['partialStringTests']
  stringTests: BaseDeepRedactConfig['stringTests']
} | {
  partialStringTests: BaseDeepRedactConfig['partialStringTests']
} | {
  blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
} | {
  stringTests: BaseDeepRedactConfig['stringTests']
})

export type RedactorUtilsConfig = Omit<BaseDeepRedactConfig, 'serialise' | 'serialize'>

export type StackReference = WeakMap<object, unknown>

export type Stack = Array<{ parent: any, key: string | number | null, value: unknown, path: Array<string | number>, redactingParent: boolean }>

export type Logs = Array<{ path: string, message: string, raw: unknown, transformed: unknown }> | null
