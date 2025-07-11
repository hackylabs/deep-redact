export const _error = (value) => {
    if (!(value instanceof Error))
        return value;
    return {
        _transformer: 'error',
        value: {
            type: value.constructor.name,
            message: value.message,
            stack: value.stack,
        },
    };
};
