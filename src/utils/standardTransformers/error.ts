import type { Transformer } from "../../types"

export const _error: Transformer = (value: unknown) => {
    if (!(value instanceof Error)) return value
    return {
        type: value.constructor.name,
        message: value.message,
        stack: value.stack,
    }
}
