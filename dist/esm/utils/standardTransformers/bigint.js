export const _bigint = (value) => {
    if (typeof value !== 'bigint')
        return value;
    const radix = 10;
    return { value: { radix, number: value.toString(radix) }, _transformer: 'bigint' };
};
