import type { Transformer } from "../../types"

export const _set: Transformer = (value: unknown) => {
    if (value instanceof Set) return { value: Array.from(value), _transformer: 'set' }
    return value
}