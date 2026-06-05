import type { CompiledTransformersPlan } from '../core/compiler/compile-transformers.js'

const supportedConstructorMatchers = Object.freeze([
  {
    name: 'Date',
    matches: (value: object): value is Date => value instanceof Date,
  },
  {
    name: 'Error',
    matches: (value: object): value is Error => value instanceof Error,
  },
  {
    name: 'Map',
    matches: (value: object): value is Map<unknown, unknown> => value instanceof Map,
  },
  {
    name: 'RegExp',
    matches: (value: object): value is RegExp => value instanceof RegExp,
  },
  {
    name: 'Set',
    matches: (value: object): value is Set<unknown> => value instanceof Set,
  },
  {
    name: 'URL',
    matches: (value: object): value is URL => value instanceof URL,
  },
] as const)

export type SupportedTransformableConstructorName = (typeof supportedConstructorMatchers)[number]['name']
export type SupportedTransformableValueKind = 'bigint' | SupportedTransformableConstructorName

const resolveSupportedConstructorName = (
  value: unknown,
): SupportedTransformableConstructorName | undefined => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  for (const matcher of supportedConstructorMatchers) {
    if (matcher.matches(value)) {
      return matcher.name
    }
  }

  return undefined
}

export const resolveSupportedTransformableValueKind = (
  value: unknown,
): SupportedTransformableValueKind | undefined => {
  if (typeof value === 'bigint') {
    return 'bigint'
  }

  return resolveSupportedConstructorName(value)
}

export const isSupportedTransformableValue = (
  value: unknown,
): boolean => {
  return resolveSupportedTransformableValueKind(value) !== undefined
}

const applyFirstChangingTransformer = (
  value: unknown,
  transformers: readonly ((value: unknown) => unknown)[],
): unknown | undefined => {
  for (const transformer of transformers) {
    const transformed = transformer(value)

    if (transformed !== value) {
      return transformed
    }
  }

  return undefined
}

const resolveCustomConstructorTransformers = (
  value: unknown,
  plan: CompiledTransformersPlan,
): readonly ((value: unknown) => unknown)[] | undefined => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  for (const registration of plan.byConstructor.custom) {
    if (value instanceof registration.constructor) {
      return registration.transformers
    }
  }

  return undefined
}

export const resolveTransformedValue = (
  value: unknown,
  plan: CompiledTransformersPlan,
): unknown | undefined => {
  const supportedValueKind = resolveSupportedTransformableValueKind(value)

  if (supportedValueKind === 'bigint') {
    return applyFirstChangingTransformer(value, [
      ...plan.byType.bigint,
      ...plan.fallback,
    ])
  }

  if (supportedValueKind === undefined) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return undefined
    }

    const byTypeResult = applyFirstChangingTransformer(value, plan.byType.object)

    if (byTypeResult !== undefined) {
      return byTypeResult
    }

    const customConstructorTransformers = resolveCustomConstructorTransformers(value, plan) ?? []

    return applyFirstChangingTransformer(value, [
      ...customConstructorTransformers,
      ...plan.fallback,
    ])
  }

  const byTypeResult = applyFirstChangingTransformer(value, plan.byType.object)

  if (byTypeResult !== undefined) {
    return byTypeResult
  }

  const byConstructorResult = applyFirstChangingTransformer(value, plan.byConstructor[supportedValueKind])

  if (byConstructorResult !== undefined) {
    return byConstructorResult
  }

  const customConstructorTransformers = resolveCustomConstructorTransformers(value, plan) ?? []

  return applyFirstChangingTransformer(value, [
    ...customConstructorTransformers,
    ...plan.fallback,
  ])
}
