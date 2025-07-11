import { bench, describe } from 'vitest'
import fastRedact from 'fast-redact'
import { obglob } from '@hackylabs/obglob'
import { DeepRedact } from '../../src'
import { dummyUser, dummyUserXml } from '../setup/dummyUser'
import { blacklistedKeys, complexBlacklistedKeys, fastRedactBlacklistedKeys, ObGlobPatterns, stringPattern, xmlPattern } from '../setup/blacklist'

const jsonStringifyLargeObject = () => JSON.stringify(dummyUser)

const redactionConfigs = {
  fastRedact: fastRedact({ paths: fastRedactBlacklistedKeys }),
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
    stringTests: [
      {
        pattern: xmlPattern,
        replacer: (value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'),
      },
    ],
  }),
}

describe('Redaction benchmark', () => {
  bench('JSON.stringify, large object', () => {
    jsonStringifyLargeObject()
  })

  bench('JSON.stringify, 1000 large objects', () => {
    for (let i = 0; i < 1000; i++) {
      jsonStringifyLargeObject()
    }
  })

  bench('fast redact, large object', () => {
    redactionConfigs.fastRedact({ dummyUser })
  })

  bench('fast redact, 1000 large objects', () => {
    for (let i = 0; i < 1000; i++) {
      redactionConfigs.fastRedact({ dummyUser })
    }
  })

  bench('ObGlob, large object', () => {
    redactionConfigs.obglob({ dummyUser })
  })

  bench('Regex replace, large object', () => {
    JSON.stringify({ dummyUser }).replace(stringPattern, '"$1":"[REDACTED]"')
  })

  bench('DeepRedact, default config, large object', () => {
    redactionConfigs.deepRedactDefaultConfig.redact({ dummyUser })
  })

  bench('ObGlob, 1000 large objects', () => {
    for (let i = 0; i < 1000; i++) {
      redactionConfigs.obglob({ dummyUser })
    }
  })

  bench('Regex replace, 1000 large objects', () => {
    for (let i = 0; i < 1000; i++) {
      JSON.stringify({ dummyUser }).replace(stringPattern, '"$1":"[REDACTED]"')
    }
  })

  bench('DeepRedact, default config, 1000 large objects', () => {
    for (let i = 0; i < 1000; i++) {
      redactionConfigs.deepRedactDefaultConfig.redact({ dummyUser })
    }
  })

  bench('DeepRedact, config per key, single object', () => {
    redactionConfigs.deepRedactConfigPerKey.redact({ dummyUser })
  })

  bench('DeepRedact, fuzzy matching, single object', () => {
    redactionConfigs.deepRedactFuzzyMatching.redact({ dummyUser })
  })

  bench('DeepRedact, case insensitive matching, single object', () => {
    redactionConfigs.deepRedactCaseInsensitiveMatching.redact({ dummyUser })
  })

  bench('DeepRedact, fuzzy and case insensitive matching, single object', () => {
    redactionConfigs.deepRedactFuzzyAndCaseInsensitiveMatching.redact({ dummyUser })
  })

  bench('DeepRedact, replace string by length, single object', () => {
    redactionConfigs.deepRedactReplaceStringByLength.redact({ dummyUser })
  })

  bench('DeepRedact, custom replacer function, single object', () => {
    redactionConfigs.deepRedactCustomReplacerFunction.redact({ dummyUser })
  })

  bench('DeepRedact, retain structure, single object', () => {
    redactionConfigs.deepRedactRetainStructure.redact({ dummyUser })
  })

  bench('DeepRedact, remove item, single object', () => {
    redactionConfigs.deepRedactRemoveItem.redact({ dummyUser })
  })

  bench('DeepRedact, partial redaction', () => {
    redactionConfigs.deepRedactPartialRedaction.redact({ dummyUser })
  })

  bench('DeepRedact, partial redaction large string', () => {
    for (let i = 0; i < 1000; i++) {
      redactionConfigs.deepRedactPartialRedaction.redact({ dummyUserXml })
    }
  })
})
