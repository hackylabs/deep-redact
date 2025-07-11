"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardTransformers = void 0;
const bigint_1 = require("./bigint");
const date_1 = require("./date");
const error_1 = require("./error");
const map_1 = require("./map");
const regex_1 = require("./regex");
const set_1 = require("./set");
const url_1 = require("./url");
exports.standardTransformers = [
    bigint_1._bigint,
    url_1._url,
    date_1._date,
    error_1._error,
    map_1._map,
    set_1._set,
    regex_1._regex,
];
