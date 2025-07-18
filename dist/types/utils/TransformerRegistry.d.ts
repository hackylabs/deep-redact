import type { Transformer } from '../types';
/**
 * Registry for organizing transformers by type and constructor for efficient lookup
 */
export declare class TransformerRegistry {
    private typeTransformers;
    private constructorTransformers;
    private fallbackTransformers;
    /**
     * Add a transformer for a specific typeof result
     * @param type - The typeof result (e.g., 'bigint', 'string', etc.)
     * @param transformer - The transformer function
     */
    addTypeTransformer(type: string, transformer: Transformer): void;
    /**
     * Add a transformer for a specific constructor
     * @param constructor - The constructor function (e.g., Date, Error, etc.)
     * @param transformer - The transformer function
     */
    addConstructorTransformer(constructor: Function, transformer: Transformer): void;
    /**
     * Add a fallback transformer that runs on all values
     * @param transformer - The transformer function
     */
    addFallbackTransformer(transformer: Transformer): void;
    /**
     * Get relevant transformers for a value
     * @param value - The value to get transformers for
     * @returns Array of relevant transformers
     */
    getTransformersForValue(value: unknown): Transformer[];
    /**
     * Apply transformers to a value
     * @param value - The value to transform
     * @param key - The key (optional)
     * @param referenceMap - Reference map for circular references (optional)
     * @returns The transformed value
     */
    applyTransformers(value: unknown, key?: string, referenceMap?: WeakMap<object, string>): unknown;
    /**
     * Clear all transformers
     */
    clear(): void;
    /**
     * Get all registered transformers for debugging
     */
    getRegisteredTransformers(): {
        types: Map<string, Transformer[]>;
        constructors: Map<Function, Transformer[]>;
        fallback: Transformer[];
    };
}
