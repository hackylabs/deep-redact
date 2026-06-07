export type Transformer = (value: unknown) => unknown

export interface CustomConstructorTransformerRegistration {
  readonly constructor: abstract new (...args: never[]) => object;
  readonly transformers: readonly Transformer[];
}

export interface TransformersByType {
  readonly bigint?: readonly Transformer[];
  readonly object?: readonly Transformer[];
}

export interface TransformersByConstructor {
  readonly Date?: readonly Transformer[];
  readonly Error?: readonly Transformer[];
  readonly Map?: readonly Transformer[];
  readonly RegExp?: readonly Transformer[];
  readonly Set?: readonly Transformer[];
  readonly URL?: readonly Transformer[];
  readonly custom?: readonly CustomConstructorTransformerRegistration[];
}

export interface TransformersOption {
  readonly byType?: TransformersByType;
  readonly byConstructor?: TransformersByConstructor;
  readonly fallback?: readonly Transformer[];
}
