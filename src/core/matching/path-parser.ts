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

export type PathSegment = PropertyPathSegment | IndexPathSegment

export interface ParsedPathSelector {
  readonly raw: string
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

const createUnsupportedWildcardError = (selector: string, segment: string): PathSyntaxError => {
  if (segment === '**') {
    return new PathSyntaxError(selector, 'Unsupported recursive wildcard segment "**".')
  }

  if (segment === '*') {
    return new PathSyntaxError(selector, 'Unsupported wildcard segment "*".')
  }

  return new PathSyntaxError(selector, `Unsupported wildcard syntax in segment "${segment}".`)
}

const createBareSegment = (selector: string, value: string): PathSegment => {
  if (value.length === 0) {
    throw new PathSyntaxError(selector, 'Path selectors must not contain empty segments.')
  }

  if (value.includes('*')) {
    throw createUnsupportedWildcardError(selector, value)
  }

  if (regexLikeSegmentPattern.test(value)) {
    throw new PathSyntaxError(selector, `Unsupported regex-like segment "${value}".`)
  }

  if (indexSegmentPattern.test(value)) {
    return createIndexPathSegment(Number(value))
  }

  if (barePropertyPattern.test(value)) {
    return createPropertyPathSegment(value)
  }

  throw new PathSyntaxError(
    selector,
    `Unsupported exact path segment "${value}". Use bracket-quoted property syntax for literal special-character keys.`,
  )
}

const parseQuotedProperty = (
  selector: string,
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
        throw new PathSyntaxError(selector, 'Quoted property selector has an unfinished escape sequence.')
      }

      value += selector[index]
      index += 1
      continue
    }

    if (character === quote) {
      if (value.length === 0) {
        throw new PathSyntaxError(selector, 'Path selectors must not contain empty segments.')
      }

      return {
        nextIndex: index + 1,
        segment: createPropertyPathSegment(value),
      }
    }

    value += character
    index += 1
  }

  throw new PathSyntaxError(selector, 'Quoted property selector is not closed.')
}

const parseBracketSegment = (
  selector: string,
  startIndex: number,
): {
  readonly nextIndex: number
  readonly segment: PathSegment
} => {
  let index = startIndex + 1

  if (index >= selector.length) {
    throw new PathSyntaxError(selector, 'Bracket selector is not closed.')
  }

  if (selector[index] === '"' || selector[index] === '\'') {
    const quotedProperty = parseQuotedProperty(selector, index)

    if (selector[quotedProperty.nextIndex] !== ']') {
      throw new PathSyntaxError(selector, 'Quoted property selector must be closed with ].')
    }

    return {
      nextIndex: quotedProperty.nextIndex + 1,
      segment: quotedProperty.segment,
    }
  }

  const closingIndex = selector.indexOf(']', index)

  if (closingIndex === -1) {
    throw new PathSyntaxError(selector, 'Bracket selector is not closed.')
  }

  const value = selector.slice(index, closingIndex)

  if (value.length === 0) {
    throw new PathSyntaxError(selector, 'Path selectors must not contain empty segments.')
  }

  if (value.includes('*')) {
    throw createUnsupportedWildcardError(selector, value)
  }

  if (regexLikeSegmentPattern.test(value)) {
    throw new PathSyntaxError(selector, `Unsupported regex-like segment "${value}".`)
  }

  if (!indexSegmentPattern.test(value)) {
    throw new PathSyntaxError(
      selector,
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
  startIndex: number,
): {
  readonly nextIndex: number
  readonly segment: PathSegment
} => {
  let index = startIndex

  while (index < selector.length && selector[index] !== '.' && selector[index] !== '[') {
    if (selector[index] === ']') {
      throw new PathSyntaxError(selector, 'Unexpected ] in path selector.')
    }

    index += 1
  }

  const value = selector.slice(startIndex, index)

  return {
    nextIndex: index,
    segment: createBareSegment(selector, value),
  }
}

export const parsePathSelector = (selector: string): ParsedPathSelector => {
  if (selector.length === 0) {
    throw new PathSyntaxError(selector, 'Path selectors must not be empty.')
  }

  const segments: PathSegment[] = []
  let index = 0

  while (index < selector.length) {
    if (selector[index] === '.') {
      throw new PathSyntaxError(selector, 'Path selectors must not contain empty segments.')
    }

    const parsedSegment = selector[index] === '['
      ? parseBracketSegment(selector, index)
      : parseBareSegment(selector, index)

    segments.push(parsedSegment.segment)
    index = parsedSegment.nextIndex

    while (index < selector.length && selector[index] === '[') {
      const bracketSegment = parseBracketSegment(selector, index)
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
