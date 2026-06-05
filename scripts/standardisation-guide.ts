import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadExampleManifest } from './example-validation.ts'
import { loadFastRedactMigrationMatrix } from './fast-redact-migration.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
export const standardisationGuideDocPath = path.join(repositoryRoot, 'docs', 'platform', 'standardisation-guide.md')

const markdownRelativeLinkFromGuide = (repoRoot: string, targetPath: string): string => {
  const guideDirectory = path.join(repoRoot, 'docs', 'platform')
  const absoluteTarget = path.join(repoRoot, targetPath)
  return path.relative(guideDirectory, absoluteTarget).split(path.sep).join(path.posix.sep)
}

const CAPABILITY_EXAMPLES = [
  { label: 'key targeting',                           exampleId: 'key-targeting' },
  { label: 'fuzzy key matching',                       exampleId: 'fuzzy-key-matching' },
  { label: 'case-insensitive key matching',            exampleId: 'case-insensitive-key-matching' },
  { label: 'path targeting',                          exampleId: 'path-targeting' },
  { label: 'path-segment ignore selectors',            exampleId: 'path-segment-ignore' },
  { label: 'regex property matching',                 exampleId: 'regex-property-matching' },
  { label: 'substring targeting',                     exampleId: 'substring-targeting' },
  { label: 'replacement behaviour',                   exampleId: 'replacement-and-removal' },
  { label: 'structured versus serialised output',     exampleId: 'serialised-output' },
  { label: 'transformer support',                     exampleId: 'custom-transformer' },
  { label: 'ignored-value-type behaviour',            exampleId: 'ignored-value-types' },
  { label: 'graceful [UNSUPPORTED] degradation',      exampleId: 'graceful-error-replacement' },
  { label: 'optional console.* redaction',            exampleId: 'console-redaction' },
] as const

export const buildStandardisationGuide = (repoRoot: string): string => {
  const manifest = loadExampleManifest(repoRoot)
  const matrix = loadFastRedactMigrationMatrix(repoRoot)

  for (const { exampleId } of CAPABILITY_EXAMPLES) {
    if (!manifest.rows.some(r => r.id === exampleId)) {
      throw new Error(`standardisation-guide: CAPABILITY_EXAMPLES references unknown example ID: "${exampleId}"`)
    }
  }

  const divergences = matrix.rows.filter(row => row.classification === 'intentional-divergence')
  const divergenceLines = divergences.map(row => {
    if (!row.v4Action) throw new Error(`standardisation-guide: row "${row.id}" is missing v4Action`)
    if (!row.v4Action.fastRedactBehaviour) throw new Error(`standardisation-guide: row "${row.id}" is missing v4Action.fastRedactBehaviour`)
    if (!row.v4Action.v4Behaviour) throw new Error(`standardisation-guide: row "${row.id}" is missing v4Action.v4Behaviour`)
    if (!row.v4Action.reason) throw new Error(`standardisation-guide: row "${row.id}" is missing v4Action.reason`)
    return `- **${row.id}**: ${row.v4Action.fastRedactBehaviour} → ${row.v4Action.v4Behaviour} (${row.v4Action.reason})`
  })

  const capabilityLines = CAPABILITY_EXAMPLES.map(({ label, exampleId }) => {
    const manifestRow = manifest.rows.find(r => r.id === exampleId)!
    const exampleLink = markdownRelativeLinkFromGuide(repoRoot, manifestRow.docTarget)
    return `- [${label}](${exampleLink})`
  })
  const precedenceLink = markdownRelativeLinkFromGuide(repoRoot, 'docs/architecture/precedence.md')
  const fastRedactMigrationLink = markdownRelativeLinkFromGuide(repoRoot, 'docs/migration/from-fast-redact.md')
  const v3MigrationLink = markdownRelativeLinkFromGuide(repoRoot, 'docs/migration/from-v3.md')
  const oneWayRedactionLink = markdownRelativeLinkFromGuide(repoRoot, 'docs/architecture/one-way-redaction.md')

  return [
    '# Deep Redact Standardisation Guide',
    '',
    'This guide is generated from canonical release artefacts. It covers supported capabilities, targeting semantics, migration expectations, verification evidence, and adoption decision scope for platform and security evaluators.',
    '',
    '## Supported capabilities',
    '',
    'Deep Redact is a one-way redaction library. There is no `restore` or `unredact` capability.',
    '',
    'The following capabilities are supported and covered by validated worked examples:',
    '',
    ...capabilityLines,
    '',
    '## Targeting semantics',
    '',
    'Rules are evaluated in precedence order. When multiple rules match a node, the higher-precedence rule wins:',
    '',
    '1. **exact string-path** — full dot-notation path, literal match',
    '2. **structured path** — compiled path segments with wildcard and exclusion support',
    '3. **exact key** — literal property name, no path context',
    '4. **regex property** — regular-expression match against the property name',
    '5. **substring** — match against string value content',
    '',
    'When `retainStructure: true` is set on a matched rule, descendant nodes remain traversable for lower-precedence rules. Without it, the matched node and all descendants are replaced as a unit.',
    '',
    `For the canonical precedence contract and full matrix, see [docs/architecture/precedence.md](${precedenceLink}).`,
    '',
    '## Migration expectations',
    '',
    '### fast-redact migration',
    '',
    ...(divergences.length > 0
      ? [
          'The following intentional behavioural divergences from `fast-redact` have been validated for Deep Redact v4:',
          '',
          ...divergenceLines,
          '',
        ]
      : []),
    `For the complete migration matrix and fixture-verified examples, see [docs/migration/from-fast-redact.md](${fastRedactMigrationLink}).`,
    '',
    '### Deep Redact v3 migration',
    '',
    'Deep Redact v4 introduces a factory API (`deepRedact(config)`) to replace the v3 class instantiation pattern (`new DeepRedact(config)`). The redaction method is unchanged.',
    '',
    `For the complete v3 migration matrix and fixture-verified examples, see [docs/migration/from-v3.md](${v3MigrationLink}).`,
    '',
    '## Verification evidence',
    '',
    'The following artefacts have been produced and committed as part of the v4 release verification:',
    '',
    '- **Installation verification matrix** — verified across Node.js 22/24, npm, pnpm, yarn, bun, and deno: `test/artefacts/install-matrix/`',
    '- **Worked-example manifest** — all examples validated against fixture inputs and expected outputs: `docs/examples/manifest.json`',
    '- **Benchmark artefacts** — performance comparison against fast-redact: `test/artefacts/benchmarks/`',
    '- **Benchmark results document** — rendered from committed artefacts: `docs/benchmarks/results.md`',
    '',
    'Supported installation environments: Node.js 22 LTS and 24 LTS (npm, pnpm, yarn, bun); Deno 2.x.',
    '',
    'Performance: Deep Redact v4 has been benchmarked against `fast-redact` on comparable path-based workloads. Benchmark artefacts are committed and gate release candidates.',
    '',
    '## Adoption decision scope',
    '',
    'Deep Redact v4 is a single-library, one-way redaction engine. Guidance on what is in and out of scope:',
    '',
    '**In scope:**',
    '- Service-root singleton initialisation for log and payload redaction',
    '- Flexible targeting of sensitive fields by key, path, regex, or substring',
    '- Structured and serialised output formats',
    '- Optional `console.*` redaction via an explicit adapter',
    '',
    '**Out of scope:**',
    '- AI or ML-based PII discovery',
    '- Remote or dynamic policy management',
    '- Reversible redaction, restore, or unredact operations',
    '- Broader platform work beyond this library',
    '',
    `For the canonical one-way redaction contract, see [docs/architecture/one-way-redaction.md](${oneWayRedactionLink}).`,
    '',
  ].join('\n')
}
