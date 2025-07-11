import type { Transformer } from '../../types'

export const _bigint: Transformer = (value: unknown) => {
    if (typeof value !== 'bigint') return value
    const radix = 10
    return { value: { radix, number: value.toString(radix) }, _transformer: 'bigint' }
}