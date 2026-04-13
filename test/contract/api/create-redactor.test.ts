import { describe, expect, it, vi } from 'vitest'
import { createRedactor, deepRedact } from '../../../src/index.js'

describe('Reusable redactor factory contract', () => {
  it('returns a callable redactor and defers serialisation work until invocation', () => {
    const serialise = vi.fn((value: unknown) => JSON.stringify(value))
    const redact = deepRedact({
      paths: ['user.password'],
      serialise,
    })

    expect(typeof redact).toBe('function')
    expect(serialise).not.toHaveBeenCalled()

    const payload = { user: { password: 'secret' } }

    expect(redact(payload)).toBe(JSON.stringify(payload))
    expect(serialise).toHaveBeenCalledTimes(1)
    expect(serialise).toHaveBeenCalledWith(payload)
  })

  it('reuses init-time configuration across repeated payload calls', () => {
    const options = {
      paths: ['user.password'],
      serialise: false,
    }
    const redact = deepRedact(options)
    const firstPayload = { attempt: 1 }
    const secondPayload = { attempt: 2 }

    expect(redact(firstPayload)).toBe(firstPayload)

    options.serialise = true

    expect(redact(secondPayload)).toBe(secondPayload)
  })

  it('exposes createRedactor as the same public factory alias', () => {
    const payload = { ok: true }

    expect(createRedactor).toBe(deepRedact)
    expect(createRedactor({ serialise: true })(payload)).toBe(JSON.stringify(payload))
  })

  it('returns structured output unchanged when serialise is omitted', () => {
    const payload = { ok: true }
    const redact = deepRedact({
      paths: ['user.password'],
    })

    expect(redact(payload)).toBe(payload)
  })

  it.each([
    ['null config', null, /options must be an object/i],
    ['unsupported root option', { serialize: true }, /unsupported option "serialize"/i],
    ['invalid serialise value', { serialise: 'json' }, /serialise must be a boolean or function/i],
    ['invalid paths container', { paths: 'user.password' }, /paths must be an array/i],
    ['invalid path entry', { paths: [42] }, /paths\[0\] must be a string selector or path-rule object/i],
    ['missing path on path rule', { paths: [{ remove: true }] }, /paths\[0\]\.path: path must be a string/i],
  ])('fails fast for %s', (_label, options, expectedMessage) => {
    expect(() => deepRedact(options as never)).toThrowError(expectedMessage)
  })

  it.each([
    [
      'root remove and censor',
      { remove: true, censor: '[REDACTED]' },
      /remove cannot be combined with censor/i,
    ],
    [
      'root remove and retainStructure',
      { remove: true, retainStructure: true },
      /remove cannot be combined with retainStructure/i,
    ],
    [
      'path remove and censor',
      { paths: [{ path: 'user.password', remove: true, censor: '[REDACTED]' }] },
      /paths\[0\].*remove cannot be combined with censor/i,
    ],
    [
      'path remove and retainStructure',
      { paths: [{ path: 'user.password', remove: true, retainStructure: true }] },
      /paths\[0\].*remove cannot be combined with retainStructure/i,
    ],
    [
      'global remove inherited by path censor',
      { remove: true, paths: [{ path: 'user.password', censor: '[REDACTED]' }] },
      /paths\[0\].*remove cannot be combined with censor/i,
    ],
    [
      'global censor inherited by path remove',
      { censor: '[REDACTED]', paths: [{ path: 'user.password', remove: true }] },
      /paths\[0\].*remove cannot be combined with censor/i,
    ],
    [
      'global remove inherited by path retainStructure',
      { remove: true, paths: [{ path: 'user.password', retainStructure: true }] },
      /paths\[0\].*remove cannot be combined with retainStructure/i,
    ],
    [
      'global retainStructure inherited by path remove',
      { retainStructure: true, paths: [{ path: 'user.password', remove: true }] },
      /paths\[0\].*remove cannot be combined with retainStructure/i,
    ],
  ])('rejects conflicting options for %s', (_label, options, expectedMessage) => {
    expect(() => deepRedact(options)).toThrowError(expectedMessage)
  })
})
