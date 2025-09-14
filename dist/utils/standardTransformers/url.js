"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._url = void 0;
const _url = (value) => {
    if (value instanceof URL)
        return { value: value.toString(), _transformer: 'url' };
    return value;
};
exports._url = _url;
