import { _bigint } from "./bigint";
import { _date } from "./date";
import { _error } from "./error";
import { _map } from "./map";
import { _regex } from "./regex";
import { _set } from "./set";
import { _url } from "./url";
export const standardTransformers = [
    _bigint,
    _url,
    _date,
    _error,
    _map,
    _set,
    _regex,
];
