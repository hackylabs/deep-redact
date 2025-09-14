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
exports.organisedStandardTransformers = exports.standardTransformers = exports.default = exports.DeepRedact = void 0;
const index_js_1 = require("./utils/standardTransformers/index.js");
Object.defineProperty(exports, "organisedStandardTransformers", { enumerable: true, get: function () { return index_js_1.organisedStandardTransformers; } });
Object.defineProperty(exports, "standardTransformers", { enumerable: true, get: function () { return index_js_1.standardTransformers; } });
const index_js_2 = __importDefault(require("./utils/index.js"));
class DeepRedact {
    /**
     * Create a new DeepRedact instance with the provided configuration.
     * The configuration will be merged with the default configuration.
     * `blacklistedKeys` will be normalised to an array inherited from the default configuration as the default values.
     * @param {DeepRedactConfig} config. The configuration for the redaction.
     */
    constructor(config) {
        /**
         * The configuration for the redaction.
         * @private
         */
        this.config = {
            serialise: false,
        };
        /**
         * Redact the provided value. The value will be stripped of any circular references and other unsupported data types, before being redacted according to the configuration and finally serialised if required.
         * @param {unknown} value The value to redact.
         * @returns {unknown} The redacted value.
         * @throws {Error} If the value cannot be serialised to JSON and serialise is true.
         */
        this.redact = (value) => {
            const redacted = this.redactorUtils.traverse(value);
            return this.config.serialise ? JSON.stringify(redacted) : redacted;
        };
        const { serialise, serialize } = config, rest = __rest(config, ["serialise", "serialize"]);
        const englishSerialise = serialise !== null && serialise !== void 0 ? serialise : serialize;
        if (typeof englishSerialise === 'boolean')
            this.config.serialise = englishSerialise;
        this.redactorUtils = new index_js_2.default(Object.assign({}, rest));
    }
}
exports.DeepRedact = DeepRedact;
exports.default = DeepRedact;
