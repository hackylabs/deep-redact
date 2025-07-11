"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._date = void 0;
const _date = (value) => {
    if (value instanceof Date)
        return { datetime: value.toISOString(), _transformer: 'date' };
    return value;
};
exports._date = _date;
