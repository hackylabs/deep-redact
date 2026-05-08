import type { Transformer } from '../types/transformers.js'

export const bigintTransformer: Transformer = (value: unknown) => {
  if (typeof value !== 'bigint') {
    return value
  }

  return {
    _transformer: 'bigint',
    value: {
      radix: 10,
      number: value.toString(10),
    },
  }
}

export const dateTransformer: Transformer = (value: unknown) => {
  if (!(value instanceof Date)) {
    return value
  }

  return {
    _transformer: 'date',
    datetime: value.toISOString(),
  }
}

export const errorTransformer: Transformer = (value: unknown) => {
  if (!(value instanceof Error)) {
    return value
  }

  return {
    _transformer: 'error',
    value: {
      type: value.constructor.name,
      message: value.message,
      stack: value.stack,
    },
  }
}

export const mapTransformer: Transformer = (value: unknown) => {
  if (!(value instanceof Map)) {
    return value
  }

  return {
    _transformer: 'map',
    value: Object.fromEntries(value.entries()),
  }
}

export const regexTransformer: Transformer = (value: unknown) => {
  if (!(value instanceof RegExp)) {
    return value
  }

  return {
    _transformer: 'regex',
    value: {
      source: value.source,
      flags: value.flags,
    },
  }
}

export const setTransformer: Transformer = (value: unknown) => {
  if (!(value instanceof Set)) {
    return value
  }

  return {
    _transformer: 'set',
    value: [...value.values()],
  }
}

export const urlTransformer: Transformer = (value: unknown) => {
  if (!(value instanceof URL)) {
    return value
  }

  return {
    _transformer: 'url',
    value: value.href,
  }
}
