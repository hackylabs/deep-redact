export const _set = (value) => {
    if (value instanceof Set)
        return { value: Array.from(value), _transformer: 'set' };
    return value;
};
