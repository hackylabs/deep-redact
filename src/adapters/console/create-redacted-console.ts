import type { DiagnosticSink, Redactor } from '../../types/public.js'
import { createConsoleRecursionGuard } from './recursion-guard.js'

export type ConsoleMethodName =
  | 'debug'
  | 'error'
  | 'info'
  | 'log'
  | 'trace'
  | 'warn'

type ConsoleMethod = (...args: unknown[]) => unknown

export interface ConsoleLike {
  readonly debug: ConsoleMethod;
  readonly error: ConsoleMethod;
  readonly info: ConsoleMethod;
  readonly log: ConsoleMethod;
  readonly trace: ConsoleMethod;
  readonly warn: ConsoleMethod;
}

export interface ConsoleRedactionOptions {
  readonly diagnostics?: {
    readonly sink?: DiagnosticSink;
  };
}

export type RedactedConsole = ConsoleLike

const consoleMethodNames = Object.freeze([
  'debug',
  'error',
  'info',
  'log',
  'trace',
  'warn',
] as const satisfies readonly ConsoleMethodName[])

export const createRedactedConsole = (
  redactor: Redactor,
  target: ConsoleLike,
  options: ConsoleRedactionOptions = {},
): RedactedConsole => {
  const guard = createConsoleRecursionGuard(options)
  const adapted = {} as Record<ConsoleMethodName, ConsoleMethod>

  for (const method of consoleMethodNames) {
    adapted[method] = (...args: unknown[]): unknown => {
      if (guard.isActive()) {
        return guard.block(method)
      }

      return guard.run(() => {
        const redactedArgs = args.map((argument) => redactor(argument))

        return target[method](...redactedArgs)
      })
    }
  }

  return adapted
}
