import { describe, expect, it } from 'vitest'
import { deepRedact, type FunctionCensorContext } from '../../../src/index.js'
import { compileRedactorPlan } from '../../../src/core/compiler/compile-redactor-plan.js'

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
 * behaviour rather than internal execution-mode wiring.
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
        // are returned as-is. This differs from the old compiled-executor behaviour (which delegated
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

  describe('Single-level wildcard cases (Story 8.4)', () => {
    it('redacts a wildcard terminal matching several enumerated keys', () => {
      const redact = deepRedact({ paths: ['*.email'] })
      const payload = {
        users: { email: 'u@example.com', name: 'keep' },
        accounts: { email: 'a@example.com' },
        other: 5,
      }

      expect(redact(payload)).toStrictEqual({
        users: { email: '[REDACTED]', name: 'keep' },
        accounts: { email: '[REDACTED]' },
        other: 5,
      })
    })

    it('redacts a mid-path wildcard with exact segments before and after — a.*.b', () => {
      const redact = deepRedact({ paths: ['a.*.b'] })
      const payload = { a: { x: { b: 1, c: 2 }, y: { b: 3 } } }

      expect(redact(payload)).toStrictEqual({
        a: { x: { b: '[REDACTED]', c: 2 }, y: { b: '[REDACTED]' } },
      })
    })

    it('enumerates array indices under a wildcard, skipping non-object elements', () => {
      const redact = deepRedact({ paths: ['list.*.secret'] })
      const payload = { list: [{ secret: 's1', keep: 1 }, { secret: 's2' }, 7] }

      expect(redact(payload)).toStrictEqual({
        list: [{ secret: '[REDACTED]', keep: 1 }, { secret: '[REDACTED]' }, 7],
      })
    })

    it('leaves a non-configured transformable sibling under a wildcard config raw, by identity', () => {
      const redact = deepRedact({ paths: ['*.email'] })
      const when = new Date('2020-01-01T00:00:00.000Z')
      const payload = { user: { email: 'u@example.com', when } }

      const output = redact(payload) as { user: { email: string; when: unknown } }

      expect(output.user.email).toBe('[REDACTED]')
      // The non-configured Date sibling is never visited, so it is carried over unchanged.
      expect(output.user.when).toBe(when)
    })

    it('honours exact-path-over-wildcard precedence at a shared level — a.b wins over a.*', () => {
      const redact = deepRedact({
        paths: [
          { path: 'a.b', censor: '[EXACT-B]' },
          { path: 'a.*', censor: '[WILD]' },
        ],
      })
      const payload = { a: { b: 'B', c: 'C', d: 'D' } }

      expect(redact(payload)).toStrictEqual({
        a: { b: '[EXACT-B]', c: '[WILD]', d: '[WILD]' },
      })
    })

    it('redacts a wildcard leaf reached past a non-terminal exact intermediate — a.b.c + a.*.d', () => {
      // The exact path a.b.c makes `b` an intermediate key; the wildcard a.*.d must still reach
      // a.b.d through it (this overlap routes to the general traversal, which resolves it). Found
      // in review of Story 8.4: the rule-driven dedup had skipped `b` and left a.b.d raw.
      const redact = deepRedact({ paths: ['a.b.c', 'a.*.d'] })
      const payload = { a: { b: { c: 1, d: 2 }, x: { d: 3 } } }

      expect(redact(payload)).toStrictEqual({
        a: { b: { c: '[REDACTED]', d: '[REDACTED]' }, x: { d: '[REDACTED]' } },
      })
    })
  })

  describe('Double wildcard boundary cases (Story 8.5)', () => {
    it('routes recursive wildcard selectors to the breadth-visiting traversal mode', () => {
      expect(compileRedactorPlan({ paths: ['account.**.token'] }).pathDrivenOnly).toBe(false)
    })

    it('redacts recursive wildcard matches across zero, one, and many intermediate segments', () => {
      const redact = deepRedact({ paths: ['account.**.token'] })

      expect(redact({
        account: {
          token: 'root-token',
          session: {
            token: 'session-token',
            safe: 'keep-session',
          },
          audit: {
            session: {
              token: 'audit-token',
            },
          },
          safe: 'keep-account',
        },
        token: 'root-sibling',
      })).toStrictEqual({
        account: {
          token: '[REDACTED]',
          session: {
            token: '[REDACTED]',
            safe: 'keep-session',
          },
          audit: {
            session: {
              token: '[REDACTED]',
            },
          },
          safe: 'keep-account',
        },
        token: 'root-sibling',
      })
    })

    it('delivers concrete matched paths and the recursive wildcard rule path to function censors', () => {
      const contexts: FunctionCensorContext[] = []
      const redact = deepRedact({
        paths: [{
          path: 'account.**.token',
          censor: (_value: unknown, context: FunctionCensorContext) => {
            contexts.push(context)
            return '[FN]'
          },
        }],
      })

      redact({
        account: {
          token: 'root-token',
          session: {
            token: 'session-token',
          },
          audit: {
            session: {
              token: 'audit-token',
            },
          },
        },
      })

      expect(contexts.map((context) => context.matchedPath).sort()).toStrictEqual([
        ['account', 'audit', 'session', 'token'],
        ['account', 'session', 'token'],
        ['account', 'token'],
      ])
      for (const context of contexts) {
        expect(context.rulePath).toStrictEqual(['account', { anyDepth: true }, 'token'])
        expect(context.terminalKey).toBe('token')
      }
    })

    it('leaves non-redacted runtime-value siblings raw under serialise: false', () => {
      const when = new Date('2026-06-05T08:00:00.000Z')
      const metadata = new Map<string, unknown>([['token', 'map-token']])
      const circular: Record<string, unknown> = { label: 'loop' }
      circular.self = circular
      const payload = {
        account: {
          token: 'root-token',
        },
        circular,
        metadata,
        when,
      }
      const redact = deepRedact({ paths: ['account.**.token'] })

      const output = redact(payload) as typeof payload

      expect(output.account.token).toBe('[REDACTED]')
      expect(output.when).toBe(when)
      expect(output.metadata).toBe(metadata)
      expect(output.circular).toBe(circular)
      expect(output.circular.self).toBe(circular)
    })
  })
})
