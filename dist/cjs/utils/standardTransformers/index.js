"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organisedStandardTransformers = exports.standardTransformers = void 0;
const bigint_1 = require("./bigint");
const date_1 = require("./date");
const error_1 = require("./error");
const map_1 = require("./map");
const regex_1 = require("./regex");
const set_1 = require("./set");
const url_1 = require("./url");
/**
 * Standard transformers in array for legacy support
 */
exports.standardTransformers = [
    bigint_1._bigint,
    date_1._date,
    error_1._error,
    map_1._map,
    regex_1._regex,
    set_1._set,
    url_1._url,
];
/**
 * Standard transformers organised by type and constructor for performance reasons
 */
exports.organisedStandardTransformers = {
    byType: {
        bigint: [bigint_1._bigint],
    },
    byConstructor: {
        URL: [url_1._url],
        Date: [date_1._date],
        Error: [error_1._error],
        Map: [map_1._map],
        Set: [set_1._set],
        RegExp: [regex_1._regex],
    },
};
