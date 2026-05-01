import { describe, expect, it } from 'vitest'
import {
  normalisePathSelector,
  renderSelectorSignature,
} from '../../../../src/core/matching/path-normaliser.js'
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

  it('renders canonical dynamic selector signatures for wildcard and ignore segments', () => {
    expect(renderSelectorSignature(parsePathSelector('users.*.email').segments)).toBe('users.*.email')
    expect(renderSelectorSignature(parsePathSelector('account.**.token').segments)).toBe('account.**.token')
    expect(renderSelectorSignature(parsePathSelector(['users', { ignore: 'admin' }, 'email']).segments)).toBe(
      'users.{ignore:"admin"}.email',
    )
  })

  it('renders deterministic dynamic selector signatures for regex path segments', () => {
    expect(renderSelectorSignature(parsePathSelector(['users', /^tenant-\d+$/i, 'token']).segments)).toBe(
      'users.{regex:{"source":"^tenant-\\\\d+$","flags":"i"}}.token',
    )
    expect(renderSelectorSignature(parsePathSelector(['users', { ignore: /^internal/ }, 'token']).segments)).toBe(
      'users.{ignore-regex:{"source":"^internal","flags":""}}.token',
    )
  })

  it('parses exact structured selectors so they canonicalise like equivalent string selectors', () => {
    expect(normalisePathSelector(['users', 0, 'email']).canonicalPath).toBe('users.0.email')
  })

  it('treats structured string segments as literal properties even when dot syntax would parse them specially', () => {
    expect(normalisePathSelector(['users', '0', 'email']).canonicalPath).toBe('users["0"].email')
    expect(normalisePathSelector(['headers', 'x-api-key']).canonicalPath).toBe('headers["x-api-key"]')
    expect(normalisePathSelector(['users', '*', 'email']).canonicalPath).toBe('users["*"].email')
  })

  it.each([
    ['empty segment', 'users..email', /empty segments/i],
    ['regex-like segment', 'users./^email$/.value', /unsupported regex-like segment/i],
    ['unsafe bare special characters', 'headers.x-api-key', /quoted property syntax/i],
    ['partial wildcard text', 'users.foo*bar.email', /unsupported wildcard syntax/i],
    ['string exclusion syntax', 'users.!admin.email', /unsupported exclusion syntax/i],
    ['multiple recursive wildcard segments', 'users.**.profile.**.email', /at most one recursive wildcard/i],
    ['negative structured numeric segment', ['users', -1, 'email'], /structured numeric segments must be non-negative integers/i],
    ['fractional structured numeric segment', ['users', 1.5, 'email'], /structured numeric segments must be non-negative integers/i],
    ['negative structured ignore index', ['users', { ignore: -1 }, 'email'], /structured ignore indexes must be non-negative integers/i],
    ['structured invalid matcher object', ['users', { match: 'email' }], /unsupported structured selector segment/i],
    ['structured regex-like string segment', ['users', '/^team-/i', 'token'], /unsupported regex-like segment/i],
  ])('rejects %s', (_label, selector, expectedMessage) => {
    expect(() => parsePathSelector(selector as never)).toThrowError(expectedMessage)
    expect(() => parsePathSelector(selector as never)).toThrowError(PathSyntaxError)
  })
})
