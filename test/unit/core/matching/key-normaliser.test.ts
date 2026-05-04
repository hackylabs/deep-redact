import { describe, expect, it } from 'vitest'
import { canonicaliseKey } from '../../../../src/core/matching/key-normaliser.js'

describe('canonicaliseKey', () => {
  it('lowercases the input', () => {
    expect(canonicaliseKey('PASSWORD')).toBe('password')
  })

  it('removes underscores', () => {
    expect(canonicaliseKey('pass_code')).toBe('passcode')
  })

  it('removes hyphens', () => {
    expect(canonicaliseKey('pass-code')).toBe('passcode')
  })

  it('trims leading and trailing whitespace', () => {
    expect(canonicaliseKey(' password ')).toBe('password')
  })

  it('applies all normalisations in combination', () => {
    expect(canonicaliseKey(' PASS_CODE ')).toBe('passcode')
    expect(canonicaliseKey('PASS-CODE')).toBe('passcode')
    expect(canonicaliseKey('pass_code')).toBe('passcode')
    expect(canonicaliseKey('passCode')).toBe('passcode')
  })

  it('removes all separators when the string consists only of separators', () => {
    expect(canonicaliseKey('__--')).toBe('')
  })

  it('returns an already-normalised string unchanged', () => {
    expect(canonicaliseKey('passcode')).toBe('passcode')
  })

  it('returns an empty string unchanged', () => {
    expect(canonicaliseKey('')).toBe('')
  })
})
