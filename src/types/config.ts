import type { Censor, PathEntry } from './paths.js'
import type { DiagnosticsOptions } from './diagnostics.js'
import type { IgnoredValueTypesOption } from './ignored-value-types.js'
import type { TransformersOption } from './transformers.js'

export type SerialiseOption = boolean | ((value: unknown) => string)

// A per-key rule reaching parity with the v3 `BlacklistKeyConfig`: `key` may be a literal string
// or a RegExp, and each rule may carry its own redaction overrides (`censor`, `remove`,
// `retainStructure`, `replaceStringByLength`) plus the literal-key matching flags. A rule with no
// overrides keeps using the shared key-rule policy, preserving prior behaviour exactly.
export interface KeyRule {
  readonly key: string | RegExp;
  readonly fuzzyKeyMatch?: boolean;
  readonly caseSensitiveKeyMatch?: boolean;
  readonly censor?: Censor;
  readonly remove?: boolean;
  readonly retainStructure?: boolean;
  readonly replaceStringByLength?: boolean;
}

export type KeySelector = string | RegExp | KeyRule
export type StringTest = RegExp | SubstringRule

// The JavaScript `typeof` categories a value may report. `types` restricts which runtime value
// types are eligible for redaction; a configured target whose `typeof` is not listed is left
// untouched (string-only by default), matching Deep Redact v3.
export type ValueTypeName =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'object'
  | 'function'
  | 'symbol'
  | 'undefined'

export interface SubstringRule {
  readonly pattern: RegExp;
  readonly replacer: (value: string, pattern: RegExp) => string;
}

export interface DeepRedactOptions {
  readonly caseSensitiveKeyMatch?: boolean;
  readonly censor?: Censor;
  readonly diagnostics?: DiagnosticsOptions;
  readonly fuzzyKeyMatch?: boolean;
  readonly keys?: readonly KeySelector[];
  readonly maxDepth?: number;
  readonly maxNodes?: number;
  readonly paths?: readonly PathEntry[];
  readonly remove?: boolean;
  readonly retainStructure?: boolean;
  readonly serialise?: SerialiseOption;
  readonly stringTests?: readonly StringTest[];
  readonly transformers?: TransformersOption;
  readonly types?: readonly ValueTypeName[];
  readonly ignoredValueTypes?: IgnoredValueTypesOption;
  readonly replaceStringByLength?: boolean;
}
