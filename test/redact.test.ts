import {
  describe, it, expect, vi,
} from 'vitest'
import type { IHeapSnapshot, Nullable } from '@memlab/core'
import { config, takeNodeMinimalHeap } from '@memlab/core'
import { Redaction } from '../src'
import { dummyUser } from './setup/dummyUser'
import { blacklistedKeys } from './setup/blacklist'

describe('Redaction', () => {
  describe('code coverage', () => {
    it('should deep redact an object', () => {
      const redaction = new Redaction({ blacklistedKeys: ['password'] })
      const obj = {
        userid: 'USERID',
        password: 'PASSWORD',
        nested: {
          userid: 'USERID',
          password: 'PASSWORD',
        },
      }

      expect(redaction.redact(obj)).toEqual({
        userid: 'USERID',
        password: '[REDACTED]',
        nested: {
          userid: 'USERID',
          password: '[REDACTED]',
        },
      })
    })

    it('should deep redact an array of objects', () => {
      const redaction = new Redaction({ blacklistedKeys: ['password'] })
      const arr = Array.from({ length: 3 }, () => ({
        userid: 'USERID',
        password: 'PASSWORD',
        nested: {
          userid: 'USERID',
          password: 'PASSWORD',
        },
      }))

      expect(redaction.redact(arr)).toEqual(Array.from({ length: 3 }, () => ({
        userid: 'USERID',
        password: '[REDACTED]',
        nested: {
          userid: 'USERID',
          password: '[REDACTED]',
        },
      })))
    })

    it('should redact a string', () => {
      const redaction = new Redaction({ stringTests: [/\d{13,16}/] })

      expect(redaction.redact('1234567890123456')).toBe('[REDACTED]')
    })

    it('should redact a string by length', () => {
      const redaction = new Redaction({ stringTests: [/\d{13,16}/], replaceStringByLength: true, replacement: '*' })

      expect(redaction.redact('1234567890123456')).toBe('****************')
    })

    it('should redact multiple types', () => {
      const redaction = new Redaction({
        types: ['string', 'number', 'boolean', 'bigint', 'object'],
        blacklistedKeys: ['password', 'age', 'isAdult', 'bigInt', 'symbol', 'undef', 'func'],
      })
      const obj = {
        age: 20,
        isAdult: true,
        timestamp: 1234567890,
        bigInt: BigInt(10),
        symbol: Symbol('symbol'),
        undef: undefined,
        func: () => 'secret',
        asyncFunc: async () => 'secret',
        obj: {
          password: 'PASSWORD',
          userid: 'USERID',
        },
      }

      expect(redaction.redact(obj)).toEqual({
        age: '[REDACTED]',
        isAdult: '[REDACTED]',
        timestamp: 1234567890,
        bigInt: '[REDACTED]',
        symbol: expect.any(Symbol),
        undef: undefined,
        func: expect.any(Function),
        asyncFunc: expect.any(Function),
        obj: {
          password: '[REDACTED]',
          userid: 'USERID',
        },
      })
    })

    it('should redact an object of strings with case insensitive and fuzzy matching', () => {
      const redaction = new Redaction({
        blacklistedKeys: [{
          key: 'pass',
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: false,
        }],
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: true,
      })
      const obj = {
        user: 'USERID',
        PASSWORD: 'PASSWORD',
        nested: {
          user: 'USERID',
          PASSWORD: 'PASSWORD',
        },
      }

      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
        PASSWORD: '[REDACTED]',
        nested: {
          user: 'USERID',
          PASSWORD: '[REDACTED]',
        },
      })
    })

    it('should redact an object of strings with fuzzy case sensitive matching', () => {
      const redaction = new Redaction({
        blacklistedKeys: [{ key: 'pass', fuzzyKeyMatch: true, caseSensitiveKeyMatch: true }],
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: false,
      })
      const obj = {
        user: 'USERID',
        password: 'PASSWORD',
        nested: {
          user: 'USERID',
          password: 'PASSWORD',
        },
      }

      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
        password: '[REDACTED]',
        nested: {
          user: 'USERID',
          password: '[REDACTED]',
        },
      })
    })

    it('should redact an object of strings with case sensitive non-fuzzy matching', () => {
      const redaction = new Redaction({
        blacklistedKeys: [{
          key: 'password',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
        }],
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: false,
      })
      const obj = {
        user: 'USERID',
        password: 'PASSWORD',
        nested: {
          user: 'USERID',
          password: 'PASSWORD',
        },
      }

      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
        password: '[REDACTED]',
        nested: {
          user: 'USERID',
          password: '[REDACTED]',
        },
      })
    })

    it('should redact an object of strings with case insensitive non-fuzzy matching', () => {
      const redaction = new Redaction({
        blacklistedKeys: [{
          key: 'password',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: false,
        }],
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: true,
      })
      const obj = {
        user: 'USERID',
        PASSWORD: 'PASSWORD',
        nested: {
          user: 'USERID',
          PASSWORD: 'PASSWORD',
        },
      }

      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
        PASSWORD: '[REDACTED]',
        nested: {
          user: 'USERID',
          PASSWORD: '[REDACTED]',
        },
      })
    })

    it('should not retain the structure of the object', () => {
      const redaction = new Redaction({ blacklistedKeys: ['password', 'secret'] })
      const obj = {
        user: 'USERID',
        password: 'PASSWORD',
        secret: {
          user: 'USERID',
          password: 'PASSWORD',
        },
      }
      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
        password: '[REDACTED]',
        secret: '[REDACTED]',
      })
    })

    it('should retain the structure of the object', () => {
      const redaction = new Redaction({ blacklistedKeys: ['password', 'secret'], retainStructure: true })
      const obj = {
        user: 'USERID',
        password: 'PASSWORD',
        secret: {
          user: 'USERID',
          password: 'PASSWORD',
        },
      }
      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
        password: '[REDACTED]',
        secret: {
          user: '[REDACTED]',
          password: '[REDACTED]',
        },
      })
    })

    it('should remove identified items', () => {
      const redaction = new Redaction({
        blacklistedKeys: ['accountBalance', 'secret'],
        types: ['string', 'number'],
        retainStructure: true,
        remove: true,
      })
      const obj = {
        user: 'USERID',
        accountBalance: 100,
        secret: {
          foo: 'bar',
        },
      }
      expect(redaction.redact(obj)).toEqual({
        user: 'USERID',
      })
    })

    it('should remove identified string', () => {
      const redaction = new Redaction({ stringTests: [/\d{13,16}/], remove: true })
      expect(redaction.redact('1234567890123456')).toBe(undefined)
    })

    it('should not redact null', () => {
      const redaction = new Redaction({ types: ['object'] })
      const obj = {
        user: 'USERID',
        other: null,
      }

      expect(redaction.redact(obj)).toEqual(obj)
    })
  })

  describe('performance', () => {
    it('should not leak memory', async () => {
      config.muteConsole = true

      let redaction: Nullable<Redaction> = new Redaction({
        blacklistedKeys,
        retainStructure: true,
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: true,
        replaceStringByLength: true,
        replacement: '*',
      })

      let heap: IHeapSnapshot = await takeNodeMinimalHeap()

      redaction.redact(Array(1000).fill(dummyUser))

      expect(heap.hasObjectWithClassName('Redaction')).toBe(true)

      redaction = null

      heap = await takeNodeMinimalHeap()

      expect(heap.hasObjectWithClassName('Redaction')).toBe(false)
    })
  })
})
