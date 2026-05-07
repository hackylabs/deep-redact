import { describe, expect, it, vi } from 'vitest'
import { compileDiagnostics } from '../../../../src/core/compiler/compile-diagnostics.js'
import { createFailureDiagnosticEvent } from '../../../../src/core/diagnostics/diagnostic-event.js'
import { emitDiagnosticEvent } from '../../../../src/core/diagnostics/diagnostics-sink.js'

class StoryDiagnosticError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoryDiagnosticError'
  }
}

describe('runtime diagnostics events', () => {
  it('builds stable redaction.failure events with safe details for thrown errors', () => {
    const event = createFailureDiagnosticEvent(compileDiagnostics(), {
      error: new StoryDiagnosticError('token=secret'),
      path: 'payload.secret',
      stage: 'transformer',
      value: new Map<string, unknown>(),
    })

    expect(event).toEqual({
      event: 'redaction.failure',
      path: 'payload.secret',
      valueType: 'Map',
      message: 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].',
      details: {
        errorName: 'StoryDiagnosticError',
        stage: 'transformer',
      },
    })
  })

  it('normalises non-error throws into machine-readable details without leaking secret-bearing messages', () => {
    const event = createFailureDiagnosticEvent(compileDiagnostics(), {
      error: 'password=secret',
      path: 'payload.items.0',
      stage: 'censor',
      value: 'secret',
    })

    expect(event).toEqual({
      event: 'redaction.failure',
      path: 'payload.items.0',
      valueType: 'string',
      message: 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].',
      details: {
        stage: 'censor',
        thrownType: 'string',
      },
    })
    expect(JSON.stringify(event)).not.toMatch(/password=secret/i)
  })

  it('falls back to safe metadata when diagnostic inspection would itself throw', () => {
    const hostileError = new Proxy<Record<string, unknown>>({}, {
      get(target, property, receiver) {
        if (property === 'constructor') {
          throw new Error('error constructor trap')
        }

        return Reflect.get(target, property, receiver)
      },
      getPrototypeOf() {
        throw new Error('prototype trap')
      },
    })
    const hostileValue = new Proxy<Record<string, unknown>>({}, {
      get(target, property, receiver) {
        if (property === 'constructor') {
          throw new Error('value constructor trap')
        }

        return Reflect.get(target, property, receiver)
      },
    })

    expect(() => {
      expect(createFailureDiagnosticEvent(compileDiagnostics(), {
        error: hostileError,
        path: 'payload.hostile',
        stage: 'traversal-read',
        value: hostileValue,
      })).toEqual({
        event: 'redaction.failure',
        path: 'payload.hostile',
        valueType: 'object',
        message: 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].',
        details: {
          stage: 'traversal-read',
          thrownType: 'unknown',
        },
      })
    }).not.toThrow()
  })

  it('routes events through the configured sink and ignores sink failures', () => {
    const sink = vi.fn(() => {
      throw new Error('sink failed')
    })
    const plan = compileDiagnostics({ sink })
    const event = createFailureDiagnosticEvent(plan, {
      error: new StoryDiagnosticError('token=secret'),
      path: 'payload.secret',
      stage: 'transformer',
      value: 42n,
    })

    expect(() => {
      emitDiagnosticEvent(plan, event)
    }).not.toThrow()
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith(event)
  })
})
