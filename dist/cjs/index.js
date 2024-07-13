"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Redaction = void 0;
const normaliseString = (key) => key.toLowerCase().replace(/\W/g, '');
class Redaction {
    constructor(config) {
        var _a, _b;
        this.config = {
            blacklistedKeys: [],
            stringTests: [],
            fuzzyKeyMatch: false,
            caseSensitiveKeyMatch: true,
            retainStructure: false,
            replaceStringByLength: false,
            replacement: '[REDACTED]',
            types: ['string'],
        };
        this.complexShouldRedact = (key, config) => {
            if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch)
                return key.includes(config.key);
            if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch)
                return normaliseString(key).includes(normaliseString(config.key));
            if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch)
                return key === config.key;
            return normaliseString(config.key) === normaliseString(key);
        };
        this.shouldReactObjectValue = (key) => {
            return this.config.blacklistedKeys.some((redactableKey) => {
                return typeof redactableKey === 'string'
                    ? key === redactableKey
                    : this.complexShouldRedact(key, redactableKey);
            });
        };
        this.deepRedact = (value, parentShouldRedact = false) => {
            if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined' || value === null)
                return value;
            if (!(value instanceof Object)) {
                // @ts-expect-error - we already know that value is not a function, symbol, undefined, null, or an object
                if (!this.config.types.includes(typeof value))
                    return value;
                let shouldRedact = parentShouldRedact;
                if (typeof value === 'string') {
                    shouldRedact = shouldRedact || this.config.stringTests.some((test) => test.test(value));
                    if (!shouldRedact)
                        return value;
                    return this.config.replaceStringByLength
                        ? this.config.replacement.repeat(value.length)
                        : this.config.replacement;
                }
                return shouldRedact
                    ? this.config.replacement
                    : value;
            }
            if (parentShouldRedact && !this.config.retainStructure)
                return this.config.replacement;
            if (Array.isArray(value))
                return value.map((val) => this.deepRedact(val, parentShouldRedact));
            return Object.fromEntries(Object.entries(value).map(([key, val]) => {
                const shouldRedact = parentShouldRedact || this.shouldReactObjectValue(key);
                return [key, this.deepRedact(val, shouldRedact)];
            }));
        };
        this.redact = (value) => this.deepRedact(value);
        this.config = Object.assign(Object.assign(Object.assign({}, this.config), config), { blacklistedKeys: (_b = (_a = config.blacklistedKeys) === null || _a === void 0 ? void 0 : _a.map((key) => {
                if (typeof key === 'string')
                    return key;
                return Object.assign({ fuzzyKeyMatch: this.config.fuzzyKeyMatch, caseSensitiveKeyMatch: this.config.caseSensitiveKeyMatch, retainStructure: this.config.retainStructure }, key);
            })) !== null && _b !== void 0 ? _b : [] });
    }
}
exports.Redaction = Redaction;
