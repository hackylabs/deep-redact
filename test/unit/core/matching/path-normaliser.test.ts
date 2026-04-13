import { describe, expect, it } from 'vitest'
import { normalisePathSelector } from '../../../../src/core/matching/path-normaliser.js'
import { PathSyntaxError, parsePathSelector } from '../../../../src/core/matching/path-parser.js'

describe('exact path selector parsing and normalisation', () => {
  it('treats dot and bracket array index forms as the same canonical path', () => {
    expect(normalisePathSelector('users[0].email').canonicalPath).toBe('users.0.email')
    expect(normalisePathSelector('users.0.email').canonicalPath).toBe('users.0.email')
  })

  it('keeps quoted literal properties canonical where dot syntax would be ambiguous', () => {
    expect(normalisePathSelector('headers[\'x-api-key\']').canonicalPath).toBe('headers["x-api-key"]')
    expect(normalisePathSelector('["0"].value').canonicalPath).toBe('["0"].value')
  })

  it.each([
    ['empty segment', 'users..email', /empty segments/i],
    ['wildcard segment', 'users.*.email', /unsupported wildcard segment/i],
    ['recursive wildcard segment', 'users.**.email', /unsupported recursive wildcard segment/i],
    ['regex-like segment', 'users./^email$/.value', /unsupported regex-like segment/i],
    ['unsafe bare special characters', 'headers.x-api-key', /quoted property syntax/i],
  ])('rejects %s', (_label, selector, expectedMessage) => {
    expect(() => parsePathSelector(selector)).toThrowError(expectedMessage)
    expect(() => parsePathSelector(selector)).toThrowError(PathSyntaxError)
  })
})
