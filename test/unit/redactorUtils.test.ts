import {
  describe, it, expect, beforeEach, vi, MockInstance,
  afterEach,
} from 'vitest'
import RedactorUtils from '../../src/utils/'
import type { BaseDeepRedactConfig, BlacklistKeyConfig, ComplexStringTest, Transformer } from '../../src/types'
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
          partialStringTests: [],
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
          partialStringTests: [{ pattern: /Foo/gi, replacer: replacer as unknown as ComplexStringTest['replacer'] }],
          stringTests: [/^Hello/],
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
          partialStringTests: [
            {
              pattern: /Foo/gi,
              replacer,
            },
          ],
          stringTests: [/^Hello/],
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
      describe('with partialStringTests', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            partialStringTests: [{ pattern: /Hello/gi, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }],
          })
          result = utils.traverse('Hello, world!')
        })

        it('should return the redacted value', () => {
          expect(result).toEqual('[REDACTED], world!')
        })
      })

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
            partialStringTests: [{ pattern: /2/i, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }],
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

    describe('when the value is an array', () => {
      describe('with partialStringTests', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            partialStringTests: [{ pattern: /Hello/gi, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }],
          })
          result = utils.traverse(['Hello', 'world'])
        })

        it('should return the redacted value', () => {
          expect(result).toEqual(['[REDACTED]', 'world'])
        })
      })

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
      describe('partialStringTests', () => {
        const partialStringTests = [{ pattern: /Hello/gi, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }]

        describe('when the value is a string', () => {
          beforeEach(() => {
            utils = new RedactorUtils({ partialStringTests })
            result = utils.traverse({ a: 'Hello, world!' })
          })

          it('should return the value partially redacted', () => {
            expect(result).toEqual({ a: '[REDACTED], world!' })
          })
        })

        describe('when the value is a number', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              partialStringTests: [{ pattern: /Hello/gi, replacer: (value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]') }],
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
        const circularReference = { a: { foo: { bar: 'baz' } } }
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
        })
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

  describe('partialStringRedactor', () => {
    beforeEach(() => {
      utils = new RedactorUtils({
        partialStringTests: [
          {
            pattern: /Hello/gi,
            replacer: (value: string, pattern) => value.replace(pattern, '[REDACTED]'),
          },
          {
            pattern: /Foo/gi,
            replacer: (value: string, pattern) => value.replace(pattern, '[REDACTED]'),
          },
        ],
      })
    })

    describe('when the value is a string', () => {
      describe('when the value does not match any partialStringTests', () => {
        it('should return the value', () => {
          expect(utils.partialStringRedact('Bar')).toBe('Bar')
        })
      })

      describe('when the value matches a partialStringTest', () => {
        describe('when it matches only one partialStringTest', () => {
          it('should return the redacted string', () => {
            expect(utils.partialStringRedact('Hello, world!')).toBe('[REDACTED], world!')
          })
        })

        describe('when it matches multiple partialStringTests', () => {
          it('should return the redacted string', () => {
            expect(utils.partialStringRedact('Hello, Foo, world!')).toBe('[REDACTED], [REDACTED], world!')
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
    let result: unknown
    let stringTestStub: MockInstance
    let applyStringTransformationsSpy: MockInstance<RedactorUtils['applyStringTransformations']>
    let redactValueSpy: MockInstance<RedactorUtils['redactValue']>
    
    describe('when partialStringTests is empty', () => {
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
        beforeEach(() => {
          stringTestStub = vi.fn().mockImplementation((value: string) => value.replace(/a/gi, '*'))
          utils = new RedactorUtils({
            stringTests: [{ pattern: /hello/i, replacer: stringTestStub as unknown as ComplexStringTest['replacer'] }],
          })
          // @ts-expect-error - redactValue is private but we're testing it
          redactValueSpy = vi.spyOn(utils, 'redactValue')
          // @ts-expect-error - applyStringTransformations is private but we're testing it
          result = utils.applyStringTransformations('Hello, world!', false)
        })
  
        it('should call redactValue', () => {
          expect(stringTestStub).toHaveBeenCalledOnce()
          // @ts-expect-error - config is private but we're testing it
          expect(stringTestStub).toHaveBeenNthCalledWith(1, 'Hello, world!', utils.config.stringTests[0]?.pattern)
        })
  
        it('should return the result of redactValue', () => {
          expect(result).toEqual({ transformed: stringTestStub.mock.results[0]?.value, redactingParent: false })
        })
      })
    })

    describe('when partialStringTests is not empty', () => {
      let partialStringTestSpy: MockInstance<RedactorUtils['partialStringRedact']>
      let redactValueSpy: MockInstance<RedactorUtils['redactValue']>
      let result: unknown

      beforeEach(() => {
        utils = new RedactorUtils({
          stringTests: [/^hello/i],
          partialStringTests: [{ pattern: /^hello/i, replacer: (_value: string) => '[PARTIALLY REDACTED]' }],
        })
        partialStringTestSpy = vi.spyOn(utils, 'partialStringRedact')
        // @ts-expect-error - redactValue is private but we're testing it
        redactValueSpy = vi.spyOn(utils, 'redactValue')
        // @ts-expect-error - applyStringTransformations is private but we're testing it
        result = utils.applyStringTransformations('Hello, world!', false)
      })

      it('should call partialStringRedact', () => {
        expect(partialStringTestSpy).toHaveBeenCalledOnce()
        expect(partialStringTestSpy).toHaveBeenNthCalledWith(1, 'Hello, world!')
      })

      it('should not call redactValue', () => {
        expect(redactValueSpy).not.toHaveBeenCalled()
      })

      it('should return the result of partialStringRedact and redactingParent', () => {
        expect(result).toEqual({ transformed: '[PARTIALLY REDACTED]', redactingParent: false })
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
  })

  describe('removeCircularReferences', () => {
    let applyTransformersSpy: MockInstance<RedactorUtils['applyTransformers']>
    let initialiseTraversalSpy: MockInstance<RedactorUtils['initialiseTraversal']>
    let initialValue = { foo: { bar: 'biz', baz: { qux: 'quux' }, arr: [{ some: 'object' }, {}] } }
    // @ts-expect-error - we're testing a circular reference
    initialValue.foo.baz.circularReference = initialValue.foo.baz
    // @ts-expect-error - we're testing a circular reference
    initialValue.foo.arr[1].circularReference = initialValue.foo.arr[1]
    let result: unknown

    beforeEach(() => {
      utils = new RedactorUtils({})
      // @ts-expect-error - applyTransformers is private but we're testing it
      applyTransformersSpy = vi.spyOn(utils, 'applyTransformers')
      // @ts-expect-error - removeCircularReferences is private but we're testing it
      initialiseTraversalSpy = vi.spyOn(utils, 'initialiseTraversal')
      // @ts-expect-error - removeCircularReferences is private but we're testing it
      result = utils.removeCircularReferences(initialValue)
    })

    it('should return the correct result with circular references transformed', () => {
      expect(result).toEqual({
        foo: {
          bar: 'biz',
          baz: { qux: 'quux', circularReference: { _transformer: 'circular', value: 'foo.baz', path: 'foo.baz.circularReference' } },
          arr: [{some: 'object'}, { circularReference: { _transformer: 'circular', value: 'foo.arr.1', path: 'foo.arr.1.circularReference' } }],
        },
      })
    })
  })
})
