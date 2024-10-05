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
      const deepRedactConfig: Required<Omit<BaseDeepRedactConfig, 'serialise' | 'serialize'>> = {
        blacklistedKeys,
        blacklistedKeysTransformed: [],
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
          expect(DeepRedact.unsupportedTransformer(10)).toBe(10)
        })
      })

      describe('serialise is true', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
        })

        it('should transform a huge bigint', () => {
          expect(DeepRedact.unsupportedTransformer(BigInt(Number.MAX_SAFE_INTEGER + 1))).toEqual({
            __unsupported: {
              type: 'bigint',
              value: '9007199254740992',
              radix: 10,
            },
          })
        })

        it('should transform a huge (negative) bigint', () => {
          expect(DeepRedact.unsupportedTransformer(BigInt(Number.MIN_SAFE_INTEGER - 1))).toEqual({
            __unsupported: {
              type: 'bigint',
              value: '-9007199254740992',
              radix: 10,
            },
          })
        })

        it('should transform an error', () => {
          const error = new Error('Test Error')

          expect(DeepRedact.unsupportedTransformer(error)).toEqual({
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

          expect(DeepRedact.unsupportedTransformer(regexp)).toEqual({
            __unsupported: {
              type: 'regexp',
              source: regexp.source,
              flags: regexp.flags,
            },
          })
        })

        it('should transform a date', () => {
          const date = new Date()

          expect(DeepRedact.unsupportedTransformer(date)).toBe(date.toISOString())
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

      it('should return the value', () => {
        deepRedact = new DeepRedact({ blacklistedKeys, serialise: false })
        expect(deepRedact.maybeSerialise({ a: 1 })).toEqual({ a: 1 })
      })

      it('should return a string', () => {
        deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
        expect(deepRedact.maybeSerialise({ a: 1 })).toEqual('{"a":1}')
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
