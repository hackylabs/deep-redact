export interface PublicWildcardSegment {
  readonly any: true;
}

export interface PublicRecursiveWildcardSegment {
  readonly anyDepth: true;
}

export type PathSegments = readonly (string | number | RegExp | IgnorePathSegment | PublicWildcardSegment | PublicRecursiveWildcardSegment)[]

export interface FunctionCensorContext {
  readonly matchedPath: PathSegments;
  readonly rulePath: PathSegments;
  readonly rootInput: unknown;
  readonly terminalKey?: string | number;
}

export type Censor = string | ((value: unknown, context: FunctionCensorContext) => unknown)
export type RegexPathSegment = RegExp

export interface IgnorePathSegment {
  readonly ignore: string | number | RegexPathSegment;
}

export type StructuredPathSegment = string | number | RegexPathSegment | IgnorePathSegment
export type StructuredPathSelector = readonly StructuredPathSegment[]
export type PathSelector = string | StructuredPathSelector

export interface PathRule {
  readonly path: PathSelector;
  readonly censor?: Censor;
  readonly remove?: boolean;
  readonly retainStructure?: boolean;
  readonly replaceStringByLength?: boolean;
}

export type PathEntry = PathSelector | PathRule
