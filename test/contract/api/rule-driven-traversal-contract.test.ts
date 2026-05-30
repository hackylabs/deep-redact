import { describe, expect, it } from 'vitest'
import { deepRedact } from '../../../src/index.js'

/**
 * Contract tests for the rule-driven traversal model documented in
 * docs/architecture/rule-driven-traversal.md.
 *
 * Two groups of cases:
 *
 *  - Invariant cases (active, green): observable behaviour that both the current
 *    engine and the future rule-driven engine produce identically. These form
 *    the regression baseline Stories 8.2–8.5 must preserve.
 *  - Behaviour-change cases (one active baseline + one skipped target each):
 *    positions where the current engine and the rule-driven contract diverge.
 *    The active test pins today's observable output; the skipped test carries
 *    the full target assertion and is activated by Story 8.2.
 *
 * All cases use the public deepRedact(...) API only, so they pin observable
 * behaviour rather than internal lane wiring.
 */
describe('Rule-driven traversal contract', () => {
  describe('Invariant cases (locked baseline)', () => {
    it('redacts the terminal of an exact path that exists in the payload', () => {
      const redact = deepRedact({ paths: ['user.password'] })
      const payload = { user: { password: 'secret', safe: 'visible' } }

      expect(redact(payload)).toStrictEqual({
        user: { password: '[REDACTED]', safe: 'visible' },
      })
    })

    it('silently skips an exact path whose intermediate key is absent, leaving the remainder unaffected', () => {
      const redact = deepRedact({ paths: ['user.profile.password'] })
      const payload = { user: { name: 'ben' }, other: 'visible' }

      expect(redact(payload)).toStrictEqual({
        user: { name: 'ben' },
        other: 'visible',
      })
    })

    it('silently skips an exact path whose terminal key is absent, leaving the remainder unaffected', () => {
      const redact = deepRedact({ paths: ['user.password'] })
      const payload = { user: { name: 'ben' }, other: 'visible' }

      expect(redact(payload)).toStrictEqual({
        user: { name: 'ben' },
        other: 'visible',
      })
    })

    it('delegates a root container with a non-plain prototype and returns it unchanged (prototype pollution guard)', () => {
      const payload = Object.create({ poisoned: true }) as Record<string, unknown>
      payload.secret = 'value'
      const redact = deepRedact({ paths: ['secret'] })

      const output = redact(payload)

      // The non-plain root delegates; the configured terminal is NOT redacted
      // and the input is returned unchanged.
      expect(output).toBe(payload)
      expect((output as Record<string, unknown>).secret).toBe('value')
    })

    it('delegates an intermediate container with a non-plain prototype and does not redact the configured terminal (prototype pollution guard)', () => {
      const a = Object.assign(Object.create({ proto: 1 }), { b: 'secret' })
      const payload = { a }
      const redact = deepRedact({ paths: ['a.b'] })

      const output = redact(payload) as { a: { b: string } }

      // The path delegates; the non-plain intermediate `a` is not traversed, so
      // its `b` is left unredacted. Assert identity too, to prove `a` was passed
      // through untraversed rather than merely never targeted.
      expect(output.a).toBe(a)
      expect(output.a.b).toBe('secret')
    })

    it('applies the censor at a circular reference on a configured terminal without descending or throwing', () => {
      const payload: Record<string, unknown> = {}
      payload.self = payload
      const redact = deepRedact({ paths: ['self'] })

      let output: Record<string, unknown> | undefined
      expect(() => { output = redact(payload) as Record<string, unknown> }).not.toThrow()
      expect(output!.self).toBe('[REDACTED]')
    })
  })

  describe('Behaviour-change cases', () => {
    describe('a transformable value at a non-configured sibling position', () => {
      const createPayload = () => ({
        user: { password: 'x' },
        when: new Date('2020-01-01T00:00:00.000Z'),
      })

      it('currently transforms a non-configured Date via delegation (current observable behaviour)', () => {
        const payload = createPayload()
        const redact = deepRedact({ paths: ['user.password'] })

        const output = redact(payload) as { user: { password: string }; when: unknown }

        // Today the stray Date forces the whole call to delegate to the general
        // traversal, which transforms every transformable value it meets. Assert
        // shape-agnostically: it is simply no longer a live Date instance.
        expect(output.when).not.toBeInstanceOf(Date)
        expect(output.user.password).toBe('[REDACTED]')
      })

      // Activated by Story 8.2
      it.skip('leaves a non-configured Date unchanged in the output (rule-driven contract)', () => {
        const payload = createPayload()
        const redact = deepRedact({ paths: ['user.password'] })

        const output = redact(payload) as { user: { password: string }; when: unknown }

        // Target: the non-configured position is never visited, so the live Date
        // instance is copied by reference into the output unchanged.
        expect(output.when).toBeInstanceOf(Date)
        expect(output.when).toBe(payload.when)
        expect(output.user.password).toBe('[REDACTED]')
      })
    })

    describe('a circular reference at a non-configured position', () => {
      const createPayload = () => {
        const loop: Record<string, unknown> = {}
        loop.self = loop
        return { user: { password: 'x' }, loop }
      }

      it('currently completes and replaces a non-configured circular reference with a marker (current observable behaviour)', () => {
        const payload = createPayload()
        const redact = deepRedact({ paths: ['user.password'] })

        let output: { user: { password: string }; loop: unknown } | undefined
        expect(() => {
          output = redact(payload) as { user: { password: string }; loop: unknown }
        }).not.toThrow()

        // Today the fast lane recurses into `loop`, overflows, is caught, and
        // delegates; the general traversal replaces the circular position with a
        // circular marker — so the output's `loop` is NOT the raw reference.
        expect(output!.user.password).toBe('[REDACTED]')
        expect(output!.loop).not.toBe(payload.loop)
      })

      // Activated by Story 8.2
      it.skip('preserves a non-configured circular reference by identity in the output (rule-driven contract)', () => {
        const payload = createPayload()
        const redact = deepRedact({ paths: ['user.password'] })

        const output = redact(payload) as { user: { password: string }; loop: unknown }

        // Target: the non-configured `loop` is never visited, so it is copied by
        // reference into the new root — same object identity, cycle intact.
        expect(output.loop).toBe(payload.loop)
        expect(output.user.password).toBe('[REDACTED]')
      })
    })
  })
})
