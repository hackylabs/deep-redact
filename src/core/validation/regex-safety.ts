export const cloneRegExp = (pattern: RegExp): RegExp => {
  return new RegExp(pattern.source, pattern.flags)
}

const maxRegexSourceLength = 256
const nestedQuantifierRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?(?:\\.|[^()[\]\\]|\[[^\]]*])*(?:[+*]|\{\d+(?:,\d*)?\})(?:\\.|[^()[\]\\]|\[[^\]]*])*\)(?:[+*]|\{\d+(?:,\d*)?\})/
const quantifiedGroupRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?((?:\\.|[^()[\]\\]|\[[^\]]*])*)\)(?:[+*]|\{\d+(?:,\d*)?\})/g

export const isRegExp = (value: unknown): value is RegExp => {
  return value instanceof RegExp
}

interface RegexSafetyOptions {
  readonly allowGlobal?: boolean;
}

const splitRegexAlternatives = (source: string): readonly string[] => {
  const alternatives: string[] = ['']
  let inCharacterClass = false
  let groupDepth = 0
  let escaped = false

  for (const character of source) {
    if (escaped) {
      alternatives[alternatives.length - 1] += character
      escaped = false
      continue
    }

    if (character === '\\') {
      alternatives[alternatives.length - 1] += character
      escaped = true
      continue
    }

    if (character === '[') {
      inCharacterClass = true
      alternatives[alternatives.length - 1] += character
      continue
    }

    if (character === ']' && inCharacterClass) {
      inCharacterClass = false
      alternatives[alternatives.length - 1] += character
      continue
    }

    if (!inCharacterClass) {
      if (character === '(') {
        groupDepth++
        alternatives[alternatives.length - 1] += character
        continue
      }

      if (character === ')') {
        groupDepth--
        alternatives[alternatives.length - 1] += character
        continue
      }

      if (character === '|' && groupDepth === 0) {
        alternatives.push('')
        continue
      }
    }

    alternatives[alternatives.length - 1] += character
  }

  return alternatives
}

const hasPrefixOverlappingAlternatives = (alternatives: readonly string[]): boolean => {
  const nonEmptyAlternatives = alternatives.filter((alternative) => alternative.length > 0)

  return nonEmptyAlternatives.some((alternative, index) => {
    return nonEmptyAlternatives.some((otherAlternative, otherIndex) => {
      return index !== otherIndex
        && otherAlternative.startsWith(alternative)
    })
  })
}

const hasUnsafeOverlappingAlternation = (source: string): boolean => {
  for (const match of source.matchAll(quantifiedGroupRegexPattern)) {
    const alternatives = splitRegexAlternatives(match[1] ?? '')

    if (alternatives.length > 1 && hasPrefixOverlappingAlternatives(alternatives)) {
      return true
    }
  }

  return false
}

const lowercaseInitial = (value: string): string => {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`
}

export const getUnsupportedRegexMessage = (
  selector: RegExp,
  label: string,
  options: RegexSafetyOptions = {},
): string | undefined => {
  if (selector.sticky) {
    return options.allowGlobal === true
      ? `${label} must not use sticky flag.`
      : `${label} must not use global or sticky flags.`
  }

  if (selector.global && options.allowGlobal !== true) {
    return `${label} must not use global or sticky flags.`
  }

  if ([...selector.source].length > maxRegexSourceLength) {
    return `${label} source must be at most ${maxRegexSourceLength} characters.`
  }

  if (nestedQuantifierRegexPattern.test(selector.source)) {
    return `Unsafe ${lowercaseInitial(label)} uses a nested quantified pattern.`
  }

  if (hasUnsafeOverlappingAlternation(selector.source)) {
    return `Unsafe ${lowercaseInitial(label)} uses an overlapping alternation pattern.`
  }

  return undefined
}
