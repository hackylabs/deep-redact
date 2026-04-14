import type { PathSelector } from '../../types/paths.js'
import {
  isExactPathSegment,
  parsePathSelector,
  type ExactPathSegment,
  type ParsedPathSelector,
  type PathSegment,
} from './path-parser.js'

const canonicalBarePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export interface NormalisedPathSelector {
  readonly canonicalPath: string
  readonly segments: readonly ExactPathSegment[]
}

const renderPropertySegment = (value: string, isRoot: boolean): string => {
  if (canonicalBarePropertyPattern.test(value)) {
    return `${isRoot ? '' : '.'}${value}`
  }

  return `[${JSON.stringify(value)}]`
}

const renderExactPathSegment = (segment: ExactPathSegment, isRoot: boolean): string => {
  if (segment.kind === 'index') {
    return `${isRoot ? '' : '.'}${segment.value}`
  }

  return renderPropertySegment(segment.value, isRoot)
}

export const renderCanonicalPath = (segments: readonly ExactPathSegment[]): string => {
  return segments
    .map((segment, index) => renderExactPathSegment(segment, index === 0))
    .join('')
}

export const appendCanonicalPathSegment = (
  parentPath: string | undefined,
  segment: ExactPathSegment,
): string => {
  return `${parentPath ?? ''}${renderExactPathSegment(segment, parentPath === undefined)}`
}

const renderDynamicPathSegment = (segment: PathSegment, isRoot: boolean): string => {
  if (segment.kind === 'wildcard') {
    return `${isRoot ? '' : '.'}*`
  }

  if (segment.kind === 'recursive-wildcard') {
    return `${isRoot ? '' : '.'}**`
  }

  if (segment.kind === 'ignore-index') {
    return `${isRoot ? '' : '.'}{ignore:${segment.value}}`
  }

  if (segment.kind === 'ignore-property') {
    return `${isRoot ? '' : '.'}{ignore:${JSON.stringify(segment.value)}}`
  }

  return renderExactPathSegment(segment, isRoot)
}

export const renderSelectorSignature = (segments: readonly PathSegment[]): string => {
  return segments
    .map((segment, index) => renderDynamicPathSegment(segment, index === 0))
    .join('')
}

export const normaliseParsedPath = (parsedPath: ParsedPathSelector): NormalisedPathSelector => {
  if (!parsedPath.segments.every(isExactPathSegment)) {
    throw new TypeError('Dynamic selectors cannot be canonicalised as exact paths.')
  }

  return Object.freeze({
    canonicalPath: renderCanonicalPath(parsedPath.segments),
    segments: parsedPath.segments,
  })
}

export const normalisePathSelector = (selector: PathSelector): NormalisedPathSelector => {
  return normaliseParsedPath(parsePathSelector(selector))
}
