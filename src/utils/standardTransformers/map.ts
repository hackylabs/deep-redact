import type { Transformer } from "../../types"

export const _map: Transformer = (value: unknown) => {
    if (!(value instanceof Map)) return value
    return Object.fromEntries(value.entries())
}