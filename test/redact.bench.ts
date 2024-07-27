import { bench, describe } from 'vitest'
import fastRedact from 'fast-redact'
import { DeepRedact } from '../src'
import { dummyUser } from './setup/dummyUser'
import { Blacklist, blacklistedKeys } from './setup/blacklist'

const complexBlacklistedKeys: Blacklist = [
  'email',
  'phone',
  'password',
  'birthDate',
  'ip',
  'macAddress',
  'wallet',
  { key: 'address', retainStructure: true },
  'iban',
  'cardNumber',
  'ein',
  'ssn',
  { key: 'name', fuzzyKeyMatch: true, caseSensitiveKeyMatch: false },
]

const fastRedactBlacklistedKeys = [
  'firstName',
  'lastName',
  'surname',
  'maidenName',
  'email',
  'phone',
  'password',
  'birthDate',
  'ip',
  'macAddress',
  'crypto.*.wallet',
  'address.*.*',
  'bank.cardNumber',
  'bank.iban',
  'company.address.*',
  'ein',
  'ssn',
]

const fastRedactArrayBlacklistedKeys = fastRedactBlacklistedKeys.map((key) => `*.${key}`)

describe('Redaction benchmark', () => {
  bench('JSON.stringify, single object', async () => {
    await new Promise((resolve) => {
      resolve(JSON.stringify(dummyUser))
    })
  })

  bench('JSON.stringify, 1000 objects', async () => {
    await new Promise((resolve) => {
      resolve(JSON.stringify(Array(1000).fill(dummyUser)))
    })
  })

  bench('fast redact, single object', async () => {
    await new Promise((resolve) => {
      const redact = fastRedact({ paths: fastRedactBlacklistedKeys })
      resolve(redact(dummyUser))
    })
  })

  bench('fast redact, 1000 objects', async () => {
    await new Promise((resolve) => {
      const redact = fastRedact({ paths: fastRedactArrayBlacklistedKeys })
      resolve(redact(Array(1000).fill(dummyUser)))
    })
  })

  bench('DeepRedact, default config, single object', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys })
      resolve(redaction.redact(dummyUser))
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

  bench('DeepRedact, default config, 1000 objects', async () => {
    await new Promise((resolve) => {
      const redaction = new DeepRedact({ blacklistedKeys })
      resolve(redaction.redact(Array(1000).fill(dummyUser)))
    })
  })
})
