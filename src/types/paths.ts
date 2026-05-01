export type Censor = string | ((value: unknown) => unknown)
export type RegexPathSegment = RegExp

export interface IgnorePathSegment {
  readonly ignore: string | number | RegexPathSegment
}

export type StructuredPathSegment = string | number | RegexPathSegment | IgnorePathSegment
export type StructuredPathSelector = readonly StructuredPathSegment[]
export type PathSelector = string | StructuredPathSelector

export interface PathRule {
  readonly path: PathSelector
  readonly censor?: Censor
  readonly remove?: boolean
  readonly retainStructure?: boolean
}

export type PathEntry = PathSelector | PathRule
