import type { DiagnosticsOptions, DiagnosticSink } from '../../types/diagnostics.js'

export interface CompiledDiagnosticsPlan {
  readonly eventName: 'redaction.failure'
  readonly sink?: DiagnosticSink
}

export const compileDiagnostics = (
  diagnostics?: DiagnosticsOptions,
): CompiledDiagnosticsPlan => {
  return Object.freeze({
    eventName: 'redaction.failure' as const,
    sink: diagnostics?.sink,
  })
}
