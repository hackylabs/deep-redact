import type {
  DeepRedactOptions,
  SerialiseOption,
  Transformer,
} from '../../../src/index.js'

export const deniedPublicIntentTerms = Object.freeze([
  'restore',
  'unredact',
  'reveal',
  'decode',
] as const)

export const oneWayDeniedOptionNames = deniedPublicIntentTerms

export const publicValueExportNames = Object.freeze([
  'createRedactor',
  'deepRedact',
] as const)

export const publicPackageOwnKeys = Object.freeze([
  'Symbol(Symbol.toStringTag)',
  ...publicValueExportNames,
].sort())

export const publicConsoleAdapterValueExportNames = Object.freeze([
  'createRedactedConsole',
] as const)

export const publicConsoleAdapterOwnKeys = Object.freeze([
  'Symbol(Symbol.toStringTag)',
  ...publicConsoleAdapterValueExportNames,
].sort())

const sensitiveValue = 'story-4-5-secret-value/token'
const unsupportedDateIso = '1999-01-01T00:00:00.000Z'
const supportedDateIso = '2024-01-02T03:04:05.006Z'
const safeErrorMessage = 'safe fixture error'
const safeErrorStack = `Error: ${safeErrorMessage}\n    at one-way fixture`

const reversibleMetadataFieldNames = Object.freeze([
  '__deepRedactOriginal',
  '__deepRedactRestoreToken',
  'encodedOriginal',
  'hiddenOriginal',
  'lookupTable',
  'original',
  'originalPayload',
  'originalValue',
  'redactionLookup',
  'restoreLookup',
  'restoreToken',
  'reversibleEnvelope',
  'sourceValue',
  'unredactToken',
] as const)

const createSensitiveValueVariants = () => Object.freeze({
  base64: Buffer.from(sensitiveValue, 'utf8').toString('base64'),
  base64Unpadded: Buffer.from(sensitiveValue, 'utf8').toString('base64').replaceAll(/=+$/g, ''),
  base64Url: Buffer.from(sensitiveValue, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll(/=+$/g, ''),
  hex: Buffer.from(sensitiveValue, 'utf8').toString('hex'),
  hexUpper: Buffer.from(sensitiveValue, 'utf8').toString('hex').toUpperCase(),
  raw: sensitiveValue,
  uri: encodeURIComponent(sensitiveValue),
  uriLower: encodeURIComponent(sensitiveValue).replaceAll(/%[0-9A-F]{2}/g, (match) => match.toLowerCase()),
  unicodeEscaped: [...sensitiveValue]
    .map((character) => `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`)
    .join(''),
} as const)

export type OneWaySensitiveValueVariants = ReturnType<typeof createSensitiveValueVariants>

type PropertyKeyInput = PropertyKey | { readonly toString: () => string }

const normaliseName = (name: string): string => {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, '')
}

const formatKey = (key: PropertyKey): string => {
  return typeof key === 'symbol' ? key.toString() : String(key)
}

const formatPath = (parentPath: string, key: PropertyKey): string => {
  const keyText = formatKey(key)

  if (typeof key === 'symbol') {
    return `${parentPath}[${keyText}]`
  }

  if (/^[A-Za-z_$][\w$]*$/.test(keyText)) {
    return parentPath === '$' ? `$.${keyText}` : `${parentPath}.${keyText}`
  }

  return `${parentPath}[${JSON.stringify(keyText)}]`
}

export const assertNoDeniedPublicNames = (
  names: readonly PropertyKeyInput[],
  context: string,
): void => {
  for (const name of names) {
    const renderedName = typeof name === 'symbol' ? name.toString() : String(name)
    const normalisedName = normaliseName(renderedName)

    for (const term of deniedPublicIntentTerms) {
      if (normalisedName.includes(term)) {
        throw new Error(`${context} exposes denied public term "${term}" through "${renderedName}".`)
      }
    }
  }
}

const assertNoReversibleOutputKey = (key: PropertyKey, path: string): void => {
  const keyText = formatKey(key)
  const normalisedKey = normaliseName(keyText)

  for (const term of deniedPublicIntentTerms) {
    if (normalisedKey.includes(term)) {
      throw new Error(`${path} exposes denied output key "${keyText}" matching "${term}".`)
    }
  }

  for (const fieldName of reversibleMetadataFieldNames) {
    const normalisedFieldName = normaliseName(fieldName)

    if (normalisedKey.includes(normalisedFieldName)) {
      throw new Error(`${path} exposes reversible metadata key "${keyText}".`)
    }
  }
}

const assertNoDeniedString = (
  value: string,
  path: string,
  variants: OneWaySensitiveValueVariants,
): void => {
  for (const [variantName, variant] of Object.entries(variants)) {
    if (value.includes(variant)) {
      throw new Error(`${path} contains ${variantName} sensitive value "${variant}".`)
    }
  }

  const normalisedValue = normaliseName(value)

  for (const term of deniedPublicIntentTerms) {
    if (normalisedValue.includes(term)) {
      throw new Error(`${path} contains denied reverse-operation term "${term}".`)
    }
  }

  for (const fieldName of reversibleMetadataFieldNames) {
    if (normalisedValue.includes(normaliseName(fieldName))) {
      throw new Error(`${path} contains reversible metadata field name "${fieldName}".`)
    }
  }
}

const isDataDescriptor = (
  descriptor: PropertyDescriptor,
): descriptor is PropertyDescriptor & { readonly value: unknown } => {
  return Object.hasOwn(descriptor, 'value')
}

const scanBuiltInObjectSlots = (
  value: object,
  path: string,
  fixture: OneWayDenyListFixture,
  seen: WeakSet<object>,
): void => {
  if (value instanceof WeakMap || value instanceof WeakSet) {
    throw new TypeError(`${path} exposes an opaque weak lookup table that cannot be inspected for reversible handles.`)
  }

  if (value instanceof Map) {
    let index = 0

    for (const [mapKey, mapValue] of value.entries()) {
      scanOutputGraph(mapKey, `${path}<map-key:${index}>`, fixture, seen)
      scanOutputGraph(mapValue, `${path}<map-value:${index}>`, fixture, seen)
      index += 1
    }
  }

  if (value instanceof Set) {
    let index = 0

    for (const entry of value.values()) {
      scanOutputGraph(entry, `${path}<set-value:${index}>`, fixture, seen)
      index += 1
    }
  }

  if (value instanceof Date) {
    assertNoDeniedString(value.toISOString(), `${path}<date>`, fixture.sensitiveValueVariants)
  }

  if (value instanceof Error) {
    assertNoDeniedString(value.name, `${path}<error-name>`, fixture.sensitiveValueVariants)
    assertNoDeniedString(value.message, `${path}<error-message>`, fixture.sensitiveValueVariants)

    if (value.stack !== undefined) {
      assertNoDeniedString(value.stack, `${path}<error-stack>`, fixture.sensitiveValueVariants)
    }
  }

  if (value instanceof RegExp) {
    assertNoDeniedString(value.source, `${path}<regex-source>`, fixture.sensitiveValueVariants)
    assertNoDeniedString(value.flags, `${path}<regex-flags>`, fixture.sensitiveValueVariants)
  }

  if (value instanceof URL) {
    assertNoDeniedString(value.href, `${path}<url>`, fixture.sensitiveValueVariants)
  }
}

const scanOutputGraph = (
  value: unknown,
  path: string,
  fixture: OneWayDenyListFixture,
  seen: WeakSet<object>,
): void => {
  if (typeof value === 'string') {
    assertNoDeniedString(value, path, fixture.sensitiveValueVariants)
    return
  }

  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return
  }

  if (fixture.sensitiveSourceIdentities.has(value)) {
    throw new Error(`${path} exposes a source object identity that held sensitive data.`)
  }

  if (seen.has(value)) {
    return
  }

  seen.add(value)
  scanBuiltInObjectSlots(value, path, fixture, seen)

  for (const key of Reflect.ownKeys(value)) {
    const childPath = formatPath(path, key)
    assertNoReversibleOutputKey(key, childPath)

    const descriptor = Object.getOwnPropertyDescriptor(value, key)

    if (descriptor === undefined) {
      continue
    }

    if (isDataDescriptor(descriptor)) {
      scanOutputGraph(descriptor.value, childPath, fixture, seen)
      continue
    }

    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new Error(`${childPath} exposes an accessor descriptor that could reveal a reversible handle.`)
    }
  }
}

export const assertOneWayStructuredOutput = (
  value: unknown,
  fixture: OneWayDenyListFixture,
): void => {
  scanOutputGraph(value, '$', fixture, new WeakSet<object>())
}

export const assertOneWaySerialisedOutput = (
  value: string,
  fixture: OneWayDenyListFixture,
): void => {
  assertNoDeniedString(value, '$', fixture.sensitiveValueVariants)

  try {
    const parsedValue = JSON.parse(value) as unknown
    assertOneWayStructuredOutput(parsedValue, fixture)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return
    }

    throw error
  }
}

const stripDeclarationComments = (declarationText: string): string => {
  return declarationText
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*$/gm, '')
}

const collectDeclarationSurfaceNames = (declarationText: string): readonly string[] => {
  const declarationSurfaceNames = new Set<string>()
  const uncommentedText = stripDeclarationComments(declarationText)

  for (const match of uncommentedText.matchAll(/\b(?:interface|type|class|namespace|module|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    declarationSurfaceNames.add(match[1]!)
  }

  for (const match of uncommentedText.matchAll(/\bdeclare\s+(?:const|let|var|function|class|namespace)\s+([A-Za-z_$][\w$]*)/g)) {
    declarationSurfaceNames.add(match[1]!)
  }

  for (const match of uncommentedText.matchAll(/(?:^|[{\n;]\s*)(?:readonly\s+)?(?:"(?<doubleQuoted>[^"]+)"|'(?<singleQuoted>[^']+)'|(?<identifier>[A-Za-z_$][\w$]*))\??\s*(?::|\()/gm)) {
    const surfaceName = match.groups?.doubleQuoted ?? match.groups?.singleQuoted ?? match.groups?.identifier

    if (surfaceName !== undefined) {
      declarationSurfaceNames.add(surfaceName)
    }
  }

  for (const exportBlock of uncommentedText.matchAll(/export\s+\{(?<body>[\s\S]*?)\};?/gu)) {
    const exportBody = exportBlock.groups?.body

    if (exportBody === undefined) {
      continue
    }

    for (const entry of exportBody.split(',')) {
      const exportName = entry
        .trim()
        .replace(/^type\s+/u, '')
        .split(/\s+as\s+/u)
        .at(-1)
        ?.trim()

      if (exportName !== undefined && exportName.length > 0) {
        declarationSurfaceNames.add(exportName)
      }
    }
  }

  return [...declarationSurfaceNames].sort()
}

export const assertNoDeniedDeclarationSurface = (
  declarationText: string,
  context: string,
): void => {
  assertNoDeniedPublicNames(collectDeclarationSurfaceNames(declarationText), context)
}

const createSafeError = (): Error => {
  const error = new Error(safeErrorMessage)
  error.stack = safeErrorStack

  return error
}

const throwingDateTransformer: Transformer = (value: unknown): unknown => {
  if (value instanceof Date && value.toISOString() === unsupportedDateIso) {
    throw new Error('one-way fixture unsupported Date')
  }

  return value
}

export interface OneWayDenyListFixture {
  readonly createOptions: (options: { readonly serialise: SerialiseOption }) => DeepRedactOptions;
  readonly expectedSerialisedOutput: string;
  readonly expectedStructuredOutput: unknown;
  readonly payload: unknown;
  readonly sensitiveSourceIdentities: WeakSet<object>;
  readonly sensitiveValue: string;
  readonly sensitiveValueVariants: OneWaySensitiveValueVariants;
}

export const createOneWayDenyListFixture = (): OneWayDenyListFixture => {
  const sensitiveSymbol = Symbol('one-way-sensitive-symbol')
  const account = {
    label: 'account',
    secret: sensitiveValue,
    visible: 'safe account value',
  } as Record<PropertyKey, unknown>
  Object.defineProperty(account, 'hiddenSecret', {
    configurable: true,
    enumerable: false,
    value: sensitiveValue,
    writable: true,
  })
  account[sensitiveSymbol] = sensitiveValue

  const circular = {
    label: 'circular',
    secret: sensitiveValue,
  } as Record<string, unknown>
  circular.self = circular

  const repeated = {
    label: 'repeated',
    secret: sensitiveValue,
    visible: 'safe repeated value',
  }

  const payload = {
    account,
    circular,
    firstRepeat: repeated,
    ignoredBranch: {
      note: 'safe ignored branch',
      value: 'ignored-safe-value',
    },
    secondRepeat: repeated,
    transformed: {
      bigint: 42n,
      date: new Date(supportedDateIso),
      error: createSafeError(),
      ignoredMap: new Map([
        ['password', 'ignored-safe-password'],
        ['note', 'safe map note'],
      ]),
      regex: /safe-token/gi,
      set: new Set(['safe set value', 7]),
      unsupported: new Date(unsupportedDateIso),
      url: new URL('https://example.test/safe?visible=true'),
    },
  }

  const sensitiveSourceIdentities = new WeakSet<object>([
    account,
    circular,
    payload,
    repeated,
  ])

  const expectedStructuredOutput = {
    account: {
      label: 'account',
      secret: '[REDACTED]',
      visible: 'safe account value',
    },
    circular: {
      label: 'circular',
      secret: '[REDACTED]',
      self: {
        _transformer: 'circular',
        path: 'circular.self',
        value: 'circular',
      },
    },
    firstRepeat: {
      label: 'repeated',
      secret: '[REDACTED]',
      visible: 'safe repeated value',
    },
    ignoredBranch: {
      note: 'safe ignored branch',
      value: 'ignored-safe-value',
    },
    secondRepeat: {
      label: 'repeated',
      secret: '[REDACTED]',
      visible: 'safe repeated value',
    },
    transformed: {
      bigint: {
        _transformer: 'bigint',
        value: {
          radix: 10,
          number: '42',
        },
      },
      date: {
        _transformer: 'date',
        datetime: supportedDateIso,
      },
      error: {
        _transformer: 'error',
        value: {
          type: 'Error',
          message: safeErrorMessage,
          stack: safeErrorStack,
        },
      },
      ignoredMap: {
        _transformer: 'map',
        value: {
          password: 'ignored-safe-password',
          note: 'safe map note',
        },
      },
      regex: {
        _transformer: 'regex',
        value: {
          source: 'safe-token',
          flags: 'gi',
        },
      },
      set: {
        _transformer: 'set',
        value: ['safe set value', 7],
      },
      unsupported: '[UNSUPPORTED]',
      url: {
        _transformer: 'url',
        value: 'https://example.test/safe?visible=true',
      },
    },
  }

  return {
    createOptions: ({ serialise }) => ({
      ignoredValueTypes: {
        Map: true,
      },
      keys: ['secret'],
      serialise,
      stringTests: [new RegExp(sensitiveValue.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'g')],
      transformers: {
        byConstructor: {
          Date: [throwingDateTransformer],
        },
      },
    }),
    expectedSerialisedOutput: JSON.stringify(expectedStructuredOutput),
    expectedStructuredOutput,
    payload,
    sensitiveSourceIdentities,
    sensitiveValue,
    sensitiveValueVariants: createSensitiveValueVariants(),
  }
}

const renderBulletList = (values: readonly string[]): string => {
  return values.map((value) => `- \`${value}\``).join('\n')
}

export const renderOneWayRedactionDocument = (): string => {
  return `<!-- This file is generated by scripts/generate-one-way-redaction-doc.ts. Do not edit by hand. -->
# One-way Redaction

Deep Redact is a one-way redaction library. It returns redacted artefacts only and intentionally provides no supported API, option, adapter entrypoint, token, envelope, or compatibility shim for reversing output.

## Public Surface

The public root value exports are:

${renderBulletList(publicValueExportNames)}

The public console adapter value exports are:

${renderBulletList(publicConsoleAdapterValueExportNames)}

The public surface must not expose names for these reverse-operation intents:

${renderBulletList(deniedPublicIntentTerms)}

## Output Artefacts

Structured and serialised outputs must not contain original sensitive values, obvious reversible encodings of those values, lookup tables, hidden originals, restore tokens, or reversible metadata envelopes. Returned structured graphs are also checked for non-enumerable properties, symbol-keyed properties, property descriptors, and source object identity handles.

This contract covers artefacts produced by Deep Redact for values selected by the configured redaction policy. Caller-controlled \`censor\` and \`serialise\` functions, and values intentionally excluded through ignored branches or ignored value types, remain caller policy boundaries; Deep Redact does not add a restore API or hidden reversible runtime metadata around them.

Operational transformer output is still allowed. Values such as circular markers, \`BigInt\`, \`Date\`, \`Error\`, \`Map\`, \`RegExp\`, \`Set\`, \`URL\`, and \`[UNSUPPORTED]\` placeholders expose only their documented operational representation.

## Divergence From fast-redact And Earlier Versions

\`fast-redact\` and earlier package designs included a restore path. Deep Redact v4 deliberately does not: there is no \`restore\`, no \`unredact\`, no restore token, no reversible metadata envelope, and no public compatibility shim for reversing output.
`
}
