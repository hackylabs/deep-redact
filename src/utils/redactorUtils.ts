import {
  BaseDeepRedactConfig, BlacklistKeyConfig, RedactorUtils, RedactorUtilsConfig,
} from '../types'

const redactorUtils = (customConfig: RedactorUtilsConfig): RedactorUtils => {
  const defaultConfig: RedactorUtilsConfig = {
    stringTests: [],
    fuzzyKeyMatch: false,
    caseSensitiveKeyMatch: true,
    retainStructure: false,
    remove: false,
    replaceStringByLength: false,
    replacement: '[REDACTED]',
    types: ['string'],
  }

  const utils: RedactorUtils = {
    config: {
      ...defaultConfig,
      ...customConfig,
      blacklistedKeys: customConfig.blacklistedKeys ?? [],
      blacklistedKeysTransformed: customConfig.blacklistedKeys?.map((key) => {
        const isObject = !(typeof key === 'string' || key instanceof RegExp)
        const setKey = isObject ? key.key : key

        const fallback = {
          fuzzyKeyMatch: customConfig.fuzzyKeyMatch ?? defaultConfig.fuzzyKeyMatch,
          caseSensitiveKeyMatch: customConfig.caseSensitiveKeyMatch ?? defaultConfig.caseSensitiveKeyMatch,
          retainStructure: customConfig.retainStructure ?? defaultConfig.retainStructure,
          replacement: customConfig.replacement ?? defaultConfig.replacement,
          remove: customConfig.remove ?? defaultConfig.remove,
          key: setKey,
        }

        if (isObject) {
          return {
            fuzzyKeyMatch: key.fuzzyKeyMatch ?? fallback.fuzzyKeyMatch,
            caseSensitiveKeyMatch: key.caseSensitiveKeyMatch ?? fallback.caseSensitiveKeyMatch,
            retainStructure: key.retainStructure ?? fallback.retainStructure,
            replacement: key.replacement ?? fallback.replacement,
            remove: key.remove ?? fallback.remove,
            key: setKey,
          }
        }

        return fallback
      }) ?? [],
    } as Required<RedactorUtils['config']>,

    normaliseString: (str) => str.toLowerCase().replace(/\W/g, ''),

    complexKeyMatch: (key, blacklistKeyConfig) => {
      if (blacklistKeyConfig.key instanceof RegExp) return blacklistKeyConfig.key.test(key)
      if (blacklistKeyConfig.fuzzyKeyMatch && blacklistKeyConfig.caseSensitiveKeyMatch) return key.includes(blacklistKeyConfig.key)
      if (blacklistKeyConfig.fuzzyKeyMatch && !blacklistKeyConfig.caseSensitiveKeyMatch) return utils.normaliseString(key).includes(utils.normaliseString(blacklistKeyConfig.key))
      if (!blacklistKeyConfig.fuzzyKeyMatch && blacklistKeyConfig.caseSensitiveKeyMatch) return key === blacklistKeyConfig.key
      return utils.normaliseString(blacklistKeyConfig.key) === utils.normaliseString(key)
    },

    matchKeyByRootConfig: (key, blacklistedKey) => {
      return utils.complexKeyMatch(key, {
        key: blacklistedKey,
        fuzzyKeyMatch: utils.config.fuzzyKeyMatch,
        caseSensitiveKeyMatch: utils.config.caseSensitiveKeyMatch,
      })
    },

    getBlacklistedKeyConfig: (key) => {
      if (!key) return undefined
      return utils.config.blacklistedKeysTransformed?.find((redactableKey) => {
        return utils.complexKeyMatch(key, redactableKey)
      })
    },

    shouldRedactObjectValue: (key) => {
      if (!key) return false
      return utils.config.blacklistedKeysTransformed.some((redactableKey) => {
        return utils.complexKeyMatch(key, redactableKey)
      })
    },

    redactString: (value, replacement, remove, parentShouldRedact) => {
      if (!value) return value
      const { stringTests }: BaseDeepRedactConfig = utils.config
      if (!parentShouldRedact && !stringTests?.some((pattern) => pattern.test(value))) return value
      if (remove) return undefined
      if (typeof replacement === 'function') return replacement(value)
      if (utils.config.replaceStringByLength) return replacement.repeat(value.length)
      return replacement
    },

    getRecursionConfig: (key) => {
      const fallback = {
        remove: utils.config.remove,
        replacement: utils.config.replacement,
        retainStructure: utils.config.retainStructure,
      }
      if (!key) return fallback
      const blacklistedKeyConfig: Required<BlacklistKeyConfig> | undefined = utils.getBlacklistedKeyConfig(key)
      if (!blacklistedKeyConfig) return fallback
      return {
        remove: blacklistedKeyConfig.remove,
        replacement: blacklistedKeyConfig.replacement,
        retainStructure: blacklistedKeyConfig.retainStructure,
      }
    },

    redactPrimitive: (value, replacement, remove, shouldRedact = false) => {
      if (!utils.config.types.includes(typeof value)) return value
      if (remove && shouldRedact && typeof value !== 'string') return undefined
      if (typeof value === 'string') return utils.redactString(value, replacement, remove, shouldRedact)
      if (!shouldRedact) return value
      if (typeof replacement === 'function') return replacement(value)
      return replacement
    },

    redactArray: (value) => value.map((val) => utils.recurse(val)),

    redactObject: (value, key, parentShouldRedact = false) => {
      return Object.fromEntries(Object.entries(value).map(([prop, val]) => {
        const shouldRedact = parentShouldRedact || utils.shouldRedactObjectValue(prop)

        if (shouldRedact) {
          const { remove } = utils.getRecursionConfig(prop)
          if (remove) return []
        }

        return [prop, utils.recurse(val, key ?? prop, shouldRedact)]
      }).filter(([prop]) => prop !== undefined))
    },

    recurse: (value, key = null, parentShouldRedact = false) => {
      if (value === null) return value
      const { remove, replacement, retainStructure } = utils.getRecursionConfig(key)

      if (!(value instanceof Object)) return utils.redactPrimitive(value, replacement, remove, Boolean(key && parentShouldRedact))

      if (parentShouldRedact) {
        if (!retainStructure) {
          return typeof replacement === 'function'
            ? replacement(value)
            : replacement
        }
      }

      if (Array.isArray(value)) return utils.redactArray(value)

      return utils.redactObject(value, key, parentShouldRedact)
    },
  }

  return utils
}

export default redactorUtils
