import { DeepRedactConfig, RedactorUtils, TransformerUtils } from './types'
import redactorUtils from './utils/redactorUtils'
import transformUnsupported from './utils/transformUnsupported'

class DeepRedact {
  private redactorUtils: RedactorUtils

  private transformerUtils: TransformerUtils

  /**
   * Create a new DeepRedact instance with the provided configuration.
   * The configuration will be merged with the default configuration.
   * `blacklistedKeys` will be normalised to an array inherited from the default configuration as the default values.
   * @param {DeepRedactConfig} config. The configuration for the redaction.
   */
  constructor(config: DeepRedactConfig) {
    const { serialise, unsupportedTransformer, ...rest } = config
    this.transformerUtils = transformUnsupported({ unsupportedTransformer, serialise })
    this.redactorUtils = redactorUtils(rest)
  }

  /**
   * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
   * @param {unknown} value The value to redact.
   * @returns {unknown} The redacted value.
   */
  redact = (value: unknown): unknown => {
    return this.transformerUtils.maybeSerialise(this.redactorUtils.recurse(this.transformerUtils.rewriteUnsupported(value)))
  }
}

export { DeepRedact as default, DeepRedact }
