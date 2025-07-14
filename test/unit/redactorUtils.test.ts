import {
  describe, it, expect, beforeEach, vi, MockInstance,
  afterEach,
} from 'vitest'
import RedactorUtils from '../../src/utils/'
import type { BlacklistKeyConfig, ComplexStringTest, Transformer } from '../../src/types'
import { standardTransformers } from '../../src/utils/standardTransformers'

describe('RedactorUtils', () => {
  let utils: RedactorUtils
  let result: unknown

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('config', () => {
    describe('when no custom config is provided', () => {
      beforeEach(() => {
        utils = new RedactorUtils({})
      })

      it('should use the default config', () => {
        // @ts-expect-error - config is private but we're testing it
        expect(utils.config).toEqual({
          blacklistedKeys: [],
          stringTests: [],
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
          retainStructure: false,
          remove: false,
          replaceStringByLength: false,
          replacement: '[REDACTED]',
          types: ['string'],
          transformers: standardTransformers,
        })
      })
    })

    describe('when a full custom config is provided', () => {
      let replacer: MockInstance<ComplexStringTest['replacer']>

      beforeEach(() => {
        replacer = vi.fn((value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]'))
        utils = new RedactorUtils({
          blacklistedKeys: ['a', /b/],
          stringTests: [/^Hello/, { pattern: /Foo/gi, replacer: replacer as unknown as ComplexStringTest['replacer'] }],
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: false,
          retainStructure: true,
          replacement: '[SECRET]',
          remove: true,
          replaceStringByLength: true,
          types: ['string', 'number'],
        })
      })

      it('should use the custom config', () => {
        // @ts-expect-error - config is private but we're testing it
        expect(utils.config).toEqual({
          blacklistedKeys: ['a', /b/],
          stringTests: [/^Hello/, { pattern: /Foo/gi, replacer: replacer as unknown as ComplexStringTest['replacer'] }],
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: false,
          retainStructure: true,
          replacement: '[SECRET]',
          remove: true,
          replaceStringByLength: true,
          types: ['string', 'number'],
          transformers: standardTransformers,
        })
      })
    })
  })

  describe('computedRegex', () => {
    beforeEach(() => {
      utils = new RedactorUtils({
        blacklistedKeys: ['a', 'b'],
      })
    })

    it('should return the correct regex', () => {
      // @ts-expect-error - computedRegex is private but we're testing it
      expect(utils.computedRegex).toEqual(/a|b/)
    })
  })

  describe('traverse', () => {
    describe('when the value is a string', () => {
      describe('with stringTests', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/^Hello/],
          })
          result = utils.traverse('Hello, world!')
        })

        it('should return the redacted value', () => {
          expect(result).toEqual('[REDACTED]')
        })
      })

      describe('with blacklistedKeys', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['Hello', /world/],
          })
          result = utils.traverse('Hello, world!')
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual('Hello, world!')
        })
      })
    })

    describe('when the value is a number', () => {
      describe('with partialStringTests', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [{ pattern: /2/i, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }],
          })
          result = utils.traverse(2)
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual(2)
        })
      })

      describe('with stringTests', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/^2/],
          })
          result = utils.traverse(2)
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual(2)
        })
      })

      describe('with blacklistedKeys', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['Hello', /world/],
          })
          result = utils.traverse(2)
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual(2)
        })
      })
    })

    describe('when the value is a bigint', () => {
      let applyTransformersSpy: MockInstance<RedactorUtils['applyTransformers']>
      beforeEach(() => {
        utils = new RedactorUtils({})
        // @ts-expect-error - applyTransformers is private but we're testing it
        applyTransformersSpy = vi.spyOn(utils, 'applyTransformers')
        result = utils.traverse(BigInt(123))
      })

      it('should call the transformers', () => {
        expect(applyTransformersSpy).toHaveBeenCalledWith(BigInt(123))
      })

      it('should return the value transformed but not redacted', () => {
        expect(result).toEqual({
          _transformer: 'bigint',
          value: {
            number: '123',
            radix: 10,
          },
        })
      })
    })

    describe('when the value is an array', () => {
      describe('with stringTests', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/^[Hh]ello/],
          })
          result = utils.traverse(['Hello', 'world', 'Hello, world!'])
        })

        it('should return the redacted value', () => {
          expect(result).toEqual(['[REDACTED]', 'world', '[REDACTED]'])
        })
      })

      describe('blacklistedKeys', () => {
        describe('when the key is a string', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: ['a'],
            })
            result = utils.traverse([{ a: 'b', c: 'd' }])
          })

          it('should return the redacted value', () => {
            expect(result).toEqual([{ a: '[REDACTED]', c: 'd' }])
          })
        })

        describe('when the key is a RegExp', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: [/[A-Z]/gi],
            })
            result = utils.traverse([{ A: 'B', C: 'D' }])
          })

          it('should return the redacted value', () => {
            expect(result).toEqual([{ A: '[REDACTED]', C: '[REDACTED]' }])
          })
        })

        describe('when the key is a BlacklistKeyConfig', () => {
          describe('when then key is a string', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a' }],
              })
              result = utils.traverse([{ a: 'b', c: 'd' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: '[REDACTED]', c: 'd' }])
            })
          })

          describe('when then key is a RegExp', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: /a/i }],
              })
              result = utils.traverse([{ a: 'b', c: 'd' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: '[REDACTED]', c: 'd' }])
            })
          })

          describe('when remove is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', remove: true }],
              })
              result = utils.traverse([{ a: 'b', c: 'd' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ c: 'd' }])
            })
          })

          describe('when fuzzyKeyMatch is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', fuzzyKeyMatch: true }],
              })
              result = utils.traverse([{ a: 'b', c: 'd', address: 'e' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: '[REDACTED]', c: 'd', address: '[REDACTED]' }])
            })
          })

          describe('when caseSensitiveKeyMatch is false', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', caseSensitiveKeyMatch: false }],
              })
              result = utils.traverse([{ A: 'B', C: 'D' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ A: '[REDACTED]', C: 'D' }])
            })
          })

          describe('when retainStructure is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', retainStructure: true }],
              })
              result = utils.traverse([{ a: { foo: 'bar' }, c: 'd' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: { foo: '[REDACTED]' }, c: 'd' }])
            })
          })

          describe('when replaceStringByLength is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', replaceStringByLength: true }],
              })
              result = utils.traverse([{ a: 'FOO' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: '[REDACTED][REDACTED][REDACTED]' }])
            })
          })

          describe('when replacement is a custom string', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', replacement: '*' }],
              })
              result = utils.traverse([{ a: 'FOO' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: '*' }])
            })
          })

          describe('when replacement is a function', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', replacement: (value: unknown) => (value as string).replace(/o/gi, '*') }],
              })
              result = utils.traverse([{ a: 'FOO' }])
            })

            it('should return the redacted value', () => {
              expect(result).toEqual([{ a: 'F**' }])
            })
          })
        })
      })
    })

    describe('when the value is an object', () => {
      describe('stringTests', () => {
        const stringTests = [{ pattern: /Hello/gi, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }]

        describe('when the value is a string', () => {
          beforeEach(() => {
            utils = new RedactorUtils({ stringTests })
            result = utils.traverse({ a: 'Hello, world!' })
          })

          it('should return the value partially redacted', () => {
            expect(result).toEqual({ a: '[REDACTED], world!' })
          })
        })

        describe('when the value is a number', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [{ pattern: /Hello/gi, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }],
            })
            result = utils.traverse({ a: 123 })
          })

          it('should return the value unchanged', () => {
            expect(result).toEqual({ a: 123 })
          })
        })
      })

      describe('stringTests', () => {
        describe('when the value is a string', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [/^Hello/],
            })
            result = utils.traverse({ a: 'Hello, world!' })
          })

          it('should return the redacted value', () => {
            expect(result).toEqual({ a: '[REDACTED]' })
          })
        })

        describe('when the value is a number', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [/^Hello/],
            })
            result = utils.traverse({ a: 123 })
          })

          it('should return the value unchanged', () => {
            expect(result).toEqual({ a: 123 })
          })
        })
      })

      describe('blacklistedKeys', () => {
        describe('when the key is a string', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: ['a'],
            })
            result = utils.traverse({ a: 'b', c: 'd' })
          })

          it('should return the redacted value', () => {
            expect(result).toEqual({ a: '[REDACTED]', c: 'd' })
          })
        })

        describe('when the key is a RegExp', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: [/[A-Z]/gi],
            })
            result = utils.traverse({ A: 'B', C: 'D' })
          })

          it('should return the redacted value', () => {
            expect(result).toEqual({ A: '[REDACTED]', C: '[REDACTED]' })
          })
        })

        describe('when the key is a BlacklistKeyConfig', () => {
          describe('when then key is a string', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a' }],
              })
              result = utils.traverse({ a: 'b', c: 'd' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: '[REDACTED]', c: 'd' })
            })
          })

          describe('when then key is a RegExp', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: /a/i }],
              })
              result = utils.traverse({ a: 'b', c: 'd' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: '[REDACTED]', c: 'd' })
            })
          })

          describe('when remove is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', remove: true }],
              })
              result = utils.traverse({ a: 'b', c: 'd' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ c: 'd' })
            })
          })

          describe('when fuzzyKeyMatch is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', fuzzyKeyMatch: true }],
              })
              result = utils.traverse({ a: 'b', c: 'd', address: 'e' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: '[REDACTED]', c: 'd', address: '[REDACTED]' })
            })
          })

          describe('when caseSensitiveKeyMatch is false', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', caseSensitiveKeyMatch: false }],
              })
              result = utils.traverse({ A: 'B', C: 'D' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ A: '[REDACTED]', C: 'D' })
            })
          })

          describe('when retainStructure is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', retainStructure: true }],
              })
              result = utils.traverse({ a: { foo: 'bar' }, c: 'd' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: { foo: '[REDACTED]' }, c: 'd' })
            })
          })

          describe('when replaceStringByLength is true', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', replaceStringByLength: true }],
              })
              result = utils.traverse({ a: 'FOO' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: '[REDACTED][REDACTED][REDACTED]' })
            })
          })

          describe('when replacement is a custom string', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', replacement: '*' }],
              })
              result = utils.traverse({ a: 'FOO' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: '*' })
            })
          })

          describe('when replacement is a function', () => {
            beforeEach(() => {
              utils = new RedactorUtils({
                blacklistedKeys: [{ key: 'a', replacement: (value: unknown) => (value as string).replace(/o/gi, '*') }],
              })
              result = utils.traverse({ a: 'FOO' })
            })

            it('should return the redacted value', () => {
              expect(result).toEqual({ a: 'F**' })
            })
          })
        })
      })
    })

    describe('when the value is a circular reference', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['foo'],
        })
        const circularReference = { a: { foo: { bar: 'baz' } }, b: new Date() }
        // @ts-expect-error - we're testing a circular reference
        circularReference.a.foo.circularReference = circularReference.a.foo
        result = utils.traverse(circularReference)
      })

      it('should return the redacted value', () => {
        expect(result).toEqual({
          a: {
            foo: {
              bar: 'baz',
              circularReference: {
                _transformer: 'circular',
                path: 'a.foo.circularReference',
                value: 'a.foo',
              },
            },
          },
          b: {
            _transformer: 'date',
            datetime: expect.any(String),
          },
        })
      })
    })
  })

  describe('requiresTransformers', () => {
    describe('when the value is a date', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(new Date())).toBe(true)
      })
    })

    describe('when the value is an error', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(new Error('test'))).toBe(true)
      })
    })

    describe('when the value is a map', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(new Map([['a', 1]]))).toBe(true)
      })
    })

    describe('when the value is a set', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(new Set([1]))).toBe(true)
      })
    })

    describe('when the value is a regex', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(/test/)).toBe(true)
      })
    })

    describe('when the value is a URL', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(new URL('https://example.com'))).toBe(true)
      })
    })

    describe('when the value is a bigint', () => {
      it('should return true', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(BigInt(123))).toBe(true)
      })
    })

    describe('when the value is a string', () => {
      it('should return false', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers('test')).toBe(false)
      })
    })

    describe('when the value is a number', () => {
      it('should return false', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(123)).toBe(false)
      })
    })

    describe('when the value is a boolean', () => {
      it('should return false', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(true)).toBe(false)
      })
    })

    describe('when the value is a function', () => {
      it('should return false', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(() => {})).toBe(false)
      })
    })

    describe('when the value is undefined', () => {
      it('should return false', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(undefined)).toBe(false)
      })
    })

    describe('when the value is null', () => {
      it('should return false', () => {
        // @ts-expect-error - requiresTransformers is private but we're testing it
        expect(utils.requiresTransformers(null)).toBe(false)
      })
    })
  })

  describe('createTransformedBlacklistedKeys', () => {
    describe('with a custom config', () => {
      const customConfig = {
        fuzzyKeyMatch: true,
        caseSensitiveKeyMatch: false,
        retainStructure: true,
        remove: true,
        replaceStringByLength: true,
        replacement: '*',
      }

      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
          ...customConfig,
        })
      })

      describe('when the key is a RegExp', () => {
        it('should create a transformed blacklisted key using custom config', () => {
          // @ts-expect-error - createTransformedBlacklistedKeys is private but we're testing it
          expect(utils.createTransformedBlacklistedKey(/a/gi, customConfig)).toEqual({
            key: /a/gi,
            fuzzyKeyMatch: true,
            caseSensitiveKeyMatch: false,
            retainStructure: true,
            remove: true,
            replacement: '*',
            replaceStringByLength: true,
          })
        })
      })

      describe('when the key is a BlacklistKeyConfig', () => {
        it('should create a transformed blacklisted key using key specific config and custom config fallback', () => {
          // @ts-expect-error - createTransformedBlacklistedKeys is private but we're testing it
          expect(utils.createTransformedBlacklistedKey({
            key: 'a',
            remove: false,
            replacement: '[REDACTED]',
            replaceStringByLength: false,
          }, customConfig)).toEqual({
            key: 'a',
            fuzzyKeyMatch: true,
            caseSensitiveKeyMatch: false,
            retainStructure: true,
            remove: false,
            replacement: '[REDACTED]',
            replaceStringByLength: false,
          })
        })
      })
    })

    describe('without a custom config', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
      })

      describe('when the key is a RegExp', () => {
        it('should create a transformed blacklisted key using default config', () => {
          // @ts-expect-error - createTransformedBlacklistedKeys is private but we're testing it
          expect(utils.createTransformedBlacklistedKey(/a/gi, {})).toEqual({
            key: /a/gi,
            fuzzyKeyMatch: false,
            caseSensitiveKeyMatch: true,
            retainStructure: false,
            remove: false,
            replacement: '[REDACTED]',
            replaceStringByLength: false,
          })
        })
      })

      describe('when the key is a BlacklistKeyConfig', () => {
        it('should create a transformed blacklisted key using key specific config and default config fallback', () => {
          // @ts-expect-error - createTransformedBlacklistedKeys is private but we're testing it
          expect(utils.createTransformedBlacklistedKey({ key: 'a', replacement: '*', replaceStringByLength: true }, {})).toEqual({
            key: 'a',
            fuzzyKeyMatch: false,
            caseSensitiveKeyMatch: true,
            retainStructure: false,
            remove: false,
            replacement: '*',
            replaceStringByLength: true,
          })
        })
      })
    })
  })

  describe('applyTransformers', () => {
    let transformerSpies: Array<MockInstance<Transformer>> = []

    beforeEach(async () => {
      const modules = [
        () => import('../../src/utils/standardTransformers/bigint'),
        () => import('../../src/utils/standardTransformers/date'),
      ]

      await Promise.all(modules.map(async (moduleImport, index) => {
        const module = await moduleImport()
        const exportName = Object.keys(module)[0]
        transformerSpies.push(vi.spyOn(module, exportName as keyof typeof module))
      }))

      utils = new RedactorUtils({
        transformers: transformerSpies as unknown as Transformer[],
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    describe('when no transformers apply', () => {
      let result: unknown

      beforeEach(() => {
        // @ts-expect-error - applyTransformers is private but we're testing it
        result = utils.applyTransformers({ a: 'b' }, 'a', new WeakMap())
      })

      it('should return the value unchanged', () => {
        expect(result).toEqual({ a: 'b' })
      })
    })

    describe('when the value is a string', () => {
      let result: unknown

      beforeEach(() => {
        // @ts-expect-error - applyTransformers is private but we're testing it
        result = utils.applyTransformers('Hello, world!', 'a', new WeakMap())
      })

      it('should return the value unchanged', () => {
        expect(result).toBe('Hello, world!')
      })

      it('should not apply any transformers', () => {
        expect(transformerSpies[0]).not.toHaveBeenCalled()
        expect(transformerSpies[1]).not.toHaveBeenCalled()
      })
    })

    describe('when the value is an object', () => {
      let result: unknown

      beforeEach(() => {
        // @ts-expect-error - applyTransformers is private but we're testing it
        result = utils.applyTransformers(BigInt(2), 'a', new WeakMap())
      })

      it('should return the value with the transformers applied', () => {
        expect(result).toEqual({ value: { radix: 10, number: '2' }, _transformer: 'bigint' })
      })

      it('should return the value without applying the date transformer', () => {
        expect(transformerSpies[0]).toHaveBeenCalled()
        expect(transformerSpies[1]).not.toHaveBeenCalled()
      })
    })
  })

  describe('sanitiseStringForRegex', () => {
    it('should sanitise the string for the regex', () => {
      // @ts-expect-error - sanitiseStringForRegex is private but we're testing it
      expect(utils.sanitiseStringForRegex('Hello, world!')).toBe('Helloworld')
    })
  })

  describe('shouldRedactKey', () => {
    describe('computed regex', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['foo', 'bar'],
        })
      })

      describe('when the key satisfies the computed regex', () => {
        it('should return true', () => {
          // @ts-expect-error - shouldRedactKey is private but we're testing it
          expect(utils.shouldRedactKey('foo')).toBe(true)
        })
      })

      describe('when the key does not satisfy the computed regex', () => {
        it('should return false', () => {
          // @ts-expect-error - shouldRedactKey is private but we're testing it
          expect(utils.shouldRedactKey('a')).toBe(false)
        })
      })
    })

    describe('blacklisted keys', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: [/a/gi, { key: 'boo', fuzzyKeyMatch: true, caseSensitiveKeyMatch: false }],
        })
      })

      describe('RegExp', () => {
        describe('when the key matches the RegExp', () => {
          it('should return true', () => {
            // @ts-expect-error - shouldRedactKey is private but we're testing it
            expect(utils.shouldRedactKey('a')).toBe(true)
          })
        })

        describe('when the key does not match the RegExp', () => {
          it('should return false', () => {
            // @ts-expect-error - shouldRedactKey is private but we're testing it
            expect(utils.shouldRedactKey('c')).toBe(false)
          })
        })
      })

      describe('BlacklistKeyConfig', () => {
        describe('when the key matches the BlacklistKeyConfig', () => {
          describe('fuzzyKeyMatch', () => {
            describe('when enabled', () => {
              beforeEach(() => {
                utils = new RedactorUtils({
                  blacklistedKeys: [/a/gi, { key: 'boo', fuzzyKeyMatch: true }],
                })
              })

              describe('when matches exactly', () => {
                it('should return true', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('boo')).toBe(true)
                })
              })

              describe('when matches partially', () => {
                it('should return true', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('boom')).toBe(true)
                })
              })

              describe('when does not match', () => {
                it('should return false', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('b')).toBe(false)
                })
              })
            })

            describe('when disabled', () => {
              beforeEach(() => {
                utils = new RedactorUtils({
                  blacklistedKeys: [/a/gi, { key: 'boo', fuzzyKeyMatch: false }],
                })
              })

              describe('when matches exactly', () => {
                it('should return false', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('boo')).toBe(true)
                })
              })

              describe('when matches partially', () => {
                it('should return false', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('boom')).toBe(false)
                })
              })

              describe('when fuzzyKeyMatch does not match', () => {
                it('should return false', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('b')).toBe(false)
                })
              })
            })
          })

          describe('caseSensitiveKeyMatch', () => {
            describe('when required to match', () => {
              beforeEach(() => {
                utils = new RedactorUtils({
                  blacklistedKeys: [/a/gi, { key: 'boo', caseSensitiveKeyMatch: true }],
                })
              })

              describe('when caseSensitiveKeyMatch matches', () => {
                it('should return true', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('boo')).toBe(true)
                })
              })

              describe('when caseSensitiveKeyMatch does not match', () => {
                it('should return false', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('BOO')).toBe(false)
                })
              })
            })

            describe('when not required to match', () => {
              beforeEach(() => {
                utils = new RedactorUtils({
                  blacklistedKeys: [/a/gi, { key: 'boo', caseSensitiveKeyMatch: false }],
                })
              })

              describe('when caseSensitiveKeyMatch matches', () => {
                it('should return true', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('boo')).toBe(true)
                })
              })

              describe('when caseSensitiveKeyMatch does not match', () => {
                it('should return false', () => {
                  // @ts-expect-error - shouldRedactKey is private but we're testing it
                  expect(utils.shouldRedactKey('BOO')).toBe(true)
                })
              })
            })
          })
        })

        describe('when the key does not match the BlacklistKeyConfig', () => {
          it('should return false', () => {
            // @ts-expect-error - shouldRedactKey is private but we're testing it
            expect(utils.shouldRedactKey('c')).toBe(false)
          })
        })
      })
    })
  })

  describe('shouldRedactValue', () => {
    let shouldRedactKeySpy: MockInstance<RedactorUtils['findMatchingKeyConfig']>
    let result: unknown

    describe('when the key is a string', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        // @ts-expect-error - shouldRedactKey is private but we're testing it
        shouldRedactKeySpy = vi.spyOn(utils, 'shouldRedactKey')
        // @ts-expect-error - shouldRedactValue is private but we're testing it
        result = utils.shouldRedactValue('Hello, world!', 'a')
      })

      it('should call findMatchingKeyConfig', () => {
        expect(shouldRedactKeySpy).toHaveBeenCalledOnce()
        expect(shouldRedactKeySpy).toHaveBeenNthCalledWith(1, 'a')
      })

      it('should return result of shouldRedactKey', () => {
        expect(result).toEqual(shouldRedactKeySpy.mock.results[0].value)
      })
    })

    describe('when the value is a number', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        // @ts-expect-error - shouldRedactValue is private but we're testing it
        result = utils.shouldRedactValue(1, 'a')
      })

      it('should return false', () => {
        expect(result).toBe(false)
      })

      it('should not call shouldRedactKey', () => {
        expect(shouldRedactKeySpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('redactValue', () => {
    beforeEach(() => {
      utils = new RedactorUtils({
        blacklistedKeys: ['a'],
        types: ['string', 'object'],
      })
    })

    describe('when the value is a string', () => {
      describe('replacement', () => {
        describe('when replacement is a function', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue('Hello, world!', false, { replacement: () => '[REDACTED BY FUNCTION]' })).toEqual({ transformed: '[REDACTED BY FUNCTION]', redactingParent: false })
          })
        })

        describe('when replacement is a string', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue('Hello, world!', false, { replacement: '[REDACTED BY STRING]' })).toEqual({ transformed: '[REDACTED BY STRING]', redactingParent: false })
          })
        })
      })

      describe('replaceStringByLength', () => {
        describe('when replaceStringByLength is true', () => {
          it('should return the redacted value without redacting by length', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue('Hello, world!', false, { replaceStringByLength: true, replacement: '*' })).toEqual({ transformed: '*************', redactingParent: false })
          })
        })

        describe('when replaceStringByLength is false', () => {
          it('should return the redacted value without redacting by length', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue('Hello, world!', false, { replaceStringByLength: false, replacement: '*' })).toEqual({ transformed: '*', redactingParent: false })
          })
        })
      })
    })

    describe('when the value is an object', () => {
      describe('retainStructure', () => {
        describe('when retainStructure is true', () => {
          it('should return the value unchanged', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue({ a: 'b' }, false, { retainStructure: true })).toEqual({ transformed: { a: 'b' }, redactingParent: true })
          })
        })

        describe('when retainStructure is false', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue({ a: 'b' }, false)).toEqual({ transformed: '[REDACTED]', redactingParent: false })
          })
        })
      })

      describe('remove', () => {
        describe('when remove is true', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue({ a: 'b' }, false, { remove: true })).toEqual({ transformed: undefined, redactingParent: false })
          })
        })

        describe('when remove is false', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue({ a: 'b' }, false)).toEqual({ transformed: '[REDACTED]', redactingParent: false })
          })
        })
      })

      describe('replacement', () => {
        describe('when replacement is a function', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue({ a: 'b' }, false, { replacement: () => '[REDACTED BY FUNCTION]' })).toEqual({ transformed: '[REDACTED BY FUNCTION]', redactingParent: false })
          })
        })

        describe('when replacement is a string', () => {
          it('should return the redacted value', () => {
            // @ts-expect-error - redactValue is private but we're testing it
            expect(utils.redactValue({ a: 'b' }, false, { replacement: '[REDACTED BY STRING]' })).toEqual({ transformed: '[REDACTED BY STRING]', redactingParent: false })
          })
        })
      })

      describe('replaceStringByLength', () => {
        it('should return the redacted value without redacting by length', () => {
          // @ts-expect-error - redactValue is private but we're testing it
          expect(utils.redactValue({ a: 'b' }, false, { replaceStringByLength: true })).toEqual({ transformed: '[REDACTED]', redactingParent: false })
        })
      })
    })
  })

  describe('applyStringTransformations', () => {
    let redactValueSpy: MockInstance<RedactorUtils['redactValue']>
    let stringTestStub: MockInstance
    let result: unknown

    describe('when stringTests contains a RegExp', () => {
      describe('when the value matches the RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/hello/i],
          })
          // @ts-expect-error - redactValue is private but we're testing it
          redactValueSpy = vi.spyOn(utils, 'redactValue')
          // @ts-expect-error - applyStringTransformations is private but we're testing it
          result = utils.applyStringTransformations('Hello, world!', false)
        })

        it('should call redactValue', () => {
          expect(redactValueSpy).toHaveBeenCalledOnce()
          expect(redactValueSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', false, undefined)
        })

        it('should return the result of redactValue', () => {
          expect(result).toEqual(redactValueSpy.mock.results[0]?.value)
        })
      })

      describe('when the value does not match the RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/a/i],
          })
          // @ts-expect-error - redactValue is private but we're testing it
          redactValueSpy = vi.spyOn(utils, 'redactValue')
          // @ts-expect-error - applyStringTransformations is private but we're testing it
          result = utils.applyStringTransformations('Hello, world!', false)
        })

        it('should not call redactValue', () => {
          expect(redactValueSpy).not.toHaveBeenCalled()
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual({ transformed: 'Hello, world!', redactingParent: false })
        })
      })
    })

    describe('when stringTests contains a ComplexStringTest', () => {
      describe('with a replacer that partially redacts the value', () => {
        describe('when the value matches the RegExp', () => {
          beforeEach(() => {
            stringTestStub = vi.fn().mockImplementation((value: string, pattern: RegExp) => value.replace(pattern, '[PARTIALLY REDACTED BY REPLACER]'))
            utils = new RedactorUtils({
              stringTests: [{ pattern: /hello/i, replacer: stringTestStub as unknown as ComplexStringTest['replacer'] }],
            })
            // @ts-expect-error - redactValue is private but we're testing it
            redactValueSpy = vi.spyOn(utils, 'redactValue')
            // @ts-expect-error - applyStringTransformations is private but we're testing it
            result = utils.applyStringTransformations('Hello, world!', false)
          })

          it('should not call redactValue', () => {
            expect(redactValueSpy).not.toHaveBeenCalled()
          })

          it('should call the replacer', () => {
            expect(stringTestStub).toHaveBeenCalledOnce()
            // @ts-expect-error - config is private but we're testing it
            expect(stringTestStub).toHaveBeenNthCalledWith(1, 'Hello, world!', utils.config.stringTests[0]?.pattern)
          })

          it('should return the result of the replacer', () => {
            expect(result).toEqual({ transformed: '[PARTIALLY REDACTED BY REPLACER], world!', redactingParent: false })
          })
        })

        describe('when the value does not match the RegExp', () => {
          beforeEach(() => {
            stringTestStub = vi.fn().mockImplementation((value: string, pattern: RegExp) => value.replace(pattern, '[PARTIALLY REDACTED BY REPLACER]'))
            utils = new RedactorUtils({
              stringTests: [{ pattern: /^hello$/i, replacer: stringTestStub as unknown as ComplexStringTest['replacer'] }],
            })
            // @ts-expect-error - redactValue is private but we're testing it
            redactValueSpy = vi.spyOn(utils, 'redactValue')
            // @ts-expect-error - applyStringTransformations is private but we're testing it
            result = utils.applyStringTransformations('Hello, world!', false)
          })

          it('should not call redactValue', () => {
            expect(redactValueSpy).not.toHaveBeenCalled()
          })

          it('should not call the replacer', () => {
            expect(stringTestStub).not.toHaveBeenCalled()
          })

          it('should return the result of the replacer', () => {
            expect(result).toEqual({ transformed: 'Hello, world!', redactingParent: false })
          })
        })
      })

      describe('with a replacer that fully redacts the value', () => {
        describe('when the value matches the RegExp', () => {
          beforeEach(() => {
            stringTestStub = vi.fn().mockImplementation(() => '[FULLY REDACTED BY REPLACER]')
            utils = new RedactorUtils({
              stringTests: [{ pattern: /^hello/i, replacer: stringTestStub as unknown as ComplexStringTest['replacer'] }],
            })
            // @ts-expect-error - redactValue is private but we're testing it
            redactValueSpy = vi.spyOn(utils, 'redactValue')
            // @ts-expect-error - applyStringTransformations is private but we're testing it
            result = utils.applyStringTransformations('Hello, world!', false)
          })

          it('should not call redactValue', () => {
            expect(redactValueSpy).not.toHaveBeenCalled()
          })

          it('should call the replacer', () => {
            expect(stringTestStub).toHaveBeenCalledOnce()
            // @ts-expect-error - config is private but we're testing it
            expect(stringTestStub).toHaveBeenNthCalledWith(1, 'Hello, world!', utils.config.stringTests[0]?.pattern)
          })

          it('should return the result of the replacer', () => {
            expect(result).toEqual({ transformed: '[FULLY REDACTED BY REPLACER]', redactingParent: false })
          })
        })

        describe('when the value does not match the RegExp', () => {
          beforeEach(() => {
            stringTestStub = vi.fn().mockImplementation(() => '[FULLY REDACTED BY REPLACER]')
            utils = new RedactorUtils({
              stringTests: [{ pattern: /^hello$/i, replacer: stringTestStub as unknown as ComplexStringTest['replacer'] }],
            })
            // @ts-expect-error - redactValue is private but we're testing it
            redactValueSpy = vi.spyOn(utils, 'redactValue')
            // @ts-expect-error - applyStringTransformations is private but we're testing it
            result = utils.applyStringTransformations('Hello, world!', false)
          })

          it('should not call redactValue', () => {
            expect(redactValueSpy).not.toHaveBeenCalled()
          })

          it('should not call the replacer', () => {
            expect(stringTestStub).not.toHaveBeenCalled()
          })

          it('should return the value unchanged', () => {
            expect(result).toEqual({ transformed: 'Hello, world!', redactingParent: false })
          })
        })
      })
    })

    describe('when stringTests is explicitly undefined', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          stringTests: undefined,
        })
        // @ts-expect-error - redactValue is private but we're testing it
        redactValueSpy = vi.spyOn(utils, 'redactValue')
        // @ts-expect-error - applyStringTransformations is private but we're testing it
        result = utils.applyStringTransformations('Hello, world!', false)
      })

      it('should return the value unchanged', () => {
        expect(result).toEqual({ transformed: 'Hello, world!', redactingParent: false })
      })

      it('should not call redactValue', () => {
        expect(redactValueSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('handlePrimitiveValue', () => {
    let applyStringTransformationsSpy: MockInstance<RedactorUtils['applyStringTransformations']>
    let shouldRedactKeySpy: MockInstance<RedactorUtils['shouldRedactKey']>
    let redactValueSpy: MockInstance<RedactorUtils['redactValue']>
    let result: unknown

    describe('when value is a string', () => {
      describe('when the value is a string', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
          })
          // @ts-expect-error - handlePrimitiveValue is private but we're testing it
          applyStringTransformationsSpy = vi.spyOn(utils, 'applyStringTransformations')
          // @ts-expect-error - shouldRedactKey is private but we're testing it
          shouldRedactKeySpy = vi.spyOn(utils, 'shouldRedactKey')
          // @ts-expect-error - redactValue is private but we're testing it
          redactValueSpy = vi.spyOn(utils, 'redactValue')
        })

        describe('when the key is blacklisted', () => {
          describe('when passed a key config', () => {
            beforeEach(() => {
              // @ts-expect-error - handlePrimitiveValue is private but we're testing it
              result = utils.handlePrimitiveValue('Hello, world!', 'a', false, { replacement: '[REDACTED]' })
            })

            it('should not call shouldRedactKey', () => {
              expect(shouldRedactKeySpy).not.toHaveBeenCalled()
            })

            it('should call redactValue', () => {
              expect(applyStringTransformationsSpy).not.toHaveBeenCalled()
              expect(redactValueSpy).toHaveBeenCalledOnce()
              expect(redactValueSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', false, { replacement: '[REDACTED]' })
            })

            it('should return the result of redactValue', () => {
              expect(result).toEqual(redactValueSpy.mock.results[0]?.value)
            })
          })

          describe('when not passed a key config', () => {
            beforeEach(() => {
              // @ts-expect-error - handlePrimitiveValue is private but we're testing it
              result = utils.handlePrimitiveValue('Hello, world!', 'a', false)
            })

            it('should call shouldRedactKey', () => {
              expect(shouldRedactKeySpy).toHaveBeenCalledOnce()
              expect(shouldRedactKeySpy).toHaveBeenNthCalledWith(1, 'a')
            })

            it('should call redactValue', () => {
              expect(applyStringTransformationsSpy).not.toHaveBeenCalled()
              expect(redactValueSpy).toHaveBeenCalledOnce()
              expect(redactValueSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', false, undefined)
            })

            it('should return the result of redactValue', () => {
              expect(result).toEqual(redactValueSpy.mock.results[0]?.value)
            })
          })
        })

        describe('when the key is not blacklisted', () => {
          beforeEach(() => {
            // @ts-expect-error - handlePrimitiveValue is private but we're testing it
            result = utils.handlePrimitiveValue('Hello, world!', 'b', false)
          })

          it('should call applyStringTransformations', () => {
            expect(redactValueSpy).not.toHaveBeenCalled()
            expect(applyStringTransformationsSpy).toHaveBeenCalledOnce()
            expect(applyStringTransformationsSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', false, undefined)
          })

          it('should return the result of applyStringTransformations', () => {
            expect(result).toEqual(applyStringTransformationsSpy.mock.results[0]?.value)
          })
        })
      })
    })

    describe('when redacting a parent', () => {
      describe('when the value is a string', () => {
        beforeEach(() => {
          // @ts-expect-error - handlePrimitiveValue is private but we're testing it
          result = utils.handlePrimitiveValue('Hello, world!', 'a', true)
        })

        it('should call redactValue', () => {
          expect(redactValueSpy).toHaveBeenCalledOnce()
          expect(redactValueSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', true, undefined)
        })

        it('should return the redacted value equal to the result of redactValue', () => {
          expect(result).toEqual(redactValueSpy.mock.results[0]?.value)
        })
      })

      describe('when the key is _transformer', () => {
        beforeEach(() => {
          // @ts-expect-error - handlePrimitiveValue is private but we're testing it
          result = utils.handlePrimitiveValue('Hello, world!', '_transformer', true)
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual({ transformed: 'Hello, world!', redactingParent: true })
        })

        it('should not call redactValue', () => {
          expect(redactValueSpy).not.toHaveBeenCalled()
        })

        it('should not call applyStringTransformations', () => {
          expect(applyStringTransformationsSpy).not.toHaveBeenCalled()
        })

        it('should not call shouldRedactKey', () => {
          expect(shouldRedactKeySpy).not.toHaveBeenCalled()
        })
      })

      describe('when the value is not a string', () => {
        beforeEach(() => {
          // @ts-expect-error - handlePrimitiveValue is private but we're testing it
          result = utils.handlePrimitiveValue(1, 'a', true)
        })

        it('should return the value unchanged', () => {
          expect(result).toEqual({ transformed: 1, redactingParent: true })
        })

        it('should not call redactValue', () => {
          expect(redactValueSpy).not.toHaveBeenCalled()
        })

        it('should not call applyStringTransformations', () => {
          expect(applyStringTransformationsSpy).not.toHaveBeenCalled()
        })

        it('should not call shouldRedactKey', () => {
          expect(shouldRedactKeySpy).not.toHaveBeenCalled()
        })
      })
    })

    describe('when none of the above conditions are met', () => {
      beforeEach(() => {
        // @ts-expect-error - handlePrimitiveValue is private but we're testing it
        result = utils.handlePrimitiveValue(2, 'a', false)
      })

      it('should return the value unchanged', () => {
        expect(result).toEqual({ transformed: 2, redactingParent: false })
      })

      it('should not call redactValue', () => {
        expect(redactValueSpy).not.toHaveBeenCalled()
      })

      it('should not call applyStringTransformations', () => {
        expect(applyStringTransformationsSpy).not.toHaveBeenCalled()
      })

      it('should not call shouldRedactKey', () => {
        expect(shouldRedactKeySpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('handleObjectValue', () => {
    let result: unknown
    let redactValueSpy: MockInstance<RedactorUtils['redactValue']>
    let handleRetainStructureSpy: MockInstance<RedactorUtils['handleRetainStructure']>
    let shouldRedactKeySpy: MockInstance<RedactorUtils['shouldRedactKey']>

    describe('updating the reference map', () => {
      let referenceMap: WeakMap<object, string>
      let referenceMapSpy: MockInstance

      beforeEach(() => {
        referenceMap = new WeakMap()
        referenceMapSpy = vi.spyOn(referenceMap, 'set')
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        // @ts-expect-error - handleObjectValue is private but we're testing it
        result = utils.handleObjectValue({ a: 'b' }, 'a', ['a'], false, referenceMap)
      })

      it('should update the reference map', () => {
        expect(referenceMapSpy).toHaveBeenCalledOnce()
        expect(referenceMapSpy).toHaveBeenNthCalledWith(1, { a: 'b' }, 'a')
      })
    })

    describe('when redacting a parent', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        // @ts-expect-error - handleRetainStructure is private but we're testing it
        handleRetainStructureSpy = vi.spyOn(utils, 'handleRetainStructure')
        // @ts-expect-error - shouldRedactKey is private but we're testing it
        shouldRedactKeySpy = vi.spyOn(utils, 'shouldRedactKey')
        // @ts-expect-error - redactValue is private but we're testing it
        redactValueSpy = vi.spyOn(utils, 'redactValue')
        // @ts-expect-error - handleObjectValue is private but we're testing it
        result = utils.handleObjectValue({ a: 'b' }, 'a', ['a'], true, new WeakMap())
      })

      it('should not call handleRetainStructure', () => {
        expect(handleRetainStructureSpy).not.toHaveBeenCalled()
      })

      it('should not call shouldRedactKey', () => {
        expect(shouldRedactKeySpy).not.toHaveBeenCalled()
      })

      it('should call redactValue', () => {
        expect(redactValueSpy).toHaveBeenCalledOnce()
        expect(redactValueSpy).toHaveBeenNthCalledWith(1, { a: 'b' }, true, undefined)
      })

      it('should return the value unchanged, redactingParent, and empty stack', () => {
        expect(result).toEqual({ transformed: { a: 'b' }, redactingParent: true, stack: [] })
      })
    })

    describe('when not redacting a parent', () => {
      beforeEach(() => {
        // @ts-expect-error - handleObjectValue is private but we're testing it
        result = utils.handleObjectValue({ a: 'b' }, 'a', ['a'], false, new WeakMap())
      })

      it('should call handleRetainStructure', () => {
        expect(handleRetainStructureSpy).toHaveBeenCalledOnce()
        expect(handleRetainStructureSpy).toHaveBeenNthCalledWith(1, { a: 'b' }, ['a'], false)
      })

      it('should not call shouldRedactKey', () => {
        expect(shouldRedactKeySpy).not.toHaveBeenCalled()
      })

      it('should return the result of handleRetainStructure', () => {
        expect(result).toEqual(handleRetainStructureSpy.mock.results[0]?.value)
      })
    })
  })

  describe('handleRetainStructure', () => {
    let findMatchingKeyConfigSpy: MockInstance<RedactorUtils['findMatchingKeyConfig']>
    let result: unknown

    describe('when the value is an object', () => {
      let value = { a: 'b' }

      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        findMatchingKeyConfigSpy = vi.spyOn(utils, 'findMatchingKeyConfig')
        // @ts-expect-error - handleRetainStructure is private but we're testing it
        result = utils.handleRetainStructure(value, ['a'], false)
      })

      it('should return the correct stack', () => {
        expect(result).toEqual({
          transformed: {},
          redactingParent: false,
          stack: [{
            parent: {},
            key: 'a',
            value: 'b',
            path: ['a', 'a'],
            redactingParent: false,
            keyConfig: findMatchingKeyConfigSpy.mock.results[0].value,
          }]
        })
      })
    })

    describe('when the value is an array', () => {
      let value = ['a', 'b']

      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        findMatchingKeyConfigSpy = vi.spyOn(utils, 'findMatchingKeyConfig')
        // @ts-expect-error - handleRetainStructure is private but we're testing it
        result = utils.handleRetainStructure(value, [0], false)
      })

      it('should return the correct stack', () => {
        expect(result).toEqual({
          transformed: [],
          redactingParent: false,
          stack: [
            {
              parent: [],
              key: '1',
              value: 'b',
              path: [0, 1],
              redactingParent: false,
              keyConfig: findMatchingKeyConfigSpy.mock.results[0].value,
            },
            {
              parent: [],
              key: '0',
              value: 'a',
              path: [0, 0],
              redactingParent: false,
              keyConfig: findMatchingKeyConfigSpy.mock.results[1].value,
            },
          ]
        })
      })
    })
  })

  describe('findMatchingKeyConfig', () => {
    let blacklistedKeysTransformedFindSpy: MockInstance<Array<BlacklistKeyConfig>['find']>
    let result: unknown

    beforeEach(() => {
      utils = new RedactorUtils({
        blacklistedKeys: ['a', { key: 'foo', replacement: '*', replaceStringByLength: true, fuzzyKeyMatch: true, caseSensitiveKeyMatch: true }],
      })
      // @ts-expect-error - blacklistedKeysTransformedFindSpy is private but we're testing it
      blacklistedKeysTransformedFindSpy = vi.spyOn(utils.blacklistedKeysTransformed, 'find')
      // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
      result = utils.findMatchingKeyConfig('a')
    })

    describe('when the key is a string that matches the computed regex', () => {
      it('should return the correct key config', () => {
        expect(result).toEqual({
          key: 'a',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
          remove: false,
          replaceStringByLength: false,
          replacement: '[REDACTED]',
          retainStructure: false,
        })
      })

      it('should not call blacklistedKeysTransformed.find', () => {
        expect(blacklistedKeysTransformedFindSpy).not.toHaveBeenCalled()
      })
    })

    describe('when the key is a string that does not match the computed regex', () => {
      beforeEach(() => {
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        result = utils.findMatchingKeyConfig('b')
      })

      it('should call blacklistedKeysTransformed.find', () => {
        expect(blacklistedKeysTransformedFindSpy).toHaveBeenCalledOnce()
        expect(blacklistedKeysTransformedFindSpy).toHaveBeenNthCalledWith(1, expect.any(Function))
      })

      it('should return undefined', () => {
        expect(result).toBeUndefined()
      })
    })

    describe('when the key is a string that matches a complex key', () => {
      beforeEach(() => {
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        result = utils.findMatchingKeyConfig('foo')
      })

      it('should call blacklistedKeysTransformed.find', () => {
        expect(blacklistedKeysTransformedFindSpy).toHaveBeenCalledOnce()
        expect(blacklistedKeysTransformedFindSpy).toHaveBeenNthCalledWith(1, expect.any(Function))
      })

      it('should return the correct key config', () => {
        expect(result).toEqual({
          key: 'foo',
          replacement: '*',
          replaceStringByLength: true,
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: true,
          retainStructure: false,
          remove: false,
        })
      })
    })

    describe('when caseSensitiveKeyMatch is false', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: [{ key: 'TEST', fuzzyKeyMatch: true, caseSensitiveKeyMatch: false }],
        })
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        result = utils.findMatchingKeyConfig('test')
      })

      it('should match case insensitively', () => {
        expect(result).toEqual({
          key: 'TEST',
          fuzzyKeyMatch: true,
          caseSensitiveKeyMatch: false,
          retainStructure: false,
          replacement: '[REDACTED]',
          replaceStringByLength: false,
          remove: false,
        })
      })
    })

    describe('when fuzzyKeyMatch is false and caseSensitiveKeyMatch is false', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: [{ key: 'EXACT', fuzzyKeyMatch: false, caseSensitiveKeyMatch: false }],
        })
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        result = utils.findMatchingKeyConfig('exact')
      })

      it('should match exactly case insensitively', () => {
        expect(result).toEqual({
          key: 'EXACT',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: false,
          retainStructure: false,
          replacement: '[REDACTED]',
          replaceStringByLength: false,
          remove: false,
        })
      })
    })

    describe('when fuzzyKeyMatch is false and caseSensitiveKeyMatch is true', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: [{ key: 'exact', fuzzyKeyMatch: false, caseSensitiveKeyMatch: true }],
        })
        // @ts-expect-error - findMatchingKeyConfig is private but we're testing it
        result = utils.findMatchingKeyConfig('exact')
      })

      it('should match exactly case sensitively', () => {
        expect(result).toEqual({
          key: 'exact',
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
          retainStructure: false,
          replacement: '[REDACTED]',
          replaceStringByLength: false,
          remove: false,
        })
      })
    })
  })

  describe('replaceCircularReferences', () => {
    let result: unknown

    beforeEach(() => {
      utils = new RedactorUtils({})
    })

    describe('when the input is a primitive value', () => {
      it('should return string unchanged', () => {
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences('hello')
        expect(result).toBe('hello')
      })

      it('should return number unchanged', () => {
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(42)
        expect(result).toBe(42)
      })

      it('should return boolean unchanged', () => {
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(true)
        expect(result).toBe(true)
      })

      it('should return null unchanged', () => {
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(null)
        expect(result).toBe(null)
      })

      it('should return undefined unchanged', () => {
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(undefined)
        expect(result).toBe(undefined)
      })
    })

    describe('when the input is an object without circular references', () => {
      it('should return the same object for simple objects', () => {
        const input = { a: 1, b: 'test' }
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)
        expect(result).toBe(input)
      })

      it('should return the same object for nested objects', () => {
        const input = { a: { b: { c: 'deep' } }, d: 'shallow' }
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)
        expect(result).toBe(input)
      })

      it('should return the same object for objects with primitive values', () => {
        const input = { str: 'hello', num: 42, bool: true, nil: null }
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)
        expect(result).toBe(input)
      })
    })

    describe('when the input is an array without circular references', () => {
      it('should return the same array for simple arrays', () => {
        const input = [1, 2, 'test']
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)
        expect(result).toBe(input)
      })

      it('should return the same array for nested arrays', () => {
        const input = [1, [2, [3, 'deep']], 'shallow']
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)
        expect(result).toBe(input)
      })

      it('should return the same array for arrays with objects', () => {
        const input = [{ a: 1 }, { b: 2 }, 'test']
        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)
        expect(result).toBe(input)
      })
    })

    describe('when the input has circular references', () => {
      describe('objects with self-reference', () => {
        it('should replace direct self-reference', () => {
          const input: any = { name: 'test' }
          input.self = input

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual({
            name: 'test',
            self: {
              _transformer: 'circular',
              value: '',
              path: 'self'
            }
          })
        })

        it('should handle multiple self-references', () => {
          const input: any = { name: 'test' }
          input.ref1 = input
          input.ref2 = input

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual({
            name: 'test',
            ref1: {
              _transformer: 'circular',
              value: '',
              path: 'ref1'
            },
            ref2: {
              _transformer: 'circular',
              value: '',
              path: 'ref2'
            }
          })
        })
      })

      describe('arrays with self-reference', () => {
        it('should replace direct self-reference in arrays', () => {
          const input: any = ['test', 'value']
          input.push(input)

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual([
            'test',
            'value',
            {
              _transformer: 'circular',
              value: '',
              path: '2'
            }
          ])
        })

        it('should handle multiple self-references in arrays', () => {
          const input: any = ['test']
          input.push(input, input)

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual([
            'test',
            {
              _transformer: 'circular',
              value: '',
              path: '1'
            },
            {
              _transformer: 'circular',
              value: '',
              path: '2'
            }
          ])
        })
      })

      describe('nested circular references', () => {
        it('should handle circular reference in nested objects', () => {
          const input: any = {
            level1: {
              level2: {
                data: 'deep'
              }
            }
          }
          input.level1.level2.circular = input

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual({
            level1: {
              level2: {
                data: 'deep',
                circular: {
                  _transformer: 'circular',
                  value: '',
                  path: 'level1.level2.circular'
                }
              }
            }
          })
        })

        it('should handle circular reference in nested arrays', () => {
          const input: any = [
            'first',
            [
              'second',
              ['third']
            ]
          ]
          input[1][1].push(input)

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual([
            'first',
            [
              'second',
              [
                'third',
                {
                  _transformer: 'circular',
                  value: '',
                  path: '1.1.1'
                }
              ]
            ]
          ])
        })
      })

      describe('mixed structures with circular references', () => {
        it('should handle object containing array with circular reference', () => {
          const input: any = {
            data: 'test',
            items: ['a', 'b']
          }
          input.items.push(input)

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual({
            data: 'test',
            items: [
              'a',
              'b',
              {
                _transformer: 'circular',
                value: '',
                path: 'items.2'
              }
            ]
          })
        })

        it('should handle array containing object with circular reference', () => {
          const input: any = [
            'start',
            { name: 'test', value: 42 }
          ]
          input[1].parent = input

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).not.toBe(input)
          expect(result).toEqual([
            'start',
            {
              name: 'test',
              value: 42,
              parent: {
                _transformer: 'circular',
                value: '',
                path: '1.parent'
              }
            }
          ])
        })
      })

      describe('complex circular reference scenarios', () => {
              it('should handle mutual circular references', () => {
        const objA: any = { name: 'A' }
        const objB: any = { name: 'B' }
        objA.refToB = objB
        objB.refToA = objA

        const input = { a: objA, b: objB }

        // @ts-expect-error - replaceCircularReferences is private but we're testing it
        result = utils.replaceCircularReferences(input)

        expect(result).not.toBe(input)
        expect(result).toEqual({
          a: {
            name: 'A',
            refToB: {
              name: 'B',
              refToA: {
                _transformer: 'circular',
                value: 'a',
                path: 'a.refToB.refToA'
              }
            }
          },
          b: {
            name: 'B',
            refToA: {
              name: 'A',
              refToB: {
                _transformer: 'circular',
                value: 'b',
                path: 'b.refToA.refToB'
              }
            }
          }
        })
      })

        it('should handle empty object path correctly', () => {
          const input: any = { root: true }
          input.circular = input

          // @ts-expect-error - replaceCircularReferences is private but we're testing it
          result = utils.replaceCircularReferences(input)

          expect(result).toEqual({
            root: true,
            circular: {
              _transformer: 'circular',
              value: '',
              path: 'circular'
            }
          })
        })
      })
    })
  })
})
