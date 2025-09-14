export const _url = (value) => {
    if (value instanceof URL)
        return { value: value.toString(), _transformer: 'url' };
    return value;
};
