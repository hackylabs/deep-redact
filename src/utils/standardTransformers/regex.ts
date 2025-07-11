import type { Transformer } from "../../types"

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
