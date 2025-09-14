"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organisedStandardTransformers = exports.standardTransformers = void 0;
const bigint_js_1 = require("./bigint.js");
const date_js_1 = require("./date.js");
const error_js_1 = require("./error.js");
const map_js_1 = require("./map.js");
const regex_js_1 = require("./regex.js");
const set_js_1 = require("./set.js");
const url_js_1 = require("./url.js");
/**
 * Standard transformers in array for legacy support
 */
exports.standardTransformers = [
    bigint_js_1._bigint,
    date_js_1._date,
    error_js_1._error,
    map_js_1._map,
    regex_js_1._regex,
    set_js_1._set,
    url_js_1._url,
];
/**
 * Standard transformers organised by type and constructor for performance reasons
 */
exports.organisedStandardTransformers = {
    byType: {
        bigint: [bigint_js_1._bigint],
    },
    byConstructor: {
        URL: [url_js_1._url],
        Date: [date_js_1._date],
        Error: [error_js_1._error],
        Map: [map_js_1._map],
        Set: [set_js_1._set],
        RegExp: [regex_js_1._regex],
    },
};
