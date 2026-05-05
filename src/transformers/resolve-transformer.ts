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

type SupportedConstructorName = (typeof supportedConstructorMatchers)[number]['name']

const resolveSupportedConstructorName = (
  value: unknown,
): SupportedConstructorName | undefined => {
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

export const isSupportedTransformableObject = (
  value: unknown,
): value is object => {
  return resolveSupportedConstructorName(value) !== undefined
}

export const isSupportedTransformableValue = (
  value: unknown,
): boolean => {
  return typeof value === 'bigint' || isSupportedTransformableObject(value)
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

export const resolveTransformedValue = (
  value: unknown,
  plan: CompiledTransformersPlan,
): unknown | undefined => {
  if (typeof value === 'bigint') {
    return applyFirstChangingTransformer(value, [
      ...plan.byType.bigint,
      ...plan.fallback,
    ])
  }

  const constructorName = resolveSupportedConstructorName(value)

  if (constructorName === undefined) {
    return undefined
  }

  return applyFirstChangingTransformer(value, [
    ...plan.byType.object,
    ...plan.byConstructor[constructorName],
    ...plan.fallback,
  ])
}
