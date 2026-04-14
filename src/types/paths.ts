export type Censor = string | ((value: unknown) => unknown)

export interface IgnorePathSegment {
  readonly ignore: string | number
}

export type StructuredPathSegment = string | number | IgnorePathSegment
export type StructuredPathSelector = readonly StructuredPathSegment[]
export type PathSelector = string | StructuredPathSelector

export interface PathRule {
  readonly path: PathSelector
  readonly censor?: Censor
  readonly remove?: boolean
  readonly retainStructure?: boolean
}

export type PathEntry = PathSelector | PathRule
