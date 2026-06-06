import type { PathRule, PathSelector } from '../../types/paths.js'
import type { IgnoredValueTypesOption } from '../../types/ignored-value-types.js'
import type { DeepRedactOptions, SerialiseOption, ValueTypeName } from '../../types/public.js'
import type { TransformersByConstructor, TransformersByType } from '../../types/transformers.js'
import { createValidationReport, type ValidationIssue, type ValidationReport } from './validation-report.js'
import {
  validatePathSelectors,
  type PathSelectorCandidate,
} from './validate-paths.js'
import { getUnsupportedRegexMessage, isRegExp } from './regex-safety.js'

const rootOptionNames = new Set<keyof DeepRedactOptions>([
  'caseSensitiveKeyMatch',
  'censor',
  'diagnostics',
  'fuzzyKeyMatch',
  'keys',
  'maxDepth',
  'maxNodes',
  'paths',
  'remove',
  'replaceStringByLength',
  'retainStructure',
  'ignoredValueTypes',
  'serialise',
  'stringTests',
  'transformers',
  'types',
])

const valueTypeNames = new Set<ValueTypeName>([
  'string',
  'number',
  'bigint',
  'boolean',
  'object',
  'function',
  'symbol',
  'undefined',
])

const pathRuleOptionNames = new Set<keyof PathRule>([
  'path',
  'censor',
  'remove',
  'replaceStringByLength',
  'retainStructure',
])

const substringRuleOptionNames = new Set([
  'pattern',
  'replacer',
])

const keyRuleOptionNames = new Set([
  'caseSensitiveKeyMatch',
  'fuzzyKeyMatch',
  'key',
])

const transformerOptionNames = new Set<keyof NonNullable<DeepRedactOptions['transformers']>>([
  'byType',
  'byConstructor',
  'fallback',
])

const transformerByTypeOptionNames = new Set<keyof TransformersByType>([
  'bigint',
  'object',
])

const transformerByConstructorOptionNames = new Set<keyof TransformersByConstructor>([
  'Date',
  'Error',
  'Map',
  'RegExp',
  'Set',
  'URL',
  'custom',
])

const ignoredValueTypeOptionNames = new Set<keyof IgnoredValueTypesOption>([
  'bigint',
  'Date',
  'Error',
  'Map',
  'RegExp',
  'Set',
  'URL',
])

const diagnosticsOptionNames = new Set([
  'sink',
])

const customConstructorRegistrationOptionNames = new Set([
  'constructor',
  'transformers',
])

type ConfigRecord = Record<string, unknown>
type Constructable = abstract new (...args: never[]) => object

const disallowedCustomConstructors = new Set<unknown>([
  Object,
  Array,
  Date,
  Error,
  Map,
  RegExp,
  Set,
  URL,
])

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

const validatePositiveIntegerOption = (
  value: unknown,
  path: string,
  optionName: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) return
  if (!Number.isInteger(value) || (value as number) < 1) {
    pushIssue(issues, `${path}.${optionName}`, `${optionName} must be a positive integer.`)
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
    readonly censor?: unknown;
    readonly remove?: unknown;
    readonly retainStructure?: unknown;
    readonly replaceStringByLength?: unknown;
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

  if (value.remove === true && value.replaceStringByLength === true) {
    pushIssue(issues, path, 'remove cannot be combined with replaceStringByLength.')
  }

  if (value.replaceStringByLength === true && value.censor === '') {
    pushIssue(issues, path, 'replaceStringByLength cannot be combined with an empty string censor.')
  }
}

interface EffectiveRuleDefaults {
  readonly censor?: unknown;
  readonly remove: boolean;
  readonly retainStructure: boolean;
  readonly replaceStringByLength: boolean;
}

const regexLikeKeySelectorPattern = /^\/.+\/[A-Za-z]*$/

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
  return getUnsupportedRegexMessage(selector, 'Regex key selector')
}

const validateLiteralKeySelector = (
  entry: string,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (entry.length === 0) {
    pushIssue(issues, path, 'key selectors must not be empty.')
    return
  }

  const unsupportedSelectorMessage = getUnsupportedKeySelectorMessage(entry)

  if (unsupportedSelectorMessage !== undefined) {
    pushIssue(issues, path, unsupportedSelectorMessage)
  }
}

const validateKeyRule = (
  value: ConfigRecord,
  path: string,
  issues: ValidationIssue[],
): void => {
  validateAllowedOptions(value, keyRuleOptionNames, path, issues)

  if (typeof value.key !== 'string') {
    pushIssue(issues, `${path}.key`, 'key must be a string.')
  } else if (value.key.length === 0) {
    pushIssue(issues, `${path}.key`, 'key must not be empty.')
  } else {
    const unsupportedSelectorMessage = getUnsupportedKeySelectorMessage(value.key)

    if (unsupportedSelectorMessage !== undefined) {
      pushIssue(issues, `${path}.key`, unsupportedSelectorMessage)
    }
  }

  validateBooleanOption(value.fuzzyKeyMatch, path, 'fuzzyKeyMatch', issues)
  validateBooleanOption(value.caseSensitiveKeyMatch, path, 'caseSensitiveKeyMatch', issues)
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

  for (const [index, entry] of value.entries()) {
    const entryPath = `${path}[${index}]`

    if (isRegExp(entry)) {
      const unsupportedRegexMessage = getUnsupportedKeyRegexMessage(entry)

      if (unsupportedRegexMessage !== undefined) {
        pushIssue(issues, entryPath, unsupportedRegexMessage)
      }

      continue
    }

    if (typeof entry === 'string') {
      validateLiteralKeySelector(entry, entryPath, issues)
      continue
    }

    if (isPlainObject(entry)) {
      validateKeyRule(entry, entryPath, issues)
      continue
    }

    pushIssue(issues, entryPath, 'key selectors must be strings or RegExp instances or key-rule objects.')
  }
}

const zeroLengthProbeValues = Object.freeze([
  '',
  'a',
  'safe',
  'secret',
  'token=secret',
  'api-key=secret',
  'prefix-secret-suffix',
])

const patternCanMatchZeroLength = (pattern: RegExp): boolean => {
  const matcher = new RegExp(pattern.source, pattern.flags)

  return zeroLengthProbeValues.some((probe) => {
    matcher.lastIndex = 0
    const match = matcher.exec(probe)
    matcher.lastIndex = 0

    return match?.[0] === ''
  })
}

const validateSubstringPattern = (
  pattern: RegExp,
  path: string,
  issues: ValidationIssue[],
): void => {
  const unsupportedRegexMessage = getUnsupportedRegexMessage(
    pattern,
    'Substring rule pattern',
    { allowGlobal: true },
  )

  if (unsupportedRegexMessage !== undefined) {
    pushIssue(issues, path, unsupportedRegexMessage)
  }

  if (patternCanMatchZeroLength(pattern)) {
    pushIssue(issues, path, 'Substring rule pattern must not match zero-length strings.')
  }
}

const validateStringTests = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, path, 'stringTests must be an array.')
    return
  }

  for (const [index, entry] of value.entries()) {
    const entryPath = `${path}[${index}]`

    if (isRegExp(entry)) {
      validateSubstringPattern(entry, entryPath, issues)
      continue
    }

    if (!isPlainObject(entry)) {
      pushIssue(issues, entryPath, 'string test entries must be RegExp instances or substring rule objects.')
      continue
    }

    validateAllowedOptions(entry, substringRuleOptionNames, entryPath, issues)

    if (isRegExp(entry.pattern)) {
      validateSubstringPattern(entry.pattern, `${entryPath}.pattern`, issues)
    } else {
      pushIssue(issues, `${entryPath}.pattern`, 'pattern must be a RegExp instance.')
    }

    if (typeof entry.replacer !== 'function') {
      pushIssue(issues, `${entryPath}.replacer`, 'replacer must be a function.')
    }
  }
}

const validateTransformerEntries = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, path, `${path.split('.').at(-1) ?? 'transformers'} must be an array.`)
    return
  }

  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'function') {
      pushIssue(issues, `${path}[${index}]`, 'Transformer entries must be functions.')
    }
  }
}

const isConstructable = (value: unknown): value is Constructable => {
  if (typeof value !== 'function') {
    return false
  }

  try {
    Reflect.construct(Object, [], value)

    return true
  } catch {
    return false
  }
}

const isArraySubclassConstructor = (value: Constructable): boolean => {
  const prototype = value.prototype

  return typeof prototype === 'object'
    && prototype !== null
    && Object.prototype.isPrototypeOf.call(Array.prototype, prototype)
}

const validateCustomConstructorRegistrations = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, path, 'custom must be an array.')
    return
  }

  const seenConstructors = new Set<Constructable>()

  for (const [index, registration] of value.entries()) {
    const registrationPath = `${path}[${index}]`

    if (!isPlainObject(registration)) {
      pushIssue(issues, registrationPath, 'Custom constructor registrations must be objects.')
      continue
    }

    validateAllowedOptions(registration, customConstructorRegistrationOptionNames, registrationPath, issues)

    const constructor = Object.hasOwn(registration, 'constructor')
      ? registration.constructor
      : undefined

    if (!isConstructable(constructor)) {
      pushIssue(issues, `${registrationPath}.constructor`, 'Custom constructor must be constructable.')
    } else if (disallowedCustomConstructors.has(constructor)) {
      pushIssue(
        issues,
        `${registrationPath}.constructor`,
        'Custom constructor must not be Object, Array, or a built-in constructor.',
      )
    } else if (constructor === Function || isArraySubclassConstructor(constructor)) {
      pushIssue(
        issues,
        `${registrationPath}.constructor`,
        'Custom constructor must not be Object, Array, or a built-in constructor; Function and Array subclasses are also unsupported.',
      )
    } else if (seenConstructors.has(constructor)) {
      pushIssue(
        issues,
        `${registrationPath}.constructor`,
        'Custom constructor registrations must not repeat the same constructor.',
      )
    } else {
      seenConstructors.add(constructor)
    }

    if (Array.isArray(registration.transformers)) {
      validateTransformerEntries(registration.transformers, `${registrationPath}.transformers`, issues)
    } else {
      pushIssue(issues, `${registrationPath}.transformers`, 'transformers must be an array.')
    }
  }
}

const validateTransformerBuckets = (
  value: unknown,
  path: string,
  allowedOptions: ReadonlySet<string>,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!isPlainObject(value)) {
    pushIssue(issues, path, `${path.split('.').at(-1) ?? 'bucket'} must be an object.`)
    return
  }

  validateAllowedOptions(value, allowedOptions, path, issues)
  if (allowedOptions.has('custom')) {
    validateCustomConstructorRegistrations(value.custom, `${path}.custom`, issues)
  }

  for (const [bucketName, entries] of Object.entries(value)) {
    if (bucketName === 'custom') {
      continue
    }

    if (!allowedOptions.has(bucketName)) {
      continue
    }

    validateTransformerEntries(entries, `${path}.${bucketName}`, issues)
  }
}

const validateTransformers = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!isPlainObject(value)) {
    pushIssue(issues, path, 'transformers must be an object.')
    return
  }

  validateAllowedOptions(value, transformerOptionNames, path, issues)

  validateTransformerBuckets(value.byType, `${path}.byType`, transformerByTypeOptionNames, issues)
  validateTransformerBuckets(value.byConstructor, `${path}.byConstructor`, transformerByConstructorOptionNames, issues)
  validateTransformerEntries(value.fallback, `${path}.fallback`, issues)
}

const validateIgnoredValueTypes = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!isPlainObject(value)) {
    pushIssue(issues, path, 'ignoredValueTypes must be an object.')
    return
  }

  validateAllowedOptions(value, ignoredValueTypeOptionNames, path, issues)

  for (const optionName of Object.keys(value)) {
    if (!ignoredValueTypeOptionNames.has(optionName as keyof IgnoredValueTypesOption)) {
      continue
    }

    validateBooleanOption(value[optionName], path, optionName, issues)
  }
}

const validateValueTypes = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, path, 'types must be an array of value-type names.')
    return
  }

  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'string' || !valueTypeNames.has(entry as ValueTypeName)) {
      pushIssue(
        issues,
        `${path}[${index}]`,
        `Unsupported value type name "${String(entry)}". Supported names: ${[...valueTypeNames].join(', ')}.`,
      )
    }
  }
}

const validateDiagnostics = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void => {
  if (value === undefined) {
    return
  }

  if (!isPlainObject(value)) {
    pushIssue(issues, path, 'diagnostics must be an object.')
    return
  }

  validateAllowedOptions(value, diagnosticsOptionNames, path, issues)

  if (value.sink !== undefined && typeof value.sink !== 'function') {
    pushIssue(issues, `${path}.sink`, 'sink must be a function.')
  }
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

  if (isPathSelector(value.path)) {
    selectorCandidates.push({
      configPath: `${path}.path`,
      selector: value.path,
    })
  } else {
    pushIssue(issues, `${path}.path`, 'path must be a string or structured selector array.')
  }

  validateCensorOption(value.censor, path, issues)
  validateBooleanOption(value.remove, path, 'remove', issues)
  validateBooleanOption(value.retainStructure, path, 'retainStructure', issues)
  validateBooleanOption(value.replaceStringByLength, path, 'replaceStringByLength', issues)

  const effectiveReplaceStringByLength = typeof value.replaceStringByLength === 'boolean'
    ? value.replaceStringByLength
    : defaults.replaceStringByLength

  validateConflictingOptions(
    {
      censor: value.censor ?? defaults.censor,
      remove: value.remove ?? defaults.remove,
      retainStructure: value.retainStructure ?? defaults.retainStructure,
      replaceStringByLength: effectiveReplaceStringByLength,
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

  for (const [index, entry] of value.entries()) {
    const entryPath = `${path}[${index}]`

    if (isPathSelector(entry)) {
      selectorCandidates.push({
        configPath: entryPath,
        selector: entry,
      })
      continue
    }

    if (!isPlainObject(entry)) {
      pushIssue(issues, entryPath, `${entryPath.split('.').at(-1) ?? 'entry'} must be a string selector or path-rule object.`)
      continue
    }

    validatePathRule(entry, entryPath, defaults, issues, selectorCandidates)
  }
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
  validateBooleanOption(options.caseSensitiveKeyMatch, 'options', 'caseSensitiveKeyMatch', issues)
  validateCensorOption(options.censor, 'options', issues)
  validateDiagnostics(options.diagnostics, 'options.diagnostics', issues)
  validateBooleanOption(options.fuzzyKeyMatch, 'options', 'fuzzyKeyMatch', issues)
  validateIgnoredValueTypes(options.ignoredValueTypes, 'options.ignoredValueTypes', issues)
  validateValueTypes(options.types, 'options.types', issues)
  validateKeys(options.keys, 'options.keys', issues)
  validateStringTests(options.stringTests, 'options.stringTests', issues)
  validateTransformers(options.transformers, 'options.transformers', issues)
  validatePositiveIntegerOption(options.maxDepth, 'options', 'maxDepth', issues)
  validatePositiveIntegerOption(options.maxNodes, 'options', 'maxNodes', issues)
  validateBooleanOption(options.remove, 'options', 'remove', issues)
  validateBooleanOption(options.retainStructure, 'options', 'retainStructure', issues)
  validateBooleanOption(options.replaceStringByLength, 'options', 'replaceStringByLength', issues)
  validateSerialiseOption(options.serialise, 'options', issues)
  validateConflictingOptions(
    {
      censor: options.censor,
      remove: options.remove === true,
      retainStructure: options.retainStructure === true,
      replaceStringByLength: options.replaceStringByLength === true,
    },
    'options',
    issues,
  )
  validatePaths(
    options.paths,
    'options.paths',
    {
      censor: options.censor,
      remove: options.remove === true,
      retainStructure: options.retainStructure === true,
      replaceStringByLength: options.replaceStringByLength === true,
    },
    issues,
    selectorCandidates,
  )
  validatePathSelectors(selectorCandidates, issues)

  return createValidationReport(issues)
}
