import { bench, describe } from 'vitest'
import fastRedact from 'fast-redact'
import { obglob } from '@hackylabs/obglob'
import { DeepRedact } from '../../src'
import { dummyUser, dummyUserXml } from '../setup/dummyUser'
import { blacklistedKeys, complexBlacklistedKeys, fastRedactArrayBlacklistedKeys, fastRedactBlacklistedKeys, ObGlobPatterns, stringPattern, xmlPattern } from '../setup/blacklist'

const jsonStringifyLargeObject = JSON.stringify(dummyUser)
const jsonStringify1000LargeObjects = JSON.stringify(Array(1000).fill(dummyUser))

const redactionConfigs = {
  fastRedact: fastRedact({ paths: fastRedactBlacklistedKeys }),
  fastRedactArray: fastRedact({ paths: fastRedactArrayBlacklistedKeys }),
  obglob: (data) => obglob(data, { patterns: ObGlobPatterns, includeUnmatched: true, callback: () => '[REDACTED]' }),
  deepRedactDefaultConfig: new DeepRedact({ blacklistedKeys }),
  deepRedactConfigPerKey: new DeepRedact({ blacklistedKeys: complexBlacklistedKeys }),
  deepRedactFuzzyMatching: new DeepRedact({ blacklistedKeys, fuzzyKeyMatch: true }),
  deepRedactCaseInsensitiveMatching: new DeepRedact({ blacklistedKeys, caseSensitiveKeyMatch: false }),
  deepRedactFuzzyAndCaseInsensitiveMatching: new DeepRedact({ blacklistedKeys, fuzzyKeyMatch: true, caseSensitiveKeyMatch: false }),
  deepRedactReplaceStringByLength: new DeepRedact({ blacklistedKeys, replaceStringByLength: true, replacement: '*' }),
  deepRedactCustomReplacerFunction: new DeepRedact({ blacklistedKeys, replacement: ((value) => `[REDACTED:${typeof value}]`) }),
  deepRedactRetainStructure: new DeepRedact({ blacklistedKeys, retainStructure: true }),
  deepRedactRemoveItem: new DeepRedact({ blacklistedKeys, remove: true }),
  deepRedactPartialRedaction: new DeepRedact({
    partialStringTests: [
      {
        pattern: xmlPattern,
        replacer: (value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'),
      },
    ],
  }),
}

describe('Redaction benchmark', () => {
  bench('JSON.stringify, large object', async () => {
    await new Promise((resolve) => {
      resolve(jsonStringifyLargeObject)
    })
  })

  bench('JSON.stringify, 1000 large objects', async () => {
    await new Promise((resolve) => {
      resolve(jsonStringify1000LargeObjects)
    })
  })

  bench('fast redact, large object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.fastRedact(dummyUser))
    })
  })

  bench('fast redact, 1000 large objects', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.fastRedactArray(Array(1000).fill(dummyUser)))
    })
  })

  bench('ObGlob, large object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.obglob(dummyUser))
    })
  })

  bench('Regex replace, pre-serialised large object', async () => {
    await new Promise((resolve) => {
      const redacted = jsonStringifyLargeObject.replace(stringPattern, '"$1":"[REDACTED]"')
      resolve(redacted)
    })
  })

  bench('Regex replace, large object', async () => {
    await new Promise((resolve) => {
      const redacted = JSON.stringify(dummyUser).replace(stringPattern, '"$1":"[REDACTED]"')
      resolve(redacted)
    })
  })

  bench('DeepRedact, default config, large object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactDefaultConfig.redact(dummyUser))
    })
  })

  bench('ObGlob, 1000 large objects', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.obglob(Array(1000).fill(dummyUser)))
    })
  })

  bench('Regex replace, pre-serialised 1000 large objects', async () => {
    await new Promise((resolve) => {
      const redacted = jsonStringify1000LargeObjects.replace(stringPattern, '"$1":"[REDACTED]"')
      resolve(redacted)
    })
  })

  bench('Regex replace, 1000 large objects', async () => {
    await new Promise((resolve) => {
      const redacted = JSON.stringify(Array(1000).fill(dummyUser)).replace(stringPattern, '"$1":"[REDACTED]"')
      resolve(redacted)
    })
  })

  bench('DeepRedact, default config, 1000 large objects', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactDefaultConfig.redact(Array(1000).fill(dummyUser)))
    })
  })

  bench('DeepRedact, config per key, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactConfigPerKey.redact(dummyUser))
    })
  })

  bench('DeepRedact, fuzzy matching, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactFuzzyMatching.redact(dummyUser))
    })
  })

  bench('DeepRedact, case insensitive matching, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactCaseInsensitiveMatching.redact(dummyUser))
    })
  })

  bench('DeepRedact, fuzzy and case insensitive matching, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactFuzzyAndCaseInsensitiveMatching.redact(dummyUser))
    })
  })

  bench('DeepRedact, replace string by length, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactReplaceStringByLength.redact(dummyUser))
    })
  })

  bench('DeepRedact, custom replacer function, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactCustomReplacerFunction.redact(dummyUser))
    })
  })

  bench('DeepRedact, retain structure, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactRetainStructure.redact(dummyUser))
    })
  })

  bench('DeepRedact, remove item, single object', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactRemoveItem.redact(dummyUser))
    })
  })

  bench('DeepRedact, partial redaction', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactPartialRedaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, partial redaction large string', async () => {
    await new Promise((resolve) => {
      resolve(redactionConfigs.deepRedactPartialRedaction.redact(dummyUserXml.repeat(1000)))
    })
  })
})
