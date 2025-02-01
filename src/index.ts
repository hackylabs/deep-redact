import { DeepRedactConfig, RedactorUtilsConfig, BlacklistKeyConfig, Types, Transformer, ComplexStringTest, BaseDeepRedactConfig } from './types'
import RedactorUtils from './utils/redactorUtils'

class DeepRedact {
  /**
   * The redactorUtils instance to handle the redaction.
   * @private
   */
  private redactorUtils: RedactorUtils

  /**
   * A WeakSet to store circular references during redaction. Reset to null after redaction is complete.
   * @private
   */
  private circularReference: WeakSet<object> | null = null

  /**
   * The configuration for the redaction.
   * @private
   */
  private readonly config = {
    serialise: false,
  }

  /**
   * Create a new DeepRedact instance with the provided configuration.
   * The configuration will be merged with the default configuration.
   * `blacklistedKeys` will be normalised to an array inherited from the default configuration as the default values.
   * @param {DeepRedactConfig} config. The configuration for the redaction.
   */
  constructor(config: DeepRedactConfig) {
    const { serialise, serialize, ...rest } = config
    this.redactorUtils = new RedactorUtils(rest)

    if (serialise !== undefined) this.config.serialise = serialise
    if (serialize !== undefined) this.config.serialise = serialize
  }

  /**
   * A transformer for unsupported data types. If `serialise` is false, the value will be returned as is,
   * otherwise it will transform the value into a format that is supported by JSON.stringify.
   *
   * Error, RegExp, and Date instances are technically supported by JSON.stringify,
   * but they returned as empty objects, therefore they are also transformed here.
   * @protected
   * @param {unknown} value The value that is not supported by JSON.stringify.
   * @returns {unknown} The value in a format that is supported by JSON.stringify.
   */
  protected unsupportedTransformer = (value: unknown): unknown => {
    if (typeof value === 'bigint') {
      return {
        __unsupported: {
          type: 'bigint',
          value: value.toString(10),
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

    if (value instanceof Set) {
      return {
        __unsupported: {
          type: 'set',
          values: Array.from(value),
        },
      }
    }

    if (value instanceof Map) {
      return {
        __unsupported: {
          type: 'map',
          entries: Object.fromEntries(value.entries()),
        },
      }
    }

    if (value instanceof URL) return value.toString()
    if (value instanceof Date) return value.toISOString()

    return value
  }

  /**
   * Calls `unsupportedTransformer` on the provided value and rewrites any circular references.
   *
   * Circular references will always be removed to avoid infinite recursion.
   * When a circular reference is found, the value will be replaced with `[[CIRCULAR_REFERENCE: path.to.original.value]]`.
   * @protected
   * @param {unknown} value The value to rewrite.
   * @param {string | undefined} path The path to the value in the object.
   * @returns {unknown} The rewritten value.
   */
  protected rewriteUnsupported = (value: unknown, path?: string): unknown => {
    const safeValue = this.unsupportedTransformer(value)
    if (!(safeValue instanceof Object)) return safeValue
    if (this.circularReference === null) this.circularReference = new WeakSet()
    if (Array.isArray(safeValue)) {
      return safeValue.map((val, index) => {
        const newPath = path ? `${path}.[${index}]` : `[${index}]`
        if (this.circularReference?.has(val)) return `[[CIRCULAR_REFERENCE: ${newPath}]]`
        if (val instanceof Object) {
          this.circularReference?.add(val)
          return this.rewriteUnsupported(val, newPath)
        }
        return val
      })
    }
    return Object.fromEntries(Object.entries(safeValue).map(([key, val]) => {
      const newPath = path ? `${path}.${key}` : key
      if (this.circularReference?.has(val)) return [key, `[[CIRCULAR_REFERENCE: ${newPath}]]`]
      if (val instanceof Object) this.circularReference?.add(val)
      return [key, this.rewriteUnsupported(val, path ? `${path}.${key}` : key)]
    }))
  }

  /**
   * Depending on the value of `serialise`, return the value as a JSON string or as the provided value.
   *
   * Also resets the `circularReference` property to null after redaction is complete.
   * This is to ensure that the WeakSet doesn't cause memory leaks.
   * @private
   * @param value
   * @returns {unknown} The value as a JSON string or as the provided value.
   * @throws {Error} If the value cannot be serialised.
   */
  private maybeSerialise = (value: unknown): unknown => {
    this.circularReference = null
    if (!this.config.serialise) return value
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch (error) {
      throw new Error('Failed to serialise value. Did you override the `unsupportedTransformer` method and return a value that is not supported by JSON.stringify?')
    }
  }

  /**
   * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
   * @param {unknown} value The value to redact.
   * @returns {unknown} The redacted value.
   * @throws {Error} If the value cannot be serialised.
   */
  redact = (value: unknown): unknown => {
    return this.maybeSerialise(this.redactorUtils.recurse(this.rewriteUnsupported(value)))
  }
}

export {
  DeepRedact as default,
  DeepRedact,
  type BaseDeepRedactConfig,
  type RedactorUtilsConfig,
  type BlacklistKeyConfig,
  type ComplexStringTest,
  type Transformer,
  type Types,
}
