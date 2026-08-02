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

// User per-class transformers eligible to run BEFORE regular traversal (in both serialise modes),
// converting a class instance to a plain object that normal `keys`/`paths` redaction then scrubs.
// Deliberately excludes the built-in default transformers so an unconfigured `Error`/`Date`/… stays
// a terminal leaf; the serialise-pass representation is unchanged (and now deprecated for reliance).
export interface CompiledPreTraversalTransformers {
  // True when the user configured at least one eligible per-class transformer: a
  // `byConstructor.custom` registration, or a `byConstructor.Error` entry.
  readonly enabled: boolean;
  // The user-supplied `byConstructor.Error` transformers only — WITHOUT the appended built-in
  // `errorTransformer` (which remains serialise-only).
  readonly errorUser: readonly Transformer[];
}

export interface CompiledTransformersPlan {
  readonly byType: CompiledTransformersByType;
  readonly byConstructor: CompiledTransformersByConstructor;
  readonly fallback: readonly Transformer[];
  readonly preTraversal: CompiledPreTraversalTransformers;
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
  const byConstructor = compileByConstructor(configured?.byConstructor)
  // Read the user Error transformers from the RAW config so the appended built-in default is
  // excluded (it is the last element of the merged `byConstructor.Error` array).
  const errorUser = Object.freeze([...(configured?.byConstructor?.Error ?? [])])

  return Object.freeze({
    byType: compileByType(configured?.byType),
    byConstructor,
    fallback: mergeTransformers(configured?.fallback),
    preTraversal: Object.freeze({
      enabled: byConstructor.custom.length > 0 || errorUser.length > 0,
      errorUser,
    }),
  })
}
