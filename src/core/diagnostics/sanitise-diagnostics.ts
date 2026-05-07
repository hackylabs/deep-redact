import { resolveSupportedTransformableValueKind } from '../../transformers/resolve-transformer.js'
import type { RuntimeFailureStage } from './diagnostic-event.js'

const resolveObjectValueType = (value: object): string => {
  const constructorName = value.constructor?.name

  if (typeof constructorName === 'string' && constructorName.length > 0 && constructorName !== 'Object') {
    return constructorName
  }

  return 'object'
}

export const resolveDiagnosticValueType = (
  value: unknown,
  override?: string,
): string => {
  if (override !== undefined) {
    return override
  }

  const supportedValueKind = resolveSupportedTransformableValueKind(value)

  if (supportedValueKind !== undefined) {
    return supportedValueKind
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    return resolveObjectValueType(value)
  }

  return typeof value
}

const resolveThrownType = (error: unknown): string => {
  if (error === null) {
    return 'null'
  }

  if (typeof error === 'object') {
    const constructorName = error.constructor?.name

    return typeof constructorName === 'string' && constructorName.length > 0
      ? constructorName
      : 'object'
  }

  return typeof error
}

export const sanitiseDiagnosticDetails = (
  stage: RuntimeFailureStage,
  error: unknown,
): Record<string, unknown> => {
  if (error instanceof Error) {
    return Object.freeze({
      errorName: error.name || 'Error',
      stage,
    })
  }

  return Object.freeze({
    stage,
    thrownType: resolveThrownType(error),
  })
}
