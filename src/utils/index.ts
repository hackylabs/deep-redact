import type { BaseDeepRedactConfig, Logs, RedactorUtilsConfig, Stack, BlacklistKeyConfig } from '../types'

const defaultConfig: Required<RedactorUtilsConfig> = {
  stringTests: [],
  blacklistedKeys: [],
  partialStringTests: [],
  fuzzyKeyMatch: false,
  caseSensitiveKeyMatch: true,
  retainStructure: false,
  remove: false,
  replaceStringByLength: false,
  replacement: '[REDACTED]',
  types: ['string'],
  transformers: [],
  enableLogging: false,
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

  constructor(customConfig: RedactorUtilsConfig) {
    this.config = {
      ...defaultConfig,
      ...customConfig,
    }

    this.blacklistedKeysTransformed = (customConfig.blacklistedKeys ?? []).filter(key => typeof key !== 'string').map((key) => {
      if (key instanceof RegExp) {
        return {
          key,
          fuzzyKeyMatch: customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
          caseSensitiveKeyMatch: customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
          retainStructure: customConfig.retainStructure ?? defaultConfig.retainStructure,
          replacement: customConfig.replacement ?? defaultConfig.replacement,
          remove: customConfig.remove ?? defaultConfig.remove,
        }
      }
      // If key is already a config object, merge with defaults
      return {
        fuzzyKeyMatch: key.fuzzyKeyMatch ?? customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
        caseSensitiveKeyMatch: key.caseSensitiveKeyMatch ?? customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
        retainStructure: key.retainStructure ?? customConfig.retainStructure ?? defaultConfig.retainStructure,
        replacement: key.replacement ?? customConfig.replacement ?? defaultConfig.replacement,
        remove: key.remove ?? customConfig.remove ?? defaultConfig.remove,
        key: key.key,
      }
    })

    const stringKeys = (customConfig.blacklistedKeys ?? []).filter(key => typeof key === 'string')
    if (stringKeys.length > 0) this.computedRegex = new RegExp(stringKeys.map(this.sanitiseStringForRegex).join('|'))
  }

  /**
   * Redacts partial strings based on the partialStringTests config
   * @param value - The string to redact
   * @returns The redacted string
   * @private
   */
  partialStringRedact = (value: string): string => {
    const { partialStringTests }: BaseDeepRedactConfig = this.config
    if (partialStringTests.length === 0) return value

    let result = value
    partialStringTests.forEach((test) => {
      result = test.replacer(result, test.pattern)
    })

    return result
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

    // Then check the transformed blacklist configs
    return this.blacklistedKeysTransformed.some(config => {
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
   * Checks if a value should be redacted
   * @param value - The value to check
   * @param key - The key to check
   * @returns Whether the value should be redacted
   * @private
   */
  private shouldRedactValue = (value: unknown, key: string | number | null): boolean => {
    // For objects, check the key-specific retainStructure config
    if (typeof key === 'string') {
      const keyConfig = this.findMatchingKeyConfig(key)
      if (keyConfig) {
        // If we found a matching key config, we should redact the value
        // retainStructure only determines HOW we redact, not IF we redact
        return true
      }
    }

    // For non-matching keys, only redact if type is in configured types
    if (typeof value !== 'object' || value === null) {
      return this.config.types.includes(typeof value)
    }

    return false
  }

  /**
   * Checks if a value should be redacted
   * @param value - The value to check
   * @param key - The key to check
   * @returns Whether the value should be redacted
   * @private
   */
  private shouldRedact = (value: unknown, key: string | number | null): boolean => {
    return typeof key === 'string' && 
      this.shouldRedactKey(key) &&
      this.shouldRedactValue(value, key)
  }

  /**
   * Redacts a value based on the key-specific config
   * @param value - The value to redact
   * @param key - The key to check
   * @returns The redacted value
   * @private
   */
  private redactValue = (value: unknown, key: string | number | null): unknown => {
    const keyConfig = typeof key === 'string' ? this.findMatchingKeyConfig(key) : undefined

    // Use key-specific config or fall back to global config
    const remove = keyConfig?.remove ?? this.config.remove
    const replacement = keyConfig?.replacement ?? this.config.replacement
    const replaceStringByLength = this.config.replaceStringByLength

    // If remove is true, return undefined
    if (remove) return undefined

    // If replacement is a function, call it
    if (typeof replacement === 'function') return replacement(value)

    // If value is string and replaceStringByLength is true, repeat replacement
    if (typeof value === 'string' && replaceStringByLength) 
    return replacement.toString().repeat(value.length)

    // Otherwise return the replacement value
    return replacement
  }

  /**
   * Handles primitive values
   * @param value - The value to handle
   * @param key - The key to check
   * @param redactingParent - Whether the parent is being redacted
   * @param referenceMap - The reference map
   * @returns The transformed value
   * @private
   */
  private handlePrimitiveValue(
    value: unknown,
    key: string | number | null,
    redactingParent: boolean,
    referenceMap: WeakMap<object, string>
  ): unknown {
    // console.log('=== Handle Primitive Value ===')
    // console.dir({ value, key, redactingParent, referenceMap }, { depth: null })
    // console.log('---')

    let transformed = value

    // If redactingParent is true, we should redact regardless of the key
    if (redactingParent) return this.redactValue(value, key)

    // Handle redaction by key
    if (this.shouldRedact(value, key)) return this.redactValue(value, key)

    // Handle string-specific transformations
    if (typeof value === 'string') {
      transformed = this.applyStringTransformations(value, key)
      if (transformed !== value) return transformed
    }

    // Apply general transformers only if no previous transformation occurred
    for (const transformer of this.config.transformers) {
      transformed = transformer(value, key, referenceMap)
      if (transformed !== value) return transformed
    }

    return transformed
  }

  /**
   * Applies string transformations
   * @param value - The value to transform
   * @param key - The key to check
   * @returns The transformed value
   * @private
   */
  private applyStringTransformations(value: string, key: string | number | null): string {
    // Apply string tests
    for (const test of this.config.stringTests ?? []) {
      if (test instanceof RegExp) {
        if (test.test(value)) {
          return this.redactValue(value, key) as string
        }
      } else {
        const transformed = test.replacer(value, test.pattern)
        if (transformed !== value) {
          return transformed
        }
      }
    }

    // Apply partial string redaction if not already redacted
    const transformed = this.partialStringRedact(value)
    return transformed !== value ? transformed : value
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
    key: string | number | null,
    path: (string | number)[],
    redactingParent: boolean,
    referenceMap: WeakMap<object, string>
  ): { transformed: unknown; stack: Stack } {
    const fullPath = path.join('.')
    const shouldRedact = redactingParent || this.shouldRedact(value, key)
    referenceMap.set(value, fullPath)

    // If we're not retaining structure and should redact, return the redacted value
    if (shouldRedact && !this.config.retainStructure) {
      return { transformed: this.redactValue(value, key), stack: [] }
    }

    // Otherwise, create new structure and push children to stack
    return this.handleRetainStructure(value, path, shouldRedact, [])
  }

  /**
   * Handles object values
   * @param value - The value to handle
   * @param path - The path to the value
   * @param redactingParent - Whether the parent is being redacted
   * @param stack - The stack
   * @returns The transformed value and stack
   * @private
   */
  private handleRetainStructure(
    value: object,
    path: (string | number)[],
    redactingParent: boolean,
    stack: Stack
  ): { transformed: unknown; stack: Stack } {
    const newValue = Array.isArray(value) ? [] : {}

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({
          parent: newValue,
          key: i,
          value: value[i],
          path: [...path, i],
          redactingParent
        })
        // logs?.push({ path: `[${i}]`, message: `Pushed root array element to stack`, raw: raw[i], transformed: raw[i] })
      }
    } else {
      for (const [propKey, propValue] of Object.entries(value).reverse()) {
        stack.push({
          parent: newValue,
          key: propKey,
          value: propValue,
          path: [...path, propKey],
          redactingParent
        })
        // logs?.push({ path: propKey, message: `Pushed root object property to stack`, raw: propValue, transformed: propValue })
      }
    }

    return { transformed: newValue, stack }
  }

  /**
   * Finds the matching key config
   * @param key - The key to find
   * @returns The matching key config
   * @private
   */
  private findMatchingKeyConfig(key: string) {
    // Check computedRegex first
    if (this.computedRegex?.test(key)) {
      return {
        key,
        fuzzyKeyMatch: this.config.fuzzyKeyMatch,
        caseSensitiveKeyMatch: this.config.caseSensitiveKeyMatch,
        retainStructure: this.config.retainStructure,
        replacement: this.config.replacement,
        remove: this.config.remove
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
  private initialiseTraversal(raw: unknown): { output: unknown; stack: Stack } {
    const output = Array.isArray(raw) ? [] : {}
    const stack: Stack = []

    if (typeof raw === 'object' && raw !== null) {
      if (Array.isArray(raw)) {
        for (let i = raw.length - 1; i >= 0; i--) {
          stack.push({
            parent: output,
            key: i,
            value: raw[i],
            path: [i],
            redactingParent: false
          })
        }
      } else {
        for (const [propKey, propValue] of Object.entries(raw).reverse()) {
          stack.push({
            parent: output,
            key: propKey,
            value: propValue,
            path: [propKey],
            redactingParent: false
          })
        }
      }
    }

    return { output, stack }
  }

  /**
   * Traverses the raw value
   * @param raw - The raw value to traverse
   * @returns The transformed value
   */
  traverse = (raw: unknown): unknown => {
    if (typeof raw === 'string') return this.partialStringRedact(raw)
    if (typeof raw !== 'object' || raw === null) return raw
    
    const logs: Logs = this.config.enableLogging ? [] : null
    const referenceMap = new WeakMap<object, string>()
    const { output, stack } = this.initialiseTraversal(raw)

    if (typeof raw === 'object' && raw !== null) referenceMap.set(raw, '')

    while (stack.length > 0) {
      const { parent, key, value, path, redactingParent } = stack.pop()!
      let transformed = value

      if (typeof value === 'object' && value !== null && referenceMap.has(value)) {
        transformed = `[[CIRCULAR_REFERENCE: ${referenceMap.get(value)}]]`
        logs?.push({ path: path.join('.'), message: `Handled circular reference`, raw: value, transformed })
      }
      else if (typeof value !== 'object' || value === null) {
        transformed = this.handlePrimitiveValue(value, key, redactingParent, referenceMap)
        if (typeof transformed === 'undefined') continue
      }
      else {
        const result = this.handleObjectValue(value, key, path, redactingParent, referenceMap)
        transformed = result.transformed
        stack.push(...result.stack)
        if (transformed !== value) {
          logs?.push({ path: path.join('.'), message: 'Transformed object value', raw: value, transformed })
        }
      }

      if (parent !== null && key !== null) {
        parent[key] = transformed
        // logs?.push({ path: path.join('.'), message: `Updated parent reference`, raw: value, transformed })
      }
    }

    if (logs) {
      console.log('=== Traversal Log ===')
      logs.forEach(log => {
        console.log(`[${log.path || 'root'}] ${log.message}`)
        console.dir({ raw: log.raw, transformed: log.transformed }, { depth: null })
        console.log('---')
      })
    }

    return output
  }
}

export default RedactorUtils
