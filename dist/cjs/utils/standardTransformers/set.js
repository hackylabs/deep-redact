"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._set = void 0;
const _set = (value) => {
    if (value instanceof Set)
        return { value: Array.from(value), _transformer: 'set' };
    return value;
};
exports._set = _set;
