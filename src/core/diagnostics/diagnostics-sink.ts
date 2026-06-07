import type { DiagnosticEvent } from '../../types/diagnostics.js'
import type { CompiledDiagnosticsPlan } from '../compiler/compile-diagnostics.js'
import { getNodeConsoleDiagnosticSink } from './node-console-sink.js'

export const emitDiagnosticEvent = (
  plan: CompiledDiagnosticsPlan,
  event: DiagnosticEvent,
): void => {
  const sink = plan.sink ?? getNodeConsoleDiagnosticSink()

  if (sink === undefined) {
    return
  }

  try {
    sink(event)
  } catch {
    return
  }
}
