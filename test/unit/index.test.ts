import {
  describe, it, expect, beforeEach, afterEach, vi, MockInstance,
} from 'vitest'
import {
  type IHeapSnapshot, type Nullable, config, takeNodeMinimalHeap,
} from '@memlab/core'
import { DeepRedact } from '../../src'
import { dummyUser } from '../setup/dummyUser'
import { blacklistedKeys } from '../setup/blacklist'
import RedactorUtils from '../../src/utils/'
import { BaseDeepRedactConfig } from '../../src/types'
import { standardTransformers } from '../../src/utils/standardTransformers'

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
      const deepRedactConfig: Required<Pick<BaseDeepRedactConfig, 'blacklistedKeys'>> = {
        blacklistedKeys,
      }

      describe('serialize', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({
            ...deepRedactConfig,
            serialize: true
          })
        })

        it('should set the serialise config to true', () => {
          // @ts-expect-error - config is private but we're testing it
          expect(deepRedact.config.serialise).toBe(true)
        })
      })

      describe('serialise', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({
            ...deepRedactConfig,
            serialise: true
          })
        })

        it('should set the serialise config to true', () => {
          // @ts-expect-error - config is private but we're testing it
          expect(deepRedact.config.serialise).toBe(true)
        })
      })
  
      describe('redactorUtils', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ ...deepRedactConfig })
        })

        it('should should setup the redactorUtils with the serialise config set to true', () => {
          // @ts-expect-error - config is private but we're testing it
          expect(deepRedact.redactorUtils.config).toEqual({
            ...deepRedactConfig,
            caseSensitiveKeyMatch: true,
            fuzzyKeyMatch: false,
            retainStructure: false,
            remove: false,
            replaceStringByLength: false,
            partialStringTests: [],
            stringTests: [],
            transformers: standardTransformers,
            replacement: '[REDACTED]',
            types: ['string'],
          })
        })
      })
    })

    describe('redact', () => {
      let deepRedact: DeepRedact
      let traverseSpy: MockInstance<typeof RedactorUtils.prototype.traverse>
      let result: unknown

      describe('no serialise', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ blacklistedKeys })
          // @ts-expect-error - redactorUtils is private but we're testing it
          traverseSpy = vi.spyOn(deepRedact.redactorUtils, 'traverse')
          result = deepRedact.redact({ firstName: 'John', lastName: 'Doe', some: 'thing' })
        })
  
        it('should call traverse with the value', () => {
          expect(traverseSpy).toHaveBeenCalledOnce()
          expect(traverseSpy).toHaveBeenNthCalledWith(1, { firstName: 'John', lastName: 'Doe', some: 'thing' })
        })
  
        it('should return the redacted value', () => {
          expect(result).toEqual({ firstName: '[REDACTED]', lastName: '[REDACTED]', some: 'thing' })
        })
      })

      describe('serialise', () => {
        beforeEach(() => {
          deepRedact = new DeepRedact({ blacklistedKeys, serialise: true })
          result = deepRedact.redact({ firstName: 'John', lastName: 'Doe', some: 'thing' })
        })

        it('should return the redacted value', () => {
          expect(result).toEqual(JSON.stringify({ firstName: '[REDACTED]', lastName: '[REDACTED]', some: 'thing' }))
        })
      })
    })
  })
})
