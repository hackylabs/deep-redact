"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Redaction = void 0;
const normaliseString = (key) => key.toLowerCase().replace(/\W/g, '');
class Redaction {
    config = {
        blacklistedKeys: [],
        stringTests: [],
        fuzzy: false,
        caseSensitive: true,
        retainStructure: false,
        replaceStringByLength: false,
        replacement: 'REDACTED',
        types: ['string'],
    };
    constructor(config) {
        this.config = {
            ...this.config,
            ...config,
        };
    }
    deepRedact = (value, parentShouldRedact = false) => {
        if (!(value instanceof Object)) {
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
            return shouldRedact ? this.config.replacement : value;
        }
        if (parentShouldRedact && !this.config.retainStructure) {
            return this.config.replacement;
        }
        if (Array.isArray(value))
            return value.map((val) => this.deepRedact(val, parentShouldRedact));
        return Object.fromEntries(Object.entries(value).map(([key, val]) => {
            const shouldRedact = parentShouldRedact
                || this.config.blacklistedKeys.some((redactableKey) => {
                    if (this.config.fuzzy && this.config.caseSensitive) {
                        return key.includes(redactableKey);
                    }
                    if (this.config.fuzzy && !this.config.caseSensitive) {
                        return normaliseString(key).includes(normaliseString(redactableKey));
                    }
                    if (!this.config.fuzzy && this.config.caseSensitive) {
                        return key === redactableKey;
                    }
                    return normaliseString(key) === normaliseString(redactableKey);
                });
            return [key, this.deepRedact(val, shouldRedact)];
        }));
    };
    redact = (value) => this.deepRedact(value);
}
exports.Redaction = Redaction;
