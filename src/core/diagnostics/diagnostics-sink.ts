import type { DiagnosticEvent } from '../../types/diagnostics.js'
import type { CompiledDiagnosticsPlan } from '../compiler/compile-diagnostics.js'

// No configured sink means no diagnostics. There is deliberately no console fallback: a host that
// captures console output and feeds it back through redaction (Sentry breadcrumbs, for example)
// would otherwise turn a single failure into a self-sustaining loop. Opting in is one line —
// `diagnostics: { sink: getNodeConsoleDiagnosticSink() }` (or any custom sink).
export const emitDiagnosticEvent = (
  plan: CompiledDiagnosticsPlan,
  event: DiagnosticEvent,
): void => {
  const sink = plan.sink

  if (sink === undefined) {
    return
  }

  try {
    sink(event)
  } catch {
    return
  }
}
