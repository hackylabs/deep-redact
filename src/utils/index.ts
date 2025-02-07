import type { BaseDeepRedactConfig, Logs, RedactorUtilsConfig, Stack } from '../types'

const defaultConfig: Required<RedactorUtilsConfig> = {
  stringTests: [],
  blacklistedKeys: [],
  partialStringTests: [],
  blacklistedKeysTransformed: [],
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

  constructor(customConfig: Omit<RedactorUtilsConfig, 'blacklistedKeysTransformed'>) {
    this.config = {
      ...defaultConfig,
      ...customConfig,
      blacklistedKeysTransformed: (customConfig.blacklistedKeys ?? []).map((key) => {
        // If key is string or RegExp, create a config object
        if (typeof key === 'string' || key instanceof RegExp) {
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
    }
  }

  partialStringRedact = (value: string): string => {
    const { partialStringTests }: BaseDeepRedactConfig = this.config
    if (partialStringTests.length === 0) return value

    let result = value
    partialStringTests.forEach((test) => {
      result = test.replacer(result, test.pattern)
    })

    return result
  }

  private shouldRedactKey = (key: string): boolean => {
    return this.config.blacklistedKeysTransformed.some(config => {
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

  private shouldRedact = (value: unknown, key: string | number | null): boolean => {
    return typeof key === 'string' && 
      this.shouldRedactKey(key) &&
      this.shouldRedactValue(value, key)
  }

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

  private handlePrimitiveValue(
    value: unknown,
    key: string | number | null,
    redactingParent: boolean,
    referenceMap: WeakMap<object, string>
  ): unknown {
    // console.log('=== Handle Primitive Value ===')
    // console.dir({ value, key, redactingParent, referenceMap }, { depth: null })
    // console.log('---')

    // If redactingParent is true, we should redact regardless of the key
    if (redactingParent) {
      return this.redactValue(value, key)
    }

    let transformed = value

    // Handle redaction by key
    if (this.shouldRedact(value, key)) {
      transformed = this.redactValue(value, key)
      return transformed
    }

    // Handle string-specific transformations
    if (typeof value === 'string') {
      transformed = this.applyStringTransformations(value, key)
      if (transformed !== value) return transformed
    }

    // Apply general transformers
    for (const transformer of this.config.transformers) {
      transformed = transformer(value, key, referenceMap)
      if (transformed !== value) break
    }

    return transformed
  }

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

  private findMatchingKeyConfig(key: string) {
    return this.config.blacklistedKeysTransformed.find(config => {
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
}

export default RedactorUtils
