import {
  describe, it, expect, beforeEach, vi, MockInstance,
} from 'vitest'
import transformUnsupported from '../../src/utils/transformUnsupported'
import { TransformerUtils } from '../../src/types'

describe('transformUnsupported', () => {
  let utils: TransformerUtils

  beforeEach(() => {
    utils = transformUnsupported({})
  })

  describe('config', () => {
    describe('when no custom config is provided', () => {
      it('should use the default config', () => {
        expect(utils.config).toEqual({
          serialise: true,
        })
      })
    })

    describe('when custom config is provided', () => {
      describe('serialise', () => {
        describe('when serialise is set to false', () => {
          beforeEach(() => {
            utils = transformUnsupported({ serialise: false })
          })

          it('should use the custom config', () => {
            expect(utils.config).toEqual({
              serialise: false,
            })
          })
        })

        describe('when serialise is set to true', () => {
          beforeEach(() => {
            utils = transformUnsupported({ serialise: true })
          })

          it('should use the custom config', () => {
            expect(utils.config).toEqual({
              serialise: true,
            })
          })
        })
      })

      describe('unsupportedTransformer', () => {
        const customUnsupportedTransformer = vi.fn()

        beforeEach(() => {
          utils = transformUnsupported({ unsupportedTransformer: customUnsupportedTransformer })
        })

        it('should use the custom config', () => {
          expect(utils.config).toEqual({
            serialise: true,
            unsupportedTransformer: customUnsupportedTransformer,
          })
        })
      })
    })
  })

  describe('unsupportedTransformer', () => {
    describe('when serialise is set to false', () => {
      beforeEach(() => {
        utils = transformUnsupported({ serialise: false })
      })

      it('should return the value as is', () => {
        expect(utils.unsupportedTransformer(BigInt(123))).toBe(BigInt(123))
      })
    })

    describe('when serialise is set to true', () => {
      describe('when the value is a bigint', () => {
        it('should return the value as an object', () => {
          expect(utils.unsupportedTransformer(BigInt(123))).toEqual({
            __unsupported: {
              type: 'bigint',
              value: '123',
              radix: 10,
            },
          })
        })
      })

      describe('when the value is an error', () => {
        it('should return the value as an object', () => {
          const error = new Error('test error')

          expect(utils.unsupportedTransformer(error)).toEqual({
            __unsupported: {
              type: 'error',
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          })
        })
      })

      describe('when the value is a regexp', () => {
        it('should return the value as an object', () => {
          const regexp = /test/g

          expect(utils.unsupportedTransformer(regexp)).toEqual({
            __unsupported: {
              type: 'regexp',
              source: regexp.source,
              flags: regexp.flags,
            },
          })
        })
      })

      describe('when the value is a date', () => {
        it('should return the value as an ISO string', () => {
          const date = new Date()

          expect(utils.unsupportedTransformer(date)).toBe(date.toISOString())
        })
      })

      describe('when the value is not a bigint, error, regexp or date', () => {
        it('should return the value as is', () => {
          expect(utils.unsupportedTransformer('test')).toBe('test')
        })
      })
    })
  })

  describe('getUnsupportedTransformer', () => {
    describe('when custom unsupportedTransformer is provided', () => {
      const customUnsupportedTransformer = vi.fn()

      beforeEach(() => {
        utils = transformUnsupported({ unsupportedTransformer: customUnsupportedTransformer })
      })

      it('should return the custom unsupportedTransformer', () => {
        expect(utils.getUnsupportedTransformer()).toBe(customUnsupportedTransformer)
      })
    })

    describe('when custom unsupportedTransformer is not provided', () => {
      it('should return the default unsupportedTransformer', () => {
        expect(utils.getUnsupportedTransformer()).toBe(utils.unsupportedTransformer)
      })
    })
  })

  describe('rewriteUnsupported', () => {
    let getUnsupportedTransformerSpy: MockInstance<typeof utils.getUnsupportedTransformer>

    beforeEach(() => {
      utils = transformUnsupported({ serialise: true })
      getUnsupportedTransformerSpy = vi.spyOn(utils, 'getUnsupportedTransformer')
    })

    describe('when the value is a bigint', () => {
      const value = BigInt(123)

      it('should call getUnsupportedTransformer', () => {
        utils.rewriteUnsupported(value)
        expect(getUnsupportedTransformerSpy).toHaveBeenCalled()
      })

      it('should return the value as an object', () => {
        expect(utils.rewriteUnsupported(value)).toEqual({
          __unsupported: {
            type: 'bigint',
            value: '123',
            radix: 10,
          },
        })
      })
    })

    describe('when the value is an error', () => {
      const error = new Error('test error')

      it('should call getUnsupportedTransformer', () => {
        utils.rewriteUnsupported(error)
        expect(getUnsupportedTransformerSpy).toHaveBeenCalled()
      })

      it('should return the value as an object', () => {
        expect(utils.rewriteUnsupported(error)).toEqual({
          __unsupported: {
            type: 'error',
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        })
      })
    })

    describe('when the value is a regexp', () => {
      const regexp = /test/g

      it('should call getUnsupportedTransformer', () => {
        utils.rewriteUnsupported(regexp)
        expect(getUnsupportedTransformerSpy).toHaveBeenCalled()
      })

      it('should return the value as an object', () => {
        expect(utils.rewriteUnsupported(regexp)).toEqual({
          __unsupported: {
            type: 'regexp',
            source: regexp.source,
            flags: regexp.flags,
          },
        })
      })
    })

    describe('when the value is a date', () => {
      const date = new Date()

      it('should call getUnsupportedTransformer', () => {
        utils.rewriteUnsupported(date)
        expect(getUnsupportedTransformerSpy).toHaveBeenCalled()
      })

      it('should return the value as an ISO string', () => {
        expect(utils.rewriteUnsupported(date)).toBe(date.toISOString())
      })
    })

    describe('when the value is not a bigint, error, regexp or date', () => {
      it('should return the value as is', () => {
        expect(utils.rewriteUnsupported('test')).toBe('test')
      })
    })

    describe('when the value has circular references', () => {
      describe('when the value is an object', () => {
        let result: unknown
        const obj = { foo: 'bar' }
        // @ts-expect-error - we're testing circular references here
        obj.circularReference = obj

        beforeEach(() => {
          result = utils.rewriteUnsupported(obj)
        })

        it('should return the value with circular references replaced with a string', () => {
          expect(result).toEqual({
            foo: 'bar',
            circularReference: {
              foo: 'bar',
              circularReference: '[[CIRCULAR_REFERENCE: circularReference.circularReference]]',
            },
          })
        })

        it('should set the circularReference property to a WeakSet', () => {
          expect(utils.circularReference).toBeInstanceOf(WeakSet)
        })
      })

      describe('when the value is an array', () => {
        let result: unknown
        const arr = ['foo']
        // @ts-expect-error - we're testing circular references here
        arr.push(arr)

        beforeEach(() => {
          result = utils.rewriteUnsupported(arr)
        })

        it('should return the value with circular references replaced with a string', () => {
          expect(result).toEqual(['foo', ['foo', '[[CIRCULAR_REFERENCE: [1].[1]]]']])
        })

        it('should set the circularReference property to a WeakSet', () => {
          expect(utils.circularReference).toBeInstanceOf(WeakSet)
        })
      })

      describe('when the value is not an object or an array', () => {
        let result: unknown
        const value = 'foo'

        beforeEach(() => {
          result = utils.rewriteUnsupported(value)
        })

        it('should return the value as is', () => {
          expect(result).toEqual('foo')
        })

        it('should not set the circularReference property', () => {
          expect(utils.circularReference).toBeNull()
        })
      })
    })
  })

  describe('maybeSerialise', () => {
    describe('always', () => {
      it('should reset circularReference to null', () => {
        utils.circularReference = new WeakSet()
        utils.maybeSerialise('test')
        expect(utils.circularReference).toBeNull()
      })
    })

    describe('result', () => {
      const value = { foo: 'bar' }

      describe('serialise is set to false', () => {
        beforeEach(() => {
          utils = transformUnsupported({ serialise: false })
        })

        it('should return the value as is', () => {
          expect(utils.maybeSerialise(value)).toBe(value)
        })
      })

      describe('serialise is set to true', () => {
        it('should return the value as a string', () => {
          expect(utils.maybeSerialise(value)).toBe(JSON.stringify(value))
        })
      })
    })
  })
})
