import type { Transformer, OrganisedTransformers } from "../../types.js";
import { _bigint } from "./bigint.js";
import { _date } from "./date.js";
import { _error } from "./error.js";
import { _map } from "./map.js";
import { _regex } from "./regex.js";
import { _set } from "./set.js";
import { _url } from "./url.js";

/**
 * Standard transformers in array for legacy support
 */
export const standardTransformers: Transformer[] = [
    _bigint,
    _date,
    _error,
    _map,
    _regex,
    _set,
    _url,
]

/**
 * Standard transformers organised by type and constructor for performance reasons
 */
export const organisedStandardTransformers: OrganisedTransformers = {
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
}
