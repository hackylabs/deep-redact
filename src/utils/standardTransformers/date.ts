import type { Transformer } from "../../types"

export const _date: Transformer = (value: unknown) => {
    if (!(value instanceof Date)) return value
    return value.toISOString()
}
