import {
  describe, it, expect, beforeEach, afterEach, vi, MockInstance,
} from 'vitest'
import {
  type IHeapSnapshot, type Nullable, config, takeNodeMinimalHeap,
} from '@memlab/core'
import { DeepRedact } from '../../src'
import { dummyUser } from '../setup/dummyUser'
import { blacklistedKeys } from '../setup/blacklist'
import RedactorUtils from '../../src/utils/redactorUtils'
import { BaseDeepRedactConfig } from '../../src/types'

describe('DeepRedact', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe.skip('performance', () => {
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

  describe('code coverage', () => {
    beforeEach(async () => {
      vi.spyOn(JSON, 'stringify')

      vi.mock('./utils/redactorUtils', () => {
        return {
          default: () => RedactorUtils,
        }
      })
    })

    describe('constructor', () => {
      let deepRedact: DeepRedact
      const replacer = vi.fn((value: string) => value)
      const deepRedactConfig: Required<Omit<BaseDeepRedactConfig, 'serialise' | 'serialize'>> = {
        blacklistedKeys,
        blacklistedKeysTransformed: [],
        partialStringTests: [{ pattern: /test/, replacer }],
        stringTests: [/^test$/],
        retainStructure: true,
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: false,
        replaceStringByLength: true,
        replacement: '*',
        remove: true,
        types: ['string', 'number'],
      }

      beforeEach(() => {
        deepRedact = new DeepRedact({ ...deepRedactConfig, serialise: true })
      })

      describe('redactorUtils', () => {
        it('should should setup the redactorUtils', () => {
          expect(deepRedact.redactorUtils).toBeInstanceOf(RedactorUtils)
          expect(deepRedact.redactorUtils.config).toEqual({
            ...deepRedactConfig,
            blacklistedKeysTransformed: expect.arrayContaining([{
              key: expect.any(String),
              fuzzyKeyMatch: true,
              caseSensitiveKeyMatch: false,
              remove: true,
              replacement: '*',
              retainStructure: true,
            }]),
          })
        })
      })

      describe('serialise', () => {
        it('should setup the config', () => {
          expect(deepRedact.config).toEqual({
            serialise: true,
          })
        })
      })

      describe('serialise alias', () => {
        it('should setup the config', () => {
          deepRedact = new DeepRedact({ ...deepRedactConfig, serialize: true })
          expect(deepRedact.config).toEqual({
            serialise: true,
          })
        })
      })
    })

    describe('unsupportedTransformer', () => {
      let deepRedact: DeepRedact

      describe('serialise is false', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ blacklistedKeys, serialise: false })
        })

        it('should return the value', () => {
          expect(deepRedact.unsupportedTransformer(10)).toBe(10)
        })
      })

      describe('serialise is true', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
        })

        it('should transform a huge bigint', () => {
          expect(deepRedact.unsupportedTransformer(BigInt(Number.MAX_SAFE_INTEGER + 1))).toEqual({
            __unsupported: {
              type: 'bigint',
              value: '9007199254740992',
              radix: 10,
            },
          })
        })

        it('should transform a huge (negative) bigint', () => {
          expect(deepRedact.unsupportedTransformer(BigInt(Number.MIN_SAFE_INTEGER - 1))).toEqual({
            __unsupported: {
              type: 'bigint',
              value: '-9007199254740992',
              radix: 10,
            },
          })
        })

        it('should transform an error', () => {
          const error = new Error('Test Error')

          expect(deepRedact.unsupportedTransformer(error)).toEqual({
            __unsupported: {
              type: 'error',
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          })
        })

        it('should transform a regexp', () => {
          const regexp = new RegExp('test', 'g')

          expect(deepRedact.unsupportedTransformer(regexp)).toEqual({
            __unsupported: {
              type: 'regexp',
              source: regexp.source,
              flags: regexp.flags,
            },
          })
        })

        it('should transform a set', () => {
          const set = new Set([1, 2, 3])

          expect(deepRedact.unsupportedTransformer(set)).toEqual({
            __unsupported: {
              type: 'set',
              values: Array.from(set),
            },
          })
        })

        it('should transform a map', () => {
          const map = new Map([['a', 1], ['b', 2], ['c', 3]])

          expect(deepRedact.unsupportedTransformer(map)).toEqual({
            __unsupported: {
              type: 'map',
              entries: Object.fromEntries(map.entries()),
            },
          })
        })

        it('should transform a url', () => {
          const url = new URL('https://example.com')

          expect(deepRedact.unsupportedTransformer(url)).toBe(url.toString())
        })

        it('should transform a date', () => {
          const date = new Date()

          expect(deepRedact.unsupportedTransformer(date)).toBe(date.toISOString())
        })
      })

      describe('custom unsupportedTransformer', () => {
        let deepRedact: DeepRedact

        beforeEach(() => {
          class ExtendedDeepRedact extends DeepRedact {
            protected unsupportedTransformer = (value: unknown): unknown => {
              if (typeof value === 'bigint') return value.toString()
              if (value instanceof Error) return value.message
              if (value instanceof RegExp) return value.source
              if (value instanceof Set) return Array.from(value)
              if (value instanceof Map) return Object.fromEntries(value.entries())
              if (value instanceof URL) return value.toString()
              if (value instanceof Date) return value.toISOString()
              return value
            }
          }

          deepRedact = new ExtendedDeepRedact({ blacklistedKeys })
        })

        it('should transform a custom value', () => {
          expect(deepRedact.redact({
            password: 'password',
            bigint: BigInt(1234567890),
            error: new Error('error message'),
            regexp: /regexp/,
            set: new Set([1, 2, 3]),
            map: new Map([['a', 1], ['b', 2], ['c', 3]]),
            url: new URL('https://example.com'),
            date: new Date(),
            nested: {
              foo: 'bar',
            },
          })).toStrictEqual({
            password: '[REDACTED]',
            bigint: '1234567890',
            error: 'error message',
            regexp: 'regexp',
            set: [1, 2, 3],
            map: { a: 1, b: 2, c: 3 },
            url: 'https://example.com/',
            date: expect.any(String),
            nested: {
              foo: 'bar',
            },
          })
        })
      })
    })

    describe('rewriteUnsupported', () => {
      let deepRedact: DeepRedact

      beforeEach(() => {
        deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
      })

      describe('circular reference', () => {
        it('should return a string', () => {
          const obj = { a: 1 }
          obj.b = obj

          expect(deepRedact.rewriteUnsupported(obj)).toEqual({
            a: 1,
            b: {
              a: 1,
              b: '[[CIRCULAR_REFERENCE: b.b]]',
            },
          })
        })
      })

      describe('array', () => {
        it('should rewrite an array', () => {
          const obj = [1, 2, 3]

          expect(deepRedact.rewriteUnsupported(obj)).toEqual([1, 2, 3])
        })

        it('should rewrite an array with an object', () => {
          const obj = [1, { a: 1 }]

          expect(deepRedact.rewriteUnsupported(obj)).toEqual([1, { a: 1 }])
        })

        it('should rewrite an array with a circular reference', () => {
          const obj = [1]
          obj.push(obj)

          expect(deepRedact.rewriteUnsupported(obj)).toEqual([1, [1, '[[CIRCULAR_REFERENCE: [1].[1]]]']])
        })
      })

      describe('object', () => {
        it('should rewrite an object', () => {
          const obj = { a: 1, b: 2 }

          expect(deepRedact.rewriteUnsupported(obj)).toEqual({ a: 1, b: 2 })
        })

        it('should rewrite an object with an array', () => {
          const obj = { a: 1, b: [1, 2] }

          expect(deepRedact.rewriteUnsupported(obj)).toEqual({ a: 1, b: [1, 2] })
        })

        it('should rewrite an object with a circular reference', () => {
          const obj = { a: 1 }
          obj.b = obj

          expect(deepRedact.rewriteUnsupported(obj)).toEqual({
            a: 1,
            b: {
              a: 1,
              b: '[[CIRCULAR_REFERENCE: b.b]]',
            },
          })
        })
      })
    })

    describe('maybeSerialise', () => {
      let deepRedact: DeepRedact
      let partialStringRedactSpy: MockInstance<typeof RedactorUtils.prototype.partialStringRedact>

      describe('serialise is false', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ blacklistedKeys, serialise: false })
        })

        it('should return the value', () => {
          expect(deepRedact.maybeSerialise({ a: 1 })).toEqual({ a: 1 })
        })
      })

      describe('serialise is true', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({
            serialise: true,
            blacklistedKeys
          })
        })

        describe('value is not a string', () => {
          it('should return a string', () => {
            expect(deepRedact.maybeSerialise({ a: 'Hello, World! Foo Bar' })).toEqual('{"a":"Hello, World! Foo Bar"}')
          })

          it('should throw an error if the value cannot be serialised', () => {
            expect(() => deepRedact.maybeSerialise({ a: BigInt(1) })).toThrow('Failed to serialise value. Did you override the `unsupportedTransformer` method and return a value that is supported by JSON.stringify?')
          })
        })

        describe('value is a string', () => {
          it('should return a string', () => {
            expect(deepRedact.maybeSerialise('Hello, World! Foo Bar')).toEqual('Hello, World! Foo Bar')
          })
        })
      })
    })

    describe('redact', () => {
      let deepRedact: DeepRedact
      let maybeSerialiseSpy: MockInstance<typeof DeepRedact.prototype.maybeSerialise>
      let rewriteUnsupportedSpy: MockInstance<typeof DeepRedact.prototype.rewriteUnsupported>
      let recurseSpy: MockInstance<typeof RedactorUtils.prototype.recurse>

      beforeEach(() => {
        deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
        maybeSerialiseSpy = vi.spyOn(deepRedact, 'maybeSerialise')
        rewriteUnsupportedSpy = vi.spyOn(deepRedact, 'rewriteUnsupported')
        recurseSpy = vi.spyOn(deepRedact.redactorUtils, 'recurse')
        deepRedact.redact({ a: 1 })
      })

      it('should call rewriteUnsupported with the value', () => {
        expect(rewriteUnsupportedSpy).toHaveBeenNthCalledWith(1, { a: 1 })
      })

      it('should call recurse with the rewritten value', () => {
        expect(recurseSpy).toHaveBeenNthCalledWith(1, vi.mocked(rewriteUnsupportedSpy).mock.results[1].value)
      })

      it('should call maybeSerialise with the redacted value', () => {
        expect(maybeSerialiseSpy).toHaveBeenCalledOnce()
        expect(maybeSerialiseSpy).toHaveBeenNthCalledWith(1, vi.mocked(recurseSpy).mock.results[1].value)
      })
    })
  })
})
