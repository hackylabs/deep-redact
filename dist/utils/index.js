"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./standardTransformers/index.js");
const TransformerRegistry_js_1 = require("./TransformerRegistry.js");
const defaultConfig = {
    stringTests: [],
    blacklistedKeys: [],
    fuzzyKeyMatch: false,
    caseSensitiveKeyMatch: true,
    retainStructure: false,
    remove: false,
    replaceStringByLength: false,
    replacement: '[REDACTED]',
    types: ['string'],
    transformers: index_js_1.standardTransformers,
};
class RedactorUtils {
    constructor(customConfig) {
        var _a;
        /**
         * The configuration for the redaction.
         * @private
         */
        this.config = defaultConfig;
        /**
         * The transformed blacklist keys of flat regex patterns and complex config objects
         * @private
         */
        this.blacklistedKeysTransformed = [];
        /**
         * The transformer registry for efficient transformer lookup
         * @private
         */
        this.transformerRegistry = new TransformerRegistry_js_1.TransformerRegistry();
        this.createTransformedBlacklistedKey = (key, customConfig) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
            if (key instanceof RegExp) {
                return {
                    key,
                    fuzzyKeyMatch: (_a = customConfig.fuzzyKeyMatch) !== null && _a !== void 0 ? _a : defaultConfig.fuzzyKeyMatch,
                    caseSensitiveKeyMatch: (_b = customConfig.caseSensitiveKeyMatch) !== null && _b !== void 0 ? _b : defaultConfig.caseSensitiveKeyMatch,
                    retainStructure: (_c = customConfig.retainStructure) !== null && _c !== void 0 ? _c : defaultConfig.retainStructure,
                    replacement: (_d = customConfig.replacement) !== null && _d !== void 0 ? _d : defaultConfig.replacement,
                    replaceStringByLength: (_e = customConfig.replaceStringByLength) !== null && _e !== void 0 ? _e : defaultConfig.replaceStringByLength,
                    remove: (_f = customConfig.remove) !== null && _f !== void 0 ? _f : defaultConfig.remove,
                };
            }
            if (typeof key === 'string') {
                return {
                    key,
                    fuzzyKeyMatch: (_g = customConfig.fuzzyKeyMatch) !== null && _g !== void 0 ? _g : defaultConfig.fuzzyKeyMatch,
                    caseSensitiveKeyMatch: (_h = customConfig.caseSensitiveKeyMatch) !== null && _h !== void 0 ? _h : defaultConfig.caseSensitiveKeyMatch,
                    retainStructure: (_j = customConfig.retainStructure) !== null && _j !== void 0 ? _j : defaultConfig.retainStructure,
                    replacement: (_k = customConfig.replacement) !== null && _k !== void 0 ? _k : defaultConfig.replacement,
                    replaceStringByLength: (_l = customConfig.replaceStringByLength) !== null && _l !== void 0 ? _l : defaultConfig.replaceStringByLength,
                    remove: (_m = customConfig.remove) !== null && _m !== void 0 ? _m : defaultConfig.remove,
                };
            }
            return {
                fuzzyKeyMatch: (_p = (_o = key.fuzzyKeyMatch) !== null && _o !== void 0 ? _o : customConfig.fuzzyKeyMatch) !== null && _p !== void 0 ? _p : defaultConfig.fuzzyKeyMatch,
                caseSensitiveKeyMatch: (_r = (_q = key.caseSensitiveKeyMatch) !== null && _q !== void 0 ? _q : customConfig.caseSensitiveKeyMatch) !== null && _r !== void 0 ? _r : defaultConfig.caseSensitiveKeyMatch,
                retainStructure: (_t = (_s = key.retainStructure) !== null && _s !== void 0 ? _s : customConfig.retainStructure) !== null && _t !== void 0 ? _t : defaultConfig.retainStructure,
                replacement: (_v = (_u = key.replacement) !== null && _u !== void 0 ? _u : customConfig.replacement) !== null && _v !== void 0 ? _v : defaultConfig.replacement,
                replaceStringByLength: (_x = (_w = key.replaceStringByLength) !== null && _w !== void 0 ? _w : customConfig.replaceStringByLength) !== null && _x !== void 0 ? _x : defaultConfig.replaceStringByLength,
                remove: (_z = (_y = key.remove) !== null && _y !== void 0 ? _y : customConfig.remove) !== null && _z !== void 0 ? _z : defaultConfig.remove,
                key: key.key,
            };
        };
        /**
         * Applies transformers to a value
         * @param value - The value to transform
         * @param key - The key to check
         * @returns The transformed value
         * @private
         */
        this.applyTransformers = (value, key, referenceMap) => {
            return this.transformerRegistry.applyTransformers(value, key, referenceMap);
        };
        /**
         * Checks if a key should be redacted
         * @param key - The key to check
         * @returns Whether the key should be redacted
         * @private
         */
        this.shouldRedactKey = (key) => {
            return this.blacklistedKeysTransformed.some(config => {
                const pattern = config.key;
                if (pattern instanceof RegExp)
                    return pattern.test(key);
                if (!config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch)
                    return key.toLowerCase().trim().replace(/[_-]/g, '') === pattern.toLowerCase().trim().replace(/[_-]/g, '');
                if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch)
                    return key.toLowerCase().trim().replace(/[_-]/g, '').includes(pattern.toLowerCase().trim().replace(/[_-]/g, ''));
                if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch)
                    return key.includes(pattern);
                if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch)
                    return key === pattern;
            });
        };
        /**
         * Checks if a value should be redacted
         * @param value - The value to check
         * @param key - The key to check
         * @returns Whether the value should be redacted
         * @private
         */
        this.shouldRedactValue = (value, valueKey) => {
            if (!this.config.types.includes(typeof value))
                return false;
            return this.shouldRedactKey(valueKey);
        };
        /**
         * Redacts a value based on the key-specific config
         * @param value - The value to redact
         * @param key - The key to check
         * @param redactingParent - Whether the parent is being redacted
         * @returns The redacted value
         * @private
         */
        this.redactValue = (value, redactingParent, keyConfig) => {
            var _a, _b, _c, _d;
            if (!this.config.types.includes(typeof value))
                return { transformed: value, redactingParent };
            const remove = (_a = keyConfig === null || keyConfig === void 0 ? void 0 : keyConfig.remove) !== null && _a !== void 0 ? _a : this.config.remove;
            const replacement = (_b = keyConfig === null || keyConfig === void 0 ? void 0 : keyConfig.replacement) !== null && _b !== void 0 ? _b : this.config.replacement;
            const replaceStringByLength = (_c = keyConfig === null || keyConfig === void 0 ? void 0 : keyConfig.replaceStringByLength) !== null && _c !== void 0 ? _c : this.config.replaceStringByLength;
            const retainStructure = (_d = keyConfig === null || keyConfig === void 0 ? void 0 : keyConfig.retainStructure) !== null && _d !== void 0 ? _d : this.config.retainStructure;
            if (retainStructure && typeof value === 'object' && value !== null)
                return { transformed: value, redactingParent: true };
            if (remove)
                return { transformed: undefined, redactingParent };
            if (typeof replacement === 'function')
                return { transformed: replacement(value), redactingParent };
            return {
                redactingParent,
                transformed: (typeof value === 'string' && replaceStringByLength)
                    ? replacement.toString().repeat(value.length)
                    : replacement,
            };
        };
        /**
         * Traverses the raw value
         * @param raw - The raw value to traverse
         * @returns The transformed value
         */
        this.traverse = (raw) => {
            if (typeof raw === 'string') {
                const { transformed } = this.applyStringTransformations(raw, false);
                return transformed;
            }
            if (typeof raw !== 'object' || raw === null || this.requiresTransformers(raw))
                return this.applyTransformers(raw);
            const referenceMap = new WeakMap();
            const cleanedInput = this.replaceCircularReferences(raw);
            const { output, stack } = this.initialiseTraversal(cleanedInput);
            if (typeof cleanedInput === 'object' && cleanedInput !== null)
                referenceMap.set(cleanedInput, '');
            while (stack.length > 0) {
                const { parent, key, value, path, redactingParent: amRedactingParent, keyConfig } = stack.pop();
                let transformed = this.applyTransformers(value, key, referenceMap);
                let redactingParent = amRedactingParent;
                if (typeof transformed !== 'object' || transformed === null) {
                    const primitiveResult = this.handlePrimitiveValue(transformed, key, amRedactingParent, keyConfig);
                    redactingParent = primitiveResult.redactingParent;
                    transformed = primitiveResult.transformed;
                    if (typeof transformed === 'undefined')
                        continue;
                }
                else {
                    const objectResult = this.handleObjectValue(transformed, key, path, redactingParent, referenceMap, keyConfig);
                    transformed = objectResult.transformed;
                    stack.push(...objectResult.stack);
                }
                if (parent !== null && key !== null)
                    parent[key] = transformed;
            }
            return output;
        };
        this.config = Object.assign(Object.assign({}, defaultConfig), customConfig);
        this.blacklistedKeysTransformed = ((_a = customConfig.blacklistedKeys) !== null && _a !== void 0 ? _a : []).map((key) => this.createTransformedBlacklistedKey(key, customConfig));
        this.setupTransformerRegistry(this.config.transformers);
    }
    /**
     * Sets up the transformer registry based on the configuration
     * @param transformers - The transformer configuration
     * @private
     */
    setupTransformerRegistry(transformers) {
        if (Array.isArray(transformers)) {
            transformers.forEach(transformer => { this.transformerRegistry.addFallbackTransformer(transformer); });
        }
        else {
            const organised = transformers;
            if (organised.byType) {
                Object.entries(organised.byType).forEach(([type, typeTransformers]) => {
                    if (typeTransformers) {
                        typeTransformers.forEach(transformer => {
                            this.transformerRegistry.addTypeTransformer(type, transformer);
                        });
                    }
                });
            }
            if (organised.byConstructor) {
                Object.entries(organised.byConstructor).forEach(([constructorName, constructorTransformers]) => {
                    if (constructorTransformers) {
                        const constructorMap = {
                            Date,
                            Error,
                            Map,
                            Set,
                            RegExp,
                            URL,
                        };
                        const constructor = constructorMap[constructorName];
                        if (constructor) {
                            constructorTransformers.forEach(transformer => {
                                this.transformerRegistry.addConstructorTransformer(constructor, transformer);
                            });
                        }
                    }
                });
            }
        }
    }
    /**
     * Applies string transformations
     * @param value - The value to transform
     * @param key - The key to check
     * @returns The transformed value
     * @private
     */
    applyStringTransformations(value, amRedactingParent, keyConfig) {
        var _a;
        if (((_a = this.config.stringTests) !== null && _a !== void 0 ? _a : []).length === 0)
            return { transformed: value, redactingParent: amRedactingParent };
        for (const test of this.config.stringTests) {
            if (test instanceof RegExp) {
                if (test.test(value)) {
                    const { transformed, redactingParent } = this.redactValue(value, amRedactingParent, keyConfig);
                    return { transformed: transformed, redactingParent };
                }
            }
            else {
                if (test.pattern.test(value)) {
                    const transformed = test.replacer(value, test.pattern);
                    return { transformed, redactingParent: amRedactingParent };
                }
            }
        }
        return { transformed: value, redactingParent: amRedactingParent };
    }
    /**
     * Handles primitive values
     * @param value - The value to handle
     * @param key - The key to check
     * @param redactingParent - Whether the parent is being redacted
     * @param keyConfig - The key config
     * @returns The transformed value
     * @private
     */
    handlePrimitiveValue(value, valueKey, redactingParent, keyConfig) {
        let transformed = value;
        if (redactingParent) {
            if (valueKey === '_transformer' || !this.config.types.includes(typeof value)) {
                return { transformed: value, redactingParent };
            }
            const { transformed: transformedValue } = this.redactValue(value, redactingParent, keyConfig);
            return { transformed: transformedValue, redactingParent };
        }
        if (keyConfig || this.shouldRedactValue(value, valueKey)) {
            return this.redactValue(value, redactingParent, keyConfig);
        }
        if (typeof value === 'string') {
            return this.applyStringTransformations(value, redactingParent, keyConfig);
        }
        return { transformed, redactingParent };
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
    handleObjectValue(value, key, path, amRedactingParent, referenceMap, keyConfig) {
        var _a;
        const fullPath = path.join('.');
        const shouldRedact = amRedactingParent || Boolean(keyConfig) || this.shouldRedactValue(value, key);
        referenceMap.set(value, fullPath);
        if (shouldRedact && !((_a = keyConfig === null || keyConfig === void 0 ? void 0 : keyConfig.retainStructure) !== null && _a !== void 0 ? _a : this.config.retainStructure)) {
            const { transformed, redactingParent } = this.redactValue(value, amRedactingParent, keyConfig);
            return { transformed, redactingParent, stack: [] };
        }
        return this.handleRetainStructure(value, path, shouldRedact);
    }
    /**
     * Handles object values
     * @param value - The value to handle
     * @param path - The path to the value
     * @param redactingParent - Whether the parent is being redacted
     * @returns The transformed value and stack
     * @private
     */
    handleRetainStructure(value, path, redactingParent) {
        const newValue = Array.isArray(value) ? [] : {};
        const stack = [];
        if (Array.isArray(value)) {
            for (let i = value.length - 1; i >= 0; i--) {
                stack.push({
                    parent: newValue,
                    key: i.toString(),
                    value: value[i],
                    path: [...path, i],
                    redactingParent,
                    keyConfig: this.findMatchingKeyConfig(i.toString()),
                });
            }
        }
        else {
            for (const [propKey, propValue] of Object.entries(value).reverse()) {
                stack.push({
                    parent: newValue,
                    key: propKey,
                    value: propValue,
                    path: [...path, propKey],
                    redactingParent,
                    keyConfig: this.findMatchingKeyConfig(propKey),
                });
            }
        }
        return { transformed: newValue, redactingParent, stack };
    }
    /**
     * Finds the matching key config
     * @param key - The key to find
     * @returns The matching key config
     * @private
     */
    findMatchingKeyConfig(key) {
        return this.blacklistedKeysTransformed.find(config => {
            const pattern = config.key;
            if (pattern instanceof RegExp)
                return pattern.test(key);
            const normalisedKey = key.toLowerCase().trim().replace(/[_-]/g, '');
            const normalisedPattern = pattern.toLowerCase().trim().replace(/[_-]/g, '');
            if (config.fuzzyKeyMatch) {
                const compareKey = config.caseSensitiveKeyMatch ? key : normalisedKey;
                const comparePattern = config.caseSensitiveKeyMatch ? pattern : normalisedPattern;
                return compareKey.includes(comparePattern);
            }
            return config.caseSensitiveKeyMatch ? key === pattern : normalisedKey === normalisedPattern;
        });
    }
    /**
     * Initialises the traversal
     * @param raw - The raw value to traverse
     * @returns The output and stack
     * @private
     */
    initialiseTraversal(raw) {
        const output = Array.isArray(raw) ? [] : {};
        const stack = [];
        if (typeof raw === 'object' && raw !== null) {
            if (Array.isArray(raw)) {
                for (let i = raw.length - 1; i >= 0; i--) {
                    stack.push({
                        parent: output,
                        key: i.toString(),
                        value: raw[i],
                        path: [i],
                        redactingParent: false,
                        keyConfig: this.findMatchingKeyConfig(i.toString()),
                    });
                }
            }
            else {
                for (const [propKey, propValue] of Object.entries(raw).reverse()) {
                    stack.push({
                        parent: output,
                        key: propKey,
                        value: propValue,
                        path: [propKey],
                        redactingParent: false,
                        keyConfig: this.findMatchingKeyConfig(propKey),
                    });
                }
            }
        }
        return { output, stack };
    }
    /**
     * Pre-processes the input to replace circular references with transformer objects
     * @param raw - The raw value to process
     * @returns The processed value with circular references replaced
     * @private
     */
    replaceCircularReferences(raw) {
        if (typeof raw !== 'object' || raw === null)
            return raw;
        const visiting = new WeakSet();
        const pathMap = new WeakMap();
        const processValue = (value, path) => {
            if (typeof value !== 'object' || value === null)
                return value;
            if (visiting.has(value)) {
                const originalPath = pathMap.get(value) || '';
                return {
                    _transformer: 'circular',
                    value: originalPath,
                    path: path
                };
            }
            visiting.add(value);
            pathMap.set(value, path);
            let result;
            if (Array.isArray(value)) {
                let hasCircular = false;
                const newArray = value.map((item, index) => {
                    const itemPath = path ? `${path}.${index}` : index.toString();
                    const processed = processValue(item, itemPath);
                    if (processed !== item)
                        hasCircular = true;
                    return processed;
                });
                result = hasCircular ? newArray : value;
            }
            else {
                let hasCircular = false;
                const newObj = {};
                for (const [key, val] of Object.entries(value)) {
                    const valuePath = path ? `${path}.${key}` : key;
                    const processed = processValue(val, valuePath);
                    newObj[key] = processed;
                    if (processed !== val)
                        hasCircular = true;
                }
                result = hasCircular ? newObj : value;
            }
            visiting.delete(value);
            return result;
        };
        return processValue(raw, '');
    }
    /**
     * Checks if a non-traversable value requires transformers
     * @param value - The value to check
     * @returns Whether the value requires transformers
     * @private
     */
    requiresTransformers(value) {
        if (typeof value === 'bigint')
            return true;
        if (value instanceof Date)
            return true;
        if (value instanceof Error)
            return true;
        if (value instanceof Map)
            return true;
        if (value instanceof RegExp)
            return true;
        if (value instanceof Set)
            return true;
        if (value instanceof URL)
            return true;
        return false;
    }
}
exports.default = RedactorUtils;
