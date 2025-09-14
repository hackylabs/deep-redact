"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._bigint = void 0;
const _bigint = (value) => {
    if (typeof value !== 'bigint')
        return value;
    const radix = 10;
    return { value: { radix, number: value.toString(radix) }, _transformer: 'bigint' };
};
exports._bigint = _bigint;
