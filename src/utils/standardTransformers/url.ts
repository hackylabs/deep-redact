import type { Transformer } from "../../types.js"

export const _url: Transformer = (value: unknown) => {
    if (value instanceof URL) return { value: value.toString(), _transformer: 'url' }
    return value
}
