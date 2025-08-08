import type { RedactorUtilsConfig, Stack, TransformerConfig, OrganisedTransformers, ObjectPathConfig } from '../types'
import { standardTransformers } from './standardTransformers'
import { TransformerRegistry } from './TransformerRegistry'

const defaultConfig: Required<RedactorUtilsConfig> = {
  paths: [],
  stringTests: [],
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
   * The transformer registry for efficient transformer lookup
   * @private
   */
  private readonly transformerRegistry: TransformerRegistry = new TransformerRegistry()

  /**
   * Clone of the paths
   * @private
   */
  private readonly paths: ObjectPathConfig[] = []

  constructor(customConfig: RedactorUtilsConfig) {
    this.config = {
      ...defaultConfig,
      ...customConfig,
    }

    this.paths = (customConfig.paths ?? []).map((path) => this.createTransformedObjectPath(path, customConfig))
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

  private createTransformedObjectPath = (path: ObjectPathConfig | Array<string | number | RegExp>, customConfig: RedactorUtilsConfig): ObjectPathConfig => {
    if (Array.isArray(path)) {
      return {
        fuzzyKeyMatch: customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
        caseSensitiveKeyMatch: customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
        retainStructure: customConfig.retainStructure ?? defaultConfig.retainStructure,
        replacement: customConfig.replacement ?? defaultConfig.replacement,
        replaceStringByLength: customConfig.replaceStringByLength ?? defaultConfig.replaceStringByLength,
        remove: customConfig.remove ?? defaultConfig.remove,
        types: customConfig.types ?? defaultConfig.types,
        path: path,
      }
    }

    return {
      fuzzyKeyMatch: path.fuzzyKeyMatch ?? customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
      caseSensitiveKeyMatch: path.caseSensitiveKeyMatch ?? customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
      retainStructure: path.retainStructure ?? customConfig.retainStructure ?? defaultConfig.retainStructure,
      replacement: path.replacement ?? customConfig.replacement ?? defaultConfig.replacement,
      replaceStringByLength: path.replaceStringByLength ?? customConfig.replaceStringByLength ?? defaultConfig.replaceStringByLength,
      remove: path.remove ?? customConfig.remove ?? defaultConfig.remove,
      types: path.types ?? customConfig.types ?? defaultConfig.types,
      path: path.path,
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

  private shouldRedactFuzzyCaseInsensitiveKey = (key: string, pattern: string | number): boolean => {
    return key.toLowerCase().includes(String(pattern).toLowerCase())
  }

  private shouldRedactFuzzyCaseSensitiveKey = (key: string, pattern: string | number): boolean => {
    return key.includes(String(pattern))
  }

  private shouldRedactCaseInsensitiveKey = (key: string, pattern: string | number): boolean => {
    return key.toLowerCase() === String(pattern).toLowerCase()
  }

  private shouldRedactCaseSensitiveKey = (key: string, pattern: string | number): boolean => {
    return key === String(pattern)
  }

  /**
   * Checks if a pathSegment should be redacted
   * @param pathSegment - The pathSegment to check
   * @param path - The path to the key
   * @param config - The config for the path
   * @returns Whether the pathSegment should be redacted
   * @private
   */
  private pathSegmentMatches = (pathSegment: string, blacklistedPathItem: string | number | RegExp, config: ObjectPathConfig): boolean => {
    if (blacklistedPathItem instanceof RegExp) return blacklistedPathItem.test(pathSegment)
    if (!config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch) return this.shouldRedactCaseInsensitiveKey(pathSegment, blacklistedPathItem)
    if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch) return this.shouldRedactFuzzyCaseInsensitiveKey(pathSegment, blacklistedPathItem)
    if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return this.shouldRedactFuzzyCaseSensitiveKey(pathSegment, blacklistedPathItem)
    if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch) return this.shouldRedactCaseSensitiveKey(pathSegment, blacklistedPathItem)
    return false
  }

  private getObjectPathConfig = (path: (string | number)[]): ObjectPathConfig | undefined => {
    if (this.paths.length === 0) return undefined

    return this.paths.find((config) => {
      let pathIndex = 0
      let blacklistedPathIndex = 0
      let backtrackPathIndex = -1
      let backtrackBlacklistedPathIndex = -1
      const blacklistedPath = config.path

      while (pathIndex < path.length) {
        const blacklistedPathItem = blacklistedPath[blacklistedPathIndex]
        const pathItem = path[pathIndex]

        if (blacklistedPathItem === '**') {
          backtrackBlacklistedPathIndex = blacklistedPathIndex
          backtrackPathIndex = pathIndex
          blacklistedPathIndex++
        } else if (blacklistedPathItem === '*' || this.pathSegmentMatches(String(pathItem), blacklistedPathItem, config)) {
          blacklistedPathIndex++
          pathIndex++
        } else if (backtrackPathIndex !== -1) {
          blacklistedPathIndex = backtrackBlacklistedPathIndex + 1
          pathIndex = ++backtrackPathIndex
        } else {
          return false
        }

        if (blacklistedPathIndex === blacklistedPath.length) {
          if (pathIndex <= path.length) return true
          if (backtrackPathIndex !== -1) {
            blacklistedPathIndex = backtrackBlacklistedPathIndex + 1
            pathIndex = ++backtrackPathIndex
          } else {
            return false
          }
        }
      }

      while (blacklistedPathIndex < blacklistedPath.length && blacklistedPath[blacklistedPathIndex] === '**') {
        blacklistedPathIndex++
      }

      return blacklistedPathIndex === blacklistedPath.length && pathIndex === path.length
    })
  }

  /**
   * Redacts a value based on the key-specific config
   * @param value - The value to redact
   * @param key - The key to check
   * @param redactingParent - Whether the parent is being redacted
   * @returns The redacted value
   * @private
   */
  private redactValue = (value: unknown, redactingParent: boolean, pathConfig?: ObjectPathConfig): { transformed: unknown, redactingParent: boolean } => {
    const includesType = pathConfig?.types?.includes(typeof value) ?? this.config.types.includes(typeof value)
    if (!includesType) return { transformed: value, redactingParent }

    const remove = pathConfig?.remove ?? this.config.remove
    const replacement = pathConfig?.replacement ?? this.config.replacement
    const replaceStringByLength = pathConfig?.replaceStringByLength ?? this.config.replaceStringByLength
    const retainStructure = pathConfig?.retainStructure ?? this.config.retainStructure

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
  private applyStringTransformations(value: string, amRedactingParent: boolean, pathConfig?: ObjectPathConfig): { transformed: string, redactingParent: boolean } {
    if ((this.config.stringTests ?? []).length === 0) return { transformed: value, redactingParent: amRedactingParent }

    for (const test of this.config.stringTests) {
      if (test instanceof RegExp) {
        if (test.test(value)) {
          const { transformed, redactingParent } = this.redactValue(value, amRedactingParent, pathConfig)
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
   * @param pathConfig - The key config
   * @returns The transformed value
   * @private
   */
  private handlePrimitiveValue(
    value: unknown,
    valueKey: string,
    redactingParent: boolean,
    pathConfig?: ObjectPathConfig
  ): { transformed: unknown, redactingParent: boolean } {
    let transformed = value

    if (redactingParent) {
      if (valueKey === '_transformer' || !this.config.types.includes(typeof value)) {
        return { transformed: value, redactingParent }
      }
      const { transformed: transformedValue } = this.redactValue(value, redactingParent, pathConfig)
      return { transformed: transformedValue, redactingParent }
    }
    if (pathConfig) {
      return this.redactValue(value, redactingParent, pathConfig)
    }
    if (typeof value === 'string') {
      return this.applyStringTransformations(value, redactingParent)
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
    path: (string | number)[],
    amRedactingParent: boolean,
    referenceMap: WeakMap<object, string>,
    pathConfig?: ObjectPathConfig
  ): { transformed: unknown; redactingParent: boolean; stack: Stack } {
    const fullPath = path.join('.')
    const shouldRedact = amRedactingParent || Boolean(pathConfig)
    const retainStructure = pathConfig?.retainStructure ?? this.config.retainStructure
    referenceMap.set(value, fullPath)

    if (shouldRedact && !retainStructure && !pathConfig) {
      const { transformed, redactingParent } = this.redactValue(value, amRedactingParent, pathConfig)
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
          pathConfig: this.getObjectPathConfig([...path, i]),
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
          pathConfig: this.getObjectPathConfig([...path, propKey]),
        })
      }
    }

    return { transformed: newValue, redactingParent, stack }
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
            pathConfig: this.getObjectPathConfig([i]),
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
            pathConfig: this.getObjectPathConfig([propKey]),
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
      const { parent, key, value, path, redactingParent: amRedactingParent, pathConfig } = stack.pop()!

      let transformed = this.applyTransformers(value, key, referenceMap)
      let redactingParent = amRedactingParent

      if (typeof transformed !== 'object' || transformed === null) {
        const primitiveResult = this.handlePrimitiveValue(transformed, key, amRedactingParent, pathConfig)
        redactingParent = primitiveResult.redactingParent
        transformed = primitiveResult.transformed
        if (typeof transformed === 'undefined') continue
      }
      else {
        const objectResult = this.handleObjectValue(transformed, path, redactingParent, referenceMap, pathConfig)
        transformed = objectResult.transformed
        stack.push(...objectResult.stack)
      }

      if (parent !== null && key !== null) parent[key] = transformed
    }

    return output
  }
}

export default RedactorUtils
