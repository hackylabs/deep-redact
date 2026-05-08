export interface DiagnosticEvent {
  readonly details?: Record<string, unknown>;
  readonly event: string;
  readonly message: string;
  readonly path: string;
  readonly valueType: string;
}

export type DiagnosticSink = (event: DiagnosticEvent) => void

export interface DiagnosticsOptions {
  readonly sink?: DiagnosticSink;
}
