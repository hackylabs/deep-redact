import { RedactorUtilsConfig } from '../types';
declare class RedactorUtils {
    /**
     * The configuration for the redaction.
     * @private
     */
    private readonly config;
    constructor(customConfig: Omit<RedactorUtilsConfig, 'blacklistedKeysTransformed'>);
    /**
     * Normalise a string for comparison. This will convert the string to lowercase and remove any non-word characters.
     * @private
     * @param str The string to normalise.
     * @returns {string} The normalised string.
     */
    private static normaliseString;
    /**
     * Determine if a key matches a given blacklistedKeyConfig. This will check the key against the blacklisted keys,
     * using the configuration option for the given key falling back to the default configuration.
     * @private
     * @param {string} key The key to check.
     * @param {BlacklistKeyConfig} blacklistKeyConfig The configuration for the key.
     * @returns {boolean} Whether the key should be redacted.
     */
    private static complexKeyMatch;
    /**
     * Get the configuration for an object key. This will check the key against the transformed blacklisted keys.
     * @private
     * @param {string} key The key of the configuration to get.
     * @returns {Required<BlacklistKeyConfig> | undefined} The configuration for the key.
     */
    private getBlacklistedKeyConfig;
    /**
     * Get the recursion configuration for a key. This will check the key against the transformed blacklisted keys.
     * If the key is found, the configuration for the key will be returned, otherwise undefined.
     * @private
     * @param {string} key The key of the configuration to get.
     * @returns {Required<Pick<BlacklistKeyConfig, 'remove' | 'replacement' | 'retainStructure'>>} The configuration for the key.
     */
    private getRecursionConfig;
    /**
     * Determine if a key should be redacted. This will check the key against the blacklisted keys, using the default configuration.
     * @private
     * @param {string} key The key to check.
     * @returns {boolean} Whether the key should be redacted.
     */
    private shouldRedactObjectValue;
    /**
     * Redact a string. This will redact the string based on the configuration, redacting the string if it matches a pattern or if the parent key should be redacted.
     * @private
     * @param value
     * @param replacement
     * @param remove
     * @param shouldRedact
     */
    private redactString;
    /**
     * Redact a primitive value. This will redact the value if it is a supported type, not an object or array, otherwise it will return the value unchanged.
     * @private
     * @param {unknown} value The value to redact.
     * @param {Transformer | string} replacement The replacement value for redacted data.
     * @param {boolean} remove Whether the redacted data should be removed.
     * @param {boolean} shouldRedact Whether the value should be redacted based on the parent key.
     * @returns {unknown} The redacted value.
     */
    private redactPrimitive;
    /**
     * Redact an array. This will redact each value in the array using the `recurse` method.
     * @private
     * @param {unknown[]} value The array to redact.
     * @returns {unknown[]} The redacted array.
     */
    private redactArray;
    /**
     * Redact an object. This will recursively redact the object based on the configuration, redacting the keys and values as required.
     * @param {Object} value The object to redact.
     * @param {string | null} key The key of the object if it is part of another object.
     * @param {boolean} parentShouldRedact Whether the item should be redacted based on the key within the parent object.
     */
    private redactObject;
    /**
     * Redact a value. If the value is an object or array, the redaction will be performed recursively, otherwise the value will be redacted if it is a supported type using the `replace` method.
     * @private
     * @param {unknown} value The value to redact.
     * @param {string | null} key The key of the value if it is part of an object.
     * @param {boolean} parentShouldRedact Whether the parent object should be redacted.
     * @returns {unknown} The redacted value.
     */
    recurse: (value: unknown, key?: string | null, parentShouldRedact?: boolean) => unknown;
}
export default RedactorUtils;
