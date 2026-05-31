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
 *  - Behaviour-change cases: positions where the previous engine and the
 *    rule-driven contract diverge. These are active from the rule-driven
 *    engine's introduction.
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

  describe('Behaviour-change cases (rule-driven contract)', () => {
    describe('a transformable value at a non-configured sibling position', () => {
      const createPayload = () => ({
        user: { password: 'x' },
        when: new Date('2020-01-01T00:00:00.000Z'),
      })

      it('leaves a non-configured Date unchanged in the output (rule-driven contract)', () => {
        const payload = createPayload()
        const redact = deepRedact({ paths: ['user.password'] })

        const output = redact(payload) as { user: { password: string }; when: unknown }

        // The non-configured position is never visited, so the live Date instance
        // is copied by reference into the output unchanged.
        expect(output.when).toBeInstanceOf(Date)
        expect(output.when).toBe(payload.when)
        expect(output.user.password).toBe('[REDACTED]')
      })
    })

    describe('a BigInt root value with exact-path rules configured', () => {
      it('returns a BigInt root unchanged (rule-driven contract — non-object root cannot be targeted by path rules)', () => {
        const redact = deepRedact({ paths: ['a.b'] })

        // Under the rule-driven contract, non-object roots have no addressable properties and
        // are returned as-is. This differs from the old fast-lane behaviour (which delegated
        // BigInt to the general traversal and produced a transformer marker). The new contract
        // is intentional: Story 8.3 will handle BigInt transformation for serialise:true via
        // the serialise-only output adapter.
        expect(redact(42n)).toBe(42n)
      })
    })

    describe('a circular reference at a non-configured position', () => {
      const createPayload = () => {
        const loop: Record<string, unknown> = {}
        loop.self = loop
        return { user: { password: 'x' }, loop }
      }

      it('preserves a non-configured circular reference by identity in the output (rule-driven contract)', () => {
        const payload = createPayload()
        const redact = deepRedact({ paths: ['user.password'] })

        const output = redact(payload) as { user: { password: string }; loop: unknown }

        // The non-configured `loop` is never visited, so it is copied by reference
        // into the new root — same object identity, cycle intact.
        expect(output.loop).toBe(payload.loop)
        expect(output.user.password).toBe('[REDACTED]')
      })
    })
  })
})
