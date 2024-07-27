const normaliseString = (key) => key.toLowerCase().replace(/\W/g, '');
class DeepRedact {
    constructor(config) {
        var _a, _b;
        this.circularReference = new WeakSet();
        this.config = {
            blacklistedKeys: [],
            stringTests: [],
            fuzzyKeyMatch: false,
            caseSensitiveKeyMatch: true,
            retainStructure: false,
            remove: false,
            replaceStringByLength: false,
            replacement: '[REDACTED]',
            types: ['string'],
            serialise: true,
            unsupportedTransformer: DeepRedact.unsupportedTransformer,
        };
        this.removeCircular = (value) => {
            var _a, _b;
            if (!(value instanceof Object))
                return value;
            if (!((_a = this.circularReference) === null || _a === void 0 ? void 0 : _a.has(value))) {
                (_b = this.circularReference) === null || _b === void 0 ? void 0 : _b.add(value);
                return value;
            }
            return '__circular__';
        };
        this.redactString = (value, parentShouldRedact = false) => {
            if (!this.config.stringTests.some((test) => test.test(value)) && !parentShouldRedact)
                return value;
            if (this.config.replaceStringByLength)
                return this.config.replacement.repeat(value.length);
            return this.config.remove ? undefined : this.config.replacement;
        };
        this.shouldRedactObjectValue = (key) => {
            return this.config.blacklistedKeys.some((redactableKey) => (typeof redactableKey === 'string'
                ? key === redactableKey
                : DeepRedact.complexShouldRedact(key, redactableKey)));
        };
        this.deepRedact = (value, parentShouldRedact = false) => {
            if (value === undefined || value === null)
                return value;
            let safeValue = this.removeCircular(value);
            safeValue = this.config.unsupportedTransformer(safeValue);
            if (!(safeValue instanceof Object)) {
                // @ts-expect-error - we already know that safeValue is not a function, symbol, undefined, null, or an object
                if (!this.config.types.includes(typeof safeValue))
                    return safeValue;
                if (typeof safeValue === 'string')
                    return this.redactString(safeValue, parentShouldRedact);
                if (!parentShouldRedact)
                    return safeValue;
                return this.config.remove
                    ? undefined
                    : this.config.replacement;
            }
            if (parentShouldRedact && (!this.config.retainStructure || this.config.remove)) {
                return this.config.remove ? undefined : this.config.replacement;
            }
            if (Array.isArray(safeValue))
                return safeValue.map((val) => this.deepRedact(val, parentShouldRedact));
            return Object.fromEntries(Object.entries(safeValue).map(([key, val]) => {
                const shouldRedact = parentShouldRedact || this.shouldRedactObjectValue(key);
                return [key, this.deepRedact(val, shouldRedact)];
            }));
        };
        this.redact = (value) => {
            this.circularReference = new WeakSet();
            const redacted = this.deepRedact(value);
            this.circularReference = null;
            return this.config.serialise ? JSON.stringify(redacted) : redacted;
        };
        this.config = Object.assign(Object.assign(Object.assign({}, this.config), config), { blacklistedKeys: (_b = (_a = config.blacklistedKeys) === null || _a === void 0 ? void 0 : _a.map((key) => {
                if (typeof key === 'string')
                    return key;
                return Object.assign({ fuzzyKeyMatch: this.config.fuzzyKeyMatch, caseSensitiveKeyMatch: this.config.caseSensitiveKeyMatch, retainStructure: this.config.retainStructure, remove: this.config.remove }, key);
            })) !== null && _b !== void 0 ? _b : [] });
    }
}
DeepRedact.unsupportedTransformer = (value) => {
    if (typeof value === 'bigint') {
        return {
            __unsupported: {
                type: 'bigint',
                value: value.toString(),
                radix: 10,
            },
        };
    }
    if (value instanceof Error) {
        return {
            __unsupported: {
                type: 'error',
                name: value.name,
                message: value.message,
                stack: value.stack,
            },
        };
    }
    if (value instanceof RegExp) {
        return {
            __unsupported: {
                type: 'regexp',
                source: value.source,
                flags: value.flags,
            },
        };
    }
    if (value instanceof Date)
        return value.toISOString();
    return value;
};
DeepRedact.complexShouldRedact = (key, config) => {
    if (config.key instanceof RegExp)
        return config.key.test(key);
    if (config.fuzzyKeyMatch && config.caseSensitiveKeyMatch)
        return key.includes(config.key);
    if (config.fuzzyKeyMatch && !config.caseSensitiveKeyMatch)
        return normaliseString(key).includes(normaliseString(config.key));
    if (!config.fuzzyKeyMatch && config.caseSensitiveKeyMatch)
        return key === config.key;
    return normaliseString(config.key) === normaliseString(key);
};
export { DeepRedact as default, DeepRedact };
