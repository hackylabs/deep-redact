import type { DiagnosticSink } from '../../types/diagnostics.js'

interface NodeProcessLike {
  readonly versions?: {
    readonly node?: string;
  };
}

const isNodeRuntime = (): boolean => {
  const process = (globalThis as { readonly process?: NodeProcessLike }).process

  return typeof process?.versions?.node === 'string'
}

export const getNodeConsoleDiagnosticSink = (): DiagnosticSink | undefined => {
  if (!isNodeRuntime() || typeof globalThis.console?.error !== 'function') {
    return undefined
  }

  const consoleTarget = globalThis.console
  const error = consoleTarget.error

  return (event) => {
    error.call(consoleTarget, event)
  }
}
