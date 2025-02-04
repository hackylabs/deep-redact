import { DeepRedactConfig, RedactorUtilsConfig, BlacklistKeyConfig, Types, Transformer, ComplexStringTest, BaseDeepRedactConfig } from './types'
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
    const { serialise, serialize, ...rest } = config
    this.redactorUtils = new RedactorUtils(rest)

    if (serialise !== undefined) this.config.serialise = serialise
    if (serialize !== undefined) this.config.serialise = serialize
  }

  /**
   * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
   * @param {unknown} value The value to redact.
   * @returns {unknown} The redacted value.
   * @throws {Error} If the value cannot be serialised.
   */
  redact = (value: unknown): unknown => {
    return this.redactorUtils.traverse(value)
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
