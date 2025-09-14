import { _bigint } from "./bigint.mjs";
import { _date } from "./date.mjs";
import { _error } from "./error.mjs";
import { _map } from "./map.mjs";
import { _regex } from "./regex.mjs";
import { _set } from "./set.mjs";
import { _url } from "./url.mjs";
/**
 * Standard transformers in array for legacy support
 */
export const standardTransformers = [
    _bigint,
    _date,
    _error,
    _map,
    _regex,
    _set,
    _url,
];
/**
 * Standard transformers organised by type and constructor for performance reasons
 */
export const organisedStandardTransformers = {
    byType: {
        bigint: [_bigint],
    },
    byConstructor: {
        URL: [_url],
        Date: [_date],
        Error: [_error],
        Map: [_map],
        Set: [_set],
        RegExp: [_regex],
    },
};
