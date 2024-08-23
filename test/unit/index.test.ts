import {
  describe, it, expect, beforeEach, afterEach, vi, MockInstance,
} from 'vitest'
import {
  type IHeapSnapshot, type Nullable, config, takeNodeMinimalHeap,
} from '@memlab/core'
import { DeepRedact } from '../../src'
import * as redactorUtils from '../../src/utils/redactorUtils'
import * as transformerUtils from '../../src/utils/transformUnsupported'
import { dummyUser } from '../setup/dummyUser'
import { blacklistedKeys } from '../setup/blacklist'
import {
  RedactorUtils, RedactorUtilsConfig, TransformerUtils, TransformerUtilsConfig,
} from '../../src/types'

describe('DeepRedact', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('code coverage', () => {
    beforeEach(async () => {
      vi.spyOn(JSON, 'stringify')

      vi.mock('./utils/redactorUtils', () => {
        return {
          default: () => ({
            recurse: vi.fn(() => ({ foo: 'bar', secret: '[REDACTED]' })),
          }),
        }
      })

      vi.mock('./utils/transformUnsupported', () => {
        return {
          default: () => ({
            rewriteUnsupported: vi.fn(() => ({ foo: 'bar', secret: 'ssshhh!' })),
            maybeSerialise: vi.fn(() => '{ "foo": "bar", "secret": "[REDACTED]" }'),
          }),
        }
      })
    })

    describe('constructor', () => {
      let redactorUtilsSpy: MockInstance<(config: RedactorUtilsConfig) => RedactorUtils>
      let transformerUtilsSpy: MockInstance<(config: TransformerUtilsConfig) => TransformerUtils>
      const redactionConfig = { blacklistedKeys, serialise: true, unsupportedTransformer: vi.fn() }

      beforeEach(() => {
        redactorUtilsSpy = vi.spyOn(redactorUtils, 'default')
        transformerUtilsSpy = vi.spyOn(transformerUtils, 'default')
        // eslint-disable-next-line no-new
        new DeepRedact(redactionConfig)
      })

      it('should setup the redactorUtils', () => {
        const { blacklistedKeys: configBlacklist } = redactionConfig
        expect(redactorUtilsSpy).toHaveBeenCalledTimes(1)
        expect(redactorUtilsSpy).toHaveBeenCalledWith({ blacklistedKeys: configBlacklist })
      })

      it('should setup the transformerUtils', () => {
        const { serialise, unsupportedTransformer } = redactionConfig
        expect(transformerUtilsSpy).toHaveBeenCalledTimes(1)
        expect(transformerUtilsSpy).toHaveBeenCalledWith({ serialise, unsupportedTransformer })
      })
    })

    describe('redact', () => {
      let rewriteUnsupportedSpy: MockInstance<TransformerUtils['rewriteUnsupported']>
      let maybeSerialiseSpy: MockInstance<TransformerUtils['maybeSerialise']>
      let recurseSpy: MockInstance<RedactorUtils['recurse']>
      const date = new Date()
      const error = new Error('test')
      const bigInt = BigInt(1234567890)
      const value = {
        ...dummyUser,
        date,
        error,
        bigInt,
      }
      // @ts-expect-error - we're testing the correct order of calls here
      value.circular = value

      const rewrittenValue = {
        ...value,
        date: date.toISOString(),
        error: {
          __unsupported: {
            message: error.message,
            name: error.name,
            stack: error.stack,
            type: 'error',
          },
        },
        bigInt: {
          __unsupported: {
            type: 'bigint',
            value: bigInt.toString(),
            radix: 10,
          },
        },
        circular: {
          ...value,
          circular: '[[CIRCULAR_REFERENCE: circular.circular]]',
          address: '[[CIRCULAR_REFERENCE: circular.address]]',
          hair: '[[CIRCULAR_REFERENCE: circular.hair]]',
          bank: '[[CIRCULAR_REFERENCE: circular.bank]]',
          company: '[[CIRCULAR_REFERENCE: circular.company]]',
          crypto: '[[CIRCULAR_REFERENCE: circular.crypto]]',
          date: '[[CIRCULAR_REFERENCE: circular.date]]',
          error: '[[CIRCULAR_REFERENCE: circular.error]]',
          bigInt: {
            __unsupported: {
              type: 'bigint',
              value: bigInt.toString(),
              radix: 10,
            },
          },
        },
      }

      beforeEach(() => {
        const deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
        // @ts-expect-error - we're testing the private methods here
        rewriteUnsupportedSpy = vi.spyOn(deepRedact.transformerUtils, 'rewriteUnsupported')
        // @ts-expect-error - we're testing the private methods here
        maybeSerialiseSpy = vi.spyOn(deepRedact.transformerUtils, 'maybeSerialise')
        // @ts-expect-error - we're testing the private methods here
        recurseSpy = vi.spyOn(deepRedact.redactorUtils, 'recurse')
        deepRedact.redact(value)
      })

      it('should rewriteUnsupported with the original value', () => {
        expect(rewriteUnsupportedSpy).toHaveBeenCalledWith(value)
      })

      it('should recurse with the rewritten value', () => {
        expect(recurseSpy).toHaveBeenNthCalledWith(1, rewrittenValue)
      })

      it('should maybeSerialise with the recursed value', () => {
        expect(maybeSerialiseSpy).toHaveBeenCalledTimes(1)
        expect(maybeSerialiseSpy).toHaveBeenCalledWith({
          ...rewrittenValue,
          address: '[REDACTED]',
          macAddress: '[REDACTED]',
          birthDate: '[REDACTED]',
          ssn: '[REDACTED]',
          ein: '[REDACTED]',
          email: '[REDACTED]',
          phone: '[REDACTED]',
          firstName: '[REDACTED]',
          lastName: '[REDACTED]',
          maidenName: '[REDACTED]',
          username: '[REDACTED]',
          password: '[REDACTED]',
          ip: '[REDACTED]',
          company: {
            ...rewrittenValue.company,
            address: '[REDACTED]',
          },
          bank: {
            ...rewrittenValue.bank,
            cardNumber: '[REDACTED]',
            iban: '[REDACTED]',
          },
          crypto: [
            {
              ...rewrittenValue.crypto[0],
              wallet: '[REDACTED]',
            },
          ],
          date: date.toISOString(),
          error: {
            __unsupported: {
              message: error.message,
              name: error.name,
              stack: error.stack,
              type: 'error',
            },
          },
          bigInt: {
            __unsupported: {
              type: 'bigint',
              value: bigInt.toString(),
              radix: 10,
            },
          },
          circular: {
            ...value,
            address: '[REDACTED]',
            macAddress: '[REDACTED]',
            birthDate: '[REDACTED]',
            ssn: '[REDACTED]',
            ein: '[REDACTED]',
            email: '[REDACTED]',
            phone: '[REDACTED]',
            firstName: '[REDACTED]',
            lastName: '[REDACTED]',
            maidenName: '[REDACTED]',
            username: '[REDACTED]',
            password: '[REDACTED]',
            ip: '[REDACTED]',
            circular: '[[CIRCULAR_REFERENCE: circular.circular]]',
            hair: '[[CIRCULAR_REFERENCE: circular.hair]]',
            bank: '[[CIRCULAR_REFERENCE: circular.bank]]',
            company: '[[CIRCULAR_REFERENCE: circular.company]]',
            crypto: '[[CIRCULAR_REFERENCE: circular.crypto]]',
            date: '[[CIRCULAR_REFERENCE: circular.date]]',
            error: '[[CIRCULAR_REFERENCE: circular.error]]',
            bigInt: {
              __unsupported: {
                type: 'bigint',
                value: bigInt.toString(),
                radix: 10,
              },
            },
          },
        })
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
