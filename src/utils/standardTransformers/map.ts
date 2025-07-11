import type { Transformer } from "../../types"

export const _map: Transformer = (value: unknown) => {
    if (value instanceof Map) return { value: Object.fromEntries(value.entries()), _transformer: 'map' }
    return value
}