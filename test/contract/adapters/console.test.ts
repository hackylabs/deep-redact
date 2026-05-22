import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deepRedact,
  type DiagnosticEvent,
  type Redactor,
} from '../../../src/index.js'
import type {
  ConsoleLike,
  ConsoleMethodName,
  RedactedConsole,
} from '../../../src/adapters/console/index.js'

const consoleMethodNames = Object.freeze([
  'debug',
  'error',
  'info',
  'log',
  'trace',
  'warn',
] as const satisfies readonly ConsoleMethodName[])

const outOfScopeMethodNames = Object.freeze([
  'assert',
  'clear',
  'count',
  'countReset',
  'dir',
  'dirxml',
  'group',
  'groupCollapsed',
  'groupEnd',
  'table',
  'time',
  'timeEnd',
  'timeLog',
] as const)

const importConsoleAdapter = async () => import('../../../src/adapters/console/index.js')

interface ConsoleCall {
  readonly args: readonly unknown[];
  readonly method: ConsoleMethodName;
  readonly thisValue: unknown;
}

type ConsoleMethod = (this: ConsoleLike, ...args: unknown[]) => unknown

type ConsoleMethodImplementations = Partial<Record<ConsoleMethodName, ConsoleMethod>>

const createConsoleTarget = (implementations: ConsoleMethodImplementations = {}) => {
  const calls: ConsoleCall[] = []
  const returnValues = Object.fromEntries(
    consoleMethodNames.map((method) => [method, { method, sentinel: true }]),
  ) as Record<ConsoleMethodName, unknown>
  const spies = Object.fromEntries(consoleMethodNames.map((method) => {
    const implementation = implementations[method] ?? function recordCall(
      this: ConsoleLike,
      ...args: unknown[]
    ): unknown {
      calls.push({
        args,
        method,
        thisValue: this,
      })

      return returnValues[method]
    }

    return [method, vi.fn(implementation)]
  })) as Record<ConsoleMethodName, ReturnType<typeof vi.fn>>
  const target = spies as unknown as ConsoleLike

  return {
    calls,
    returnValues,
    spies,
    target,
  }
}

class ConsoleAdapterStoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConsoleAdapterStoryError'
  }
}

const expectSanitisedDiagnostic = (event: DiagnosticEvent, method: ConsoleMethodName): void => {
  expect(event).toEqual({
    details: {
      method,
    },
    event: 'console.recursion_blocked',
    message: 'Nested console adapter call was blocked to prevent a recursive redaction loop.',
    path: '',
    valueType: 'console',
  })
  expect(JSON.stringify(event)).not.toMatch(/secret|hunter2|token=|password=/i)
}

describe('console adapter contract', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the adapter out of the root entrypoint and has no adapter import-time console side effects', async () => {
    const globalConsole = globalThis.console
    const globalMethodReferences = Object.fromEntries(
      consoleMethodNames.map((method) => [method, globalThis.console[method]]),
    )
    const rootPackage = await import('../../../src/index.js')
    const adapterPackage = await importConsoleAdapter()

    expect(rootPackage).not.toHaveProperty('createRedactedConsole')
    expect(adapterPackage).toHaveProperty('createRedactedConsole')
    expect(globalThis.console).toBe(globalConsole)

    for (const method of consoleMethodNames) {
      expect(globalThis.console[method]).toBe(globalMethodReferences[method])
    }
  })

  it('returns a new six-method surface without mutating globals, the supplied target, or independent targets', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const { spies, target } = createConsoleTarget()
    const independent = createConsoleTarget()
    const targetMethodsBefore = Object.fromEntries(
      consoleMethodNames.map((method) => [method, target[method]]),
    )
    const globalConsoleBefore = globalThis.console
    const globalLogBefore = globalThis.console.log
    const redactor = deepRedact({
      keys: ['password'],
    })

    const adapted = createRedactedConsole(redactor, target)
    const payload = {
      password: 'hunter2',
    }

    target.log(payload)
    independent.target.warn(payload)

    expect(adapted).not.toBe(target)
    expect(Reflect.ownKeys(adapted).map(String).sort()).toStrictEqual([...consoleMethodNames].sort())

    for (const method of consoleMethodNames) {
      expect(target[method]).toBe(targetMethodsBefore[method])
    }

    for (const method of outOfScopeMethodNames) {
      expect(adapted).not.toHaveProperty(method)
    }

    expect(globalThis.console).toBe(globalConsoleBefore)
    expect(globalThis.console.log).toBe(globalLogBefore)
    expect(spies.log).toHaveBeenCalledWith(payload)
    expect(independent.spies.warn).toHaveBeenCalledWith(payload)
  })

  it.each(consoleMethodNames)('redacts each %s argument independently and preserves forwarding shape', async (method) => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const realRedactor = deepRedact({
      keys: ['token'],
      paths: ['user.password'],
      stringTests: [
        {
          pattern: /api-key=[^\s]+/g,
          replacer: (value: string, pattern: RegExp) => value.replace(pattern, 'api-key=[REDACTED]'),
        },
      ],
    })
    const redactor = vi.fn((value: unknown) => realRedactor(value))
    const { calls, returnValues, spies, target } = createConsoleTarget()
    const adapted = createRedactedConsole(redactor, target)
    const objectArgument = {
      user: {
        name: 'Ada',
        password: 'hunter2',
      },
    }
    const primitiveArgument = 42
    const arrayArgument = [
      {
        token: 'secret-token',
      },
      'visible',
    ]
    const stringArgument = 'prefix api-key=secret-token suffix'

    const result = adapted[method](
      objectArgument,
      primitiveArgument,
      arrayArgument,
      stringArgument,
    )

    expect(result).toBe(returnValues[method])
    expect(spies[method]).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({
      args: [
        {
          user: {
            name: 'Ada',
            password: '[REDACTED]',
          },
        },
        primitiveArgument,
        [
          {
            token: '[REDACTED]',
          },
          'visible',
        ],
        '[REDACTED]',
      ],
      method,
      thisValue: target,
    })
    expect(redactor).toHaveBeenCalledTimes(4)
    expect(spies[method].mock.calls[0]).toHaveLength(4)
  })

  it('does not pre-format arguments before delegating to the supplied console target', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const redactor = deepRedact({
      keys: ['password'],
    })
    const { spies, target } = createConsoleTarget()
    const adapted = createRedactedConsole(redactor, target)

    adapted.log('user %o', {
      password: 'hunter2',
    })

    expect(spies.log).toHaveBeenCalledWith('user %o', {
      password: '[REDACTED]',
    })
  })

  it('keeps sibling arguments forwarding when one argument degrades to [UNSUPPORTED]', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const diagnostics: DiagnosticEvent[] = []
    const failingDate = new Date('1999-01-01T00:00:00.000Z')
    const realRedactor = deepRedact({
      diagnostics: {
        sink: (event) => {
          diagnostics.push(event)
        },
      },
      keys: ['password'],
      transformers: {
        byConstructor: {
          Date: [
            (value: unknown) => {
              if (value === failingDate) {
                throw new ConsoleAdapterStoryError('password=hunter2')
              }

              return value
            },
          ],
        },
      },
    })
    const redactor = vi.fn((value: unknown) => realRedactor(value))
    const { spies, target } = createConsoleTarget()
    const adapted = createRedactedConsole(redactor, target)

    adapted.error(
      {
        password: 'hunter2',
      },
      failingDate,
      'visible',
    )

    expect(spies.error).toHaveBeenCalledWith(
      {
        password: '[REDACTED]',
      },
      '[UNSUPPORTED]',
      'visible',
    )
    expect(redactor).toHaveBeenCalledTimes(3)
    expect(diagnostics).toHaveLength(1)
    expect(JSON.stringify(diagnostics[0])).not.toMatch(/hunter2|password=hunter2|\[REDACTED\]/i)
  })

  it('uses the private Node fallback for redaction failure diagnostics while the adapter is active', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const fallbackSpy = vi.spyOn(globalThis.console, 'error').mockImplementation(() => undefined)
    const failingDate = new Date('1999-01-01T00:00:00.000Z')
    const realRedactor = deepRedact({
      transformers: {
        byConstructor: {
          Date: [
            (value: unknown) => {
              if (value === failingDate) {
                throw new ConsoleAdapterStoryError('token=secret')
              }

              return value
            },
          ],
        },
      },
    })
    const redactor = vi.fn((value: unknown) => realRedactor(value))
    const { spies, target } = createConsoleTarget()
    const adapted = createRedactedConsole(redactor, target)

    adapted.log(failingDate)

    expect(spies.log).toHaveBeenCalledWith('[UNSUPPORTED]')
    expect(spies.error).not.toHaveBeenCalled()
    expect(redactor).toHaveBeenCalledTimes(1)
    expect(fallbackSpy).toHaveBeenCalledTimes(1)
    expect(fallbackSpy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      event: 'redaction.failure',
      message: 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].',
      path: '',
      valueType: 'Date',
    }))
    expect(JSON.stringify(fallbackSpy.mock.calls[0]?.[0])).not.toMatch(/secret|hunter2|token=|password=/i)
  })

  it('blocks diagnostics sinks that synchronously re-enter the adapted surface while redacting', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const redactionEvents: DiagnosticEvent[] = []
    const guardEvents: DiagnosticEvent[] = []
    const failingDate = new Date('1999-01-01T00:00:00.000Z')
    const adaptedReference: {
      current?: RedactedConsole;
    } = {}
    const realRedactor = deepRedact({
      diagnostics: {
        sink: (event) => {
          redactionEvents.push(event)
          adaptedReference.current?.error('diagnostic', event)
        },
      },
      transformers: {
        byConstructor: {
          Date: [
            (value: unknown) => {
              if (value === failingDate) {
                throw new ConsoleAdapterStoryError('token=secret')
              }

              return value
            },
          ],
        },
      },
    })
    const redactor = vi.fn((value: unknown) => realRedactor(value))
    const { spies, target } = createConsoleTarget()

    const adapted = createRedactedConsole(redactor, target, {
      diagnostics: {
        sink: (event) => {
          guardEvents.push(event)
        },
      },
    })
    adaptedReference.current = adapted

    adapted.log(failingDate)

    expect(spies.log).toHaveBeenCalledWith('[UNSUPPORTED]')
    expect(spies.error).not.toHaveBeenCalled()
    expect(redactor).toHaveBeenCalledTimes(1)
    expect(redactionEvents).toHaveLength(1)
    expect(guardEvents).toHaveLength(1)
    expectSanitisedDiagnostic(guardEvents[0]!, 'error')
  })

  it('blocks target-driven re-entry once per synchronous chain while the outer call completes', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const guardEvents: DiagnosticEvent[] = []
    const adaptedReference: {
      current?: RedactedConsole;
    } = {}
    const implementations: ConsoleMethodImplementations = {
      log() {
        adaptedReference.current?.warn({
          password: 'nested-secret',
        })
        adaptedReference.current?.error('token=nested-secret')

        return 'outer-complete'
      },
    }
    const { spies, target } = createConsoleTarget(implementations)
    const redactor = vi.fn((value: unknown) => deepRedact({
      keys: ['password'],
      stringTests: [/token=[^\s]+/g],
    })(value))

    const adapted = createRedactedConsole(redactor, target, {
      diagnostics: {
        sink: (event) => {
          guardEvents.push(event)
        },
      },
    })
    adaptedReference.current = adapted

    expect(adapted.log({
      password: 'outer-secret',
    })).toBe('outer-complete')
    expect(spies.log).toHaveBeenCalledWith({
      password: '[REDACTED]',
    })
    expect(spies.warn).not.toHaveBeenCalled()
    expect(spies.error).not.toHaveBeenCalled()
    expect(redactor).toHaveBeenCalledTimes(1)
    expect(guardEvents).toHaveLength(1)
    expectSanitisedDiagnostic(guardEvents[0]!, 'warn')
  })

  it('uses the private Node fallback for guard diagnostics without forwarding nested arguments through the target', async () => {
    const { createRedactedConsole } = await importConsoleAdapter()
    const fallbackSpy = vi.spyOn(globalThis.console, 'error').mockImplementation(() => undefined)
    const adaptedReference: {
      current?: RedactedConsole;
    } = {}
    const implementations: ConsoleMethodImplementations = {
      log() {
        adaptedReference.current?.trace({
          password: 'nested-secret',
        })

        return 'outer-complete'
      },
    }
    const { spies, target } = createConsoleTarget(implementations)
    const redactor: Redactor = vi.fn((value: unknown) => deepRedact({
      keys: ['password'],
    })(value))

    const adapted = createRedactedConsole(redactor, target)
    adaptedReference.current = adapted

    expect(adapted.log({
      password: 'outer-secret',
    })).toBe('outer-complete')
    expect(spies.trace).not.toHaveBeenCalled()
    expect(fallbackSpy).toHaveBeenCalledTimes(1)
    expectSanitisedDiagnostic(fallbackSpy.mock.calls[0]?.[0] as DiagnosticEvent, 'trace')
    expect(redactor).toHaveBeenCalledTimes(1)
  })
})
