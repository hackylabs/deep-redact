import { describe, it, expect } from 'vitest'
import {
  type IHeapSnapshot, type Nullable, config, takeNodeMinimalHeap,
} from '@memlab/core'
import { DeepRedact } from '../src'
import { dummyUser } from './setup/dummyUser'
import { blacklistedKeys } from './setup/blacklist'

describe('DeepRedact', () => {
  describe('code coverage', () => {
    it('should deep redact an object', () => {
      const redaction = new DeepRedact({
        blacklistedKeys: ['password'],
        replacement: '*',
        replaceStringByLength: true,
        serialise: false,
      })
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
        password: '********',
        nested: {
          userid: 'USERID',
          password: '********',
        },
      })
    })

    it('should deep redact an array of objects', () => {
      const redaction = new DeepRedact({ blacklistedKeys: ['password'], serialise: false })
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
      const redaction = new DeepRedact({ stringTests: [/\d{13,16}/], serialise: false })

      expect(redaction.redact('1234567890123456')).toBe('[REDACTED]')
    })

    it('should redact a string by length', () => {
      const redaction = new DeepRedact({
        stringTests: [/\d{13,16}/],
        replaceStringByLength: true,
        replacement: '*',
        serialise: false,
      })

      expect(redaction.redact('1234567890123456')).toBe('****************')
    })

    it('should redact multiple types', () => {
      const redaction = new DeepRedact({
        types: ['string', 'number', 'boolean', 'bigint', 'object', 'bigint'],
        blacklistedKeys: ['password', 'age', 'isAdult', 'bigInt', 'symbol', 'func'],
      })
      const obj = {
        age: 20,
        isAdult: true,
        timestamp: 1234567890,
        bigInt: BigInt(10),
        otherBigInt: BigInt(20),
        symbol: Symbol('symbol'),
        undef: undefined,
        func: () => 'secret',
        asyncFunc: async () => 'secret',
        error: new Error('Oops'),
        regex: /foo/,
        date: new Date('2021-01-01T00:00:00.000Z'),
        obj: {
          password: 'PASSWORD',
          userid: 'USERID',
        },
      }

      expect(JSON.parse(String(redaction.redact(obj)))).toEqual({
        age: '[REDACTED]',
        isAdult: '[REDACTED]',
        timestamp: 1234567890,
        bigInt: '[REDACTED]',
        otherBigInt: { __unsupported: { type: 'bigint', value: '20', radix: 10 } },
        func: '[REDACTED]',
        asyncFunc: {},
        error: {
          __unsupported: {
            type: 'error',
            name: 'Error',
            message: 'Oops',
            stack: expect.stringMatching(/^Error: Oops/),
          },
        },
        regex: {
          __unsupported: {
            type: 'regexp',
            source: 'foo',
            flags: '',
          },
        },
        date: '2021-01-01T00:00:00.000Z',
        obj: {
          password: '[REDACTED]',
          userid: 'USERID',
        },
      })
    })

    it('should redact an object using regex key matching', () => {
      const redaction = new DeepRedact({ blacklistedKeys: [{ key: /pass/gi }], serialise: false })
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

    it('should redact an object of strings with case insensitive and fuzzy matching', () => {
      const redaction = new DeepRedact({
        blacklistedKeys: [{
          key: 'pass',
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: false,
        }],
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: true,
        serialise: false,
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
      const redaction = new DeepRedact({
        blacklistedKeys: [{ key: 'pass', fuzzyKeyMatch: true, caseSensitiveKeyMatch: true }],
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: false,
        serialise: false,
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
      const redaction = new DeepRedact({
        blacklistedKeys: [{
          key: 'password',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
        }],
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: false,
        serialise: false,
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
      const redaction = new DeepRedact({
        blacklistedKeys: [{
          key: 'password',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: false,
        }],
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: true,
        serialise: false,
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
      const redaction = new DeepRedact({ blacklistedKeys: ['password', 'secret'], serialise: false })
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
      const redaction = new DeepRedact({
        blacklistedKeys: ['password', 'secret'],
        retainStructure: true,
        serialise: false,
      })
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
      const redaction = new DeepRedact({
        blacklistedKeys: ['accountBalance', 'secret'],
        types: ['string', 'number'],
        retainStructure: true,
        remove: true,
        serialise: false,
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
      const redaction = new DeepRedact({ stringTests: [/\d{13,16}/], remove: true, serialise: false })
      expect(redaction.redact('1234567890123456')).toBe(undefined)
    })

    it('should safely redact an object with circular references', () => {
      const redaction = new DeepRedact({ blacklistedKeys: ['password'], serialise: false })
      const obj = { password: 'PASSWORD', deep: { nested: {} } }
      obj.deep.nested = obj.deep
      const redacted = redaction.redact(obj)
      expect(redacted).toEqual({
        password: '[REDACTED]',
        deep: {
          nested: '[[CIRCULAR_REFERENCE: deep.nested]]',
        },
      })
    })

    it('should safely redact an array with circular references', () => {
      const redaction = new DeepRedact({ blacklistedKeys: ['password'], serialise: false })
      const arr = [{ password: 'PASSWORD', deep: { } }, 'foo']
      // @ts-expect-error - we are testing circular references
      arr[0].deep.nested = arr
      const redacted = redaction.redact(arr)
      expect(redacted).toEqual([
        {
          password: '[REDACTED]',
          deep: {
            nested: [
              '[[CIRCULAR_REFERENCE: [0].deep.nested.[0]]]',
              'foo',
            ],
          },
        },
        'foo',
      ])
    })

    it('should not redact null', () => {
      const redaction = new DeepRedact({ types: ['object'], serialise: false })
      const obj = {
        user: 'USERID',
        other: null,
      }

      expect(redaction.redact(obj)).toEqual(obj)
    })

    it('should support custom transformer for unsupported types', () => {
      const redaction = new DeepRedact({
        blacklistedKeys: ['password'],
        serialise: false,
      })
      redaction.setUnsupportedTransformer((val) => {
        if (val instanceof Error) return { message: val.message }
        if (typeof val === 'number') return val / 2
        return val
      })
      const obj = {
        error: new Error('Oops'),
        password: 'PASSWORD',
        age: 40,
      }

      expect(redaction.redact(obj)).toEqual({
        age: 20,
        error: { message: 'Oops' },
        password: '[REDACTED]',
      })
    })
  })

  describe('performance', () => {
    it('should not leak memory', async () => {
      config.muteConsole = true

      let redaction: Nullable<DeepRedact> = new DeepRedact({
        blacklistedKeys,
        retainStructure: true,
        fuzzyKeyMatch: false,
        caseSensitiveKeyMatch: true,
        replaceStringByLength: true,
        replacement: '*',
      })

      let heap: IHeapSnapshot = await takeNodeMinimalHeap()

      redaction.redact(Array(1000).fill(dummyUser))

      expect(heap.hasObjectWithClassName('DeepRedact')).toBe(true)

      redaction = null

      heap = await takeNodeMinimalHeap()

      expect(heap.hasObjectWithClassName('DeepRedact')).toBe(false)
    })
  })
})
