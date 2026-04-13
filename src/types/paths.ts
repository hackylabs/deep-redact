export type Censor = string | ((value: unknown) => unknown)

export interface PathRule {
  readonly path: string
  readonly censor?: Censor
  readonly remove?: boolean
  readonly retainStructure?: boolean
}

export type PathEntry = string | PathRule
