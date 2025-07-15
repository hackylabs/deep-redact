import type { OrganisedTransformers } from 'src/types';
import { _bigint } from './bigint';
import { _date } from './date';
import { _error } from './error';
import { _map } from './map';
import { _regex } from './regex';
import { _set } from './set';
import { _url } from './url';

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