export const _regex = (value) => {
    if (!(value instanceof RegExp))
        return value;
    return {
        _transformer: 'regex',
        value: {
            source: value.source,
            flags: value.flags,
        },
    };
};
