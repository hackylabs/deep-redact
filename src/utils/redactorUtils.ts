import type { BaseDeepRedactConfig, RedactorUtilsConfig, Stack, Transformer } from '../types'
import { standardTransformers } from './standardTransformers'

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
  transformers: standardTransformers,
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
      partialStringTests: customConfig.partialStringTests ?? [],
      blacklistedKeys: customConfig.blacklistedKeys ?? [],
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
      if (pattern instanceof RegExp) {
        return pattern.test(key)
      }
      
      if (config.fuzzyKeyMatch) {
        const compareKey = config.caseSensitiveKeyMatch ? key : key.toLowerCase()
        const comparePattern = config.caseSensitiveKeyMatch ? pattern : pattern.toLowerCase()
        return compareKey.includes(comparePattern)
      }
      
      return config.caseSensitiveKeyMatch ? key === pattern : key.toLowerCase() === pattern.toLowerCase()
    })
  }

  private shouldRedactValue = (value: unknown): boolean => {
    const type = typeof value
    return this.config.types.includes(type)
  }

  private shouldRedact = (value: unknown, key: string | number | null): boolean => {
    return typeof key === 'string' && 
           this.shouldRedactKey(key) && 
           this.shouldRedactValue(value)
  }

  private redactValue = (value: unknown, key: string | number | null): unknown => {
    // Get the key-specific config if it exists
    const keyConfig = this.config.blacklistedKeysTransformed.find(c => 
      typeof key === 'string' && this.shouldRedactKey(key))
    
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

  traverse = (raw: unknown): unknown => {
    if (typeof raw === 'string') return this.partialStringRedact(raw)
    if (typeof raw !== 'object' || raw === null) return raw
    
    const logs: { path: string, message: string, raw: unknown, transformed: unknown }[] | null = this.config.enableLogging ? [] : null
    const referenceMap = new WeakMap<object, string>()
    const output = Array.isArray(raw) ? [] : {}
    const stack: Stack = []
    
    if (typeof raw === 'object' && raw !== null) referenceMap.set(raw, '')

    // For root object, push its properties with output as their parent
    if (Array.isArray(raw)) {
      for (let i = raw.length - 1; i >= 0; i--) {
        stack.push({
          parent: output,
          key: i,
          value: raw[i],
          path: [i],
          redactingParent: false
        })
        // logs?.push({ path: `[${i}]`, message: `Pushed root array element to stack`, raw: raw[i], transformed: raw[i] })
      }
    } else if (typeof raw === 'object' && raw !== null) {
      for (const [propKey, propValue] of Object.entries(raw).reverse()) {
        stack.push({
          parent: output,
          key: propKey,
          value: propValue,
          path: [propKey],
          redactingParent: false
        })
        // logs?.push({ path: propKey, message: `Pushed root object property to stack`, raw: propValue, transformed: propValue })
      }
    }

    while (stack.length > 0) {
      const { parent, key, value, path, redactingParent } = stack.pop()!
      let transformed = value

      if (typeof value === 'object' && value !== null && referenceMap.has(value)) {
        transformed = `[[CIRCULAR_REFERENCE: ${referenceMap.get(value)}]]`
        logs?.push({ path: path.join('.'), message: `Handled circular reference`, raw: value, transformed })
      }
      else if (typeof value !== 'object' || value === null) {
        // Check if key should be redacted
        if (redactingParent || this.shouldRedact(value, key)) {
          transformed = this.redactValue(value, key)
          logs?.push({ path: path.join('.'), message: `Redacted by key`, raw: value, transformed })
        }

        // Apply string tests
        if (typeof value === 'string') {
          for (const test of this.config.stringTests ?? []) {
            if (test instanceof RegExp) {
              if (test.test(value)) {
                transformed = this.redactValue(value, key)
                logs?.push({ path: path.join('.'), message: `Redacted by pattern`, raw: value, transformed })
                break
              }
            } else {
              transformed = test.replacer(value, test.pattern)
              if (transformed !== value) {
                logs?.push({ path: path.join('.'), message: `Redacted by custom pattern`, raw: value, transformed })
                break
              }
            }
          }

          // Apply partial string redaction if not already redacted
          if (transformed === value) {
            transformed = this.partialStringRedact(value)
            if (transformed !== value) {
              logs?.push({ path: path.join('.'), message: `Applied partial redaction`, raw: value, transformed })
            }
          }
        }

        // Apply transformers if not redacted
        if (transformed === value) {
          for (const transformer of this.config.transformers) {
            transformed = transformer(transformed, key, referenceMap)
            if (transformed !== value) {
              logs?.push({ path: path.join('.'), message: `Applied transformer: ${transformer.name}`, raw: value, transformed })
              break
            }
          }
        }
      }
      else {
        // Store the full path for this object
        const fullPath = path.join('.')
        const shouldRedact = redactingParent || this.shouldRedact(value, key)
        referenceMap.set(value, fullPath)
        
        // Check if key should be redacted first
        if (shouldRedact) {
          if (this.config.retainStructure) {
            // If retaining structure, create empty container but don't redact children
            const newValue = Array.isArray(value) ? [] : {}
            transformed = newValue
            
            if (Array.isArray(value)) {
              for (let i = value.length - 1; i >= 0; i--) {
                stack.push({
                  parent: newValue,
                  key: i,
                  value: value[i], // Don't redact children - they'll be checked individually
                  path: [...path, i],
                  redactingParent: true
                })
              }
            } else {
              for (const [propKey, propValue] of Object.entries(value).reverse()) {
                stack.push({
                  parent: newValue,
                  key: propKey,
                  value: propValue, // Don't redact children - they'll be checked individually
                  path: [...path, propKey],
                  redactingParent: true
                })
              }
            }
          } else {
            // If not retaining structure, redact the entire object
            transformed = this.redactValue(value, key)
          }
          logs?.push({ path: path.join('.'), message: `Redacted object by key`, raw: value, transformed })
        } else {
          // Apply transformers first
          let skipChildren = false
          for (const transformer of this.config.transformers) {
            const result = transformer(value, key, referenceMap)
            if (result !== value) {
              transformed = result
              skipChildren = true
              logs?.push({ path: path.join('.'), message: `Transformer modified object`, raw: value, transformed })
              break
            }
          }
          
          // Only create new container and traverse children if no transformer modified the value
          if (!skipChildren) {
            const newValue = Array.isArray(value) ? [] : {}
            transformed = newValue
            
            if (Array.isArray(value)) {
              for (let i = value.length - 1; i >= 0; i--) {
                stack.push({
                  parent: newValue,
                  key: i,
                  value: value[i],
                  path: [...path, i],
                  redactingParent
                })
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
              }
            }
          }
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
