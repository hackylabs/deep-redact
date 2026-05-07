import type { DiagnosticEvent } from '../../types/diagnostics.js'
import type { CompiledDiagnosticsPlan } from '../compiler/compile-diagnostics.js'

export const emitDiagnosticEvent = (
  plan: CompiledDiagnosticsPlan,
  event: DiagnosticEvent,
): void => {
  if (plan.sink === undefined) {
    return
  }

  try {
    plan.sink(event)
  } catch {}
}
