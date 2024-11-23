import {
  describe, it, expect, beforeEach, vi, MockInstance,
} from 'vitest'
import RedactorUtils from '../../src/utils/redactorUtils'
import type { ComplexStringTest } from '../../src/types'

describe('RedactorUtils', () => {
  let utils: RedactorUtils

  beforeEach(() => {
    utils = new RedactorUtils({
      blacklistedKeys: ['a'],
    })
  })

  describe('config', () => {
    describe('when no custom config is provided', () => {
      beforeEach(() => {
        utils = new RedactorUtils({})
      })

      it('should use the default config', () => {
        expect(utils.config).toEqual({
          blacklistedKeys: [],
          blacklistedKeysTransformed: [],
          partialStringTests: [],
          stringTests: [],
          fuzzyKeyMatch: false,
          caseSensitiveKeyMatch: true,
          retainStructure: false,
          remove: false,
          replaceStringByLength: false,
          replacement: '[REDACTED]',
          types: ['string'],
        })
      })
    })

    describe(' when a full custom config is provided', () => {
      let replacer: MockInstance<ComplexStringTest['replacer']>

      beforeEach(() => {
        replacer = vi.fn((value: string, pattern: RegExp) => value.replace(pattern, '[REDACTED]'))
        utils = new RedactorUtils({
          blacklistedKeys: ['a', /b/],
          partialStringTests: [{ pattern: /Foo/gi, replacer }],
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
        expect(utils.config).toEqual({
          blacklistedKeys: ['a', /b/],
          blacklistedKeysTransformed: [
            {
              key: 'a',
              remove: true,
              replacement: '[SECRET]',
              fuzzyKeyMatch: true,
              caseSensitiveKeyMatch: false,
              retainStructure: true,
            },
            {
              key: /b/,
              remove: true,
              replacement: '[SECRET]',
              fuzzyKeyMatch: true,
              caseSensitiveKeyMatch: false,
              retainStructure: true,
            },
          ],
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
        })
      })
    })

    describe('when blacklistedKeys are provided as objects', () => {
      describe('when only a key is provided but has other root config', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            fuzzyKeyMatch: true,
            caseSensitiveKeyMatch: false,
            retainStructure: true,
            replacement: '[SECRET]',
            remove: true,
            blacklistedKeys: [
              {
                key: 'a',
              },
            ],
          })
        })

        it('should inherit the root config', () => {
          expect(utils.config.blacklistedKeysTransformed).toEqual([
            {
              fuzzyKeyMatch: true,
              caseSensitiveKeyMatch: false,
              retainStructure: true,
              replacement: '[SECRET]',
              remove: true,
              key: 'a',
            },
          ])
        })
      })

      describe('when only a key is provided and no other root config', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [
              {
                key: 'a',
              },
            ],
          })
        })

        it('should use the default root config', () => {
          expect(utils.config.blacklistedKeysTransformed).toEqual([
            {
              fuzzyKeyMatch: false,
              caseSensitiveKeyMatch: true,
              retainStructure: false,
              replacement: '[REDACTED]',
              remove: false,
              key: 'a',
            },
          ])
        })
      })

      describe('when a full object is provided', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [
              {
                key: 'a',
                fuzzyKeyMatch: true,
                caseSensitiveKeyMatch: false,
                retainStructure: true,
                replacement: '[SECRET]',
                remove: true,
              },
            ],
          })
        })

        it('should use the default root config', () => {
          expect(utils.config.blacklistedKeys).toEqual([
            {
              key: 'a',
              fuzzyKeyMatch: true,
              caseSensitiveKeyMatch: false,
              retainStructure: true,
              replacement: '[SECRET]',
              remove: true,
            },
          ])
        })
      })
    })
  })

  describe('normaliseString', () => {
    describe('when the string is uppercase', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('HELLO')).toBe('hello')
      })
    })

    describe('when the string is lowercase', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('hello')).toBe('hello')
      })
    })

    describe('when the string is camelCase', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('helloWorld')).toBe('helloworld')
      })
    })

    describe('when the string is snake_case', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('hello_world')).toBe('hello_world')
      })
    })

    describe('when the string is kebab-case', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('hello-world')).toBe('helloworld')
      })
    })

    describe('when the string is PascalCase', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('HelloWorld')).toBe('helloworld')
      })
    })

    describe('when the string is a number', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('123')).toBe('123')
      })
    })

    describe('when the string includes spaces', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('Hello World')).toBe('helloworld')
      })
    })

    describe('when the string includes special characters', () => {
      it('should return the string in lowercase', () => {
        expect(RedactorUtils.normaliseString('HelloWorld!@£$%^&*()+=¡€#¢∞§¶•ªº`~,<.>/?\'":;{}[]\\|')).toBe('helloworld')
      })
    })
  })

  describe('complexKeyMatch', () => {
    let normaliseStringSpy: MockInstance<typeof RedactorUtils.normaliseString>

    describe('when the blacklistKeyConfig.key is a RegExp', () => {
      let result: boolean

      describe('when the key matches the RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: /^Hello/ }],
          })
          normaliseStringSpy = vi.spyOn(RedactorUtils, 'normaliseString')
          result = RedactorUtils.complexKeyMatch('HelloWorld', utils.config.blacklistedKeys[0])
        })

        it('should not call normaliseString', () => {
          expect(normaliseStringSpy).not.toHaveBeenCalled()
        })

        it('should return true', () => {
          expect(result).toBe(true)
        })
      })

      describe('when the key does not match the RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: /^Hello/ }],
          })
          normaliseStringSpy = vi.spyOn(RedactorUtils, 'normaliseString')
          result = RedactorUtils.complexKeyMatch('World', utils.config.blacklistedKeys[0])
        })

        it('should not call normaliseString', () => {
          expect(normaliseStringSpy).not.toHaveBeenCalled()
        })

        it('should return false', () => {
          expect(result).toBe(false)
        })
      })
    })

    describe('when the blacklistKeyConfig.key is a string', () => {
      let result: boolean

      describe('when matching exactly', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'Hello', caseSensitiveKeyMatch: true, fuzzyKeyMatch: false }],
          })
          normaliseStringSpy = vi.spyOn(RedactorUtils, 'normaliseString')
        })

        describe('when the key matches', () => {
          beforeEach(() => {
            // @ts-expect-error - Testing complexKeyMatch
            result = RedactorUtils.complexKeyMatch('Hello', utils.config.blacklistedKeys[0])
          })

          it('should not call normaliseString', () => {
            expect(normaliseStringSpy).not.toHaveBeenCalled()
          })

          it('should return true', () => {
            expect(result).toBe(true)
          })
        })

        describe('when the key does not match', () => {
          beforeEach(() => {
            result = RedactorUtils.complexKeyMatch('World', utils.config.blacklistedKeys[0])
          })

          it('should not call normaliseString', () => {
            expect(normaliseStringSpy).not.toHaveBeenCalled()
          })

          it('should return false', () => {
            expect(result).toBe(false)
          })
        })
      })

      describe('when matching the key case-insensitive and non-fuzzy', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'Hello', caseSensitiveKeyMatch: false, fuzzyKeyMatch: false }],
          })
          normaliseStringSpy = vi.spyOn(RedactorUtils, 'normaliseString')
        })

        describe('when the key matches', () => {
          beforeEach(() => {
            result = RedactorUtils.complexKeyMatch('hello', utils.config.blacklistedKeys[0])
          })

          it('should call normaliseString', () => {
            expect(normaliseStringSpy).toHaveBeenCalledWith('hello')
          })

          it('should return true', () => {
            expect(result).toBe(true)
          })
        })

        describe('when the key does not match', () => {
          beforeEach(() => {
            // @ts-expect-error - Testing complexKeyMatch
            result = RedactorUtils.complexKeyMatch('World', utils.config.blacklistedKeys[0])
          })

          it('should call normaliseString', () => {
            expect(normaliseStringSpy).toHaveBeenCalledWith('World')
          })

          it('should return false', () => {
            expect(result).toBe(false)
          })
        })
      })

      describe('when matching the key fuzzy and case-sensitive', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'hello', caseSensitiveKeyMatch: true, fuzzyKeyMatch: true }],
          })
          normaliseStringSpy = vi.spyOn(RedactorUtils, 'normaliseString')
        })

        describe('when the key is a match', () => {
          beforeEach(() => {
            result = RedactorUtils.complexKeyMatch('helloworld', utils.config.blacklistedKeys[0])
          })

          it('should not call normaliseString', () => {
            expect(normaliseStringSpy).not.toHaveBeenCalled()
          })

          it('should return true', () => {
            expect(result).toBe(true)
          })
        })

        describe('when the key is not a match', () => {
          beforeEach(() => {
            result = RedactorUtils.complexKeyMatch('HelloWorld', utils.config.blacklistedKeys[0])
          })

          it('should not call normaliseString', () => {
            expect(normaliseStringSpy).not.toHaveBeenCalled()
          })

          it('should return false', () => {
            expect(result).toBe(false)
          })
        })
      })

      describe('when matching the the key case-insensitive and fuzzy', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'hello', caseSensitiveKeyMatch: false, fuzzyKeyMatch: true }],
          })
          normaliseStringSpy = vi.spyOn(RedactorUtils, 'normaliseString')
        })

        describe('when the key is a match', () => {
          beforeEach(() => {
            result = RedactorUtils.complexKeyMatch('HelloWorld', utils.config.blacklistedKeys[0])
          })

          it('should call normaliseString', () => {
            expect(normaliseStringSpy).toHaveBeenCalledWith('HelloWorld')
          })

          it('should return true', () => {
            expect(result).toBe(true)
          })
        })

        describe('when the key is not a match', () => {
          beforeEach(() => {
            result = RedactorUtils.complexKeyMatch('World', utils.config.blacklistedKeys[0])
          })

          it('should call normaliseString', () => {
            expect(normaliseStringSpy).toHaveBeenCalledWith('World')
          })

          it('should return false', () => {
            expect(result).toBe(false)
          })
        })
      })
    })
  })

  describe('getBlacklistedKeyConfig', () => {
    describe('when the key is an empty string', () => {
      it('should return undefined', () => {
        expect(utils.getBlacklistedKeyConfig('')).toBe(undefined)
      })
    })

    describe('when the key is not in the blacklistedKeys', () => {
      it('should return undefined', () => {
        expect(utils.config.blacklistedKeysTransformed).not.toContain('foo')
        expect(utils.getBlacklistedKeyConfig('foo')).toBeUndefined()
      })
    })

    describe('when the key is in the blacklistedKeys', () => {
      describe('when the key is a string', () => {
        it('should return the blacklisted key config', () => {
          // @ts-expect-error - Testing getBlacklistedKeyConfig
          expect(utils.getBlacklistedKeyConfig('a')).toEqual({
            key: 'a',
            caseSensitiveKeyMatch: true,
            fuzzyKeyMatch: false,
            retainStructure: false,
            replacement: '[REDACTED]',
            remove: false,
          })
        })
      })

      describe('when the key is a RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [/a/],
          })
        })

        it('should return the blacklisted key config', () => {
          const config: RegExp = utils.config.blacklistedKeys[0]
          const regex = /a/
          expect(config.source).toEqual(regex.source)
          expect(config.flags).toEqual(regex.flags)
          expect(utils.getBlacklistedKeyConfig('a')).toEqual({
            key: regex,
            caseSensitiveKeyMatch: true,
            fuzzyKeyMatch: false,
            retainStructure: false,
            replacement: '[REDACTED]',
            remove: false,
          })
        })
      })

      describe('when the key is a blacklistedConfig object', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'a' }],
          })
        })

        it('should return the blacklisted key config', () => {
          expect(utils.getBlacklistedKeyConfig('a')).toEqual({
            key: 'a',
            caseSensitiveKeyMatch: true,
            fuzzyKeyMatch: false,
            retainStructure: false,
            replacement: '[REDACTED]',
            remove: false,
          })
        })
      })
    })
  })

  describe('shouldRedactObjectValue', () => {
    let complexKeyMatchSpy: MockInstance<typeof RedactorUtils.complexKeyMatch>
    let result: boolean

    describe('when the key is an empty string', () => {
      beforeEach(() => {
        complexKeyMatchSpy = vi.spyOn(RedactorUtils, 'complexKeyMatch')
        result = utils.shouldRedactObjectValue('')
      })

      it('should not call complexKeyMatch', () => {
        expect(complexKeyMatchSpy).not.toHaveBeenCalled()
      })

      it('should return false', () => {
        expect(result).toBe(false)
      })
    })

    describe('when the key is not in the blacklistedKeys', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        complexKeyMatchSpy = vi.spyOn(RedactorUtils, 'complexKeyMatch')
        result = utils.shouldRedactObjectValue('foo')
      })

      it('should call complexKeyMatch with the search key and blacklisted key config', () => {
        expect(complexKeyMatchSpy).toHaveBeenCalledWith('foo', {
          key: 'a',
          caseSensitiveKeyMatch: true,
          fuzzyKeyMatch: false,
          remove: false,
          replacement: '[REDACTED]',
          retainStructure: false,
        })
      })

      it('should return false', () => {
        expect(utils.config.blacklistedKeys).not.toContain('foo')
        expect(result).toBe(false)
      })
    })

    describe('when the key is in the blacklistedKeys', () => {
      describe('when the key is a blacklistedConfig object', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'a' }],
          })
        })

        it('should return true', () => {
          expect(utils.shouldRedactObjectValue('a')).toBe(true)
        })
      })
    })
  })

  describe('redactString', () => {
    describe('when shouldRedact from parent is false', () => {
      describe('when the test is a simple RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/^Hello/],
          })
        })

        describe('when the value is an empty string', () => {
          it('should return the value', () => {
            expect(utils.redactString('', '[REDACTED]', false, false)).toBe('')
          })
        })

        describe('when the value is not a string', () => {
          it('should return the value', () => {
            expect(utils.redactString(123, '[REDACTED]', false, false)).toBe(123)
          })
        })

        describe('when the value is a string', () => {
          describe('when the value does not match any stringTests', () => {
            it('should return the value', () => {
              expect(utils.redactString('World', '[REDACTED]', true, false)).toBe('World')
            })
          })

          describe('when the value matches a stringTest', () => {
            describe('when the replacement is a string', () => {
              it('should return the replacement string', () => {
                expect(utils.redactString('Hello, world!', '[REDACTED]', false, false)).toBe('[REDACTED]')
              })
            })

            describe('when the replacement is a function', () => {
              it('should return the replacement string', () => {
                expect(utils.redactString('Hello, world!', (value) => `[REDACTED ${typeof value}]`, false, false)).toBe('[REDACTED string]')
              })
            })

            describe('when replaceStringByLength is true', () => {
              beforeEach(() => {
                utils = new RedactorUtils({
                  stringTests: [/^Hello/],
                  replaceStringByLength: true,
                })
              })

              it('should return the replacement string repeated the length of the value', () => {
                const value = 'Hello, world!'
                expect(utils.redactString(value, '*', false, false)).toBe('*'.repeat(value.length))
              })
            })
          })
        })
      })

      describe('when the test has its own replacer function', () => {
        let replacer

        beforeEach(() => {
          replacer = vi.fn((value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'))

          utils = new RedactorUtils({
            stringTests: [{ pattern: /<(email|password)>.+<\/\1>/gi, replacer }],
          })
        })

        describe('when the value is an empty string', () => {
          it('should return the value', () => {
            expect(utils.redactString('', '[REDACTED]', false, false)).toBe('')
          })

          it('should not call the replacer', () => {
            expect(replacer).not.toHaveBeenCalled()
          })
        })

        describe('when the value is not a string', () => {
          it('should return the value', () => {
            expect(utils.redactString(123, '[REDACTED]', false, false)).toBe(123)
          })

          it('should not call the replacer', () => {
            expect(replacer).not.toHaveBeenCalled()
          })
        })

        describe('when the value is a string', () => {
          describe('when the value does not match any stringTests', () => {
            it('should return the value', () => {
              expect(utils.redactString('Hello', '[REDACTED]', false, false)).toBe('Hello')
            })

            it('should not call the replacer', () => {
              expect(replacer).not.toHaveBeenCalled()
            })
          })

          describe('when the value matches a stringTest', () => {
            const value = '<email>someone@somewhere.com</email><foo>bar</foo><password>secret</password>'
            let result: unknown

            describe('when not removing the value', () => {
              beforeEach(() => {
                result = utils.redactString(value, '[REDACTED]', false, false)
              })

              it('should call the replacer with the value and the pattern', () => {
                expect(replacer).toHaveBeenCalledWith(value, /<(email|password)>.+<\/\1>/gi)
              })

              it('should return the replacement string', () => {
                expect(result).toBe('<email>[REDACTED]</email><foo>bar</foo><password>[REDACTED]</password>')
              })
            })

            describe('when removing the value', () => {
              beforeEach(() => {
                result = utils.redactString(value, '[REDACTED]', true, false)
              })

              it('should not call the replacer', () => {
                expect(replacer).not.toHaveBeenCalled()
              })

              it('should return undefined', () => {
                expect(result).toBeUndefined()
              })
            })
          })
        })
      })
    })

    describe('when shouldRedact from parent is true', () => {
      describe('when the test is a simple RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/^Hello/],
          })
        })

        describe('when the value is an empty string', () => {
          it('should return the value', () => {
            expect(utils.redactString('', '[REDACTED]', false, true)).toBe('')
          })
        })

        describe('when the value is not a string', () => {
          it('should return the value', () => {
            expect(utils.redactString(123, '[REDACTED]', false, true)).toBe(123)
          })
        })

        describe('when the value is a string', () => {
          describe('when the value does not match any stringTests', () => {
            it('should return the value', () => {
              expect(utils.redactString('World', '[REDACTED]', true, true)).toBeUndefined()
            })
          })

          describe('when the value matches a stringTest', () => {
            describe('when the replacement is a string', () => {
              it('should return the replacement string', () => {
                expect(utils.redactString('Hello, world!', '[REDACTED]', false, true)).toBe('[REDACTED]')
              })
            })

            describe('when the replacement is a function', () => {
              it('should return the replacement string', () => {
                expect(utils.redactString('Hello, world!', (value) => `[REDACTED ${typeof value}]`, false, true)).toBe('[REDACTED string]')
              })
            })

            describe('when replaceStringByLength is true', () => {
              beforeEach(() => {
                utils = new RedactorUtils({
                  stringTests: [/^Hello/],
                  replaceStringByLength: true,
                })
              })

              it('should return the replacement string repeated the length of the value', () => {
                const value = 'Hello, world!'
                expect(utils.redactString(value, '*', false, true)).toBe('*'.repeat(value.length))
              })
            })
          })
        })
      })

      describe('when the test has its own replacer function', () => {
        let replacer

        beforeEach(() => {
          replacer = vi.fn((value: string, pattern: RegExp) => value.replace(pattern, '<$1>[REDACTED]</$1>'))

          utils = new RedactorUtils({
            stringTests: [{ pattern: /<(email|password)>.+<\/\1>/gi, replacer }],
          })
        })

        describe('when the value is an empty string', () => {
          it('should return the value', () => {
            expect(utils.redactString('', '[REDACTED]', false, false)).toBe('')
          })

          it('should not call the replacer', () => {
            expect(replacer).not.toHaveBeenCalled()
          })
        })

        describe('when the value is not a string', () => {
          it('should return the value', () => {
            expect(utils.redactString(123, '[REDACTED]', false, false)).toBe(123)
          })

          it('should not call the replacer', () => {
            expect(replacer).not.toHaveBeenCalled()
          })
        })

        describe('when the value is a string', () => {
          describe('when the value does not match any stringTests', () => {
            it('should return the value', () => {
              expect(utils.redactString('Hello', '[REDACTED]', false, false)).toBe('Hello')
            })

            it('should not call the replacer', () => {
              expect(replacer).not.toHaveBeenCalled()
            })
          })

          describe('when the value matches a stringTest', () => {
            const value = '<email>someone@somewhere.com</email><foo>bar</foo><password>secret</password>'
            let result: unknown

            describe('when not removing the value', () => {
              beforeEach(() => {
                result = utils.redactString(value, '[REDACTED]', false, false)
              })

              it('should call the replacer with the value and the pattern', () => {
                expect(replacer).toHaveBeenCalledWith(value, /<(email|password)>.+<\/\1>/gi)
              })

              it('should return the replacement string', () => {
                expect(result).toBe('<email>[REDACTED]</email><foo>bar</foo><password>[REDACTED]</password>')
              })
            })

            describe('when removing the value', () => {
              beforeEach(() => {
                result = utils.redactString(value, '[REDACTED]', true, false)
              })

              it('should not call the replacer', () => {
                expect(replacer).not.toHaveBeenCalled()
              })

              it('should return undefined', () => {
                expect(result).toBeUndefined()
              })
            })
          })
        })
      })
    })
  })

  describe('getRecursionConfig', () => {
    let getBlacklistedKeyConfigSpy: MockInstance<typeof utils.getBlacklistedKeyConfig>
    let result: any

    describe('when the key is an empty string', () => {
      it('should return the default recursion config', () => {
        // @ts-expect-error - Testing getRecursionConfig
        expect(utils.getRecursionConfig('')).toEqual({
          remove: false,
          replacement: '[REDACTED]',
          retainStructure: false,
        })
      })
    })

    describe('when the key is not in the blacklistedKeys', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
        })
        getBlacklistedKeyConfigSpy = vi.spyOn(utils, 'getBlacklistedKeyConfig')
        result = utils.getRecursionConfig('foo')
      })

      it('should call getBlacklistedKeyConfig with the key', () => {
        expect(getBlacklistedKeyConfigSpy).toHaveBeenCalledWith('foo')
      })

      it('should return the default recursion config', () => {
        expect(result).toEqual({
          remove: false,
          replacement: '[REDACTED]',
          retainStructure: false,
        })
      })
    })

    describe('when the key is in the blacklistedKeys', () => {
      describe('when the key is a string', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
          })
          getBlacklistedKeyConfigSpy = vi.spyOn(utils, 'getBlacklistedKeyConfig')
          result = utils.getRecursionConfig('a')
        })

        it('should call getBlacklistedKeyConfig with the key', () => {
          expect(getBlacklistedKeyConfigSpy).toHaveBeenCalledWith('a')
        })

        it('should return the blacklisted key config', () => {
          expect(result).toEqual({
            remove: false,
            replacement: '[REDACTED]',
            retainStructure: false,
          })
        })
      })

      describe('when the key is a RegExp', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [/a/],
          })
          getBlacklistedKeyConfigSpy = vi.spyOn(utils, 'getBlacklistedKeyConfig')
          result = utils.getRecursionConfig('a')
        })

        it('should call getBlacklistedKeyConfig with the key', () => {
          expect(getBlacklistedKeyConfigSpy).toHaveBeenCalledWith('a')
        })

        it('should return the blacklisted key config', () => {
          expect(result).toEqual({
            remove: false,
            replacement: '[REDACTED]',
            retainStructure: false,
          })
        })
      })
    })
  })

  describe('redactPrimitive', () => {
    let redactStringSpy: MockInstance<typeof utils.redactString>
    let result: any

    describe('with default config', () => {
      describe('when the value is not a string', () => {
        describe('when the value is redacted', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: [],
              types: ['string', 'number'],
            })
            redactStringSpy = vi.spyOn(utils, 'redactString')
            result = utils.redactPrimitive(123, '[REDACTED]', false, true)
          })

          it('should not call redactString', () => {
            expect(redactStringSpy).not.toHaveBeenCalled()
          })

          it('should return the redacted value', () => {
            expect(result).toBe('[REDACTED]')
          })
        })

        describe('when the value is not redacted', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: [],
              types: ['string', 'number'],
            })
            redactStringSpy = vi.spyOn(utils, 'redactString')
            result = utils.redactPrimitive(123, '[REDACTED]', false, false)
          })

          it('should not call redactString', () => {
            expect(redactStringSpy).not.toHaveBeenCalled()
          })

          it('should return the value', () => {
            expect(result).toBe(123)
          })
        })
      })

      describe('when the value is a string', () => {
        describe('when the value is not redacted', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [/^Hello/],
            })
            redactStringSpy = vi.spyOn(utils, 'redactString')
            result = utils.redactPrimitive('World', '[REDACTED]', true, false)
          })

          it('should call redactString with correct arguments', () => {
            expect(redactStringSpy).toHaveBeenNthCalledWith(1, 'World', '[REDACTED]', true, false)
          })

          it('should return the original value', () => {
            expect(result).toEqual('World')
          })
        })

        describe('when the value is redacted', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [/^Hello/],
            })
            redactStringSpy = vi.spyOn(utils, 'redactString')
            result = utils.redactPrimitive('Hello, world!', '[REDACTED]', false, true)
          })

          it('should call redactString with correct arguments', () => {
            expect(redactStringSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', '[REDACTED]', false, true)
          })

          it('should return the redacted value', () => {
            expect(result).toBe('[REDACTED]')
          })
        })
      })
    })

    describe('when removing', () => {
      describe('when the value is not a string', () => {
        describe('when the value is redacted', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: [],
              types: ['string', 'number'],
              remove: true,
            })
            redactStringSpy = vi.spyOn(utils, 'redactString')
            result = utils.redactPrimitive(123, '[REDACTED]', true, true)
          })

          it('should not call redactString', () => {
            expect(redactStringSpy).not.toHaveBeenCalled()
          })

          it('should return undefined', () => {
            expect(result).toBeUndefined()
          })
        })

        describe('when the value is not redacted', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [/^Hello/],
              remove: true,
            })
            redactStringSpy = vi.spyOn(utils, 'redactString')
            result = utils.redactPrimitive(123, '[REDACTED]', true, false)
          })

          it('should not call redactString', () => {
            expect(redactStringSpy).not.toHaveBeenCalled()
          })

          it('should return the value', () => {
            expect(result).toBe(123)
          })
        })
      })
    })

    describe('with custom replacement function', () => {
      let replaceFn: (value: unknown) => string
      beforeEach(() => {
        replaceFn = vi.fn((value: unknown) => `[REDACTED ${typeof value}]`)
        utils = new RedactorUtils({
          replacement: replaceFn,
          types: ['string', 'number'],
        })
      })

      describe('when the value is not a string', () => {
        describe('when the value is redacted', () => {
          beforeEach(() => {
            result = utils.redactPrimitive(123, replaceFn, false, true)
          })

          it('should call the replace function', () => {
            expect(replaceFn).toHaveBeenCalledWith(123)
          })

          it('should return the redacted value', () => {
            expect(result).toBe('[REDACTED number]')
          })
        })

        describe('when the value is not redacted', () => {
          beforeEach(() => {
            result = utils.redactPrimitive(123, replaceFn, false, false)
          })

          it('should not call the replace function', () => {
            expect(replaceFn).not.toHaveBeenCalled()
          })

          it('should return the value', () => {
            expect(result).toBe(123)
          })
        })
      })

      describe('when the value is a string', () => {
        describe('when the value is redacted', () => {
          beforeEach(() => {
            result = utils.redactPrimitive('World', replaceFn, false, true)
          })

          it('should call the replace function', () => {
            expect(replaceFn).toHaveBeenCalledWith('World')
          })

          it('should return the redacted string', () => {
            expect(result).toBe('[REDACTED string]')
          })
        })

        describe('when the value is not redacted', () => {
          beforeEach(() => {
            result = utils.redactPrimitive('Hello, world!', replaceFn, false, false)
          })

          it('should not call the replace function', () => {
            expect(replaceFn).not.toHaveBeenCalled()
          })

          it('should return the value', () => {
            expect(result).toBe('Hello, world!')
          })
        })
      })
    })
  })

  describe('redactArray', () => {
    let recurseSpy: MockInstance<typeof utils.recurse>
    let result: any

    describe('when the array is empty', () => {
      it('should return the array', () => {
        expect(utils.redactArray([])).toEqual([])
      })
    })

    describe('when the array is not empty', () => {
      beforeEach(() => {
        utils = new RedactorUtils({
          blacklistedKeys: ['a'],
          types: ['string', 'number'],
        })
        recurseSpy = vi.spyOn(utils, 'recurse')
        result = utils.redactArray([{ a: 1 }, { b: 2 }])
      })

      it('should call recurse', () => {
        expect(recurseSpy).toHaveBeenNthCalledWith(1, { a: 1 })
        expect(recurseSpy).toHaveNthReturnedWith(1, '[REDACTED]')
        expect(recurseSpy).toHaveBeenNthCalledWith(2, 1, 'a', true)
        expect(recurseSpy).toHaveNthReturnedWith(2, { a: '[REDACTED]' })
        expect(recurseSpy).toHaveBeenNthCalledWith(3, { b: 2 })
        expect(recurseSpy).toHaveNthReturnedWith(3, 2)
        expect(recurseSpy).toHaveBeenNthCalledWith(4, 2, 'b', false)
        expect(recurseSpy).toHaveNthReturnedWith(4, { b: 2 })
      })

      it('should return the redacted array', () => {
        expect(result).toEqual([{ a: '[REDACTED]' }, { b: 2 }])
      })
    })
  })

  describe('recurse', () => {
    let getRecursionConfigSpy: MockInstance<typeof utils.getRecursionConfig>
    let shouldRedactObjectValueSpy: MockInstance<typeof utils.shouldRedactObjectValue>
    let redactPrimitiveSpy: MockInstance<typeof utils.redactPrimitive>
    let redactObjectSpy: MockInstance<typeof utils.redactObject>
    let redactArraySpy: MockInstance<typeof utils.redactArray>
    let recurseSpy: MockInstance<typeof utils.recurse>
    let result: any

    beforeEach(() => {
      getRecursionConfigSpy = vi.spyOn(utils, 'getRecursionConfig')
      shouldRedactObjectValueSpy = vi.spyOn(utils, 'shouldRedactObjectValue')
      redactPrimitiveSpy = vi.spyOn(utils, 'redactPrimitive')
      redactObjectSpy = vi.spyOn(utils, 'redactObject')
      redactArraySpy = vi.spyOn(utils, 'redactArray')
      recurseSpy = vi.spyOn(utils, 'recurse')
    })

    describe('when using the default config', () => {
      describe('when the value is undefined', () => {
        it('should return the value', () => {
          expect(utils.recurse(undefined)).toBeUndefined()
        })
      })

      describe('when the value is null', () => {
        it('should return the value', () => {
          expect(utils.recurse(null)).toBeNull()
        })
      })

      describe('when the value is an object', () => {
        beforeEach(() => {
          const obj = {
            a: {
              b: {
                c: 'd',
              },
            },
          }

          result = utils.recurse(obj)
        })

        it('should call getRecursionConfig', () => {
          const blacklistKeyObj = {
            retainStructure: false,
            replacement: '[REDACTED]',
            remove: false,
          }
          expect(getRecursionConfigSpy).toHaveBeenNthCalledWith(1, undefined)
          expect(getRecursionConfigSpy).toHaveNthReturnedWith(1, blacklistKeyObj)
          expect(getRecursionConfigSpy).toHaveBeenNthCalledWith(2, 'a')
          expect(getRecursionConfigSpy).toHaveNthReturnedWith(2, blacklistKeyObj)
          expect(getRecursionConfigSpy).toHaveBeenNthCalledWith(3, 'a')
          expect(getRecursionConfigSpy).toHaveNthReturnedWith(3, blacklistKeyObj)
        })

        it('should call shouldRedactObjectValue', () => {
          expect(shouldRedactObjectValueSpy).toHaveBeenNthCalledWith(1, 'a')
          expect(shouldRedactObjectValueSpy).toHaveReturnedWith(true)
        })

        it('should call redactObject', () => {
          expect(redactObjectSpy).toHaveBeenNthCalledWith(1, { a: { b: { c: 'd' } } }, undefined, undefined)
          expect(redactObjectSpy).toHaveNthReturnedWith(1, { a: '[REDACTED]' })
        })

        it('should recurse the object', () => {
          expect(recurseSpy).toHaveBeenCalledTimes(2)
        })

        it('should return the redacted object', () => {
          expect(result).toEqual({ a: '[REDACTED]' })
        })
      })

      describe('when the value is an array', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['b'],
          })
          shouldRedactObjectValueSpy = vi.spyOn(utils, 'shouldRedactObjectValue')
          recurseSpy = vi.spyOn(utils, 'recurse')
          const obj = {
            a: [
              {
                b: [
                  {
                    c: 'd',
                  },
                ],
              },
            ],
          }

          result = utils.recurse(obj)
        })

        it('should call shouldRedactObjectValue', () => {
          expect(shouldRedactObjectValueSpy).toHaveBeenCalledTimes(2)
        })

        it('should recurse the object', () => {
          expect(recurseSpy).toHaveBeenCalledTimes(4)
        })

        it('should return the redacted object', () => {
          expect(result).toEqual({
            a: [
              {
                b: '[REDACTED]',
              },
            ],
          })
        })
      })

      describe('when the value is neither an object nor an array', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            stringTests: [/^Hello/],
          })
          getRecursionConfigSpy = vi.spyOn(utils, 'getRecursionConfig')
          redactPrimitiveSpy = vi.spyOn(utils, 'redactPrimitive')
          redactObjectSpy = vi.spyOn(utils, 'redactObject')
          redactArraySpy = vi.spyOn(utils, 'redactArray')
          recurseSpy = vi.spyOn(utils, 'recurse')
          result = utils.recurse('Hello, world!')
        })

        it('should not call redactObject', () => {
          expect(redactObjectSpy).not.toHaveBeenCalled()
        })

        it('should not call redactArray', () => {
          expect(redactArraySpy).not.toHaveBeenCalled()
        })

        it('should call redactPrimitive', () => {
          expect(redactPrimitiveSpy).toHaveBeenNthCalledWith(1, 'Hello, world!', '[REDACTED]', false, false)
          expect(redactPrimitiveSpy).toHaveNthReturnedWith(1, '[REDACTED]')
        })

        it('should not recurse the value', () => {
          expect(recurseSpy).toHaveBeenCalledTimes(1)
        })

        it('should return the redacted string', () => {
          expect(result).toEqual('[REDACTED]')
        })
      })

      describe('when the value is an object of non-string values', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
            types: ['number'],
          })
          getRecursionConfigSpy = vi.spyOn(utils, 'getRecursionConfig')
          recurseSpy = vi.spyOn(utils, 'recurse')
          const obj = {
            a: 1,
          }

          result = utils.recurse(obj)
        })

        it('should recurse the object', () => {
          expect(recurseSpy).toHaveBeenCalledTimes(2)
        })

        it('should return the redacted object', () => {
          expect(result).toEqual({
            a: '[REDACTED]',
          })
        })
      })
    })

    describe('when removing', () => {
      describe('via root config', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
            remove: true,
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(1)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({})
          })
        })

        describe('when the value is neither an object nor an array', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              stringTests: [/^Hello/],
              remove: true,
            })
            recurseSpy = vi.spyOn(utils, 'recurse')
            result = utils.recurse('Hello, world!')
          })

          it('should not recurse the value', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(1)
          })

          it('should return undefined', () => {
            expect(result).toBeUndefined()
          })
        })

        describe('when the value is an object of non-string values', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: ['a'],
              types: ['number'],
              remove: true,
            })
            getRecursionConfigSpy = vi.spyOn(utils, 'getRecursionConfig')
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: 1,
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(1)
          })

          it('should return the redacted object', () => {
            expect(result).toEqual({})
          })
        })
      })

      describe('via getRecursionConfig', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'a', remove: true }],
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            getRecursionConfigSpy = vi.spyOn(utils, 'getRecursionConfig')
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should call getBlacklistedKeyConfig', () => {
            expect(getRecursionConfigSpy).toHaveBeenCalledWith('a')
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(1)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({})
          })
        })

        describe('when the value is an object of non-string values', () => {
          beforeEach(() => {
            utils = new RedactorUtils({
              blacklistedKeys: [{ key: 'a', remove: true }],
              types: ['number'],
            })
            getRecursionConfigSpy = vi.spyOn(utils, 'getRecursionConfig')
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: 1,
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(1)
          })

          it('should return the redacted object', () => {
            expect(result).toEqual({})
          })
        })
      })
    })

    describe('when retaining structure', () => {
      describe('via root config', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
            retainStructure: true,
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(4)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({
              a: {
                b: {
                  c: '[REDACTED]',
                },
              },
            })
          })
        })
      })

      describe('via blacklistedKeyConfig', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'a', retainStructure: true }],
          })
          recurseSpy = vi.spyOn(utils, 'recurse')
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(4)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({
              a: {
                b: {
                  c: '[REDACTED]',
                },
              },
            })
          })
        })
      })
    })

    describe('when using a custom replacement string', () => {
      describe('via root config', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
            replacement: '[SECRET]',
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(2)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({
              a: '[SECRET]',
            })
          })
        })
      })

      describe('via blacklistedKeyConfig', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'a', replacement: '[SECRET]' }],
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(2)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({
              a: '[SECRET]',
            })
          })
        })
      })
    })

    describe('when using a custom replacement function', () => {
      describe('via root config', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: ['a'],
            replacement: (value) => `[REDACTED ${typeof value}]`,
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(2)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({
              a: '[REDACTED object]',
            })
          })
        })
      })

      describe('via blacklistedKeyConfig', () => {
        beforeEach(() => {
          utils = new RedactorUtils({
            blacklistedKeys: [{ key: 'a', replacement: (value) => `[REDACTED ${typeof value}]` }],
          })
        })

        describe('when the value is an object', () => {
          beforeEach(() => {
            recurseSpy = vi.spyOn(utils, 'recurse')
            const obj = {
              a: {
                b: {
                  c: 'd',
                },
              },
            }

            result = utils.recurse(obj)
          })

          it('should recurse the object', () => {
            expect(recurseSpy).toHaveBeenCalledTimes(2)
          })

          it('should return the redacted object with the redacted data removed', () => {
            expect(result).toEqual({
              a: '[REDACTED object]',
            })
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

    describe('when the value is not a string', () => {
      it('should return the value', () => {
        expect(utils.partialStringRedact(1)).toBe(1)
      })

      describe('when it fails to stringify the value', () => {
        it('should throw an error', () => {
          const value = { bigint: BigInt(1) }
          expect(() => utils.partialStringRedact(value)).toThrowErrorMatchingSnapshot()
        })
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
})
