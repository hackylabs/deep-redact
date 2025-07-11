import { describe, it, expect } from 'vitest'
import { _bigint } from '../../src/utils/standardTransformers/bigint'
import { _date } from '../../src/utils/standardTransformers/date'
import { _error } from '../../src/utils/standardTransformers/error'
import { _map } from '../../src/utils/standardTransformers/map'
import { _set } from '../../src/utils/standardTransformers/set'
import { _url } from '../../src/utils/standardTransformers/url'
import { _regex } from '../../src/utils/standardTransformers/regex'

describe('bigint', () => {
  describe('when the value is a bigint', () => {
    it('should return the value as a string', () => {
      expect(_bigint(BigInt(2))).toEqual({ value: { radix: 10, number: '2' }, _transformer: 'bigint' })
    })
  })

  describe('when the value is not a bigint', () => {
    it('should return the value unchanged', () => {
      expect(_bigint('not a bigint')).toEqual('not a bigint')
    })
  })
})

describe('date', () => {
  describe('when the value is a date', () => {
    it('should return the value as a string', () => {
      const date = new Date()
      expect(_date(date)).toEqual({ datetime: date.toISOString(), _transformer: 'date' })
    })
  })

  describe('when the value is not a date', () => {
    it('should return the value unchanged', () => {
      expect(_date('not a date')).toEqual('not a date')
    })
  })
})

describe('error', () => {
  describe('when the value is an error', () => {
    it('should return the value as a string', () => {
      class TestError extends Error {
        constructor(message: string) {
          super(message)
        }
      }
      const error = new TestError('test')
      expect(_error(error)).toEqual({ value: { type: 'TestError', message: 'test', stack: error.stack }, _transformer: 'error' })
    })
  })

  describe('when the value is not an error', () => {
    it('should return the value unchanged', () => {
      expect(_error('not an error')).toEqual('not an error')
    })
  })
})

describe('map', () => {
  describe('when the value is a map', () => {
    it('should return the value as a string', () => {
      const map = new Map()
      map.set('a', 'b')
      expect(_map(map)).toEqual({ value: { a: 'b' }, _transformer: 'map' })
    })
  })

  describe('when the value is not a map', () => {
    it('should return the value unchanged', () => {
      expect(_map('not a map')).toEqual('not a map')
    })
  })
})

describe('regex', () => {
  describe('when the value is a regex', () => {
    it('should return the value as a string', () => {
      expect(_regex(new RegExp('a', 'g'))).toEqual({ value: { source: 'a', flags: 'g' }, _transformer: 'regex' })
    })
  })

  describe('when the value is not a regex', () => {
    it('should return the value unchanged', () => {
      expect(_regex('not a regex')).toEqual('not a regex')
    })
  })
})

describe('set', () => {
  describe('when the value is a set', () => {
    it('should return the value as a string', () => {
      const set = new Set()
      set.add('a')
      expect(_set(set)).toEqual({ value: ['a'], _transformer: 'set' })
    })
  })

  describe('when the value is not a set', () => {
    it('should return the value unchanged', () => {
      expect(_set('not a set')).toEqual('not a set')
    })
  })
})

describe('url', () => {
  describe('when the value is a url', () => {
    it('should return the value as a string', () => {
      expect(_url(new URL('https://example.com?a=b'))).toEqual({ value: 'https://example.com/?a=b', _transformer: 'url' })
    })
  })

  describe('when the value is not a url', () => {
    it('should return the value unchanged', () => {
      expect(_url('not a url')).toEqual('not a url')
    })
  })
})
