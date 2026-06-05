import type {
  CustomConstructorTransformerRegistration,
  Transformer,
  TransformersByConstructor,
  TransformersByType,
  TransformersOption,
} from '../../types/transformers.js'
import {
  bigintTransformer,
  dateTransformer,
  errorTransformer,
  mapTransformer,
  regexTransformer,
  setTransformer,
  urlTransformer,
} from '../../transformers/built-ins.js'

const emptyTransformers = Object.freeze([]) as readonly Transformer[]

export interface CompiledTransformersByType {
  readonly bigint: readonly Transformer[];
  readonly object: readonly Transformer[];
}

export interface CompiledTransformersByConstructor {
  readonly Date: readonly Transformer[];
  readonly Error: readonly Transformer[];
  readonly Map: readonly Transformer[];
  readonly RegExp: readonly Transformer[];
  readonly Set: readonly Transformer[];
  readonly URL: readonly Transformer[];
  readonly custom: readonly CompiledCustomConstructorTransformers[];
}

export interface CompiledCustomConstructorTransformers {
  readonly constructor: CustomConstructorTransformerRegistration['constructor'];
  readonly transformers: readonly Transformer[];
}

export interface CompiledTransformersPlan {
  readonly byType: CompiledTransformersByType;
  readonly byConstructor: CompiledTransformersByConstructor;
  readonly fallback: readonly Transformer[];
}

const mergeTransformers = (
  configured: readonly Transformer[] | undefined,
  builtIns: readonly Transformer[] = emptyTransformers,
): readonly Transformer[] => {
  return Object.freeze([
    ...(configured ?? emptyTransformers),
    ...builtIns,
  ])
}

const compileByType = (
  configured: TransformersByType | undefined,
): CompiledTransformersByType => {
  return Object.freeze({
    bigint: mergeTransformers(configured?.bigint, Object.freeze([bigintTransformer])),
    object: mergeTransformers(configured?.object),
  })
}

const compileByConstructor = (
  configured: TransformersByConstructor | undefined,
): CompiledTransformersByConstructor => {
  const customRegistrations = configured?.custom ?? []

  return Object.freeze({
    Date: mergeTransformers(configured?.Date, Object.freeze([dateTransformer])),
    Error: mergeTransformers(configured?.Error, Object.freeze([errorTransformer])),
    Map: mergeTransformers(configured?.Map, Object.freeze([mapTransformer])),
    RegExp: mergeTransformers(configured?.RegExp, Object.freeze([regexTransformer])),
    Set: mergeTransformers(configured?.Set, Object.freeze([setTransformer])),
    URL: mergeTransformers(configured?.URL, Object.freeze([urlTransformer])),
    custom: Object.freeze(customRegistrations.map((registration) => {
      return Object.freeze({
        constructor: registration.constructor,
        transformers: mergeTransformers(registration.transformers),
      })
    })),
  })
}

export const compileTransformers = (
  configured: TransformersOption | undefined,
): CompiledTransformersPlan => {
  return Object.freeze({
    byType: compileByType(configured?.byType),
    byConstructor: compileByConstructor(configured?.byConstructor),
    fallback: mergeTransformers(configured?.fallback),
  })
}
