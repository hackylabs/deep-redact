import type { RedactorUtilsConfig, Stack, BlacklistKeyConfig, TransformerConfig, OrganisedTransformers } from '../types'
import { standardTransformers } from './standardTransformers'
import { TransformerRegistry } from './TransformerRegistry'

const defaultConfig: Required<RedactorUtilsConfig> = {
  stringTests: [],
  blacklistedKeys: [],
  fuzzyKeyMatch: false,
  caseSensitiveKeyMatch: true,
  retainStructure: false,
  remove: false,
  replaceStringByLength: false,
  replacement: '[REDACTED]',
  types: ['string'],
  transformers: standardTransformers,
}

class RedactorUtils {
  /**
   * The configuration for the redaction.
   * @private
   */
  private readonly config: Required<RedactorUtilsConfig> = defaultConfig

  /**
   * The computed regex pattern generated from sanitised blacklist keys of flat strings
   * @private
   */
  private readonly computedRegex: RegExp | null = null

  /**
   * Regex to sanitise strings for the computed regex
   * @private
   */
  private readonly sanitiseRegex = /[^a-zA-Z0-9_\-\$]/g

  /**
   * The transformed blacklist keys of flat regex patterns and complex config objects
   * @private
   */
  private readonly blacklistedKeysTransformed: Array<BlacklistKeyConfig> = []

  /**
   * The transformer registry for efficient transformer lookup
   * @private
   */
  private readonly transformerRegistry: TransformerRegistry = new TransformerRegistry()

  constructor(customConfig: RedactorUtilsConfig) {
    this.config = {
      ...defaultConfig,
      ...customConfig,
    }

    this.blacklistedKeysTransformed = (customConfig.blacklistedKeys ?? []).filter(key => typeof key !== 'string').map((key) => this.createTransformedBlacklistedKey(key, customConfig))
    const stringKeys = (customConfig.blacklistedKeys ?? []).filter(key => typeof key === 'string')
    if (stringKeys.length > 0) this.computedRegex = new RegExp(stringKeys.map(this.sanitiseStringForRegex).filter(Boolean).join('|'))
    this.setupTransformerRegistry(this.config.transformers)
  }

  /**
   * Sets up the transformer registry based on the configuration
   * @param transformers - The transformer configuration
   * @private
   */
  private setupTransformerRegistry(transformers: TransformerConfig): void {
    if (Array.isArray(transformers)) {
      transformers.forEach(transformer => { this.transformerRegistry.addFallbackTransformer(transformer) })
    } else {
      const organised = transformers as OrganisedTransformers
      if (organised.byType) {
        Object.entries(organised.byType).forEach(([type, typeTransformers]) => {
          if (typeTransformers) {
            typeTransformers.forEach(transformer => {
              this.transformerRegistry.addTypeTransformer(type, transformer)
            })
          }
        })
      }

      if (organised.byConstructor) {
        Object.entries(organised.byConstructor).forEach(([constructorName, constructorTransformers]) => {
          if (constructorTransformers) {
            const constructorMap: Record<string, Function> = {
              Date,
              Error,
              Map,
              Set,
              RegExp,
              URL,
            }
            
            const constructor = constructorMap[constructorName]
            if (constructor) {
              constructorTransformers.forEach(transformer => {
                this.transformerRegistry.addConstructorTransformer(constructor, transformer)
              })
            }
          }
        })
      }
    }
  }

  private createTransformedBlacklistedKey = (key: RegExp | BlacklistKeyConfig, customConfig: RedactorUtilsConfig): BlacklistKeyConfig => {
    if (key instanceof RegExp) {
      return {
        key,
        fuzzyKeyMatch: customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
        caseSensitiveKeyMatch: customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
        retainStructure: customConfig.retainStructure ?? defaultConfig.retainStructure,
        replacement: customConfig.replacement ?? defaultConfig.replacement,
        replaceStringByLength: customConfig.replaceStringByLength ?? defaultConfig.replaceStringByLength,
        remove: customConfig.remove ?? defaultConfig.remove,
      }
    }

    return {
      fuzzyKeyMatch: key.fuzzyKeyMatch ?? customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
      caseSensitiveKeyMatch: key.caseSensitiveKeyMatch ?? customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
      retainStructure: key.retainStructure ?? customConfig.retainStructure ?? defaultConfig.retainStructure,
      replacement: key.replacement ?? customConfig.replacement ?? defaultConfig.replacement,
      replaceStringByLength: key.replaceStringByLength ?? customConfig.replaceStringByLength ?? defaultConfig.replaceStringByLength,
      remove: key.remove ?? customConfig.remove ?? defaultConfig.remove,
      key: key.key,
    }
  }

  /**
   * Applies transformers to a value
   * @param value - The value to transform
   * @param key - The key to check
   * @returns The transformed value
   * @private
   */
  private applyTransformers = (value: unknown, key?: string, referenceMap?: WeakMap<object, string>): unknown => {
    return this.transformerRegistry.applyTransformers(value, key, referenceMap)
  }

  /**
   * Sanitises a string for the computed regex
   * @param key - The string to sanitise
   * @returns The sanitised string
   * @private
   */
  private sanitiseStringForRegex = (key: string): string => key.replace(this.sanitiseRegex, '')

  /**
   * Checks if a key should be redacted
   * @param key - The key to check
   * @returns Whether the key should be redacted
   * @private
   */
  private shouldRedactKey = (key: string): boolean => {
    if (this.computedRegex?.test(this.sanitiseStringForRegex(key))) return true

    return this.blacklistedKeysTransformed.some(config => {
      const pattern = config.key
      if (pattern instanceof RegExp) return pattern.test(key)
      if (!config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch) return key.toLowerCase() === pattern.toLowerCase()
      if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch) return key.toLowerCase().includes(pattern.toLowerCase())
      if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return key.includes(pattern)
      if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return key === pattern
    })
  }

  /**
   * Checks if a value should be redacted
   * @param value - The value to check
   * @param key - The key to check
   * @returns Whether the value should be redacted
   * @private
   */
  private shouldRedactValue = (value: unknown, valueKey: string): boolean => {
    if (!this.config.types.includes(typeof value)) return false
    return this.shouldRedactKey(valueKey)
  }

  /**
   * Redacts a value based on the key-specific config
   * @param value - The value to redact
   * @param key - The key to check
   * @param redactingParent - Whether the parent is being redacted
   * @returns The redacted value
   * @private
   */
  private redactValue = (value: unknown, redactingParent: boolean, keyConfig?: BlacklistKeyConfig): { transformed: unknown, redactingParent: boolean } => {
    if (!this.config.types.includes(typeof value)) return { transformed: value, redactingParent }

    const remove = keyConfig?.remove ?? this.config.remove
    const replacement = keyConfig?.replacement ?? this.config.replacement
    const replaceStringByLength = keyConfig?.replaceStringByLength ?? this.config.replaceStringByLength
    const retainStructure = keyConfig?.retainStructure ?? this.config.retainStructure

    if (retainStructure && typeof value === 'object' && value !== null) return { transformed: value, redactingParent: true }
    if (remove) return { transformed: undefined, redactingParent }
    if (typeof replacement === 'function') return { transformed: replacement(value), redactingParent }

    return {
      redactingParent,
      transformed: (typeof value === 'string' && replaceStringByLength)
      ? replacement.toString().repeat(value.length)
      : replacement,
    }
  }

  /**
   * Applies string transformations
   * @param value - The value to transform
   * @param key - The key to check
   * @returns The transformed value
   * @private
   */
  private applyStringTransformations(value: string, amRedactingParent: boolean, keyConfig?: BlacklistKeyConfig): { transformed: string, redactingParent: boolean } {
    if ((this.config.stringTests ?? []).length === 0) return { transformed: value, redactingParent: amRedactingParent }

    for (const test of this.config.stringTests) {
      if (test instanceof RegExp) {
        if (test.test(value)) {
          const { transformed, redactingParent } = this.redactValue(value, amRedactingParent, keyConfig)
          return { transformed: transformed as string, redactingParent }
        }
      } else {
        if (test.pattern.test(value)) {
          const transformed = test.replacer(value, test.pattern)
          return { transformed, redactingParent: amRedactingParent }
        }
      }
    }

    return { transformed: value, redactingParent: amRedactingParent }
  }

  /**
   * Handles primitive values
   * @param value - The value to handle
   * @param key - The key to check
   * @param redactingParent - Whether the parent is being redacted
   * @param keyConfig - The key config
   * @returns The transformed value
   * @private
   */
  private handlePrimitiveValue(
    value: unknown,
    valueKey: string,
    redactingParent: boolean,
    keyConfig?: BlacklistKeyConfig
  ): { transformed: unknown, redactingParent: boolean } {
    let transformed = value

    if (redactingParent) {
      if (valueKey === '_transformer' || !this.config.types.includes(typeof value)) {
        return { transformed: value, redactingParent }
      }
      const { transformed: transformedValue } = this.redactValue(value, redactingParent, keyConfig)
      return { transformed: transformedValue, redactingParent }
    }
    if (keyConfig || this.shouldRedactValue(value, valueKey)) {
      return this.redactValue(value, redactingParent, keyConfig)
    }
    if (typeof value === 'string') {
      return this.applyStringTransformations(value, redactingParent, keyConfig)
    }

    return { transformed, redactingParent }
  }

  /**
   * Handles object values
   * @param value - The value to handle
   * @param key - The key to check
   * @param path - The path to the value
   * @param redactingParent - Whether the parent is being redacted
   * @param referenceMap - The reference map
   * @returns The transformed value and stack
   * @private
   */
  private handleObjectValue(
    value: object,
    key: string,
    path: (string | number)[],
    amRedactingParent: boolean,
    referenceMap: WeakMap<object, string>,
    keyConfig?: BlacklistKeyConfig
  ): { transformed: unknown; redactingParent: boolean; stack: Stack } {
    const fullPath = path.join('.')
    const shouldRedact = amRedactingParent || Boolean(keyConfig) || this.shouldRedactValue(value, key)
    referenceMap.set(value, fullPath)

    if (shouldRedact && !(keyConfig?.retainStructure ?? this.config.retainStructure)) {
      const { transformed, redactingParent } = this.redactValue(value, amRedactingParent, keyConfig)
      return { transformed, redactingParent, stack: [] }
    }

    return this.handleRetainStructure(value, path, shouldRedact)
  }

  /**
   * Handles object values
   * @param value - The value to handle
   * @param path - The path to the value
   * @param redactingParent - Whether the parent is being redacted
   * @returns The transformed value and stack
   * @private
   */
  private handleRetainStructure(
    value: object,
    path: (string | number)[],
    redactingParent: boolean,
  ): { transformed: unknown; redactingParent: boolean; stack: Stack } {
    const newValue = Array.isArray(value) ? [] : {}
    const stack: Stack = []

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({
          parent: newValue,
          key: i.toString(),
          value: value[i],
          path: [...path, i],
          redactingParent,
          keyConfig: this.findMatchingKeyConfig(i.toString()),
        })
      }
    } else {
      for (const [propKey, propValue] of Object.entries(value).reverse()) {
        stack.push({
          parent: newValue,
          key: propKey,
          value: propValue,
          path: [...path, propKey],
          redactingParent,
          keyConfig: this.findMatchingKeyConfig(propKey),
        })
      }
    }

    return { transformed: newValue, redactingParent, stack }
  }

  /**
   * Finds the matching key config
   * @param key - The key to find
   * @returns The matching key config
   * @private
   */
  private findMatchingKeyConfig(key: string): BlacklistKeyConfig | undefined {
    if (this.computedRegex?.test(key)) {
      return {
        key,
        fuzzyKeyMatch: this.config.fuzzyKeyMatch,
        caseSensitiveKeyMatch: this.config.caseSensitiveKeyMatch,
        replaceStringByLength: this.config.replaceStringByLength,
        replacement: this.config.replacement,
        retainStructure: this.config.retainStructure,
        remove: this.config.remove,
      }
    }

    return this.blacklistedKeysTransformed.find(config => {
      const pattern = config.key
      if (pattern instanceof RegExp) return pattern.test(key)

      if (config.fuzzyKeyMatch) {
        const compareKey = config.caseSensitiveKeyMatch ? key : key.toLowerCase()
        const comparePattern = config.caseSensitiveKeyMatch ? pattern : pattern.toLowerCase()
        return compareKey.includes(comparePattern)
      }

      return config.caseSensitiveKeyMatch ? key === pattern : key.toLowerCase() === pattern.toLowerCase()
    })
  }

  /**
   * Initialises the traversal
   * @param raw - The raw value to traverse
   * @returns The output and stack
   * @private
   */
  private initialiseTraversal(raw: unknown): { output: Array<unknown> | Record<string, unknown>; stack: Stack } {
    const output = Array.isArray(raw) ? [] : {}
    const stack: Stack = []

    if (typeof raw === 'object' && raw !== null) {
      if (Array.isArray(raw)) {
        for (let i = raw.length - 1; i >= 0; i--) {
          stack.push({
            parent: output,
            key: i.toString(),
            value: raw[i],
            path: [i],
            redactingParent: false,
            keyConfig: this.findMatchingKeyConfig(i.toString()),
          })
        }
      } else {
        for (const [propKey, propValue] of Object.entries(raw).reverse()) {
          stack.push({
            parent: output,
            key: propKey,
            value: propValue,
            path: [propKey],
            redactingParent: false,
            keyConfig: this.findMatchingKeyConfig(propKey),
          })
        }
      }
    }

    return { output, stack }
  }

  /**
   * Pre-processes the input to replace circular references with transformer objects
   * @param raw - The raw value to process
   * @returns The processed value with circular references replaced
   * @private
   */
  private replaceCircularReferences(raw: unknown): unknown {
    if (typeof raw !== 'object' || raw === null) return raw

    const visiting = new WeakSet<object>()
    const pathMap = new WeakMap<object, string>()

    const processValue = (value: unknown, path: string): unknown => {
      if (typeof value !== 'object' || value === null) return value

      if (visiting.has(value)) {
        const originalPath = pathMap.get(value) || ''
        return {
          _transformer: 'circular',
          value: originalPath,
          path: path
        }
      }

      visiting.add(value)
      pathMap.set(value, path)

      let result: unknown

      if (Array.isArray(value)) {
        let hasCircular = false
        const newArray = value.map((item, index) => {
          const itemPath = path ? `${path}.${index}` : index.toString()
          const processed = processValue(item, itemPath)
          if (processed !== item) hasCircular = true
          return processed
        })
        result = hasCircular ? newArray : value
      } else {
        let hasCircular = false
        const newObj: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value)) {
          const valuePath = path ? `${path}.${key}` : key
          const processed = processValue(val, valuePath)
          newObj[key] = processed
          if (processed !== val) hasCircular = true
        }
        result = hasCircular ? newObj : value
      }

      visiting.delete(value)
      return result
    }

    return processValue(raw, '')
  }

  /**
   * Checks if a non-traversable value requires transformers
   * @param value - The value to check
   * @returns Whether the value requires transformers
   * @private
   */
  private requiresTransformers(value: unknown): boolean {
    if (typeof value === 'bigint') return true
    if (value instanceof Date) return true
    if (value instanceof Error) return true
    if (value instanceof Map) return true
    if (value instanceof RegExp) return true
    if (value instanceof Set) return true
    if (value instanceof URL) return true
    return false
  }

  /**
   * Traverses the raw value
   * @param raw - The raw value to traverse
   * @returns The transformed value
   */
  traverse = (raw: unknown): unknown => {
    if (typeof raw === 'string') {
      const { transformed } = this.applyStringTransformations(raw, false)
      return transformed
    }

    if (typeof raw !== 'object' || raw === null || this.requiresTransformers(raw)) return this.applyTransformers(raw)

    const referenceMap = new WeakMap<object, string>()
    const cleanedInput = this.replaceCircularReferences(raw)
    const { output, stack } = this.initialiseTraversal(cleanedInput)

    if (typeof cleanedInput === 'object' && cleanedInput !== null) referenceMap.set(cleanedInput, '')

    while (stack.length > 0) {
      const { parent, key, value, path, redactingParent: amRedactingParent, keyConfig } = stack.pop()!

      let transformed = this.applyTransformers(value, key, referenceMap)
      let redactingParent = amRedactingParent

      if (typeof transformed !== 'object' || transformed === null) {
        const primitiveResult = this.handlePrimitiveValue(transformed, key, amRedactingParent, keyConfig)
        redactingParent = primitiveResult.redactingParent
        transformed = primitiveResult.transformed
        if (typeof transformed === 'undefined') continue
      }
      else {
        const objectResult = this.handleObjectValue(transformed, key, path, redactingParent, referenceMap, keyConfig)
        transformed = objectResult.transformed
        stack.push(...objectResult.stack)
      }

      if (parent !== null && key !== null) parent[key] = transformed
    }

    return output
  }
}

export default RedactorUtils
