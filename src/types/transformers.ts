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
  /**
   * User `Error` transformers run BEFORE regular traversal, in both serialise modes: an `Error`
   * (or subclass such as `AxiosError`) is converted to the plain object you return, which is then
   * scrubbed by `keys`/`paths` rules. Register `Error` subclasses here, not under `custom`.
   */
  readonly Error?: readonly Transformer[];
  readonly Map?: readonly Transformer[];
  readonly RegExp?: readonly Transformer[];
  readonly Set?: readonly Transformer[];
  readonly URL?: readonly Transformer[];
  /**
   * Per-class transformers for arbitrary class instances. These run BEFORE regular traversal, in
   * both serialise modes: the matched instance is converted to the plain object you return, which
   * is then scrubbed by `keys`/`paths` rules. Built-in constructors (`Object`, `Array`, `Date`,
   * `Error`, `Map`, `RegExp`, `Set`, `URL`) are rejected — register `Error` subclasses under
   * `Error`.
   */
  readonly custom?: readonly CustomConstructorTransformerRegistration[];
}

/**
 * How runtime types are represented. User per-class transformers — `byConstructor.custom` and
 * `byConstructor.Error` — run BEFORE regular traversal (in both serialise modes), converting a
 * class instance to a plain object that `keys`/`paths` redaction then scrubs. Every other bucket
 * (`byType`, `fallback`, and user `byConstructor.{Date,Map,RegExp,Set,URL}`) runs only during the
 * serialise pass; relying on that serialise-only behaviour — where the transformer output escapes
 * redaction — is deprecated in favour of the per-class buckets above.
 */
export interface TransformersOption {
  readonly byType?: TransformersByType;
  readonly byConstructor?: TransformersByConstructor;
  /**
   * @deprecated Relying on a transformer that takes effect only during the serialise pass — its
   * output escaping `keys`/`paths` redaction — is deprecated. Prefer `byConstructor.custom` (for
   * arbitrary classes) or `byConstructor.Error`, which run before traversal so the converted value
   * is redacted. `fallback` output is still emitted at serialise time and is not redacted.
   */
  readonly fallback?: readonly Transformer[];
}
