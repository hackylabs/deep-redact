import type { Transformer } from "../../types.js"

export const _date: Transformer = (value: unknown) => {
    if (value instanceof Date) return { datetime: value.toISOString(), _transformer: 'date' }
    return value
}
