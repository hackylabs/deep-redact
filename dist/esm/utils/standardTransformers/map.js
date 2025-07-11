export const _map = (value) => {
    if (value instanceof Map)
        return { value: Object.fromEntries(value.entries()), _transformer: 'map' };
    return value;
};
