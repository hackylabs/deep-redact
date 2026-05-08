import type { Transformer } from '../../types.js'

export const _set: Transformer = (value: unknown) => {
    if (value instanceof Set) return { value: [...value], _transformer: 'set' }
    return value
}
