import type { Transformer } from "../../types"

export const _error: Transformer = (value: unknown) => {
    if (!(value instanceof Error)) return value
    return {
        _transformer: 'error',
        value: {
            type: value.constructor.name,
            message: value.message,
            stack: value.stack,
        },
    }
}
