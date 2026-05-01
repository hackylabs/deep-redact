import type { Censor, PathEntry } from './paths.js'

export type SerialiseOption = boolean | ((value: unknown) => string)
export type KeySelector = string | RegExp

export interface DeepRedactOptions {
  readonly censor?: Censor
  readonly keys?: readonly KeySelector[]
  readonly paths?: readonly PathEntry[]
  readonly remove?: boolean
  readonly retainStructure?: boolean
  readonly serialise?: SerialiseOption
}
