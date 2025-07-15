import type { Transformer } from '../types'

/**
 * Registry for organizing transformers by type and constructor for efficient lookup
 */
export class TransformerRegistry {
  private typeTransformers: Map<string, Transformer[]> = new Map()
  private constructorTransformers: Map<Function, Transformer[]> = new Map()
  private fallbackTransformers: Transformer[] = []

  /**
   * Add a transformer for a specific typeof result
   * @param type - The typeof result (e.g., 'bigint', 'string', etc.)
   * @param transformer - The transformer function
   */
  addTypeTransformer(type: string, transformer: Transformer): void {
    if (!this.typeTransformers.has(type)) {
      this.typeTransformers.set(type, [])
    }
    this.typeTransformers.get(type)!.push(transformer)
  }

  /**
   * Add a transformer for a specific constructor
   * @param constructor - The constructor function (e.g., Date, Error, etc.)
   * @param transformer - The transformer function
   */
  addConstructorTransformer(constructor: Function, transformer: Transformer): void {
    if (!this.constructorTransformers.has(constructor)) {
      this.constructorTransformers.set(constructor, [])
    }
    this.constructorTransformers.get(constructor)!.push(transformer)
  }

  /**
   * Add a fallback transformer that runs on all values
   * @param transformer - The transformer function
   */
  addFallbackTransformer(transformer: Transformer): void {
    this.fallbackTransformers.push(transformer)
  }

  /**
   * Get relevant transformers for a value
   * @param value - The value to get transformers for
   * @returns Array of relevant transformers
   */
  getTransformersForValue(value: unknown): Transformer[] {
    const transformers: Transformer[] = []
    const type = typeof value
    if (this.typeTransformers.has(type)) {
      transformers.push(...this.typeTransformers.get(type)!)
    }

    if (typeof value === 'object' && value !== null) {
      const constructor = value.constructor
      if (this.constructorTransformers.has(constructor)) {
        transformers.push(...this.constructorTransformers.get(constructor)!)
      }
    }

    transformers.push(...this.fallbackTransformers)

    return transformers
  }

  /**
   * Apply transformers to a value
   * @param value - The value to transform
   * @param key - The key (optional)
   * @param referenceMap - Reference map for circular references (optional)
   * @returns The transformed value
   */
  applyTransformers(value: unknown, key?: string, referenceMap?: WeakMap<object, string>): unknown {
    if (typeof value === 'string') return value

    const transformers = this.getTransformersForValue(value)
    
    for (const transformer of transformers) {
      const transformed = transformer(value, key, referenceMap)
      if (transformed !== value) {
        return transformed
      }
    }
    
    return value
  }

  /**
   * Clear all transformers
   */
  clear(): void {
    this.typeTransformers.clear()
    this.constructorTransformers.clear()
    this.fallbackTransformers = []
  }

  /**
   * Get all registered transformers for debugging
   */
  getRegisteredTransformers(): {
    types: Map<string, Transformer[]>
    constructors: Map<Function, Transformer[]>
    fallback: Transformer[]
  } {
    return {
      types: new Map(this.typeTransformers),
      constructors: new Map(this.constructorTransformers),
      fallback: [...this.fallbackTransformers]
    }
  }
} 