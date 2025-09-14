"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._map = void 0;
const _map = (value) => {
    if (value instanceof Map)
        return { value: Object.fromEntries(value.entries()), _transformer: 'map' };
    return value;
};
exports._map = _map;
