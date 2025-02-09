import type { BaseDeepRedactConfig, RedactorUtilsConfig, Stack, BlacklistKeyConfig, ComplexStringTest, DerivedBlacklistReplacer, DerivedBlacklistRegex } from '../types'

const defaultConfig: Required<RedactorUtilsConfig> = {
  stringTests: [],
  partialStringTests: [],
  blacklistedKeys: [],
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

  private readonly derivedBlacklistKeys: {
    regex?: Array<DerivedBlacklistRegex>,
    strings?: Record<string, { replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> }>,
  } = {}
   
  private readonly stringKeys: string[] = []
   
  private readonly lowerStringKeys = new Map<string, string>()
   
  constructor(customConfig: RedactorUtilsConfig) {
    this.config = {
      ...defaultConfig,
      ...customConfig,
    }

    this.derivedBlacklistKeys = this.getDerivedBlacklistKeys(customConfig.blacklistedKeys ?? [])
    // Cache string keys once
    if (this.derivedBlacklistKeys.strings) {
      this.stringKeys = Object.keys(this.derivedBlacklistKeys.strings)
    }

    // Pre-compute lowercase mappings
    if (this.derivedBlacklistKeys.strings && !this.config.caseSensitiveKeyMatch) {
      for (const key of this.stringKeys) {
        this.lowerStringKeys.set(key.toLowerCase(), key)
      }
    }
  }

  private getDerivedBlacklistKeys(blacklistedKeys: Array<string | RegExp | BlacklistKeyConfig>) {
    const {
      remove: globalRemove = false,
      replacement: globalReplacement = '[REDACTED]',
      fuzzyKeyMatch: globalFuzzyKeyMatch = false,
      caseSensitiveKeyMatch: globalCaseSensitiveKeyMatch = true,
      retainStructure: globalRetainStructure = false,
      replaceStringByLength: globalReplaceStringByLength = false,
    } = this.config

    const derivedBlacklistKeys = blacklistedKeys.reduce((acc: { strings: Record<string, { replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> }>, regex: Array<{ pattern: RegExp, replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> }> }, key) => {
      if (typeof key === 'string') {
        if (key.length === 0) return acc
        Object.assign(acc.strings, { [key]: {
          config: {
            remove: globalRemove,
            replacement: globalReplacement,
            fuzzyKeyMatch: globalFuzzyKeyMatch,
            caseSensitiveKeyMatch: globalCaseSensitiveKeyMatch,
            retainStructure: globalRetainStructure,
            replaceStringByLength: globalReplaceStringByLength,
          },
          replacer: (value: unknown, config: BlacklistKeyConfig) => {
            if (config.remove) return undefined
            if (config.retainStructure && typeof value === 'object') return value
            if (!config.retainStructure && typeof config.replacement === 'string') return config.replacement
            if (typeof config.replacement === 'function') return config.replacement(value, key)
            if (config.replaceStringByLength && typeof value === 'string' && typeof config.replacement === 'string') return config.replacement.repeat(value.length)
            return config.replacement
          },
        }})
      }
      else if (typeof key === 'object' && 'key' in key && typeof key.key === 'string') {
        if (key.key.length === 0) return acc
        const { fuzzyKeyMatch, caseSensitiveKeyMatch, ...rest } = key
        Object.assign(acc.strings, { [key.key]: {
          config: {
            fuzzyKeyMatch: fuzzyKeyMatch ?? globalFuzzyKeyMatch,
            caseSensitiveKeyMatch: caseSensitiveKeyMatch ?? globalCaseSensitiveKeyMatch,
            replaceStringByLength: globalReplaceStringByLength,
            retainStructure: globalRetainStructure,
            replacement: globalReplacement,
            remove: globalRemove,
            ...rest,
          },
          replacer: (value: unknown, config: BlacklistKeyConfig) => {
            if (config.remove) return undefined
            if (config.retainStructure && typeof value === 'object') return value
            if (!config.retainStructure && typeof config.replacement === 'string') return config.replacement
            if (typeof config.replacement === 'function') return config.replacement(value, key)
            if (config.replaceStringByLength && typeof value === 'string' && typeof config.replacement === 'string') return config.replacement.repeat(value.length)
            return config.replacement
          }
        }})
      }
      else if (key instanceof RegExp) {
        acc.regex.push({
          pattern: key,
          config: {
            remove: globalRemove,
            replacement: globalReplacement,
            fuzzyKeyMatch: globalFuzzyKeyMatch,
            caseSensitiveKeyMatch: globalCaseSensitiveKeyMatch,
            retainStructure: globalRetainStructure,
            replaceStringByLength: globalReplaceStringByLength,
          },
          replacer: (value: unknown, config: Omit<BlacklistKeyConfig, 'key'>) => {
            if (config.remove) return undefined
            if (config.retainStructure && typeof value === 'object') return value
            if (!config.retainStructure && typeof config.replacement === 'string') return config.replacement
            if (typeof config.replacement === 'function') return config.replacement(value, key)
            if (config.replaceStringByLength && typeof value === 'string' && typeof config.replacement === 'string') return config.replacement.repeat(value.length)
            return config.replacement
          }
        })
      }
      else if (typeof key === 'object' && 'key' in key && key instanceof RegExp) {
        const { remove, replacement, retainStructure } = key
        acc.regex.push({
          pattern: key.key as RegExp,
          config: {
            remove: remove ?? globalRemove,
            replacement: replacement ?? globalReplacement,
            fuzzyKeyMatch: globalFuzzyKeyMatch,
            caseSensitiveKeyMatch: globalCaseSensitiveKeyMatch,
            retainStructure: retainStructure ?? globalRetainStructure,
            replaceStringByLength: globalReplaceStringByLength,
          },
          replacer: (value: unknown, config: Omit<BlacklistKeyConfig, 'key'>) => {
            if (config.remove) return undefined
            if (config.retainStructure && typeof value === 'object') return value
            if (!config.retainStructure && typeof config.replacement === 'string') return config.replacement
            if (typeof config.replacement === 'function') return config.replacement(value, key)
            if (config.replaceStringByLength && typeof value === 'string' && typeof config.replacement === 'string') return config.replacement.repeat(value.length)
            return config.replacement
          }
        })
      }
      return acc
    }, { strings: {}, regex: [] })

    return {
      strings: Object.keys(derivedBlacklistKeys.strings).length > 0 ? derivedBlacklistKeys.strings : undefined,
      regex: derivedBlacklistKeys.regex.length > 0 ? derivedBlacklistKeys.regex : undefined,
    }
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
    partialStringTests.forEach((test) => result = test.replacer(result, test.pattern))
    return result
  }

  getReplacer = (key: string): { replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> } | undefined => {
    const strings = this.derivedBlacklistKeys.strings
    if (!strings) return this.derivedBlacklistKeys.regex?.find(({ pattern }) => pattern.test(key))

    // Direct match is fastest, try it first
    if (strings[key]) return strings[key]

    const { fuzzyKeyMatch, caseSensitiveKeyMatch } = this.config
    
    // If no special matching and no regex patterns, we can return early
    if (!fuzzyKeyMatch && caseSensitiveKeyMatch && !this.derivedBlacklistKeys.regex) return undefined

    // Now handle special matching cases
    if (fuzzyKeyMatch) {
      if (caseSensitiveKeyMatch) {
        const stringKey = this.stringKeys.find(stringKey => stringKey.includes(key))
        return stringKey ? strings[stringKey] : undefined
      }
      // Case insensitive fuzzy match
      const lowerKey = key.toLowerCase()
      const stringKey = this.stringKeys.find(stringKey => stringKey.toLowerCase().includes(lowerKey))
      return stringKey ? strings[stringKey] : undefined
    }

    // Case insensitive exact match
    if (!caseSensitiveKeyMatch) {
      const stringKey = this.lowerStringKeys.get(key.toLowerCase())
      return stringKey ? strings[stringKey] : undefined
    }

    // Finally check regex patterns
    return this.derivedBlacklistKeys.regex?.find(({ pattern }) => pattern.test(key))
  }

  /**
   * Handles primitive values
   * @param value - The value to handle
   * @param key - The key to check
   * @param redactingParent - Whether the parent is being redacted
   * @returns The transformed value
   * @private
   */
  private handlePrimitiveValue(
    value: unknown,
    key: string,
    parentReplacer?: { replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> },
  ): unknown {
    if (parentReplacer) return parentReplacer.replacer(value, parentReplacer.config)
    const replacer = this.getReplacer(key)
    console.log(replacer, { key, value })
    if (replacer) return replacer.replacer(value, replacer.config)
    return value
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
    referenceMap: WeakMap<object, string>,
    parentReplacer?: { replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> },
  ): { transformed: unknown; stack: Stack } {
    referenceMap.set(value, path.join('.'))
    const replacer = this.getReplacer(key)

    if (parentReplacer && !this.config.retainStructure) {
      return { transformed: replacer ? replacer.replacer(value, replacer.config) : value, stack: [] }
    }

    path.push(key)
    const result = this.handleRetainStructure(value, path, [], replacer)
    path.pop()
    return result
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
    stack: Stack,
    parentReplacer?: { replacer: DerivedBlacklistReplacer, config: Omit<BlacklistKeyConfig, 'key'> },
  ): { transformed: unknown; stack: Stack } {
    const newValue = Array.isArray(value) ? [] : {}

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({
          parent: newValue,
          key: i.toString(),
          value: value[i],
          path: [...path, i],
          replacer: parentReplacer
        })
      }
    } else {
      for (const [propKey, propValue] of Object.entries(value).reverse()) {
        stack.push({
          parent: newValue,
          key: propKey,
          value: propValue,
          path: [...path, propKey],
          replacer: parentReplacer
        })
      }
    }

    return { transformed: newValue, stack }
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
            key: i.toString(),
            value: raw[i],
            path: [i],
          })
        }
      } else {
        for (const [propKey, propValue] of Object.entries(raw).reverse()) {
          stack.push({
            parent: output,
            key: propKey,
            value: propValue,
            path: [propKey],
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
    if (!this.derivedBlacklistKeys.strings && !this.derivedBlacklistKeys.regex) return raw
    
    const referenceMap = new WeakMap<object, string>()
    const { output, stack } = this.initialiseTraversal(raw)

    if (typeof raw === 'object' && raw !== null) referenceMap.set(raw, '')

    while (stack.length > 0) {
      const { parent, key, value, path, replacer } = stack.pop()!
      let transformed = value
      if (Array.isArray(value)) {
        stack.push(...value.map((item, index) => ({ 
          parent, 
          key: index.toString(), 
          value: item, 
          path: [...path, index], 
          replacer 
        })))
      }
      else if (typeof value === 'object' && value !== null && referenceMap.has(value)) {
        transformed = `[[CIRCULAR_REFERENCE: ${referenceMap.get(value)}]]`
      }
      else if (typeof value !== 'object' || value === null) {
        transformed = this.handlePrimitiveValue(value, key, replacer)
        if (typeof transformed === 'undefined') continue
      }
      else {
        const result = this.handleObjectValue(value, key, path, referenceMap, replacer)
        if (result.transformed === undefined && this.config.remove && !this.config.retainStructure) continue
        transformed = result.transformed
        stack.push(...result.stack)
      }

      if (parent !== null && key !== null) parent[key] = transformed
    }

    return output
  }
}

export default RedactorUtils
