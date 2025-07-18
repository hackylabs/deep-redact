import type { RedactorUtilsConfig } from '../types';
declare class RedactorUtils {
    /**
     * The configuration for the redaction.
     * @private
     */
    private readonly config;
    /**
     * The computed regex pattern generated from sanitised blacklist keys of flat strings
     * @private
     */
    private readonly computedRegex;
    /**
     * Regex to sanitise strings for the computed regex
     * @private
     */
    private readonly sanitiseRegex;
    /**
     * The transformed blacklist keys of flat regex patterns and complex config objects
     * @private
     */
    private readonly blacklistedKeysTransformed;
    /**
     * The transformer registry for efficient transformer lookup
     * @private
     */
    private readonly transformerRegistry;
    constructor(customConfig: RedactorUtilsConfig);
    /**
     * Sets up the transformer registry based on the configuration
     * @param transformers - The transformer configuration
     * @private
     */
    private setupTransformerRegistry;
    private createTransformedBlacklistedKey;
    /**
     * Applies transformers to a value
     * @param value - The value to transform
     * @param key - The key to check
     * @returns The transformed value
     * @private
     */
    private applyTransformers;
    /**
     * Sanitises a string for the computed regex
     * @param key - The string to sanitise
     * @returns The sanitised string
     * @private
     */
    private sanitiseStringForRegex;
    /**
     * Checks if a key should be redacted
     * @param key - The key to check
     * @returns Whether the key should be redacted
     * @private
     */
    private shouldRedactKey;
    /**
     * Checks if a value should be redacted
     * @param value - The value to check
     * @param key - The key to check
     * @returns Whether the value should be redacted
     * @private
     */
    private shouldRedactValue;
    /**
     * Redacts a value based on the key-specific config
     * @param value - The value to redact
     * @param key - The key to check
     * @param redactingParent - Whether the parent is being redacted
     * @returns The redacted value
     * @private
     */
    private redactValue;
    /**
     * Applies string transformations
     * @param value - The value to transform
     * @param key - The key to check
     * @returns The transformed value
     * @private
     */
    private applyStringTransformations;
    /**
     * Handles primitive values
     * @param value - The value to handle
     * @param key - The key to check
     * @param redactingParent - Whether the parent is being redacted
     * @param keyConfig - The key config
     * @returns The transformed value
     * @private
     */
    private handlePrimitiveValue;
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
    private handleObjectValue;
    /**
     * Handles object values
     * @param value - The value to handle
     * @param path - The path to the value
     * @param redactingParent - Whether the parent is being redacted
     * @returns The transformed value and stack
     * @private
     */
    private handleRetainStructure;
    /**
     * Finds the matching key config
     * @param key - The key to find
     * @returns The matching key config
     * @private
     */
    private findMatchingKeyConfig;
    /**
     * Initialises the traversal
     * @param raw - The raw value to traverse
     * @returns The output and stack
     * @private
     */
    private initialiseTraversal;
    /**
     * Pre-processes the input to replace circular references with transformer objects
     * @param raw - The raw value to process
     * @returns The processed value with circular references replaced
     * @private
     */
    private replaceCircularReferences;
    /**
     * Checks if a non-traversable value requires transformers
     * @param value - The value to check
     * @returns Whether the value requires transformers
     * @private
     */
    private requiresTransformers;
    /**
     * Traverses the raw value
     * @param raw - The raw value to traverse
     * @returns The transformed value
     */
    traverse: (raw: unknown) => unknown;
}
export default RedactorUtils;
