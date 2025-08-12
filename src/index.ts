import type { DeepRedactConfig, RedactorUtilsConfig, Types, Transformer, ComplexStringTest, ObjectPathConfig, BaseDeepRedactConfig, OrganisedTransformers, TransformerConfig } from './types'
import { organisedStandardTransformers, standardTransformers } from './utils/standardTransformers'
import RedactorUtils from './utils'
import { deepRedactPaths, stringPattern, xmlPattern } from '../test/setup/blacklist'

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
    const englishSerialise = serialise ?? serialize
    if (typeof englishSerialise === 'boolean') this.config.serialise = englishSerialise
    this.redactorUtils = new RedactorUtils({ ...rest })
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
  type ObjectPathConfig,
  type ComplexStringTest,
  type Transformer,
  type Types,
  type OrganisedTransformers,
  type TransformerConfig,
  standardTransformers,
  organisedStandardTransformers,
}

if (require.main === module) {
  const deepRedact = new DeepRedact({
    paths: deepRedactPaths,
    stringTests: [{
      pattern: xmlPattern,
      replacer: (value, pattern) => value.replace(pattern, '<$1>[REDACTED]</$1>'),
    }],
  })

  const now = Date.now()
  console.log(deepRedact.redact({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    password: 'password123',
    birthDate: '1990-01-01',
    ip: '127.0.0.1',
    ein: '123456789',
    ssn: '123456789',
    address: {
      addressLine1: '123 Main St',
      addressLine2: 'Apt 1',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'USA',
    },
    company: {
      name: 'Acme Inc',
      address: {
        addressLine1: '123 Main St',
        addressLine2: 'Apt 1',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
      },
      phone: '1234567890',
      email: 'john.doe@example.com',
      password: 'password123',
      birthDate: '1990-01-01',
      ip: '127.0.0.1',
      ein: '123456789',
      ssn: '123456789',
    },
  }))
  console.log(`Time taken: ${Date.now() - now}ms`)
}