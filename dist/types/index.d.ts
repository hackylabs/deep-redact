import { DeepRedactConfig } from './types';
declare class DeepRedact {
    /**
     * The redactorUtils instance to handle the redaction.
     * @private
     */
    private redactorUtils;
    /**
     * A WeakSet to store circular references during redaction. Reset to null after redaction is complete.
     * @private
     */
    private circularReference;
    /**
     * The configuration for the redaction.
     * @private
     */
    private readonly config;
    /**
     * Create a new DeepRedact instance with the provided configuration.
     * The configuration will be merged with the default configuration.
     * `blacklistedKeys` will be normalised to an array inherited from the default configuration as the default values.
     * @param {DeepRedactConfig} config. The configuration for the redaction.
     */
    constructor(config: DeepRedactConfig);
    /**
     * A transformer for unsupported data types. If `serialise` is false, the value will be returned as is,
     * otherwise it will transform the value into a format that is supported by JSON.stringify.
     *
     * Error, RegExp, and Date instances are technically supported by JSON.stringify,
     * but they returned as empty objects, therefore they are also transformed here.
     * @protected
     * @param {unknown} value The value that is not supported by JSON.stringify.
     * @returns {unknown} The value in a format that is supported by JSON.stringify.
     */
    protected unsupportedTransformer: (value: unknown) => unknown;
    /**
     * Calls `unsupportedTransformer` on the provided value and rewrites any circular references.
     *
     * Circular references will always be removed to avoid infinite recursion.
     * When a circular reference is found, the value will be replaced with `[[CIRCULAR_REFERENCE: path.to.original.value]]`.
     * @protected
     * @param {unknown} value The value to rewrite.
     * @param {string | undefined} path The path to the value in the object.
     * @returns {unknown} The rewritten value.
     */
    protected rewriteUnsupported: (value: unknown, path?: string) => unknown;
    /**
     * Depending on the value of `serialise`, return the value as a JSON string or as the provided value.
     *
     * Also resets the `circularReference` property to null after redaction is complete.
     * This is to ensure that the WeakSet doesn't cause memory leaks.
     * @private
     * @param value
     * @returns {unknown} The value as a JSON string or as the provided value.
     * @throws {Error} If the value cannot be serialised.
     */
    private maybeSerialise;
    /**
     * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
     * @param {unknown} value The value to redact.
     * @returns {unknown} The redacted value.
     */
    redact: (value: unknown) => unknown;
}
export { DeepRedact as default, DeepRedact };
