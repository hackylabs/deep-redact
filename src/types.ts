export type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'object' | 'function' | 'symbol' | 'undefined'

export type Transformer = (value: unknown) => unknown

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

export interface BaseDeepRedactConfig {
  /**
   * Keys that should be redacted. Can be a string, or an object with additional configuration options.
   * @default []
   * @example ['password', 'ssn'] // redact any key that is 'password' or 'ssn'.
   * @example [{ key: 'address', fuzzyKeyMatch: true, caseSensitiveKeyMatch: false }] // redact any key that contains 'address' regardless of case.
   */
  blacklistedKeys?: Array<string | RegExp | BlacklistKeyConfig>

  blacklistedKeysTransformed: Array<Required<BlacklistKeyConfig>>

  /**
   * Redact a string value that matches a test pattern.
   * @default []
   * @example [
   *   /^[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}$/,  // redact any string that looks like an IP address.
   * ]
   */
  stringTests?: RegExp[]

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
   * A function that transforms unsupported data types into a format support by JSON.stringify. If not provided, the default transformer will be used.
   *
   * The default transformer will be ignored when `serialise` is false, otherwise it will be used to transform the following types:
   * - BigInt
   * - Error
   * - RegExp
   * - Date
   *
   * @param value The value that is not supported by JSON.stringify.
   * @returns The value in a format that is supported by JSON.stringify.
   */
  unsupportedTransformer?: Transformer
}

export type DeepRedactConfig = Partial<Omit<BaseDeepRedactConfig, 'blacklistedKeysTransformed' | 'blacklistedKeys' | 'stringTests'>> & ({
  blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
  stringTests: BaseDeepRedactConfig['stringTests']
} | {
  blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
} | {
  stringTests: BaseDeepRedactConfig['stringTests']
})

export type RedactorUtilsConfig = Omit<BaseDeepRedactConfig, 'blacklistedKeysTransformed' | 'unsupportedTransformer' | 'serialise'>

export type TransformerUtilsConfig = Pick<BaseDeepRedactConfig, 'serialise' | 'unsupportedTransformer'>

export interface TransformerUtils {
  /**
   * A WeakSet to store circular references during redaction. Reset to null after redaction is complete.
   */
  circularReference: WeakSet<object> | null

  /**
   * The configuration for the transformer.
   */
  config: TransformerUtilsConfig

  /**
   * A transformer for unsupported data types. This will be used when `serialise` is true, or when a custom transformer is not provided.
   * @private
   * @param {unknown} value The value that is not supported by JSON.stringify.
   * @returns {unknown} The value in a format that is supported by JSON.stringify.
   */
  unsupportedTransformer: Transformer

  /**
   * Get the transformer for unsupported data types. If a custom transformer is provided, it will be used, otherwise the default transformer will be used.
   * @returns {Transformer} The transformer for unsupported data types.
   */
  getUnsupportedTransformer: () => Transformer

  /**
   * Rewrite unsupported data types into a format supported by JSON.stringify. Circular references will be replaced with a string containing the path to the original value.
   * @param {unknown} value The value to rewrite.
   * @param {string} path The path to the value in the object.
   * @returns {unknown} The rewritten value.
   */
  rewriteUnsupported: (value: unknown, path?: string) => unknown

  /**
   * Depending on the value of `serialise`, return the value as a JSON string or as the provided value.
   * @param value
   */
  maybeSerialise: (value: unknown) => unknown
}

export interface RedactorUtils {
  /**
   * The configuration for redaction.
   */
  config: Required<Omit<DeepRedactConfig, 'serialise' | 'unsupportedTransformer'> & {
    blacklistedKeysTransformed: BaseDeepRedactConfig['blacklistedKeysTransformed']
    blacklistedKeys: BaseDeepRedactConfig['blacklistedKeys']
  }>

  /**
   * Normalise a string for comparison. This will convert the string to lowercase and remove any non-word characters.
   * @param str The string to normalise.
   * @returns {string} The normalised string.
   */
  normaliseString: (value: string) => string

  /**
   * Determine if a key matches a given blacklistedKeyConfig. This will check the key against the blacklisted keys, using the configuration option for the given key falling back to the default configuration.
   * @param {string} key The key to check.
   * @param {BlacklistKeyConfig} config The configuration for the key.
   * @returns {boolean} Whether the key should be redacted.
   */
  complexKeyMatch: (key: string, config: BlacklistKeyConfig) => boolean

  getBlacklistedKeyConfig: (key: string) => Required<BlacklistKeyConfig> | undefined

  redactString: (value: string, replacement: Transformer | string, remove: boolean, shouldRedact: boolean) => unknown

  matchKeyByRootConfig: (key: string, blacklistedKey: string) => boolean

  /**
   * Determine if a key should be redacted. This will check the key against the blacklisted keys, using the default configuration.
   * @param {string} key The key to check.
   * @returns {boolean} Whether the key should be redacted.
   */
  shouldRedactObjectValue: (key: string) => boolean

  /**
   * Get the recursion configuration for a key. This will check the key against the transformed blacklisted keys.
   * If the key is found, the configuration for the key will be returned, otherwise undefined.
   * @param {string} key The key of the configuration to get.
   * @returns {Required<Pick<BlacklistKeyConfig, 'remove' | 'replacement' | 'retainStructure'>>} The configuration for the key.
   */
  getRecursionConfig: (key: string | null) => Required<Pick<BlacklistKeyConfig, 'remove' | 'replacement' | 'retainStructure'>>

  /**
   * Redact a primitive value. This will redact the value if it is a supported type, not an object or array, otherwise it will return the value unchanged.
   * @param {unknown} value The value to redact.
   * @param {Transformer | string} replacement The replacement value for redacted data.
   * @param {boolean} remove Whether the redacted data should be removed.
   * @param {boolean} parentShouldRedact Whether the value should be redacted based on the parent key.
   * @returns {unknown} The redacted value.
   */
  redactPrimitive: (value: unknown, replacement: Transformer | string, remove: boolean, parentShouldRedact?: boolean) => unknown

  /**
   * Redact an array. This will redact each value in the array using the `recurse` method.
   * @param {unknown[]} value The array to redact.
   * @returns {unknown[]} The redacted array.
   */
  redactArray: (value: unknown[]) => unknown[]

  /**
   * Redact an object. This will recursively redact the object based on the configuration, redacting the keys and values as required.
   */
  redactObject: (value: Object, key: string | null, parentShouldRedact?: boolean) => Record<string, unknown>

  /**
   * Redact a value. If the value is an object or array, the redaction will be performed recursively, otherwise the value will be redacted if it is a supported type using the `replace` method.
   * @param {unknown} value The value to redact.
   * @param {boolean} parentShouldRedact Whether the parent object should be redacted.
   * @returns {unknown} The redacted value.
   */
  recurse: (value: unknown, key?: string | null, parentShouldRedact?: boolean) => unknown
}
