import type { Censor, PathEntry } from './paths.js'
import type { DiagnosticsOptions } from './diagnostics.js'
import type { IgnoredValueTypesOption } from './ignored-value-types.js'
import type { TransformersOption } from './transformers.js'

export type SerialiseOption = boolean | ((value: unknown) => string)
export interface KeyRule {
  readonly key: string
  readonly fuzzyKeyMatch?: boolean
  readonly caseSensitiveKeyMatch?: boolean
}

export type KeySelector = string | RegExp | KeyRule
export type StringTest = RegExp | SubstringRule

export interface SubstringRule {
  readonly pattern: RegExp
  readonly replacer: (value: string, pattern: RegExp) => string
}

export interface DeepRedactOptions {
  readonly caseSensitiveKeyMatch?: boolean
  readonly censor?: Censor
  readonly diagnostics?: DiagnosticsOptions
  readonly fuzzyKeyMatch?: boolean
  readonly keys?: readonly KeySelector[]
  readonly paths?: readonly PathEntry[]
  readonly remove?: boolean
  readonly retainStructure?: boolean
  readonly serialise?: SerialiseOption
  readonly stringTests?: readonly StringTest[]
  readonly transformers?: TransformersOption
  readonly ignoredValueTypes?: IgnoredValueTypesOption
  readonly replaceStringByLength?: boolean
}
