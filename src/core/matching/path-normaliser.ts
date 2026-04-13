import { parsePathSelector, type ParsedPathSelector, type PathSegment } from './path-parser.js'

const canonicalBarePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export interface NormalisedPathSelector {
  readonly canonicalPath: string
  readonly segments: readonly PathSegment[]
}

const renderPropertySegment = (value: string, isRoot: boolean): string => {
  if (canonicalBarePropertyPattern.test(value)) {
    return `${isRoot ? '' : '.'}${value}`
  }

  return `[${JSON.stringify(value)}]`
}

const renderPathSegment = (segment: PathSegment, isRoot: boolean): string => {
  if (segment.kind === 'index') {
    return `${isRoot ? '' : '.'}${segment.value}`
  }

  return renderPropertySegment(segment.value, isRoot)
}

export const renderCanonicalPath = (segments: readonly PathSegment[]): string => {
  return segments
    .map((segment, index) => renderPathSegment(segment, index === 0))
    .join('')
}

export const appendCanonicalPathSegment = (
  parentPath: string | undefined,
  segment: PathSegment,
): string => {
  return `${parentPath ?? ''}${renderPathSegment(segment, parentPath === undefined)}`
}

export const normaliseParsedPath = (parsedPath: ParsedPathSelector): NormalisedPathSelector => {
  return Object.freeze({
    canonicalPath: renderCanonicalPath(parsedPath.segments),
    segments: parsedPath.segments,
  })
}

export const normalisePathSelector = (selector: string): NormalisedPathSelector => {
  return normaliseParsedPath(parsePathSelector(selector))
}
