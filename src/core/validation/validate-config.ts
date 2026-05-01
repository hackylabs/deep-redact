import type { PathRule, PathSelector } from '../../types/paths.js'
import type { DeepRedactOptions, SerialiseOption } from '../../types/public.js'
import { createValidationReport, type ValidationIssue, type ValidationReport } from './validation-report.js'
import {
  validatePathSelectors,
  type PathSelectorCandidate,
} from './validate-paths.js'

const rootOptionNames = new Set<keyof DeepRedactOptions>([
  'censor',
  'keys',
  'paths',
  'remove',
  'retainStructure',
  'serialise',
])

const pathRuleOptionNames = new Set<keyof PathRule>([
  'path',
  'censor',
  'remove',
  'retainStructure',
])

type ConfigRecord = Record<string, unknown>

const isPlainObject = (value: unknown): value is ConfigRecord => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

const isPathSelector = (value: unknown): value is PathSelector => {
  return typeof value === 'string' || Array.isArray(value)
}

const pushIssue = (issues: ValidationIssue[], path: string, message: string): void => {
  issues.push({ path, message })
}

const validateAllowedOptions = (
  value: ConfigRecord,
  allowedOptions: ReadonlySet<string>,
  path: string,
  issues: ValidationIssue[],
): void => {
  for (const optionName of Object.keys(value)) {
    if (!allowedOptions.has(optionName)) {
      pushIssue(issues, path, `Unsupported option "${optionName}".`)
    }
  }
}

const validateBooleanOption = (
  value: unknown,
  path: string,
  optionName: string,
  issues: ValidationIssue[],
): void => {
  if (value !== undefined && typeof value !== 'boolean') {
    pushIssue(issues, `${path}.${optionName}`, `${optionName} must be a boolean.`)
  }
}

const validateCensorOption = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value !== undefined && typeof value !== 'string' && typeof value !== 'function') {
    pushIssue(issues, `${path}.censor`, 'censor must be a string or function.')
  }
}

const validateSerialiseOption = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is SerialiseOption | undefined => {
  if (value !== undefined && typeof value !== 'boolean' && typeof value !== 'function') {
    pushIssue(issues, `${path}.serialise`, 'serialise must be a boolean or function.')
    return false
  }

  return true
}

const validateConflictingOptions = (
  value: {
    readonly censor?: unknown
    readonly remove?: unknown
    readonly retainStructure?: unknown
  },
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value.remove === true && value.censor !== undefined) {
    pushIssue(issues, path, 'remove cannot be combined with censor.')
  }

  if (value.remove === true && value.retainStructure === true) {
    pushIssue(issues, path, 'remove cannot be combined with retainStructure.')
  }
}

interface EffectiveRuleDefaults {
  readonly censor?: unknown
  readonly remove: boolean
  readonly retainStructure: boolean
}

const regexLikeKeySelectorPattern = /^\/.+\/[A-Za-z]*$/
const maxKeyRegexSourceLength = 256
const nestedQuantifierKeyRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?(?:\\.|[^()[\]\\]|\[[^\]]*])*(?:[+*]|\{\d+(?:,\d*)?\})(?:\\.|[^()[\]\\]|\[[^\]]*])*\)(?:[+*]|\{\d+(?:,\d*)?\})/
const quantifiedGroupKeyRegexPattern = /\((?:\?:|\?=|\?!|\?<=|\?<!|\?<[^>]+>)?((?:\\.|[^()[\]\\]|\[[^\]]*])*)\)(?:[+*]|\{\d+(?:,\d*)?\})/g

const isRegExp = (value: unknown): value is RegExp => {
  return value instanceof RegExp
}

const splitRegexAlternatives = (source: string): readonly string[] => {
  const alternatives: string[] = ['']
  let inCharacterClass = false
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

    if (character === '|' && !inCharacterClass) {
      alternatives.push('')
      continue
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
  for (const match of source.matchAll(quantifiedGroupKeyRegexPattern)) {
    const alternatives = splitRegexAlternatives(match[1] ?? '')

    if (alternatives.length > 1 && hasPrefixOverlappingAlternatives(alternatives)) {
      return true
    }
  }

  return false
}

const getUnsupportedKeySelectorMessage = (selector: string): string | undefined => {
  if (selector.startsWith('!')) {
    return `Unsupported exclusion key selector "${selector}". Ignore selectors must use structured selector objects and are not supported in this configuration format.`
  }

  if (selector.includes('**')) {
    return `Unsupported recursive wildcard key selector "${selector}".`
  }

  if (selector.includes('*')) {
    return `Unsupported wildcard key selector "${selector}".`
  }

  if (regexLikeKeySelectorPattern.test(selector)) {
    return `Unsupported regex-like key selector "${selector}".`
  }

  return undefined
}

const getUnsupportedKeyRegexMessage = (selector: RegExp): string | undefined => {
  if (selector.global || selector.sticky) {
    return 'Regex key selectors must not use global or sticky flags.'
  }

  if (selector.source.length > maxKeyRegexSourceLength) {
    return `Regex key selector source must be at most ${maxKeyRegexSourceLength} characters.`
  }

  if (nestedQuantifierKeyRegexPattern.test(selector.source)) {
    return 'Unsafe regex key selector uses a nested quantified pattern.'
  }

  if (hasUnsafeOverlappingAlternation(selector.source)) {
    return 'Unsafe regex key selector uses an overlapping alternation pattern.'
  }

  return undefined
}

const validateKeys = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, path, 'keys must be an array.')
    return
  }

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`

    if (isRegExp(entry)) {
      const unsupportedRegexMessage = getUnsupportedKeyRegexMessage(entry)

      if (unsupportedRegexMessage !== undefined) {
        pushIssue(issues, entryPath, unsupportedRegexMessage)
      }

      return
    }

    if (typeof entry !== 'string') {
      pushIssue(issues, entryPath, 'key selectors must be strings or RegExp instances.')
      return
    }

    if (entry.length === 0) {
      pushIssue(issues, entryPath, 'key selectors must not be empty.')
      return
    }

    const unsupportedSelectorMessage = getUnsupportedKeySelectorMessage(entry)

    if (unsupportedSelectorMessage !== undefined) {
      pushIssue(issues, entryPath, unsupportedSelectorMessage)
    }
  })
}

const validatePathRule = (
  value: unknown,
  path: string,
  defaults: EffectiveRuleDefaults,
  issues: ValidationIssue[],
  selectorCandidates: PathSelectorCandidate[],
): void => {
  if (!isPlainObject(value)) {
    pushIssue(issues, path, `${path.split('.').at(-1) ?? 'entry'} must be a string selector or path-rule object.`)
    return
  }

  validateAllowedOptions(value, pathRuleOptionNames, path, issues)

  if (!isPathSelector(value.path)) {
    pushIssue(issues, `${path}.path`, 'path must be a string or structured selector array.')
  } else {
    selectorCandidates.push({
      configPath: `${path}.path`,
      selector: value.path,
    })
  }

  validateCensorOption(value.censor, path, issues)
  validateBooleanOption(value.remove, path, 'remove', issues)
  validateBooleanOption(value.retainStructure, path, 'retainStructure', issues)
  validateConflictingOptions(
    {
      censor: value.censor ?? defaults.censor,
      remove: value.remove ?? defaults.remove,
      retainStructure: value.retainStructure ?? defaults.retainStructure,
    },
    path,
    issues,
  )
}

const validatePaths = (
  value: unknown,
  path: string,
  defaults: EffectiveRuleDefaults,
  issues: ValidationIssue[],
  selectorCandidates: PathSelectorCandidate[],
): void => {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, path, 'paths must be an array.')
    return
  }

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`

    if (isPathSelector(entry)) {
      selectorCandidates.push({
        configPath: entryPath,
        selector: entry,
      })
      return
    }

    if (!isPlainObject(entry)) {
      pushIssue(issues, entryPath, `${entryPath.split('.').at(-1) ?? 'entry'} must be a string selector or path-rule object.`)
      return
    }

    validatePathRule(entry, entryPath, defaults, issues, selectorCandidates)
  })
}

export const validateConfig = (options: unknown): ValidationReport => {
  const issues: ValidationIssue[] = []
  const selectorCandidates: PathSelectorCandidate[] = []

  if (options === undefined) {
    return createValidationReport(issues)
  }

  if (!isPlainObject(options)) {
    pushIssue(issues, 'options', 'options must be an object.')
    return createValidationReport(issues)
  }

  validateAllowedOptions(options, rootOptionNames, 'options', issues)
  validateCensorOption(options.censor, 'options', issues)
  validateKeys(options.keys, 'options.keys', issues)
  validateBooleanOption(options.remove, 'options', 'remove', issues)
  validateBooleanOption(options.retainStructure, 'options', 'retainStructure', issues)
  validateSerialiseOption(options.serialise, 'options', issues)
  validateConflictingOptions(options, 'options', issues)
  validatePaths(
    options.paths,
    'options.paths',
    {
      censor: options.censor,
      remove: options.remove === true,
      retainStructure: options.retainStructure === true,
    },
    issues,
    selectorCandidates,
  )
  validatePathSelectors(selectorCandidates, issues)

  return createValidationReport(issues)
}
