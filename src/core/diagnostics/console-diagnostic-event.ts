import type { DiagnosticEvent, DiagnosticSink } from '../../types/diagnostics.js'
import { getNodeConsoleDiagnosticSink } from './node-console-sink.js'

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

export const emitConsoleRecursionBlockedDiagnostic = (
  method: string,
  sink?: DiagnosticSink,
): void => {
  const resolvedSink = sink ?? getNodeConsoleDiagnosticSink()

  if (resolvedSink === undefined) {
    return
  }

  try {
    resolvedSink(createConsoleRecursionBlockedDiagnosticEvent(method))
  } catch {
    return
  }
}
