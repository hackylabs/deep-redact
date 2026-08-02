import type { DiagnosticEvent, DiagnosticSink } from '../../types/diagnostics.js'

const consoleRecursionBlockedMessage = 'Nested console adapter call was blocked to prevent a recursive redaction loop.'

export const createConsoleRecursionBlockedDiagnosticEvent = (
  method: string,
): DiagnosticEvent => {
  return Object.freeze({
    details: Object.freeze({
      method,
    }),
    event: 'console.recursion_blocked',
    message: consoleRecursionBlockedMessage,
    path: '',
    valueType: 'console',
  })
}

// As with the traversal diagnostics, an unconfigured sink is silent. Writing to the console here
// would be worse than elsewhere: the adapter exists precisely because console output is being
// redacted, so a console diagnostic would re-enter the surface it is reporting on.
export const emitConsoleRecursionBlockedDiagnostic = (
  method: string,
  sink?: DiagnosticSink,
): void => {
  if (sink === undefined) {
    return
  }

  try {
    sink(createConsoleRecursionBlockedDiagnosticEvent(method))
  } catch {
    return
  }
}
