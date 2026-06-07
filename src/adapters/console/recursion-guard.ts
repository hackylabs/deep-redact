import type { DiagnosticSink } from '../../types/public.js'
import { emitConsoleRecursionBlockedDiagnostic } from '../../core/diagnostics/console-diagnostic-event.js'
import type { ConsoleMethodName } from './create-redacted-console.js'

export interface ConsoleRecursionGuard {
  readonly block: (method: ConsoleMethodName) => undefined;
  readonly isActive: () => boolean;
  readonly run: <T>(operation: () => T) => T;
}

export interface ConsoleRecursionGuardOptions {
  readonly diagnostics?: {
    readonly sink?: DiagnosticSink;
  };
}

export const createConsoleRecursionGuard = (
  options: ConsoleRecursionGuardOptions = {},
): ConsoleRecursionGuard => {
  let active = false
  let emittedForActiveChain = false
  const sink = options.diagnostics?.sink

  return {
    block(method) {
      if (!emittedForActiveChain) {
        emittedForActiveChain = true
        emitConsoleRecursionBlockedDiagnostic(method, sink)
      }

      return undefined
    },
    isActive() {
      return active
    },
    run(operation) {
      active = true
      emittedForActiveChain = false

      try {
        return operation()
      } finally {
        active = false
        emittedForActiveChain = false
      }
    },
  }
}
