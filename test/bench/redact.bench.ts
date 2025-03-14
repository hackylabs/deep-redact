import { bench, describe } from 'vitest'
import fastRedact from 'fast-redact'
import superjson from 'superjson'
import { obglob } from '@hackylabs/obglob'
import { DeepRedact } from '../../src'
import { dummyUser, dummyUserXml } from '../setup/dummyUser'
import { blacklistedKeys } from '../setup/blacklist'

const complexBlacklistedKeys = [
  'email',
  'phone',
  'password',
  'birthDate',
  'ip',
  'macAddress',
  { key: 'address', retainStructure: true },
  'iban',
  'cardNumber',
  'wallet',
  'ein',
  'ssn',
  { key: 'name', fuzzyKeyMatch: true, caseSensitiveKeyMatch: false },
]

const fastRedactBlacklistedKeys = [
  'firstName',
  'lastName',
  'maidenName',
  'email',
  'phone',
  'password',
  'birthDate',
  'ip',
  'macAddress',
  'address.street',
  'address.city',
  'address.state',
  'address.postalCode',
  'address.country',
  'address.coordinates.lat',
  'address.coordinates.lng',
  'bank.cardNumber',
  'bank.iban',
  'wallet',
  'company.address.street',
  'company.address.city',
  'company.address.state',
  'company.address.postalCode',
  'company.address.country',
  'company.address.coordinates.lat',
  'company.address.coordinates.lng',
  'ein',
  'ssn',
]

const fastRedactArrayBlacklistedKeys = fastRedactBlacklistedKeys.map((key) => `*.${key}`)

const ObGlobPatterns = [
  '**/!(*user*)*[nN]ame*',
  '**/email',
  '**/phone',
  '**/password',
  '**/birthDate',
  '**/ip',
  '**/macAddress',
  '**/address/**',
  '**/cardNumber',
  '**/iban',
  '**/wallet',
  '**/ein',
  '**/ssn',
]

const stringPattern = /"(email|phone|password|birthDate|ip|macAddress|address.*?city|state|postalCode|country|iban|cardNumber|wallet|ein|ssn|firstName|lastName|maidenName|username)":"[^"]*"/gi

const xmlPattern = /<(email|phone|password|birthDate|ip|macAddress|address.*?city|state|postalCode|country|iban|cardNumber|wallet|ein|ssn|firstName|lastName|maidenName|username)>([^<]+)<\/\1>/gi

describe('Redaction benchmark', () => {
  bench('JSON.stringify, large object', async () => {
    await new Promise((resolve) => {
      resolve(JSON.stringify(dummyUser))
    })
  })

  bench('JSON.stringify, 1000 large objects', async () => {
    await new Promise((resolve) => {
      resolve(JSON.stringify(Array(1000).fill(dummyUser)))
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

  bench('Regex replace, large object', async () => {
    await new Promise((resolve) => {
      const redacted = superjson.stringify(dummyUser).replace(stringPattern, '"$1":"[REDACTED]"')
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

  bench('Regex replace, 1000 large objects', async () => {
    await new Promise((resolve) => {
      const redacted = superjson.stringify(Array(1000).fill(dummyUser)).replace(stringPattern, '"$1":"[REDACTED]"')
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
