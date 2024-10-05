"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepRedact = exports.default = void 0;
const redactorUtils_1 = __importDefault(require("./utils/redactorUtils"));
class DeepRedact {
    /**
     * Create a new DeepRedact instance with the provided configuration.
     * The configuration will be merged with the default configuration.
     * `blacklistedKeys` will be normalised to an array inherited from the default configuration as the default values.
     * @param {DeepRedactConfig} config. The configuration for the redaction.
     */
    constructor(config) {
        /**
         * A WeakSet to store circular references during redaction. Reset to null after redaction is complete.
         * @private
         */
        this.circularReference = null;
        /**
         * The configuration for the redaction.
         * @private
         */
        this.config = {
            serialise: false,
        };
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
        this.unsupportedTransformer = (value) => {
            if (!this.config.serialise)
                return value;
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
            if (value instanceof Set) {
                return {
                    __unsupported: {
                        type: 'set',
                        values: Array.from(value),
                    },
                };
            }
            if (value instanceof Map) {
                return {
                    __unsupported: {
                        type: 'map',
                        entries: Object.fromEntries(value.entries()),
                    },
                };
            }
            if (value instanceof URL)
                return value.toString();
            if (value instanceof Date)
                return value.toISOString();
            return value;
        };
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
        this.rewriteUnsupported = (value, path) => {
            const safeValue = this.unsupportedTransformer(value);
            if (!(safeValue instanceof Object))
                return safeValue;
            if (this.circularReference === null)
                this.circularReference = new WeakSet();
            if (Array.isArray(safeValue)) {
                return safeValue.map((val, index) => {
                    var _a, _b;
                    const newPath = path ? `${path}.[${index}]` : `[${index}]`;
                    if ((_a = this.circularReference) === null || _a === void 0 ? void 0 : _a.has(val))
                        return `[[CIRCULAR_REFERENCE: ${newPath}]]`;
                    if (val instanceof Object) {
                        (_b = this.circularReference) === null || _b === void 0 ? void 0 : _b.add(val);
                        return this.rewriteUnsupported(val, newPath);
                    }
                    return val;
                });
            }
            return Object.fromEntries(Object.entries(safeValue).map(([key, val]) => {
                var _a, _b;
                const newPath = path ? `${path}.${key}` : key;
                if ((_a = this.circularReference) === null || _a === void 0 ? void 0 : _a.has(val))
                    return [key, `[[CIRCULAR_REFERENCE: ${newPath}]]`];
                if (val instanceof Object)
                    (_b = this.circularReference) === null || _b === void 0 ? void 0 : _b.add(val);
                return [key, this.rewriteUnsupported(val, path ? `${path}.${key}` : key)];
            }));
        };
        /**
         * Depending on the value of `serialise`, return the value as a JSON string or as the provided value.
         *
         * Also resets the `circularReference` property to null after redaction is complete.
         * This is to ensure that the WeakSet doesn't cause memory leaks.
         * @private
         * @param value
         */
        this.maybeSerialise = (value) => {
            this.circularReference = null;
            return this.config.serialise ? JSON.stringify(value) : value;
        };
        /**
         * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
         * @param {unknown} value The value to redact.
         * @returns {unknown} The redacted value.
         */
        this.redact = (value) => {
            return this.maybeSerialise(this.redactorUtils.recurse(this.rewriteUnsupported(value)));
        };
        const { serialise, serialize } = config, rest = __rest(config, ["serialise", "serialize"]);
        this.redactorUtils = new redactorUtils_1.default(rest);
        if (serialise !== undefined)
            this.config.serialise = serialise;
        if (serialize !== undefined)
            this.config.serialise = serialize;
    }
}
exports.default = DeepRedact;
exports.DeepRedact = DeepRedact;
