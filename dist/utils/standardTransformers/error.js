"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._error = void 0;
const _error = (value) => {
    if (!(value instanceof Error))
        return value;
    return {
        _transformer: 'error',
        value: {
            type: value.constructor.name,
            message: value.message,
            stack: value.stack,
        },
    };
};
exports._error = _error;
