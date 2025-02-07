import { bench, describe } from 'vitest'
import fastRedact from 'fast-redact'
import { obglob } from '@hackylabs/obglob'
import { DeepRedact } from '../../src'
import { dummyUser, dummyUserXml } from '../setup/dummyUser'
import { blacklistedKeys, complexBlacklistedKeys, fastRedactArrayBlacklistedKeys, fastRedactBlacklistedKeys, ObGlobPatterns, stringPattern, xmlPattern } from '../setup/blacklist'

const jsonStringifyLargeObject = JSON.stringify(dummyUser)
const jsonStringify1000LargeObjects = JSON.stringify(Array(1000).fill(dummyUser))

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
      const redact = fastRedact({ paths: fastRedactBlacklistedKeys })
      resolve(redact(dummyUser))
    })
  })

  bench('fast redact, 1000 large objects', async () => {
    await new Promise((resolve) => {
      const redact = fastRedact({ paths: fastRedactArrayBlacklistedKeys })
      resolve(redact(Array(1000).fill(dummyUser)))
    })
  })

  bench('ObGlob, large object', async () => {
    await new Promise((resolve) => {
      resolve(obglob(dummyUser, { patterns: ObGlobPatterns, includeUnmatched: true, callback: () => '[REDACTED]' }))
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
      const redaction = new DeepRedact({ blacklistedKeys })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('ObGlob, 1000 large objects', async () => {
    await new Promise((resolve) => {
      resolve(obglob(Array(1000).fill(dummyUser), { patterns: ObGlobPatterns, includeUnmatched: true, callback: () => '[REDACTED]' }))
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
      const redaction = new DeepRedact({ blacklistedKeys })
      resolve(redaction.redact(Array(1000).fill(dummyUser)))
    })
  })

  bench('DeepRedact, config per key, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys: complexBlacklistedKeys })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, fuzzy matching, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, fuzzyKeyMatch: true })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, case insensitive matching, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, caseSensitiveKeyMatch: false })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, fuzzy and case insensitive matching, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, fuzzyKeyMatch: true, caseSensitiveKeyMatch: false })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, replace string by length, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, replaceStringByLength: true, replacement: '*' })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, custom replacer function, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, replacement: ((value) => `[REDACTED:${typeof value}]`) })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, retain structure, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, retainStructure: true })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, remove item, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys, remove: true })
      resolve(redaction.redact(dummyUser))
    })
  })

  bench('DeepRedact, partial redaction', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({
        partialStringTests: [
          {
            pattern: xmlPattern,
            replacer: (value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'),
          },
        ],
      })
      resolve(redaction.redact(dummyUserXml))
    })
  })

  bench('DeepRedact, partial redaction large string', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({
        partialStringTests: [
          {
            pattern: xmlPattern,
            replacer: (value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'),
          },
        ],
      })
      resolve(redaction.redact(dummyUserXml.repeat(1000)))
    })
  })
})
