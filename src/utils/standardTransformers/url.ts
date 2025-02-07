import type { Transformer } from "../../types"

export const _url: Transformer = (value: unknown) => {
    if (!(value instanceof URL)) return value
    return value.toString()
}