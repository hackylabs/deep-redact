import { Transformer, TransformerUtils, TransformerUtilsConfig } from '../types'

const transformUnsupported = (customConfig: TransformerUtilsConfig): TransformerUtils => {
  const defaultConfig: TransformerUtilsConfig = {
    serialise: true,
  }

  const utils: TransformerUtils = {
    circularReference: null,

    config: {
      ...defaultConfig,
      ...customConfig,
    },

    unsupportedTransformer: (value) => {
      if (!utils.config.serialise) return value

      if (typeof value === 'bigint') {
        return {
          __unsupported: {
            type: 'bigint',
            value: value.toString(),
            radix: 10,
          },
        }
      }

      if (value instanceof Error) {
        return {
          __unsupported: {
            type: 'error',
            name: value.name,
            message: value.message,
            stack: value.stack,
          },
        }
      }

      if (value instanceof RegExp) {
        return {
          __unsupported: {
            type: 'regexp',
            source: value.source,
            flags: value.flags,
          },
        }
      }

      if (value instanceof Date) return value.toISOString()

      return value
    },

    getUnsupportedTransformer: (): Transformer => {
      return utils.config.unsupportedTransformer ?? utils.unsupportedTransformer
    },

    rewriteUnsupported: (value, path = '') => {
      const safeValue = utils.getUnsupportedTransformer()(value)
      if (!(safeValue instanceof Object)) return safeValue
      if (utils.circularReference === null) utils.circularReference = new WeakSet()
      if (Array.isArray(safeValue)) {
        return safeValue.map((val, index) => {
          const newPath = path ? `${path}.[${index}]` : `[${index}]`
          if (utils.circularReference?.has(val)) return `[[CIRCULAR_REFERENCE: ${newPath}]]`
          if (val instanceof Object) {
            utils.circularReference?.add(val)
            return utils.rewriteUnsupported(val, newPath)
          }
          return val
        })
      }
      return Object.fromEntries(Object.entries(safeValue).map(([key, val]) => {
        const newPath = path ? `${path}.${key}` : key
        if (utils.circularReference?.has(val)) return [key, `[[CIRCULAR_REFERENCE: ${newPath}]]`]
        if (val instanceof Object) utils.circularReference?.add(val)
        return [key, utils.rewriteUnsupported(val, path ? `${path}.${key}` : key)]
      }))
    },

    maybeSerialise: (value) => {
      utils.circularReference = null
      return utils.config.serialise ? JSON.stringify(value) : value
    },
  }

  return utils
}

export default transformUnsupported
