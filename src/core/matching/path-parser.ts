import type { IgnorePathSegment, PathSelector, StructuredPathSelector } from '../../types/paths.js'
import { isRegExp } from '../validation/regex-safety.js'

const barePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const indexSegmentPattern = /^(0|[1-9]\d*)$/
const regexLikeSegmentPattern = /^\/.+\/[A-Za-z]*$/

export interface PropertyPathSegment {
  readonly kind: 'property'
  readonly value: string
}

export interface IndexPathSegment {
  readonly kind: 'index'
  readonly value: number
}

export interface WildcardPathSegment {
  readonly kind: 'wildcard'
}

export interface RecursiveWildcardPathSegment {
  readonly kind: 'recursive-wildcard'
}

export interface IgnorePropertyPathSegment {
  readonly kind: 'ignore-property'
  readonly value: string
}

export interface IgnoreIndexPathSegment {
  readonly kind: 'ignore-index'
  readonly value: number
}

export interface ParsedRegexSegment {
  readonly kind: 'regex'
  readonly matcher: RegExp
}

export interface ParsedIgnoreRegexSegment {
  readonly kind: 'ignore-regex'
  readonly matcher: RegExp
}

export type ExactPathSegment = PropertyPathSegment | IndexPathSegment
export type DynamicPathSegment =
  | WildcardPathSegment
  | RecursiveWildcardPathSegment
  | IgnorePropertyPathSegment
  | IgnoreIndexPathSegment
  | ParsedRegexSegment
  | ParsedIgnoreRegexSegment
export type PathSegment = ExactPathSegment | DynamicPathSegment

export interface ParsedPathSelector {
  readonly raw: PathSelector
  readonly segments: readonly PathSegment[]
}

export class PathSyntaxError extends SyntaxError {
  readonly selector: string

  constructor(selector: string, message: string) {
    super(message)
    this.name = 'PathSyntaxError'
    this.selector = selector
  }
}

export const createPropertyPathSegment = (value: string): PropertyPathSegment => {
  return Object.freeze({
    kind: 'property',
    value,
  })
}

export const createIndexPathSegment = (value: number): IndexPathSegment => {
  return Object.freeze({
    kind: 'index',
    value,
  })
}

export const createWildcardPathSegment = (): WildcardPathSegment => {
  return Object.freeze({
    kind: 'wildcard',
  })
}

export const createRecursiveWildcardPathSegment = (): RecursiveWildcardPathSegment => {
  return Object.freeze({
    kind: 'recursive-wildcard',
  })
}

export const createIgnorePropertyPathSegment = (value: string): IgnorePropertyPathSegment => {
  return Object.freeze({
    kind: 'ignore-property',
    value,
  })
}

export const createIgnoreIndexPathSegment = (value: number): IgnoreIndexPathSegment => {
  return Object.freeze({
    kind: 'ignore-index',
    value,
  })
}

const cloneRegexMatcher = (matcher: RegExp): RegExp => {
  return new RegExp(matcher.source, matcher.flags)
}

export const createRegexPathSegment = (matcher: RegExp): ParsedRegexSegment => {
  return Object.freeze({
    kind: 'regex',
    matcher: cloneRegexMatcher(matcher),
  })
}

export const createIgnoreRegexPathSegment = (matcher: RegExp): ParsedIgnoreRegexSegment => {
  return Object.freeze({
    kind: 'ignore-regex',
    matcher: cloneRegexMatcher(matcher),
  })
}

const renderRawSelector = (selector: PathSelector): string => {
  return typeof selector === 'string' ? selector : JSON.stringify(selector)
}

const createUnsupportedWildcardError = (selector: PathSelector, segment: string): PathSyntaxError => {
  const rawSelector = renderRawSelector(selector)

  if (segment === '**') {
    return new PathSyntaxError(rawSelector, 'Unsupported recursive wildcard segment "**".')
  }

  if (segment === '*') {
    return new PathSyntaxError(rawSelector, 'Unsupported wildcard segment "*".')
  }

  return new PathSyntaxError(rawSelector, `Unsupported wildcard syntax in segment "${segment}".`)
}

const createExactSegment = (selector: PathSelector, value: string | number): ExactPathSegment => {
  if (typeof value === 'number') {
    return createIndexPathSegment(value)
  }

  if (value.length === 0) {
    throw new PathSyntaxError(renderRawSelector(selector), 'Path selectors must not contain empty segments.')
  }

  if (value.includes('*')) {
    throw createUnsupportedWildcardError(selector, value)
  }

  if (regexLikeSegmentPattern.test(value)) {
    throw new PathSyntaxError(renderRawSelector(selector), `Unsupported regex-like segment "${value}".`)
  }

  if (value.startsWith('!')) {
    throw new PathSyntaxError(
      renderRawSelector(selector),
      `Unsupported exclusion syntax in segment "${value}". Ignore selectors are structured-selector only.`,
    )
  }

  if (indexSegmentPattern.test(value)) {
    return createIndexPathSegment(Number(value))
  }

  if (barePropertyPattern.test(value)) {
    return createPropertyPathSegment(value)
  }

  throw new PathSyntaxError(
    renderRawSelector(selector),
    `Unsupported exact path segment "${value}". Use bracket-quoted property syntax for literal special-character keys.`,
  )
}

const createLiteralStructuredPropertySegment = (
  selector: StructuredPathSelector,
  value: string,
): PropertyPathSegment => {
  if (value.length === 0) {
    throw new PathSyntaxError(renderRawSelector(selector), 'Path selectors must not contain empty segments.')
  }

  if (regexLikeSegmentPattern.test(value)) {
    throw new PathSyntaxError(renderRawSelector(selector), `Unsupported regex-like segment "${value}".`)
  }

  return createPropertyPathSegment(value)
}

const createLiteralStructuredIndexSegment = (
  selector: StructuredPathSelector,
  value: number,
): IndexPathSegment => {
  if (!Number.isInteger(value) || value < 0) {
    throw new PathSyntaxError(
      renderRawSelector(selector),
      'Structured numeric segments must be non-negative integers.',
    )
  }

  return createIndexPathSegment(value)
}

const createLiteralStructuredIgnorePropertySegment = (
  selector: StructuredPathSelector,
  value: string,
): IgnorePropertyPathSegment => {
  if (value.length === 0) {
    throw new PathSyntaxError(renderRawSelector(selector), 'Path selectors must not contain empty segments.')
  }

  if (regexLikeSegmentPattern.test(value)) {
    throw new PathSyntaxError(renderRawSelector(selector), `Unsupported regex-like segment "${value}".`)
  }

  return createIgnorePropertyPathSegment(value)
}

const createLiteralStructuredIgnoreIndexSegment = (
  selector: StructuredPathSelector,
  value: number,
): IgnoreIndexPathSegment => {
  if (!Number.isInteger(value) || value < 0) {
    throw new PathSyntaxError(
      renderRawSelector(selector),
      'Structured ignore indexes must be non-negative integers.',
    )
  }

  return createIgnoreIndexPathSegment(value)
}

const parseQuotedProperty = (
  selector: string,
  rawSelector: string,
  startIndex: number,
): {
  readonly nextIndex: number
  readonly segment: PropertyPathSegment
} => {
  const quote = selector[startIndex]
  let index = startIndex + 1
  let value = ''

  while (index < selector.length) {
    const character = selector[index]

    if (character === '\\') {
      index += 1

      if (index >= selector.length) {
        throw new PathSyntaxError(rawSelector, 'Quoted property selector has an unfinished escape sequence.')
      }

      value += selector[index]
      index += 1
      continue
    }

    if (character === quote) {
      if (value.length === 0) {
        throw new PathSyntaxError(rawSelector, 'Path selectors must not contain empty segments.')
      }

      return {
        nextIndex: index + 1,
        segment: createPropertyPathSegment(value),
      }
    }

    value += character
    index += 1
  }

  throw new PathSyntaxError(rawSelector, 'Quoted property selector is not closed.')
}

const parseBracketSegment = (
  selector: string,
  rawSelector: string,
  startIndex: number,
): {
  readonly nextIndex: number
  readonly segment: ExactPathSegment
} => {
  let index = startIndex + 1

  if (index >= selector.length) {
    throw new PathSyntaxError(rawSelector, 'Bracket selector is not closed.')
  }

  if (selector[index] === '"' || selector[index] === '\'') {
    const quotedProperty = parseQuotedProperty(selector, rawSelector, index)

    if (selector[quotedProperty.nextIndex] !== ']') {
      throw new PathSyntaxError(rawSelector, 'Quoted property selector must be closed with ].')
    }

    return {
      nextIndex: quotedProperty.nextIndex + 1,
      segment: quotedProperty.segment,
    }
  }

  const closingIndex = selector.indexOf(']', index)

  if (closingIndex === -1) {
    throw new PathSyntaxError(rawSelector, 'Bracket selector is not closed.')
  }

  const value = selector.slice(index, closingIndex)

  if (value.length === 0) {
    throw new PathSyntaxError(rawSelector, 'Path selectors must not contain empty segments.')
  }

  if (value.includes('*')) {
    throw createUnsupportedWildcardError(rawSelector, value)
  }

  if (regexLikeSegmentPattern.test(value)) {
    throw new PathSyntaxError(rawSelector, `Unsupported regex-like segment "${value}".`)
  }

  if (!indexSegmentPattern.test(value)) {
    throw new PathSyntaxError(
      rawSelector,
      `Unsupported bracket segment "${value}". Use numeric indexes or quoted property selectors only.`,
    )
  }

  return {
    nextIndex: closingIndex + 1,
    segment: createIndexPathSegment(Number(value)),
  }
}

const parseBareSegment = (
  selector: string,
  rawSelector: string,
  startIndex: number,
): {
  readonly nextIndex: number
  readonly segment: PathSegment
} => {
  let index = startIndex

  while (index < selector.length && selector[index] !== '.' && selector[index] !== '[') {
    if (selector[index] === ']') {
      throw new PathSyntaxError(rawSelector, 'Unexpected ] in path selector.')
    }

    index += 1
  }

  const value = selector.slice(startIndex, index)

  if (value === '*') {
    return {
      nextIndex: index,
      segment: createWildcardPathSegment(),
    }
  }

  if (value === '**') {
    return {
      nextIndex: index,
      segment: createRecursiveWildcardPathSegment(),
    }
  }

  return {
    nextIndex: index,
    segment: createExactSegment(rawSelector, value),
  }
}

const parseStringPathSelector = (selector: string): ParsedPathSelector => {
  if (selector.length === 0) {
    throw new PathSyntaxError(selector, 'Path selectors must not be empty.')
  }

  const segments: PathSegment[] = []
  let index = 0
  let recursiveWildcardCount = 0

  while (index < selector.length) {
    if (selector[index] === '.') {
      throw new PathSyntaxError(selector, 'Path selectors must not contain empty segments.')
    }

    const parsedSegment = selector[index] === '['
      ? parseBracketSegment(selector, selector, index)
      : parseBareSegment(selector, selector, index)

    segments.push(parsedSegment.segment)

    if (parsedSegment.segment.kind === 'recursive-wildcard') {
      recursiveWildcardCount += 1

      if (recursiveWildcardCount > 1) {
        throw new PathSyntaxError(selector, 'Path selectors may contain at most one recursive wildcard segment "**".')
      }
    }

    index = parsedSegment.nextIndex

    while (index < selector.length && selector[index] === '[') {
      const bracketSegment = parseBracketSegment(selector, selector, index)
      segments.push(bracketSegment.segment)
      index = bracketSegment.nextIndex
    }

    if (index >= selector.length) {
      break
    }

    if (selector[index] !== '.') {
      throw new PathSyntaxError(
        selector,
        `Unexpected character "${selector[index]}" in path selector.`,
      )
    }

    index += 1

    if (index >= selector.length || selector[index] === '.' || selector[index] === '[') {
      throw new PathSyntaxError(selector, 'Path selectors must not contain empty segments.')
    }
  }

  return Object.freeze({
    raw: selector,
    segments: Object.freeze(segments),
  })
}

const isIgnorePathSegment = (value: unknown): value is IgnorePathSegment => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const keys = Object.keys(value)

  return keys.length === 1 && keys[0] === 'ignore'
}

const parseStructuredPathSelector = (selector: StructuredPathSelector): ParsedPathSelector => {
  if (selector.length === 0) {
    throw new PathSyntaxError(renderRawSelector(selector), 'Path selectors must not be empty.')
  }

  const segments = selector.map((segment) => {
    if (isRegExp(segment)) {
      return createRegexPathSegment(segment)
    }

    if (typeof segment === 'string' || typeof segment === 'number') {
      return typeof segment === 'string'
        ? createLiteralStructuredPropertySegment(selector, segment)
        : createLiteralStructuredIndexSegment(selector, segment)
    }

    if (!isIgnorePathSegment(segment)) {
      throw new PathSyntaxError(
        renderRawSelector(selector),
        `Unsupported structured selector segment ${JSON.stringify(segment)}.`,
      )
    }

    if (typeof segment.ignore === 'string') {
      return createLiteralStructuredIgnorePropertySegment(selector, segment.ignore)
    }

    if (typeof segment.ignore === 'number') {
      return createLiteralStructuredIgnoreIndexSegment(selector, segment.ignore)
    }

    if (isRegExp(segment.ignore)) {
      return createIgnoreRegexPathSegment(segment.ignore)
    }

    throw new PathSyntaxError(
      renderRawSelector(selector),
      `Unsupported structured selector segment ${JSON.stringify(segment)}.`,
    )
  })

  return Object.freeze({
    raw: selector,
    segments: Object.freeze(segments),
  })
}

export const isExactPathSegment = (segment: PathSegment): segment is ExactPathSegment => {
  return segment.kind === 'property' || segment.kind === 'index'
}

export const isDynamicPathSegment = (segment: PathSegment): segment is DynamicPathSegment => {
  return !isExactPathSegment(segment)
}

export const parsePathSelector = (selector: PathSelector): ParsedPathSelector => {
  return typeof selector === 'string'
    ? parseStringPathSelector(selector)
    : parseStructuredPathSelector(selector)
}
