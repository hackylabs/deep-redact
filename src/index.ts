import type { DeepRedactConfig, RedactorUtilsConfig, BlacklistKeyConfig, Types, Transformer, ComplexStringTest, BaseDeepRedactConfig } from './types'
import { standardTransformers } from './utils/standardTransformers'
import RedactorUtils from './utils/redactorUtils'

class DeepRedact {
  /**
   * The redactorUtils instance to handle the redaction.
   * @private
   */
  private redactorUtils: RedactorUtils

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
    const { serialise, serialize, transformers, ...rest } = config
    const englishSerialise = serialise ?? serialize
    if (typeof englishSerialise === 'boolean') this.config.serialise = englishSerialise

    this.redactorUtils = new RedactorUtils({
      transformers: transformers ?? (englishSerialise ? standardTransformers : []),
      ...rest,
    })
  }

  /**
   * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
   * @param {unknown} value The value to redact.
   * @returns {unknown} The redacted value.
   * @throws {Error} If the value cannot be serialised to JSON and serialise is true.
   */
  redact = (value: unknown): unknown => {
    const redacted = this.redactorUtils.traverse(value)
    return this.config.serialise ? JSON.stringify(redacted) : redacted
  }
}

export {
  DeepRedact,
  DeepRedact as default,
  type BaseDeepRedactConfig,
  type RedactorUtilsConfig,
  type BlacklistKeyConfig,
  type ComplexStringTest,
  type Transformer,
  type Types,
}
