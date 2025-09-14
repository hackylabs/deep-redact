"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._regex = void 0;
const _regex = (value) => {
    if (!(value instanceof RegExp))
        return value;
    return {
        _transformer: 'regex',
        value: {
            source: value.source,
            flags: value.flags,
        },
    };
};
exports._regex = _regex;
