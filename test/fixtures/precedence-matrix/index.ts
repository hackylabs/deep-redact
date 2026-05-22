import type {
  DeepRedactOptions,
  FunctionCensorContext,
  SubstringRule,
} from '../../../src/index.js'

export const precedenceOrder = Object.freeze([
  'exact string-path',
  'structured path',
  'exact key',
  'regex property',
  'substring',
] as const)

export type PrecedencePublicTerm = typeof precedenceOrder[number]
export type PrecedenceComparisonTerm = PrecedencePublicTerm | 'less specific exact string-path'

export interface PrecedenceEdge {
  readonly higher: PrecedenceComparisonTerm;
  readonly lower: PrecedenceComparisonTerm;
}

export const requiredPrecedenceEdges = [
  ['exact string-path', 'structured path', 'exact-string-path-versus-structured-path'],
  ['structured path', 'exact key', 'structured-path-versus-exact-key'],
  ['exact key', 'regex property', 'exact-key-versus-regex-property'],
  ['regex property', 'substring', 'regex-property-versus-substring'],
] as const satisfies readonly (readonly [PrecedencePublicTerm, PrecedencePublicTerm, string])[]

interface ExpectedCallCount {
  readonly label: string;
  readonly count: number;
}

export interface PrecedenceRuntimeInstrumentation {
  readonly track?: <T extends (...arguments_: any[]) => unknown>(
    label: string,
    implementation: T,
  ) => T;
}

interface PrecedenceOutputRuntimeCase {
  readonly outcome: 'output';
  readonly options: DeepRedactOptions;
  readonly input: unknown;
  readonly expectedOutput: unknown;
  readonly expectedCallCounts: readonly ExpectedCallCount[];
}

interface PrecedenceInitialisationErrorRuntimeCase {
  readonly outcome: 'initialisation-error';
  readonly options: DeepRedactOptions;
  readonly input: unknown;
  readonly expectedError: RegExp;
  readonly expectedCallCounts: readonly ExpectedCallCount[];
}

export type PrecedenceRuntimeCase = PrecedenceOutputRuntimeCase | PrecedenceInitialisationErrorRuntimeCase

interface FunctionPlaceholder {
  readonly kind: 'function-placeholder';
  readonly name: string;
}

interface OutputDocumentationOutcome {
  readonly input: unknown;
  readonly options: unknown;
  readonly expectedOutput: unknown;
  readonly expectedInitialisationError?: never;
}

interface InitialisationErrorDocumentationOutcome {
  readonly input: unknown;
  readonly options: unknown;
  readonly expectedInitialisationError: string;
  readonly expectedOutput?: never;
}

interface PrecedenceMatrixFixtureBase {
  readonly name: string;
  readonly title: string;
  readonly summary: string;
  readonly edges: readonly PrecedenceEdge[];
}

interface PrecedenceOutputMatrixFixture extends PrecedenceMatrixFixtureBase {
  readonly outcome: 'output';
  readonly documentation: OutputDocumentationOutcome;
  readonly createRuntimeCase: (instrumentation?: PrecedenceRuntimeInstrumentation) => PrecedenceOutputRuntimeCase;
}

interface PrecedenceInitialisationErrorMatrixFixture extends PrecedenceMatrixFixtureBase {
  readonly outcome: 'initialisation-error';
  readonly documentation: InitialisationErrorDocumentationOutcome;
  readonly createRuntimeCase: (instrumentation?: PrecedenceRuntimeInstrumentation) => PrecedenceInitialisationErrorRuntimeCase;
}

export type PrecedenceMatrixFixture =
  | PrecedenceOutputMatrixFixture
  | PrecedenceInitialisationErrorMatrixFixture

const tokenPattern = /token=[^&\s]+/
const keySourceMarker = 'keySourceMarker'
const tokenSubstringMarker = 'tokenSubstringMarker'

const functionPlaceholder = (name: string): FunctionPlaceholder => Object.freeze({
  kind: 'function-placeholder',
  name,
})

const isFunctionPlaceholder = (value: unknown): value is FunctionPlaceholder => {
  return typeof value === 'object'
    && value !== null
    && (value as { kind?: unknown }).kind === 'function-placeholder'
}

const markKeySource = (_value: unknown, context: FunctionCensorContext): string => {
  return context.rulePath[0] instanceof RegExp ? '[REGEX-PROPERTY]' : '[EXACT-KEY]'
}

const trackCall = <T extends (...arguments_: any[]) => unknown>(
  instrumentation: PrecedenceRuntimeInstrumentation | undefined,
  label: string,
  implementation: T,
): T => {
  return instrumentation?.track?.(label, implementation) ?? implementation
}

const createTokenSubstringReplacer = (
  instrumentation: PrecedenceRuntimeInstrumentation | undefined,
  label = tokenSubstringMarker,
): SubstringRule['replacer'] => {
  return trackCall(
    instrumentation,
    label,
    (value: string, pattern: RegExp) => value.replace(pattern, 'token=[SUBSTRING]'),
  )
}

const createTrackedSubstringRule = (
  instrumentation: PrecedenceRuntimeInstrumentation | undefined,
  expectedCalls: number,
  label = tokenSubstringMarker,
): {
  readonly rule: SubstringRule;
  readonly expectedCallCount: ExpectedCallCount;
} => {
  return {
    rule: {
      pattern: tokenPattern,
      replacer: createTokenSubstringReplacer(instrumentation, label),
    },
    expectedCallCount: {
      label,
      count: expectedCalls,
    },
  }
}

const createOutputCase = (
  options: DeepRedactOptions,
  input: unknown,
  expectedOutput: unknown,
  expectedCallCounts: readonly ExpectedCallCount[] = [],
): PrecedenceOutputRuntimeCase => {
  return {
    outcome: 'output',
    options,
    input,
    expectedOutput,
    expectedCallCounts,
  }
}

const createInitialisationErrorCase = (
  options: DeepRedactOptions,
  input: unknown,
  expectedError: RegExp,
): PrecedenceInitialisationErrorRuntimeCase => {
  return {
    outcome: 'initialisation-error',
    options,
    input,
    expectedError,
    expectedCallCounts: [],
  }
}

export const precedenceMatrixFixtures = Object.freeze([
  {
    name: 'path-versus-key',
    title: 'exact string-path beats exact key on the same leaf',
    summary: 'A canonical exact string-path rule claims the leaf before the exact key rule or substring replacement can run.',
    outcome: 'output',
    edges: [
      { higher: 'exact string-path', lower: 'exact key' },
      { higher: 'exact string-path', lower: 'regex property' },
      { higher: 'exact string-path', lower: 'substring' },
    ],
    documentation: {
      input: { account: { secret: 'token=path' } },
      options: {
        censor: functionPlaceholder(keySourceMarker),
        keys: ['secret', /^secret$/],
        paths: [
          {
            path: 'account.secret',
            censor: '[EXACT-STRING-PATH]',
          },
        ],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { secret: '[EXACT-STRING-PATH]' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          censor: markKeySource,
          keys: ['secret', /^secret$/],
          paths: [
            {
              path: 'account.secret',
              censor: '[EXACT-STRING-PATH]',
            },
          ],
          stringTests: [substringRule.rule],
        },
        { account: { secret: 'token=path' } },
        { account: { secret: '[EXACT-STRING-PATH]' } },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'exact-key-versus-regex-property',
    title: 'exact key beats regex property on the same leaf',
    summary: 'A literal key selector claims the property before a regex property selector with the same resolved policy.',
    outcome: 'output',
    edges: [
      { higher: 'exact key', lower: 'regex property' },
      { higher: 'exact key', lower: 'substring' },
    ],
    documentation: {
      input: { account: { secret: 'token=key' } },
      options: {
        censor: functionPlaceholder(keySourceMarker),
        keys: ['secret', /^secret$/],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { secret: '[EXACT-KEY]' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          censor: markKeySource,
          keys: ['secret', /^secret$/],
          stringTests: [substringRule.rule],
        },
        { account: { secret: 'token=key' } },
        { account: { secret: '[EXACT-KEY]' } },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'whole-value-versus-substring',
    title: 'whole-value censor beats substring replacement',
    summary: 'A whole-value exact key rule censors the full string before the substring replacer can edit it.',
    outcome: 'output',
    edges: [
      { higher: 'exact key', lower: 'substring' },
    ],
    documentation: {
      input: { account: { secret: 'token=whole' } },
      options: {
        censor: '[EXACT-KEY]',
        keys: ['secret'],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { secret: '[EXACT-KEY]' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          censor: '[EXACT-KEY]',
          keys: ['secret'],
          stringTests: [substringRule.rule],
        },
        { account: { secret: 'token=whole' } },
        { account: { secret: '[EXACT-KEY]' } },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'retain-structure-descendant-targeting',
    title: 'retained container preserves descendant targeting',
    summary: 'A retained exact string-path keeps the container shape, lets a descendant structured path win, and still claims descendants with no higher direct rule.',
    outcome: 'output',
    edges: [
      { higher: 'structured path', lower: 'exact key' },
      { higher: 'exact string-path', lower: 'substring' },
    ],
    documentation: {
      input: {
        account: {
          secret: { value: 'token=secret' },
          inherited: 'token=inherited',
          note: 'token=note',
        },
        free: 'token=free',
      },
      options: {
        censor: functionPlaceholder(keySourceMarker),
        keys: ['note'],
        paths: [
          {
            path: 'account',
            censor: '[EXACT-STRING-PATH]',
            retainStructure: true,
          },
          {
            path: ['account', 'secret', /^value$/],
            censor: '[STRUCTURED-PATH]',
          },
        ],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: {
        account: {
          secret: { value: '[STRUCTURED-PATH]' },
          inherited: '[EXACT-STRING-PATH]',
          note: '[EXACT-STRING-PATH]',
        },
        free: 'token=[SUBSTRING]',
      },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 1)

      return createOutputCase(
        {
          censor: markKeySource,
          keys: ['note'],
          paths: [
            {
              path: 'account',
              censor: '[EXACT-STRING-PATH]',
              retainStructure: true,
            },
            {
              path: ['account', 'secret', /^value$/],
              censor: '[STRUCTURED-PATH]',
            },
          ],
          stringTests: [substringRule.rule],
        },
        {
          account: {
            secret: { value: 'token=secret' },
            inherited: 'token=inherited',
            note: 'token=note',
          },
          free: 'token=free',
        },
        {
          account: {
            secret: { value: '[STRUCTURED-PATH]' },
            inherited: '[EXACT-STRING-PATH]',
            note: '[EXACT-STRING-PATH]',
          },
          free: 'token=[SUBSTRING]',
        },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'duplicate-canonical-path-init-failure',
    title: 'duplicate canonical exact paths fail initialisation',
    summary: 'Differently written selectors that canonicalise to the same exact path fail before runtime resolution.',
    outcome: 'initialisation-error',
    edges: [],
    documentation: {
      input: { account: { secret: 'token=duplicate' } },
      options: {
        paths: [
          {
            path: 'account.secret',
            censor: '[EXACT-STRING-PATH]',
          },
          {
            path: ['account', 'secret'],
            censor: '[EXACT-STRING-PATH]',
          },
        ],
      },
      expectedInitialisationError: 'Duplicate canonical selector "account.secret" already defined at options.paths[0].path.',
    },
    createRuntimeCase: () => {
      return createInitialisationErrorCase(
        {
          paths: [
            {
              path: 'account.secret',
              censor: '[EXACT-STRING-PATH]',
            },
            {
              path: ['account', 'secret'],
              censor: '[EXACT-STRING-PATH]',
            },
          ],
        },
        { account: { secret: 'token=duplicate' } },
        /Duplicate canonical selector "account\.secret" already defined at options\.paths\[0\]\.path\./,
      )
    },
  },
  {
    name: 'exact-string-path-specificity',
    title: 'more specific exact string-path beats retained parent exact string-path',
    summary: 'The retained parent keeps descendants reachable while the more specific exact string-path claims its own leaf.',
    outcome: 'output',
    edges: [
      { higher: 'exact string-path', lower: 'less specific exact string-path' },
    ],
    documentation: {
      input: {
        account: {
          secret: 'token=secret',
          sibling: 'token=sibling',
        },
      },
      options: {
        paths: [
          {
            path: 'account',
            censor: '[EXACT-STRING-PATH:PARENT]',
            retainStructure: true,
          },
          {
            path: 'account.secret',
            censor: '[EXACT-STRING-PATH:DESCENDANT]',
          },
        ],
      },
      expectedOutput: {
        account: {
          secret: '[EXACT-STRING-PATH:DESCENDANT]',
          sibling: '[EXACT-STRING-PATH:PARENT]',
        },
      },
    },
    createRuntimeCase: () => {
      return createOutputCase(
        {
          paths: [
            {
              path: 'account',
              censor: '[EXACT-STRING-PATH:PARENT]',
              retainStructure: true,
            },
            {
              path: 'account.secret',
              censor: '[EXACT-STRING-PATH:DESCENDANT]',
            },
          ],
        },
        {
          account: {
            secret: 'token=secret',
            sibling: 'token=sibling',
          },
        },
        {
          account: {
            secret: '[EXACT-STRING-PATH:DESCENDANT]',
            sibling: '[EXACT-STRING-PATH:PARENT]',
          },
        },
      )
    },
  },
  {
    name: 'exact-string-path-versus-structured-path',
    title: 'exact string-path beats structured path on the same leaf',
    summary: 'A canonical exact string-path rule wins over a matching structured path selector.',
    outcome: 'output',
    edges: [
      { higher: 'exact string-path', lower: 'structured path' },
      { higher: 'exact string-path', lower: 'substring' },
    ],
    documentation: {
      input: { account: { secret: 'token=exact' } },
      options: {
        keys: ['secret'],
        paths: [
          {
            path: 'account.secret',
            censor: '[EXACT-STRING-PATH]',
          },
          {
            path: ['account', /^secret$/],
            censor: '[STRUCTURED-PATH]',
          },
        ],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { secret: '[EXACT-STRING-PATH]' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          keys: ['secret'],
          paths: [
            {
              path: 'account.secret',
              censor: '[EXACT-STRING-PATH]',
            },
            {
              path: ['account', /^secret$/],
              censor: '[STRUCTURED-PATH]',
            },
          ],
          stringTests: [substringRule.rule],
        },
        { account: { secret: 'token=exact' } },
        { account: { secret: '[EXACT-STRING-PATH]' } },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'structured-path-versus-exact-key',
    title: 'structured path beats exact key on the same leaf',
    summary: 'A matching structured path rule claims the leaf before exact key or regex property rules can run.',
    outcome: 'output',
    edges: [
      { higher: 'structured path', lower: 'exact key' },
      { higher: 'structured path', lower: 'regex property' },
      { higher: 'structured path', lower: 'substring' },
    ],
    documentation: {
      input: { account: { secret: 'token=structured' } },
      options: {
        censor: functionPlaceholder(keySourceMarker),
        keys: ['secret', /^secret$/],
        paths: [
          {
            path: ['account', /^secret$/],
            censor: '[STRUCTURED-PATH]',
          },
        ],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { secret: '[STRUCTURED-PATH]' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          censor: markKeySource,
          keys: ['secret', /^secret$/],
          paths: [
            {
              path: ['account', /^secret$/],
              censor: '[STRUCTURED-PATH]',
            },
          ],
          stringTests: [substringRule.rule],
        },
        { account: { secret: 'token=structured' } },
        { account: { secret: '[STRUCTURED-PATH]' } },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'regex-property-versus-substring',
    title: 'regex property beats substring replacement on the same leaf',
    summary: 'A regex property selector claims the whole value before the substring replacer can edit the string.',
    outcome: 'output',
    edges: [
      { higher: 'regex property', lower: 'substring' },
    ],
    documentation: {
      input: { account: { sessionToken: 'token=regex' } },
      options: {
        censor: functionPlaceholder(keySourceMarker),
        keys: [/token$/i],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { sessionToken: '[REGEX-PROPERTY]' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          censor: markKeySource,
          keys: [/token$/i],
          stringTests: [substringRule.rule],
        },
        { account: { sessionToken: 'token=regex' } },
        { account: { sessionToken: '[REGEX-PROPERTY]' } },
        [substringRule.expectedCallCount],
      )
    },
  },
  {
    name: 'whole-value-removal-versus-substring',
    title: 'whole-value removal beats substring replacement',
    summary: 'A whole-value removal rule removes the property before any substring replacement can run.',
    outcome: 'output',
    edges: [
      { higher: 'exact string-path', lower: 'substring' },
    ],
    documentation: {
      input: { account: { secret: 'token=remove', safe: 'keep' } },
      options: {
        paths: [
          {
            path: 'account.secret',
            remove: true,
          },
        ],
        stringTests: [
          {
            pattern: tokenPattern,
            replacer: functionPlaceholder(tokenSubstringMarker),
          },
        ],
      },
      expectedOutput: { account: { safe: 'keep' } },
    },
    createRuntimeCase: (instrumentation) => {
      const substringRule = createTrackedSubstringRule(instrumentation, 0)

      return createOutputCase(
        {
          paths: [
            {
              path: 'account.secret',
              remove: true,
            },
          ],
          stringTests: [substringRule.rule],
        },
        { account: { secret: 'token=remove', safe: 'keep' } },
        { account: { safe: 'keep' } },
        [substringRule.expectedCallCount],
      )
    },
  },
] as const satisfies readonly PrecedenceMatrixFixture[])

const formatRegExp = (value: RegExp): string => {
  return `/${value.source.replaceAll('/', String.raw`\/`)}/${value.flags}`
}

const isPlainRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof RegExp)
}

const renderObjectKey = (key: string): string => {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
}

export const renderDocumentationValue = (value: unknown, indent = 0): string => {
  const padding = ' '.repeat(indent)
  const childPadding = ' '.repeat(indent + 2)

  if (isFunctionPlaceholder(value)) {
    return value.name
  }

  if (value instanceof RegExp) {
    return formatRegExp(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }

    const entries = value.map((entry) => {
      return `${childPadding}${renderDocumentationValue(entry, indent + 2)},`
    })

    return `[\n${entries.join('\n')}\n${padding}]`
  }

  if (isPlainRecord(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return '{}'
    }

    const renderedEntries = entries.map(([key, entry]) => {
      return `${childPadding}${renderObjectKey(key)}: ${renderDocumentationValue(entry, indent + 2)},`
    })

    return `{\n${renderedEntries.join('\n')}\n${padding}}`
  }

  if (value === undefined) {
    return 'undefined'
  }

  return JSON.stringify(value)
}

const renderCodeBlock = (value: unknown): string => {
  return `\`\`\`ts\n${renderDocumentationValue(value)}\n\`\`\``
}

const renderPrecedenceMatrixRows = (): string => {
  const rows: string[] = [
    '| Higher-precedence rule | Lower-precedence rule | Winner |',
    '| --- | --- | --- |',
  ]

  for (const [index, higherPrecedenceTerm] of precedenceOrder.entries()) {
    for (const lowerPrecedenceTerm of precedenceOrder.slice(index + 1)) {
      rows.push(`| \`${higherPrecedenceTerm}\` | \`${lowerPrecedenceTerm}\` | \`${higherPrecedenceTerm}\` |`)
    }
  }

  return rows.join('\n')
}

export const renderPrecedenceFixtureMarkdown = (fixture: PrecedenceMatrixFixture): string => {
  const lines = [
    `### ${fixture.name}`,
    '',
    fixture.summary,
    '',
  ]

  if (fixture.documentation.input !== undefined) {
    lines.push('Input fixture:', '', renderCodeBlock(fixture.documentation.input), '')
  }

  lines.push('Configuration:', '', renderCodeBlock(fixture.documentation.options), '')

  if (fixture.outcome === 'output') {
    lines.push('Expected output:', '', renderCodeBlock(fixture.documentation.expectedOutput), '')
  } else {
    lines.push(
      'Expected initialisation error:',
      '',
      `\`\`\`text\n${fixture.documentation.expectedInitialisationError}\n\`\`\``,
    )
  }

  return `${lines.join('\n').trimEnd()}\n`
}

export const renderPrecedenceDocument = (): string => {
  const exampleSections = precedenceMatrixFixtures
    .map((fixture) => renderPrecedenceFixtureMarkdown(fixture))
    .join('\n')

  return `<!-- This file is generated by scripts/generate-precedence-doc.ts. Do not edit by hand. -->

# Normative Precedence Contract

Deep Redact resolves overlapping targeting rules with one public total order:

\`exact string-path\` > \`structured path\` > \`exact key\` > \`regex property\` > \`substring\`

## Overlap Matrix

${renderPrecedenceMatrixRows()}

## Additional Rules

- When exact string-path rules overlap in the same layer, the more specific canonical exact string-path wins over the less specific canonical exact string-path.
- When duplicate selectors collapse to the same canonical path within one layer, initialisation fails rather than choosing a runtime winner.
- Whole-value censoring or removal wins over substring replacement.
- \`retainStructure: true\` preserves the matched container and keeps descendant targeting active unless a higher-precedence whole-value rule has already claimed that descendant.

## Worked Examples

${exampleSections}`
}
