import type { Transformer } from "../../types"

export const _bigint: Transformer = (value: unknown) => {
    if (typeof value !== 'bigint') return value
    return value.toString(10)
}