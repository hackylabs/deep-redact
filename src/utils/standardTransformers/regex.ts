import type { Transformer } from "../../types.js"

export const _regex: Transformer = (value: unknown) => {
    if (!(value instanceof RegExp)) return value
    return {
        _transformer: 'regex',
        value: {
            source: value.source,
            flags: value.flags,
        },
    }
}
