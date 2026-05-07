import type { CompiledDiagnosticsPlan } from '../compiler/compile-diagnostics.js'
import type { DiagnosticEvent } from '../../types/diagnostics.js'
import {
  resolveDiagnosticValueType,
  sanitiseDiagnosticDetails,
} from './sanitise-diagnostics.js'

const unsupportedMessage = 'Nested value could not be redacted safely and was replaced with [UNSUPPORTED].'

export type RuntimeFailureStage =
  | 'censor'
  | 'substring-replacer'
  | 'transformer'
  | 'traversal'
  | 'traversal-read'

interface FailureDiagnosticInput {
  readonly error: unknown
  readonly path: string
  readonly stage: RuntimeFailureStage
  readonly value: unknown
  readonly valueType?: string
}

export interface FailureDiagnosticSnapshot {
  readonly details: Record<string, unknown>
  readonly valueType: string
}

const createFallbackDiagnosticDetails = (
  stage: RuntimeFailureStage,
): Record<string, unknown> => {
  return Object.freeze({
    stage,
    thrownType: 'unknown',
  })
}

const resolveFallbackValueType = (
  value: unknown,
  override?: string,
): string => {
  if (override !== undefined) {
    return override
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  return typeof value === 'object'
    ? 'object'
    : typeof value
}

export const createFailureDiagnosticSnapshot = (
  input: Omit<FailureDiagnosticInput, 'path'>,
): FailureDiagnosticSnapshot => {
  let details: Record<string, unknown>
  let valueType: string

  try {
    details = sanitiseDiagnosticDetails(input.stage, input.error)
  } catch {
    details = createFallbackDiagnosticDetails(input.stage)
  }

  try {
    valueType = resolveDiagnosticValueType(input.value, input.valueType)
  } catch {
    valueType = resolveFallbackValueType(input.value, input.valueType)
  }

  return Object.freeze({
    details,
    valueType,
  })
}

export const createDiagnosticEvent = (
  plan: CompiledDiagnosticsPlan,
  path: string,
  snapshot: FailureDiagnosticSnapshot,
): DiagnosticEvent => {
  return Object.freeze({
    details: snapshot.details,
    event: plan.eventName,
    message: unsupportedMessage,
    path,
    valueType: snapshot.valueType,
  })
}

export const createFailureDiagnosticEvent = (
  plan: CompiledDiagnosticsPlan,
  input: FailureDiagnosticInput,
): DiagnosticEvent => {
  return createDiagnosticEvent(plan, input.path, createFailureDiagnosticSnapshot(input))
}
