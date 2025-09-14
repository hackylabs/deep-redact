export const _date = (value) => {
    if (value instanceof Date)
        return { datetime: value.toISOString(), _transformer: 'date' };
    return value;
};
