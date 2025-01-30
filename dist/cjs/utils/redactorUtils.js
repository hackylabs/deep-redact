"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultConfig = {
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
};
class RedactorUtils {
    constructor(customConfig) {
        var _a, _b, _c, _d;
        /**
         * The configuration for the redaction.
         * @private
         */
        this.config = defaultConfig;
        /**
         * Get the configuration for an object key. This will check the key against the transformed blacklisted keys.
         * @private
         * @param {string} key The key of the configuration to get.
         * @returns {Required<BlacklistKeyConfig> | undefined} The configuration for the key.
         */
        this.getBlacklistedKeyConfig = (key) => {
            var _a;
            if (!key)
                return undefined;
            return (_a = this.config.blacklistedKeysTransformed) === null || _a === void 0 ? void 0 : _a.find((redactableKey) => {
                return RedactorUtils.complexKeyMatch(key, redactableKey);
            });
        };
        /**
         * Get the recursion configuration for a key. This will check the key against the transformed blacklisted keys.
         * If the key is found, the configuration for the key will be returned, otherwise undefined.
         * @private
         * @param {string} key The key of the configuration to get.
         * @returns {Required<Pick<BlacklistKeyConfig, 'remove' | 'replacement' | 'retainStructure'>>} The configuration for the key.
         */
        this.getRecursionConfig = (key) => {
            const fallback = {
                remove: this.config.remove,
                replacement: this.config.replacement,
                retainStructure: this.config.retainStructure,
            };
            if (!key)
                return fallback;
            const blacklistedKeyConfig = this.getBlacklistedKeyConfig(key);
            if (!blacklistedKeyConfig)
                return fallback;
            return {
                remove: blacklistedKeyConfig.remove,
                replacement: blacklistedKeyConfig.replacement,
                retainStructure: blacklistedKeyConfig.retainStructure,
            };
        };
        /**
         * Determine if a key should be redacted. This will check the key against the blacklisted keys, using the default configuration.
         * @private
         * @param {string} key The key to check.
         * @returns {boolean} Whether the key should be redacted.
         */
        this.shouldRedactObjectValue = (key) => {
            if (!key)
                return false;
            return this.config.blacklistedKeysTransformed.some((redactableKey) => {
                return RedactorUtils.complexKeyMatch(key, redactableKey);
            });
        };
        /**
         * Redact a string. This will redact the string based on the configuration, redacting the string if it matches a pattern or if the parent key should be redacted.
         * @private
         * @param value
         * @param replacement
         * @param remove
         * @param shouldRedact
         */
        this.redactString = (value, replacement, remove, shouldRedact) => {
            if (!value || typeof value !== 'string')
                return value;
            const maybePartiallyRedacted = this.partialStringRedact(value);
            const { stringTests } = this.config;
            if (!shouldRedact) {
                const result = stringTests === null || stringTests === void 0 ? void 0 : stringTests.map((test) => {
                    if (test instanceof RegExp) {
                        if (!test.test(maybePartiallyRedacted))
                            return maybePartiallyRedacted;
                        if (remove)
                            return undefined;
                        if (typeof replacement === 'function')
                            return replacement(maybePartiallyRedacted);
                        if (this.config.replaceStringByLength)
                            return replacement.repeat(maybePartiallyRedacted.length);
                        return replacement;
                    }
                    if (remove && test.pattern.test(maybePartiallyRedacted))
                        return undefined;
                    return test.replacer(maybePartiallyRedacted, test.pattern);
                }).filter(Boolean)[0];
                if (result)
                    return result;
                if (remove)
                    return undefined;
                return maybePartiallyRedacted;
            }
            if (remove)
                return undefined;
            if (typeof replacement === 'function')
                return replacement(maybePartiallyRedacted);
            if (this.config.replaceStringByLength)
                return replacement.repeat(maybePartiallyRedacted.length);
            return replacement;
        };
        /**
         * Redact a primitive value. This will redact the value if it is a supported type, not an object or array, otherwise it will return the value unchanged.
         * @private
         * @param {unknown} value The value to redact.
         * @param {Transformer | string} replacement The replacement value for redacted data.
         * @param {boolean} remove Whether the redacted data should be removed.
         * @param {boolean} shouldRedact Whether the value should be redacted based on the parent key.
         * @returns {unknown} The redacted value.
         */
        this.redactPrimitive = (value, replacement, remove, shouldRedact) => {
            if (!this.config.types.includes(typeof value))
                return value;
            if (remove && shouldRedact && typeof value !== 'string')
                return undefined;
            if (typeof value === 'string')
                return this.redactString(value, replacement, remove, shouldRedact);
            if (!shouldRedact)
                return value;
            if (typeof replacement === 'function')
                return replacement(value);
            return replacement;
        };
        /**
         * Redact an array. This will redact each value in the array using the `recurse` method.
         * @private
         * @param {unknown[]} value The array to redact.
         * @returns {unknown[]} The redacted array.
         */
        this.redactArray = (value) => value.map((val) => this.recurse(val));
        /**
         * Redact an object. This will recursively redact the object based on the configuration, redacting the keys and values as required.
         * @param {Object} value The object to redact.
         * @param {string | null} key The key of the object if it is part of another object.
         * @param {boolean} parentShouldRedact Whether the item should be redacted based on the key within the parent object.
         */
        this.redactObject = (value, key, parentShouldRedact) => {
            return Object.fromEntries(Object.entries(value).map(([prop, val]) => {
                const shouldRedact = parentShouldRedact || this.shouldRedactObjectValue(prop);
                if (shouldRedact) {
                    const { remove } = this.getRecursionConfig(prop);
                    if (remove)
                        return [];
                }
                return [prop, this.recurse(val, key !== null && key !== void 0 ? key : prop, shouldRedact)];
            }).filter(([prop]) => prop !== undefined));
        };
        this.partialStringRedact = (value) => {
            const { partialStringTests } = this.config;
            if (partialStringTests.length === 0)
                return value;
            let result = value;
            partialStringTests.forEach((test) => {
                result = test.replacer(result, test.pattern);
            });
            return result;
        };
        /**
         * Redact a value. If the value is an object or array, the redaction will be performed recursively, otherwise the value will be redacted if it is a supported type using the `replace` method.
         * @private
         * @param {unknown} value The value to redact.
         * @param {string | null} key The key of the value if it is part of an object.
         * @param {boolean} parentShouldRedact Whether the parent object should be redacted.
         * @returns {unknown} The redacted value.
         */
        this.recurse = (value, key, parentShouldRedact) => {
            if (value === null)
                return value;
            const { remove, replacement, retainStructure } = this.getRecursionConfig(key);
            if (!(value instanceof Object))
                return this.redactPrimitive(value, replacement, remove, Boolean(key && parentShouldRedact));
            if (parentShouldRedact) {
                if (!retainStructure) {
                    return typeof replacement === 'function'
                        ? replacement(value)
                        : replacement;
                }
            }
            if (Array.isArray(value))
                return this.redactArray(value);
            return this.redactObject(value, key, parentShouldRedact);
        };
        this.config = Object.assign(Object.assign(Object.assign({}, defaultConfig), customConfig), { partialStringTests: (_a = customConfig.partialStringTests) !== null && _a !== void 0 ? _a : [], blacklistedKeys: (_b = customConfig.blacklistedKeys) !== null && _b !== void 0 ? _b : [], blacklistedKeysTransformed: (_d = (_c = customConfig.blacklistedKeys) === null || _c === void 0 ? void 0 : _c.map((key) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                const isObject = !(typeof key === 'string' || key instanceof RegExp);
                const setKey = isObject ? key.key : key;
                const fallback = {
                    fuzzyKeyMatch: (_a = customConfig.fuzzyKeyMatch) !== null && _a !== void 0 ? _a : defaultConfig.fuzzyKeyMatch,
                    caseSensitiveKeyMatch: (_b = customConfig.caseSensitiveKeyMatch) !== null && _b !== void 0 ? _b : defaultConfig.caseSensitiveKeyMatch,
                    retainStructure: (_c = customConfig.retainStructure) !== null && _c !== void 0 ? _c : defaultConfig.retainStructure,
                    replacement: (_d = customConfig.replacement) !== null && _d !== void 0 ? _d : defaultConfig.replacement,
                    remove: (_e = customConfig.remove) !== null && _e !== void 0 ? _e : defaultConfig.remove,
                    key: setKey,
                };
                if (isObject) {
                    return {
                        fuzzyKeyMatch: (_f = key.fuzzyKeyMatch) !== null && _f !== void 0 ? _f : fallback.fuzzyKeyMatch,
                        caseSensitiveKeyMatch: (_g = key.caseSensitiveKeyMatch) !== null && _g !== void 0 ? _g : fallback.caseSensitiveKeyMatch,
                        retainStructure: (_h = key.retainStructure) !== null && _h !== void 0 ? _h : fallback.retainStructure,
                        replacement: (_j = key.replacement) !== null && _j !== void 0 ? _j : fallback.replacement,
                        remove: (_k = key.remove) !== null && _k !== void 0 ? _k : fallback.remove,
                        key: setKey,
                    };
                }
                return fallback;
            })) !== null && _d !== void 0 ? _d : [] });
    }
}
/**
 * Normalise a string for comparison. This will convert the string to lowercase and remove any non-word characters.
 * @private
 * @param str The string to normalise.
 * @returns {string} The normalised string.
 */
RedactorUtils.normaliseString = (str) => str.toLowerCase().replaceAll(/\W/g, '');
/**
 * Determine if a key matches a given blacklistedKeyConfig. This will check the key against the blacklisted keys,
 * using the configuration option for the given key falling back to the default configuration.
 * @private
 * @param {string} key The key to check.
 * @param {BlacklistKeyConfig} blacklistKeyConfig The configuration for the key.
 * @returns {boolean} Whether the key should be redacted.
 */
RedactorUtils.complexKeyMatch = (key, blacklistKeyConfig) => {
    if (blacklistKeyConfig.key instanceof RegExp)
        return blacklistKeyConfig.key.test(key);
    if (blacklistKeyConfig.fuzzyKeyMatch && blacklistKeyConfig.caseSensitiveKeyMatch)
        return key.includes(blacklistKeyConfig.key);
    if (blacklistKeyConfig.fuzzyKeyMatch && !blacklistKeyConfig.caseSensitiveKeyMatch)
        return RedactorUtils.normaliseString(key).includes(RedactorUtils.normaliseString(blacklistKeyConfig.key));
    if (!blacklistKeyConfig.fuzzyKeyMatch && blacklistKeyConfig.caseSensitiveKeyMatch)
        return key === blacklistKeyConfig.key;
    return RedactorUtils.normaliseString(blacklistKeyConfig.key) === RedactorUtils.normaliseString(key);
};
exports.default = RedactorUtils;
